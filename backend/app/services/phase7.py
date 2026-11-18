"""Shared transaction/idempotency boundary. The inventory gate supplies a stable read."""

from sqlalchemy import select
from app.models.packing import Phase7Operation
from app.services import inventory as inv
from app.services.master import record_audit


def replay(db, ctx, action, data):
    inv.lock_inventory(db)
    row = db.scalar(
        select(Phase7Operation).where(Phase7Operation.request_key == data.request_key)
    )
    fingerprint = inv.digest(data.model_dump(mode="json"))
    if row:
        if (
            row.actor_id != ctx.user.id
            or row.action != action
            or row.request_hash != fingerprint
        ):
            inv.fail(
                "IDEMPOTENCY_CONFLICT",
                "The request key belongs to a different employee or operation",
                409,
            )
        return row.target_id
    return None


def complete(db, ctx, action, data, row):
    db.add(
        Phase7Operation(
            request_key=data.request_key,
            actor_id=ctx.user.id,
            action=action,
            target_id=row.id,
            request_hash=inv.digest(data.model_dump(mode="json")),
        )
    )
    record_audit(db, ctx, action.split(":", 1)[0], row, "completed", reason=data.reason)
    db.flush()
    return row
