"""Durable review uses synthetic actors/files and independently migrated databases."""
import base64
import json
import uuid
from concurrent.futures import ThreadPoolExecutor
from types import SimpleNamespace
import pytest
from sqlalchemy import select, text, inspect, MetaData, Table
from sqlalchemy.exc import IntegrityError
from fastapi.testclient import TestClient
from app.main import app
from app.core.config import get_settings
from app.core.security import SecurityError
from app.models.security import User, AuditEvent
from app.models.master import Customer
from app.models.import_review import SourceManifest, ReviewRevision, ValidationRun, ReviewDecision
from app.schemas.import_review import SourceUpload, Action
from app.schemas.security import UserCreate
from app.services.users import create_user
from app.services import import_review as review
from app.services.review_snapshot import inventory_snapshot
from tests.test_security import security_db, accounts, browser, login, csrf, ORIGIN  # noqa: F401
from tests.test_onboarding import book


@pytest.fixture
def enabled(monkeypatch, tmp_path):
    monkeypatch.setattr(get_settings(), 'durable_review_enabled', True)
    monkeypatch.setattr(get_settings(), 'durable_review_storage_dir', str(tmp_path / 'sources'))


@pytest.fixture
def actors(accounts, security_db):
    maker, _ = security_db
    with maker() as db:
        admin = db.get(User, accounts['admin'])
        approver = create_user(db, UserCreate(username='review.approver', display_name='Synthetic Approver', password=accounts['password'], roles=['SUPER_ADMIN']), admin)
        worker = create_user(db, UserCreate(username='review.worker', display_name='Synthetic Worker', password=accounts['password'], roles=['ACCOUNTS']), admin)
        db.commit()
        return {'uploader': accounts['operator'], 'reviewer': accounts['admin'], 'approver': approver.id, 'worker': worker.id}


def ctx(db, actor):
    return SimpleNamespace(user=db.get(User, actor))


def upload(text_value='Name,Email\nSynthetic New,new@example.com\n', namespace='synthetic.test', **kwargs):
    return SourceUpload(category='customers', filename='synthetic.csv', content_base64=base64.b64encode(text_value.encode()).decode(), namespace=namespace, synthetic_only=True, **kwargs)


def selection(**kwargs):
    return dict(category='customers', sheet=0, header_row=1, header_span=1, mapping={'name': 'A', 'email': 'B'}, mapping_version='synthetic-1', date_format='iso', selected_rows=[2], source_keys={'2': 'SYNTH-1'}, intended_action='PROPOSE_CREATE', **kwargs)


def seeded(maker, actors):
    with maker() as db:
        source = review.create_source(db, ctx(db, actors['uploader']), upload())
        revision = review.revise(db, ctx(db, actors['uploader']), source.id, selection(), 0)
        return source.id, revision.id


def validated(maker, actors, source_id):
    with maker() as db:
        source = db.get(SourceManifest, source_id); revision = review.latest(db, source_id)
        with inventory_snapshot(db) as snapshot:
            result, refs = review.calculate(snapshot, source, revision)
        return review.save_validation(db, ctx(db, actors['uploader']), source_id, revision.version, result, refs).id


def decide(maker, actors, source_id, kind, actor):
    with maker() as db:
        revision = review.latest(db, source_id)
        refs = review.reference_version(db, revision.selection['category'])
        return review.decision(db, ctx(db, actors[actor]), source_id, Action(expected_version=revision.version, reason='Synthetic reviewed decision'), kind, refs).state


def business_fingerprint(maker):
    with maker() as db:
        names = inspect(db.bind).get_table_names()
        excluded = {'audit_events', 'sessions', 'login_rate_buckets'}
        return {name: review.digest(sorted([list(row) for row in db.execute(select(Table(name, MetaData(), autoload_with=db.bind)))], key=str)) for name in names if not name.startswith('import_review_') and name not in excluded}


def test_persistence_approval_and_zero_business_changes(enabled, actors, security_db):
    maker, _ = security_db
    before = business_fingerprint(maker)
    source_id, revision_id = seeded(maker, actors)
    run_id = validated(maker, actors, source_id)
    assert decide(maker, actors, source_id, 'REVIEWED', 'reviewer') == 'READY_FOR_APPROVAL'
    assert decide(maker, actors, source_id, 'APPROVED', 'approver') == 'APPROVED'
    with maker() as db:
        source = db.get(SourceManifest, source_id); revision = db.get(ReviewRevision, revision_id); run = db.get(ValidationRun, run_id)
        assert review.load(source.sha256).startswith(b'Name,Email')
        assert run.result['records'][0]['original'] == {'name': 'Synthetic New', 'email': 'new@example.com'}
        assert run.binding_sha256 == review.binding(source, revision, run.result_sha256, run.reference_sha256)
        assert db.scalar(select(ReviewDecision).where(ReviewDecision.kind == 'APPROVED')).actor_id == actors['approver']
        audits = list(db.scalars(select(AuditEvent).where(AuditEvent.action.like('import_review.%'))))
        assert len(audits) == 5
        assert all(set(a.details) == {'id'} and 'Synthetic New' not in json.dumps(a.details) for a in audits)
    assert business_fingerprint(maker) == before


@pytest.mark.parametrize('actor', ['uploader', 'reviewer'])
def test_separation(enabled, actors, security_db, actor):
    maker, _ = security_db; source_id, _ = seeded(maker, actors); validated(maker, actors, source_id)
    decide(maker, actors, source_id, 'REVIEWED', 'reviewer')
    with pytest.raises(SecurityError, match='approver must differ'):
        decide(maker, actors, source_id, 'APPROVED', actor)


def test_mapping_revision_invalidates_approval(enabled, actors, security_db):
    maker, _ = security_db; source_id, old_id = seeded(maker, actors); validated(maker, actors, source_id)
    decide(maker, actors, source_id, 'REVIEWED', 'reviewer'); decide(maker, actors, source_id, 'APPROVED', 'approver')
    with maker() as db:
        old = review.latest(db, source_id); changed = selection(); changed['mapping_version'] = 'synthetic-2'
        new = review.revise(db, ctx(db, actors['uploader']), source_id, changed, old.version)
        assert new.id != old_id and new.state == 'RECEIVED'
        assert db.get(ReviewRevision, old_id).state == 'REVIEW_REQUIRED'
        assert db.scalar(select(ReviewDecision).where(ReviewDecision.kind == 'INVALIDATED'))
    with pytest.raises(SecurityError):
        decide(maker, actors, source_id, 'APPROVED', 'approver')


def test_reference_change_rejects_stale_approval(enabled, actors, security_db):
    maker, _ = security_db; source_id, _ = seeded(maker, actors); validated(maker, actors, source_id)
    decide(maker, actors, source_id, 'REVIEWED', 'reviewer')
    with maker() as db:
        db.add(Customer(name='Synthetic reference added', normalized_name='synthetic reference added', customer_type='COMPANY', created_by=actors['reviewer'], code='QA-REF')); db.commit()
    with pytest.raises(SecurityError) as failed:
        decide(maker, actors, source_id, 'APPROVED', 'approver')
    assert failed.value.code == 'STALE_REFERENCES'
    with maker() as db: assert review.latest(db, source_id).state == 'REVIEW_REQUIRED'


@pytest.mark.parametrize('kind', ['REJECTED', 'CANCELLED'])
def test_closed_lifecycle(enabled, actors, security_db, kind):
    maker, _ = security_db; source_id, _ = seeded(maker, actors)
    assert decide(maker, actors, source_id, kind, 'reviewer') == kind
    with pytest.raises(SecurityError): decide(maker, actors, source_id, 'REVIEWED', 'reviewer')


def test_duplicate_manifest_and_namespace(enabled, actors, security_db):
    maker, _ = security_db; seeded(maker, actors)
    with maker() as db:
        with pytest.raises(SecurityError) as duplicate: review.create_source(db, ctx(db, actors['uploader']), upload())
        assert duplicate.value.code == 'DUPLICATE_SOURCE'
        db.rollback()
        assert review.create_source(db, ctx(db, actors['uploader']), upload(namespace='synthetic.other')).id


def test_duplicate_source_keys_and_missing_row(enabled, actors, security_db):
    maker, _ = security_db; source_id, _ = seeded(maker, actors)
    with maker() as db:
        selected = selection(); selected.update(selected_rows=[2,3], source_keys={'2':'SAME','3':'same'})
        rev = review.revise(db, ctx(db, actors['uploader']), source_id, selected, 1)
        with inventory_snapshot(db) as snapshot:
            result, _ = review.calculate(snapshot, db.get(SourceManifest, source_id), rev)
        assert {i['code'] for i in result['selection_issues']} == {'DUPLICATE_SOURCE_IDENTITY', 'SOURCE_ROW_MISSING'}
        assert not result['selection_valid']


@pytest.mark.parametrize('table', ['import_review_sources','import_review_revisions','import_review_validations','import_review_decisions'])
def test_history_immutable_in_postgres(enabled, actors, security_db, table):
    maker, _ = security_db; source_id, _ = seeded(maker, actors); validated(maker, actors, source_id)
    decide(maker, actors, source_id, 'REVIEWED', 'reviewer')
    with maker() as db:
        with pytest.raises(IntegrityError): db.execute(text(f'DELETE FROM {table}'))
        db.rollback()


def test_concurrent_review_versions(enabled, actors, security_db):
    maker, _ = security_db; source_id, _ = seeded(maker, actors)
    def attempt(index):
        with maker() as db:
            changed = selection(); changed['mapping_version'] = f'parallel-{index}'
            try:
                review.revise(db, ctx(db, actors['uploader']), source_id, changed, 1)
                return 'saved'
            except SecurityError as failure:
                db.rollback(); return failure.code
    with ThreadPoolExecutor(2) as pool: result = list(pool.map(attempt, [1,2]))
    assert sorted(result) == ['STALE_VERSION', 'saved']


@pytest.mark.parametrize('value', ['=1+1', '@SUM(A1)', '+CMD'])
def test_inert_formula_results_persist(enabled, actors, security_db, value):
    maker, _ = security_db
    with maker() as db:
        source = review.create_source(db, ctx(db, actors['uploader']), upload(f'Name,Email\n{value},qa@example.com\n'))
        review.revise(db, ctx(db, actors['uploader']), source.id, selection(), 0); identity = source.id
    run_id = validated(maker, actors, identity)
    with maker() as db:
        run = db.get(ValidationRun, run_id)
        assert not run.result['selection_valid']
        assert any('FORMULA' in issue['code'] for issue in run.result['records'][0]['issues'])


def test_corrupt_source_blocks_validation(enabled, actors, security_db):
    maker, _ = security_db; source_id, _ = seeded(maker, actors)
    with maker() as db:
        source = db.get(SourceManifest, source_id)
        (review.storage()/source.sha256).write_bytes(b'altered')
    with pytest.raises(SecurityError) as failed: validated(maker, actors, source_id)
    assert failed.value.code == 'SOURCE_INTEGRITY'


def test_unsafe_external_file_rejected(enabled, actors, security_db):
    maker, _ = security_db
    data=upload(); data.filename='synthetic.xlsx'; data.content_base64=base64.b64encode(book([['Name'],['Synthetic']],external=True)).decode()
    with maker() as db:
        with pytest.raises(SecurityError): review.create_source(db, ctx(db, actors['uploader']), data)
        assert not db.scalar(select(SourceManifest))


def test_api_auth_csrf_role_and_gate(enabled, actors, accounts, browser, security_db, monkeypatch):
    path='/api/onboarding/review/sources'
    assert browser.get(path).status_code == 401
    assert login(browser, accounts).status_code == 200
    assert browser.post(path,json=upload().model_dump()).status_code == 403
    response=browser.post(path,json=upload().model_dump(),headers=csrf(browser)); assert response.status_code == 201, response.text
    identity=response.json()['id']
    assert browser.get(path).json()['sources'][0]['id'] == identity
    monkeypatch.setattr(get_settings(),'durable_review_enabled',False)
    assert browser.get(path).status_code == 404


def test_unauthorized_role_and_approval(enabled, actors, accounts, security_db):
    with TestClient(app,base_url=ORIGIN,headers={'Origin':ORIGIN}) as client:
        assert login(client,accounts,'review.worker').status_code == 200
        assert client.get('/api/onboarding/review/sources').status_code == 403
    maker,_=security_db; identity,_=seeded(maker,actors); validated(maker,actors,identity)
    decide(maker,actors,identity,'REVIEWED','reviewer')
    with TestClient(app,base_url=ORIGIN,headers={'Origin':ORIGIN}) as client:
        assert login(client,accounts,'test.operations').status_code == 200
        response=client.post(f'/api/onboarding/review/sources/{identity}/approve',json={'expected_version':3,'reason':'Synthetic approval'},headers=csrf(client))
        assert response.status_code == 403


def test_no_execution_route():
    paths = {path for path in app.openapi()['paths'] if '/onboarding/review/' in path}
    assert paths and not any(any(word in path for word in ('/execute','/apply','/import')) for path in paths)


def test_api_complete_review_persistence(enabled, actors, accounts, browser, security_db):
    path='/api/onboarding/review/sources'
    assert login(browser,accounts,'test.operations').status_code == 200
    def post(suffix, body):
        response=browser.post(path+suffix,json=body,headers=csrf(browser))
        assert response.status_code in {200,201}, response.text
        return response.json()
    identity=post('',upload().model_dump())['id']
    post('/'+identity+'/revisions',dict(selection(),expected_version=0))
    post('/'+identity+'/validate',{'expected_version':1,'reason':'Synthetic validation'})
    assert browser.get(path+'/'+identity).json()['revision']['state'] == 'VALIDATED'
    assert browser.post('/api/auth/logout',json={},headers=csrf(browser)).status_code == 200
    assert login(browser,accounts).status_code == 200
    post('/'+identity+'/review',{'expected_version':2,'reason':'Synthetic independent review'})
    assert browser.post('/api/auth/logout',json={},headers=csrf(browser)).status_code == 200
    assert login(browser,accounts,'review.approver').status_code == 200
    post('/'+identity+'/approve',{'expected_version':3,'reason':'Synthetic independent approval'})
    final=browser.get(path+'/'+identity).json()
    assert final['approval_effective'] and final['revision']['state']=='APPROVED'
    assert len(final['validations'])==1 and len(final['decisions'])==2
    assert browser.post(path+'/'+identity+'/apply',json={},headers=csrf(browser)).status_code==404


@pytest.mark.parametrize('change',['bytes','policy'])
def test_source_and_policy_change_blocks_approval(enabled, actors, security_db, monkeypatch, change):
    maker,_=security_db; identity,_=seeded(maker,actors);validated(maker,actors,identity)
    decide(maker,actors,identity,'REVIEWED','reviewer')
    if change=='policy':monkeypatch.setattr(review,'POLICY_VERSION','synthetic-policy-2')
    else:
        with maker() as db:(review.storage()/db.get(SourceManifest,identity).sha256).write_bytes(b'changed')
    with pytest.raises(SecurityError) as failure:decide(maker,actors,identity,'APPROVED','approver')
    assert failure.value.code in {'STALE_POLICY','SOURCE_INTEGRITY'}


def test_company_and_production_gate(enabled,monkeypatch):
    from sqlalchemy import URL
    def db(name):return SimpleNamespace(get_bind=lambda:SimpleNamespace(url=URL.create('postgresql',database=name)))
    assert not review.available(db('company_erp'))
    assert review.available(db('ambs_test_'+uuid.uuid4().hex))
    monkeypatch.setattr(get_settings(),'app_env','production')
    assert not review.available(db('ambs_test_'+uuid.uuid4().hex))


def test_new_policy_has_distinct_immutable_source(enabled,actors,security_db,monkeypatch):
    maker,_=security_db; identity,_=seeded(maker,actors)
    monkeypatch.setattr(review,'POLICY_VERSION','synthetic-policy-2')
    with maker() as db:
        new=review.create_source(db,ctx(db,actors['uploader']),upload())
        assert new.id!=identity and new.sha256==db.get(SourceManifest,identity).sha256


def test_concurrent_approval_one_decision(enabled,actors,security_db):
    maker,_=security_db; identity,_=seeded(maker,actors);validated(maker,actors,identity)
    decide(maker,actors,identity,'REVIEWED','reviewer')
    def attempt(_):
        with maker() as db:
            try:
                refs=review.reference_version(db,'customers')
                review.decision(db,ctx(db,actors['approver']),identity,Action(expected_version=3,reason='Synthetic concurrent approval'),'APPROVED',refs)
                return 'saved'
            except SecurityError as failed:db.rollback();return failed.code
    with ThreadPoolExecutor(2) as pool:results=list(pool.map(attempt,[1,2]))
    assert sorted(results)==['STALE_VERSION','saved']
    with maker() as db:assert len(list(db.scalars(select(ReviewDecision).where(ReviewDecision.kind=='APPROVED'))))==1


def test_validation_reference_snapshot_is_consistent(enabled,actors,security_db):
    maker,_=security_db; identity,_=seeded(maker,actors)
    with maker() as db:
        source=db.get(SourceManifest,identity);revision=review.latest(db,identity)
        with inventory_snapshot(db) as snapshot:
            before=review.reference_version(snapshot,'customers')
            with maker() as writer:
                writer.add(Customer(name='Synthetic concurrent reference',normalized_name='synthetic concurrent reference',code='QA-CONCURRENT',created_by=actors['reviewer']));writer.commit()
            result,refs=review.calculate(snapshot,source,revision)
            assert refs==before and result['selection_valid']
        assert review.reference_version(db,'customers')!=before
