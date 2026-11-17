from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.core.security import (
    SecurityContext,
    SecurityError,
    audit,
    deny,
    password_hasher,
    revoke_user_sessions,
    utcnow,
)
from app.models.security import Role, User, user_roles
from app.schemas.security import UserCreate, UserResponse


def user_response(user: User) -> UserResponse:
    return UserResponse(
        id=user.id,
        username=user.username,
        email=user.email,
        display_name=user.display_name,
        is_active=user.is_active,
        roles=sorted(role.code for role in user.roles),
        permissions=sorted(
            {permission.code for role in user.roles for permission in role.permissions}
        ),
        created_at=user.created_at,
        updated_at=user.updated_at,
    )


def resolve_roles(db: Session, codes: list[str]) -> list[Role]:
    roles = list(db.scalars(select(Role).where(Role.code.in_(set(codes)))))
    if len(roles) != len(set(codes)):
        raise SecurityError(
            422, "INVALID_ROLE", "One or more selected roles are invalid"
        )
    return roles


def is_super_admin(user: User) -> bool:
    return any(role.code == "SUPER_ADMIN" for role in user.roles)


def protect_admin_target(db: Session, context: SecurityContext, target: User) -> None:
    if is_super_admin(target) and not is_super_admin(context.user):
        deny(
            db,
            403,
            "PERMISSION_DENIED",
            "A system administrator must manage this account",
            context.user,
        )


def validate_role_change(
    db: Session, context: SecurityContext, roles: list[Role]
) -> None:
    if "users.roles" not in context.permissions or (
        any(role.code == "SUPER_ADMIN" for role in roles)
        and not is_super_admin(context.user)
    ):
        deny(
            db,
            403,
            "PERMISSION_DENIED",
            "You do not have permission to assign these roles",
            context.user,
        )


def protect_last_admin(
    db: Session,
    target: User,
    *,
    active: bool,
    roles: list[Role],
    actor: User | None = None,
) -> None:
    if not target.is_active or not is_super_admin(target):
        return
    if active and any(role.code == "SUPER_ADMIN" for role in roles):
        return
    count = db.scalar(
        select(func.count())
        .select_from(User)
        .join(user_roles)
        .join(Role)
        .where(
            User.is_active.is_(True),
            User.id != target.id,
            Role.code == "SUPER_ADMIN",
        )
    )
    if count == 0:
        deny(
            db,
            409,
            "LAST_ADMIN",
            "Keep at least one active SUPER_ADMIN account",
            actor,
            details={"target_id": str(target.id)},
        )


def create_user(db: Session, data: UserCreate, actor: User | None = None) -> User:
    user = User(
        username=data.username,
        email=str(data.email) if data.email else None,
        display_name=data.display_name,
        password_hash=password_hasher.hash(data.password.get_secret_value()),
        roles=resolve_roles(db, data.roles),
    )
    db.add(user)
    db.flush()
    audit(db, "user.created", actor, user, {"roles": sorted(data.roles)})
    return user


def apply_roles(
    db: Session, context: SecurityContext, target: User, codes: list[str]
) -> None:
    roles = resolve_roles(db, codes)
    validate_role_change(db, context, roles)
    protect_last_admin(
        db, target, active=target.is_active, roles=roles, actor=context.user
    )
    before = sorted(role.code for role in target.roles)
    after = sorted(role.code for role in roles)
    if before != after:
        target.roles = roles
        target.updated_at = utcnow()
        revoke_user_sessions(db, target)
        audit(
            db,
            "user.roles_changed",
            context.user,
            target,
            {"before": before, "after": after},
        )
