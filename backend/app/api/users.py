import uuid

from fastapi import APIRouter, Depends, Query
from sqlalchemy import func, or_, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.core.security import (
    SecurityContext,
    SecurityError,
    audit,
    password_hasher,
    require_permission,
    revoke_user_sessions,
    utcnow,
)
from app.db.session import get_session
from app.models.security import Permission, Role, User
from app.schemas.security import (
    ActionResponse,
    ActivationUpdate,
    PasswordReset,
    PermissionResponse,
    RoleAssignment,
    RoleResponse,
    UserCreate,
    UserPage,
    UserResponse,
    UserUpdate,
)
from app.services.users import (
    apply_roles,
    create_user,
    protect_admin_target,
    protect_last_admin,
    resolve_roles,
    user_response,
    validate_role_change,
)

router = APIRouter(tags=["User administration"])


def target_user(db: Session, user_id: uuid.UUID) -> User:
    user = db.get(User, user_id)
    if user is None:
        raise SecurityError(404, "USER_NOT_FOUND", "User was not found")
    return user


def commit_security_change(db: Session) -> None:
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise SecurityError(
            409, "IDENTITY_CONFLICT", "Username or email is already in use"
        ) from None


@router.get("/users", response_model=UserPage)
def list_users(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    search: str = Query("", max_length=120),
    context: SecurityContext = Depends(require_permission("users.read")),
    db: Session = Depends(get_session),
):
    query = select(User)
    if search.strip():
        term = (
            search.strip().replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_")
        )
        query = query.where(
            or_(
                *(
                    column.ilike(f"%{term}%", escape="\\")
                    for column in (User.username, User.email, User.display_name)
                )
            )
        )
    total = db.scalar(select(func.count()).select_from(query.subquery()))
    users = db.scalars(
        query.order_by(User.username, User.id)
        .offset((page - 1) * page_size)
        .limit(page_size)
    ).all()
    result = UserPage(
        items=[user_response(user) for user in users],
        total=total,
        page=page,
        page_size=page_size,
    )
    db.commit()
    return result


@router.get("/users/{user_id}", response_model=UserResponse)
def view_user(
    user_id: uuid.UUID,
    context: SecurityContext = Depends(require_permission("users.read")),
    db: Session = Depends(get_session),
):
    result = user_response(target_user(db, user_id))
    db.commit()
    return result


@router.post("/users", response_model=UserResponse, status_code=201)
def add_user(
    data: UserCreate,
    context: SecurityContext = Depends(require_permission("users.create")),
    db: Session = Depends(get_session),
):
    if data.roles:
        validate_role_change(db, context, resolve_roles(db, data.roles))
    try:
        user = create_user(db, data, context.user)
        result = user_response(user)
        commit_security_change(db)
    except IntegrityError:
        db.rollback()
        raise SecurityError(
            409, "IDENTITY_CONFLICT", "Username or email is already in use"
        ) from None
    return result


@router.patch("/users/{user_id}", response_model=UserResponse)
def edit_user(
    user_id: uuid.UUID,
    data: UserUpdate,
    context: SecurityContext = Depends(require_permission("users.update")),
    db: Session = Depends(get_session),
):
    user = target_user(db, user_id)
    protect_admin_target(db, context, user)
    if data.roles is not None:
        apply_roles(db, context, user, data.roles)
    values = data.model_dump(exclude_unset=True, exclude={"roles"})
    changed = [key for key, value in values.items() if getattr(user, key) != value]
    for key, value in values.items():
        setattr(
            user, key, str(value) if key == "email" and value is not None else value
        )
    if changed:
        user.updated_at = utcnow()
        audit(db, "user.updated", context.user, user, {"fields": sorted(changed)})
    try:
        db.flush()
        result = user_response(user)
        commit_security_change(db)
    except IntegrityError:
        db.rollback()
        raise SecurityError(
            409, "IDENTITY_CONFLICT", "Username or email is already in use"
        ) from None
    return result


@router.patch("/users/{user_id}/activation", response_model=UserResponse)
def activation(
    user_id: uuid.UUID,
    data: ActivationUpdate,
    context: SecurityContext = Depends(require_permission("users.update")),
    db: Session = Depends(get_session),
):
    user = target_user(db, user_id)
    protect_admin_target(db, context, user)
    protect_last_admin(
        db, user, active=data.is_active, roles=user.roles, actor=context.user
    )
    if user.is_active != data.is_active:
        user.is_active = data.is_active
        user.updated_at = utcnow()
        if not data.is_active:
            revoke_user_sessions(db, user)
        audit(
            db,
            "user.activated" if data.is_active else "user.deactivated",
            context.user,
            user,
        )
    result = user_response(user)
    commit_security_change(db)
    return result


@router.put("/users/{user_id}/roles", response_model=UserResponse)
def assign_roles(
    user_id: uuid.UUID,
    data: RoleAssignment,
    context: SecurityContext = Depends(require_permission("users.roles")),
    db: Session = Depends(get_session),
):
    user = target_user(db, user_id)
    protect_admin_target(db, context, user)
    apply_roles(db, context, user, data.roles)
    result = user_response(user)
    commit_security_change(db)
    return result


@router.post("/users/{user_id}/password", response_model=ActionResponse)
def reset_password(
    user_id: uuid.UUID,
    data: PasswordReset,
    context: SecurityContext = Depends(require_permission("users.reset_password")),
    db: Session = Depends(get_session),
):
    user = target_user(db, user_id)
    protect_admin_target(db, context, user)
    user.password_hash = password_hasher.hash(data.password.get_secret_value())
    user.updated_at = utcnow()
    revoke_user_sessions(db, user)
    audit(db, "user.password_reset", context.user, user)
    commit_security_change(db)
    return {"status": "ok"}


@router.get("/roles", response_model=list[RoleResponse])
def list_roles(
    context: SecurityContext = Depends(require_permission("users.read")),
    db: Session = Depends(get_session),
):
    result = [
        RoleResponse(
            id=role.id,
            code=role.code,
            description=role.description,
            permissions=sorted(permission.code for permission in role.permissions),
        )
        for role in db.scalars(select(Role).order_by(Role.code))
    ]
    db.commit()
    return result


@router.get("/permissions", response_model=list[PermissionResponse])
def list_permissions(
    context: SecurityContext = Depends(require_permission("users.read")),
    db: Session = Depends(get_session),
):
    result = [
        PermissionResponse.model_validate(permission)
        for permission in db.scalars(select(Permission).order_by(Permission.code))
    ]
    db.commit()
    return result
