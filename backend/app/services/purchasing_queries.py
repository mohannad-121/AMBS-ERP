from collections import defaultdict
from decimal import Decimal, getcontext
from sqlalchemy import select
from app.models.purchasing import (
    PurchaseOrder,
    PurchaseRequest,
    PurchaseReceipt,
    Quotation,
    OrderLine,
    ProductionOrder,
    ProductionEvent,
    ProductionStage,
)
from app.models.master import Item, Unit
from app.models.inventory import Location
from app.services.master import output, get_record
from app.services import purchasing as service


def supply(db, warehouse_id=None, item_ids=None, location_id=None):
    if location_id:
        return []  # A purchase obligation has a warehouse, not an invented receiving bin.
    units = defaultdict(Decimal)
    for line, order in db.execute(
        select(OrderLine, PurchaseOrder)
        .join(PurchaseOrder, PurchaseOrder.id == OrderLine.order_id)
        .where(
            PurchaseOrder.status.in_(["CONFIRMED", "PARTIALLY_RECEIVED"]),
            OrderLine.item_id.is_not(None),
        )
    ):
        if warehouse_id and order.warehouse_id != warehouse_id:
            continue
        if item_ids is not None and str(line.item_id) not in item_ids:
            continue
        units[line.unit_id] += line.quantity - service.received(db, line.id)
    return [
        {
            "unit_id": str(key),
            "unit_name": get_record(db, Unit, key).name,
            "quantity": str(value),
        }
        for key, value in units.items()
    ]


def external_work(db, warehouse_id=None, item_ids=None, location_id=None):
    units = defaultdict(Decimal)
    for order in db.scalars(
        select(ProductionOrder).where(ProductionOrder.status == "ACTIVE")
    ):
        if item_ids is not None and str(order.item_id) not in item_ids:
            continue
        for stage in db.scalars(
            select(ProductionStage).where(ProductionStage.order_id == order.id)
        ):
            if location_id and stage.location_id != location_id:
                continue
            if warehouse_id:
                if stage.location_id:
                    if (
                        get_record(db, Location, stage.location_id).warehouse_id
                        != warehouse_id
                    ):
                        continue
                elif (
                    not order.purchase_order_line_id
                    or get_record(
                        db,
                        PurchaseOrder,
                        get_record(
                            db, OrderLine, order.purchase_order_line_id
                        ).order_id,
                    ).warehouse_id
                    != warehouse_id
                ):
                    continue
            item = get_record(db, Item, order.item_id)
            units[(item.unit_id, order.ownership)] += service.flow(db, stage)[
                "current_custody"
            ]
    return [
        {
            "unit_id": str(unit),
            "unit_name": get_record(db, Unit, unit).name,
            "ownership": ownership,
            "quantity": str(value),
        }
        for (unit, ownership), value in units.items()
        if value
    ]


def dashboard(db):
    getcontext().prec = 60
    orders = [
        service.document_view(db, "orders", r)
        for r in db.scalars(
            select(PurchaseOrder).where(
                PurchaseOrder.status.in_(["CONFIRMED", "PARTIALLY_RECEIVED"])
            )
        )
    ]
    production = [
        service.production_view(db, r)
        for r in db.scalars(
            select(ProductionOrder).where(
                ProductionOrder.status.in_(["DRAFT", "ACTIVE"])
            )
        )
    ]
    commitments = defaultdict(Decimal)
    for row in orders:
        for line in row["lines"]:
            if line["unit_price"] is not None:
                commitments[row["currency"]] += Decimal(line["outstanding"]) * Decimal(
                    line["unit_price"]
                )
    quotes = [
        {
            **output(q),
            "supplier_name": service.get_record(
                db, service.Supplier, q.supplier_id
            ).name,
        }
        for q in db.scalars(
            select(Quotation)
            .where(Quotation.status == "ISSUED")
            .order_by(Quotation.quoted_on.desc())
            .limit(20)
        )
    ]
    stage_rows = [
        {
            "production_id": r["id"],
            "production_code": r["code"],
            "item_name": r["item_name"],
            "unit_name": r["unit_name"],
            "ownership": r["ownership"],
            **s,
        }
        for r in production
        for s in r["stages"]
    ]
    return {
        "open_requests": len(
            db.scalars(
                select(PurchaseRequest.id).where(
                    PurchaseRequest.status.in_(["DRAFT", "SUBMITTED"])
                )
            ).all()
        ),
        "open_orders": len(orders),
        "partially_received": sum(r["status"] == "PARTIALLY_RECEIVED" for r in orders),
        "overdue_orders": [r for r in orders if r["delivery_status"] == "Delayed"],
        "outstanding": orders,
        "incoming": supply(db),
        "recent_receipts": [
            service.receipt_view(db, r)
            for r in db.scalars(
                select(PurchaseReceipt)
                .order_by(PurchaseReceipt.created_at.desc())
                .limit(10)
            )
        ],
        "recent_quotations": quotes,
        "expiring_quotations": [
            q
            for q in quotes
            if q["valid_until"]
            and q["valid_until"]
            <= (service.business_today() + service.timedelta(days=30)).isoformat()
        ],
        "commitments": [
            {
                "currency": currency,
                "amount": str(value),
                "basis": "Outstanding line commitments; freight/taxes/fees separate, not inventory value or invoices",
            }
            for currency, value in commitments.items()
        ],
        "active_production": len(production),
        "production_orders": production,
        "stages": stage_rows,
        "delayed_stages": [s for s in stage_rows if s["delivery_status"] == "Delayed"],
        "pending_collection": [s for s in stage_rows if Decimal(s["ready"]) > 0],
        "latest_events": [
            output(e)
            for e in db.scalars(
                select(ProductionEvent)
                .order_by(ProductionEvent.created_at.desc())
                .limit(20)
            )
        ],
        "ownership_note": "Supplier-owned planned work is not AMBS on-hand. AMBS external custody is owned stock, excluded from dispatch availability. Stage completion is not an additional stock quantity.",
    }
