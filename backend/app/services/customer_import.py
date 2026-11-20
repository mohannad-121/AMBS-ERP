"""Internal P9-2A customer rehearsal. No HTTP route, production or real-data entry point.

An Engine (never a caller-owned connection/transaction) is required. Each call owns
one PostgreSQL transaction, including native customer creation and immutable receipts.
"""
import hashlib
import uuid
from datetime import timedelta
from types import SimpleNamespace

from pydantic import ValidationError
from sqlalchemy import func, select, text
from sqlalchemy.engine import Engine
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.core.security import SecurityContext, SecurityError, deny, effective_permissions, lock_security, utcnow
from app.models.customer_import import CustomerImportAttempt, CustomerImportIdentity, CustomerImportReceipt, CustomerImportRow
from app.models.import_review import ReviewDecision
from app.models.master import Customer
from app.models.security import AuditEvent, AuthSession, User
from app.schemas.customer_import import CustomerImportRequest
from app.schemas.import_review import Selection
from app.schemas.master import CustomerInput, normalized
from app.services import import_review as review, master


def gate(db):
    if not get_settings().synthetic_customer_import_enabled or not review.available(db):
        review.error('CUSTOMER_IMPORT_DISABLED', 'Customer execution is limited to explicitly enabled isolated synthetic tests', 404)
    if db.in_transaction():
        raise RuntimeError('Synthetic import gate requires a fresh owned session')
    # Set the actual Connection option before the session begins its transaction.
    # Chaining Engine.execution_options can retain an older Engine isolation hook.
    db.connection(execution_options={'isolation_level': 'READ COMMITTED'})
    if db.scalar(text('SELECT current_database()')) != db.get_bind().url.database:
        review.error('CUSTOMER_IMPORT_DISABLED', 'The actual database must match the generated synthetic database', 404)


def authorize(db, principal):
    # Reuse the native lock, session lifetime and effective role/permission rules.
    # Never trust permissions cached on the supplied context.
    lock_security(db)
    session_id = getattr(getattr(principal, 'session', None), 'id', None)
    actor_id = getattr(getattr(principal, 'user', None), 'id', None)
    session = db.get(AuthSession, session_id, with_for_update=True) if session_id else None
    now = utcnow()
    if (not session or session.user_id != actor_id or session.revoked_at is not None
            or session.expires_at <= now
            or session.last_seen_at + timedelta(seconds=get_settings().session_idle_seconds) <= now):
        review.error('AUTHENTICATION_REQUIRED', 'A current native session is required', 401)
    user = db.get(User, actor_id)
    if not user or not user.is_active:
        review.error('AUTHENTICATION_REQUIRED', 'A current native session is required', 401)
    permissions = effective_permissions(user)
    session.last_seen_at = now
    return SecurityContext(user, session, permissions)


def approved_metadata(db, source_id, request):
    source, revision = review.locked(db, source_id, request.expected_version)
    if not revision or revision.id != request.revision_id or revision.state != 'APPROVED':
        review.error('APPROVAL_REQUIRED', 'The current selection must have effective independent approval')
    try:
        selection = Selection.model_validate(revision.selection)
    except ValidationError:
        review.error('REVIEW_INTEGRITY', 'Saved selection failed integrity verification')
    if review.digest(revision.selection) != revision.selection_sha256:
        review.error('REVIEW_INTEGRITY', 'Saved selection failed integrity verification')
    if selection.category != 'customers' or selection.intended_action != 'PROPOSE_CREATE':
        review.error('UNSUPPORTED_IMPORT', 'Only synthetic customer creation is supported', 422)
    if set(selection.mapping) - (set(CustomerInput.model_fields) - {'acknowledge_duplicate', 'duplicate_reason'}):
        review.error('UNSUPPORTED_MAPPING', 'Every selected customer field must be supported by native creation', 422)
    if source.parser_version != review.PARSER_VERSION or source.policy_version != review.POLICY_VERSION:
        review.error('STALE_POLICY', 'Current parser and review policy versions are required')
    review.load(source.sha256)  # Re-read the bounded original bytes and verify SHA-256.
    run = review.latest_run(db, revision.id)
    if not run or run.id != request.validation_id or not run.result.get('selection_valid'):
        review.error('VALIDATION_REQUIRED', 'The exact latest valid run is required')
    if review.digest(run.result) != run.result_sha256:
        review.error('REVIEW_INTEGRITY', 'Saved validation failed integrity verification')
    binding = review.binding(source, revision, run.result_sha256, run.reference_sha256)
    if run.binding_sha256 != binding:
        review.error('REVIEW_INTEGRITY', 'Validation binding failed integrity verification')
    decisions = list(db.scalars(select(ReviewDecision).where(
        ReviewDecision.revision_id == revision.id, ReviewDecision.validation_id == run.id)
        .order_by(ReviewDecision.created_at.desc(), ReviewDecision.id.desc())))
    approval = next((d for d in decisions if d.kind == 'APPROVED'), None)
    reviewer = next((d for d in decisions if d.kind == 'REVIEWED'), None)
    if (not decisions or decisions[0] != approval or not approval or approval.id != request.approval_id
            or not reviewer or approval.binding_sha256 != binding or reviewer.binding_sha256 != binding
            or reviewer.created_at > approval.created_at
            or len({source.actor_id, reviewer.actor_id, approval.actor_id}) != 3):
        review.error('APPROVAL_REQUIRED', 'The exact independently reviewed and approved run is required')
    for actor_id, allowed in [(reviewer.actor_id, {'SUPER_ADMIN','OPERATIONS'}), (approval.actor_id, {'SUPER_ADMIN'})]:
        actor = db.get(User, actor_id)
        if not actor or not actor.is_active or not {r.code for r in actor.roles} & allowed:
            review.error('APPROVAL_REQUIRED', 'Review and approval authority must remain active')
    return source, revision, run, approval


def audit(db, ctx, kind, receipt):
    db.add(AuditEvent(actor_id=ctx.user.id, actor_username=ctx.user.username,
        action='customer_import.' + kind, target_type='synthetic_customer_import', target_id=receipt.id,
        details={'id': str(receipt.id), 'duplicate_retry': kind == 'duplicate_retry',
                 'invocation_applied_rows': 0 if kind == 'duplicate_retry' else receipt.applied_rows,
                 **{name: getattr(receipt, name) for name in
            ['selected_rows','validated_rows','applied_rows','duplicate_rows','rejected_rows','conflicts']}}))


def reconciliation(db, receipt, *, retry):
    rows = list(db.scalars(select(CustomerImportRow).where(CustomerImportRow.receipt_id == receipt.id)
                           .order_by(CustomerImportRow.source_row)))
    retries = db.scalar(select(func.count()).select_from(CustomerImportAttempt).where(
        CustomerImportAttempt.receipt_id == receipt.id, CustomerImportAttempt.kind == 'DUPLICATE_RETRY'))
    return {'receipt_id': str(receipt.id), 'source_id': str(receipt.source_id),
        'revision_id': str(receipt.revision_id), 'validation_id': str(receipt.validation_id),
        'approval_id': str(receipt.approval_id), 'outcome': receipt.outcome,
        'receipt_counts': {name: getattr(receipt, name) for name in
            ['selected_rows','validated_rows','applied_rows','duplicate_rows','rejected_rows','conflicts']},
        'duplicate_retries': retries, 'invocation': {'duplicate_retry': retry,
            'applied_rows': 0 if retry else receipt.applied_rows},
        'rows': [{'source_row': r.source_row, 'outcome': r.outcome, 'code': r.code,
                  'customer_id': str(r.customer_id) if r.customer_id else None} for r in rows],
        'notice': 'SYNTHETIC ONLY; receipt reports committed history, not current approval or production authorization'}


def plan_rows(db, source, revision, result):
    plan = []
    for record in result['records']:
        payload = CustomerInput.model_validate({k:v for k,v in record['proposed'].items() if v != ''})
        key = normalized(revision.selection['source_keys'][str(record['row'])])
        key_sha = hashlib.sha256(key.encode()).hexdigest()
        content_sha = review.digest({'source_sha256': source.sha256, 'original': record['original'],
                                     'customer': payload.model_dump(mode='json')})
        entry = {'source_row': record['row'], 'source_key_sha256': key_sha, 'content_sha256': content_sha,
                 'payload': payload, 'customer_id': None, 'outcome': 'APPLIED', 'code': 'CREATED'}
        identity = db.scalar(select(CustomerImportIdentity).where(
            CustomerImportIdentity.namespace == source.namespace, CustomerImportIdentity.source_key_sha256 == key_sha))
        if identity:
            customer = db.get(Customer, identity.customer_id)
            expected = payload.model_dump(mode='json', exclude={'acknowledge_duplicate','duplicate_reason'})
            expected['email'] = str(expected['email']).lower() if expected['email'] else None
            if identity.content_sha256 != content_sha:
                entry.update(outcome='CONFLICT', code='SOURCE_IDENTITY_CONFLICT')
            elif not customer or not customer.is_active or any(getattr(customer,k) != v for k,v in expected.items()):
                entry.update(outcome='CONFLICT', code='TARGET_CHANGED')
            else:
                entry.update(outcome='DUPLICATE', code='KNOWN_IDENTITY', customer_id=customer.id)
        else:
            try:
                master.validate_values(db, 'customers', payload.model_dump())
            except SecurityError as failure:
                entry.update(outcome='CONFLICT' if failure.code == 'POSSIBLE_DUPLICATE' else 'REJECTED',
                             code='BUSINESS_IDENTITY_CONFLICT' if failure.code == 'POSSIBLE_DUPLICATE' else 'NATIVE_RULE_REJECTED')
        plan.append(entry)
    for entry in plan:
        if sum(p['source_key_sha256'] == entry['source_key_sha256'] for p in plan) > 1:
            entry.update(outcome='CONFLICT', code='SOURCE_IDENTITY_CONFLICT')
    if any(p['outcome'] in {'CONFLICT','REJECTED'} for p in plan):
        for entry in plan:
            if entry['outcome'] in {'APPLIED','DUPLICATE'}:
                entry.update(outcome='REJECTED', code='BATCH_REJECTED', customer_id=None)
    return plan


def consume(db, ctx, source_id, request):
    source, revision, run, approval = approved_metadata(db, source_id, request)
    request_sha = review.digest({'source_id': source_id, **request.model_dump(mode='json')})
    receipt = db.scalar(select(CustomerImportReceipt).where(CustomerImportReceipt.revision_id == revision.id))
    if receipt:
        if receipt.request_sha256 != request_sha:
            review.error('IDEMPOTENCY_CONFLICT', 'This selection already has a different immutable receipt')
        # This is a historical receipt lookup, not consumption of approval a second
        # time. Our own customer insert necessarily changed the reference catalog.
        db.add(CustomerImportAttempt(receipt_id=receipt.id, actor_id=ctx.user.id, kind='DUPLICATE_RETRY'))
        audit(db, ctx, 'duplicate_retry', receipt); db.flush()
        result = reconciliation(db, receipt, retry=True); db.commit(); return result
    # Covers raw SQL customer writers too. Lock ordering is security -> source ->
    # customers. Native API writers already take the same security lock first.
    db.execute(text('LOCK TABLE customers IN SHARE ROW EXCLUSIVE MODE'))
    result, refs = review.calculate(db, source, revision)
    if refs != run.reference_sha256:
        review.error('STALE_REFERENCES', 'Customer references changed; validate and independently approve again')
    if review.digest(result) != run.result_sha256 or not result['selection_valid']:
        review.error('VALIDATION_CHANGED', 'Recomputed source validation differs from the approved run')
    plan = plan_rows(db, source, revision, result)
    counts = {'selected_rows': len(plan), 'validated_rows': len(plan),
              'applied_rows': sum(p['outcome'] == 'APPLIED' for p in plan),
              'duplicate_rows': sum(p['outcome'] == 'DUPLICATE' for p in plan),
              'rejected_rows': sum(p['outcome'] in {'REJECTED','CONFLICT'} for p in plan),
              'conflicts': sum(p['outcome'] == 'CONFLICT' for p in plan)}
    outcome = 'CONFLICT' if counts['conflicts'] else 'REJECTED' if counts['rejected_rows'] else 'APPLIED'
    receipt = CustomerImportReceipt(source_id=source.id, revision_id=revision.id, validation_id=run.id,
        approval_id=approval.id, request_sha256=request_sha, source_sha256=source.sha256,
        binding_sha256=run.binding_sha256, actor_id=ctx.user.id, outcome=outcome, **counts)
    db.add(receipt); db.flush()
    for entry in plan:
        if entry['outcome'] == 'APPLIED':
            created = master.save(db, ctx, 'customers', entry['payload'], commit_changes=False)
            entry['customer_id'] = uuid.UUID(created['id'])
            db.add(CustomerImportIdentity(namespace=source.namespace, source_key_sha256=entry['source_key_sha256'],
                content_sha256=entry['content_sha256'], customer_id=entry['customer_id'], receipt_id=receipt.id, actor_id=ctx.user.id))
        db.add(CustomerImportRow(receipt_id=receipt.id, actor_id=ctx.user.id,
            **{k:v for k,v in entry.items() if k != 'payload'}))
    db.add(CustomerImportAttempt(receipt_id=receipt.id, actor_id=ctx.user.id, kind='INITIAL'))
    audit(db, ctx, outcome.lower(), receipt); db.flush()
    response = reconciliation(db, receipt, retry=False)
    db.commit()  # The single native PostgreSQL commit for all business effects/history.
    return response


def execute(engine, principal, source_id, request):
    if not isinstance(engine, Engine):
        raise TypeError('Synthetic customer import requires an Engine, not a caller-owned transaction')
    request = CustomerImportRequest.model_validate(request)
    source_id = uuid.UUID(str(source_id))
    # gate() configures only this owned connection before its first SQL statement.
    with Session(bind=engine, autoflush=False, expire_on_commit=False) as db:
        gate(db)  # Fail closed before user/review/import table access or denial writes.
        ctx = None
        audit_actor = None
        try:
            ctx = authorize(db, principal)
            # A failed ORM flush expires persistent attributes before rollback.
            # Capture authenticated identity while it is readable; denial auditing
            # must not query an expired User through an aborted transaction.
            audit_actor = SimpleNamespace(id=ctx.user.id, username=ctx.user.username)
            if 'customers.create' not in ctx.permissions or not {r.code for r in ctx.user.roles} & {'SUPER_ADMIN', 'OPERATIONS'}:
                review.error('PERMISSION_DENIED', 'Native customer creation and synthetic review access are required', 403)
            return consume(db, ctx, source_id, request)
        except SecurityError as failure:
            deny(db, failure.status, failure.code, failure.message, audit_actor,
                 action='customer_import.denied', details={'id': str(source_id)})
        except IntegrityError:
            deny(db, 409, 'IMPORT_CONFLICT', 'Database uniqueness or native integrity prevented this import',
                 audit_actor, action='customer_import.denied', details={'id': str(source_id)})
        except BaseException:
            db.rollback()
            raise
