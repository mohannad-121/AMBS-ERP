import uuid
from datetime import datetime

from fastapi import APIRouter, Depends, Query
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.core.security import SecurityContext, SecurityError, require_permission
from app.db.session import get_session
from app.models.security import AuditEvent
from app.schemas.security import AuditPage, AuditResponse

router = APIRouter(prefix="/audit", tags=["Audit"])


@router.get("", response_model=AuditPage)
def list_events(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    actor_id: uuid.UUID | None = None,
    actor: str = Query("", max_length=64),
    action: str = Query("", max_length=64),
    start_at: datetime | None = None,
    end_at: datetime | None = None,
    context: SecurityContext = Depends(require_permission("audit.read")),
    db: Session = Depends(get_session),
):
    if any(value is not None and value.tzinfo is None for value in (start_at, end_at)):
        raise SecurityError(
            422, "INVALID_DATE_RANGE", "Include a timezone with audit date filters"
        )
    if start_at and end_at and end_at <= start_at:
        raise SecurityError(
            422, "INVALID_DATE_RANGE", "End date must follow start date"
        )
    query = select(AuditEvent)
    if actor_id:
        query = query.where(AuditEvent.actor_id == actor_id)
    if actor.strip():
        query = query.where(
            func.lower(AuditEvent.actor_username) == actor.strip().casefold()
        )
    if action:
        query = query.where(AuditEvent.action == action)
    if start_at:
        query = query.where(AuditEvent.occurred_at >= start_at)
    if end_at:
        query = query.where(AuditEvent.occurred_at < end_at)
    total = db.scalar(select(func.count()).select_from(query.subquery()))
    events = db.scalars(
        query.order_by(AuditEvent.occurred_at.desc(), AuditEvent.id.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
    )
    result = AuditPage(
        items=[AuditResponse.model_validate(event) for event in events],
        total=total,
        page=page,
        page_size=page_size,
    )
    db.commit()
    return result
