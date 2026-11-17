"""Single-transaction purchasing and custody orchestration over Phase 4 stock posting."""

import uuid
from datetime import timedelta
from decimal import Decimal, getcontext
from sqlalchemy import delete, func, select
from app.core.security import utcnow
from app.models.master import Item, Unit
from app.models.inventory import Warehouse, StockMovement, MovementLine
from app.models.purchasing import (
    Supplier,
    SupplierMaterial,
    Quotation,
    QuotationLine,
    PurchaseRequest,
    RequestLine,
    PurchaseOrder,
    OrderLine,
    PurchaseReceipt,
    ReceiptLine,
    ProductionOrder,
    ProductionStage,
    ProductionEvent,
    ProductionCost,
    ScheduleUpdate,
    ProductionConversion,
)
from app.schemas.inventory import LineInput, Operation
from app.schemas.purchasing import ReceiptInput
from app.schemas.master import normalized
from app.services import inventory as inv
from app.services.master import output, get_record, record_audit

from zoneinfo import ZoneInfo


def business_today():
    return utcnow().astimezone(ZoneInfo("Asia/Dubai")).date()


ZERO = Decimal(0)
CONFIG = {
    "quotations": (
        Quotation,
        QuotationLine,
        "quotation_id",
        "QUO",
        "suppliers.prices.manage",
    ),
    "requests": (
        PurchaseRequest,
        RequestLine,
        "request_id",
        "PRQ",
        "purchasing.requests.create",
    ),
    "orders": (PurchaseOrder, OrderLine, "order_id", "POR", "purchasing.orders.create"),
}
COST_FIELDS = {
    "quoted_unit_price",
    "unit_price_variance",
    "unit_price",
    "freight",
    "taxes",
    "fees",
    "amount",
    "unit_cost",
    "stock_value",
    "average_cost",
    "value_delta",
    "cost_complete",
    "valuation",
    "commitments",
    "landed_cost",
    "rank",
    "estimated_cost",
    "costs",
}


def authorize(db, ctx, permission):
    inv.authorize(db, ctx, permission)


def active(db, model, identity):
    row = get_record(db, model, identity)
    if hasattr(row, "is_active") and not row.is_active:
        inv.fail(
            "INACTIVE_REFERENCE",
            "Reactivate the referenced record before new transactions",
            422,
        )
    return row


def clean(value, ctx):
    if isinstance(value, list):
        return [clean(v, ctx) for v in value]
    if isinstance(value, dict):
        costs = "suppliers.prices.read" in ctx.permissions
        return {
            k: clean(v, ctx)
            for k, v in value.items()
            if k
            not in {
                "create_key",
                "post_key",
                "reverse_key",
                "request_key",
                "operation_key",
                "request_hash",
            }
            and (k != "costs" or "production.costs.read" in ctx.permissions)
            and (
                k
                not in {
                    "unit_cost",
                    "stock_value",
                    "average_cost",
                    "value_delta",
                    "cost_complete",
                }
                or "inventory.costs.read" in ctx.permissions
            )
            and (k != "amount" or "production.costs.read" in ctx.permissions or costs)
            and (
                costs
                or k
                not in COST_FIELDS
                - {
                    "costs",
                    "amount",
                    "unit_cost",
                    "stock_value",
                    "average_cost",
                    "value_delta",
                    "cost_complete",
                }
            )
        }
    return value


def audit(db, ctx, row, action, fields=(), reason=None):
    record_audit(db, ctx, "purchasing", row, action, fields, reason=reason)


def supplier_save(db, ctx, data, identity=None):
    inv.lock_inventory(db)
    row = inv.locked(db, Supplier, identity) if identity else None
    authorize(db, ctx, "suppliers.update" if row else "suppliers.create")
    if row and data.is_active != row.is_active:
        authorize(db, ctx, "suppliers.archive")
    duplicate = db.scalar(
        select(Supplier.id)
        .where(
            Supplier.normalized_name == normalized(data.name),
            Supplier.id != (identity or uuid.UUID(int=0)),
        )
        .limit(1)
    )
    if duplicate and not data.duplicate_confirmed:
        inv.fail(
            "DUPLICATE_SUPPLIER",
            "A supplier with this normalized name exists. Review it and explicitly confirm a distinct supplier; no merge is automatic.",
        )
    values = data.model_dump(exclude={"duplicate_confirmed"})
    if not row:
        row = inv.identified(
            Supplier, "SUP", ctx.user, normalized_name=normalized(data.name), **values
        )
        db.add(row)
    else:
        for key, value in values.items():
            setattr(row, key, value)
        row.normalized_name = normalized(data.name)
        row.updated_at = utcnow()
    audit(db, ctx, row, "supplier_saved", values.keys())
    db.flush()
    return row


def validate_lines(db, lines, *, stock_unit=True):
    for line in lines:
        unit = active(db, Unit, line.unit_id)
        if line.quantity != line.quantity.quantize(
            Decimal(1).scaleb(-unit.decimal_places)
        ):
            inv.fail(
                "UNIT_PRECISION",
                "Quantity must respect the purchase unit precision",
                422,
            )
        if line.line_type == "STOCK":
            item = active(db, Item, line.item_id)
            if stock_unit and item.unit_id != line.unit_id:
                inv.fail(
                    "UNIT_CONVERSION_REQUIRED",
                    "Stock purchasing must use the item unit; no conversion rule is approved",
                    422,
                )


def replay(db, model, key, fingerprint):
    row = db.scalar(select(model).where(model.create_key == key))
    if row and row.request_hash != fingerprint:
        inv.fail(
            "IDEMPOTENCY_CONFLICT", "This create key already belongs to different data"
        )
    return row


def save_document(db, ctx, resource, data, identity=None, amends_id=None):
    inv.lock_inventory(db)
    model, line_model, fk, prefix, permission = CONFIG[resource]
    authorize(db, ctx, permission)
    values = data.model_dump(exclude={"request_key", "version", "lines"})
    fingerprint = inv.digest(data.model_dump(exclude={"request_key", "version"}))
    row = (
        inv.locked(db, model, identity)
        if identity
        else replay(db, model, data.request_key, fingerprint)
    )
    if row and not identity:
        return row
    if row and (row.status != "DRAFT" or row.version != data.version):
        inv.fail("DOCUMENT_LOCKED", "Only the current version of a draft can be edited")
    if resource in {"orders", "quotations"}:
        active(db, Supplier, data.supplier_id)
    if resource == "orders":
        active(db, Warehouse, data.warehouse_id)
        if data.quotation_id:
            quote = get_record(db, Quotation, data.quotation_id)
            if quote.supplier_id != data.supplier_id or quote.currency != data.currency:
                inv.fail(
                    "QUOTE_MISMATCH",
                    "Quotation supplier and currency must match the order",
                    422,
                )
        if data.request_id:
            request = inv.locked(db, PurchaseRequest, data.request_id)
            if request.status != "SUBMITTED" and not (
                row and row.request_id == request.id and request.status == "CONVERTED"
            ):
                inv.fail(
                    "REQUEST_NOT_SUBMITTED",
                    "Only submitted, unconverted requests can be converted",
                )
            if db.scalar(
                select(PurchaseOrder.id).where(
                    PurchaseOrder.request_id == request.id,
                    PurchaseOrder.id != (identity or uuid.UUID(int=0)),
                )
            ):
                inv.fail(
                    "ALREADY_CONVERTED", "This request already has a purchase order"
                )
            source = db.scalars(
                select(RequestLine).where(RequestLine.request_id == request.id)
            ).all()
            expected = sorted(
                [
                    (
                        l.line_type,
                        str(l.item_id),
                        str(l.unit_id),
                        str(l.quantity.normalize()),
                    )
                    for l in source
                ]
            )
            actual = sorted(
                [
                    (
                        l.line_type,
                        str(l.item_id),
                        str(l.unit_id),
                        str(l.quantity.normalize()),
                    )
                    for l in data.lines
                ]
            )
            if expected != actual:
                inv.fail(
                    "REQUEST_LINES_MISMATCH",
                    "Conversion must preserve request items, units and quantities; amend the request before conversion",
                    422,
                )
    if resource == "requests" and data.quotation_id:
        get_record(db, Quotation, data.quotation_id)
    if resource == "quotations" and data.supersedes_id:
        previous = inv.locked(db, Quotation, data.supersedes_id)
        if previous.supplier_id != data.supplier_id or previous.status != "ISSUED":
            inv.fail(
                "QUOTE_VERSION",
                "A new version must reference an issued quotation for the same supplier",
            )
    validate_lines(db, data.lines, stock_unit=resource != "quotations")
    if row:
        db.execute(delete(line_model).where(getattr(line_model, fk) == row.id))
        for key, value in values.items():
            setattr(row, key, value)
        row.version += 1
        row.updated_at = utcnow()
    else:
        if resource == "orders":
            values["amends_id"] = amends_id
        row = inv.identified(
            model,
            prefix,
            ctx.user,
            status="DRAFT",
            create_key=data.request_key,
            request_hash=fingerprint,
            **values,
        )
        db.add(row)
        db.flush()
    for line in data.lines:
        db.add(line_model(**{fk: row.id}, **line.model_dump()))
    audit(db, ctx, row, f"{resource}_saved", ["lines", "terms"])
    db.flush()
    if resource == "orders" and data.request_id:
        request.status = "CONVERTED"
        audit(db, ctx, request, "request_converted", ["status"])
    return row


def received(db, line_id):
    return (
        db.scalar(
            select(func.coalesce(func.sum(ReceiptLine.quantity), 0))
            .join(PurchaseReceipt, PurchaseReceipt.id == ReceiptLine.receipt_id)
            .where(
                ReceiptLine.order_line_id == line_id, PurchaseReceipt.status == "POSTED"
            )
        )
        or ZERO
    )


def order_progress(db, row):
    lines = db.scalars(
        select(OrderLine).where(OrderLine.order_id == row.id).order_by(OrderLine.id)
    ).all()
    total = sum((line.quantity for line in lines), ZERO)
    got = sum((received(db, line.id) for line in lines), ZERO)
    if row.status not in {"DRAFT", "CANCELLED", "CLOSED"}:
        row.status = (
            "RECEIVED" if got == total else "PARTIALLY_RECEIVED" if got else "CONFIRMED"
        )
    return lines


def schedule_view(db, order_id=None, stage_id=None, remaining=ZERO, fallback=None):
    query = (
        select(ScheduleUpdate).where(ScheduleUpdate.order_id == order_id)
        if order_id
        else select(ScheduleUpdate).where(ScheduleUpdate.stage_id == stage_id)
    )
    rows = db.scalars(
        query.order_by(ScheduleUpdate.created_at, ScheduleUpdate.id)
    ).all()
    latest = rows[-1] if rows else None
    due = (
        (latest.eta or latest.confirmed_on or latest.requested_on)
        if latest
        else fallback
    )
    confirmed = bool(latest and latest.confirmed_on)
    return {
        "delivery_status": "Delayed"
        if remaining > 0 and due and due < business_today()
        else "Supplier Confirmed"
        if confirmed
        else "Awaiting Supplier Confirmation",
        "due_on": due.isoformat() if due else None,
        "last_supplier_update": output(latest) if latest else None,
        "schedule_history": [output(r) for r in rows],
    }


def document_view(db, resource, row):
    model, line_model, fk, _, _ = CONFIG[resource]
    result = output(row)
    if resource in {"orders", "quotations"}:
        result["supplier_name"] = get_record(db, Supplier, row.supplier_id).name
    result["name"] = result.get("reference") or row.code
    result["lines"] = []
    remaining = ZERO
    for line in db.scalars(
        select(line_model)
        .where(getattr(line_model, fk) == row.id)
        .order_by(line_model.id)
    ):
        values = output(line)
        values["unit_name"] = get_record(db, Unit, line.unit_id).name
        if line.item_id:
            values["item_name"] = get_record(db, Item, line.item_id).name
        if resource == "orders":
            got = received(db, line.id)
            outstanding = line.quantity - got
            values.update(
                received=str(got),
                outstanding=str(
                    outstanding
                    if row.status not in {"CLOSED", "CANCELLED", "DRAFT"}
                    else ZERO
                ),
                closed_remainder=str(outstanding if row.status == "CLOSED" else ZERO),
            )
            remaining += outstanding
            values["cost_basis"] = (
                "Confirmed PO price; freight/taxes/processing are not automatically allocated to stock"
            )
            if row.quotation_id:
                quote = get_record(db, Quotation, row.quotation_id)
                candidates = db.scalars(
                    select(QuotationLine).where(
                        QuotationLine.quotation_id == quote.id,
                        QuotationLine.item_id == line.item_id,
                        QuotationLine.unit_id == line.unit_id,
                        QuotationLine.line_type == line.line_type,
                        QuotationLine.quantity == line.quantity,
                    )
                ).all()
                if (
                    len(candidates) == 1
                    and quote.currency == row.currency
                    and candidates[0].unit_price is not None
                    and line.unit_price is not None
                ):
                    values["quoted_unit_price"] = str(candidates[0].unit_price)
                    values["unit_price_variance"] = str(
                        line.unit_price - candidates[0].unit_price
                    )
                else:
                    values["price_comparison_note"] = (
                        "Not Comparable: quotation line, quantity, unit or currency does not uniquely match"
                    )
        result["lines"].append(values)
    if resource == "orders":
        result.update(
            schedule_view(
                db,
                order_id=row.id,
                remaining=remaining
                if row.status not in {"DRAFT", "CLOSED", "CANCELLED"}
                else ZERO,
                fallback=row.expected_on,
            )
        )
        result["receipts"] = [
            receipt_view(db, r)
            for r in db.scalars(
                select(PurchaseReceipt)
                .where(PurchaseReceipt.order_id == row.id)
                .order_by(PurchaseReceipt.created_at)
            )
        ]
    if resource == "quotations":
        result["expired"] = bool(row.valid_until and row.valid_until < business_today())
    return result


def document_action(db, ctx, resource, identity, action, op):
    inv.lock_inventory(db)
    model = CONFIG[resource][0]
    row = inv.locked(db, model, identity)
    permission = (
        "suppliers.prices.manage"
        if resource == "quotations"
        else "purchasing.requests.manage"
        if resource == "requests"
        else "purchasing.orders.confirm"
        if action == "confirm"
        else "purchasing.orders.close"
    )
    authorize(db, ctx, permission)
    if resource == "quotations" and action == "issue":
        if row.status == "ISSUED":
            return row
        if row.status != "DRAFT":
            inv.fail("INVALID_TRANSITION", "Only a draft quotation can be issued")
        active(db, Supplier, row.supplier_id)
        if row.supersedes_id:
            previous = inv.locked(db, Quotation, row.supersedes_id)
            if previous.status != "ISSUED":
                inv.fail("QUOTE_VERSION", "The previous version is no longer issued")
            previous.status = "SUPERSEDED"
            audit(db, ctx, previous, "quotation_superseded", ["status"])
        row.status = "ISSUED"
    elif resource == "requests" and action == "submit":
        if row.status == "SUBMITTED":
            return row
        if row.status != "DRAFT":
            inv.fail("INVALID_TRANSITION", "Submit only a draft request")
        row.status = "SUBMITTED"
    elif resource == "orders" and action == "confirm":
        if row.status == "CONFIRMED":
            return row
        if row.status != "DRAFT":
            inv.fail("INVALID_TRANSITION", "Confirm only a draft order")
        active(db, Supplier, row.supplier_id)
        active(db, Warehouse, row.warehouse_id)
        lines = db.scalars(select(OrderLine).where(OrderLine.order_id == row.id)).all()
        if not lines:
            inv.fail("EMPTY_ORDER", "An order needs lines", 422)
        for line in lines:
            if line.unit_price is None:
                inv.fail(
                    "UNKNOWN_CONFIRMED_PRICE",
                    "Confirm actual purchase unit prices before confirming the obligation",
                    422,
                )
            if line.item_id and active(db, Item, line.item_id).unit_id != line.unit_id:
                inv.fail("UNIT_CHANGED", "Item unit changed; refresh the draft", 422)
        row.status = "CONFIRMED"
        row.confirmed_by = ctx.user.id
        row.confirmed_at = utcnow()
    elif action == "cancel":
        if row.status == "CANCELLED":
            return row
        if row.status not in {"DRAFT", "SUBMITTED"}:
            inv.fail(
                "INVALID_TRANSITION",
                "Only draft orders/quotes or unconverted requests may be cancelled; close confirmed obligations instead",
            )
        row.status = "CANCELLED"
    elif resource == "orders" and action == "close":
        if row.status == "CLOSED":
            return row
        if row.status not in {"CONFIRMED", "PARTIALLY_RECEIVED", "RECEIVED"}:
            inv.fail("INVALID_TRANSITION", "Close only a confirmed order")
        if db.scalar(
            select(ProductionOrder.id)
            .join(OrderLine, OrderLine.id == ProductionOrder.purchase_order_line_id)
            .where(
                OrderLine.order_id == row.id,
                ProductionOrder.status.in_(["DRAFT", "ACTIVE"]),
            )
        ):
            inv.fail(
                "PRODUCTION_LINKED",
                "Resolve linked active production before closing its purchase obligation",
            )
        row.status = "CLOSED"
        row.closure_reason = op.reason
    else:
        inv.fail("INVALID_ACTION", "Unsupported document transition", 404)
    row.updated_at = utcnow()
    audit(db, ctx, row, f"{resource}_{action}", ["status"], op.reason)
    db.flush()
    return row


def amend_order(db, ctx, identity, data, reason):
    inv.lock_inventory(db)
    authorize(db, ctx, "purchasing.orders.close")
    old = inv.locked(db, PurchaseOrder, identity)
    previous = replay(
        db,
        PurchaseOrder,
        data.request_key,
        inv.digest(data.model_dump(exclude={"request_key", "version"})),
    )
    if previous:
        if previous.amends_id != old.id:
            inv.fail("AMENDMENT_CONFLICT", "Key belongs to another amendment")
        return previous
    if old.status not in {"CONFIRMED", "PARTIALLY_RECEIVED"}:
        inv.fail(
            "INVALID_AMENDMENT", "Only an open confirmed obligation can be replaced"
        )
    if data.request_id:
        inv.fail(
            "AMENDMENT_REQUEST",
            "The original request stays linked to its original order",
            422,
        )
    if db.scalar(
        select(ProductionOrder.id)
        .join(OrderLine, OrderLine.id == ProductionOrder.purchase_order_line_id)
        .where(
            OrderLine.order_id == old.id,
            ProductionOrder.status.in_(["DRAFT", "ACTIVE"]),
        )
    ):
        inv.fail(
            "PRODUCTION_LINKED",
            "Finish or reconcile linked production before closing its purchase obligation",
        )
    old.status = "CLOSED"
    old.closure_reason = reason
    old.updated_at = utcnow()
    audit(db, ctx, old, "order_amended", ["closed_remainder"], reason)
    return save_document(db, ctx, "orders", data, amends_id=old.id)


def receipt_view(db, row):
    result = output(row)
    result["name"] = row.code
    result["currency"] = get_record(db, PurchaseOrder, row.order_id).currency
    result["lines"] = []
    for l in db.scalars(
        select(ReceiptLine)
        .where(ReceiptLine.receipt_id == row.id)
        .order_by(ReceiptLine.id)
    ):
        pol = get_record(db, OrderLine, l.order_line_id)
        result["lines"].append(
            {
                **output(l),
                "description": pol.description,
                "item_name": get_record(db, Item, pol.item_id).name
                if pol.item_id
                else None,
                "line_type": pol.line_type,
                "unit_name": get_record(db, Unit, pol.unit_id).name,
                "unit_price": str(pol.unit_price)
                if pol.unit_price is not None
                else None,
                "cost_basis": "Confirmed PO price; additional charges remain separate",
            }
        )
    return result


def protect_receiving_route(db, line_id, production_internal):
    if not production_internal and db.scalar(
        select(ProductionOrder.id)
        .where(
            ProductionOrder.purchase_order_line_id == line_id,
            ProductionOrder.ownership == "SUPPLIER",
            ProductionOrder.status.in_(["DRAFT", "ACTIVE"]),
        )
        .limit(1)
    ):
        inv.fail(
            "PRODUCTION_RECEIVING_REQUIRED",
            "Receive this supplier-owned production line through its final-stage yard action. Use separate PO lines for direct receiving.",
        )


def create_receipt(db, ctx, data, *, production_internal=False):
    inv.lock_inventory(db)
    authorize(db, ctx, "purchasing.receipts.create")
    fingerprint = inv.digest(data.model_dump(exclude={"request_key", "version"}))
    previous = replay(db, PurchaseReceipt, data.request_key, fingerprint)
    if previous:
        return previous
    order = inv.locked(db, PurchaseOrder, data.order_id)
    if order.status not in {"CONFIRMED", "PARTIALLY_RECEIVED"}:
        inv.fail("ORDER_NOT_OPEN", "Receive only an open confirmed purchase order")
    if data.received_at > utcnow() + timedelta(minutes=5):
        inv.fail("FUTURE_RECEIPT", "Enter the actual receipt time", 422)
    row = inv.identified(
        PurchaseReceipt,
        "GRN",
        ctx.user,
        status="DRAFT",
        create_key=data.request_key,
        request_hash=fingerprint,
        **data.model_dump(exclude={"request_key", "version", "lines"}),
    )
    db.add(row)
    db.flush()
    for line in data.lines:
        pol = get_record(db, OrderLine, line.order_line_id)
        protect_receiving_route(db, pol.id, production_internal)
        if pol.order_id != order.id:
            inv.fail(
                "RECEIPT_LINE_MISMATCH",
                "Receipt lines must belong to this purchase order",
                422,
            )
        unit = get_record(db, Unit, pol.unit_id)
        if line.quantity != line.quantity.quantize(
            Decimal(1).scaleb(-unit.decimal_places)
        ):
            inv.fail(
                "UNIT_PRECISION",
                "Receipt quantity must respect its unit precision",
                422,
            )
        if pol.line_type == "STOCK":
            loc = inv.location(db, line.location_id) if line.location_id else None
            if not loc or loc.warehouse_id != order.warehouse_id:
                inv.fail(
                    "RECEIVING_WAREHOUSE",
                    "Select a location in the order receiving warehouse",
                    422,
                )
            if loc.kind == "EXTERNAL" and loc.supplier_id != order.supplier_id:
                inv.fail(
                    "CUSTODIAN_MISMATCH",
                    "External receiving must name the supplying custodian",
                    422,
                )
            inv.quantity(db, pol.item_id, line.quantity, line.lot_id)
        elif line.location_id or line.lot_id:
            inv.fail(
                "SERVICE_NO_STOCK",
                "Service acceptance must not create stock or a lot",
                422,
            )
        db.add(ReceiptLine(receipt_id=row.id, **line.model_dump()))
    audit(db, ctx, row, "receipt_created", ["lines"])
    db.flush()
    return row


def stock_document(db, ctx, kind, lines, key, reason, reference, occurred_at=None):
    # Internal kinds are not accepted by the public inventory movement schema.
    for line in lines:
        inv.validate_line(db, kind, line)
    row = inv.identified(
        StockMovement,
        "MOV",
        ctx.user,
        kind=kind,
        status="DRAFT",
        reason=reason,
        source_reference=reference,
        occurred_at=occurred_at or utcnow(),
        create_key=key,
        request_hash=inv.digest([l.model_dump() for l in lines]),
    )
    db.add(row)
    db.flush()
    for line in lines:
        db.add(MovementLine(movement_id=row.id, **line.model_dump()))
    db.flush()
    return row


def post_receipt(db, ctx, identity, op, *, production_internal=False):
    inv.lock_inventory(db)
    authorize(db, ctx, "purchasing.receipts.post")
    row = inv.locked(db, PurchaseReceipt, identity)
    if row.status == "POSTED" and row.post_key == op.request_key:
        return row
    if row.status != "DRAFT":
        inv.fail("RECEIPT_CLOSED", "This receipt has already been posted or closed")
    order = inv.locked(db, PurchaseOrder, row.order_id)
    if order.status not in {"CONFIRMED", "PARTIALLY_RECEIVED"}:
        inv.fail("ORDER_NOT_OPEN", "The purchase order is not open for receiving")
    lines = db.scalars(
        select(ReceiptLine)
        .where(ReceiptLine.receipt_id == row.id)
        .order_by(ReceiptLine.id)
    ).all()
    requested = {}
    stock = []
    stock_links = []
    for line in lines:
        pol = inv.locked(db, OrderLine, line.order_line_id)
        protect_receiving_route(db, pol.id, production_internal)
        requested[pol.id] = requested.get(pol.id, ZERO) + line.quantity
        if received(db, pol.id) + requested[pol.id] > pol.quantity:
            inv.fail(
                "OVER_RECEIPT",
                "Received quantities exceed the authoritative outstanding order quantity",
            )
        if pol.item_id:
            if inv.location(db, line.location_id).warehouse_id != order.warehouse_id:
                inv.fail(
                    "RECEIVING_WAREHOUSE",
                    "Receipt location no longer belongs to the receiving warehouse",
                )
            stock.append(
                LineInput(
                    item_id=pol.item_id,
                    unit_id=pol.unit_id,
                    quantity=line.quantity,
                    destination_id=line.location_id,
                    lot_id=line.lot_id,
                    unit_cost=pol.unit_price,
                    currency=order.currency if pol.unit_price is not None else None,
                )
            )
            stock_links.append(line)
    if stock:
        authorize(db, ctx, "inventory.receipts.post")
        movement = stock_document(
            db,
            ctx,
            "PURCHASE_RECEIPT",
            stock,
            row.create_key,
            row.reason,
            row.code,
            row.received_at,
        )
        # Flush stock line linkage before posting, preserving immutable history.
        mlines = db.scalars(
            select(MovementLine)
            .where(MovementLine.movement_id == movement.id)
            .order_by(MovementLine.created_at, MovementLine.id)
        ).all()
        # Lines are explicitly mapped by identity tuple rather than insertion order.
        for link in stock_links:
            pol = get_record(db, OrderLine, link.order_line_id)
            match = next(
                m
                for m in mlines
                if m.item_id == pol.item_id
                and m.destination_id == link.location_id
                and m.lot_id == link.lot_id
                and m.quantity == link.quantity
                and m.unit_cost == pol.unit_price
            )
            link.movement_line_id = match.id
            mlines.remove(match)
        inv.post_movement(db, ctx, movement.id, op, internal=True)
        row.movement_id = movement.id
    row.status = "POSTED"
    row.post_key = op.request_key
    row.posted_by = ctx.user.id
    row.updated_at = utcnow()
    db.flush()
    order_progress(db, order)
    audit(db, ctx, row, "receipt_posted", ["purchase_progress", "ledger"], op.reason)
    db.flush()
    return row


def reverse_receipt(db, ctx, identity, op):
    inv.lock_inventory(db)
    authorize(db, ctx, "purchasing.receipts.post")
    row = inv.locked(db, PurchaseReceipt, identity)
    if row.status == "REVERSED" and row.reverse_key == op.request_key:
        return row
    if row.status != "POSTED":
        inv.fail("RECEIPT_NOT_POSTED", "Only a posted receipt can be reversed")
    if db.scalar(
        select(ProductionEvent.id).where(ProductionEvent.receipt_id == row.id)
    ):
        inv.fail(
            "PRODUCTION_RECEIPT",
            "Production-linked yard receipts require a new measured reconciliation; their stage history cannot be silently undone",
        )
    if row.movement_id:
        inv.reverse_movement(db, ctx, row.movement_id, op, purchasing_internal=True)
    row.status = "REVERSED"
    row.reverse_key = op.request_key
    row.updated_at = utcnow()
    db.flush()
    order = inv.locked(db, PurchaseOrder, row.order_id)
    order_progress(db, order)
    audit(db, ctx, row, "receipt_reversed", ["purchase_progress", "ledger"], op.reason)
    db.flush()
    return row


def compare(db, data):
    getcontext().prec = 60
    active(db, Item, data.item_id)
    get_record(db, Unit, data.unit_id)
    results = []
    for line, quote, supplier in db.execute(
        select(QuotationLine, Quotation, Supplier)
        .join(Quotation, Quotation.id == QuotationLine.quotation_id)
        .join(Supplier, Supplier.id == Quotation.supplier_id)
        .where(QuotationLine.item_id == data.item_id)
        .order_by(Quotation.quoted_on.desc(), Quotation.id)
    ):
        reasons = []
        if not supplier.is_active:
            reasons.append("Supplier inactive")
        if quote.status != "ISSUED" or quote.quoted_on > business_today():
            reasons.append("Quotation is not currently issued/effective")
        if quote.valid_until is None:
            reasons.append("Validity unconfirmed")
        elif quote.valid_until < business_today():
            reasons.append("Quotation expired")
        if quote.currency != data.currency:
            reasons.append("Currency differs; no verified exchange rate")
        if line.unit_id != data.unit_id:
            reasons.append("Unit differs; no approved conversion")
        if line.unit_price is None:
            reasons.append("Price unknown")
        if data.quantity != line.quantity:
            reasons.append(
                "Requested quantity differs from quoted quantity; no price band is verified"
            )
        material = db.scalar(
            select(SupplierMaterial).where(
                SupplierMaterial.item_id == data.item_id,
                SupplierMaterial.supplier_id == supplier.id,
            )
        )
        if (
            material
            and material.minimum_quantity
            and (
                material.unit_id != data.unit_id
                or data.quantity < material.minimum_quantity
            )
        ):
            reasons.append("Minimum order quantity or its unit is incompatible")
        if any(v is None for v in [quote.freight, quote.taxes, quote.fees]):
            reasons.append("Landed charges unconfirmed")
        if (
            db.scalar(
                select(func.count())
                .select_from(QuotationLine)
                .where(QuotationLine.quotation_id == quote.id)
            )
            != 1
        ):
            reasons.append("Shared multi-line charges have no approved allocation")
        landed = (
            (data.quantity * line.unit_price + quote.freight + quote.taxes + quote.fees)
            if not reasons
            else None
        )
        verified = bool(
            material
            and material.verified_on
            and material.verified_on >= business_today() - timedelta(days=30)
        )
        results.append(
            {
                "id": str(line.id),
                "supplier_name": supplier.name,
                "quotation_id": str(quote.id),
                "reference": quote.reference,
                "quoted_on": quote.quoted_on.isoformat(),
                "unit_name": get_record(db, Unit, line.unit_id).name,
                "currency": quote.currency,
                "unit_price": str(line.unit_price)
                if line.unit_price is not None
                else None,
                "landed_cost": str(landed) if landed is not None else None,
                "comparison": "Comparable" if not reasons else "Not Comparable",
                "reasons": reasons,
                "lead_days": quote.lead_days,
                "availability_status": "Verified supplier report (not live AMBS stock)"
                if verified and material.reported_available is not None
                else "Stale or unverified supplier availability",
                "reported_available": str(material.reported_available)
                if material and material.reported_available is not None
                else None,
                "verified_on": material.verified_on.isoformat()
                if material and material.verified_on
                else None,
            }
        )
    comparable = sorted(
        [r for r in results if r["landed_cost"] is not None],
        key=lambda r: Decimal(r["landed_cost"]),
    )
    for index, row in enumerate(comparable):
        row["rank"] = index + 1
    return {
        "items": results,
        "total": len(results),
        "assumptions": "Same requested quantity, unit and currency; recorded single-line freight/taxes/fees included. No FX, unit conversion, reliability score or automatic award.",
    }


def flow(db, stage, lot_id=None, filtered=False):
    # One statement gives every subtotal the same PostgreSQL snapshot, including
    # dashboard reads concurrent with an atomic stage/custody update.
    own = ProductionEvent.stage_id == stage.id
    incoming = ProductionEvent.destination_stage_id == stage.id

    def subtotal(kind, scope):
        return func.coalesce(
            func.sum(ProductionEvent.quantity).filter(
                scope, ProductionEvent.kind == kind
            ),
            0,
        )

    query = select(
        subtotal("START", own),
        subtotal("TRANSFER", incoming),
        subtotal("COMPLETE", own),
        subtotal("TRANSFER", own),
        subtotal("YARD", own),
    ).where(own | incoming)
    if filtered:
        query = query.where(ProductionEvent.lot_id == lot_id)
    started, arrived, completed, forwarded, yard = db.execute(query).one()
    entered = started + arrived
    return {
        "entered": entered,
        "completed": completed,
        "forwarded": forwarded,
        "yard_received": yard,
        "in_process": entered - completed,
        "ready": completed - forwarded - yard,
        "current_custody": entered - forwarded - yard,
    }


def production_view(db, row):
    result = output(row)
    result["name"] = row.code
    result["item_name"] = get_record(db, Item, row.item_id).name
    result["unit_name"] = get_record(
        db, Unit, get_record(db, Item, row.item_id).unit_id
    ).name
    if row.purchase_order_line_id:
        result["purchase_order_id"] = str(
            get_record(db, OrderLine, row.purchase_order_line_id).order_id
        )
    stages = db.scalars(
        select(ProductionStage)
        .where(ProductionStage.order_id == row.id)
        .order_by(ProductionStage.sequence)
    ).all()
    result["stages"] = []
    yard = ZERO
    for stage in stages:
        progress = flow(db, stage)
        yard += progress["yard_received"]
        result["stages"].append(
            {
                **output(stage),
                "supplier_name": get_record(db, Supplier, stage.supplier_id).name,
                **{k: str(v) for k, v in progress.items()},
                "planned": str(row.quantity),
                "remaining_planned": str(row.quantity - progress["completed"]),
                **schedule_view(
                    db,
                    stage_id=stage.id,
                    remaining=row.quantity - progress["completed"],
                    fallback=stage.expected_on or row.expected_finish,
                ),
            }
        )
    result["yard_received"] = str(yard)
    result["outstanding"] = str(row.quantity - yard)
    result["events"] = [
        output(e)
        for e in db.scalars(
            select(ProductionEvent)
            .join(ProductionStage, ProductionStage.id == ProductionEvent.stage_id)
            .where(ProductionStage.order_id == row.id)
            .order_by(ProductionEvent.created_at, ProductionEvent.id)
        )
    ]
    result["costs"] = [
        {
            **output(c),
            "allocation_status": "Pending approved allocation; excluded from inventory valuation",
        }
        for c in db.scalars(
            select(ProductionCost).where(ProductionCost.order_id == row.id)
        )
    ]
    return result


def production_create(db, ctx, data, identity=None):
    inv.lock_inventory(db)
    authorize(db, ctx, "production.create")
    fingerprint = inv.digest(data.model_dump(exclude={"request_key", "version"}))
    old = (
        inv.locked(db, ProductionOrder, identity)
        if identity
        else replay(db, ProductionOrder, data.request_key, fingerprint)
    )
    if old and not identity:
        return old
    if old and (old.status != "DRAFT" or old.version != data.version):
        inv.fail(
            "PLAN_LOCKED",
            "Only the current unstarted draft production plan can be edited",
        )
    item = active(db, Item, data.item_id)
    # Tracking is validated at physical operations, when actual identities exist.
    unit = get_record(db, Unit, item.unit_id)
    if data.quantity != data.quantity.quantize(Decimal(1).scaleb(-unit.decimal_places)):
        inv.fail(
            "UNIT_PRECISION", "Production quantity must respect the item unit", 422
        )
    if data.ownership == "SUPPLIER" and not data.purchase_order_line_id:
        inv.fail(
            "PURCHASE_REFERENCE_REQUIRED",
            "Supplier-owned expected output requires an actual confirmed purchase line before receiving",
            422,
        )
    if data.purchase_order_line_id:
        pol = get_record(db, OrderLine, data.purchase_order_line_id)
        po = get_record(db, PurchaseOrder, pol.order_id)
        valid_states = (
            {"CONFIRMED", "PARTIALLY_RECEIVED"}
            if data.ownership == "SUPPLIER"
            else {"CONFIRMED", "PARTIALLY_RECEIVED", "RECEIVED", "CLOSED"}
        )
        if pol.item_id != item.id or po.status not in valid_states:
            inv.fail(
                "PRODUCTION_PURCHASE_MISMATCH",
                "Link an open confirmed purchase line for the same output item",
                422,
            )
        allocated = (
            db.scalar(
                select(func.coalesce(func.sum(ProductionOrder.quantity), 0)).where(
                    ProductionOrder.purchase_order_line_id == pol.id,
                    ProductionOrder.status != "CANCELLED",
                    ProductionOrder.id != (identity or uuid.UUID(int=0)),
                )
            )
            or ZERO
        )
        if allocated + data.quantity > pol.quantity:
            inv.fail(
                "PRODUCTION_OVERPLAN",
                "Production plans already allocate this purchase line quantity",
            )
    values = data.model_dump(exclude={"request_key", "version", "stages"})
    if (
        data.purchase_order_line_id
        and data.ownership == "SUPPLIER"
        and data.quantity > pol.quantity - received(db, pol.id)
    ):
        inv.fail(
            "PRODUCTION_ALREADY_ACQUIRED",
            "Supplier-owned plans cannot allocate goods already received as AMBS-owned stock",
        )
    if old:
        row = old
        db.execute(delete(ProductionStage).where(ProductionStage.order_id == row.id))
        for k, v in values.items():
            setattr(row, k, v)
        row.version += 1
        row.updated_at = utcnow()
    else:
        row = inv.identified(
            ProductionOrder,
            "PRO",
            ctx.user,
            status="DRAFT",
            create_key=data.request_key,
            request_hash=fingerprint,
            **values,
        )
        db.add(row)
        db.flush()
    for index, stage in enumerate(data.stages):
        active(db, Supplier, stage.supplier_id)
        if data.ownership == "AMBS":
            loc = inv.location(db, stage.location_id) if stage.location_id else None
            if (
                not loc
                or loc.kind != "EXTERNAL"
                or loc.supplier_id != stage.supplier_id
            ):
                inv.fail(
                    "EXTERNAL_CUSTODY_REQUIRED",
                    "Owned production stages need a verified external custody location for their supplier",
                    422,
                )
        elif stage.location_id:
            inv.fail(
                "SUPPLIER_OWNED_NOT_STOCK",
                "Supplier-owned planned work must not be represented by an AMBS stock location",
                422,
            )
        db.add(
            ProductionStage(order_id=row.id, sequence=index + 1, **stage.model_dump())
        )
    audit(db, ctx, row, "production_created", ["plan", "route", "ownership"])
    db.flush()
    return row


def claimed(db, item_id, loc_id, lot_id):
    held = ZERO
    for stage in db.scalars(
        select(ProductionStage)
        .join(ProductionOrder, ProductionOrder.id == ProductionStage.order_id)
        .where(
            ProductionOrder.item_id == item_id,
            ProductionOrder.ownership == "AMBS",
            ProductionOrder.status.in_(["ACTIVE", "DRAFT"]),
            ProductionStage.location_id == loc_id,
        )
    ):
        held += flow(db, stage, lot_id, True)["current_custody"]
    return held


def unallocated(db, item_id, loc_id, lot_id):
    bucket = inv.bucket(db, item_id, loc_id, lot_id)
    return bucket.on_hand - bucket.reserved - claimed(db, item_id, loc_id, lot_id)


def stage_action(db, ctx, identity, action, data):
    inv.lock_inventory(db)
    authorize(db, ctx, "production.stages.update")
    fingerprint = inv.digest(
        {
            "stage": identity,
            "action": action,
            **data.model_dump(exclude={"request_key"}),
        }
    )
    old = db.scalar(
        select(ProductionEvent).where(ProductionEvent.operation_key == data.request_key)
    )
    if old:
        if old.request_hash != fingerprint:
            inv.fail(
                "IDEMPOTENCY_CONFLICT",
                "This stage operation key belongs to different data",
            )
        return old
    stage = inv.locked(db, ProductionStage, identity)
    order = inv.locked(db, ProductionOrder, stage.order_id)
    if order.status not in {"DRAFT", "ACTIVE"}:
        inv.fail("PRODUCTION_CLOSED", "Only active production can progress")
    active(db, Supplier, stage.supplier_id)
    item = inv.quantity(db, order.item_id, data.quantity, data.lot_id)
    progress = flow(db, stage, data.lot_id, True)
    stages = db.scalars(
        select(ProductionStage)
        .where(ProductionStage.order_id == order.id)
        .order_by(ProductionStage.sequence)
    ).all()
    destination = None
    stock = None
    receipt = None
    if action == "start":
        if (
            stage.sequence != 1
            or flow(db, stage)["entered"] + data.quantity > order.quantity
        ):
            inv.fail(
                "START_QUANTITY",
                "Start only unstarted quantity at the first planned stage",
            )
        if order.ownership == "AMBS":
            if not data.source_id:
                inv.fail(
                    "SOURCE_REQUIRED",
                    "Identify actual owned stock to send to production",
                    422,
                )
            if unallocated(db, item.id, data.source_id, data.lot_id) < data.quantity:
                inv.fail(
                    "PRODUCTION_STOCK_HELD",
                    "Insufficient unallocated owned stock for this production plan",
                )
            if data.source_id != stage.location_id:
                stock = ("CUSTODY_TRANSFER", data.source_id, stage.location_id)
        kind = "START"
        order.status = "ACTIVE"
    elif action == "complete":
        if data.quantity > progress["in_process"]:
            inv.fail(
                "EXCESS_COMPLETION",
                "Completion exceeds quantity actually entered at this stage",
            )
        kind = "COMPLETE"
    elif action == "transfer":
        authorize(db, ctx, "production.transfers.post")
        if data.quantity > progress["ready"] or stage == stages[-1]:
            inv.fail(
                "STAGE_NOT_READY",
                "Only completed quantity can advance to the next planned stage",
            )
        destination = stages[stage.sequence]
        active(db, Supplier, destination.supplier_id)
        if order.ownership == "AMBS" and stage.location_id != destination.location_id:
            stock = ("CUSTODY_TRANSFER", stage.location_id, destination.location_id)
        kind = "TRANSFER"
    elif action == "yard":
        authorize(db, ctx, "production.transfers.post")
        if stage != stages[-1] or data.quantity > progress["ready"]:
            inv.fail("YARD_NOT_READY", "Receive only completed final-stage quantities")
        loc = inv.location(db, data.location_id) if data.location_id else None
        if not loc or loc.kind not in {"USABLE", "QUARANTINE", "DAMAGED", "REJECTED"}:
            inv.fail(
                "YARD_LOCATION", "Choose the actual internal receiving disposition", 422
            )
        if order.ownership == "AMBS":
            stock = ("CUSTODY_TRANSFER", stage.location_id, loc.id)
        else:
            pol = get_record(db, OrderLine, order.purchase_order_line_id)
            receipt = create_receipt(
                db,
                ctx,
                ReceiptInput(
                    request_key=data.request_key,
                    order_id=pol.order_id,
                    received_at=utcnow(),
                    reason=data.reason,
                    source_reference=order.code,
                    lines=[
                        {
                            "order_line_id": pol.id,
                            "quantity": data.quantity,
                            "location_id": loc.id,
                            "lot_id": data.lot_id,
                        }
                    ],
                ),
                production_internal=True,
            )
            post_receipt(
                db,
                ctx,
                receipt.id,
                Operation(request_key=data.request_key, reason=data.reason),
                production_internal=True,
            )
        kind = "YARD"
    else:
        inv.fail("INVALID_ACTION", "Unknown production stage action", 404)
    movement = None
    if stock:
        authorize(db, ctx, "inventory.transfers.post")
        line = LineInput(
            item_id=item.id,
            unit_id=item.unit_id,
            quantity=data.quantity,
            source_id=stock[1],
            destination_id=stock[2],
            lot_id=data.lot_id,
        )
        movement = stock_document(
            db, ctx, stock[0], [line], data.request_key, data.reason, order.code
        )
    event = ProductionEvent(
        stage_id=stage.id,
        kind=kind,
        quantity=data.quantity,
        destination_stage_id=destination.id if destination else None,
        movement_id=movement.id if movement else None,
        receipt_id=receipt.id if receipt else None,
        lot_id=data.lot_id,
        actor_id=ctx.user.id,
        reason=data.reason,
        operation_key=data.request_key,
        request_hash=fingerprint,
    )
    db.add(event)
    db.flush()
    if movement:
        inv.post_movement(
            db,
            ctx,
            movement.id,
            Operation(request_key=data.request_key, reason=data.reason),
            internal=True,
        )
    if (
        action == "yard"
        and sum((flow(db, s)["yard_received"] for s in stages), ZERO) == order.quantity
    ):
        order.status = "COMPLETED"
        order.completed_at = utcnow()
    order.updated_at = utcnow()
    audit(
        db,
        ctx,
        order,
        f"production_{action}",
        ["stage", "quantity", "custody"],
        data.reason,
    )
    db.flush()
    return event


def convert(db, ctx, data):
    inv.lock_inventory(db)
    authorize(db, ctx, "production.convert")
    authorize(db, ctx, "inventory.adjustments.post")
    fingerprint = inv.digest(data.model_dump(exclude={"request_key"}))
    old = db.scalar(
        select(ProductionConversion).where(
            ProductionConversion.request_key == data.request_key
        )
    )
    if old:
        if old.request_hash != fingerprint:
            inv.fail(
                "IDEMPOTENCY_CONFLICT",
                "Conversion key belongs to different measurements",
            )
        return old
    requested = {}
    for line in data.inputs:
        if not line.source_id or line.destination_id or line.unit_cost is not None:
            inv.fail(
                "CONVERSION_INPUT",
                "Inputs must identify measured consumed stock without an invented input cost",
                422,
            )
        bucket_key = (line.item_id, line.source_id, line.lot_id)
        requested[bucket_key] = requested.get(bucket_key, ZERO) + line.quantity
        if unallocated(db, *bucket_key) < requested[bucket_key]:
            inv.fail(
                "CONVERSION_CUSTODY",
                "Inputs are unavailable or allocated to active production",
            )
    for line in data.outputs:
        if line.source_id or not line.destination_id or line.unit_cost is not None:
            inv.fail(
                "CONVERSION_OUTPUT",
                "Record measured outputs with unknown cost pending an approved allocation",
                422,
            )
    incoming = stock_document(
        db,
        ctx,
        "PRODUCTION_INPUT",
        data.inputs,
        data.request_key,
        data.reason,
        data.approved_reference,
    )
    inv.post_movement(
        db,
        ctx,
        incoming.id,
        Operation(request_key=data.request_key, reason=data.reason),
        internal=True,
    )
    output_key = uuid.uuid5(data.request_key, "measured-output")
    outgoing = stock_document(
        db,
        ctx,
        "PRODUCTION_OUTPUT",
        data.outputs,
        output_key,
        data.reason,
        data.approved_reference,
    )
    inv.post_movement(
        db,
        ctx,
        outgoing.id,
        Operation(request_key=output_key, reason=data.reason),
        internal=True,
    )
    row = ProductionConversion(
        input_movement_id=incoming.id,
        output_movement_id=outgoing.id,
        reason=data.reason,
        approved_reference=data.approved_reference,
        actor_id=ctx.user.id,
        request_key=data.request_key,
        request_hash=fingerprint,
    )
    db.add(row)
    db.flush()
    audit(
        db,
        ctx,
        row,
        "measured_conversion",
        ["inputs", "outputs", "unallocated_cost"],
        data.reason,
    )
    return row
