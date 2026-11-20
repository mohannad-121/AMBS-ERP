"""Native synthetic execution: real PostgreSQL, sessions, processes and transactions."""
import base64
import json
import os
import subprocess
import sys
import uuid
from concurrent.futures import ThreadPoolExecutor
from types import SimpleNamespace

import pytest
from fastapi import Response
from sqlalchemy import MetaData, Table, create_engine, inspect, select, text
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.core.security import SecurityError, issue_session, utcnow
from app.models.customer_import import CustomerImportAttempt, CustomerImportIdentity, CustomerImportReceipt, CustomerImportRow
from app.models.import_review import ReviewDecision, ReviewRevision, SourceManifest, ValidationRun
from app.models.master import Customer
from app.models.security import AuditEvent, AuthSession, User
from app.schemas.customer_import import CustomerImportRequest
from app.schemas.master import CustomerInput
from app.services import customer_import as importer, import_review as review, master
from tests.test_import_review import actors, ctx, enabled, selection, upload, validated, decide  # noqa: F401
from tests.test_security import security_db, accounts, browser, login, csrf  # noqa: F401

pytestmark = pytest.mark.integration
TEXT = 'Name,Email\nSynthetic Customer One,one@example.com\nSynthetic Customer Two,two@example.com\n'
TABLES = [CustomerImportReceipt, CustomerImportIdentity, CustomerImportRow, CustomerImportAttempt]


@pytest.fixture
def execution(enabled, actors, security_db, monkeypatch):
    monkeypatch.setattr(get_settings(), 'synthetic_customer_import_enabled', True)
    maker, _ = security_db
    principals = {}
    with maker() as db:
        for name, identity in actors.items():
            user = db.get(User, identity)
            session, _ = issue_session(db, Response(), user)
            db.flush()
            principals[name] = SimpleNamespace(user=SimpleNamespace(id=user.id), session=SimpleNamespace(id=session.id))
        db.commit()
    return maker, maker.kw['bind'], principals


def ready(maker, actors, value=TEXT, namespace='synthetic.customers', keys=None):
    with maker() as db:
        source = review.create_source(db, ctx(db, actors['uploader']), upload(value, namespace))
        selected = selection()
        rows = list(range(2, len(value.splitlines()) + 1))
        selected.update(selected_rows=rows, source_keys=keys or {str(n): f'CUSTOMER-{n}' for n in rows})
        review.revise(db, ctx(db, actors['uploader']), source.id, selected, 0)
        identity = source.id
    return approve(maker, actors, identity)


def approve(maker, actors, source_id):
    validated(maker, actors, source_id)
    decide(maker, actors, source_id, 'REVIEWED', 'reviewer')
    decide(maker, actors, source_id, 'APPROVED', 'approver')
    with maker() as db:
        revision = review.latest(db, source_id)
        approval = db.scalar(select(ReviewDecision).where(ReviewDecision.revision_id == revision.id,
            ReviewDecision.kind == 'APPROVED').order_by(ReviewDecision.created_at.desc()).limit(1))
        request = CustomerImportRequest(revision_id=revision.id, validation_id=review.latest_run(db, revision.id).id,
            approval_id=approval.id, expected_version=revision.version)
    return source_id, request


def unrelated(maker):
    with maker() as db:
        excluded = {'customers','audit_events','sessions','login_rate_buckets'}
        names = inspect(db.bind).get_table_names()
        return {name: review.digest(sorted([list(row) for row in db.execute(select(Table(name,MetaData(),autoload_with=db.bind)))],key=str))
            for name in names if name not in excluded and not name.startswith('customer_import_')}


def assert_empty(maker):
    with maker() as db:
        assert not list(db.scalars(select(Customer)))
        for model in TABLES: assert not list(db.scalars(select(model)))
        assert not list(db.scalars(select(AuditEvent).where(AuditEvent.action == 'customers.created')))


def test_success_identical_retry_reconciliation_and_privacy(execution, actors):
    maker, engine, principals = execution
    source, request = ready(maker, actors)
    before = unrelated(maker)
    result = importer.execute(engine, principals['uploader'], source, request)
    assert result['receipt_counts'] == dict(selected_rows=2,validated_rows=2,applied_rows=2,duplicate_rows=0,rejected_rows=0,conflicts=0)
    retry = importer.execute(engine, principals['uploader'], source, request)
    assert retry['receipt_id'] == result['receipt_id'] and retry['duplicate_retries'] == 1
    assert retry['invocation'] == {'duplicate_retry': True, 'applied_rows': 0}
    with maker() as db:
        assert len(list(db.scalars(select(Customer)))) == 2
        assert len(list(db.scalars(select(CustomerImportReceipt)))) == 1
        assert len(list(db.scalars(select(CustomerImportIdentity)))) == 2
        assert len(list(db.scalars(select(CustomerImportRow)))) == 2
        for customer in db.scalars(select(Customer)):
            assert customer.code.startswith('CUS-') and customer.created_by == actors['uploader']
        audits = list(db.scalars(select(AuditEvent).where(AuditEvent.action.like('customer_import.%'))))
        assert len(audits) == 2
        assert all(set(a.details) == {'id','selected_rows','validated_rows','applied_rows','duplicate_rows','rejected_rows','conflicts','duplicate_retry','invocation_applied_rows'} for a in audits)
        assert next(a for a in audits if a.action.endswith('duplicate_retry')).details['invocation_applied_rows'] == 0
        assert 'one@example.com' not in json.dumps([a.details for a in audits])
    assert unrelated(maker) == before


def test_concurrent_duplicate_requests_one_receipt(execution, actors):
    maker, engine, principals = execution; source, request = ready(maker, actors)
    with ThreadPoolExecutor(2) as pool:
        results = list(pool.map(lambda _: importer.execute(engine,principals['uploader'],source,request), range(2)))
    assert results[0]['receipt_id'] == results[1]['receipt_id']
    assert sorted(r['invocation']['applied_rows'] for r in results) == [0,2]
    with maker() as db:
        assert len(list(db.scalars(select(Customer)))) == 2
        assert len(list(db.scalars(select(CustomerImportReceipt)))) == 1


def test_changed_content_same_source_identity_conflicts(execution, actors):
    maker, engine, principals = execution
    source, request = ready(maker, actors)
    importer.execute(engine,principals['uploader'],source,request)
    changed, action = ready(maker,actors,TEXT.replace('Customer One','Changed Customer'))
    response = importer.execute(engine,principals['uploader'],changed,action)
    assert response['outcome'] == 'CONFLICT'
    assert response['receipt_counts']['applied_rows'] == 0 and response['receipt_counts']['conflicts'] == 2
    assert all(r['code'] == 'SOURCE_IDENTITY_CONFLICT' for r in response['rows'])
    assert importer.execute(engine,principals['uploader'],changed,action)['receipt_id'] == response['receipt_id']
    with maker() as db: assert len(list(db.scalars(select(Customer)))) == 2


def test_existing_native_customer_conflict_aborts_whole_batch(execution, actors):
    maker, engine, principals = execution
    with maker() as db:
        existing = master.save(db,ctx(db,actors['uploader']),'customers',CustomerInput(name='Synthetic Customer One'))
    source, request = ready(maker,actors)
    result = importer.execute(engine,principals['uploader'],source,request)
    assert result['outcome'] == 'CONFLICT'
    assert result['receipt_counts'] == dict(selected_rows=2,validated_rows=2,applied_rows=0,duplicate_rows=0,rejected_rows=2,conflicts=1)
    assert [r['code'] for r in result['rows']] == ['BUSINESS_IDENTITY_CONFLICT','BATCH_REJECTED']
    with maker() as db:
        assert [str(c.id) for c in db.scalars(select(Customer))] == [existing['id']]
        assert not list(db.scalars(select(CustomerImportIdentity)))


def test_new_approved_selection_same_bytes_same_keys_deduplicates(execution, actors):
    maker, engine, principals = execution; source, request = ready(maker,actors)
    importer.execute(engine,principals['uploader'],source,request)
    with maker() as db:
        current = review.latest(db,source)
        review.revise(db,ctx(db,actors['uploader']),source,current.selection,current.version)
    _, action = approve(maker,actors,source)
    response = importer.execute(engine,principals['uploader'],source,action)
    assert response['receipt_counts']['duplicate_rows'] == 2 and response['receipt_counts']['applied_rows'] == 0
    with maker() as db: assert len(list(db.scalars(select(Customer)))) == 2


def test_normalized_source_key_collision_is_not_silently_merged(execution, actors):
    maker, engine, principals = execution
    source, request = ready(maker,actors,keys={'2':'KEY','3':'ＫＥＹ'})
    result = importer.execute(engine,principals['uploader'],source,request)
    assert result['receipt_counts']['conflicts'] == 2 and result['receipt_counts']['applied_rows'] == 0


@pytest.mark.parametrize('change', ['references','policy','parser','bytes','missing_bytes','new_revision','approval','inactive_approver','wrong_approval'])
def test_invalid_or_stale_approval_cannot_execute(execution, actors, monkeypatch, change):
    maker, engine, principals = execution; source, request = ready(maker,actors)
    expected = {'references':'STALE_REFERENCES','policy':'STALE_POLICY','parser':'STALE_POLICY','bytes':'SOURCE_INTEGRITY',
        'missing_bytes':'SOURCE_INTEGRITY','new_revision':'STALE_VERSION','approval':'APPROVAL_REQUIRED',
        'inactive_approver':'APPROVAL_REQUIRED','wrong_approval':'APPROVAL_REQUIRED'}[change]
    if change == 'policy': monkeypatch.setattr(review,'POLICY_VERSION','changed-policy')
    elif change == 'parser': monkeypatch.setattr(review,'PARSER_VERSION','changed-parser')
    elif change in {'bytes','missing_bytes'}:
        with maker() as db: path = review.storage()/db.get(SourceManifest,source).sha256
        if change == 'bytes': path.write_bytes(b'changed synthetic bytes')
        else: path.unlink()
    elif change == 'wrong_approval': request = request.model_copy(update={'approval_id':uuid.uuid4()})
    else:
        with maker() as db:
            if change == 'references':
                db.add(Customer(name='Other synthetic reference',normalized_name='other synthetic reference',code='SYNTH-REF',created_by=actors['uploader']))
            elif change == 'inactive_approver': db.get(User,actors['approver']).is_active = False
            elif change == 'new_revision':
                current = review.latest(db,source)
                review.revise(db,ctx(db,actors['uploader']),source,current.selection,current.version)
            else:
                db.get(ReviewRevision,request.revision_id).state = 'VALIDATED'
            db.commit()
    before = unrelated(maker)
    with pytest.raises(SecurityError) as failed: importer.execute(engine,principals['uploader'],source,request)
    assert failed.value.code == expected
    with maker() as db:
        for model in TABLES: assert not list(db.scalars(select(model)))
    assert unrelated(maker) == before


@pytest.mark.parametrize('mode',['worker','revoked','expired','removed_permission'])
def test_fresh_native_authorization_is_required(execution, actors, mode):
    maker, engine, principals = execution; source, request = ready(maker,actors)
    principal = principals['worker'] if mode == 'worker' else principals['uploader']
    with maker() as db:
        if mode == 'revoked': db.get(AuthSession,principal.session.id).revoked_at = utcnow()
        if mode == 'expired': db.get(AuthSession,principal.session.id).expires_at = utcnow()
        if mode == 'removed_permission': db.get(User,actors['uploader']).roles = []
        db.commit()
    # A forged/stale cached permission set cannot grant execution rights.
    principal.permissions = {'customers.create'}
    with pytest.raises(SecurityError) as failure: importer.execute(engine,principal,source,request)
    assert failure.value.status in {401,403}
    assert_empty(maker)
    if mode in {'worker','removed_permission'}:
        with maker() as db:
            denial = db.scalar(select(AuditEvent).where(AuditEvent.action == 'customer_import.denied'))
            assert denial.actor_id == principal.user.id
            assert denial.details == {'reason':'PERMISSION_DENIED','id':str(source)}


@pytest.mark.parametrize('phase',['second_native_row','before_commit'])
def test_partial_failure_rolls_back_native_records_receipt_and_audits(execution, actors, monkeypatch, phase):
    maker, engine, principals = execution; source, request = ready(maker,actors)
    original_save, original_commit = master.save, Session.commit
    if phase == 'before_commit':
        def fail_commit(db): raise RuntimeError('synthetic interrupted commit')
        monkeypatch.setattr(Session,'commit',fail_commit)
    else:
        original = master.save; calls = []
        def fail_save(*args,**kwargs):
            result = original(*args,**kwargs); calls.append(result)
            if len(calls) == 2: raise RuntimeError('synthetic second row failure')
            return result
        monkeypatch.setattr(master,'save',fail_save)
    with pytest.raises(RuntimeError): importer.execute(engine,principals['uploader'],source,request)
    assert_empty(maker)
    monkeypatch.setattr(master,'save',original_save)
    monkeypatch.setattr(Session,'commit',original_commit)
    assert importer.execute(engine,principals['uploader'],source,request)['receipt_counts']['applied_rows'] == 2


@pytest.mark.parametrize('after_commit',[False,True])
def test_real_process_crash_and_retry(execution, actors, after_commit):
    maker, engine, principals = execution; source, request = ready(maker,actors)
    data = {'database':engine.url.database,'source':str(source),'request':request.model_dump(mode='json'),
        'actor':str(principals['uploader'].user.id),'session':str(principals['uploader'].session.id),
        'storage':get_settings().durable_review_storage_dir,'after_commit':after_commit}
    code = '''import json,os,sys,uuid
from types import SimpleNamespace
from sqlalchemy import create_engine
from sqlalchemy.orm import Session
from app.core.config import get_settings
from app.services.customer_import import execute
c=json.load(sys.stdin);s=get_settings();s.durable_review_storage_dir=c['storage']
assert c['database'].startswith('ambs_test_')
engine=create_engine(s.database_url.set(database=c['database']))
principal=SimpleNamespace(user=SimpleNamespace(id=uuid.UUID(c['actor'])),session=SimpleNamespace(id=uuid.UUID(c['session'])))
original=Session.commit
def crash(db):
 if c['after_commit']: original(db)
 os._exit(74 if c['after_commit'] else 73)
Session.commit=crash
execute(engine,principal,c['source'],c['request'])
'''
    child = subprocess.run([sys.executable,'-c',code],input=json.dumps(data),capture_output=True,text=True)
    assert child.returncode == (74 if after_commit else 73), child.stderr
    if not after_commit: assert_empty(maker)
    result = importer.execute(engine,principals['uploader'],source,request)
    assert result['invocation']['applied_rows'] == (0 if after_commit else 2)
    with maker() as db:
        assert len(list(db.scalars(select(Customer)))) == 2
        assert len(list(db.scalars(select(CustomerImportReceipt)))) == 1


def test_native_sql_constraint_failure_rolls_back_and_audits(execution, actors, monkeypatch):
    maker, engine, principals = execution; source, request = ready(maker,actors)
    original = master.save; calls = []
    def fail_with_unique_constraint(db, context, *args, **kwargs):
        calls.append(True)
        if len(calls) == 2:
            first = db.scalar(select(Customer))
            db.add(Customer(code=first.code,name='Synthetic SQL fault',normalized_name='synthetic sql fault',created_by=context.user.id))
        return original(db,context,*args,**kwargs)
    monkeypatch.setattr(master,'save',fail_with_unique_constraint)
    with pytest.raises(SecurityError) as failed: importer.execute(engine,principals['uploader'],source,request)
    assert failed.value.code == 'IMPORT_CONFLICT'
    assert_empty(maker)
    with maker() as db:
        denial = db.scalar(select(AuditEvent).where(AuditEvent.action == 'customer_import.denied'))
        assert denial.actor_id == actors['uploader']
        assert denial.details == {'reason':'IMPORT_CONFLICT','id':str(source)}
    monkeypatch.setattr(master,'save',original)
    assert importer.execute(engine,principals['uploader'],source,request)['receipt_counts']['applied_rows'] == 2


def test_new_engine_recovers_committed_receipt(execution, actors):
    maker, engine, principals = execution; source, request = ready(maker,actors)
    first = importer.execute(engine,principals['uploader'],source,request)
    restarted = create_engine(engine.url)
    try:
        retry = importer.execute(restarted,principals['uploader'],source,request)
        assert retry['receipt_id'] == first['receipt_id'] and retry['invocation']['applied_rows'] == 0
    finally: restarted.dispose()


def test_owned_transaction_uses_fresh_read_committed_snapshot(execution, actors, monkeypatch):
    maker, engine, principals = execution; source, request = ready(maker,actors)
    configured = engine.execution_options(isolation_level='REPEATABLE READ')
    original = review.calculate
    def checked(db, *args):
        assert db.connection().get_isolation_level() == 'READ COMMITTED'
        return original(db,*args)
    monkeypatch.setattr(review,'calculate',checked)
    assert importer.execute(configured,principals['uploader'],source,request)['receipt_counts']['applied_rows'] == 2
    with configured.connect() as connection:
        assert connection.get_isolation_level() == 'REPEATABLE READ'


@pytest.mark.parametrize('model',TABLES)
def test_database_history_is_immutable(execution, actors, model):
    maker, engine, principals = execution; source, request = ready(maker,actors)
    importer.execute(engine,principals['uploader'],source,request)
    with maker() as db:
        with pytest.raises(IntegrityError): db.execute(text(f'DELETE FROM {model.__tablename__}'))
        db.rollback()


def test_database_enforces_stable_identity_uniqueness(execution, actors):
    maker, engine, principals = execution; source, request = ready(maker,actors)
    importer.execute(engine,principals['uploader'],source,request)
    with maker() as db:
        identity = db.scalar(select(CustomerImportIdentity))
        duplicate = CustomerImportIdentity(namespace=identity.namespace,source_key_sha256=identity.source_key_sha256,
            content_sha256=identity.content_sha256,customer_id=identity.customer_id,receipt_id=identity.receipt_id,actor_id=identity.actor_id)
        db.add(duplicate)
        with pytest.raises(IntegrityError): db.flush()
        db.rollback()


def test_database_enforces_one_receipt_per_revision(execution, actors):
    maker, engine, principals = execution; source, request = ready(maker,actors)
    importer.execute(engine,principals['uploader'],source,request)
    with maker() as db:
        receipt = db.scalar(select(CustomerImportReceipt))
        values = {c.name:getattr(receipt,c.name) for c in receipt.__table__.columns if c.name not in {'id','created_at'}}
        values['request_sha256'] = 'f'*64
        db.add(CustomerImportReceipt(**values))
        with pytest.raises(IntegrityError): db.flush()
        db.rollback()


@pytest.mark.parametrize('part',['selection','validation','binding'])
def test_independent_digest_checks_reject_inconsistent_metadata(execution, actors, part):
    maker, engine, principals = execution; source, request = ready(maker,actors)
    with maker() as db:
        revision = review.latest(db,source); run = review.latest_run(db,revision.id)
        if part == 'selection':
            selected = dict(revision.selection, mapping_version='inconsistent-mapping')
            changed = ReviewRevision(source_id=source,ordinal=revision.ordinal+1,selection=selected,
                selection_sha256=revision.selection_sha256,state='APPROVED',version=revision.version+1,actor_id=actors['uploader'])
            db.add(changed); db.flush()
            request = request.model_copy(update={'revision_id':changed.id,'expected_version':changed.version})
        else:
            result = json.loads(json.dumps(run.result))
            if part == 'validation': result['records'][0]['proposed']['name'] = 'Inconsistent synthetic result'
            changed = ValidationRun(revision_id=revision.id,result=result,result_sha256=run.result_sha256,
                reference_sha256=run.reference_sha256,binding_sha256='f'*64 if part=='binding' else run.binding_sha256,
                actor_id=actors['uploader'])
            db.add(changed); db.flush()
            request = request.model_copy(update={'validation_id':changed.id})
        db.commit()
    with pytest.raises(SecurityError) as failed: importer.execute(engine,principals['uploader'],source,request)
    assert failed.value.code == 'REVIEW_INTEGRITY'
    assert_empty(maker)


def test_forged_self_approval_is_not_effective(execution, actors):
    maker, engine, principals = execution; source, request = ready(maker,actors)
    with maker() as db:
        run = review.latest_run(db,request.revision_id)
        forged = ReviewDecision(revision_id=request.revision_id,validation_id=run.id,binding_sha256=run.binding_sha256,
            kind='APPROVED',reason='Synthetic forged self-approval',actor_id=actors['uploader'])
        db.add(forged); db.flush(); db.commit()
        request = request.model_copy(update={'approval_id':forged.id})
    with pytest.raises(SecurityError) as failed: importer.execute(engine,principals['uploader'],source,request)
    assert failed.value.code == 'APPROVAL_REQUIRED'
    assert_empty(maker)


@pytest.mark.parametrize('part',['mapping','action'])
def test_unsupported_approved_mapping_or_action_cannot_execute(execution, actors, part):
    maker, engine, principals = execution; source, request = ready(maker,actors)
    with maker() as db:
        revision = review.latest(db,source); selected = dict(revision.selection)
        if part == 'mapping': selected['mapping'] = {'name':'A','code':'B'}
        else: selected['intended_action'] = 'PROPOSE_UPDATE'
        review.revise(db,ctx(db,actors['uploader']),source,selected,revision.version)
    _, request = approve(maker,actors,source)
    with pytest.raises(SecurityError) as failed: importer.execute(engine,principals['uploader'],source,request)
    assert failed.value.code == ('UNSUPPORTED_MAPPING' if part == 'mapping' else 'UNSUPPORTED_IMPORT')
    assert_empty(maker)


@pytest.mark.parametrize('setting,value',[('synthetic_customer_import_enabled',False),('durable_review_enabled',False),('app_env','production')])
def test_default_disabled_and_production_gate(execution, actors, monkeypatch, setting, value):
    maker, engine, principals = execution; source, request = ready(maker,actors)
    monkeypatch.setattr(get_settings(),setting,value)
    with pytest.raises(SecurityError) as failure: importer.execute(engine,principals['uploader'],source,request)
    assert failure.value.code == 'CUSTOMER_IMPORT_DISABLED' and failure.value.status == 404
    assert_empty(maker)


def test_company_database_name_and_caller_transactions_fail_closed(execution, actors):
    maker, engine, principals = execution; source, request = ready(maker,actors)
    fake_company = create_engine(engine.url.set(database='company_never_connect'))
    try:
        with pytest.raises(SecurityError) as failure: importer.execute(fake_company,principals['uploader'],source,request)
        assert failure.value.code == 'CUSTOMER_IMPORT_DISABLED'
    finally: fake_company.dispose()
    with engine.connect() as connection:
        with pytest.raises(TypeError): importer.execute(connection,principals['uploader'],source,request)


def test_no_execution_http_surface(browser):
    for path in ['/api/onboarding/customer-import','/api/onboarding/review/sources/'+str(uuid.uuid4())+'/execute']:
        assert browser.post(path,json={}).status_code == 404
