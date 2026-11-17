import argparse
import getpass
import sys

from pydantic import SecretStr, ValidationError
from sqlalchemy import delete, or_, select
from sqlalchemy.exc import IntegrityError

from app.core.security import (
    SecurityError,
    audit,
    consume_login_attempt,
    deny,
    dummy_password_hash,
    lock_security,
    password_hasher,
    revoke_user_sessions,
    utcnow,
    verify_password,
)
from app.db.session import SessionLocal
from app.models.security import AuthSession, LoginRateBucket, Role, User, user_roles
from app.schemas.security import PasswordReset, UserCreate, normalize_identity
from app.services.users import create_user


def provision_admin(db, data: UserCreate) -> User:
    lock_security(db)
    existing = db.scalar(
        select(User.id)
        .join(user_roles)
        .join(Role)
        .where(Role.code == "SUPER_ADMIN")
        .limit(1)
    )
    if existing:
        raise SecurityError(
            409,
            "ADMIN_EXISTS",
            "A SUPER_ADMIN already exists. Use authenticated user management.",
        )
    admin_data = data.model_copy(update={"roles": ["SUPER_ADMIN"]})
    user = create_user(db, admin_data)
    audit(db, "admin.provisioned", user, user, {"source": "interactive_cli"})
    db.commit()
    return user


def active_admin(db, identifier: str) -> User | None:
    identifier = normalize_identity(identifier)
    return db.scalar(
        select(User)
        .join(user_roles)
        .join(Role)
        .where(
            or_(User.username == identifier, User.email == identifier),
            User.is_active.is_(True),
            Role.code == "SUPER_ADMIN",
        )
        .execution_options(populate_existing=True)
    )


def verify_admin_password(db, identifier: str, password: SecretStr) -> None:
    lock_security(db)
    identifier = normalize_identity(identifier)
    if not consume_login_attempt(db, identifier, "interactive-admin-cli"):
        deny(
            db,
            429,
            "LOGIN_RATE_LIMITED",
            "Too many attempts. Wait for the login limit to expire.",
            action="admin.password_verification_denied",
        )
    user = active_admin(db, identifier)
    valid = verify_password(
        user.password_hash if user else dummy_password_hash, password.get_secret_value()
    )
    if not valid or user is None:
        deny(
            db,
            401,
            "INVALID_CREDENTIALS",
            "Administrator credentials could not be verified.",
            action="admin.password_verification_failed",
        )
    audit(db, "admin.password_verified", user, user, {"source": "interactive_cli"})
    db.commit()


def reset_admin_password(db, identifier: str, data: PasswordReset) -> None:
    lock_security(db)
    user = active_admin(db, identifier)
    if user is None:
        raise SecurityError(
            404, "ADMIN_NOT_FOUND", "No active SUPER_ADMIN matches that identifier."
        )
    user.password_hash = password_hasher.hash(data.password.get_secret_value())
    user.updated_at = utcnow()
    revoke_user_sessions(db, user)
    audit(db, "admin.password_reset", user, user, {"source": "interactive_cli"})
    db.commit()


def main() -> int:
    parser = argparse.ArgumentParser(description="AMBS ERP security administration")
    parser.add_argument(
        "command",
        choices=[
            "provision-admin",
            "cleanup-security",
            "verify-admin-password",
            "reset-admin-password",
        ],
    )
    command = parser.parse_args().command
    if command != "cleanup-security" and not sys.stdin.isatty():
        print(
            "Run this command in an interactive terminal for hidden password entry.",
            file=sys.stderr,
        )
        return 1
    try:
        with SessionLocal() as db:
            if command == "cleanup-security":
                lock_security(db)
                db.execute(
                    delete(AuthSession).where(
                        (AuthSession.expires_at < utcnow())
                        | AuthSession.revoked_at.is_not(None)
                    )
                )
                db.execute(
                    delete(LoginRateBucket).where(LoginRateBucket.expires_at < utcnow())
                )
                db.commit()
                print(
                    "Expired sessions and login rate buckets removed. Audit history retained."
                )
                return 0
            if command in {"verify-admin-password", "reset-admin-password"}:
                identifier = input("Administrator username or email: ")
                if command == "verify-admin-password":
                    password = SecretStr(getpass.getpass("Current password: "))
                    verify_admin_password(db, identifier, password)
                    print(
                        "Administrator password verified. Sign in through the application."
                    )
                    return 0
                password = getpass.getpass("New password (12-128 characters): ")
                confirmation = getpass.getpass("Confirm new password: ")
                if password != confirmation:
                    print("Passwords do not match.", file=sys.stderr)
                    return 1
                reset_admin_password(db, identifier, PasswordReset(password=password))
                print("Administrator password reset. Existing sessions have ended.")
                return 0
            # Refuse before requesting credentials when setup has already run.
            if db.scalar(
                select(User.id)
                .join(user_roles)
                .join(Role)
                .where(Role.code == "SUPER_ADMIN")
                .limit(1)
            ):
                print(
                    "A SUPER_ADMIN already exists. Use authenticated user management.",
                    file=sys.stderr,
                )
                return 1
            username = input("Administrator username: ")
            email = input("Administrator email (optional): ").strip() or None
            display_name = input("Administrator display name: ")
            password = getpass.getpass("Password (12-128 characters): ")
            confirmation = getpass.getpass("Confirm password: ")
            if password != confirmation:
                print("Passwords do not match.", file=sys.stderr)
                return 1
            data = UserCreate(
                username=username,
                email=email,
                display_name=display_name,
                password=password,
            )
            provision_admin(db, data)
            print("Administrator created. Sign in through the AMBS ERP login page.")
            return 0
    except ValidationError as exc:
        # Only field locations are used. Pydantic messages, context and input
        # values may contain sensitive text, even for non-password fields.
        invalid_fields = {
            error["loc"][0]
            for error in exc.errors(
                include_input=False, include_context=False, include_url=False
            )
            if error["loc"]
        }
        messages = {
            "username": (
                "Username must be 3-64 ASCII letters, digits, dots, underscores or hyphens, "
                "starting with a letter or digit. Enter an email address only at the email prompt."
            ),
            "email": (
                "Email must be a valid address on a non-reserved domain, such as name@example.com. "
                "Leave it blank if unavailable. Addresses ending in .local are rejected."
            ),
            "display_name": "Display name must contain 1-120 printable characters and cannot be blank.",
            "password": "Password must contain 12-128 characters.",
        }
        print("Account details could not be validated.", file=sys.stderr)
        for field, message in messages.items():
            if field in invalid_fields:
                print(message, file=sys.stderr)
    except IntegrityError:
        print("Username or email is already in use.", file=sys.stderr)
    except SecurityError as exc:
        print(exc.message, file=sys.stderr)
    except (EOFError, KeyboardInterrupt):
        print("Provisioning cancelled.", file=sys.stderr)
    return 1


if __name__ == "__main__":
    raise SystemExit(main())
