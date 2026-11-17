import hmac
import secrets

from fastapi import APIRouter, Depends, Request, Response
from sqlalchemy import or_, select
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.core.security import (
    SecurityContext,
    audit,
    clear_cookies,
    consume_login_attempt,
    current_context,
    deny,
    dummy_password_hash,
    find_session,
    issue_session,
    lock_security,
    password_hasher,
    require_csrf,
    utcnow,
    validate_origin,
    validate_transport,
    verifier,
    verify_password,
)
from app.db.session import get_session
from app.models.security import User
from app.schemas.security import (
    ActionResponse,
    CsrfResponse,
    LoginRequest,
    UserResponse,
    normalize_identity,
)
from app.services.users import user_response

router = APIRouter(prefix="/auth", tags=["Authentication"])


@router.get("/csrf", response_model=CsrfResponse)
def csrf(request: Request, response: Response, db: Session = Depends(get_session)):
    validate_transport(request)
    origin = request.headers.get("origin")
    if (
        origin and origin not in get_settings().auth_allowed_origins
    ) or request.headers.get("sec-fetch-site") == "cross-site":
        deny(db, 403, "ORIGIN_REJECTED", "Request origin is not allowed")
    record = find_session(db, request)
    if record is not None and record.user_id is not None:
        user = db.get(User, record.user_id)
        if user is None or not user.is_active:
            record.revoked_at = utcnow()
            record = None
    if record is None:
        _, token = issue_session(db, response)
    else:
        token = request.cookies.get(get_settings().csrf_cookie_name, "")
        if len(token) != 43 or not hmac.compare_digest(
            verifier(token), record.csrf_hash
        ):
            token = secrets.token_urlsafe(32)
            record.csrf_hash = verifier(token)
            response.set_cookie(
                get_settings().csrf_cookie_name,
                token,
                httponly=False,
                secure=get_settings().auth_cookie_secure,
                samesite="lax",
                path="/",
                max_age=max(1, int((record.expires_at - utcnow()).total_seconds())),
            )
    db.commit()
    response.headers["Cache-Control"] = "no-store"
    return {"csrf_token": token}


@router.post("/login", response_model=UserResponse)
def login(
    data: LoginRequest,
    request: Request,
    response: Response,
    db: Session = Depends(get_session),
):
    validate_origin(db, request)
    lock_security(db)
    record = find_session(db, request)
    if record is None:
        deny(db, 403, "CSRF_REJECTED", "Refresh the sign-in page and try again")
    require_csrf(db, request, record)
    identifier = normalize_identity(data.identifier)
    source = request.client.host if request.client else "unknown"
    if not consume_login_attempt(db, identifier, source):
        deny(
            db,
            429,
            "LOGIN_RATE_LIMITED",
            "Too many sign-in attempts. Please try again later.",
            action="auth.login_rate_limited",
            details={"identifier_digest": verifier(identifier)},
        )
    user = db.scalar(
        select(User).where(or_(User.username == identifier, User.email == identifier))
    )
    valid = verify_password(
        user.password_hash if user else dummy_password_hash,
        data.password.get_secret_value(),
    )
    if not valid or user is None or not user.is_active:
        deny(
            db,
            401,
            "INVALID_CREDENTIALS",
            "Username/email or password is incorrect",
            action="auth.login_failed",
            details={"identifier_digest": verifier(identifier)},
        )
    if password_hasher.check_needs_rehash(user.password_hash):
        user.password_hash = password_hasher.hash(data.password.get_secret_value())
    record.revoked_at = utcnow()
    issue_session(db, response, user)
    audit(db, "auth.login_succeeded", user, user)
    result = user_response(user)
    db.commit()
    return result


@router.get("/me", response_model=UserResponse)
def me(
    context: SecurityContext = Depends(current_context),
    db: Session = Depends(get_session),
):
    result = user_response(context.user)
    db.commit()
    return result


@router.post("/logout", response_model=ActionResponse)
def logout(
    response: Response,
    context: SecurityContext = Depends(current_context),
    db: Session = Depends(get_session),
):
    context.session.revoked_at = utcnow()
    audit(db, "auth.logout", context.user, context.user)
    db.commit()
    clear_cookies(response)
    return {"status": "ok"}
