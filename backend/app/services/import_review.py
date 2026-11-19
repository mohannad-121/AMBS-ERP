"""Durable, synthetic-only review metadata. No business write or import executor."""
import base64
import hashlib
import json
import os
import re
from pathlib import Path
from types import SimpleNamespace
from sqlalchemy import select
from app.core.config import get_settings
from app.core.security import SecurityError
from app.models.import_review import SourceManifest, ReviewRevision, ValidationRun, ReviewDecision
from app.models.security import AuditEvent, User
from app.services import onboarding as preview

PARSER_VERSION = 'phase8a-1'
POLICY_VERSION = 'p9-1-synthetic-1'
NOTICE = 'NO DATA HAS BEEN IMPORTED'


def digest(value):
    return hashlib.sha256(json.dumps(value, sort_keys=True, separators=(',', ':'), default=str).encode()).hexdigest()


def available(db):
    settings = get_settings()
    name = db.get_bind().url.database or ''
    return settings.durable_review_enabled and settings.app_env == 'test' and bool(re.fullmatch(r'ambs_(?:http_)?test_[0-9a-f]{8,32}', name))


def gate(db):
    if not available(db):
        raise SecurityError(404, 'REVIEW_DISABLED', 'Durable review is available only in explicitly enabled synthetic test databases')


def error(code, message, status=409):
    raise SecurityError(status, code, message)


def storage():
    root = Path(get_settings().durable_review_storage_dir)
    if not root.is_absolute() or root.is_symlink():
        error('STORAGE_UNAVAILABLE', 'Private synthetic storage is unavailable', 503)
    root.mkdir(parents=True, exist_ok=True, mode=0o700)
    if any(p.is_symlink() for p in [root, *root.parents]):
        error('STORAGE_UNAVAILABLE', 'Private synthetic storage is unavailable', 503)
    return root


def store(raw, sha):
    target = storage() / sha
    try:
        fd = os.open(target, os.O_WRONLY | os.O_CREAT | os.O_EXCL | getattr(os, 'O_NOFOLLOW', 0), 0o600)
    except FileExistsError:
        if load(sha) != raw:
            error('SOURCE_INTEGRITY', 'Stored synthetic source failed integrity verification', 503)
        return
    with os.fdopen(fd, 'wb') as stream:
        stream.write(raw)
        stream.flush()
        os.fsync(stream.fileno())


def load(sha):
    if not re.fullmatch('[0-9a-f]{64}', sha):
        error('SOURCE_INTEGRITY', 'Invalid source identity', 503)
    try:
        fd = os.open(storage() / sha, os.O_RDONLY | getattr(os, 'O_NOFOLLOW', 0))
        with os.fdopen(fd, 'rb') as stream:
            raw = stream.read(4 * 1024 * 1024 + 1)
    except OSError:
        error('SOURCE_INTEGRITY', 'Synthetic source is unavailable; no approval can proceed', 503)
    if len(raw) > 4 * 1024 * 1024 or hashlib.sha256(raw).hexdigest() != sha:
        error('SOURCE_INTEGRITY', 'Synthetic source failed integrity verification', 503)
    return raw


def audit(db, ctx, action, identity):
    db.add(AuditEvent(actor_id=ctx.user.id, actor_username=ctx.user.username,
                      action='import_review.' + action, target_type='synthetic_review',
                      details={'id': str(identity)}))


def create_source(db, ctx, data):
    gate(db)
    inspected = preview.inspect_file(data)  # All existing inert parser limits apply first.
    sha = inspected['sha256']
    if db.scalar(select(SourceManifest.id).where(SourceManifest.namespace == data.namespace, SourceManifest.sha256 == sha, SourceManifest.parser_version == PARSER_VERSION, SourceManifest.policy_version == POLICY_VERSION)):
        error('DUPLICATE_SOURCE', 'This exact source already exists in this namespace')
    raw = preview.decode(data.filename, data.content_base64)
    store(raw, sha)
    source = SourceManifest(namespace=data.namespace, sha256=sha, format=data.filename.rsplit('.', 1)[-1].lower(),
                            parser_version=PARSER_VERSION, policy_version=POLICY_VERSION, actor_id=ctx.user.id)
    db.add(source); db.flush()
    audit(db, ctx, 'source_received', source.id)
    db.commit()
    return source


def source_payload(source):
    return {key: getattr(source, key) for key in ('id', 'namespace', 'sha256', 'format', 'parser_version', 'policy_version', 'actor_id', 'created_at')}


def latest(db, source_id, *, lock=False):
    query = select(ReviewRevision).where(ReviewRevision.source_id == source_id).order_by(ReviewRevision.ordinal.desc()).limit(1)
    return db.scalar(query.with_for_update() if lock else query)


def locked(db, source_id, expected):
    source = db.scalar(select(SourceManifest).where(SourceManifest.id == source_id).with_for_update())
    if not source:
        error('NOT_FOUND', 'Saved source not found', 404)
    revision = latest(db, source_id, lock=True)
    if (revision.version if revision else 0) != expected:
        error('STALE_VERSION', 'Review changed. Refresh before submitting another decision')
    return source, revision


def invalidate(db, revision, ctx, reason):
    if revision and revision.state == 'APPROVED':
        run = latest_run(db, revision.id)
        db.add(ReviewDecision(revision_id=revision.id, validation_id=run.id, binding_sha256=run.binding_sha256,
                              kind='INVALIDATED', reason=reason, actor_id=ctx.user.id))
        revision.state = 'REVIEW_REQUIRED'
        revision.version += 1


def revise(db, ctx, source_id, selection, expected):
    source, old = locked(db, source_id, expected)
    invalidate(db, old, ctx, 'Selection superseded by a new immutable revision')
    revision = ReviewRevision(source_id=source.id, ordinal=old.ordinal + 1 if old else 1,
                              selection=selection, selection_sha256=digest(selection), actor_id=ctx.user.id,
                              version=old.version + 1 if old else 1)
    db.add(revision); db.flush(); audit(db, ctx, 'revision_created', revision.id); db.commit()
    return revision


def latest_run(db, revision_id):
    return db.scalar(select(ValidationRun).where(ValidationRun.revision_id == revision_id).order_by(ValidationRun.created_at.desc(), ValidationRun.id.desc()).limit(1))


def reference_version(db, category):
    # Hash the bounded reference catalog in the SAME snapshot as validation.
    # Only matching-relevant user fields enter the digest, never credentials/sessions.
    catalog = preview.reference_catalog(db, category)
    identities = {}
    for field, index in catalog.items():
        for rows in index.values():
            for row in rows:
                fields = ('id', 'username', 'display_name', 'is_active') if isinstance(row, User) else tuple(row.__table__.columns.keys())
                values = {k: getattr(row, k) for k in fields}
                if isinstance(row, User):
                    values['roles'] = sorted(role.code for role in row.roles)
                identities[field, str(row.id)] = values
    content = [{'field': field, **values} for (field, _), values in sorted(identities.items())]
    if category == 'packing_deliveries':
        lines = db.execute(select(preview.SalesLine.__table__).order_by(preview.SalesLine.id).limit(10001)).mappings().all()
        if len(lines) > 10000:
            error('REFERENCE_BUDGET', 'Reference history exceeds the synthetic review budget', 422)
        content.extend({'sales_line': dict(row)} for row in lines)
    return digest(content)


def binding(source, revision, result_sha, reference_sha):
    return digest({'source': str(source.id), 'namespace': source.namespace, 'sha256': source.sha256,
                   'parser': source.parser_version, 'policy': source.policy_version,
                   'revision': str(revision.id), 'selection': revision.selection_sha256,
                   'result': result_sha, 'references': reference_sha})


def calculate(db, source, revision):
    selected = revision.selection
    data = SimpleNamespace(**{k: v for k, v in selected.items() if k in {'category', 'sheet', 'header_row', 'header_span', 'mapping', 'date_format'}},
                           filename='synthetic.' + source.format, content_base64=base64.b64encode(load(source.sha256)).decode())
    result = preview.validate(data, db)
    rows = {row['row']: row for row in result['records']}
    selected_rows = selected['selected_rows']
    keys = selected['source_keys']
    issues = []
    if set(keys) != {str(n) for n in selected_rows}:
        issues.append({'code': 'SOURCE_IDENTITY_REQUIRED', 'message': 'Provide one stable source identity for each selected row'})
    if len({value.strip().casefold() for value in keys.values()}) != len(keys):
        issues.append({'code': 'DUPLICATE_SOURCE_IDENTITY', 'message': 'Selected rows must have distinct source identities'})
    if any(n not in rows for n in selected_rows):
        issues.append({'code': 'SOURCE_ROW_MISSING', 'message': 'A selected row is not a data row under this header configuration'})
    expected_action = {'packing_deliveries': 'HISTORICAL_REFERENCE_ONLY', 'physical_stock': 'PHYSICAL_REVIEW_ONLY'}.get(selected['category'])
    if expected_action and selected['intended_action'] != expected_action:
        issues.append({'code': 'UNSAFE_FUTURE_ACTION', 'message': 'This category supports reference/review proposals only'})
    result['records'] = [rows[n] for n in selected_rows if n in rows]
    result['selection_issues'] = issues
    result['notice'] = NOTICE
    result['selection_valid'] = not issues and bool(result['records']) and all(row['valid'] for row in result['records']) and not result['missing_columns']
    return result, reference_version(db, selected['category'])


def save_validation(db, ctx, source_id, expected, result, refs):
    source, revision = locked(db, source_id, expected)
    if not revision or revision.state in {'REJECTED', 'CANCELLED'}:
        error('INVALID_STATE', 'Create a new revision before validating a closed review')
    invalidate(db, revision, ctx, 'A new validation run supersedes the approved run')
    sha = digest(result)
    run = ValidationRun(revision_id=revision.id, result=result, result_sha256=sha, reference_sha256=refs,
                        binding_sha256=binding(source, revision, sha, refs), actor_id=ctx.user.id)
    db.add(run)
    revision.state = 'VALIDATED' if result['selection_valid'] else 'REVIEW_REQUIRED'
    revision.version += 1
    db.flush(); audit(db, ctx, 'validated', run.id); db.commit()
    return run


def decision(db, ctx, source_id, data, kind, refs=None):
    source, revision = locked(db, source_id, data.expected_version)
    if not revision or revision.state in {'REJECTED', 'CANCELLED'}:
        error('INVALID_STATE', 'This review is closed or has no selection revision')
    run = latest_run(db, revision.id)
    if kind in {'REVIEWED', 'APPROVED'}:
        load(source.sha256)
        if source.parser_version != PARSER_VERSION or source.policy_version != POLICY_VERSION:
            error('STALE_POLICY', 'Parser or validation policy changed; receive and review a new source revision')
        if not run or not run.result['selection_valid']:
            error('VALIDATION_REQUIRED', 'Resolve validation errors before reviewing or approving')
        if run.reference_sha256 != refs or run.binding_sha256 != binding(source, revision, run.result_sha256, refs):
            invalidate(db, revision, ctx, 'Reviewed references changed')
            revision.state = 'REVIEW_REQUIRED'; revision.version += 1
            audit(db, ctx, 'stale_approval_rejected', revision.id); db.commit()
            error('STALE_REFERENCES', 'Reference data changed; validate and review a new run')
        if kind == 'APPROVED':
            review = db.scalar(select(ReviewDecision).where(ReviewDecision.revision_id == revision.id, ReviewDecision.validation_id == run.id, ReviewDecision.kind == 'REVIEWED').order_by(ReviewDecision.created_at.desc()).limit(1))
            if revision.state != 'READY_FOR_APPROVAL' or not review:
                error('REVIEW_REQUIRED', 'An independent review of the current run is required')
            if ctx.user.id in {source.actor_id, review.actor_id}:
                error('SEPARATION_REQUIRED', 'The approver must differ from the uploader and reviewer', 403)
        elif revision.state not in {'VALIDATED', 'REVIEW_REQUIRED'}:
            error('INVALID_STATE', 'Validate before recording a new review')
    elif kind not in {'REJECTED', 'CANCELLED'}:
        error('INVALID_ACTION', 'Unsupported review decision', 400)
    invalidate(db, revision, ctx, 'Previous approval superseded by a review decision')
    db.add(ReviewDecision(revision_id=revision.id, validation_id=run.id if run else None,
                          binding_sha256=run.binding_sha256 if run else None, kind=kind, reason=data.reason, actor_id=ctx.user.id))
    revision.state = {'REVIEWED': 'READY_FOR_APPROVAL'}.get(kind, kind)
    revision.version += 1
    audit(db, ctx, kind.lower(), revision.id); db.commit()
    return revision
