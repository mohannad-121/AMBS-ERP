"""Synthetic metadata API. Intentionally has no import/apply operation."""
import uuid
from fastapi import APIRouter, Depends, Request, Query
from sqlalchemy import select
from sqlalchemy.orm import Session
from app.api.onboarding import access
from app.db.session import get_session
from app.models.import_review import SourceManifest, ReviewRevision, ValidationRun, ReviewDecision
from app.schemas.import_review import SourceUpload, RevisionInput, Action
from app.services import import_review as review
from app.services.review_snapshot import review_request

router = APIRouter(prefix='/onboarding/review', tags=['Synthetic durable review only'])


def access_review(context=Depends(access), db: Session=Depends(get_session)):
    review.gate(db)
    return context


def required(db, source_id):
    source = db.get(SourceManifest, source_id)
    if not source:
        review.error('NOT_FOUND', 'Saved source not found', 404)
    return source


def revision_payload(revision):
    return {k: getattr(revision, k) for k in ('id', 'ordinal', 'selection', 'selection_sha256', 'state', 'version', 'actor_id', 'created_at')}


@router.get('/sources')
def sources(request: Request, offset: int=Query(0, ge=0, le=100000), limit: int=Query(20, ge=1, le=50), context=Depends(access_review), db: Session=Depends(get_session)):
    with review_request(db, context, request) as snapshot:
        rows = list(snapshot.scalars(select(SourceManifest).order_by(SourceManifest.created_at.desc(), SourceManifest.id).offset(offset).limit(limit + 1)))
        result = {'notice': review.NOTICE, 'has_more': len(rows) > limit, 'sources': []}
        for source in rows[:limit]:
            revision = review.latest(snapshot, source.id)
            result['sources'].append({**review.source_payload(source), 'revision': revision_payload(revision) if revision else None})
    db.commit()
    return result


@router.post('/sources', status_code=201)
def upload(data: SourceUpload, context=Depends(access_review), db: Session=Depends(get_session)):
    return review.source_payload(review.create_source(db, context, data))


@router.get('/sources/{source_id}')
def detail(source_id: uuid.UUID, request: Request, context=Depends(access_review), db: Session=Depends(get_session)):
    with review_request(db, context, request) as snapshot:
        source = required(snapshot, source_id)
        revision = review.latest(snapshot, source_id)
        result = {'notice': review.NOTICE, 'source': review.source_payload(source), 'revision': None, 'validations': [], 'decisions': [], 'approval_effective': False}
        result['revisions'] = [revision_payload(r) for r in snapshot.scalars(select(ReviewRevision).where(ReviewRevision.source_id == source_id).order_by(ReviewRevision.ordinal.desc()).limit(50))]
        if revision:
            result['revision'] = revision_payload(revision)
            runs = list(snapshot.scalars(select(ValidationRun).where(ValidationRun.revision_id == revision.id).order_by(ValidationRun.created_at.desc(), ValidationRun.id.desc()).limit(20)))
            result['validations'] = [{k: getattr(run, k) for k in ('id', 'result', 'result_sha256', 'reference_sha256', 'binding_sha256', 'actor_id', 'created_at')} for run in runs]
            result['decisions'] = [{k: getattr(d, k) for k in ('id', 'validation_id', 'kind', 'reason', 'actor_id', 'binding_sha256', 'created_at')} for d in snapshot.scalars(select(ReviewDecision).where(ReviewDecision.revision_id == revision.id).order_by(ReviewDecision.created_at.desc()).limit(50))]
            if runs and revision.state == 'APPROVED':
                review.load(source.sha256)
                refs = review.reference_version(snapshot, revision.selection['category'])
                result['approval_effective'] = source.parser_version == review.PARSER_VERSION and source.policy_version == review.POLICY_VERSION and runs[0].reference_sha256 == refs and runs[0].binding_sha256 == review.binding(source, revision, runs[0].result_sha256, refs)
                if not result['approval_effective']:
                    result['approval_warning'] = 'STALE_REFERENCES: approval is invalid; validate and review again'
    db.commit()
    return result


@router.post('/sources/{source_id}/revisions')
def revise(source_id: uuid.UUID, data: RevisionInput, context=Depends(access_review), db: Session=Depends(get_session)):
    return revision_payload(review.revise(db, context, source_id, data.model_dump(exclude={'expected_version'}), data.expected_version))


@router.post('/sources/{source_id}/validate')
def validate(source_id: uuid.UUID, data: Action, request: Request, context=Depends(access_review), db: Session=Depends(get_session)):
    with review_request(db, context, request) as snapshot:
        source = required(snapshot, source_id)
        revision = review.latest(snapshot, source_id)
        if not revision or revision.version != data.expected_version:
            review.error('STALE_VERSION', 'Select the current revision before validating')
        result, refs = review.calculate(snapshot, source, revision)
    run = review.save_validation(db, context, source_id, data.expected_version, result, refs)
    return {'id': run.id, 'binding_sha256': run.binding_sha256, 'result': run.result}


def decide(db, context, source_id, data, kind):
    if kind == 'APPROVED' and not any(r.code == 'SUPER_ADMIN' for r in context.user.roles):
        from app.core.security import deny
        deny(db, 403, 'PERMISSION_DENIED', 'Only a separate administrator can approve', context.user, details={'resource': 'synthetic_review'})
    refs = None
    if kind in {'REVIEWED', 'APPROVED'}:
        # Existing security transaction serializes API reference mutations.
        # These bounded checks never take the inventory posting lock.
        revision = review.latest(db, source_id)
        if revision:
            refs = review.reference_version(db, revision.selection['category'])
    try:
        return revision_payload(review.decision(db, context, source_id, data, kind, refs))
    except review.SecurityError as failure:
        from app.core.security import deny
        deny(db, failure.status, failure.code, failure.message, context.user,
             action='import_review.decision_denied', details={'id': str(source_id)})


@router.post('/sources/{source_id}/review')
def reviewed(source_id: uuid.UUID, data: Action, context=Depends(access_review), db: Session=Depends(get_session)):
    return decide(db, context, source_id, data, 'REVIEWED')


@router.post('/sources/{source_id}/approve')
def approved(source_id: uuid.UUID, data: Action, context=Depends(access_review), db: Session=Depends(get_session)):
    return decide(db, context, source_id, data, 'APPROVED')


@router.post('/sources/{source_id}/reject')
def rejected(source_id: uuid.UUID, data: Action, context=Depends(access_review), db: Session=Depends(get_session)):
    return decide(db, context, source_id, data, 'REJECTED')


@router.post('/sources/{source_id}/cancel')
def cancelled(source_id: uuid.UUID, data: Action, context=Depends(access_review), db: Session=Depends(get_session)):
    return decide(db, context, source_id, data, 'CANCELLED')
