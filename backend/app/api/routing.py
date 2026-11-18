import uuid
from fastapi import APIRouter, Depends, Query, Request
from sqlalchemy import select, func
from sqlalchemy.orm import Session
from app.core.security import current_context
from app.db.session import get_session
from app.models.sales import SalesDelivery
from app.schemas.routing import SiteInput, AssignmentInput, CalculateInput, ConfirmInput, TripInput
from app.services import routing as service, inventory as inv
from app.services.item_journey import journey
from app.services.route_provider import get_routing_provider
from app.services.review_snapshot import review_request

router=APIRouter(prefix='/routing',tags=['Driver assignments, routes and item journey'])


@router.get('/mine')
def mine(page:int=Query(1,ge=1),db:Session=Depends(get_session),ctx=Depends(current_context)):
    service.authorize(db,ctx,'deliveries.trip.own')
    inv.lock_inventory(db)
    query=select(SalesDelivery).where(SalesDelivery.driver_id==ctx.user.id)
    total=db.scalar(select(func.count()).select_from(query.subquery()))
    return dict(items=[service.view(db,ctx,d.id) for d in db.scalars(query.order_by(SalesDelivery.created_at.desc()).offset((page-1)*25).limit(25))],total=total,page=page,page_size=25)


@router.get('/deliveries/{identity}')
def detail(identity:uuid.UUID,db:Session=Depends(get_session),ctx=Depends(current_context)):
    return service.view(db,ctx,identity)


@router.get('/deliveries/{identity}/options')
def options(identity:uuid.UUID,db:Session=Depends(get_session),ctx=Depends(current_context)):
    return service.options(db,ctx,identity)


@router.post('/sites',status_code=201)
def sites(data:SiteInput,db:Session=Depends(get_session),ctx=Depends(current_context)):
    result=service.site_view(service.save_site(db,ctx,data));db.commit();return result


@router.post('/deliveries/{identity}/assign')
def assign(identity:uuid.UUID,data:AssignmentInput,db:Session=Depends(get_session),ctx=Depends(current_context)):
    row=service.assign(db,ctx,identity,data);result=service.clean(row);db.commit();return result


@router.post('/deliveries/{identity}/calculate')
def calculate(identity:uuid.UUID,data:CalculateInput,db:Session=Depends(get_session),ctx=Depends(current_context),provider=Depends(get_routing_provider)):
    row=service.calculate(db,ctx,identity,data,provider);result=service.calculation_view(db,row);db.commit();return result


@router.post('/deliveries/{identity}/confirm')
def confirm(identity:uuid.UUID,data:ConfirmInput,db:Session=Depends(get_session),ctx=Depends(current_context)):
    result=service.clean(service.confirm(db,ctx,identity,data));db.commit();return result


@router.post('/deliveries/{identity}/trip')
def trip(identity:uuid.UUID,data:TripInput,db:Session=Depends(get_session),ctx=Depends(current_context)):
    result=service.clean(service.trip(db,ctx,identity,data));db.commit();return result


@router.get('/deliveries/{identity}/journey/{item_id}')
def trace(identity:uuid.UUID,item_id:uuid.UUID,request:Request,lot_id:uuid.UUID|None=None,page:int=Query(1,ge=1),db:Session=Depends(get_session),ctx=Depends(current_context)):
    inv.authorize(db,ctx,'items.trace.read')
    service.access(db,ctx,identity)
    with review_request(db,ctx,request) as snapshot:
        delivery=service.access(snapshot,ctx,identity,audit_denial=False)
        result=journey(snapshot,ctx,delivery,item_id,lot_id,page)
    # Driver assignment is object-level access, separate from role membership.
    # Check its latest value while the short final security gate is held.
    service.access(db,ctx,identity)
    db.commit()
    return result
