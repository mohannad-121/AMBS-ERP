"""Bounded operational projections over existing records; never a stock register.

Every call requires the shared Phase 8B read-only MVCC boundary. Quantities remain
SQL Decimals / strings; no prices, valuations or unapproved finance calculations.
"""
import csv
import io
import time
import unicodedata
from dataclasses import dataclass
from datetime import datetime, time as day_time, timedelta, UTC
from decimal import Decimal
from zoneinfo import ZoneInfo

from sqlalchemy import select, func, case, and_, or_, literal, cast, String, union_all
from sqlalchemy.orm import aliased
from app.core.security import SecurityError, utcnow
from app.api.dashboard import stock_source
from app.models.master import Customer, Project, Lpo, Item, Unit
from app.models.inventory import (
    StockBalance, StockThreshold, Location, Warehouse, StockLot, Reservation,
    LedgerEffect, MovementLine, StockMovement,
)
from app.models.purchasing import (
    Supplier, PurchaseOrder, OrderLine, PurchaseReceipt, ReceiptLine,
    ProductionOrder, ProductionStage, ProductionEvent, ScheduleUpdate,
)
from app.models.sales import (
    SalesOrder, SalesLine, SalesAllocation, SalesConsumption, SalesDelivery,
    SalesDeliveryLine,
)
from app.models.packing import PackingDocument, DocumentEvent
from app.models.routing import DriverAssignment
from app.services.review_snapshot import require_snapshot

TIMEZONE = 'Asia/Dubai'
PAGE_SIZE = 50
EXPORT_LIMIT = 1000
PERMISSIONS = {
    'sales': {'sales.orders.read'}, 'purchasing': {'purchasing.orders.read'},
    'inventory': {'inventory.read'}, 'low_stock': {'inventory.read'},
    'movements': {'inventory.read'}, 'production': {'production.read'},
    'production_events': {'production.read'}, 'deliveries': {'sales.deliveries.read'},
    # Match existing company document scope; never turn an own-driver grant into a company report.
    'packing': {'packing.read', 'packing.company'},
}
DEFINITIONS = {
    'sales': 'One original order line. Dispatched is consumption linked to currently DISPATCHED deliveries. Outstanding/backorder is the original remaining demand, matching Phase 6A; draft/cancelled demand is excluded from open demand. Unallocated outstanding is shown separately and does not redefine backorders. Customer-signed receipt is not established.',
    'purchasing': 'One PO line. Received includes only currently POSTED receipts; reversals are excluded. Outstanding is open commitment only, not payment. Latest recorded order ETA/confirmed/requested date overrides expected receipt date.',
    'inventory': 'One existing stock bucket. Ledger and active reservation totals are compared with cached balances. Availability uses the existing allocatable predicate. Non-usable and external custody are separate, overlapping views, not additive stock totals. Current snapshot; date filtering is unsupported.',
    'low_stock': 'One configured threshold below its minimum using allocatable availability over its complete warehouse/location scope. A display filter never shrinks a warehouse threshold. No threshold means no invented low-stock warning. Current snapshot.',
    'movements': 'One immutable signed ledger effect, dated by posting time. Transfers have two signed effects; reversal effects offset original effects. RETURN means a recorded return movement, not an inferred customer return or proof of receipt.',
    'production': 'One recorded production stage (or a stage-less draft). Planned quantities repeat per stage and must not be summed across stages. START/incoming TRANSFER establish entered; COMPLETE establishes completed; outgoing TRANSFER/YARD reduce custody. AMBS stock is distinct from SUPPLIER-owned evidence. Latest stage schedule overrides stage/order expected finish.',
    'production_events': 'One actual production event: START, COMPLETE, TRANSFER or YARD. Movement/receipt references are evidence where recorded; supplier-owned events are not company stock ledger effects. No event is fabricated.',
    'deliveries': 'One delivery line. Planned/picked/loaded are preparation, not dispatch. Actual dispatched quantities require consumption and current DISPATCHED state. REVERSED consumption is shown separately and excluded from net dispatched totals. Driver assignment is recorded reference evidence; no GPS or customer-signed proof is inferred.',
    'packing': 'One issued immutable document revision. An existing VOID or REPLACED event determines document state; otherwise ISSUED. Issuance is separate from physical dispatch. No PDF snapshot, employee contact or private payload is exported.',
    'exceptions': 'Authoritative findings from authorized sales, purchasing, inventory, low-stock, production and delivery projections. No findings is a truthful empty state. Status counts here count findings, not unique business documents.',
}


def fail(code, message, status=422):
    raise SecurityError(status, code, message)


def allowed(category, permissions):
    return category == 'exceptions' and any(PERMISSIONS[c] <= permissions for c in EXCEPTION_SOURCES) or PERMISSIONS.get(category, {'__none__'}) <= permissions


def authorize(category, permissions):
    if not allowed(category, permissions):
        fail('PERMISSION_DENIED', 'You do not have permission for this report', 403)


@dataclass
class Source:
    query: object
    date_column: str | None
    filters: set
    href: str
    link_permission: str
    date_only: bool = False


def col(value, name):
    return (value if hasattr(value, 'label') else literal(value)).label(name)


def due(model_id, *, stage=False, fallback=None):
    match = ScheduleUpdate.stage_id == model_id if stage else ScheduleUpdate.order_id == model_id
    latest = select(func.coalesce(ScheduleUpdate.eta, ScheduleUpdate.confirmed_on, ScheduleUpdate.requested_on)).where(match).order_by(ScheduleUpdate.created_at.desc(), ScheduleUpdate.id.desc()).limit(1).correlate_except(ScheduleUpdate).scalar_subquery()
    return func.coalesce(latest, fallback)


def sales_source():
    sent = (select(SalesAllocation.line_id, func.sum(SalesConsumption.quantity).label('quantity'),
                   func.count(func.distinct(SalesDelivery.id)).label('delivery_count'), func.max(SalesDelivery.dispatched_at).label('last_dispatch_at'))
            .select_from(SalesConsumption).join(SalesDeliveryLine, SalesDeliveryLine.id == SalesConsumption.delivery_line_id)
            .join(SalesAllocation, SalesAllocation.id == SalesDeliveryLine.allocation_id)
            .join(SalesDelivery, SalesDelivery.id == SalesDeliveryLine.delivery_id)
            .where(SalesDelivery.status == 'DISPATCHED').group_by(SalesAllocation.line_id).subquery())
    holds = (select(SalesAllocation.line_id, func.sum(Reservation.quantity).label('quantity'))
             .join(Reservation, Reservation.id == SalesAllocation.current_reservation_id)
             .where(Reservation.status == 'ACTIVE').group_by(SalesAllocation.line_id).subquery())
    shipped = func.coalesce(sent.c.quantity, 0)
    outstanding = case((SalesOrder.status.in_(['CONFIRMED', 'PARTIALLY_DISPATCHED']), SalesLine.quantity - shipped), else_=0)
    allocated = func.coalesce(holds.c.quantity, 0)
    q = select(*[col(v, k) for k, v in dict(
        row_id=SalesLine.id, record_id=SalesOrder.id, reference=SalesOrder.code, status=SalesOrder.status,
        recorded_at=SalesOrder.created_at, item_id=SalesLine.item_id, item=SalesLine.item_name,
        unit=SalesLine.unit_name, unit_id=SalesLine.unit_id, quantity=SalesLine.quantity, dispatched=shipped,
        outstanding=outstanding, allocated=allocated, backorder=outstanding,
        unallocated_outstanding=func.greatest(outstanding - allocated, 0),
        dispatched_deliveries=func.coalesce(sent.c.delivery_count, 0), last_dispatch_at=sent.c.last_dispatch_at,
        customer_id=SalesOrder.customer_id, customer=Customer.name, project_id=SalesOrder.project_id,
        project=Project.name, lpo=Lpo.number, expected_on=SalesOrder.requested_date,
        finding=case((outstanding > 0, 'Outstanding customer demand'), else_=''),
        reason=case((outstanding > 0, 'Original confirmed demand exceeds net recorded dispatch consumption'), else_=''),
    ).items()]).select_from(SalesLine).join(SalesOrder, SalesOrder.id == SalesLine.order_id).join(Customer, Customer.id == SalesOrder.customer_id).outerjoin(Project, Project.id == SalesOrder.project_id).outerjoin(Lpo, Lpo.id == SalesOrder.lpo_id).outerjoin(sent, sent.c.line_id == SalesLine.id).outerjoin(holds, holds.c.line_id == SalesLine.id)
    return Source(q, 'recorded_at', {'customer_id', 'project_id', 'item_id'}, '/sales', 'sales.orders.read')


def purchasing_source(today):
    received = (select(ReceiptLine.order_line_id, func.sum(ReceiptLine.quantity).label('quantity'))
                .join(PurchaseReceipt, PurchaseReceipt.id == ReceiptLine.receipt_id)
                .where(PurchaseReceipt.status == 'POSTED').group_by(ReceiptLine.order_line_id).subquery())
    got = func.coalesce(received.c.quantity, 0)
    outstanding = case((PurchaseOrder.status.in_(['CONFIRMED', 'PARTIALLY_RECEIVED']), OrderLine.quantity - got), else_=0)
    expected = due(PurchaseOrder.id, fallback=PurchaseOrder.expected_on)
    overdue = and_(outstanding > 0, expected < today)
    q = select(*[col(v, k) for k, v in dict(
        row_id=OrderLine.id, record_id=PurchaseOrder.id, reference=PurchaseOrder.code, status=PurchaseOrder.status,
        recorded_at=PurchaseOrder.ordered_on, item_id=OrderLine.item_id, item=OrderLine.description,
        unit=Unit.name, unit_id=Unit.id, quantity=OrderLine.quantity, received=got, outstanding=outstanding,
        supplier_id=PurchaseOrder.supplier_id, supplier=Supplier.name, warehouse_id=PurchaseOrder.warehouse_id,
        expected_on=expected, currency=PurchaseOrder.currency, line_type=OrderLine.line_type,
        finding=case((overdue, 'Overdue supplier receipt'), else_=''),
        reason=case((overdue, 'Open PO quantity remains after the latest recorded expected receipt date'), else_=''),
    ).items()]).select_from(OrderLine).join(PurchaseOrder, PurchaseOrder.id == OrderLine.order_id).join(Supplier, Supplier.id == PurchaseOrder.supplier_id).join(Unit, Unit.id == OrderLine.unit_id).outerjoin(received, received.c.order_line_id == OrderLine.id)
    return Source(q, 'recorded_at', {'supplier_id', 'warehouse_id', 'item_id'}, '/purchasing/orders', 'purchasing.orders.read', True)


def stock_columns():
    source, usable = stock_source()  # Same predicate as the existing dashboard/engine.
    ledger = select(LedgerEffect.balance_id, func.sum(LedgerEffect.quantity_delta).label('quantity')).group_by(LedgerEffect.balance_id).subquery()
    reservations = select(Reservation.balance_id, func.sum(Reservation.quantity).label('quantity')).where(Reservation.status == 'ACTIVE').group_by(Reservation.balance_id).subquery()
    return source.outerjoin(ledger, ledger.c.balance_id == StockBalance.id).outerjoin(reservations, reservations.c.balance_id == StockBalance.id), usable, func.coalesce(ledger.c.quantity, 0), func.coalesce(reservations.c.quantity, 0)


def inventory_source():
    source, usable, ledger, held = stock_columns()
    mismatch = or_(StockBalance.on_hand != ledger, StockBalance.reserved != held, held > ledger)
    blocked = and_(~usable, Location.kind != 'EXTERNAL', StockBalance.on_hand > 0)
    reasons = func.concat_ws('; ', case((StockBalance.on_hand != ledger, 'Signed ledger differs from cached on-hand')),
                             case((StockBalance.reserved != held, 'Active reservations differ from cache')),
                             case((held > ledger, 'Reservations exceed ledger stock')),
                             case((blocked, 'Stock fails the existing allocatable predicate')))
    q = source.with_only_columns(*[col(v, k) for k, v in dict(
        row_id=StockBalance.id, record_id=StockBalance.id, reference=Item.code, status=Location.kind,
        recorded_at=StockBalance.created_at, item_id=Item.id, item=Item.name, unit=Unit.name, unit_id=Unit.id,
        warehouse_id=Warehouse.id, warehouse=Warehouse.name, location_id=Location.id, location=Location.name,
        lot=StockLot.identifier, on_hand=StockBalance.on_hand, reserved=StockBalance.reserved,
        available=case((usable, StockBalance.on_hand - StockBalance.reserved), else_=0),
        ledger=ledger, active_reserved=held,
        nonusable=case((and_(~usable, Location.kind != 'EXTERNAL'), StockBalance.on_hand), else_=0),
        external=case((Location.kind == 'EXTERNAL', StockBalance.on_hand), else_=0),
        finding=case((mismatch, 'Inventory consistency exception'), (blocked, 'Non-usable stock'), else_=''), reason=reasons,
    ).items()]).join(Unit, Unit.id == Item.unit_id)
    return Source(q, None, {'warehouse_id', 'location_id', 'item_id'}, '/inventory-reconciliation', 'inventory.read')


def low_source():
    source, usable = stock_source()
    available = source.with_only_columns(func.coalesce(func.sum(case((usable, StockBalance.on_hand - StockBalance.reserved), else_=0)), 0)).where(
        StockBalance.item_id == StockThreshold.item_id, Location.warehouse_id == StockThreshold.warehouse_id,
        or_(StockThreshold.location_id.is_(None), Location.id == StockThreshold.location_id)).correlate(StockThreshold).scalar_subquery()
    q = select(*[col(v, k) for k, v in dict(
        row_id=StockThreshold.id, record_id=StockThreshold.id, reference=Item.code, status='LOW_STOCK',
        recorded_at=StockThreshold.created_at, item_id=Item.id, item=Item.name, unit=Unit.name, unit_id=Unit.id,
        warehouse_id=Warehouse.id, warehouse=Warehouse.name, location_id=StockThreshold.location_id,
        location=func.coalesce(Location.name, 'Entire warehouse'), minimum=StockThreshold.minimum,
        available=available, finding='Low stock', reason='Allocatable availability over the complete configured threshold scope is below its minimum',
    ).items()]).select_from(StockThreshold).join(Item, Item.id == StockThreshold.item_id).join(Unit, Unit.id == Item.unit_id).join(Warehouse, Warehouse.id == StockThreshold.warehouse_id).outerjoin(Location, Location.id == StockThreshold.location_id).where(available < StockThreshold.minimum)
    return Source(q, None, {'warehouse_id', 'location_id', 'item_id'}, '/inventory/low-stock', 'inventory.read')


def movement_source():
    q = select(*[col(v, k) for k, v in dict(
        row_id=LedgerEffect.id, record_id=StockMovement.id, reference=StockMovement.code, status=StockMovement.status,
        recorded_at=StockMovement.posted_at, item_id=Item.id, item=Item.name, unit=Unit.name, unit_id=Unit.id,
        warehouse_id=Warehouse.id, warehouse=Warehouse.name, location_id=Location.id, location=Location.name,
        quantity=LedgerEffect.quantity_delta, movement_type=StockMovement.kind,
        source_reference=StockMovement.source_reference, finding='', reason='',
    ).items()]).select_from(LedgerEffect).join(MovementLine, MovementLine.id == LedgerEffect.line_id).join(StockMovement, StockMovement.id == MovementLine.movement_id).join(StockBalance, StockBalance.id == LedgerEffect.balance_id).join(Item, Item.id == MovementLine.item_id).join(Unit, Unit.id == MovementLine.unit_id).join(Location, Location.id == StockBalance.location_id).join(Warehouse, Warehouse.id == Location.warehouse_id)
    return Source(q, 'recorded_at', {'warehouse_id', 'location_id', 'item_id'}, '/inventory/movements', 'inventory.read')


def production_source(today):
    own = select(ProductionEvent.stage_id, *[func.sum(case((ProductionEvent.kind == kind, ProductionEvent.quantity), else_=0)).label(kind.lower()) for kind in ['START', 'COMPLETE', 'TRANSFER', 'YARD']]).group_by(ProductionEvent.stage_id).subquery()
    incoming = select(ProductionEvent.destination_stage_id, func.sum(ProductionEvent.quantity).label('quantity')).where(ProductionEvent.kind == 'TRANSFER').group_by(ProductionEvent.destination_stage_id).subquery()
    entered = func.coalesce(own.c.start, 0) + func.coalesce(incoming.c.quantity, 0)
    completed = func.coalesce(own.c.complete, 0)
    yard = func.coalesce(own.c.yard, 0)
    custody = entered - func.coalesce(own.c.transfer, 0) - yard
    expected = due(ProductionStage.id, stage=True, fallback=func.coalesce(ProductionStage.expected_on, ProductionOrder.expected_finish))
    delayed = and_(ProductionOrder.status == 'ACTIVE', completed < ProductionOrder.quantity, expected < today)
    q = select(*[col(v, k) for k, v in dict(
        row_id=func.coalesce(ProductionStage.id, ProductionOrder.id), record_id=ProductionOrder.id,
        reference=ProductionOrder.code, status=ProductionOrder.status, recorded_at=ProductionOrder.created_at,
        item_id=Item.id, item=Item.name, unit=Unit.name, unit_id=Unit.id, ownership=ProductionOrder.ownership,
        quantity=ProductionOrder.quantity, stage=ProductionStage.name, supplier_id=ProductionStage.supplier_id,
        supplier=Supplier.name, location_id=ProductionStage.location_id, location=Location.name,
        warehouse_id=Location.warehouse_id, entered=entered, completed=completed,
        in_process=entered - completed, current_custody=custody, yard_received=yard, expected_on=expected,
        finding=case((delayed, 'Delayed production stage'), else_=''),
        reason=case((delayed, 'Active stage has not completed planned quantity by its latest recorded due date'), else_=''),
    ).items()]).select_from(ProductionOrder).join(Item, Item.id == ProductionOrder.item_id).join(Unit, Unit.id == Item.unit_id).outerjoin(ProductionStage, ProductionStage.order_id == ProductionOrder.id).outerjoin(Supplier, Supplier.id == ProductionStage.supplier_id).outerjoin(Location, Location.id == ProductionStage.location_id).outerjoin(own, own.c.stage_id == ProductionStage.id).outerjoin(incoming, incoming.c.destination_stage_id == ProductionStage.id)
    return Source(q, 'recorded_at', {'supplier_id', 'location_id', 'warehouse_id', 'item_id'}, '/purchasing/production', 'production.read')


def production_event_source():
    destination = aliased(ProductionStage)
    q = select(*[col(v, k) for k, v in dict(
        row_id=ProductionEvent.id, record_id=ProductionOrder.id, reference=ProductionOrder.code,
        status=ProductionEvent.kind, recorded_at=ProductionEvent.created_at,
        item_id=Item.id, item=Item.name, unit=Unit.name, unit_id=Unit.id, ownership=ProductionOrder.ownership,
        stage=ProductionStage.name, destination_stage=destination.name, supplier_id=ProductionStage.supplier_id,
        supplier=Supplier.name, location_id=ProductionStage.location_id, location=Location.name,
        warehouse_id=Location.warehouse_id, quantity=ProductionEvent.quantity,
        movement_id=ProductionEvent.movement_id, receipt_id=ProductionEvent.receipt_id, finding='', reason='',
    ).items()]).select_from(ProductionEvent).join(ProductionStage, ProductionStage.id == ProductionEvent.stage_id).join(ProductionOrder, ProductionOrder.id == ProductionStage.order_id).join(Item, Item.id == ProductionOrder.item_id).join(Unit, Unit.id == Item.unit_id).join(Supplier, Supplier.id == ProductionStage.supplier_id).outerjoin(Location, Location.id == ProductionStage.location_id).outerjoin(destination, destination.id == ProductionEvent.destination_stage_id)
    return Source(q, 'recorded_at', {'supplier_id', 'location_id', 'warehouse_id', 'item_id'}, '/purchasing/production', 'production.read')


def delivery_source():
    assignment = select(DriverAssignment.id).where(DriverAssignment.delivery_id == SalesDelivery.id).order_by(DriverAssignment.revision.desc()).limit(1).correlate(SalesDelivery).scalar_subquery()
    sent = case((SalesDelivery.status == 'DISPATCHED', func.coalesce(SalesConsumption.quantity, 0)), else_=0)
    reversed_qty = case((SalesDelivery.status == 'REVERSED', func.coalesce(SalesConsumption.quantity, 0)), else_=0)
    pending = SalesDelivery.status.in_(['DRAFT', 'PICKED', 'LOADED'])
    q = select(*[col(v, k) for k, v in dict(
        row_id=SalesDeliveryLine.id, record_id=SalesDelivery.id, reference=SalesDelivery.code,
        status=SalesDelivery.status, recorded_at=SalesDelivery.created_at,
        item_id=SalesLine.item_id, item=SalesLine.item_name, unit=SalesLine.unit_name, unit_id=SalesLine.unit_id,
        quantity=SalesDeliveryLine.quantity, picked=SalesDeliveryLine.picked_quantity,
        loaded=SalesDeliveryLine.loaded_quantity, dispatched=sent, reversed_quantity=reversed_qty,
        partial=and_(SalesDelivery.status == 'DISPATCHED', sent < SalesDeliveryLine.quantity),
        dispatched_at=SalesDelivery.dispatched_at, reversed_at=SalesDelivery.reversed_at,
        order_reference=SalesOrder.code, customer_id=SalesOrder.customer_id, customer=Customer.name,
        project_id=SalesOrder.project_id, project=Project.name, lpo=Lpo.number,
        warehouse_id=SalesDelivery.warehouse_id, driver_assignment_id=assignment, consumption_movement_id=SalesConsumption.movement_id,
        finding=case((pending, 'Pending delivery'), else_=''),
        reason=case((pending, 'Preparation is recorded but physical dispatch has not been posted'), else_=''),
    ).items()]).select_from(SalesDeliveryLine).join(SalesDelivery, SalesDelivery.id == SalesDeliveryLine.delivery_id).join(SalesAllocation, SalesAllocation.id == SalesDeliveryLine.allocation_id).join(SalesLine, SalesLine.id == SalesAllocation.line_id).join(SalesOrder, SalesOrder.id == SalesDelivery.order_id).join(Customer, Customer.id == SalesOrder.customer_id).outerjoin(Project, Project.id == SalesOrder.project_id).outerjoin(Lpo, Lpo.id == SalesOrder.lpo_id).outerjoin(SalesConsumption, SalesConsumption.delivery_line_id == SalesDeliveryLine.id)
    return Source(q, 'recorded_at', {'customer_id', 'project_id', 'warehouse_id', 'item_id'}, '/sales', 'sales.deliveries.read')


def packing_source():
    q = select(*[col(v, k) for k, v in dict(
        row_id=PackingDocument.id, record_id=SalesDelivery.id, reference=PackingDocument.code,
        status=func.coalesce(DocumentEvent.kind, 'ISSUED'), recorded_at=PackingDocument.created_at,
        revision=PackingDocument.revision, document_kind=PackingDocument.kind, delivery_reference=SalesDelivery.code,
        delivery_status=SalesDelivery.status, customer_id=SalesOrder.customer_id, customer=Customer.name,
        project_id=SalesOrder.project_id, project=Project.name, warehouse_id=SalesDelivery.warehouse_id,
        previous_document_id=PackingDocument.previous_id, replacement_document_id=DocumentEvent.replacement_id,
        finding='', reason='',
    ).items()]).select_from(PackingDocument).join(SalesDelivery, SalesDelivery.id == PackingDocument.delivery_id).join(SalesOrder, SalesOrder.id == SalesDelivery.order_id).join(Customer, Customer.id == SalesOrder.customer_id).outerjoin(Project, Project.id == SalesOrder.project_id).outerjoin(DocumentEvent, DocumentEvent.document_id == PackingDocument.id)
    return Source(q, 'recorded_at', {'customer_id', 'project_id', 'warehouse_id'}, '/packing', 'packing.read')


EXCEPTION_SOURCES = ['sales', 'purchasing', 'inventory', 'low_stock', 'production', 'deliveries']


def source(category, today):
    return {'sales': sales_source, 'purchasing': lambda: purchasing_source(today),
            'inventory': inventory_source, 'low_stock': low_source, 'movements': movement_source,
            'production': lambda: production_source(today), 'production_events': production_event_source,
            'deliveries': delivery_source, 'packing': packing_source}[category]()


def scope(source, filters):
    q = source.query.subquery()
    query = select(q)
    for field in ['customer_id', 'project_id', 'item_id', 'supplier_id', 'location_id', 'warehouse_id']:
        value = getattr(filters, field)
        if value is not None:
            if field not in source.filters:
                fail('UNSUPPORTED_FILTER', f'{field} is not supported for this report')
            # Warehouse-wide thresholds retain their complete scope and remain relevant to a location filter.
            condition = q.c[field] == value
            if field == 'location_id' and filters.category == 'low_stock':
                warehouse = select(Location.warehouse_id).where(Location.id == value).scalar_subquery()
                condition = or_(condition, and_(q.c.location_id.is_(None), q.c.warehouse_id == warehouse))
            query = query.where(condition)
    if filters.since or filters.until:
        if not source.date_column:
            fail('UNSUPPORTED_FILTER', 'Current stock snapshots do not support historical date filtering; use ledger movements')
        for value, lower in [(filters.since, True), (filters.until, False)]:
            if value:
                boundary = value if lower else value + timedelta(days=1)
                if not source.date_only:
                    boundary = datetime.combine(boundary, day_time(), ZoneInfo(TIMEZONE)).astimezone(UTC)
                query = query.where(q.c[source.date_column] >= boundary if lower else q.c[source.date_column] < boundary)
    if filters.status:
        query = query.where(q.c.status == filters.status)
    if filters.search:
        term = '%' + filters.search.replace('\\', '\\\\').replace('%', '\\%').replace('_', '\\_') + '%'
        query = query.where(q.c.reference.ilike(term, escape='\\'))
    return query


def options(permissions):
    return [dict(key=c, label=c.replace('_', ' ').title(), definition=DEFINITIONS[c],
                 filters=sorted(source(c, utcnow().astimezone(ZoneInfo(TIMEZONE)).date()).filters | {'since', 'until'} - (set() if c not in {'inventory', 'low_stock'} else {'since', 'until'})))
            for c in PERMISSIONS if allowed(c, permissions)] + ([dict(key='exceptions', label='Exception center', definition=DEFINITIONS['exceptions'], filters=['item_id'])] if allowed('exceptions', permissions) else [])


def choices(db, permissions, category, field, search):
    require_snapshot(db)
    authorize(category, permissions)
    models = {'customer_id': Customer, 'project_id': Project, 'item_id': Item,
              'supplier_id': Supplier, 'warehouse_id': Warehouse, 'location_id': Location}
    if field not in models:
        fail('UNSUPPORTED_FILTER', 'Unsupported report selector')
    today = utcnow().astimezone(ZoneInfo(TIMEZONE)).date()
    categories = [c for c in EXCEPTION_SOURCES if allowed(c, permissions)] if category == 'exceptions' else [category]
    ids = []
    for c in categories:
        src = source(c, today)
        if field not in src.filters or category == 'exceptions' and field != 'item_id':
            fail('UNSUPPORTED_FILTER', 'This selector is not supported for the report')
        q = src.query.subquery()
        ids.append(select(q.c[field].label('id')))
    model = models[field]
    query = select(model.id, model.name, model.code).where(model.id.in_(union_all(*ids)))
    if search:
        term = '%' + search.replace('\\', '\\\\').replace('%', '\\%').replace('_', '\\_') + '%'
        query = query.where(or_(model.name.ilike(term, escape='\\'), model.code.ilike(term, escape='\\')))
    return [dict(id=str(i), name=n, code=c) for i, n, c in Budget(db).execute(query.order_by(model.name, model.id).limit(25))]


class Budget:
    def __init__(self, db):
        self.db, self.deadline = db, time.monotonic() + 8

    def execute(self, query):
        remaining = int((self.deadline - time.monotonic()) * 1000)
        if remaining <= 0:
            fail('REPORT_TIMEOUT', 'Report budget exceeded; narrow the filters', 503)
        self.db.execute(select(func.set_config('statement_timeout', str(min(5000, remaining)), True)))
        return self.db.execute(query)


def report(db, permissions, filters, *, export=False):
    require_snapshot(db)
    authorize(filters.category, permissions)
    generated = utcnow()
    today = generated.astimezone(ZoneInfo(TIMEZONE)).date()
    budget = Budget(db)
    if filters.category == 'exceptions':
        if any(getattr(filters, f) for f in ['customer_id', 'project_id', 'warehouse_id', 'location_id', 'supplier_id', 'since', 'until', 'status', 'search']):
            fail('UNSUPPORTED_FILTER', 'The combined exception center supports the item filter only; use a source report for other filters')
        sources = []
        for c in EXCEPTION_SOURCES:
            if not allowed(c, permissions):
                continue
            src = source(c, today)
            sub = scope(src, filters).subquery()
            sources.append(select(literal(c).label('category'), cast(sub.c.row_id, String).label('row_id'), cast(sub.c.record_id, String).label('record_id'), sub.c.reference, sub.c.status,
                                  cast(sub.c.recorded_at, String).label('recorded_at'), cast(sub.c.item_id, String).label('item_id'), sub.c.item, sub.c.unit, sub.c.finding, sub.c.reason).where(sub.c.finding != ''))
        query = select(union_all(*sources).subquery())
        src = None
    else:
        src = source(filters.category, today)
        query = scope(src, filters)
    scoped = query.subquery()
    total = budget.execute(select(func.count()).select_from(scoped)).scalar_one()
    if export and total > EXPORT_LIMIT:
        fail('REPORT_EXPORT_LIMIT', 'Export at most 1,000 rows; narrow the filters before exporting')
    if export and filters.page != 1:
        fail('REPORT_EXPORT_PAGE', 'Export covers the complete bounded filtered report; select page 1')
    # Status counts count unique source documents, not lines/stages. A document
    # containing multiple lines appears once. Exceptions deliberately count findings.
    identity = scoped.c.row_id if filters.category in {'exceptions', 'packing', 'production_events'} else scoped.c.record_id
    statuses = [dict(status=status, count=str(count)) for status, count in budget.execute(select(scoped.c.status, func.count(func.distinct(identity))).group_by(scoped.c.status).order_by(scoped.c.status))]
    movement_totals = []
    if filters.category == 'movements':
        # Unit identity, not merely its editable display name, defines a group.
        movement_totals = [dict(movement_type=k, unit_id=str(i), unit=u, quantity=str(q), effects=str(n))
                           for k, i, u, q, n in budget.execute(select(scoped.c.movement_type, scoped.c.unit_id, scoped.c.unit,
                            func.sum(scoped.c.quantity), func.count()).group_by(scoped.c.movement_type, scoped.c.unit_id, scoped.c.unit)
                            .order_by(scoped.c.movement_type, scoped.c.unit_id).limit(1001))]
        if len(movement_totals) > 1000:
            fail('REPORT_GROUP_LIMIT', 'Narrow the report to at most 1,000 movement/unit groups')
    limit, offset = (EXPORT_LIMIT, 0) if export else (PAGE_SIZE, (filters.page - 1) * PAGE_SIZE)
    rows = []
    ordering = [scoped.c.recorded_at.desc().nullslast(), scoped.c.row_id]
    if filters.category == 'exceptions':
        ordering.append(scoped.c.category)
    for mapping in budget.execute(select(scoped).order_by(*ordering).offset(offset).limit(limit)).mappings():
        row = {k: str(v) if isinstance(v, Decimal) else v.isoformat() if hasattr(v, 'isoformat') else str(v) if k.endswith('_id') and v is not None else v for k, v in mapping.items()}
        c = row.get('category', filters.category)
        link = source(c, today) if src is None else src
        if link.link_permission in permissions:
            row['href'] = link.href + (('/' + row['record_id']) if c in {'purchasing', 'production', 'production_events'} else ('?delivery=' + row['record_id']) if c == 'packing' else ('?item=' + str(row.get('item_id'))) if c == 'inventory' else '')
        if row.get('item_id') and {'items.trace.read', 'items.trace.company'} <= permissions:
            row['journey_href'] = '/item-journey?item=' + row['item_id']
        rows.append(row)
    return dict(category=filters.category, definition=DEFINITIONS[filters.category], timezone=TIMEZONE,
                generated_at=generated.isoformat(), filters=filters.model_dump(mode='json'),
                items=rows, total=total, page=filters.page, page_size=PAGE_SIZE, statuses=statuses,
                movement_totals=movement_totals,
                export_limit=EXPORT_LIMIT, business_changes=0,
                note='Read-only point-in-time evidence. Different units/stages are never combined. New requests obtain new snapshots. Dispatch does not establish customer-signed receipt. No financial amounts are calculated.')


def safe_cell(value):
    value = '' if value is None else str(value)
    # Strip/control-prefix checks precede the first non-whitespace character.
    # Also protects metadata headers and arbitrary source/reference/unit labels.
    probe = value
    while probe and (probe[0].isspace() or unicodedata.category(probe[0]).startswith('C')):
        probe = probe[1:]
    if probe.startswith(('=', '+', '-', '@')) or value.startswith(('\t', '\r', '\n')):
        return "'" + value
    return value


def export_csv(result):
    output = io.StringIO(newline='')
    writer = csv.writer(output, lineterminator='\r\n')
    writer.writerow(['AMBS operational report', safe_cell(result['category'])])
    writer.writerow(['Generated at UTC', result['generated_at'], 'Reporting timezone', result['timezone']])
    writer.writerow(['Definition', safe_cell(result['definition'])])
    writer.writerow(['Filters'] + [safe_cell(k + '=' + str(v)) for k, v in result['filters'].items() if v not in (None, '', 1)])
    writer.writerow(['Read only', 'No business changes; no customer-signed receipt or financial performance inferred. Decimal quantities are spreadsheet text to preserve precision.'])
    fields = sorted({k for row in result['items'] for k in row if not k.endswith('_href') and k != 'href'})
    writer.writerow(fields or ['No matching records'])
    quantities = {'quantity', 'received', 'outstanding', 'allocated', 'backorder', 'unallocated_outstanding',
                  'dispatched', 'picked', 'loaded', 'reversed_quantity', 'on_hand', 'reserved', 'available',
                  'ledger', 'active_reserved', 'nonusable', 'external', 'minimum', 'entered', 'completed',
                  'in_process', 'current_custody', 'yard_received'}
    for row in result['items']:
        # CSV quoting alone does not stop spreadsheets rounding a 20-digit
        # decimal. Export quantity fields as inert exact text, including positive
        # numbers; never use a formula to force their display.
        writer.writerow(["'" + str(row[f]) if f in quantities and row.get(f) is not None else safe_cell(row.get(f)) for f in fields])
    return '\ufeff' + output.getvalue()
