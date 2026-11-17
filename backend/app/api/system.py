from fastapi import APIRouter, Depends
from sqlalchemy import text
from sqlalchemy.orm import Session

from app.core.security import SecurityContext, require_permission, utcnow
from app.db.session import get_session
from app.schemas.security import SystemStatusResponse

router = APIRouter(prefix="/system", tags=["System"])


@router.get("/status", response_model=SystemStatusResponse)
def system_status(
    context: SecurityContext = Depends(require_permission("system.read")),
    db: Session = Depends(get_session),
):
    # Authentication itself has already required a working database connection.
    # Keep an explicit connectivity query for the Phase 1 status indicators.
    db.execute(text("SELECT 1")).scalar_one()
    db.commit()
    return {
        "backend": {"available": True, "message": "Connection verified"},
        "database": {"available": True, "message": "Connection verified"},
        "checkedAt": utcnow().isoformat(),
    }
