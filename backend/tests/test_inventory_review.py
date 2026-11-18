"""Synthetic PostgreSQL databases only; previews must never repair or post stock."""
import base64
import csv
import io
import json
import uuid
from decimal import Decimal
import pytest
from sqlalchemy import event, select
from app.models.inventory import StockBalance
from app.models.security import Role,User,AuditEvent
from tests.test_security import security_db,accounts,browser,csrf,login  # noqa: F401
from tests.test_master import signed,post as master_post  # noqa: F401
from tests.test_inventory import stock,call,draft,post_movement,reserve,key  # noqa: F401

pytestmark=pytest.mark.integration


def seed(signed,stock,quantity='50'):
    movement,_=draft(signed,stock,quantity=quantity)
    return post_movement(signed,movement)


def body(stock,quantity='40'):
    return {'lines':[{'item_id':stock['item']['id'],'unit_id':stock['unit']['id'],'location_id':stock['storage']['id'],'quantity':quantity}]}


def preview(signed,data,status=200):
    return call(signed,'post','review/physical-preview',data,status)


def file_body(stock,rows=None):
    prefix=','.join([stock['item']['code'],stock['unit']['name'],stock['warehouse']['name'],stock['storage']['name']])
    source='SKU,Unit,Warehouse,Location,Quantity\n'+(rows if rows is not None else prefix+',40\n')
    return {'category':'physical_stock','filename':'synthetic-count.csv','content_base64':base64.b64encode(source.encode()).decode(),'sheet':0,'header_row':1,'mapping':{'sku':'A','unit':'B','warehouse':'C','location':'D','quantity':'E'}}


def file_call(signed,data,path='reconcile',status=200):
    response=signed.post('/api/onboarding/'+path,json=data,headers=csrf(signed))
    assert response.status_code==status,response.text
    return response


@pytest.mark.parametrize('count,status,delta',[('50','MATCH','0'),('40','SHORTAGE','-10'),('60','SURPLUS','10'),('0','SHORTAGE','-50')])
def test_physical_variance_and_no_business_writes(signed,stock,security_db,count,status,delta):
    seed(signed,stock);maker,_=security_db
    statements=[]
    def track(conn,cursor,statement,parameters,context,many):
        if statement.lstrip().split(' ',1)[0].upper() in ('INSERT','UPDATE','DELETE'):
            statements.append(statement.lower())
    with maker() as db: engine=db.get_bind()
    event.listen(engine,'before_cursor_execute',track)
    try:
        result=preview(signed,body(stock,count))
        row=result['items'][0]
        assert row['status']==status and Decimal(row['variance'])==Decimal(delta)
        assert Decimal(row['ledger_on_hand'])==50 and row['references']
        assert result['stock_changes']==result['ledger_changes']==0
        assert not any(any(t in s for t in ['stock_balances','stock_ledger_effects','stock_movements','inventory_counts']) for s in statements)
        assert all('sessions' in s or 'audit_events' in s for s in statements)
        assert preview(signed,body(stock,count))==result
    finally:event.remove(engine,'before_cursor_execute',track)


def test_reservations_cache_mismatch_and_no_repair(signed,stock,security_db):
    seed(signed,stock);reserve(signed,stock,'20');maker,_=security_db
    with maker() as db:
        balance=db.scalar(select(StockBalance));balance.on_hand=Decimal(51);db.commit()
    review=call(signed,'get','review')['items'][0]
    assert 'BALANCE_LEDGER_MISMATCH' in review['issues']
    assert Decimal(review['usable_available'])==30
    result=preview(signed,body(stock,'10'))['items'][0]
    assert 'COUNT_BELOW_ACTIVE_RESERVATIONS' in result['issues']
    assert 'ERP_CONSISTENCY_REVIEW_REQUIRED' in result['issues']
    with maker() as db:assert db.scalar(select(StockBalance)).on_hand==51


def test_missing_bucket_and_duplicate_count_identity(signed,stock,security_db):
    result=preview(signed,body(stock,'4'))
    assert result['items'][0]['status']=='SURPLUS' and 'NO_EXISTING_STOCK_BUCKET' in result['items'][0]['issues']
    data=body(stock);data['lines']*=2
    assert preview(signed,data,422)['error']['code']=='DUPLICATE_COUNT_IDENTITY'
    maker,_=security_db
    with maker() as db:assert db.scalar(select(StockBalance)) is None


@pytest.mark.parametrize('value',['-1','NaN','Infinity','0.1','99999999999999999999999999'])
def test_invalid_count_quantities(signed,stock,value):
    preview(signed,body(stock,value),422)


def test_file_reconciliation_validation_exports_and_audit(signed,stock,security_db):
    seed(signed,stock)
    other=master_post(signed,'units',{'name':'Synthetic wrong unit','decimal_places':0})
    prefix=','.join([stock['item']['code'],stock['unit']['name'],stock['warehouse']['name'],stock['storage']['name']])
    rows=prefix+',40\n'+'=UNTRUSTED_SKU,PCS,Synthetic yard,Synthetic storage,4\n'+prefix.replace('PCS',other['name'])+',3\n'
    data=file_body(stock,rows);result=file_call(signed,data).json()
    assert result['records'][0]['reconciliation']['status']=='INVALID'  # duplicate resolved stock identity
    assert any(i['code']=='UNKNOWN_REFERENCE' for i in result['records'][1]['issues'])
    assert any(i['code']=='UNIT_MISMATCH' for i in result['records'][2]['issues'])
    valid=file_call(signed,file_body(stock)).json();r=valid['records'][0]['reconciliation']
    assert r['status']=='SHORTAGE' and Decimal(r['variance'])==-10 and r['references']
    response=file_call(signed,data,'reconciliation-report')
    assert response.headers['cache-control']=='no-store'
    exported=list(csv.reader(io.StringIO(response.content.decode('utf-8-sig'))))
    assert exported and 'Expected (ledger)' in exported[3]
    assert not any(cell.lstrip().startswith(('=','+','-','@')) for row in exported for cell in row)
    assert file_call(signed,data).json()==result
    maker,_=security_db
    with maker() as db:
        audits=list(db.scalars(select(AuditEvent).where(AuditEvent.action=='onboarding.reconciled_preview')))
        assert audits and '=UNTRUSTED_SKU' not in json.dumps([a.details for a in audits])
        assert db.scalar(select(StockBalance)).on_hand==50


def test_file_duplicate_aliases_and_bounds(signed,stock):
    seed(signed,stock)
    prefix=','.join([stock['item']['code'],stock['unit']['name'],stock['warehouse']['name'],stock['storage']['name']])
    data=file_body(stock,prefix+',40\n'+prefix.replace(stock['item']['code'],stock['item']['name'])+',40\n')
    result=file_call(signed,data).json()
    assert all(r['reconciliation']['status']=='INVALID' for r in result['records'])
    file_call(signed,file_body(stock,(prefix+',1\n')*101),status=422)
    call(signed,'post','review/physical-preview',{'lines':body(stock)['lines']*101},422)
    assert signed.post('/api/onboarding/reconcile',json=data).status_code==403
    data['category']='packing_deliveries';file_call(signed,data,status=422)


def test_global_journey_without_delivery_transfer_reservation_reversal(signed,stock):
    empty=call(signed,'get',f"journey/{stock['item']['id']}");assert empty['total']==0
    movement=seed(signed,stock);reservation=reserve(signed,stock,'5')
    transfer,_=draft(signed,stock,quantity='10',kind='TRANSFER',source=stock['storage']['id'],destination=stock['packing']['id'])
    post_movement(signed,transfer)
    call(signed,'post',f"reservations/{reservation['id']}/release",{'request_key':key()})
    call(signed,'post',f"movements/{transfer['id']}/reverse",{'request_key':key(),'reason':'Synthetic transfer correction'})
    path=f"journey/{stock['item']['id']}"
    result=call(signed,'get',path)
    assert {'Received','Moved','Reversed','Reserved','Reservation released'}<=set(e['kind'] for e in result['items'])
    moved=[e for e in result['items'] if e['kind']=='Moved']
    assert len(moved)==2 and sum(Decimal(e['quantity']) for e in moved)==0
    assert all(e['from_location']==stock['storage']['name'] and e['to_location']==stock['packing']['name'] for e in moved)
    released=next(e for e in result['items'] if e['kind']=='Reservation released')
    assert released['actor'] and released['links']['actor_source']=='audit_events'
    assert len({e['event_id'] for e in result['items']})==result['total']
    assert call(signed,'get',path)==result
    assert call(signed,'get',path+'?kind=Moved')['total']==2
    assert call(signed,'get',path+'?search='+movement['code'])['total']==1
    assert call(signed,'get',path+'?page=2')['items']==[]
    assert call(signed,'get',path+'?since=2100-01-01T00:00:00Z')['total']==0
    assert call(signed,'get',path+'?since=2000-01-01T00:00:00Z&until=2100-01-01T00:00:00Z')['total']==result['total']
    call(signed,'get',path+'?since=2026-01-01T00:00:00',expected=422)
    call(signed,'get',path+'?search='+('x'*201),expected=422)
    assert call(signed,'get','reconciliation')['healthy']


def test_global_delivery_documents_partial_fulfillment_and_readonly(signed,stock):
    from tests.test_sales import order,prepare,dispatch,call as sales,op
    from tests.test_packing import issue
    seed(signed,stock,'8');sales_order=order(signed,stock,quantity='15')
    delivery=dispatch(signed,prepare(signed,stock,sales_order))
    document=issue(signed,delivery)
    path=f"journey/{stock['item']['id']}"
    timeline=call(signed,'get',path)
    assert {'Picked','Loaded','Dispatched','Reservation consumed','Packing document issued'}<=set(e['kind'] for e in timeline['items'])
    documentary=next(e for e in timeline['items'] if e['kind']=='Packing document issued')
    assert Decimal(documentary['quantity'])==8 and documentary['links']['document_id']==document['id']
    assert 'not an additional stock effect' in documentary['quantity_semantics']
    assert next(e for e in timeline['items'] if e['kind']=='Dispatched')['links']['order_id']==sales_order['id']
    seed(signed,stock,'7');dispatch(signed,prepare(signed,stock,sales(signed,'orders/'+sales_order['id'])))
    assert len([e for e in call(signed,'get',path)['items'] if e['kind']=='Dispatched'])==2
    sales(signed,f"deliveries/{delivery['id']}/reverse",op(goods_returned_to_origin=True))
    assert 'Reversed' in {e['kind'] for e in call(signed,'get',path)['items']}
    assert call(signed,'get','reconciliation')['healthy']


def test_unrecorded_closing_employee_is_never_invented(signed,stock):
    from unittest.mock import patch
    seed(signed,stock);reservation=reserve(signed,stock,'2')
    with patch('app.services.inventory.record_audit'):
        call(signed,'post',f"reservations/{reservation['id']}/release",{'request_key':key()})
    timeline=call(signed,'get',f"journey/{stock['item']['id']}")
    assert next(e for e in timeline['items'] if e['kind']=='Reservation released')['actor'] is None


@pytest.mark.parametrize('mode',['LOT','SERIAL'])
def test_exact_lot_serial_counts_and_history(signed,stock,mode):
    call(signed,'put',f"policies/{stock['item']['id']}",{'tracking_mode':mode})
    lot=call(signed,'post','lots',{'item_id':stock['item']['id'],'name':'Synthetic review identity','identifier':'Synthetic-Review-Identity'},201)
    movement,_=draft(signed,stock,quantity='1',lot=lot['id']);post_movement(signed,movement)
    data=body(stock,'0');preview(signed,data,422)
    data['lines'][0]['lot_id']=lot['id'];assert preview(signed,data)['items'][0]['status']=='SHORTAGE'
    if mode=='SERIAL':data['lines'][0]['quantity']='2';preview(signed,data,422)
    timeline=call(signed,'get',f"journey/{stock['item']['id']}?lot_id={lot['id']}")
    assert timeline['items'] and all(e['lot_id']==lot['id'] for e in timeline['items'])
    result=file_call(signed,file_body(stock)).json()
    assert result['records'][0]['reconciliation']['status']=='REVIEW_REQUIRED'


@pytest.mark.parametrize('role,allowed',[('OPERATIONS',True),('MANAGEMENT',True),('PACKING',False),('SALES',False),('DRIVER',False),('ACCOUNTS',False)])
def test_global_history_authorization(signed,stock,security_db,accounts,role,allowed):
    maker,_=security_db
    with maker() as db:
        user=db.get(User,accounts['operator']);user.roles=[db.scalar(select(Role).where(Role.code==role))];db.commit()
    assert login(signed,accounts,'test.operations').status_code==200
    call(signed,'get',f"journey/{stock['item']['id']}",expected=200 if allowed else 403)
    preview(signed,body(stock),200 if role=='OPERATIONS' else 403)
    file_call(signed,file_body(stock),status=200 if role=='OPERATIONS' else 403)
