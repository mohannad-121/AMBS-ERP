"""Dashboard remediation: deterministic, disposable PostgreSQL integration tests."""
import json
import threading
import time
import uuid
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, UTC, timedelta
from decimal import Decimal

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import event, select, text, func
from sqlalchemy.orm import Session

from app.main import app
from app.models.inventory import LedgerEffect
from app.models.purchasing import ScheduleUpdate
from app.models.security import User, Role, AuthSession
from app.services.review_snapshot import SNAPSHOT_KEY, inventory_snapshot, DASHBOARD_SLOTS
from tests.test_security import security_db, accounts, browser, csrf, login, ORIGIN  # noqa: F401
from tests.test_master import signed  # noqa: F401
from tests.test_inventory import stock, draft, post_movement, reserve, key, call as inventory  # noqa: F401
from tests.test_sales import receipt, order, prepare, actual, dispatch, op, call as sales
from tests.test_purchasing import suppliers, po, receipt as purchase_receipt, operation, call as purchasing  # noqa: F401
from tests.test_dashboard import summary
from tests.test_reporting import report

pytestmark = pytest.mark.integration
NOW = datetime(2026, 1, 3, 8, tzinfo=UTC)


def clocks(monkeypatch, value=NOW):
    monkeypatch.setattr('app.api.dashboard.utcnow', lambda: value)
    monkeypatch.setattr('app.services.reporting.utcnow', lambda: value)


def overdue(data):
    return {r['id'] for q in data['queues'] if q['label']=='Overdue supplier receipts' for r in q['items']}


def assert_due(client, source, expected, expected_date):
    dashboard = summary(client)
    rows = report(client, 'purchasing', search=source['code'])['items']
    assert len(rows) == 1
    assert (source['id'] in overdue(dashboard)) is expected
    assert bool(rows[0]['finding']) is expected
    assert rows[0]['expected_on'] == expected_date


def schedule(client, source, **dates):
    return purchasing(client, 'post', 'schedules', {
        'order_id':source['id'], 'reason':'Synthetic dashboard schedule verification',
        'evidence':'Synthetic supplier schedule evidence only', **dates,
    }, 201)


@pytest.mark.parametrize('updates,expected,expected_date', [
    ([], True, '2026-01-01'),
    ([{'eta':'2026-01-05'}], False, '2026-01-05'),
    ([{'eta':'2026-01-02'}], True, '2026-01-02'),
    ([{'eta':'2026-01-05'}, {'eta':'2026-01-02'}], True, '2026-01-02'),
    ([{'eta':'2026-01-02'}, {'requested_on':'2026-01-06'}], False, '2026-01-06'),
    ([{'requested_on':'2026-01-05','confirmed_on':'2026-01-02'}], True, '2026-01-02'),
    ([{'requested_on':'2026-01-01','confirmed_on':'2026-01-02','eta':'2026-01-05'}], False, '2026-01-05'),
    ([{}], True, '2026-01-01'),
    ([{'eta':'2026-01-05'}, {}], True, '2026-01-01'),
])
def test_latest_supplier_revision_matches_reporting(signed, stock, suppliers, monkeypatch, updates, expected, expected_date):
    clocks(monkeypatch)
    source, _ = po(signed, stock, suppliers, quantity='10', expected_on='2026-01-01')
    for values in updates: schedule(signed, source, **values)
    assert_due(signed, source, expected, expected_date)


def test_missing_expected_date_and_undated_revision(signed, stock, suppliers, monkeypatch):
    clocks(monkeypatch)
    source, _ = po(signed, stock, suppliers, quantity='10')
    assert_due(signed, source, False, None)
    schedule(signed, source)
    assert_due(signed, source, False, None)
    schedule(signed, source, confirmed_on='2026-01-02')
    assert_due(signed, source, True, '2026-01-02')


def test_receipt_states_and_cancellation_preserve_overdue_restrictions(signed, stock, suppliers, monkeypatch):
    clocks(monkeypatch)
    source, _ = po(signed, stock, suppliers, quantity='10', expected_on='2026-01-01')
    purchase_receipt(signed, source, '4', stock['storage']['id'])
    assert_due(signed, source, True, '2026-01-01')
    schedule(signed, source, eta='2026-01-05')
    assert_due(signed, source, False, '2026-01-05')
    schedule(signed, source, eta='2026-01-02')
    assert_due(signed, source, True, '2026-01-02')
    purchase_receipt(signed, source, '6', stock['storage']['id'])
    assert purchasing(signed,'get',f"orders/{source['id']}")['status']=='RECEIVED'
    assert_due(signed, source, False, '2026-01-02')
    _, body = po(signed, stock, suppliers, quantity='1', expected_on='2026-01-01')
    body['request_key']=key()
    cancelled=purchasing(signed,'post','orders',body,201)
    operation(signed, f"orders/{cancelled['id']}/cancel")
    assert_due(signed, cancelled, False, '2026-01-01')


@pytest.mark.parametrize('instant,expected', [
    (datetime(2026,1,2,19,59,59,tzinfo=UTC), False),
    (datetime(2026,1,2,20,0,0,tzinfo=UTC), True),
])
def test_dubai_midnight_not_server_date(signed, stock, suppliers, monkeypatch, instant, expected):
    clocks(monkeypatch, instant)
    source, _ = po(signed, stock, suppliers, quantity='1', expected_on='2026-01-02')
    assert_due(signed, source, expected, '2026-01-02')


def test_equal_revision_timestamps_use_same_uuid_tiebreak(signed, stock, suppliers, security_db, accounts, monkeypatch):
    clocks(monkeypatch)
    source, _ = po(signed, stock, suppliers, quantity='1', expected_on='2026-01-01')
    # Insert synthetic tied events; never update/bypass append-only history.
    with security_db[0]() as db:
        for identity,day in [(1,2),(2,5)]:
            db.add(ScheduleUpdate(id=uuid.UUID(int=identity),order_id=uuid.UUID(source['id']),actor_id=accounts['admin'],created_at=NOW,eta=NOW.date().replace(day=day),reason='Synthetic tied revision test',evidence='Synthetic deterministic revision evidence'))
        db.commit()
    assert_due(signed, source, False, '2026-01-05')


def stable(data):
    return {k:v for k,v in data.items() if k!='as_of'}


@pytest.mark.parametrize('action', ['dispatch','reversal','reservation','consumption','movement','schedule'])
def test_dashboard_snapshot_does_not_block_business_commit(signed, stock, suppliers, security_db, monkeypatch, action):
    clocks(monkeypatch)
    receipt(signed, stock, 20)
    source = order(signed, stock, '15')
    purchase, _ = po(signed, stock, suppliers, quantity='10', expected_on='2026-01-01')
    expected = {'dispatch':(15,10,10), 'reversal':(20,10,15), 'reservation':(20,5,15),
                'consumption':(15,0,15), 'movement':(23,0,15), 'schedule':(20,0,15)}[action]
    if action in {'dispatch','reversal'}:
        delivery=prepare(signed,stock,source)
        actual(signed,delivery,'pick',5);actual(signed,delivery,'load',5)
        if action=='reversal': sales(signed,f"deliveries/{delivery['id']}/dispatch",op())
        path=f"/api/sales/deliveries/{delivery['id']}/"+('dispatch' if action=='dispatch' else 'reverse')
        body=op(**({'goods_returned_to_origin':True} if action=='reversal' else {}))
    elif action=='reservation':
        path='/api/inventory/reservations'
        body=dict(request_key=key(),item_id=stock['item']['id'],location_id=stock['storage']['id'],quantity='5',reason='Synthetic concurrency hold')
    elif action=='consumption':
        hold=reserve(signed,stock,'5');path=f"/api/inventory/reservations/{hold['id']}/consume";body={'request_key':key()}
    elif action=='movement':
        movement,_=draft(signed,stock,'3');path=f"/api/inventory/movements/{movement['id']}/post";body={'request_key':key()}
    else:
        path='/api/purchasing/schedules';body=dict(order_id=purchase['id'],eta='2026-01-05',reason='Synthetic concurrent reschedule',evidence='Synthetic supplier evidence only')
    before=summary(signed);maker,_=security_db
    with maker() as db: effects_before=db.scalar(select(func.count()).select_from(LedgerEffect))
    ready,resume=threading.Event(),threading.Event();pids=[]
    headers,cookies=csrf(signed),dict(signed.cookies)
    def request(method,url,data=None):
        client=TestClient(app,base_url=ORIGIN,headers={'Origin':ORIGIN});client.cookies.update(cookies)
        try:return client.request(method,url,json=data,headers=headers)
        finally:client.close()
    def pause(state):
        if state.session.info.get(SNAPSHOT_KEY) and state.is_select and not ready.is_set() and 'FROM sales_orders' in str(state.statement) and 'count(' in str(state.statement):
            value=state.invoke_statement()
            pids.append(state.session.connection().exec_driver_sql('SELECT pg_backend_pid()').scalar_one())
            ready.set();assert resume.wait(10),'Synthetic dashboard reader gate timed out'
            return value
    event.listen(Session,'do_orm_execute',pause,retval=True)
    try:
        with ThreadPoolExecutor(max_workers=2) as pool:
            reader=pool.submit(request,'GET','/api/dashboard')
            try:
                assert ready.wait(5),'Dashboard did not reach controlled inter-statement pause'
                with maker() as observer:
                    assert observer.scalar(text("SELECT count(*) FROM pg_locks WHERE pid=:pid AND locktype='advisory'"),{'pid':pids[0]})==0
                    assert observer.scalar(text("SELECT xact_start IS NOT NULL FROM pg_stat_activity WHERE pid=:pid"),{'pid':pids[0]})
                started=time.perf_counter()
                writer=pool.submit(request,'POST',path,body).result(timeout=3)
                elapsed=round((time.perf_counter()-started)*1000,2)
                assert writer.status_code==(201 if action in {'reservation','schedule'} else 200),writer.text
                assert not reader.done(), 'Writer must commit before the reader resumes'
            finally:resume.set()
            response=reader.result(timeout=10);assert response.status_code==200,response.text
    finally:
        resume.set();event.remove(Session,'do_orm_execute',pause)
    assert stable(response.json())==stable(before)
    after=summary(signed);on_hand,reserved,demand=expected
    bucket=after['inventory'][0]
    assert [Decimal(bucket[k]) for k in ['on_hand','reserved']]==[on_hand,reserved]
    assert Decimal(after['demand'][0]['quantity'])==demand
    assert (purchase['id'] in overdue(after)) is (action!='schedule')
    inv_rows=report(signed,'inventory')['items']
    assert sum(Decimal(r['on_hand']) for r in inv_rows)==on_hand
    assert sum(Decimal(r['reserved']) for r in inv_rows)==reserved
    assert Decimal(report(signed,'sales')['items'][0]['outstanding'])==demand
    assert bool(report(signed,'purchasing')['items'][0]['finding']) is (action!='schedule')
    with maker() as db:
        effects_after=db.scalar(select(func.count()).select_from(LedgerEffect))
        assert effects_after==effects_before+(1 if action in {'dispatch','reversal','consumption','movement'} else 0)
    if action!='schedule':
        retry=request('POST',path,body);assert retry.status_code==writer.status_code,retry.text
        with maker() as db:assert db.scalar(select(func.count()).select_from(LedgerEffect))==effects_after
        assert stable(summary(signed))==stable(after)
    assert inventory(signed,'get','reconciliation')['healthy']
    print('DASHBOARD_CONCURRENCY '+json.dumps(dict(action=action,writer_ms=elapsed,writer_committed_while_reader_paused=True,snapshot_consistent=True)))


def test_dashboard_and_long_reviews_share_pool_without_starving_writers(signed,stock,security_db):
    receipt(signed,stock,20);order(signed,stock,'15')
    ready,resume=threading.Event(),threading.Event();guard=threading.Lock();pids=[]
    headers,cookies=csrf(signed),dict(signed.cookies)
    def request(method,url,data=None):
        client=TestClient(app,base_url=ORIGIN,headers={'Origin':ORIGIN});client.cookies.update(cookies)
        try:return client.request(method,url,json=data,headers=headers)
        finally:client.close()
    def pause(state):
        if state.session.info.get(SNAPSHOT_KEY) and state.is_select and not state.session.info.get('dashboard_test_paused'):
            state.session.info['dashboard_test_paused']=True
            value=state.invoke_statement()
            connection=state.session.connection()
            assert connection.exec_driver_sql('SHOW transaction_isolation').scalar_one()=='repeatable read'
            assert connection.exec_driver_sql('SHOW transaction_read_only').scalar_one()=='on'
            with guard:
                pids.append(connection.exec_driver_sql('SELECT pg_backend_pid()').scalar_one())
                if len(pids)==5:ready.set()
            assert resume.wait(10),'Synthetic five-reader gate timed out'
            return value
    event.listen(Session,'do_orm_execute',pause,retval=True)
    try:
        with ThreadPoolExecutor(max_workers=6) as pool:
            readers=[pool.submit(request,'GET',p) for p in ['/api/dashboard']*3+['/api/reports?category=inventory','/api/inventory/review']]
            try:
                assert ready.wait(5) and len(set(pids))==5
                for path in ['/api/dashboard','/api/inventory/review']:
                    rejected=request('GET',path)
                    assert rejected.status_code==429 and rejected.json()['error']['code']=='REVIEW_BUSY'
                started=time.perf_counter()
                writer=pool.submit(request,'POST','/api/inventory/reservations',dict(request_key=key(),item_id=stock['item']['id'],location_id=stock['storage']['id'],quantity='5',reason='Synthetic reader capacity proof')).result(timeout=3)
                elapsed=round((time.perf_counter()-started)*1000,2)
                assert writer.status_code==201,writer.text
                assert all(not reader.done() for reader in readers)
                assert security_db[0].kw['bind'].pool.checkedout()==5
            finally:resume.set()
            values=[reader.result(timeout=10) for reader in readers]
            assert all(v.status_code==200 for v in values)
            assert all(Decimal(v.json()['inventory'][0]['reserved'])==0 for v in values[:3])
    finally:
        resume.set();event.remove(Session,'do_orm_execute',pause)
    assert Decimal(summary(signed)['inventory'][0]['reserved'])==5
    assert report(signed,'inventory')['items']
    print('DASHBOARD_CONCURRENCY '+json.dumps(dict(action='three_dashboards_two_reviews',writer_ms=elapsed,readers=5,distinct_snapshot_connections=5)))


@pytest.mark.parametrize('change', ['role','session','account'])
def test_access_revoked_during_dashboard_never_returns_data(signed,stock,security_db,accounts,monkeypatch,change):
    from app.api.dashboard import project_summary
    maker,_=security_db
    def revoked(ctx,snapshot):
        result=project_summary(ctx,snapshot)
        with maker() as writer:
            if change=='role':writer.get(User,accounts['admin']).roles=[]
            elif change=='session':writer.get(AuthSession,ctx.session.id).revoked_at=datetime.now(UTC)
            else:writer.get(User,accounts['admin']).is_active=False
            writer.commit()
        return result
    monkeypatch.setattr('app.api.dashboard.project_summary',revoked)
    response=signed.get('/api/dashboard')
    assert response.status_code in {401,403},response.text
    assert 'cards' not in response.json()
