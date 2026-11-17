"""Transactional stock engine. Callers commit mutations and audit events together."""

import hashlib
import json
import uuid
from datetime import timedelta
from decimal import Decimal, ROUND_HALF_EVEN, getcontext
from sqlalchemy import delete, func, select, text
from sqlalchemy.dialects.postgresql import insert
from app.core.security import SecurityError, deny, utcnow
from app.models.master import Item, Unit
from app.models.inventory import (
    CountLine,
    InventoryPolicy,
    LedgerEffect,
    Location,
    MovementLine,
    Reservation,
    StockBalance,
    StockCount,
    StockLot,
    StockMovement,
    Warehouse,
)
from app.services.master import get_record, output, record_audit

ZERO = Decimal("0")
MONEY_STEP = Decimal("0.000000000001")
INVENTORY_LOCK = 7140284202
COST_FIELDS = {
    "unit_cost",
    "stock_value",
    "average_cost",
    "value_delta",
    "currency",
    "cost_complete",
    "valuation",
    "incomplete_cost_buckets",
}


def fail(code, message, status=409):
    raise SecurityError(status, code, message)


def lock_inventory(db):
    # A conservative cross-worker posting gate, in addition to bucket row locks.
    # It also protects serial identity across locations and safe metadata changes.
    getcontext().prec = 60
    db.execute(text("SELECT pg_advisory_xact_lock(:key)"), {"key": INVENTORY_LOCK})


def authorize(db, context, permission):
    if permission not in context.permissions:
        deny(
            db,
            403,
            "PERMISSION_DENIED",
            "You do not have permission for this inventory action",
            context.user,
            details={"permission": permission},
        )


def public(value, context):
    if isinstance(value, list):
        return [public(entry, context) for entry in value]
    if isinstance(value, dict):
        return {
            key: public(entry, context)
            for key, entry in value.items()
            if key not in {"request_hash", "create_key", "post_key", "close_key"}
            and (
                "inventory.costs.read" in context.permissions or key not in COST_FIELDS
            )
        }
    return value


def digest(data):
    def canonical(value):
        if isinstance(value, Decimal):
            return format(value.normalize(), "f")
        if isinstance(value, dict):
            return {key: canonical(val) for key, val in value.items()}
        if isinstance(value, list):
            return [canonical(val) for val in value]
        return (
            str(value)
            if isinstance(value, uuid.UUID)
            else value.isoformat()
            if hasattr(value, "isoformat")
            else value
        )

    return hashlib.sha256(
        json.dumps(canonical(data), sort_keys=True, separators=(",", ":")).encode()
    ).hexdigest()


def identified(model, prefix, actor, **values):
    identity = uuid.uuid4()
    return model(
        id=identity,
        code=f"{prefix}-{identity.hex.upper()}",
        created_by=actor.id,
        **values,
    )


def locked(db, model, identity):
    record = db.scalar(select(model).where(model.id == identity).with_for_update())
    if record is None:
        fail("INVENTORY_NOT_FOUND", "Inventory record was not found", 404)
    return record


def location(db, identity):
    result = get_record(db, Location, identity)
    if (
        not result.is_active
        or not get_record(db, Warehouse, result.warehouse_id).is_active
    ):
        fail(
            "INACTIVE_LOCATION",
            "Reactivate the warehouse/location before posting stock",
            422,
        )
    return result


def tracking(db, item_id):
    policy = db.get(InventoryPolicy, item_id)
    return policy.tracking_mode if policy else "NONE"


def quantity(db, item_id, amount, lot_id=None, allow_zero=False):
    item = get_record(db, Item, item_id)
    unit = get_record(db, Unit, item.unit_id)
    amount = Decimal(amount)
    if (
        amount < 0
        or (not allow_zero and amount == 0)
        or amount != amount.quantize(Decimal(1).scaleb(-unit.decimal_places))
    ):
        fail(
            "INVALID_QUANTITY",
            f"Quantity must respect the unit's {unit.decimal_places} decimal places",
            422,
        )
    mode = tracking(db, item.id)
    if mode == "NONE" and lot_id is not None:
        fail("TRACKING_NOT_ENABLED", "This item does not use lot/serial tracking", 422)
    if mode != "NONE":
        if lot_id is None:
            fail("LOT_REQUIRED", "Select a registered lot or serial for this item", 422)
        lot = get_record(db, StockLot, lot_id)
        if lot.item_id != item.id or lot.is_serial != (mode == "SERIAL"):
            fail(
                "LOT_ITEM_MISMATCH",
                "Lot/serial must belong to this item and tracking mode",
                422,
            )
        if mode == "SERIAL" and amount not in (
            [ZERO, Decimal(1)] if allow_zero else [Decimal(1)]
        ):
            fail("SERIAL_QUANTITY", "A serial identifies exactly one piece", 422)
    return item


def bucket(db, item_id, location_id, lot_id=None):
    db.execute(
        insert(StockBalance)
        .values(
            id=uuid.uuid4(), item_id=item_id, location_id=location_id, lot_id=lot_id
        )
        .on_conflict_do_nothing(constraint="uq_stock_bucket")
    )
    return db.scalar(
        select(StockBalance)
        .where(
            StockBalance.item_id == item_id,
            StockBalance.location_id == location_id,
            StockBalance.lot_id == lot_id,
        )
        .with_for_update()
    )


def allocatable(db, balance):
    item = get_record(db, Item, balance.item_id)
    loc = get_record(db, Location, balance.location_id)
    warehouse = get_record(db, Warehouse, loc.warehouse_id)
    lot = db.get(StockLot, balance.lot_id) if balance.lot_id else None
    return (
        item.is_active
        and loc.is_active
        and warehouse.is_active
        and loc.kind == "USABLE"
        and (not lot or (lot.is_active and lot.status == "ACTIVE"))
    )


def available(db, balance):
    return balance.on_hand - balance.reserved if allocatable(db, balance) else ZERO


def movement_permissions(kind):
    if kind in {"RECEIPT", "RETURN", "PURCHASE_RECEIPT"}:
        return "receipts"
    if kind == "ISSUE":
        return "issues"
    if kind in {"ADJUSTMENT_IN", "ADJUSTMENT_OUT", "COUNT_ADJUSTMENT"}:
        return "adjustments"
    return "transfers"


def movement_authorize(db, context, kind, action):
    category = movement_permissions(kind)
    authorize(
        db,
        context,
        f"inventory.{category}.{'post' if category == 'adjustments' else action}",
    )
    if kind in {"DAMAGE", "QUARANTINE_TRANSFER", "INSPECTION_RELEASE"}:
        authorize(db, context, "inventory.quality.manage")


def validate_line(db, kind, line):
    item = quantity(db, line.item_id, line.quantity, line.lot_id)
    if not item.is_active:
        fail(
            "INACTIVE_ITEM",
            "Reactivate this item before recording new stock transactions",
            422,
        )
    if line.unit_id != item.unit_id:
        fail("UNIT_MISMATCH", "Use the item's configured unit of measure", 422)
    source = location(db, line.source_id) if line.source_id else None
    destination = location(db, line.destination_id) if line.destination_id else None
    if kind == "PURCHASE_RECEIPT" and (source or not destination):
        fail("INVALID_DIRECTION", "Purchasing receiving requires a destination", 422)
    if kind == "CUSTODY_TRANSFER" and (
        not source
        or not destination
        or not any(loc.kind == "EXTERNAL" for loc in [source, destination])
    ):
        fail(
            "CUSTODY_DIRECTION",
            "Custody transfers require an external source or destination",
            422,
        )
    if any(
        loc and loc.kind == "EXTERNAL" for loc in [source, destination]
    ) and kind not in {
        "CUSTODY_TRANSFER",
        "PURCHASE_RECEIPT",
        "PRODUCTION_INPUT",
        "PRODUCTION_OUTPUT",
    }:
        fail(
            "CUSTODY_WORKFLOW_REQUIRED",
            "Use the authorized production custody workflow for external stock",
            422,
        )
    if kind == "PRODUCTION_INPUT" and (not source or destination):
        fail("CONVERSION_INPUT", "Conversion inputs require a source only", 422)
    if kind == "PRODUCTION_OUTPUT" and (source or not destination):
        fail("CONVERSION_OUTPUT", "Conversion outputs require a destination only", 422)
    if source and destination and source.id == destination.id:
        fail("SAME_LOCATION", "Source and destination must differ", 422)
    if kind in {"RECEIPT", "ADJUSTMENT_IN", "RETURN"} and (source or not destination):
        fail("INVALID_DIRECTION", "This movement requires a destination only", 422)
    if kind in {"ISSUE", "ADJUSTMENT_OUT"} and (not source or destination):
        fail("INVALID_DIRECTION", "This movement requires a source only", 422)
    if kind in {"TRANSFER", "DAMAGE", "QUARANTINE_TRANSFER", "INSPECTION_RELEASE"} and (
        not source or not destination
    ):
        fail("INVALID_DIRECTION", "Select source and destination locations", 422)
    if kind == "RECEIPT" and destination.kind != "USABLE":
        fail(
            "RECEIPT_LOCATION",
            "Ordinary receipts require a usable location; use Return for uninspected returns",
            422,
        )
    if kind == "RETURN" and destination.kind != "QUARANTINE":
        fail(
            "RETURN_QUARANTINE",
            "Returned goods must enter quarantine for inspection",
            422,
        )
    if kind == "TRANSFER" and (source.kind != "USABLE" or destination.kind != "USABLE"):
        fail(
            "QUALITY_ACTION_REQUIRED",
            "Use an explicit damage, quarantine or inspection action for non-usable stock",
            422,
        )
    if kind == "DAMAGE" and (source.kind != "USABLE" or destination.kind != "DAMAGED"):
        fail("DAMAGE_LOCATION", "Damage moves usable stock to a damaged location", 422)
    if kind == "QUARANTINE_TRANSFER" and destination.kind not in {
        "QUARANTINE",
        "REJECTED",
    }:
        fail(
            "QUARANTINE_LOCATION",
            "Select a quarantine or rejected-stock destination",
            422,
        )
    if kind == "INSPECTION_RELEASE" and (
        source.kind == "USABLE" or destination.kind != "USABLE"
    ):
        fail(
            "INSPECTION_LOCATION",
            "Inspect non-usable stock before moving it to a usable location",
            422,
        )
    if line.unit_cost is not None and kind not in {
        "RECEIPT",
        "RETURN",
        "ADJUSTMENT_IN",
        "PURCHASE_RECEIPT",
    }:
        fail(
            "DERIVED_COST", "Issue/transfer costs are derived from recorded stock", 422
        )


def movement_view(db, movement):
    result = output(movement)
    result["lines"] = []
    for line in db.scalars(
        select(MovementLine)
        .where(MovementLine.movement_id == movement.id)
        .order_by(MovementLine.id)
    ):
        row = output(line)
        row["item_name"] = get_record(db, Item, line.item_id).name
        row["unit_name"] = get_record(db, Unit, line.unit_id).name
        row["source_name"] = (
            db.get(Location, line.source_id).name if line.source_id else None
        )
        row["destination_name"] = (
            db.get(Location, line.destination_id).name if line.destination_id else None
        )
        row["lot_identifier"] = (
            db.get(StockLot, line.lot_id).identifier if line.lot_id else None
        )
        row["effects"] = [
            output(effect)
            for effect in db.scalars(
                select(LedgerEffect).where(LedgerEffect.line_id == line.id)
            )
        ]
        result["lines"].append(row)
    return result


def create_movement(db, context, data):
    lock_inventory(db)
    movement_authorize(db, context, data.kind, "create")
    values = data.model_dump()
    key = values.pop("request_key")
    values.pop("version", None)
    fingerprint = digest(values)
    previous = db.scalar(select(StockMovement).where(StockMovement.create_key == key))
    if previous:
        if previous.request_hash != fingerprint:
            fail(
                "IDEMPOTENCY_CONFLICT",
                "This request key was already used for different movement data",
            )
        return previous
    for line in data.lines:
        validate_line(db, data.kind, line)
    values.pop("lines")
    movement = identified(
        StockMovement,
        "MOV",
        context.user,
        create_key=key,
        request_hash=fingerprint,
        **values,
    )
    db.add(movement)
    db.flush()
    for line in data.lines:
        db.add(MovementLine(movement_id=movement.id, **line.model_dump()))
    record_audit(
        db, context, "inventory.movements", movement, "created", ["kind", "lines"]
    )
    db.flush()
    return movement


def edit_movement(db, context, movement_id, data):
    lock_inventory(db)
    movement = locked(db, StockMovement, movement_id)
    movement_authorize(db, context, movement.kind, "create")
    movement_authorize(db, context, data.kind, "create")
    if movement.status != "DRAFT":
        fail("IMMUTABLE_MOVEMENT", "Only draft movements can be edited")
    if data.version != movement.version:
        fail("STALE_DRAFT", "This draft changed. Reload before editing")
    for line in data.lines:
        validate_line(db, data.kind, line)
    db.execute(delete(MovementLine).where(MovementLine.movement_id == movement.id))
    for key, value in data.model_dump(exclude={"lines", "version"}).items():
        setattr(movement, key, value)
    for line in data.lines:
        db.add(MovementLine(movement_id=movement.id, **line.model_dump()))
    movement.version += 1
    record_audit(db, context, "inventory.movements", movement, "updated", ["draft"])
    db.flush()
    return movement


def apply_effect(db, balance, line, delta, value_delta=None, currency=None):
    if delta < 0 and get_record(db, Location, balance.location_id).kind == "EXTERNAL":
        from app.services.purchasing import claimed

        if balance.on_hand + delta - balance.reserved < claimed(
            db, balance.item_id, balance.location_id, balance.lot_id
        ):
            fail(
                "PRODUCTION_CUSTODY_HELD",
                "This stock is held by active production; reconcile the production reference before correcting custody",
            )
    if balance.on_hand + delta >= Decimal("100000000000000") or (
        value_delta is not None and abs(value_delta) >= Decimal("1000000000000000000")
    ):
        fail(
            "STOCK_RANGE",
            "This quantity or valuation exceeds the supported numeric range",
            422,
        )
    if balance.on_hand + delta < balance.reserved:
        fail(
            "INSUFFICIENT_STOCK",
            "Insufficient unreserved physical stock for this movement",
        )
    old_quantity = balance.on_hand
    new_quantity = old_quantity + delta
    if old_quantity == 0 and delta > 0:
        balance.cost_complete = value_delta is not None
        balance.stock_value = value_delta
        balance.currency = currency if value_delta is not None else None
    elif (
        balance.cost_complete
        and value_delta is not None
        and balance.currency == currency
    ):
        new_value = (balance.stock_value + value_delta).quantize(
            MONEY_STEP, rounding=ROUND_HALF_EVEN
        )
        if new_value >= Decimal("1000000000000000000"):
            fail("STOCK_RANGE", "Valuation exceeds the supported numeric range", 422)
        if new_value < 0:
            fail(
                "REVERSAL_COST_CONFLICT",
                "This correction would make the recorded cost negative; review its later movements",
            )
        balance.stock_value = new_value
    else:
        balance.stock_value, balance.currency, balance.cost_complete = None, None, False
    balance.on_hand = new_quantity
    balance.version += 1
    if new_quantity == 0:
        balance.stock_value, balance.currency, balance.cost_complete = ZERO, None, True
    db.add(
        LedgerEffect(
            line_id=line.id,
            balance_id=balance.id,
            quantity_delta=delta,
            value_delta=value_delta,
            currency=currency,
        )
    )


def post_movement(db, context, movement_id, operation, internal=False):
    lock_inventory(db)
    movement = locked(db, StockMovement, movement_id)
    if not internal:
        movement_authorize(db, context, movement.kind, "post")
    if (
        movement.status in {"POSTED", "REVERSED"}
        and movement.post_key == operation.request_key
    ):
        return movement
    if movement.status != "DRAFT":
        fail("ALREADY_POSTED", "This movement is no longer a draft")
    if movement.occurred_at > utcnow() + timedelta(minutes=5):
        fail(
            "FUTURE_RECEIPT",
            "Physical stock cannot be posted with a future movement time",
            422,
        )
    if db.scalar(
        select(StockMovement.id).where(StockMovement.post_key == operation.request_key)
    ):
        fail("IDEMPOTENCY_CONFLICT", "This posting key was already used")
    lines = db.scalars(
        select(MovementLine)
        .where(MovementLine.movement_id == movement.id)
        .order_by(MovementLine.id)
    ).all()
    if not lines:
        fail("EMPTY_MOVEMENT", "Add at least one movement line", 422)
    buckets = {}
    for item_id, loc_id, lot_id in sorted(
        {
            (line.item_id, loc, line.lot_id)
            for line in lines
            for loc in [line.source_id, line.destination_id]
            if loc
        },
        key=lambda entry: tuple(str(value) for value in entry),
    ):
        buckets[(item_id, loc_id, lot_id)] = bucket(db, item_id, loc_id, lot_id)
    for line in lines:
        if movement.kind not in {"REVERSAL", "COUNT_ADJUSTMENT"}:
            validate_line(db, movement.kind, line)
        else:
            quantity(db, line.item_id, line.quantity, line.lot_id)
            for loc_id in [line.source_id, line.destination_id]:
                if loc_id:
                    location(db, loc_id)
        if (
            movement.kind == "ISSUE"
            and get_record(db, Location, line.source_id).kind != "USABLE"
        ):
            authorize(db, context, "inventory.quality.manage")
        source = buckets.get((line.item_id, line.source_id, line.lot_id))
        destination = buckets.get((line.item_id, line.destination_id, line.lot_id))
        if movement.kind == "CUSTODY_TRANSFER" and any(
            get_record(db, Location, loc).kind not in {"USABLE", "EXTERNAL"}
            for loc in [line.source_id, line.destination_id]
            if loc
        ):
            authorize(db, context, "inventory.quality.manage")
        cost, currency = None, None
        if source:
            if source.on_hand - source.reserved < line.quantity:
                fail(
                    "INSUFFICIENT_STOCK",
                    "Insufficient unreserved stock; release or consume the relevant reservation",
                )
            if source.cost_complete and source.currency:
                cost = (
                    source.stock_value
                    if line.quantity == source.on_hand
                    else (source.stock_value * line.quantity / source.on_hand).quantize(
                        MONEY_STEP, rounding=ROUND_HALF_EVEN
                    )
                )
                currency = source.currency
            if not internal and movement.kind not in {
                "RECEIPT",
                "RETURN",
                "ADJUSTMENT_IN",
            }:
                line.unit_cost = (
                    (cost / line.quantity).quantize(MONEY_STEP)
                    if cost is not None
                    else None
                )
                line.currency = currency
            apply_effect(
                db,
                source,
                line,
                -line.quantity,
                -cost if cost is not None else None,
                currency,
            )
        elif line.unit_cost is not None:
            cost, currency = (
                (line.unit_cost * line.quantity).quantize(MONEY_STEP),
                line.currency,
            )
        if destination:
            apply_effect(db, destination, line, line.quantity, cost, currency)
    db.flush()
    for lot_id in {line.lot_id for line in lines if line.lot_id}:
        lot = get_record(db, StockLot, lot_id)
        if (
            lot.is_serial
            and db.scalar(
                select(func.coalesce(func.sum(StockBalance.on_hand), 0)).where(
                    StockBalance.lot_id == lot.id
                )
            )
            > 1
        ):
            fail("SERIAL_ALREADY_ON_HAND", "This serial is already recorded in stock")
    movement.status, movement.post_key, movement.posted_by, movement.posted_at = (
        "POSTED",
        operation.request_key,
        context.user.id,
        utcnow(),
    )
    movement.version += 1
    record_audit(
        db, context, "inventory.movements", movement, "posted", ["ledger", "balances"]
    )
    db.flush()
    return movement


def reverse_movement(db, context, movement_id, operation, *, purchasing_internal=False, sales_internal=False):
    lock_inventory(db)
    from app.models.sales import SalesConsumption
    if not sales_internal and db.scalar(select(SalesConsumption.id).where(SalesConsumption.movement_id == movement_id)):
        fail("SALES_REVERSAL_REQUIRED", "Reverse this issue through its delivery after confirming the physical return")
    from app.models.purchasing import (
        PurchaseReceipt,
        ProductionEvent,
        ProductionConversion,
    )

    if not purchasing_internal and (
        db.scalar(
            select(PurchaseReceipt.id).where(PurchaseReceipt.movement_id == movement_id)
        )
        or db.scalar(
            select(ProductionEvent.id).where(ProductionEvent.movement_id == movement_id)
        )
        or db.scalar(
            select(ProductionConversion.id).where(
                (ProductionConversion.input_movement_id == movement_id)
                | (ProductionConversion.output_movement_id == movement_id)
            )
        )
    ):
        fail(
            "BUSINESS_CORRECTION_REQUIRED",
            "Correct this linked movement through its purchasing/production workflow",
        )
    authorize(db, context, "inventory.movements.reverse")
    original = locked(db, StockMovement, movement_id)
    previous = db.scalar(
        select(StockMovement).where(StockMovement.reverses_id == original.id)
    )
    if previous:
        if previous.post_key == operation.request_key:
            return previous
        fail("ALREADY_REVERSED", "This movement already has a compensating reversal")
    if original.status != "POSTED" or original.kind == "REVERSAL":
        fail("NOT_REVERSIBLE", "Only a posted original movement can be reversed")
    if db.scalar(
        select(StockMovement.id).where(
            (StockMovement.post_key == operation.request_key)
            | (StockMovement.create_key == operation.request_key)
        )
    ):
        fail("IDEMPOTENCY_CONFLICT", "This reversal key was already used")
    reversal = identified(
        StockMovement,
        "MOV",
        context.user,
        kind="REVERSAL",
        status="DRAFT",
        reason=operation.reason,
        source_reference=original.code,
        occurred_at=utcnow(),
        create_key=operation.request_key,
        request_hash=digest({"original": original.id}),
        reverses_id=original.id,
    )
    db.add(reversal)
    db.flush()
    effects = db.execute(
        select(LedgerEffect, MovementLine)
        .join(MovementLine, MovementLine.id == LedgerEffect.line_id)
        .where(MovementLine.movement_id == original.id)
        .order_by(LedgerEffect.balance_id)
    ).all()
    for effect, old_line in effects:
        old_balance = locked(db, StockBalance, effect.balance_id)
        location(db, old_balance.location_id)
        delta = -effect.quantity_delta
        line = MovementLine(
            movement_id=reversal.id,
            item_id=old_line.item_id,
            unit_id=old_line.unit_id,
            quantity=abs(delta),
            lot_id=old_line.lot_id,
            source_id=old_balance.location_id if delta < 0 else None,
            destination_id=old_balance.location_id if delta > 0 else None,
            unit_cost=old_line.unit_cost,
            currency=old_line.currency,
        )
        db.add(line)
        db.flush()
        apply_effect(
            db,
            old_balance,
            line,
            delta,
            -effect.value_delta if effect.value_delta is not None else None,
            effect.currency,
        )
    db.flush()
    for line in db.scalars(
        select(MovementLine).where(
            MovementLine.movement_id == reversal.id, MovementLine.lot_id.is_not(None)
        )
    ):
        lot = get_record(db, StockLot, line.lot_id)
        if (
            lot.is_serial
            and db.scalar(
                select(func.sum(StockBalance.on_hand)).where(
                    StockBalance.lot_id == lot.id
                )
            )
            > 1
        ):
            fail("SERIAL_ALREADY_ON_HAND", "Reversal would duplicate a serial")
    reversal.status, reversal.post_key, reversal.posted_at, reversal.posted_by = (
        "POSTED",
        operation.request_key,
        utcnow(),
        context.user.id,
    )
    db.flush()
    original.status = "REVERSED"
    record_audit(
        db,
        context,
        "inventory.movements",
        reversal,
        "reversed",
        ["compensating_effects"],
    )
    db.flush()
    return reversal


def create_reservation(db, context, data):
    lock_inventory(db)
    fingerprint = digest(data.model_dump(exclude={"request_key"}))
    previous = db.scalar(
        select(Reservation).where(Reservation.create_key == data.request_key)
    )
    if previous:
        if previous.request_hash != fingerprint:
            fail(
                "IDEMPOTENCY_CONFLICT",
                "Reservation key already belongs to different data",
            )
        return previous
    quantity(db, data.item_id, data.quantity, data.lot_id)
    location(db, data.location_id)
    balance = bucket(db, data.item_id, data.location_id, data.lot_id)
    if available(db, balance) < data.quantity:
        fail(
            "INSUFFICIENT_AVAILABLE",
            "Insufficient usable, unreserved stock for this reservation",
        )
    balance.reserved += data.quantity
    reservation = identified(
        Reservation,
        "RES",
        context.user,
        balance_id=balance.id,
        quantity=data.quantity,
        reason=data.reason,
        source_reference=data.source_reference,
        create_key=data.request_key,
        request_hash=fingerprint,
    )
    db.add(reservation)
    record_audit(
        db, context, "inventory.reservations", reservation, "created", ["reserved"]
    )
    db.flush()
    return reservation


def close_reservation(db, context, identity, action, operation, *, sales_internal=False, source_reference=None):
    lock_inventory(db)
    from app.models.sales import SalesReservationLink
    if not sales_internal and db.get(SalesReservationLink, identity):
        fail("SALES_ALLOCATION_REQUIRED", "Manage this reservation through its customer order or delivery")
    reservation = locked(db, Reservation, identity)
    status = {"release": "RELEASED", "cancel": "CANCELLED", "consume": "CONSUMED"}[
        action
    ]
    if reservation.status == status and reservation.close_key == operation.request_key:
        return reservation
    if reservation.status != "ACTIVE":
        fail(
            "RESERVATION_CLOSED",
            "This reservation was already released, cancelled or consumed",
        )
    balance = locked(db, StockBalance, reservation.balance_id)
    if action == "consume" and not allocatable(db, balance):
        fail(
            "STOCK_NOT_USABLE",
            "Reserved stock is no longer usable; review or release the hold",
        )
    balance.reserved -= reservation.quantity
    if action == "consume":
        authorize(db, context, "inventory.issues.post")
        item = get_record(db, Item, balance.item_id)
        movement = identified(
            StockMovement,
            "MOV",
            context.user,
            kind="ISSUE",
            status="DRAFT",
            reason=operation.reason,
            source_reference=source_reference or reservation.code,
            occurred_at=utcnow(),
            create_key=operation.request_key,
            request_hash=digest({"reservation": reservation.id}),
        )
        db.add(movement)
        db.flush()
        db.add(
            MovementLine(
                movement_id=movement.id,
                item_id=item.id,
                unit_id=item.unit_id,
                quantity=reservation.quantity,
                source_id=balance.location_id,
                lot_id=balance.lot_id,
            )
        )
        db.flush()
        post_movement(db, context, movement.id, operation)
        reservation.consumed_movement_id = movement.id
    (
        reservation.status,
        reservation.close_key,
        reservation.updated_at,
        reservation.released_at,
    ) = status, operation.request_key, utcnow(), utcnow()
    record_audit(
        db,
        context,
        "inventory.reservations",
        reservation,
        action,
        ["reserved", "status"],
        reason=operation.reason,
    )
    db.flush()
    return reservation


def count_view(db, count):
    result = output(count)
    result["lines"] = []
    for line in db.scalars(
        select(CountLine).where(CountLine.count_id == count.id).order_by(CountLine.id)
    ):
        row = output(line)
        balance = get_record(db, StockBalance, line.balance_id)
        row.update(
            item_id=str(balance.item_id),
            lot_id=str(balance.lot_id) if balance.lot_id else None,
            item_name=get_record(db, Item, balance.item_id).name,
            unit_name=get_record(
                db, Unit, get_record(db, Item, balance.item_id).unit_id
            ).name,
            variance=str(line.counted_quantity - line.expected_quantity)
            if line.counted_quantity is not None
            else None,
        )
        result["lines"].append(row)
    return result


def create_count(db, context, data):
    lock_inventory(db)
    fingerprint = digest(data.model_dump(exclude={"request_key"}))
    previous = db.scalar(
        select(StockCount).where(StockCount.create_key == data.request_key)
    )
    if previous:
        if previous.request_hash != fingerprint:
            fail("IDEMPOTENCY_CONFLICT", "Count key already belongs to different data")
        return previous
    location(db, data.location_id)
    scope = {(line.item_id, line.lot_id) for line in data.lines}
    if len(scope) != len(data.lines):
        fail("DUPLICATE_COUNT_ITEM", "Select each item/lot only once", 422)
    count = identified(
        StockCount,
        "CNT",
        context.user,
        location_id=data.location_id,
        reason=data.reason,
        create_key=data.request_key,
        request_hash=fingerprint,
    )
    db.add(count)
    db.flush()
    for item_id, lot_id in sorted(scope, key=str):
        quantity(db, item_id, ZERO, lot_id, allow_zero=True)
        balance = bucket(db, item_id, data.location_id, lot_id)
        db.add(
            CountLine(
                count_id=count.id,
                balance_id=balance.id,
                expected_quantity=balance.on_hand,
                stock_version=balance.version,
            )
        )
    record_audit(
        db, context, "inventory.counts", count, "created", ["scope", "snapshot"]
    )
    db.flush()
    return count


def record_count(db, context, identity, data):
    lock_inventory(db)
    count = locked(db, StockCount, identity)
    if count.status not in {"DRAFT", "IN_PROGRESS", "REVIEW"}:
        fail("COUNT_CLOSED", "This count is no longer editable")
    lines = {
        line.id: line
        for line in db.scalars(select(CountLine).where(CountLine.count_id == count.id))
    }
    if set(lines) != {line.line_id for line in data.lines} or len(lines) != len(
        data.lines
    ):
        fail("COUNT_SCOPE", "Record each scoped count line exactly once", 422)
    for entry in data.lines:
        line = lines[entry.line_id]
        balance = get_record(db, StockBalance, line.balance_id)
        quantity(
            db, balance.item_id, entry.counted_quantity, balance.lot_id, allow_zero=True
        )
        line.counted_quantity, line.reason = entry.counted_quantity, entry.reason
    count.status, count.counted_by, count.updated_at = (
        "REVIEW",
        context.user.id,
        utcnow(),
    )
    record_audit(
        db, context, "inventory.counts", count, "recorded", ["counted_quantity"]
    )
    db.flush()
    return count


def recount(db, context, identity):
    lock_inventory(db)
    count = locked(db, StockCount, identity)
    if count.status in {"POSTED", "CANCELLED"}:
        fail("COUNT_CLOSED", "A closed count cannot be recounted")
    for line in db.scalars(
        select(CountLine)
        .where(CountLine.count_id == count.id)
        .order_by(CountLine.balance_id)
    ):
        balance = locked(db, StockBalance, line.balance_id)
        (
            line.expected_quantity,
            line.stock_version,
            line.counted_quantity,
            line.reason,
        ) = balance.on_hand, balance.version, None, None
    count.status, count.updated_at = "IN_PROGRESS", utcnow()
    record_audit(db, context, "inventory.counts", count, "recounted", ["snapshot"])
    db.flush()
    return count


def post_count(db, context, identity, operation):
    lock_inventory(db)
    authorize(db, context, "inventory.adjustments.post")
    count = locked(db, StockCount, identity)
    if count.status == "POSTED" and count.post_key == operation.request_key:
        return count
    if count.status != "REVIEW":
        fail("COUNT_NOT_REVIEWED", "Record all physical counts before posting")
    lines = db.scalars(
        select(CountLine)
        .where(CountLine.count_id == count.id)
        .order_by(CountLine.balance_id)
    ).all()
    adjustments = []
    for line in lines:
        balance = locked(db, StockBalance, line.balance_id)
        if balance.version != line.stock_version:
            fail(
                "COUNT_STALE",
                "Physical stock changed after the snapshot. Start a recount and record fresh measurements.",
            )
        if line.counted_quantity is None:
            fail("COUNT_INCOMPLETE", "Record every scoped physical count", 422)
        delta = line.counted_quantity - line.expected_quantity
        if delta:
            item = get_record(db, Item, balance.item_id)
            adjustments.append(
                dict(
                    item_id=item.id,
                    unit_id=item.unit_id,
                    lot_id=balance.lot_id,
                    quantity=abs(delta),
                    source_id=balance.location_id if delta < 0 else None,
                    destination_id=balance.location_id if delta > 0 else None,
                )
            )
    if adjustments:
        movement = identified(
            StockMovement,
            "MOV",
            context.user,
            kind="COUNT_ADJUSTMENT",
            status="DRAFT",
            reason=count.reason,
            source_reference=count.code,
            occurred_at=utcnow(),
            create_key=operation.request_key,
            request_hash=digest({"count": count.id}),
        )
        db.add(movement)
        db.flush()
        for values in adjustments:
            db.add(MovementLine(movement_id=movement.id, **values))
        db.flush()
        post_movement(db, context, movement.id, operation, internal=True)
        count.movement_id = movement.id
    count.status, count.post_key, count.posted_by, count.posted_at, count.updated_at = (
        "POSTED",
        operation.request_key,
        context.user.id,
        utcnow(),
        utcnow(),
    )
    record_audit(
        db, context, "inventory.counts", count, "posted", ["variance", "ledger"]
    )
    db.flush()
    return count


def reconciliation(db):
    issues = []
    physical = dict(
        db.execute(
            select(
                LedgerEffect.balance_id, func.sum(LedgerEffect.quantity_delta)
            ).group_by(LedgerEffect.balance_id)
        ).all()
    )
    reserved = dict(
        db.execute(
            select(Reservation.balance_id, func.sum(Reservation.quantity))
            .where(Reservation.status == "ACTIVE")
            .group_by(Reservation.balance_id)
        ).all()
    )
    for balance in db.scalars(select(StockBalance).order_by(StockBalance.id)):
        if balance.on_hand != physical.get(
            balance.id, ZERO
        ) or balance.reserved != reserved.get(balance.id, ZERO):
            issues.append(
                {
                    "balance_id": str(balance.id),
                    "ledger_on_hand": str(physical.get(balance.id, ZERO)),
                    "cached_on_hand": str(balance.on_hand),
                    "active_reserved": str(reserved.get(balance.id, ZERO)),
                    "cached_reserved": str(balance.reserved),
                }
            )
    return {"healthy": not issues, "issues": issues}
