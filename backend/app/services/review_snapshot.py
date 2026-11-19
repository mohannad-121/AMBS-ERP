"""One MVCC snapshot per review, without borrowing either mutation advisory lock."""
from contextlib import contextmanager
from decimal import getcontext
from threading import BoundedSemaphore
from sqlalchemy import inspect, text
from sqlalchemy.engine import Engine
from sqlalchemy.orm import Session
from app.core.security import (
    SecurityError, current_context, deny, lock_security,
)
from app.models.security import AuthSession

SNAPSHOT_KEY = 'inventory_review_snapshot'
# The existing application pool is 5 + 5 overflow connections per worker.
# Two bounded reviews leave capacity for authentication and stock mutations.
REVIEW_SLOTS = BoundedSemaphore(2)
# Dashboard reads are short and must not compete for the two long-review slots.
# At most 2 review + 3 dashboard snapshot connections leave 5 of the existing
# 5+5 pool available. Authentication transactions are released before admission.
DASHBOARD_SLOTS = BoundedSemaphore(3)


def require_snapshot(db):
    if not db.info.get(SNAPSHOT_KEY):
        raise RuntimeError('Inventory review requires a read-only repeatable-read snapshot')
    getcontext().prec = 60


@contextmanager
def inventory_snapshot(db, *, slots=None):
    """Fresh identity map and transaction; never commit the caller's transaction.

    The connection isolation option is reset by SQLAlchemy on pool return.
    SET TRANSACTION precedes every data query; READ ONLY is enforced by PostgreSQL.
    Nested review functions reuse this same session, not a new snapshot per row.
    """
    bind = db.get_bind()
    if not isinstance(bind, Engine):
        raise RuntimeError('Review snapshot requires an engine, not a caller-owned connection')
    admission = REVIEW_SLOTS if slots is None else slots
    if not admission.acquire(blocking=False):
        raise SecurityError(429, 'REVIEW_BUSY', 'Inventory review slots are busy. Retry shortly; no stock has changed.')
    try:
        with Session(bind=bind, autoflush=False, expire_on_commit=False) as snapshot:
            snapshot.connection(execution_options={'isolation_level': 'REPEATABLE READ'})
            snapshot.execute(text('SET TRANSACTION READ ONLY'))
            snapshot.execute(text("SET LOCAL statement_timeout = '5s'"))
            snapshot.execute(text("SET LOCAL idle_in_transaction_session_timeout = '10s'"))
            snapshot.info[SNAPSHOT_KEY] = True
            getcontext().prec = 60
            try:
                yield snapshot
            finally:
                snapshot.info.pop(SNAPSHOT_KEY, None)
                snapshot.rollback()
    finally:
        admission.release()


def principal(context):
    return (context.user.id, context.session.id, frozenset(context.permissions),
            frozenset(role.code for role in context.user.roles))


@contextmanager
def review_request(db, context, request, *, slots=None):
    """Release authentication locks before a long read, then recheck access.

    Only current_context's last-seen update may be pending at this route boundary.
    Never implicitly commit business changes. Final validation leaves a short
    security transaction for final ACL/audit work and immediate commit, never
    long-running business review queries.
    """
    if db.new or db.deleted:
        raise RuntimeError('Review boundary cannot commit pending application writes')
    for row in db.dirty:
        changed = {a.key for a in inspect(row).attrs if a.history.has_changes()}
        if not isinstance(row, AuthSession) or changed - {'last_seen_at'}:
            raise RuntimeError('Review boundary only accepts session last-seen metadata')
    identity = principal(context)
    db.commit()  # Releases the initial unsafe-request SECURITY_LOCK as well.
    try:
        with inventory_snapshot(db, slots=slots) as snapshot:
            yield snapshot
    except SecurityError as error:
        if error.code == 'PERMISSION_DENIED':
            deny(db, error.status, error.code, error.message, context.user,
                 details={'resource': 'inventory_review'})
        raise
    # An account/role/session changed during a long review must not receive data
    # under its former privileges. No long-running read holds this lock.
    db.expire_all()
    lock_security(db)
    refreshed = current_context(request, db)
    if principal(refreshed) != identity:
        deny(db, 403, 'PERMISSION_DENIED',
             'Access changed during this review. Refresh and try again.', refreshed.user,
             details={'resource': 'inventory_review'})
