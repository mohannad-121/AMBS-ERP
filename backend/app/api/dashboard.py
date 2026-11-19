"""Bounded, permission-filtered operational reads. No business mutations or costs."""

from datetime import date
from zoneinfo import ZoneInfo
from fastapi import APIRouter, Depends, Request
from sqlalchemy import and_, case, func, or_, select
from sqlalchemy.orm import Session
from app.core.security import require_permission, utcnow
from app.db.session import get_session
from app.models.master import Customer, Project, Item, Unit
from app.models.inventory import StockBalance, StockLot, StockThreshold, Location, Warehouse
from app.models.purchasing import PurchaseOrder, ProductionOrder
from app.models.sales import SalesOrder, SalesLine, SalesAllocation, SalesConsumption, SalesDelivery, SalesDeliveryLine
from app.models.security import AuditEvent
from app.services.review_snapshot import review_request, require_snapshot, DASHBOARD_SLOTS
from app.services.schedule_dates import due, TIMEZONE

router = APIRouter(prefix="/dashboard", tags=["Operational dashboard"])


def stock_source():
    # SQL equivalent of inventory.allocatable; covered against the stock engine.
    usable = and_(Item.is_active, Location.is_active, Warehouse.is_active,
                  Location.kind == "USABLE", or_(StockLot.id.is_(None),
                  and_(StockLot.is_active, StockLot.status == "ACTIVE")))
    source = (select(StockBalance).join(Item, Item.id == StockBalance.item_id)
              .join(Location, Location.id == StockBalance.location_id)
              .join(Warehouse, Warehouse.id == Location.warehouse_id)
              .outerjoin(StockLot, StockLot.id == StockBalance.lot_id))
    return source, usable


@router.get("")
def summary(request: Request, ctx=Depends(require_permission("system.read")), db: Session = Depends(get_session)):
    with review_request(db, ctx, request, slots=DASHBOARD_SLOTS) as snapshot:
        result = project_summary(ctx, snapshot)
    db.commit()
    return result


def project_summary(ctx, db):
    require_snapshot(db)
    permissions = ctx.permissions
    generated = utcnow()
    result = {"cards": [], "queues": [], "as_of": generated.isoformat()}
    today = generated.astimezone(ZoneInfo(TIMEZONE)).date()

    def card(key, label, model, condition, href, note):
        value = db.scalar(select(func.count()).select_from(model).where(condition))
        result["cards"].append(dict(key=key, label=label, value=str(value), href=href, note=note))

    def queue(label, model, condition, href):
        rows = db.scalars(select(model).where(condition).order_by(model.created_at.desc(), model.id).limit(5))
        result["queues"].append({"label": label, "href": href, "items": [
            {"id": str(r.id), "code": r.code, "status": r.status} for r in rows]})

    if "sales.orders.read" in permissions:
        active = SalesOrder.status.in_(["CONFIRMED", "PARTIALLY_DISPATCHED"])
        card("orders", "Orders to fulfill", SalesOrder, active, "/sales", "Confirmed & partially dispatched")
        queue("Orders awaiting fulfillment", SalesOrder, active, "/sales")
        shipped = (select(SalesAllocation.line_id.label("line_id"), func.sum(SalesConsumption.quantity).label("qty"))
                   .select_from(SalesConsumption).join(SalesDeliveryLine, SalesDeliveryLine.id == SalesConsumption.delivery_line_id)
                   .join(SalesAllocation, SalesAllocation.id == SalesDeliveryLine.allocation_id)
                   .join(SalesDelivery, SalesDelivery.id == SalesDeliveryLine.delivery_id)
                   .where(SalesDelivery.status == "DISPATCHED").group_by(SalesAllocation.line_id).subquery())
        demand = (select(Unit.name, Unit.decimal_places,
                         func.sum(SalesLine.quantity - func.coalesce(shipped.c.qty, 0)))
                  .select_from(SalesLine).join(SalesOrder, SalesOrder.id == SalesLine.order_id)
                  .join(Unit, Unit.id == SalesLine.unit_id).outerjoin(shipped, shipped.c.line_id == SalesLine.id)
                  .where(active).group_by(Unit.id).order_by(Unit.name, Unit.id))
        result["demand"] = [{"unit": n, "precision": p, "quantity": str(q)} for n, p, q in db.execute(demand)]
    if "sales.deliveries.read" in permissions or "deliveries.trip.own" in permissions:
        pending = SalesDelivery.status.in_(["DRAFT", "PICKED", "LOADED"])
        scope = True if "sales.deliveries.read" in permissions else SalesDelivery.driver_id == ctx.user.id
        card("deliveries", "Pending deliveries" if scope is True else "My pending deliveries", SalesDelivery,
             and_(pending, scope), "/sales", "Draft, picked or loaded")
        queue("Delivery preparation" if scope is True else "My assignments", SalesDelivery,
              and_(pending if scope is True else SalesDelivery.status.not_in(["CANCELLED", "REVERSED"]), scope), "/sales")
    if "purchasing.orders.read" in permissions:
        active = PurchaseOrder.status.in_(["CONFIRMED", "PARTIALLY_RECEIVED"])
        card("purchases", "Open purchase orders", PurchaseOrder, active, "/purchasing/outstanding", "Awaiting full supplier receipt")
        queue("Overdue supplier receipts", PurchaseOrder,
              and_(active, due(PurchaseOrder.id, fallback=PurchaseOrder.expected_on) < today), "/purchasing/outstanding")
    if "production.read" in permissions:
        card("production", "Active production", ProductionOrder, ProductionOrder.status == "ACTIVE",
             "/purchasing/production", "Outsourced work in progress")
        queue("Overdue production", ProductionOrder,
              and_(ProductionOrder.status == "ACTIVE", ProductionOrder.expected_finish < date.today()), "/purchasing/production")
    if "inventory.read" in permissions:
        source, usable = stock_source()
        scoped = source.with_only_columns(func.coalesce(func.sum(case((usable, StockBalance.on_hand - StockBalance.reserved), else_=0)), 0)).where(
            StockBalance.item_id == StockThreshold.item_id, Location.warehouse_id == StockThreshold.warehouse_id,
            or_(StockThreshold.location_id.is_(None), Location.id == StockThreshold.location_id)).correlate(StockThreshold).scalar_subquery()
        low = db.scalar(select(func.count(func.distinct(StockThreshold.item_id))).where(scoped < StockThreshold.minimum))
        result["cards"].append(dict(key="low", label="Low-stock items", value=str(low), href="/inventory/low-stock", note="Below a configured scope minimum"))
        columns = [func.sum(StockBalance.on_hand), func.sum(StockBalance.reserved),
                   func.sum(case((usable, StockBalance.on_hand - StockBalance.reserved), else_=0)),
                   func.sum(case((and_(~usable, Location.kind != "EXTERNAL"), StockBalance.on_hand), else_=0)),
                   func.sum(case((Location.kind == "EXTERNAL", StockBalance.on_hand), else_=0))]
        inventory = source.with_only_columns(Unit.name, Unit.decimal_places, *columns).join(Unit, Unit.id == Item.unit_id).group_by(Unit.id).order_by(Unit.name, Unit.id)
        result["inventory"] = [{"unit": r[0], "precision": r[1], **{k: str(v or 0) for k, v in zip(
            ["on_hand", "reserved", "available", "nonusable", "external"], r[2:])}} for r in db.execute(inventory)]
    for permission, key, label, model, href in [
        ("customers.read", "customers", "Active customers", Customer, "/master/customers"),
        ("projects.read", "projects", "Active projects", Project, "/master/projects"),
    ]:
        if permission in permissions:
            card(key, label, model, model.is_active, href, "Active business records")
    if "audit.read" in permissions:
        result["activity"] = [{"id": str(r.id), "action": r.action, "actor": r.actor_username,
                               "at": r.occurred_at.isoformat()} for r in db.scalars(
            select(AuditEvent).order_by(AuditEvent.occurred_at.desc(), AuditEvent.id).limit(6))]
    return result
