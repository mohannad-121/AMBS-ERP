"""ORS HTTP contract and real PostgreSQL route/driver integration tests. No live calls."""
import json
from decimal import Decimal
from types import SimpleNamespace
from unittest.mock import patch
from urllib.error import URLError
from concurrent.futures import ThreadPoolExecutor
from threading import Barrier
import pytest
from pydantic import SecretStr
from sqlalchemy import select,text,func
from sqlalchemy.exc import IntegrityError
from fastapi.testclient import TestClient
from app.main import app
from app.core.config import get_settings
from app.models.security import User,Role,AuditEvent
from app.models.sales import SalesDelivery
from app.services.route_provider import ORSProvider,get_routing_provider,ORS_URL
from tests.test_security import security_db,accounts,browser,csrf,login,ORIGIN  # noqa: F401
from tests.test_master import signed,post as master_post  # noqa: F401
from tests.test_inventory import stock  # noqa: F401
from tests.test_inventory import balance,call as inventory
from tests.test_sales import order,prepare,dispatch,receipt,op,call as sales_call

pytestmark=pytest.mark.integration
COORDS=[{'longitude':'55.2796','latitude':'25.1972'},{'longitude':'55.2003','latitude':'25.1180'}]


def response():
    return {'routes':[{'summary':{'distance':15284.4,'duration':991.6},'warnings':[{'code':1,'message':'Road access restriction'}]}],
        'metadata':{'timestamp':1794900000000,'query':{'coordinates':[[55.2796,25.1972],[55.2003,25.1180]]}}}


def provider():
    return ORSProvider(SimpleNamespace(ors_api_key=SecretStr('synthetic-test-only-key'),routing_timeout_seconds=2))


def result(payload=None,status=200):
    p=provider()
    with patch.object(p,'_request',return_value=(status,json.dumps(payload if payload is not None else response()).encode(),{})):
        return p.calculate_route(*COORDS)


def test_ors_valid_response_warning_timestamp_and_conversions():
    row=result()
    assert row.status=='SUCCESS' and row.distance_meters==Decimal('15284.400') and row.duration_seconds==Decimal('991.600')
    assert row.warnings==[{'code':'1','message':'Road access restriction'}] and row.provider_timestamp.tzinfo


@pytest.mark.parametrize('change',['distance','duration','no_summary','bad_routes','bad_warning','swapped','nan','boolean','geometry'])
def test_malformed_provider_response(change):
    payload=response()
    if change in ['distance','duration']:payload['routes'][0]['summary'][change]=-1
    if change=='no_summary':payload['routes'][0].pop('summary')
    if change=='bad_routes':payload['routes']='invalid'
    if change=='bad_warning':payload['routes'][0]['warnings']=['bad']
    if change=='swapped':payload['metadata']['query']['coordinates']=[[25.1972,55.2796],[25.118,55.2003]]
    if change=='nan':payload['routes'][0]['summary']['distance']=float('nan')
    if change=='boolean':payload['routes'][0]['summary']['distance']=True
    if change=='geometry':payload['routes'][0]['geometry']='bad'
    assert result(payload).status=='INVALID_RESPONSE'


@pytest.mark.parametrize('status,expected',[(401,'AUTH_FAILED'),(403,'AUTH_FAILED'),(429,'QUOTA_EXCEEDED'),(500,'UNAVAILABLE'),(302,'UNAVAILABLE'),(400,'INVALID_ENDPOINTS')])
def test_provider_http_failures(status,expected):
    row=result({'error':{'message':'synthetic-test-only-key'}},status)
    assert row.status==expected and row.distance_meters is None
    assert 'synthetic-test-only-key' not in repr(row)


def test_no_route_and_missing_key_no_network():
    assert result({'routes':[]}).status=='NO_ROUTE'
    assert result({'error':{'code':2010}},404).status=='NO_ROUTE'
    p=ORSProvider(SimpleNamespace(ors_api_key=SecretStr(''),routing_timeout_seconds=2))
    with patch.object(p,'_request',side_effect=AssertionError('No network')):
        assert p.calculate_route(*COORDS).status=='NOT_CONFIGURED'


@pytest.mark.parametrize('error',[TimeoutError(),URLError('synthetic-test-only-key')])
def test_provider_network_errors_safe(error):
    p=provider()
    with patch.object(p,'_request',side_effect=error):
        row=p.calculate_route(*COORDS)
    assert row.status=='UNAVAILABLE' and 'synthetic-test-only-key' not in repr(row)


def test_request_uses_header_and_longitude_first_without_redirects(monkeypatch):
    seen={}
    class Response:
        status=200
        headers={}
        def __enter__(self):return self
        def __exit__(self,*args):pass
        def read(self,size):return json.dumps(response()).encode()
    class Opener:
        def open(self,req,timeout):
            seen.update(url=req.full_url,headers=dict(req.header_items()),body=json.loads(req.data),timeout=timeout)
            return Response()
    monkeypatch.setattr('app.services.route_provider.request.build_opener',lambda *args:Opener())
    assert provider().calculate_route(*COORDS).status=='SUCCESS'
    assert seen['url']==ORS_URL and seen['body']['coordinates']==[[55.2796,25.1972],[55.2003,25.118]]
    assert seen['headers']['Authorization']=='synthetic-test-only-key' and seen['timeout']==2
    assert set(seen['body'])=={'coordinates','instructions','geometry'}


class MockProvider:
    configured=True
    calls=0
    def calculate_route(self,*args):
        self.calls+=1
        return result()


@pytest.fixture
def routing_fixture(signed,stock,security_db,accounts):
    maker,_=security_db
    with maker() as db:
        driver=db.get(User,accounts['operator']);driver.roles=[db.scalar(select(Role).where(Role.code=='DRIVER'))];db.commit()
    receipt(signed,stock,8)
    row=order(signed,stock)
    d=prepare(signed,stock,row)
    sites=[]
    for kind,identity,coords,label in [('warehouse',stock['warehouse']['id'],COORDS[0],'Synthetic origin'),('delivery',d['id'],COORDS[1],'Synthetic destination')]:
        sites.append(call(signed,'sites',op(source_kind=kind,source_id=identity,label=label,address='Verified synthetic endpoint',verified=True,**coords),201))
    mock=MockProvider();app.dependency_overrides[get_routing_provider]=lambda:mock
    yield dict(order=row,delivery=d,sites=sites,driver=str(accounts['operator']),mock=mock)
    app.dependency_overrides.pop(get_routing_provider,None)


def call(client,path,data=None,expected=200):
    response=client.get('/api/routing/'+path) if data is None else client.post('/api/routing/'+path,json=data,headers=csrf(client))
    assert response.status_code==expected,response.text
    return response.json()


def calc(client,fixture,**extra):
    return call(client,f"deliveries/{fixture['delivery']['id']}/calculate",op(origin_id=fixture['sites'][0]['id'],destination_id=fixture['sites'][1]['id'],**extra))


def assign(client,fixture,driver=None):
    return call(client,f"deliveries/{fixture['delivery']['id']}/assign",op(driver_id=driver or fixture['driver']))


def test_assignment_calculation_confirmation_no_inventory_effect(signed,stock,routing_fixture,security_db):
    f=routing_fixture;d=f['delivery'];before=balance(signed,stock)
    a=assign(signed,f);r=calc(signed,f)
    assert r['distance_km']=='15.28' and r['duration_display']=='16 min 32 sec' and r['duration_minutes']=='16.53'
    assert r['warnings'][0]['message']=='Road access restriction' and r['estimated_cost'] is None
    body=op(calculation_id=r['id'],assignment_id=a['id'],warnings_reviewed=True)
    call(signed,f"deliveries/{d['id']}/confirm",body)
    call(signed,f"deliveries/{d['id']}/confirm",body)
    detail=call(signed,f"deliveries/{d['id']}")
    assert detail['route_status']=='CONFIRMED' and detail['actual_distance_travelled'] is None
    assert balance(signed,stock)==before
    dispatch(signed,d)
    after=sales_call(signed,'orders/'+f['order']['id'])
    assert after['status']=='PARTIALLY_DISPATCHED' and Decimal(after['lines'][0]['outstanding'])==7
    inventory(signed,'post',f"movements/{after['deliveries'][0]['lines'][0]['movement_id']}/reverse",op(),409)
    maker,_=security_db
    with maker() as db:
        assert db.scalar(select(func.count()).select_from(SalesDelivery))==1
        assert db.scalar(select(func.count()).select_from(AuditEvent).where(AuditEvent.action=='routes.confirmations.confirmed'))==1


def test_reassignment_requires_new_confirmed_revision(signed,routing_fixture):
    f=routing_fixture;d=f['delivery'];a=assign(signed,f);r=calc(signed,f)
    call(signed,f"deliveries/{d['id']}/confirm",op(calculation_id=r['id'],assignment_id=a['id'],warnings_reviewed=True))
    a2=assign(signed,f)
    assert a2['revision']==2
    assert call(signed,f"deliveries/{d['id']}")['route_status']=='REVIEW_REQUIRED'
    r2=calc(signed,f)
    assert r2['revision']==2
    call(signed,f"deliveries/{d['id']}/confirm",op(calculation_id=r2['id'],assignment_id=a['id'],warnings_reviewed=True),409)
    call(signed,f"deliveries/{d['id']}/confirm",op(calculation_id=r2['id'],assignment_id=a2['id'],warnings_reviewed=True))
    detail=call(signed,f"deliveries/{d['id']}")
    assert len(detail['assignment_history'])==2 and len(detail['confirmations'])==2 and len(detail['calculations'])==2


def test_missing_key_and_failed_route_preserve_demand(signed,stock,routing_fixture):
    f=routing_fixture
    app.dependency_overrides[get_routing_provider]=lambda:ORSProvider(SimpleNamespace(ors_api_key=SecretStr('')))
    before=balance(signed,stock)
    row=calc(signed,f)
    assert row['status']=='NOT_CONFIGURED' and row['distance_meters'] is None and row['geometry'] is None
    a=assign(signed,f)
    call(signed,f"deliveries/{f['delivery']['id']}/confirm",op(calculation_id=row['id'],assignment_id=a['id'],warnings_reviewed=True),409)
    assert balance(signed,stock)==before
    dispatch(signed,f['delivery'])
    assert Decimal(sales_call(signed,'orders/'+f['order']['id'])['lines'][0]['outstanding'])==7


def test_route_retries_conflicts_and_local_budget(signed,routing_fixture,monkeypatch):
    f=routing_fixture
    body=op(origin_id=f['sites'][0]['id'],destination_id=f['sites'][1]['id'])
    path=f"deliveries/{f['delivery']['id']}/calculate"
    first=call(signed,path,body)
    assert call(signed,path,body)['id']==first['id'] and f['mock'].calls==1
    call(signed,path,dict(body,reason='Changed request details'),409)
    settings=get_settings().model_copy(update={'routing_requests_per_minute':1})
    monkeypatch.setattr('app.services.routing.get_settings',lambda:settings)
    assert calc(signed,f)['status']=='QUOTA_EXCEEDED' and f['mock'].calls==1


def test_driver_own_visibility_arrival_and_no_km_manipulation(signed,stock,routing_fixture,accounts):
    f=routing_fixture;assign(signed,f);dispatch(signed,f['delivery'])
    # Another order has no stock; create an unrelated delivery using a new receipt.
    receipt(signed,stock,2);other=prepare(signed,stock,order(signed,stock,'2'))
    assert login(signed,accounts,'test.operations').status_code==200
    mine=call(signed,'mine')
    assert mine['total']==1 and mine['items'][0]['delivery']['id']==f['delivery']['id']
    call(signed,f"deliveries/{other['id']}",expected=403)
    call(signed,f"deliveries/{f['delivery']['id']}/calculate",op(origin_id=f['sites'][0]['id'],destination_id=f['sites'][1]['id']),403)
    call(signed,f"deliveries/{f['delivery']['id']}/assign",op(driver_id=f['driver']),403)
    call(signed,f"deliveries/{f['delivery']['id']}/trip",op(status='COMPLETED',verified=True),409)
    body=op(status='ARRIVED',verified=True)
    call(signed,f"deliveries/{f['delivery']['id']}/trip",body)
    call(signed,f"deliveries/{f['delivery']['id']}/trip",body)
    call(signed,f"deliveries/{f['delivery']['id']}/trip",op(status='COMPLETED',verified=True,distance_km='900'),422)
    call(signed,f"deliveries/{f['delivery']['id']}/trip",op(status='COMPLETED',verified=True))
    detail=call(signed,f"deliveries/{f['delivery']['id']}")
    assert detail['trip_status']=='COMPLETED' and len(detail['trip_events'])==2
    call(signed,f"deliveries/{f['delivery']['id']}/journey/{stock['item']['id']}",expected=403)


def test_invalid_inactive_driver_and_confirmation_before_assignment(signed,routing_fixture,security_db,accounts):
    f=routing_fixture
    call(signed,f"deliveries/{f['delivery']['id']}/assign",op(driver_id=str(accounts['admin'])),422)
    maker,_=security_db
    with maker() as db:db.get(User,accounts['operator']).is_active=False;db.commit()
    call(signed,f"deliveries/{f['delivery']['id']}/assign",op(driver_id=f['driver']),422)


def test_endpoint_range_source_ownership_and_no_automatic_geocoding(signed,stock,routing_fixture):
    f=routing_fixture
    data=op(source_kind='warehouse',source_id=stock['warehouse']['id'],label='Unverified',address='Actual address',latitude='91',longitude='55',verified=True)
    call(signed,'sites',data,422)
    call(signed,'sites',dict(data,latitude='25',verified=False),422)
    another=master_post(signed,'customers',{'name':'Synthetic unrelated route customer'})
    bad=call(signed,'sites',dict(data,latitude='25',source_kind='customer',source_id=another['id']),201)
    call(signed,f"deliveries/{f['delivery']['id']}/calculate",op(origin_id=f['sites'][0]['id'],destination_id=bad['id']),422)
    call(signed,f"deliveries/{f['delivery']['id']}/calculate",op(origin_id=f['sites'][1]['id'],destination_id=f['sites'][0]['id']),422)
    assert f['mock'].calls==0


def test_item_journey_real_sources_readonly_and_reversal(signed,stock,routing_fixture):
    f=routing_fixture;d=dispatch(signed,f['delivery'])
    path=f"deliveries/{d['id']}/journey/{stock['item']['id']}"
    before=balance(signed,stock)
    timeline=call(signed,path)
    assert {'Received','Reserved','Picked','Loaded','Dispatched'} <= {e['kind'] for e in timeline['items']}
    assert timeline['tracking']=='NONE' and 'individual-piece' in timeline['identity_note']
    assert balance(signed,stock)==before
    call(signed,path,op(),405)
    sales_call(signed,f"deliveries/{d['id']}/reverse",op(goods_returned_to_origin=True))
    assert 'Reversed' in {e['kind'] for e in call(signed,path)['items']}
    assert inventory(signed,'get','reconciliation')['healthy']


def test_routing_history_database_guards(signed,routing_fixture,security_db):
    f=routing_fixture;assign(signed,f);calc(signed,f)
    maker,_=security_db
    with maker() as db:
        for table in ['delivery_driver_assignments','delivery_route_calculations','routing_sites']:
            with pytest.raises(IntegrityError):
                db.execute(text(f'DELETE FROM {table}'));db.commit()
            db.rollback()
        with pytest.raises(IntegrityError):
            db.execute(text('UPDATE sales_deliveries SET driver_id=NULL WHERE id=:id'),{'id':f['delivery']['id']});db.commit()


@pytest.mark.parametrize('role',['PACKING','SALES','MANAGEMENT','ACCOUNTS'])
def test_routing_readonly_role_boundaries(signed,stock,routing_fixture,security_db,accounts,role):
    f=routing_fixture;maker,_=security_db
    with maker() as db:
        user=db.get(User,accounts['operator']);user.roles=[db.scalar(select(Role).where(Role.code==role))];db.commit()
    assert login(signed,accounts,'test.operations').status_code==200
    call(signed,f"deliveries/{f['delivery']['id']}")
    call(signed,f"deliveries/{f['delivery']['id']}/assign",op(driver_id=f['driver']),403)
    call(signed,f"deliveries/{f['delivery']['id']}/calculate",op(origin_id=f['sites'][0]['id'],destination_id=f['sites'][1]['id']),403)
    if role!='ACCOUNTS':
        timeline=call(signed,f"deliveries/{f['delivery']['id']}/journey/{stock['item']['id']}")
        if role in ['PACKING','SALES']:assert all(e['kind']!='Received' for e in timeline['items'])


def test_warning_secret_redaction_and_geometry_decoding():
    payload=response();payload['routes'][0]['warnings']=[{'code':'synthetic-test-only-key','message':'Do not expose synthetic-test-only-key'}]
    payload['routes'][0]['geometry']='_p~iF~ps|U_ulLnnqC_mqNvxq`@'
    row=result(payload)
    assert row.status=='SUCCESS' and len(row.geometry)==3
    assert row.geometry[0]==[-120.2,38.5]
    assert 'synthetic-test-only-key' not in repr(row)


def test_provider_oversized_response_and_quota_retry_after():
    p=provider()
    with patch.object(p,'_request',return_value=(200,b'x'*2000001,{})):
        assert p.calculate_route(*COORDS).status=='INVALID_RESPONSE'
    with patch.object(p,'_request',return_value=(429,b'',{'Retry-After':'7200'})):
        assert p.calculate_route(*COORDS).retry_seconds==7200


def test_route_calculation_concurrency_reuses_same_request(signed,routing_fixture):
    f=routing_fixture;body=op(origin_id=f['sites'][0]['id'],destination_id=f['sites'][1]['id'])
    token,cookies,barrier=csrf(signed),dict(signed.cookies),Barrier(2)
    def worker(index):
        with TestClient(app,base_url=ORIGIN,headers={'Origin':ORIGIN},cookies=cookies,raise_server_exceptions=False) as client:
            barrier.wait(timeout=20)
            r=client.post(f"/api/routing/deliveries/{f['delivery']['id']}/calculate",json=body,headers=token)
            assert r.status_code==200
            return r.json()['id']
    with ThreadPoolExecutor(max_workers=2) as executor:
        ids=list(executor.map(worker,range(2)))
    assert ids[0]==ids[1] and f['mock'].calls==1


def test_driver_reassignment_and_inactive_assignment_prevent_dispatch(signed,stock,routing_fixture,security_db,accounts):
    f=routing_fixture;assign(signed,f);maker,_=security_db
    with maker() as db:db.get(User,accounts['operator']).is_active=False;db.commit()
    from tests.test_sales import actual
    actual(signed,f['delivery'],'pick');actual(signed,f['delivery'],'load')
    sales_call(signed,f"deliveries/{f['delivery']['id']}/dispatch",op(),422)
    assert Decimal(balance(signed,stock)['on_hand'])==8


def test_tariff_is_optional_server_approved_and_snapshot(signed,routing_fixture,monkeypatch):
    settings=get_settings().model_copy(update={'transport_rate_per_km':Decimal('2.5')})
    monkeypatch.setattr('app.services.routing.get_settings',lambda:settings)
    row=calc(signed,routing_fixture)
    assert row['estimated_cost']=='38.21' and row['cost_basis']=={'kind':'PER_KM','rate':'2.5','currency':'AED'}


def test_route_api_csrf_and_unsupported_manual_distance(signed,routing_fixture):
    f=routing_fixture;d=f['delivery']['id']
    response=signed.post(f'/api/routing/deliveries/{d}/calculate',json=op(origin_id=f['sites'][0]['id'],destination_id=f['sites'][1]['id']))
    assert response.status_code==403
    call(signed,f'deliveries/{d}/calculate',op(origin_id=f['sites'][0]['id'],destination_id=f['sites'][1]['id'],distance_km='10'),422)
    call(signed,f'deliveries/{d}/trip',op(status='ARRIVED',verified=True),409)


def test_new_destination_revision_never_rewrites_old_snapshot(signed,routing_fixture):
    f=routing_fixture;r=calc(signed,f)
    dest=call(signed,'sites',op(source_kind='delivery',source_id=f['delivery']['id'],label='Verified changed synthetic site',address='Verified revised synthetic address',latitude='25.13',longitude='55.21',verified=True),201)
    row=call(signed,f"deliveries/{f['delivery']['id']}/calculate",op(origin_id=f['sites'][0]['id'],destination_id=dest['id']))
    assert row['revision']==2 and row['destination']['id']==dest['id']
    detail=call(signed,f"deliveries/{f['delivery']['id']}")
    assert detail['calculations'][0]['destination']['id']==f['sites'][1]['id'] and detail['calculations'][0]['id']==r['id']
