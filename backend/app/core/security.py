import hashlib
import hmac
import secrets
from dataclasses import dataclass
from datetime import UTC, datetime, timedelta

from argon2 import PasswordHasher, Type
from argon2.exceptions import InvalidHashError, VerificationError
from fastapi import Depends, Request, Response
from sqlalchemy import select, text, update
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.db.session import get_session
from app.models.security import AuditEvent, AuthSession, LoginRateBucket, User

password_hasher = PasswordHasher(type=Type.ID)
dummy_password_hash = password_hasher.hash(secrets.token_urlsafe(32))
SECURITY_LOCK = 7140284201


def utcnow() -> datetime:
    return datetime.now(UTC)


def verifier(token: str) -> str:
    return hashlib.sha256(token.encode()).hexdigest()


def verify_password(encoded: str, password: str) -> bool:
    try:
        return password_hasher.verify(encoded, password)
    except (VerificationError, InvalidHashError):
        return False


class SecurityError(Exception):
    def __init__(self, status: int, code: str, message: str):
        self.status, self.code, self.message = status, code, message


def audit(
    db: Session,
    action: str,
    actor: User | None = None,
    target: User | None = None,
    details: dict | None = None,
) -> None:
    db.add(
        AuditEvent(
            actor_id=actor.id if actor else None,
            actor_username=actor.username if actor else None,
            action=action,
            target_type="user" if target else None,
            target_id=target.id if target else None,
            details=details or {},
        )
    )


def deny(
    db: Session,
    status: int,
    code: str,
    message: str,
    actor: User | None = None,
    action: str = "security.denied",
    details: dict | None = None,
) -> None:
    # Capture identity before rollback expires ORM attributes. Failed operations
    # roll back completely, while the denial audit commits in a fresh transaction.
    actor_id = actor.id if actor else None
    actor_username = actor.username if actor else None
    db.rollback()
    db.add(
        AuditEvent(
            actor_id=actor_id,
            actor_username=actor_username,
            action=action,
            details={"reason": code, **(details or {})},
        )
    )
    db.commit()
    raise SecurityError(status, code, message)


def lock_security(db: Session) -> None:
    # Serialize security mutations, including first-admin provisioning, so two
    # administrators cannot concurrently remove the final active administrator.
    db.execute(text("SELECT pg_advisory_xact_lock(:key)"), {"key": SECURITY_LOCK})


def validate_transport(request: Request) -> None:
    settings = get_settings()
    if settings.app_env == "production":
        supplied = request.headers.get("x-ambs-bff-key", "")
        if (
            not hmac.compare_digest(
                supplied.encode(), settings.auth_bff_secret.get_secret_value().encode()
            )
            or request.headers.get("x-ambs-external-proto") != "https"
        ):
            raise SecurityError(
                426, "HTTPS_REQUIRED", "Secure HTTPS access is required"
            )


def validate_origin(db: Session, request: Request) -> None:
    validate_transport(request)
    if request.headers.get("origin") not in get_settings().auth_allowed_origins:
        deny(db, 403, "ORIGIN_REJECTED", "Request origin is not allowed")
    if request.headers.get("sec-fetch-site") == "cross-site":
        deny(db, 403, "ORIGIN_REJECTED", "Request origin is not allowed")
    if request.method not in {"GET", "HEAD", "OPTIONS"}:
        content_type = (
            request.headers.get("content-type", "").split(";")[0].strip().lower()
        )
        if content_type != "application/json":
            deny(db, 415, "JSON_REQUIRED", "Use an application/json request")


def find_session(db: Session, request: Request) -> AuthSession | None:
    token = request.cookies.get(get_settings().session_cookie_name, "")
    if len(token) != 43:
        return None
    record = db.scalar(
        select(AuthSession)
        .where(AuthSession.token_hash == verifier(token))
        .with_for_update()
    )
    now = utcnow()
    if (
        record is None
        or record.revoked_at is not None
        or record.expires_at <= now
        or record.last_seen_at + timedelta(seconds=get_settings().session_idle_seconds)
        <= now
    ):
        return None
    return record


def issue_session(
    db: Session, response: Response, user: User | None = None
) -> tuple[AuthSession, str]:
    settings = get_settings()
    token, csrf = secrets.token_urlsafe(32), secrets.token_urlsafe(32)
    lifetime = (
        settings.session_absolute_seconds
        if user
        else min(900, settings.session_absolute_seconds)
    )
    record = AuthSession(
        user_id=user.id if user else None,
        token_hash=verifier(token),
        csrf_hash=verifier(csrf),
        expires_at=utcnow() + timedelta(seconds=lifetime),
    )
    db.add(record)
    set_cookies(response, token, csrf, lifetime)
    return record, csrf


def set_cookies(response: Response, token: str, csrf: str, lifetime: int) -> None:
    settings = get_settings()
    response.set_cookie(
        settings.session_cookie_name,
        token,
        max_age=lifetime,
        httponly=True,
        secure=settings.auth_cookie_secure,
        samesite="lax",
        path="/",
    )
    response.set_cookie(
        settings.csrf_cookie_name,
        csrf,
        max_age=lifetime,
        httponly=False,
        secure=settings.auth_cookie_secure,
        samesite="lax",
        path="/",
    )
    response.headers["Cache-Control"] = "no-store"


def clear_cookies(response: Response) -> None:
    settings = get_settings()
    for name in (settings.session_cookie_name, settings.csrf_cookie_name):
        response.delete_cookie(
            name,
            path="/",
            secure=settings.auth_cookie_secure,
            httponly=name == settings.session_cookie_name,
            samesite="lax",
        )


def require_csrf(
    db: Session, request: Request, record: AuthSession, user: User | None = None
) -> None:
    token = request.headers.get("x-csrf-token", "")
    if len(token) != 43 or not hmac.compare_digest(verifier(token), record.csrf_hash):
        deny(
            db,
            403,
            "CSRF_REJECTED",
            "Security token is missing or expired. Refresh and try again.",
            user,
        )


def effective_permissions(user: User) -> set[str]:
    return {permission.code for role in user.roles for permission in role.permissions}


@dataclass
class SecurityContext:
    user: User
    session: AuthSession
    permissions: set[str]


def current_context(
    request: Request, db: Session = Depends(get_session)
) -> SecurityContext:
    validate_transport(request)
    unsafe = request.method not in {"GET", "HEAD", "OPTIONS"}
    if unsafe:
        validate_origin(db, request)
        lock_security(db)
    record = find_session(db, request)
    if record is None or record.user_id is None:
        if request.url.path != "/api/auth/me":
            route = request.scope.get("route")
            deny(
                db,
                401,
                "AUTHENTICATION_REQUIRED",
                "Please sign in to continue",
                action="auth.denied",
                details={"resource": getattr(route, "path", "protected")},
            )
        raise SecurityError(
            401, "AUTHENTICATION_REQUIRED", "Please sign in to continue"
        )
    user = db.get(User, record.user_id)
    if user is None or not user.is_active:
        deny(
            db,
            401,
            "AUTHENTICATION_REQUIRED",
            "Please sign in to continue",
            action="auth.denied",
        )
    if unsafe:
        require_csrf(db, request, record, user)
    record.last_seen_at = utcnow()
    return SecurityContext(user, record, effective_permissions(user))


def require_permission(permission: str):
    def dependency(
        context: SecurityContext = Depends(current_context),
        db: Session = Depends(get_session),
    ):
        if permission not in context.permissions:
            deny(
                db,
                403,
                "PERMISSION_DENIED",
                "You do not have permission for this action",
                context.user,
                details={"permission": permission},
            )
        return context

    return dependency


def revoke_user_sessions(db: Session, user: User) -> None:
    db.execute(
        update(AuthSession)
        .where(AuthSession.user_id == user.id, AuthSession.revoked_at.is_(None))
        .values(revoked_at=utcnow())
    )


def consume_login_attempt(db: Session, identifier: str, source: str) -> bool:
    settings = get_settings()
    buckets = [
        (
            "source:" + verifier(source),
            settings.login_source_limit,
            settings.login_source_window_seconds,
        ),
        (
            "identity:" + verifier(identifier),
            settings.login_identity_limit,
            settings.login_identity_window_seconds,
        ),
    ]
    allowed = True
    # An independent transaction preserves counters when failed authentication
    # rolls back its session transaction. PostgreSQL locks span all API workers.
    with Session(bind=db.get_bind(), expire_on_commit=False) as limits:
        for key, limit, window in buckets:
            lock_key = int.from_bytes(
                hashlib.sha256(key.encode()).digest()[:8], "big", signed=True
            )
            limits.execute(
                text("SELECT pg_advisory_xact_lock(:key)"), {"key": lock_key}
            )
            bucket = limits.get(LoginRateBucket, key)
            if bucket is None:
                bucket = LoginRateBucket(
                    key=key, attempts=0, expires_at=utcnow() + timedelta(seconds=window)
                )
                limits.add(bucket)
            elif bucket.expires_at <= utcnow():
                bucket.attempts = 0
                bucket.expires_at = utcnow() + timedelta(seconds=window)
            bucket.attempts += 1
            if bucket.attempts > limit:
                allowed = False
                break
        limits.commit()
    return allowed
