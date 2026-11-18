"""Route/driver planning and human trip evidence never write stock quantities."""
from datetime import timedelta
from decimal import Decimal, ROUND_HALF_UP
from sqlalchemy import select, func
from app.core.config import get_settings
from app.core.security import utcnow, SecurityError
from app.models.routing import VerifiedSite, DriverAssignment, RouteCalculation, RouteConfirmation, TripEvent
from app.models.sales import SalesDelivery, SalesOrder, SalesDeliveryLine, SalesAllocation, SalesReservationLink
from app.models.master import Customer, Project
from app.models.inventory import Warehouse, Location, StockBalance, Reservation
from app.models.security import User
from app.services import inventory as inv, sales
from app.services.master import output, get_record, record_audit
from app.services.route_provider import RouteResult, MESSAGES, ATTRIBUTION, LICENSE


def authorize(db, ctx, permission):
    inv.authorize(db, ctx, permission)


def latest(db, model, delivery_id):
    ordering = model.revision.desc() if hasattr(model,'revision') else (model.status.desc() if model is TripEvent else model.created_at.desc())
    return db.scalar(select(model).where(model.delivery_id == delivery_id).order_by(ordering, model.id.desc()).limit(1))


def access(db, ctx, delivery_id, permission='routes.read', audit_denial=True):
    delivery = get_record(db, SalesDelivery, delivery_id)
    if permission in ctx.permissions:
        return delivery
    if permission == 'routes.read' and 'deliveries.trip.own' in ctx.permissions and delivery.driver_id == ctx.user.id:
        return delivery
    if not audit_denial:
        # The read-only snapshot cannot write a denial audit; its request boundary
        # writes the same denial through the separate authentication session.
        raise SecurityError(403,'PERMISSION_DENIED','You do not have permission for this inventory action')
    authorize(db, ctx, permission)


def open_delivery(db, identity):
    delivery = inv.locked(db, SalesDelivery, identity)
    if delivery.status in ('CANCELLED','REVERSED') or db.scalar(select(TripEvent.id).where(TripEvent.delivery_id == identity)):
        inv.fail('TRIP_CLOSED', 'This delivery is cancelled, reversed or already has arrival evidence')
    return delivery


def replay(db, ctx, model, data, identity=None):
    fingerprint = inv.digest({'data':data.model_dump(exclude={'request_key'}), 'delivery':identity})
    previous = db.scalar(select(model).where(model.request_key == data.request_key))
    if previous and (previous.request_hash != fingerprint or getattr(previous,'actor_id',getattr(previous,'verified_by',None)) != ctx.user.id):
        inv.fail('IDEMPOTENCY_CONFLICT','This request key belongs to another routing operation')
    return previous, fingerprint


def eligible_driver(db, identity):
    driver = get_record(db, User, identity)
    if not driver.is_active or not any(r.code == 'DRIVER' for r in driver.roles):
        inv.fail('INVALID_DRIVER','Select an active account with the DRIVER role',422)
    return driver


def save_site(db, ctx, data):
    authorize(db, ctx, 'routes.locations.manage')
    inv.lock_inventory(db)
    previous, fingerprint = replay(db, ctx, VerifiedSite, data)
    if previous:
        return previous
    models = {'warehouse':Warehouse, 'location':Location, 'customer':Customer, 'project':Project, 'delivery':SalesDelivery}
    source = get_record(db, models[data.source_kind], data.source_id)
    if getattr(source,'is_active',True) is False or getattr(source,'status',None) in ('CANCELLED','REVERSED','archived','cancelled'):
        inv.fail('INACTIVE_SITE','Select an active source reference',422)
    site = VerifiedSite(**data.model_dump(exclude={'verified','reason','request_key'}), verified_by=ctx.user.id,
        verified_at=utcnow(), request_key=data.request_key, request_hash=fingerprint)
    db.add(site); db.flush()
    record_audit(db,ctx,'routes.sites',site,'verified',['coordinates','source_reference'],reason=data.reason)
    return site


def assign(db,ctx,identity,data):
    authorize(db,ctx,'drivers.assign')
    inv.lock_inventory(db)
    previous,fingerprint = replay(db,ctx,DriverAssignment,data,identity)
    if previous:
        return previous
    delivery = open_delivery(db,identity)
    eligible_driver(db,data.driver_id)
    current = latest(db,DriverAssignment,identity)
    row = DriverAssignment(delivery_id=identity,driver_id=data.driver_id,revision=current.revision+1 if current else 1,previous_driver_id=delivery.driver_id,
        planned_departure=data.planned_departure,reason=data.reason,actor_id=ctx.user.id,
        request_key=data.request_key,request_hash=fingerprint)
    db.add(row);db.flush()
    delivery.driver_id = data.driver_id
    db.flush()
    record_audit(db,ctx,'drivers.assignments',row,'reassigned' if row.previous_driver_id else 'assigned',['driver_id','delivery_id','planned_departure'],reason=data.reason)
    return row


def verify_endpoints(db,delivery,origin,destination):
    order = get_record(db,SalesOrder,delivery.order_id)
    if origin.source_kind == 'warehouse':
        valid_origin = origin.source_id == delivery.warehouse_id
        source = get_record(db,Warehouse,origin.source_id)
    elif origin.source_kind == 'location':
        source = get_record(db,Location,origin.source_id)
        sources = set(db.scalars(select(StockBalance.location_id).join(Reservation,Reservation.balance_id==StockBalance.id)
            .join(SalesReservationLink,SalesReservationLink.reservation_id==Reservation.id)
            .join(SalesAllocation,SalesAllocation.id==SalesReservationLink.allocation_id)
            .join(SalesDeliveryLine,SalesDeliveryLine.allocation_id==SalesAllocation.id)
            .where(SalesDeliveryLine.delivery_id==delivery.id)))
        valid_origin = source.warehouse_id == delivery.warehouse_id and source.id in sources
    else:
        valid_origin,source = False,None
    if not valid_origin or not source.is_active or not get_record(db,Warehouse,delivery.warehouse_id).is_active:
        inv.fail('ORIGIN_MISMATCH','Verify an origin pin for this delivery’s warehouse or actual source location',422)
    allowed = {('customer',order.customer_id),('project',order.project_id),('delivery',delivery.id)}
    if (destination.source_kind,destination.source_id) not in allowed:
        inv.fail('DESTINATION_MISMATCH','Use a verified destination belonging to this customer, project or delivery',422)
    if origin.latitude == destination.latitude and origin.longitude == destination.longitude:
        inv.fail('IDENTICAL_ENDPOINTS','Verify distinct origin and destination pins',422)


def calculate(db,ctx,identity,data,provider):
    authorize(db,ctx,'routes.calculate')
    inv.lock_inventory(db)
    previous,fingerprint = replay(db,ctx,RouteCalculation,data,identity)
    if previous:
        return previous
    delivery = open_delivery(db,identity)
    if db.scalar(select(RouteConfirmation.id).where(RouteConfirmation.delivery_id==identity)):
        authorize(db,ctx,'routes.recalculate')
    origin,destination = get_record(db,VerifiedSite,data.origin_id),get_record(db,VerifiedSite,data.destination_id)
    verify_endpoints(db,delivery,origin,destination)
    settings,now = get_settings(),utcnow()
    # The existing shared transaction gate serializes budget checks across workers.
    minute = db.scalar(select(func.count()).select_from(RouteCalculation).where(RouteCalculation.attempted,
        RouteCalculation.created_at >= now-timedelta(minutes=1)))
    daily = db.scalar(select(func.count()).select_from(RouteCalculation).where(RouteCalculation.attempted,
        RouteCalculation.created_at >= now.replace(hour=0,minute=0,second=0,microsecond=0)))
    cooldown = db.scalar(select(func.max(RouteCalculation.retry_after)))
    if not provider.configured:
        result = RouteResult('NOT_CONFIGURED')
    elif minute >= settings.routing_requests_per_minute or daily >= settings.routing_requests_per_day or (cooldown and cooldown>now):
        result = RouteResult('QUOTA_EXCEEDED', retry_seconds=60)
    else:
        result = provider.calculate_route(output(origin),output(destination),data.profile)
    revision = db.scalar(select(func.coalesce(func.max(RouteCalculation.revision),0)).where(RouteCalculation.delivery_id==identity))+1
    cost,basis = None,None
    if result.status=='SUCCESS':
        if settings.transport_rate_per_km is not None:
            rate = Decimal(str(settings.transport_rate_per_km))
            cost = (result.distance_meters / 1000 * rate).quantize(Decimal('.01'),rounding=ROUND_HALF_UP)
            basis = dict(kind='PER_KM',rate=str(rate),currency=settings.transport_currency)
        elif settings.transport_fixed_rate is not None:
            cost = Decimal(str(settings.transport_fixed_rate)).quantize(Decimal('.01'),rounding=ROUND_HALF_UP)
            basis = dict(kind='FIXED',rate=str(cost),currency=settings.transport_currency)
    row = RouteCalculation(delivery_id=identity,origin_id=origin.id,destination_id=destination.id,revision=revision,
        provider=result.provider,profile=data.profile,status=result.status,message=MESSAGES[result.status],
        distance_meters=result.distance_meters,duration_seconds=result.duration_seconds,warnings=result.warnings,
        geometry=result.geometry,provider_timestamp=result.provider_timestamp,attempted=result.attempted,
        retry_after=now+timedelta(seconds=result.retry_seconds) if result.retry_seconds else None,
        estimated_cost=cost,cost_basis=basis,actor_id=ctx.user.id,reason=data.reason,
        request_key=data.request_key,request_hash=fingerprint)
    db.add(row);db.flush()
    record_audit(db,ctx,'routes.calculations',row,'revised' if revision>1 else 'calculated',['status','distance','duration','warnings'],reason=data.reason)
    return row


def confirm(db,ctx,identity,data):
    authorize(db,ctx,'routes.confirm')
    inv.lock_inventory(db)
    previous,fingerprint = replay(db,ctx,RouteConfirmation,data,identity)
    if previous:
        return previous
    delivery = open_delivery(db,identity)
    calculation = get_record(db,RouteCalculation,data.calculation_id)
    assignment = get_record(db,DriverAssignment,data.assignment_id)
    current = latest(db,DriverAssignment,identity)
    latest_calculation = latest(db,RouteCalculation,identity)
    if calculation.delivery_id!=identity or calculation.status!='SUCCESS' or latest_calculation.id != calculation.id:
        inv.fail('INVALID_ROUTE','Confirm the latest successful calculation for this delivery')
    if assignment.delivery_id!=identity or current.id!=assignment.id or delivery.driver_id!=assignment.driver_id:
        inv.fail('ASSIGNMENT_CHANGED','Driver assignment changed; review the current assignment')
    eligible_driver(db,assignment.driver_id)
    if utcnow()-calculation.created_at > timedelta(hours=24):
        inv.fail('ROUTE_STALE','Recalculate an estimate older than 24 hours before confirming')
    verify_endpoints(db,delivery,get_record(db,VerifiedSite,calculation.origin_id),get_record(db,VerifiedSite,calculation.destination_id))
    if db.scalar(select(RouteConfirmation.id).where(RouteConfirmation.calculation_id==calculation.id)):
        inv.fail('ROUTE_ALREADY_CONFIRMED','This route snapshot is already confirmed')
    row = RouteConfirmation(delivery_id=identity,calculation_id=calculation.id,assignment_id=assignment.id,
        actor_id=ctx.user.id,reason=data.reason,request_key=data.request_key,request_hash=fingerprint)
    db.add(row);db.flush()
    record_audit(db,ctx,'routes.confirmations',row,'confirmed',['calculation_id','assignment_id','warnings_reviewed'],reason=data.reason)
    return row


def trip(db,ctx,identity,data):
    inv.lock_inventory(db)
    delivery = get_record(db,SalesDelivery,identity)
    if 'deliveries.trip.update' not in ctx.permissions:
        if 'deliveries.trip.own' not in ctx.permissions or delivery.driver_id!=ctx.user.id:
            authorize(db,ctx,'deliveries.trip.update')
    previous,fingerprint = replay(db,ctx,TripEvent,data,identity)
    if previous:
        return previous
    if delivery.status != 'DISPATCHED':
        inv.fail('NOT_DISPATCHED','Only a dispatched delivery can record arrival or trip completion')
    assignment = latest(db,DriverAssignment,identity)
    if not assignment or assignment.driver_id!=delivery.driver_id:
        inv.fail('ASSIGNMENT_REQUIRED','Record an eligible driver assignment first')
    eligible_driver(db,assignment.driver_id)
    previous_event = latest(db,TripEvent,identity)
    if (data.status=='ARRIVED' and previous_event) or (data.status=='COMPLETED' and (not previous_event or previous_event.status!='ARRIVED')):
        inv.fail('TRIP_TRANSITION','Record actual arrival once before completing the trip')
    row = TripEvent(delivery_id=identity,assignment_id=assignment.id,status=data.status,occurred_at=utcnow(),
        actor_id=ctx.user.id,reason=data.reason,request_key=data.request_key,request_hash=fingerprint)
    db.add(row);db.flush()
    record_audit(db,ctx,'deliveries.trip',row,data.status.lower(),['status','occurred_at'],reason=data.reason)
    return row


def site_view(site):
    result = output(site)
    for key in ('request_key','request_hash'):
        result.pop(key,None)
    result['verification_status']='VERIFIED'
    return result


def clean(row):
    result = output(row)
    for key in ('request_key','request_hash'):
        result.pop(key,None)
    return result


def calculation_view(db,row):
    result = clean(row)
    result.update(origin=site_view(get_record(db,VerifiedSite,row.origin_id)),
        destination=site_view(get_record(db,VerifiedSite,row.destination_id)),attribution=ATTRIBUTION,license=LICENSE)
    result['distance_km'] = str((row.distance_meters/1000).quantize(Decimal('.01'),rounding=ROUND_HALF_UP)) if row.distance_meters is not None else None
    if row.duration_seconds is not None:
        seconds = int(row.duration_seconds.quantize(Decimal('1'),rounding=ROUND_HALF_UP))
        result['duration_minutes']=str((row.duration_seconds/60).quantize(Decimal('.01'),rounding=ROUND_HALF_UP))
        result['duration_display']=f'{seconds//60} min {seconds%60:02d} sec'
    else:
        result['duration_minutes'],result['duration_display']=None,None
    return result


def view(db,ctx,identity):
    delivery = access(db,ctx,identity)
    # Consistent source/route snapshot without writing business data.
    inv.lock_inventory(db)
    own = 'routes.read' not in ctx.permissions
    assignment = latest(db,DriverAssignment,identity)
    calculations = list(db.scalars(select(RouteCalculation).where(RouteCalculation.delivery_id==identity).order_by(RouteCalculation.revision)))
    confirmations = list(db.scalars(select(RouteConfirmation).where(RouteConfirmation.delivery_id==identity).order_by(RouteConfirmation.created_at)))
    confirmation = confirmations[-1] if confirmations else None
    current_route = bool(confirmation and assignment and confirmation.assignment_id==assignment.id and confirmation.calculation_id==(calculations[-1].id if calculations else None))
    events = list(db.scalars(select(TripEvent).where(TripEvent.delivery_id==identity).order_by(TripEvent.created_at)))
    route_status = ('CONFIRMED' if current_route else 'REVIEW_REQUIRED') if confirmation else (calculations[-1].status if calculations else ('NOT_CALCULATED' if get_settings().ors_api_key.get_secret_value().strip() else 'NOT_CONFIGURED'))
    return dict(delivery=sales.delivery_view(db,delivery),driver_name=get_record(db,User,delivery.driver_id).display_name if delivery.driver_id else None,
        assignment=clean(assignment) if assignment else None,
        assignment_history=[] if own else [clean(a) for a in db.scalars(select(DriverAssignment).where(DriverAssignment.delivery_id==identity).order_by(DriverAssignment.created_at))],
        calculations=[{**calculation_view(db,r), **({'estimated_cost':None,'cost_basis':None} if 'inventory.costs.read' not in ctx.permissions else {})} for r in (calculations[-1:] if own else calculations)],
        confirmations=[] if own else [clean(c) for c in confirmations],route_status=route_status,
        trip_status=events[-1].status if events else ('DISPATCHED' if delivery.status=='DISPATCHED' else ('ASSIGNED' if delivery.driver_id else 'UNASSIGNED')),
        trip_events=[clean(e) for e in events],transport_cost_status='CONFIGURED' if get_settings().transport_fixed_rate is not None or get_settings().transport_rate_per_km is not None else 'NOT_CONFIGURED',
        actual_distance_travelled=None,attribution=ATTRIBUTION,license=LICENSE)


def options(db,ctx,identity):
    authorize(db,ctx,'routes.calculate')
    delivery = get_record(db,SalesDelivery,identity)
    order = get_record(db,SalesOrder,delivery.order_id)
    warehouse = get_record(db,Warehouse,delivery.warehouse_id)
    customer = get_record(db,Customer,order.customer_id)
    sources = [dict(kind='warehouse',id=str(warehouse.id),label=warehouse.name,address=warehouse.address or '',endpoint='origin'),
        dict(kind='customer',id=str(customer.id),label=customer.name,address=customer.address or '',endpoint='destination'),
        dict(kind='delivery',id=str(delivery.id),label=delivery.code,address=delivery.destination,endpoint='destination')]
    if order.project_id:
        project = get_record(db,Project,order.project_id)
        sources.append(dict(kind='project',id=str(project.id),label=project.name,address=project.location or '',endpoint='destination'))
    for location in db.scalars(select(Location).where(Location.warehouse_id==delivery.warehouse_id,Location.is_active)):
        sources.append(dict(kind='location',id=str(location.id),label=location.name,address=warehouse.address or '',endpoint='origin'))
    allowed = {(s['kind'],s['id']) for s in sources}
    sites = [site_view(s) for s in db.scalars(select(VerifiedSite).order_by(VerifiedSite.verified_at.desc())) if (s.source_kind,str(s.source_id)) in allowed]
    return dict(sources=sources,sites=sites,drivers=[dict(id=str(u.id),name=u.display_name) for u in db.scalars(select(User).where(User.is_active)) if any(r.code=='DRIVER' for r in u.roles)])
