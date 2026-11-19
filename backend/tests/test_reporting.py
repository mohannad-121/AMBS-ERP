"""Synthetic PostgreSQL operational correctness, scope and concurrency tests."""
import csv
import io
import json
import threading
import time
import uuid
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, UTC, date, timedelta
from decimal import Decimal

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import select, func, event, text
from sqlalchemy.orm import Session
from app.main import app
from app.models.security import User, Role, AuditEvent
from app.models.security import Permission
from app.models.sales import SalesOrder
from app.models.purchasing import ScheduleUpdate
from app.models.inventory import LedgerEffect, StockBalance, Reservation
from app.services.review_snapshot import SNAPSHOT_KEY
from app.services.reporting import safe_cell, PERMISSIONS
from tests.test_security import security_db, accounts, browser, csrf, ORIGIN, login  # noqa: F401
from tests.test_master import signed, post as master_post  # noqa: F401
from tests.test_inventory import stock, draft, post_movement, reserve, key  # noqa: F401
from tests.test_sales import receipt, order, prepare, dispatch, call as sales_call, op
from tests.test_purchasing import suppliers, po, receipt as purchase_receipt, operation, production, stage  # noqa: F401
from tests.test_packing import issue, call as packing_call
from tests.test_review_concurrency import large_history

pytestmark = pytest.mark.integration


def report(client, category='sales', expected=200, **filters):
    r = client.get('/api/reports', params=dict(category=category, **filters))
    assert r.status_code == expected, r.text
    return r.json()


@pytest.mark.parametrize('category', list(PERMISSIONS) + ['exceptions'])
def test_empty_reports_have_no_fabricated_findings_or_writes(signed, security_db, category):
    maker, _ = security_db
    with maker() as db:
        before = db.scalar(select(func.count()).select_from(AuditEvent))
    value = report(signed, category)
    assert value['items'] == [] and value['total'] == 0 and value['statuses'] == []
    assert value['business_changes'] == 0 and value['timezone'] == 'Asia/Dubai'
    with maker() as db:
        assert db.scalar(select(func.count()).select_from(AuditEvent)) == before
        assert db.scalar(select(func.count()).select_from(LedgerEffect)) == 0


def test_partial_dispatch_reversal_backorder_and_duplicate_free_status_counts(signed, stock):
    receipt(signed, stock, 8)
    o = order(signed, stock)
    d = prepare(signed, stock, o)
    dispatch(signed, d, 5)
    row = report(signed)['items'][0]
    assert Decimal(row['quantity']) == 15 and Decimal(row['dispatched']) == 5
    assert Decimal(row['outstanding']) == Decimal(row['backorder']) == 10 and Decimal(row['allocated']) == 3 and Decimal(row['unallocated_outstanding']) == 7
    assert row['dispatched_deliveries'] == 1 and row['last_dispatch_at']
    delivery = report(signed, 'deliveries')['items'][0]
    assert Decimal(delivery['dispatched']) == 5 and delivery['partial']
    assert report(signed)['statuses'] == [{'status': 'PARTIALLY_DISPATCHED', 'count': '1'}]
    sales_call(signed, 'deliveries/'+d['id']+'/reverse', op(goods_returned_to_origin=True))
    row = report(signed)['items'][0]
    assert Decimal(row['dispatched']) == 0 and Decimal(row['outstanding']) == 15
    delivery = report(signed, 'deliveries')['items'][0]
    assert Decimal(delivery['dispatched']) == 0 and Decimal(delivery['reversed_quantity']) == 5
    assert report(signed, 'sales', customer_id=o['customer_id'])['total'] == 1
    assert report(signed, 'sales', customer_id=key())['total'] == 0
    assert report(signed, 'sales', status='CANCELLED')['total'] == 0


def test_receipts_reversals_latest_schedule_and_no_payment_amounts(signed, stock, suppliers, security_db):
    o, _ = po(signed, stock, suppliers, expected_on=(date.today()-timedelta(days=3)).isoformat())
    receipt_row, _ = purchase_receipt(signed, o, '30', stock['storage']['id'])
    row = report(signed, 'purchasing')['items'][0]
    assert Decimal(row['received']) == 30 and Decimal(row['outstanding']) == 70
    assert row['finding'] == 'Overdue supplier receipt' and row['currency'] == 'AED'
    assert not {'unit_price', 'freight', 'taxes', 'stock_value'} & row.keys()
    r=signed.post('/api/purchasing/schedules',json=dict(order_id=o['id'],requested_on=(date.today()+timedelta(days=2)).isoformat(),reason='Synthetic updated schedule',evidence='Synthetic supplier schedule evidence'),headers=csrf(signed))
    assert r.status_code==201,r.text
    assert report(signed, 'purchasing')['items'][0]['finding'] == ''
    operation(signed, 'receipts/'+receipt_row['id']+'/reverse')
    row = report(signed, 'purchasing')['items'][0]
    assert Decimal(row['received']) == 0 and Decimal(row['outstanding']) == 100
    assert report(signed, 'purchasing', supplier_id=suppliers[1]['id'])['total'] == 0


def test_current_stock_consistency_nonusable_threshold_complete_scope_and_movements(signed, stock):
    receipt(signed, stock, 20)
    receipt(signed, stock, 3, kind='RETURN', destination=stock['quarantine']['id'])
    rows = report(signed, 'inventory')['items']
    assert sum(Decimal(r['on_hand']) for r in rows) == 23
    assert sum(Decimal(r['available']) for r in rows) == 20
    assert sum(Decimal(r['nonusable']) for r in rows) == 3
    findings = report(signed, 'exceptions')['items']
    assert any(r['finding']=='Non-usable stock' for r in findings)
    assert not any(r['finding']=='Inventory consistency exception' for r in findings)
    r = signed.put('/api/inventory/thresholds', json=dict(item_id=stock['item']['id'],warehouse_id=stock['warehouse']['id'],minimum='10'),headers=csrf(signed))
    assert r.status_code == 200, r.text
    assert report(signed, 'low_stock', location_id=stock['quarantine']['id'])['total'] == 0
    assert report(signed, 'movements')['total'] == 2
    assert report(signed, 'inventory', expected=422, since='2026-01-01')['error']['code']=='UNSUPPORTED_FILTER'


def test_supplier_owned_production_events_and_stage_progress(signed, stock, suppliers):
    o, _ = po(signed, stock, suppliers)
    p = production(signed, stock, suppliers, 'SUPPLIER', pol=o['lines'][0]['id'])
    stage(signed, p['stages'][0]['id'], 'start', '40')
    stage(signed, p['stages'][0]['id'], 'complete', '15')
    rows = report(signed, 'production')['items']
    first = next(r for r in rows if r['stage']=='FABRICATION')
    assert first['ownership']=='SUPPLIER' and Decimal(first['entered'])==40 and Decimal(first['completed'])==15
    assert Decimal(first['in_process'])==25 and Decimal(first['current_custody'])==40
    assert report(signed, 'production')['statuses']==[{'status':'ACTIVE','count':'1'}]
    events = report(signed, 'production_events')['items']
    assert len(events)==2 and all(r['ownership']=='SUPPLIER' for r in events)
    assert all(r['movement_id'] is None for r in events)
    assert report(signed, 'inventory')['total']==0


@pytest.mark.parametrize('role', ['OPERATIONS','SALES','ACCOUNTS','PACKING','MANAGEMENT','DRIVER'])
def test_exact_permission_matrix_direct_exports_and_exception_isolation(browser, accounts, security_db, role):
    maker, _ = security_db
    with maker() as db:
        db.get(User, accounts['operator']).roles=[db.scalar(select(Role).where(Role.code==role))]
        db.commit()
    assert login(browser,accounts,'test.operations').status_code==200
    permissions=set(browser.get('/api/auth/me').json()['permissions'])
    options=browser.get('/api/reports/options').json()['categories']
    listed={r['key'] for r in options}
    for category, required in PERMISSIONS.items():
        permitted=required <= permissions
        assert (category in listed)==permitted
        report(browser,category,expected=200 if permitted else 403)
        assert browser.get('/api/reports/export',params={'category':category}).status_code==(200 if permitted else 403)
    if 'exceptions' in listed:
        assert report(browser,'exceptions')['items']==[]


def test_pagination_dates_literal_search_and_precise_synthetic_decimal(signed, stock, security_db):
    # Create demand in the existing six-decimal unit, never a Number conversion.
    unit = master_post(signed, 'units', {'name':'Synthetic precision','decimal_places':6})
    item = master_post(signed, 'items', {'name':'Synthetic precise component','unit_id':unit['id'],'category_id':stock['category']['id'],'item_type':'finished'})
    precise = dict(stock,item=item,unit=unit)
    o = order(signed, precise, '99999999999999.123456', confirm=False)
    maker,_=security_db
    with maker() as db:
        db.get(SalesOrder,uuid.UUID(o['id'])).created_at=datetime(2026,1,1,20,0,tzinfo=UTC);db.commit()
    sales_call(signed,'orders/'+o['id']+'/confirm',op())
    row=report(signed)['items'][0]
    assert row['quantity']=='99999999999999.123456' and row['outstanding']=='99999999999999.123456'
    exported=signed.get('/api/reports/export?category=sales').content.decode('utf-8-sig')
    assert "'99999999999999.123456" in exported
    assert report(signed,since='2026-01-02',until='2026-01-02')['total']==1
    assert report(signed,until='2026-01-01')['total']==0
    assert report(signed,search='%')['total']==0
    assert report(signed,page=2)['items']==[]
    assert report(signed,page=0,expected=422)
    assert report(signed,since='2026-02-01',until='2026-01-01',expected=422)
    assert report(signed,supplier_id=key(),expected=422)['error']['code']=='UNSUPPORTED_FILTER'
    assert signed.get('/api/reports?category=sales&unrecognized=value').status_code==422


@pytest.mark.parametrize('value', ['=SUM(A1)', '+cmd', '-1+2', '@SUM(A1)', ' \t=1', '\r=1', '\ufeff=1', '\v=1', '\u200b=1', '\u00a0=1'])
def test_csv_cells_are_inert(value):
    assert safe_cell(value)=="'"+value


def test_export_scope_precision_metadata_and_no_business_mutation(signed, stock, security_db):
    o=order(signed,stock,confirm=False)
    maker,_=security_db
    with maker() as db:
        user_before=list(db.execute(select(User.id,User.password_hash)))
        before=db.scalar(select(func.count()).select_from(LedgerEffect))
        db.get(SalesOrder,uuid.UUID(o['id'])).code='=SYNTHETIC-FORMULA';db.commit()
    r=signed.get('/api/reports/export?category=sales')
    assert r.status_code==200 and 'attachment' in r.headers['content-disposition']
    text_value=r.content.decode('utf-8-sig')
    assert 'Asia/Dubai' in text_value and 'Generated at UTC' in text_value and "'=SYNTHETIC-FORMULA" in text_value
    rows=list(csv.reader(io.StringIO(text_value)));assert 'unit' in rows[5] and 'quantity' in rows[5]
    assert signed.get('/api/reports/export?category=sales&page=2').status_code==422
    assert signed.post('/api/reports',json={}).status_code==405
    with maker() as db:
        assert list(db.execute(select(User.id,User.password_hash)))==user_before
        assert db.scalar(select(func.count()).select_from(LedgerEffect))==before


@pytest.mark.parametrize('category',['inventory','exceptions','movements'])
def test_reporting_snapshot_does_not_block_posting_and_keeps_consistency(signed, stock, security_db, accounts, category):
    receipt(signed,stock,50);hold=reserve(signed,stock,'5')
    maker,_=security_db;ready=threading.Event();resume=threading.Event();pids=[]
    if category=='movements':
        large_history(maker,accounts,stock)
    cookies=dict(signed.cookies)
    def request(method,url,body=None):
        with TestClient(app,base_url=ORIGIN,headers={'Origin':ORIGIN}) as client:
            client.cookies.update(cookies)
            return client.get(url) if method=='GET' else client.post(url,json=body,headers=csrf(client))
    def pause(state):
        if state.session.info.get(SNAPSHOT_KEY) and state.is_select and not ready.is_set():
            result=state.invoke_statement();pids.append(state.session.connection().exec_driver_sql('SELECT pg_backend_pid()').scalar_one());ready.set()
            assert resume.wait(10)
            return result
    event.listen(Session,'do_orm_execute',pause,retval=True)
    try:
        with ThreadPoolExecutor(max_workers=2) as pool:
            reader=pool.submit(request,'GET','/api/reports?category='+category+('&page=2' if category=='movements' else ''))
            try:
                assert ready.wait(5)
                with maker() as db:
                    assert db.scalar(text("SELECT count(*) FROM pg_locks WHERE pid=:pid AND locktype='advisory'"),{'pid':pids[0]})==0
                started=time.perf_counter()
                writing=pool.submit(request,'POST','/api/inventory/reservations/'+hold['id']+'/consume',{'request_key':key()})
                try:
                    writer=writing.result(timeout=3)
                except TimeoutError:
                    # Diagnose a violated bound without extending it, hiding the
                    # failure, logging SQL/inputs or releasing the reader first.
                    with maker() as observer:
                        waits=observer.execute(text("SELECT pid,state,wait_event_type,wait_event,pg_blocking_pids(pid) AS blockers FROM pg_stat_activity WHERE datname=current_database() AND pid<>pg_backend_pid() ORDER BY pid")).mappings().all()
                        print('REPORT_WAIT_DIAGNOSTIC '+json.dumps([dict(r) for r in waits],default=str))
                    raise
                elapsed=round((time.perf_counter()-started)*1000,2)
                assert writer.status_code==200,writer.text
                assert not reader.done()
            finally:resume.set()
            value=reader.result(timeout=10);assert value.status_code==200,value.text
        if category=='inventory':
            r=value.json()['items'][0];assert Decimal(r['on_hand'])==Decimal(r['ledger'])==50 and Decimal(r['reserved'])==Decimal(r['active_reserved'])==5
            r=report(signed,'inventory')['items'][0];assert Decimal(r['on_hand'])==Decimal(r['ledger'])==45 and Decimal(r['reserved'])==0
        elif category=='movements':
            assert value.json()['total']==1201 and len(value.json()['items'])==50
            assert report(signed,'movements')['total']==1202
            assert signed.get('/api/reports/export?category=movements').json()['error']['code']=='REPORT_EXPORT_LIMIT'
        print('REPORT_CONCURRENCY '+json.dumps({'category':category,'writer_ms':elapsed,'writer_committed_while_report_paused':True}))
    finally:
        resume.set();event.remove(Session,'do_orm_execute',pause)


def test_anonymous_cannot_read_options_report_or_export(browser):
    for path in ['/api/reports/options','/api/reports','/api/reports/export']:
        assert browser.get(path).status_code==401


def test_issued_void_revised_documents_are_separate_from_dispatch(signed,stock):
    receipt(signed,stock,20);o=order(signed,stock);d=prepare(signed,stock,o);dispatch(signed,d)
    first=issue(signed,d)
    replacement=issue(signed,d,replaces_id=first['id'])
    rows=report(signed,'packing')['items']
    assert {r['status'] for r in rows}=={'ISSUED','REPLACED'}
    assert next(r for r in rows if r['status']=='REPLACED')['replacement_document_id']==replacement['id']
    packing_call(signed,'packing/documents/'+replacement['id']+'/void',op())
    assert {r['status'] for r in report(signed,'packing')['items']}=={'VOID','REPLACED'}
    assert Decimal(report(signed,'deliveries')['items'][0]['dispatched'])==15
    assert all('snapshot' not in r and 'pdf' not in r for r in rows)


def test_custom_report_scope_and_reference_selector_never_cross_permissions(signed,stock,suppliers,browser,accounts,security_db):
    receipt(signed,stock,3,kind='RETURN',destination=stock['quarantine']['id'])
    customer=master_post(signed,'customers',{'name':'Synthetic restricted report customer'})
    order(signed,stock,customer=customer)
    po(signed,stock,suppliers,expected_on=(date.today()-timedelta(days=3)).isoformat())
    maker,_=security_db
    with maker() as db:
        role=Role(code='SYNTHETIC_REPORT_SALES',description='Synthetic sales only')
        role.permissions=list(db.scalars(select(Permission).where(Permission.code.in_(['sales.orders.read','system.read']))))
        db.get(User,accounts['operator']).roles=[role];db.commit()
    assert login(browser,accounts,'test.operations').status_code==200
    findings=report(browser,'exceptions')['items']
    assert findings and {r['category'] for r in findings}=={'sales'}
    data=browser.get('/api/reports/choices?category=sales&field=customer_id').json()
    assert data['items']==[{'id':customer['id'],'name':customer['name'],'code':customer['code']}]
    assert browser.get('/api/reports/choices?category=purchasing&field=supplier_id').status_code==403
    assert browser.get('/api/reports/choices?category=sales&field=supplier_id').status_code==422
    assert browser.get('/api/reports/choices?category=sales&field=customer_id&search=%25').json()['items']==[]
