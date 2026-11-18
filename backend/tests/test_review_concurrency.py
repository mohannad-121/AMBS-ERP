"""Bounded concurrency experiments in generated PostgreSQL test databases only."""
import csv
import io
import json
import threading
import time
import uuid
from concurrent.futures import ThreadPoolExecutor
from decimal import Decimal
from types import SimpleNamespace
from unittest.mock import patch

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import event, func, select, text
from sqlalchemy.exc import DBAPIError
from sqlalchemy.orm import Session
from app.main import app
from app.core.security import effective_permissions, utcnow, SecurityContext
from app.models.inventory import LedgerEffect, Reservation, StockBalance
from app.models.security import AuditEvent, AuthSession, Role, User
from app.schemas.inventory import MovementCreate, Operation
from app.services import inventory as inv, inventory_review as review
from app.services.review_snapshot import inventory_snapshot, SNAPSHOT_KEY
from tests.test_security import security_db, accounts, browser, csrf, ORIGIN, login  # noqa: F401
from tests.test_master import signed  # noqa: F401
from tests.test_inventory import stock, draft, post_movement, reserve, call, key  # noqa: F401
from tests.test_inventory_review import body, file_body

pytestmark = pytest.mark.integration


def context(db, accounts):
    user = db.get(User, accounts['admin'])
    return SimpleNamespace(user=user, permissions=effective_permissions(user))


def seeded(signed, stock):
    movement, _ = draft(signed, stock)
    post_movement(signed, movement)
    return reserve(signed, stock, '5')


def quantities(db):
    # Scalar SQL reads bypass ORM identity-map caching, which could mask RC tears.
    balance = db.scalar(select(StockBalance.on_hand))
    ledger = db.scalar(select(func.coalesce(func.sum(LedgerEffect.quantity_delta), 0)))
    reserved = db.scalar(select(func.coalesce(func.sum(Reservation.quantity), 0)).where(Reservation.status == 'ACTIVE'))
    return balance, ledger, reserved


def metric(**values):
    print('CONCURRENCY_METRIC ' + json.dumps(values, sort_keys=True), flush=True)


def test_original_exclusive_review_gate_can_timeout_real_post(signed, stock, security_db, accounts):
    seeded(signed, stock)
    movement, _ = draft(signed, stock, quantity='2')
    maker, _ = security_db
    with maker() as reader, maker() as writer:
        inv.lock_inventory(reader)  # Exact pre-fix review locking strategy.
        writer.execute(text("SET LOCAL statement_timeout = '150ms'"))
        started = time.perf_counter()
        with pytest.raises(DBAPIError) as failure:
            inv.post_movement(writer, context(writer, accounts), uuid.UUID(movement['id']), Operation(request_key=uuid.uuid4()))
        elapsed = time.perf_counter() - started
        assert failure.value.orig.sqlstate == '57014'
        writer.rollback()
        metric(case='original-exclusive-gate', timed_out=True, timeout_ms=round(elapsed*1000, 2))
    assert call(signed, 'get', 'reconciliation')['healthy']


def test_read_committed_without_gate_can_mix_versions(signed, stock, security_db, accounts):
    hold = seeded(signed, stock)
    maker, _ = security_db
    with maker() as reader, maker() as writer:
        first = reader.scalar(select(StockBalance.on_hand))
        inv.close_reservation(writer, context(writer, accounts), uuid.UUID(hold['id']), 'consume', Operation(request_key=uuid.uuid4()))
        writer.commit()
        _, ledger, reserved = quantities(reader)
        assert first == 50 and ledger == 45 and reserved == 0
        metric(case='read-committed-positive-control', balance=str(first), ledger=str(ledger), mixed=True)


def test_repeatable_snapshot_sees_whole_commit_and_releases_pool_state(signed, stock, security_db, accounts):
    hold = seeded(signed, stock)
    maker, _ = security_db
    with maker() as caller:
        cached = caller.scalar(select(StockBalance))
        with inventory_snapshot(caller) as reader:
            assert reader.scalar(text('SHOW transaction_isolation')) == 'repeatable read'
            assert reader.scalar(text('SHOW transaction_read_only')) == 'on'
            read_pid=reader.scalar(text('SELECT pg_backend_pid()'))
            assert quantities(reader) == (50, 50, 5)
            with maker() as writer:
                started = time.perf_counter()
                inv.close_reservation(writer, context(writer, accounts), uuid.UUID(hold['id']), 'consume', Operation(request_key=uuid.uuid4()))
                writer.commit()
                elapsed = time.perf_counter() - started
            assert quantities(reader) == (50, 50, 5)
            metric(case='repeatable-snapshot', writer_ms=round(elapsed*1000, 2), stable=True)
        # The caller's stale ORM bucket cannot contaminate the next fresh session.
        assert cached.on_hand == 50
        with inventory_snapshot(caller) as reader:
            assert quantities(reader) == (45, 45, 0)
        caller.rollback()
    engine=maker.kw['bind'];connections=[]
    try:
        connections=[engine.connect() for _ in range(engine.pool.size())]
        assert read_pid in [c.scalar(text('SELECT pg_backend_pid()')) for c in connections]
        for connection in connections:
            assert connection.scalar(text('SHOW transaction_isolation'))=='read committed'
            assert connection.scalar(text('SHOW transaction_read_only'))=='off'
            assert connection.scalar(text('SHOW statement_timeout'))=='0'
            assert connection.scalar(text('SHOW idle_in_transaction_session_timeout'))=='0'
    finally:
        for connection in connections:connection.close()


def test_readonly_guard_and_exception_cleanup(signed, stock, security_db):
    seeded(signed, stock)
    maker, _ = security_db
    with maker() as caller:
        with pytest.raises(RuntimeError, match='read-only repeatable-read'):
            review.review(caller)
        with pytest.raises(DBAPIError) as failure:
            with inventory_snapshot(caller) as reader:
                reader.execute(text('UPDATE stock_balances SET on_hand=on_hand+1'))
        assert failure.value.orig.sqlstate == '25006'
        with pytest.raises(DBAPIError) as timeout:
            with inventory_snapshot(caller) as reader:
                reader.execute(text("SET LOCAL statement_timeout = '50ms'"))
                reader.execute(text('SELECT pg_sleep(0.15)'))
        assert timeout.value.orig.sqlstate=='57014'
        with inventory_snapshot(caller) as reader:
            assert quantities(reader) == (50, 50, 5)
        # No readonly/isolation setting leaks into future posting sessions.
        with maker() as writer:
            assert writer.scalar(text('SHOW transaction_read_only')) == 'off'
            assert writer.scalar(text('SHOW transaction_isolation')) == 'read committed'


def large_history(maker, accounts, stock):
    # 1,200 real ledger effects via the authoritative create/post services.
    # Forty bounded 30-line receipts, not a payload sent to the main application.
    with maker() as db:
        actor = context(db, accounts)
        for _ in range(40):
            line = dict(item_id=stock['item']['id'], unit_id=stock['unit']['id'], destination_id=stock['storage']['id'], quantity='1', unit_cost='2', currency='AED')
            data = MovementCreate(request_key=uuid.uuid4(), kind='RECEIPT', reason='Synthetic bounded concurrency history', occurred_at=utcnow(), lines=[line.copy() for _ in range(30)])
            movement = inv.create_movement(db, actor, data)
            inv.post_movement(db, actor, movement.id, Operation(request_key=uuid.uuid4()))
        db.commit()


@pytest.mark.parametrize('route', ['review', 'physical', 'journey', 'file', 'report', 'delivery', 'legacy-reconciliation', 'large-journey'])
def test_api_review_snapshot_does_not_block_posting(signed, stock, security_db, accounts, route):
    hold = seeded(signed, stock)
    maker, _ = security_db
    if route == 'large-journey':
        large_history(maker, accounts, stock)
    delivery = None
    if route == 'delivery':
        from tests.test_sales import order, prepare
        delivery = prepare(signed, stock, order(signed, stock, quantity='4'))
    with maker() as db:
        initial = quantities(db)
        engine = db.get_bind()
    ready, resume = threading.Event(), threading.Event()
    pids, posting_pids = [], []
    def pause(state):
        if state.session.info.get(SNAPSHOT_KEY) and state.is_select and not state.session.info.get('test_paused'):
            state.session.info['test_paused'] = True
            result = state.invoke_statement()  # Establish snapshot before concurrent commit.
            pids.append(state.session.connection().connection.driver_connection.info.backend_pid)
            ready.set()
            assert resume.wait(8), 'Synthetic reader gate timed out'
            return result
    def posted(conn, cursor, statement, parameters, execution, many):
        if 'pg_advisory_xact_lock' in statement and parameters.get('key') == inv.INVENTORY_LOCK:
            posting_pids.append(conn.connection.driver_connection.info.backend_pid)
    headers, cookies = csrf(signed), dict(signed.cookies)
    def request(method, path, data=None):
        client = TestClient(app, base_url=ORIGIN, headers={'Origin': ORIGIN}, raise_server_exceptions=False)
        client.cookies.update(cookies)
        try:
            return client.request(method, path, json=data, headers=headers)
        finally:
            client.close()
    targets = {
        'review': ('GET', '/api/inventory/review', None),
        'legacy-reconciliation': ('GET', '/api/inventory/reconciliation', None),
        'physical': ('POST', '/api/inventory/review/physical-preview', body(stock)),
        'journey': ('GET', '/api/inventory/journey/'+stock['item']['id'], None),
        'large-journey': ('GET', '/api/inventory/journey/'+stock['item']['id']+'?page=2', None),
        'file': ('POST', '/api/onboarding/reconcile', file_body(stock)),
        'report': ('POST', '/api/onboarding/reconciliation-report', file_body(stock)),
        'delivery': ('GET', '/api/routing/deliveries/'+(delivery['id'] if delivery else key())+'/journey/'+stock['item']['id'], None),
    }
    event.listen(Session, 'do_orm_execute', pause)
    event.listen(engine, 'after_cursor_execute', posted)
    try:
        with ThreadPoolExecutor(max_workers=2) as pool:
            reading = pool.submit(request, *targets[route])
            try:
                assert ready.wait(5), 'Review did not enter its snapshot'
                # Reader owns neither mutation advisory lock while paused.
                with maker() as observer:
                    assert observer.scalar(text("SELECT count(*) FROM pg_locks WHERE pid=:pid AND locktype='advisory'"), {'pid':pids[0]}) == 0
                started = time.perf_counter()
                writing = pool.submit(request, 'POST', '/api/inventory/reservations/'+hold['id']+'/consume', {'request_key':key()})
                written = writing.result(timeout=3)
                elapsed = time.perf_counter()-started
                assert written.status_code == 200, written.text
                assert not reading.done(), 'Reader gate must still be held when writer commits'
            finally:
                resume.set()
            result = reading.result(timeout=35)
            assert result.status_code == 200, result.text
        assert posting_pids and pids[0] not in posting_pids
        if route == 'legacy-reconciliation':
            assert result.json()['healthy'] and not result.json()['issues']
        elif route == 'report':
            rows = list(csv.reader(io.StringIO(result.content.decode('utf-8-sig'))))
            assert Decimal(rows[4][3]) == initial[0]
        elif route in ('file', 'physical', 'review'):
            row = result.json()['records'][0]['reconciliation'] if route == 'file' else result.json()['items'][0]
            assert Decimal(row['ledger_on_hand']) == initial[0]
            assert Decimal(row['active_reserved']) == initial[2]
            assert Decimal(row['cached_on_hand']) == initial[0]
        else:
            assert not any(e['kind']=='Reservation consumed' for e in result.json()['items'])
            if route == 'large-journey':
                assert result.json()['total'] == 1202 and len(result.json()['items']) == 100
        with maker() as db:
            after = quantities(db)
            assert after == (initial[0]-5, initial[1]-5, initial[2]-5)
        metric(case=route, writer_ms=round(elapsed*1000,2), writer_completed_while_reader_paused=True, snapshot_rows=1200 if route=='large-journey' else 0)
        assert call(signed, 'get', 'reconciliation')['healthy']
    finally:
        resume.set()
        event.remove(Session, 'do_orm_execute', pause)
        event.remove(engine, 'after_cursor_execute', posted)


@pytest.mark.parametrize('change', ['roles', 'session-revoked'])
def test_access_revoked_during_review_is_rechecked_before_response(signed, stock, security_db, accounts, change):
    seeded(signed, stock)
    maker, _ = security_db
    def revoke(db, **kwargs):
        with maker() as writer:
            if change == 'roles':
                user = writer.get(User, accounts['admin'])
                # Changed role membership with unchanged SUPER_ADMIN rights still
                # invalidates the review. Never remove the sole admin grant.
                user.roles.append(writer.scalar(select(Role).where(Role.code=='MANAGEMENT')))
            else:
                session=writer.scalar(select(AuthSession).where(AuthSession.user_id==accounts['admin'],AuthSession.revoked_at.is_(None)))
                session.revoked_at=utcnow()
            writer.commit()
        return {'items':[], 'total':0}
    with patch('app.services.inventory_review.review', side_effect=revoke):
        response = signed.get('/api/inventory/review')
    assert response.status_code == (403 if change=='roles' else 401)
    with maker() as db:
        assert db.scalar(select(AuditEvent.id).where(AuditEvent.action.in_(['auth.denied','auth.authorization_denied']))) or db.scalar(select(AuditEvent.id).where(AuditEvent.details['resource'].astext=='inventory_review'))


def test_simultaneous_review_and_journey_snapshots_do_not_serialize_posting(signed,stock,security_db,accounts):
    hold=seeded(signed,stock);maker,_=security_db
    ready,resume=threading.Event(),threading.Event();guard=threading.Lock();pids=[]
    headers,cookies=csrf(signed),dict(signed.cookies)
    def pause(state):
        if state.session.info.get(SNAPSHOT_KEY) and state.is_select and not state.session.info.get('test_paused'):
            state.session.info['test_paused']=True
            result=state.invoke_statement()
            with guard:
                pids.append(state.session.connection().connection.driver_connection.info.backend_pid)
                if len(pids)==2:ready.set()
            assert resume.wait(8)
            return result
    def request(method,path,data=None):
        client=TestClient(app,base_url=ORIGIN,headers={'Origin':ORIGIN},raise_server_exceptions=False);client.cookies.update(cookies)
        try:return client.request(method,path,json=data,headers=headers)
        finally:client.close()
    event.listen(Session,'do_orm_execute',pause)
    try:
        with ThreadPoolExecutor(max_workers=3) as pool:
            reviews=[pool.submit(request,'GET','/api/inventory/review'),pool.submit(request,'GET','/api/inventory/journey/'+stock['item']['id'])]
            try:
                assert ready.wait(5) and len(set(pids))==2
                rejected=request('GET','/api/inventory/review')
                assert rejected.status_code==429 and rejected.json()['error']['code']=='REVIEW_BUSY'
                started=time.perf_counter()
                written=pool.submit(request,'POST','/api/inventory/reservations/'+hold['id']+'/consume',{'request_key':key()}).result(timeout=3)
                elapsed=time.perf_counter()-started
                assert written.status_code==200 and all(not read.done() for read in reviews)
            finally:resume.set()
            results=[read.result(timeout=10) for read in reviews]
            assert all(r.status_code==200 for r in results)
            assert Decimal(results[0].json()['items'][0]['ledger_on_hand'])==50
            assert not any(e['kind']=='Reservation consumed' for e in results[1].json()['items'])
        metric(case='two-simultaneous-readers',writer_ms=round(elapsed*1000,2),readers=2,writer_completed_while_readers_paused=True)
    finally:
        resume.set();event.remove(Session,'do_orm_execute',pause)


def test_review_cannot_commit_caller_business_writes_or_share_its_connection(signed,stock,security_db,accounts):
    from app.services.review_snapshot import review_request
    seeded(signed,stock);maker,_=security_db
    with maker() as db:
        user=db.get(User,accounts['admin'])
        session=db.scalar(select(AuthSession).where(AuthSession.user_id==user.id))
        ctx=SecurityContext(user,session,effective_permissions(user))
        row=db.scalar(select(StockBalance));row.on_hand=Decimal(999)
        with pytest.raises(RuntimeError,match='last-seen metadata'):
            with review_request(db,ctx,None):pass
        db.rollback()
        assert db.scalar(select(StockBalance.on_hand))==50
    with maker().get_bind().connect() as connection:
        with Session(bind=connection) as caller:
            with pytest.raises(RuntimeError,match='caller-owned connection'):
                with inventory_snapshot(caller):pass


def test_delivery_assignment_changed_during_journey_cannot_leak_own_scope(signed,stock,security_db,accounts):
    from app.models.security import Permission
    from app.schemas.security import UserCreate
    from app.schemas.routing import AssignmentInput
    from app.services.users import create_user
    from app.services import routing as routing_service
    from tests.test_sales import order,prepare,op
    from tests.test_routing import call as routing
    seeded(signed,stock);maker,_=security_db
    with maker() as db:
        driver=db.get(User,accounts['operator']);role=db.scalar(select(Role).where(Role.code=='DRIVER'))
        # Explicit synthetic custom permission: own delivery trace, no company read.
        role.permissions.append(db.scalar(select(Permission).where(Permission.code=='items.trace.read')))
        driver.roles=[role]
        replacement=create_user(db,UserCreate(username='test.replacement',display_name='Synthetic replacement driver',password=accounts['password'],roles=['DRIVER']),db.get(User,accounts['admin']))
        replacement_id=replacement.id;db.commit()
    delivery=prepare(signed,stock,order(signed,stock,quantity='4'))
    routing(signed,f"deliveries/{delivery['id']}/assign",op(driver_id=str(accounts['operator'])))
    assert login(signed,accounts,'test.operations').status_code==200
    path=f"/api/routing/deliveries/{delivery['id']}/journey/{stock['item']['id']}"
    assert signed.get(path).status_code==200
    def reassign(*args,**kwargs):
        with maker() as writer:
            routing_service.assign(writer,context(writer,accounts),uuid.UUID(delivery['id']),AssignmentInput(request_key=uuid.uuid4(),driver_id=replacement_id,reason='Synthetic concurrent reassignment'))
            writer.commit()
        return {'items':[],'total':0}
    with patch('app.api.routing.journey',side_effect=reassign):
        response=signed.get(path)
    assert response.status_code==403,response.text
