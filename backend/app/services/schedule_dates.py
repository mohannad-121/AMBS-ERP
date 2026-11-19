"""Shared reporting precedence; existing supplier records are never changed."""
from sqlalchemy import func, select
from app.models.purchasing import ScheduleUpdate

TIMEZONE = 'Asia/Dubai'


def due(model_id, *, stage=False, fallback=None):
    # Newest revision wins, then ETA > confirmed > requested within that revision.
    # An absent/undated latest revision falls back to the original expected date.
    match = ScheduleUpdate.stage_id == model_id if stage else ScheduleUpdate.order_id == model_id
    latest = select(func.coalesce(ScheduleUpdate.eta, ScheduleUpdate.confirmed_on, ScheduleUpdate.requested_on)).where(match).order_by(ScheduleUpdate.created_at.desc(), ScheduleUpdate.id.desc()).limit(1).correlate_except(ScheduleUpdate).scalar_subquery()
    return func.coalesce(latest, fallback)
