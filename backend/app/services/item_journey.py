"""Read model over existing stock, reservation and preparation records. No event writes."""
from sqlalchemy import select
from app.models.inventory import LedgerEffect, MovementLine, StockMovement, StockBalance, Reservation, StockLot, Location, StockCount, CountLine
from app.models.sales import SalesDelivery, SalesDeliveryLine, SalesAllocation, SalesReservationLink, SalesLine
from app.models.master import Item, Unit
from app.models.security import User
from app.models.purchasing import ProductionEvent, ProductionStage, ProductionOrder, PurchaseReceipt
from app.services.master import get_record
from app.services import inventory as inv


def journey(db, ctx, delivery, item_id, lot_id=None, page=1):
    inv.authorize(db,ctx,'items.trace.read')
    inv.lock_inventory(db)
    scope = list(db.execute(select(SalesDeliveryLine,SalesLine).join(SalesAllocation,SalesAllocation.id==SalesDeliveryLine.allocation_id)
        .join(SalesLine,SalesLine.id==SalesAllocation.line_id).where(SalesDeliveryLine.delivery_id==delivery.id,SalesLine.item_id==item_id)))
    if not scope:
        inv.fail('ITEM_NOT_ON_DELIVERY','This item is not part of the selected delivery',404)
    if lot_id:
        lot=get_record(db,StockLot,lot_id)
        if lot.item_id!=item_id:
            inv.fail('LOT_ITEM_MISMATCH','Select a lot/serial for this item',422)
    item=get_record(db,Item,item_id)
    unit=get_record(db,Unit,item.unit_id)
    events=[]
    def event(kind,time,actor,quantity,location,reference,source,lot=None,links=None):
        if time is None:
            return
        events.append(dict(kind=kind,timestamp=time.isoformat(),actor=get_record(db,User,actor).display_name if actor else None,
            quantity=str(quantity),unit=unit.name,location=get_record(db,Location,location).name if location else None,
            location_id=str(location) if location else None,reference=reference,source=source,
            lot_id=str(lot) if lot else None,links=links or {}))
    allocation_ids=[l.allocation_id for l,_ in scope]
    reservations=list(db.scalars(select(Reservation).join(SalesReservationLink,SalesReservationLink.reservation_id==Reservation.id).where(SalesReservationLink.allocation_id.in_(allocation_ids))))
    allowed_balances={r.balance_id for r in reservations}
    allowed_lots={get_record(db,StockBalance,r.balance_id).lot_id for r in reservations}
    if lot_id and lot_id not in allowed_lots:
        inv.fail('LOT_NOT_ON_DELIVERY','This lot/serial was not allocated to this delivery',404)
    global_read='items.trace.company' in ctx.permissions
    query=select(LedgerEffect,MovementLine,StockMovement,StockBalance).join(MovementLine,MovementLine.id==LedgerEffect.line_id).join(StockMovement,StockMovement.id==MovementLine.movement_id).join(StockBalance,StockBalance.id==LedgerEffect.balance_id).where(MovementLine.item_id==item_id)
    if lot_id:
        query=query.where(MovementLine.lot_id==lot_id)
    elif not global_read:
        query=query.where(StockBalance.id.in_(allowed_balances))
    for effect,line,movement,balance in db.execute(query):
        # Packing sees this delivery's holds/preparation/dispatch only, never company history.
        if not global_read and movement.source_reference!=delivery.code:
            continue
        kind={'RECEIPT':'Received','PURCHASE_RECEIPT':'Received','TRANSFER':'Moved','CUSTODY_TRANSFER':'Custody transfer',
            'PRODUCTION_INPUT':'Sent for processing','PRODUCTION_OUTPUT':'Processing output','RETURN':'Returned to quarantine',
            'COUNT_ADJUSTMENT':'Stock count adjustment','REVERSAL':'Reversed'}.get(movement.kind,movement.kind.replace('_',' ').title())
        if movement.kind=='ISSUE' and movement.source_reference:
            kind='Dispatched' if movement.source_reference.startswith('DLV-') else 'Issued'
        links=dict(movement_id=str(movement.id),source_reference=movement.source_reference)
        receipt=db.scalar(select(PurchaseReceipt).where(PurchaseReceipt.movement_id==movement.id))
        if receipt:
            links.update(receipt_id=str(receipt.id),purchase_order_id=str(receipt.order_id))
        production=db.scalar(select(ProductionEvent).where(ProductionEvent.movement_id==movement.id))
        if production:
            stage=get_record(db,ProductionStage,production.stage_id)
            production_order=get_record(db,ProductionOrder,stage.order_id)
            links.update(production_order_id=str(production_order.id),production_code=production_order.code,supplier_id=str(stage.supplier_id))
            if production.kind=='YARD':
                kind='Returned from supplier'
        event(kind,movement.posted_at,movement.posted_by,effect.quantity_delta,balance.location_id,movement.code,'stock_ledger_effects',line.lot_id,links)
    query=select(Reservation).join(StockBalance,StockBalance.id==Reservation.balance_id).where(StockBalance.item_id==item_id)
    if lot_id:
        query=query.where(StockBalance.lot_id==lot_id)
    if not global_read:
        query=query.where(Reservation.id.in_([r.id for r in reservations]))
    for reservation in db.scalars(query):
        balance=get_record(db,StockBalance,reservation.balance_id)
        links=dict(reservation_id=str(reservation.id),source_reference=reservation.source_reference)
        event('Reserved',reservation.created_at,reservation.created_by,reservation.quantity,balance.location_id,reservation.code,'stock_reservations',balance.lot_id,links)
        if reservation.status in ('RELEASED','CANCELLED'):
            # The reservation creator is not necessarily the closing actor; do not invent one.
            event('Reservation '+reservation.status.lower(),reservation.released_at,None,reservation.quantity,balance.location_id,reservation.code,'stock_reservations',balance.lot_id,links)
    query=select(SalesDeliveryLine,SalesDelivery).join(SalesAllocation,SalesAllocation.id==SalesDeliveryLine.allocation_id).join(SalesLine,SalesLine.id==SalesAllocation.line_id).join(SalesDelivery,SalesDelivery.id==SalesDeliveryLine.delivery_id).where(SalesLine.item_id==item_id)
    if not global_read:
        query=query.where(SalesDelivery.id==delivery.id)
    for line,d in db.execute(query):
        linked=db.scalar(select(StockBalance).join(Reservation,Reservation.balance_id==StockBalance.id).join(SalesReservationLink,SalesReservationLink.reservation_id==Reservation.id).where(SalesReservationLink.allocation_id==line.allocation_id))
        if not linked or (lot_id and linked.lot_id!=lot_id):
            continue
        links=dict(delivery_id=str(d.id),order_id=str(d.order_id))
        event('Picked',d.picked_at,d.picked_by,line.picked_quantity,linked.location_id,d.code,'sales_deliveries',linked.lot_id,links)
        event('Loaded',d.loaded_at,d.loaded_by,line.loaded_quantity,linked.location_id,d.code,'sales_deliveries',linked.lot_id,links)
    if global_read:
        query=select(CountLine,StockCount,StockBalance).join(StockCount,StockCount.id==CountLine.count_id).join(StockBalance,StockBalance.id==CountLine.balance_id).where(StockBalance.item_id==item_id,StockCount.status=='POSTED')
        if lot_id:
            query=query.where(StockBalance.lot_id==lot_id)
        for line,count,balance in db.execute(query):
            event('Physically counted',count.posted_at,count.posted_by,line.counted_quantity,balance.location_id,count.code,'inventory_count_lines',balance.lot_id,dict(count_id=str(count.id)))
        query=select(ProductionEvent,ProductionStage,ProductionOrder).join(ProductionStage,ProductionStage.id==ProductionEvent.stage_id).join(ProductionOrder,ProductionOrder.id==ProductionStage.order_id).where(ProductionOrder.item_id==item_id,ProductionEvent.movement_id.is_(None))
        if lot_id:
            query=query.where(ProductionEvent.lot_id==lot_id)
        for e,stage,production in db.execute(query):
            event('Supplier-owned production '+e.kind.lower()+' (not owned stock)',e.created_at,e.actor_id,e.quantity,stage.location_id,production.code,'production_events',e.lot_id,dict(production_order_id=str(production.id),supplier_id=str(stage.supplier_id),receipt_id=str(e.receipt_id) if e.receipt_id else None))
    # References remain separate from physical ledger events and obey each domain's RBAC.
    document_refs, plan_refs = [], []
    from app.models.packing import PackingDocument, MaterialPlan, MaterialPlanLine
    if 'packing.read' in ctx.permissions:
        from app.services.packing import delivery_query
        eligible = delivery_query(ctx).with_only_columns(SalesDelivery.id)
        query = select(PackingDocument).where(PackingDocument.delivery_id.in_(eligible), PackingDocument.snapshot['lines'].contains([{'item_id':str(item_id)}]))
        if not global_read: query=query.where(PackingDocument.delivery_id==delivery.id)
        document_refs=[dict(id=str(r.id),code=r.code,revision=r.revision,delivery_id=str(r.delivery_id)) for r in db.scalars(query.order_by(PackingDocument.created_at.desc()).limit(100))]
    if 'material_plans.read' in ctx.permissions:
        query=select(MaterialPlan).where(MaterialPlan.id.in_(select(MaterialPlanLine.plan_id).where(MaterialPlanLine.item_id==item_id)) | MaterialPlan.source_snapshot['demands'].contains([{'item_id':str(item_id)}]))
        if not global_read: query=query.where(MaterialPlan.sales_order_id==delivery.order_id)
        plan_refs=[dict(id=str(r.id),code=r.code,status=r.status) for r in db.scalars(query.order_by(MaterialPlan.created_at.desc()).limit(100))]
    events.sort(key=lambda e:(e['timestamp'],e['source'],e['reference'],e['kind'],e['location_id'] or ''))
    start=(page-1)*100
    return dict(item_id=str(item.id),item_name=item.name,tracking=inv.tracking(db,item.id),
        identity_note='Individual serial journey' if inv.tracking(db,item.id)=='SERIAL' and lot_id else 'Quantity/lot history; individual-piece identity is not established',
        document_references=document_refs,material_plan_references=plan_refs,scope='Company item history' if global_read else 'Selected delivery only',items=events[start:start+100],total=len(events),page=page,page_size=100)
