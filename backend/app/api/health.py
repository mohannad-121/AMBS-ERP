import logging
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import text
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session

from app.db.session import get_session
from app.schemas.health import ErrorResponse, HealthResponse

router = APIRouter(prefix="/health", tags=["Health"])
logger = logging.getLogger(__name__)


@router.get("", response_model=HealthResponse)
def health() -> HealthResponse:
    return HealthResponse(status="ok", service="AMBS ERP API")


@router.get(
    "/db", response_model=HealthResponse, responses={503: {"model": ErrorResponse}}
)
def database_health(
    session: Annotated[Session, Depends(get_session)],
) -> HealthResponse:
    try:
        session.execute(text("SELECT 1")).scalar_one()
    except SQLAlchemyError:
        logger.warning("database_connectivity_failed")
        raise HTTPException(
            status_code=503, detail="Database temporarily unavailable"
        ) from None
    return HealthResponse(status="ok", service="PostgreSQL")
