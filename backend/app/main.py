import logging
import time
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from sqlalchemy.exc import SQLAlchemyError, IntegrityError
from starlette.exceptions import HTTPException

from app.api import audit, auth, system, users, master, images, inventory, purchasing, sales, routing, dashboard, packing, onboarding, inventory_review
from app.api.health import router
from app.core.config import get_settings
from app.core.body_limit import RequestBodyLimit
from app.core.logging import configure_logging
from app.core.security import SecurityError
from app.db.session import engine

settings = get_settings()
configure_logging(settings.log_level)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("application_started")
    yield
    engine.dispose()
    logger.info("application_stopped")


app = FastAPI(
    title="AMBS ERP API",
    version="0.1.0",
    lifespan=lifespan,
    docs_url="/docs" if settings.app_env != "production" else None,
    redoc_url=None,
    openapi_url="/openapi.json" if settings.app_env != "production" else None,
)
app.add_middleware(RequestBodyLimit)
app.include_router(router, prefix="/api")
for api_router in (
    auth.router,
    users.router,
    audit.router,
    system.router,
    master.router,
    images.router,
    inventory.router,
    purchasing.router,
    sales.router,
    routing.router,
    dashboard.router,
    packing.router,
    onboarding.router,
    inventory_review.router,
):
    app.include_router(api_router, prefix="/api")


@app.middleware("http")
async def log_request(request: Request, call_next):
    started = time.monotonic()
    response = await call_next(request)
    response.headers["Cache-Control"] = "no-store"
    response.headers["X-Content-Type-Options"] = "nosniff"
    logger.info(
        "request_completed method=%s status=%s duration_ms=%.1f",
        request.method,
        response.status_code,
        (time.monotonic() - started) * 1000,
    )
    return response


@app.exception_handler(SecurityError)
async def security_error(request: Request, exc: SecurityError):
    headers = {"Cache-Control": "no-store"}
    if exc.status == 429:
        headers["Retry-After"] = str(
            max(
                settings.login_identity_window_seconds,
                settings.login_source_window_seconds,
            )
        )
    return JSONResponse(
        status_code=exc.status,
        content={
            "error": {
                "code": exc.code,
                "message": exc.message,
            }
        },
        headers=headers,
    )


@app.exception_handler(SQLAlchemyError)
async def database_error(request: Request, exc: SQLAlchemyError):
    logger.error("database_operation_failed type=%s", type(exc).__name__)
    return JSONResponse(
        status_code=503,
        content={
            "error": {
                "code": "DATABASE_UNAVAILABLE",
                "message": "Database temporarily unavailable",
            }
        },
        headers={"Cache-Control": "no-store"},
    )


@app.exception_handler(IntegrityError)
async def integrity_error(request: Request, exc: IntegrityError):
    return JSONResponse(
        status_code=409,
        content={
            "error": {
                "code": "INTEGRITY_CONFLICT",
                "message": "This operation conflicts with an existing identity, immutable record or stock integrity rule",
            }
        },
        headers={"Cache-Control": "no-store"},
    )


@app.exception_handler(HTTPException)
async def http_error(request: Request, exc: HTTPException):
    messages = {
        404: "Resource not found",
        405: "Method not allowed",
        503: "Database temporarily unavailable",
    }
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "error": {
                "code": f"HTTP_{exc.status_code}",
                "message": messages.get(exc.status_code, "Request failed"),
            }
        },
        headers=exc.headers,
    )


@app.exception_handler(RequestValidationError)
async def validation_error(request: Request, exc: RequestValidationError):
    return JSONResponse(
        status_code=422,
        content={
            "error": {
                "code": "VALIDATION_ERROR",
                "message": "Invalid request parameters. Check the indicated fields.",
                "fields": [
                    {
                        "field": ".".join(
                            str(part) for part in error["loc"] if part != "body"
                        ),
                        "rule": error["type"],
                    }
                    for error in exc.errors()
                    if not any(
                        str(part).lower()
                        in {"password", "content_base64", "identifier"}
                        for part in error["loc"]
                    )
                ],
            }
        },
    )


@app.exception_handler(Exception)
async def unexpected_error(request: Request, exc: Exception):
    logger.error("unhandled_exception type=%s", type(exc).__name__)
    return JSONResponse(
        status_code=500,
        content={
            "error": {
                "code": "INTERNAL_ERROR",
                "message": "An unexpected error occurred",
            }
        },
    )
