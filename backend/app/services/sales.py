"""Atomic order fulfillment using the existing inventory gate, holds and issues."""

import uuid
from decimal import Decimal
from sqlalchemy import select, func
from app.core.security import utcnow
from app.models.master import Customer, Project, Lpo, Item, Unit
from app.models.security import User
from app.models.inventory import StockBalance, Reservation, Location, Warehouse
from app.models.sales import (
    SalesOrder,
    SalesLine,
    SalesAmendment,
    SalesAllocation,
    SalesReservationLink,
    SalesDelivery,
    SalesDeliveryLine,
    SalesConsumption,
    SalesOperation,
)
from app.schemas.inventory import Operation, ReservationInput
from app.services import inventory as inv
from app.services.master import output, get_record, record_audit

ZERO = Decimal(0)
PERMISSIONS = {
    "create": "orders.create",
    "edit": "orders.update",
    "confirm": "orders.confirm",
    "amend": "orders.amend",
    "cancel": "orders.cancel",
    "allocate": "allocations.manage",
    "release": "allocations.manage",
    "prepare": "deliveries.prepare",
    "pick": "deliveries.pick",
    "load": "deliveries.load",
    "dispatch": "deliveries.dispatch",
    "reverse": "deliveries.reverse",
    "cancel-delivery": "deliveries.prepare",
}


def lines(db, order):
    return list(
        db.scalars(
            select(SalesLine)
            .where(SalesLine.order_id == order.id)
            .order_by(SalesLine.id)
        )
    )


def delivery_lines(db, delivery):
    return list(
        db.scalars(
            select(SalesDeliveryLine)
            .where(SalesDeliveryLine.delivery_id == delivery.id)
            .order_by(SalesDeliveryLine.id)
        )
    )


def shipped(db, line):
    return db.scalar(
        select(func.coalesce(func.sum(SalesConsumption.quantity), 0))
        .join(
            SalesDeliveryLine, SalesDeliveryLine.id == SalesConsumption.delivery_line_id
        )
        .join(SalesAllocation, SalesAllocation.id == SalesDeliveryLine.allocation_id)
        .join(SalesDelivery, SalesDelivery.id == SalesDeliveryLine.delivery_id)
        .where(SalesAllocation.line_id == line.id, SalesDelivery.status == "DISPATCHED")
    )


def held(db, line, *, usable=False):
    if usable:
        reservations = db.scalars(
            select(Reservation)
            .join(
                SalesAllocation,
                SalesAllocation.current_reservation_id == Reservation.id,
            )
            .where(SalesAllocation.line_id == line.id, Reservation.status == "ACTIVE")
        )
        return sum(
            (
                r.quantity
                for r in reservations
                if inv.allocatable(db, get_record(db, StockBalance, r.balance_id))
            ),
            ZERO,
        )
    return db.scalar(
        select(func.coalesce(func.sum(Reservation.quantity), 0))
        .join(SalesAllocation, SalesAllocation.current_reservation_id == Reservation.id)
        .where(SalesAllocation.line_id == line.id, Reservation.status == "ACTIVE")
    )


def stock(db, item_id, warehouse_id=None):
    query = select(StockBalance).join(Location, Location.id == StockBalance.location_id)
    if warehouse_id:
        query = query.where(Location.warehouse_id == warehouse_id)
    buckets = list(
        db.scalars(
            query.where(StockBalance.item_id == item_id).order_by(StockBalance.id)
        )
    )
    usable = [b for b in buckets if inv.allocatable(db, b)]
    return {
        "on_hand": str(sum((b.on_hand for b in usable), ZERO)),
        "reserved": str(sum((b.reserved for b in usable), ZERO)),
        "available": str(sum((inv.available(db, b) for b in usable), ZERO)),
    }


def view(db, order):
    result = output(order)
    result["customer_name"] = get_record(db, Customer, order.customer_id).name
    result["lines"] = []
    for line in lines(db, order):
        row = output(line)
        sent, reserved = shipped(db, line), held(db, line)
        availability = stock(db, line.item_id)
        outstanding = line.quantity - sent
        row.update(
            availability,
            dispatched=str(sent),
            allocated=str(reserved),
            outstanding=str(outstanding),
            fulfillable=str(
                min(
                    outstanding,
                    held(db, line, usable=True) + Decimal(availability["available"]),
                )
            ),
        )
        row["allocations"] = []
        for allocation in db.scalars(
            select(SalesAllocation)
            .where(SalesAllocation.line_id == line.id)
            .order_by(SalesAllocation.created_at)
        ):
            a = output(allocation)
            reservation = (
                db.get(Reservation, allocation.current_reservation_id)
                if allocation.current_reservation_id
                else None
            )
            a["remaining"] = str(
                reservation.quantity
                if reservation and reservation.status == "ACTIVE"
                else ZERO
            )
            a["history"] = [
                output(r)
                for r in db.scalars(
                    select(Reservation)
                    .join(
                        SalesReservationLink,
                        SalesReservationLink.reservation_id == Reservation.id,
                    )
                    .where(SalesReservationLink.allocation_id == allocation.id)
                    .order_by(Reservation.created_at)
                )
            ]
            row["allocations"].append(a)
        result["lines"].append(row)
    result["deliveries"] = [
        delivery_view(db, d)
        for d in db.scalars(
            select(SalesDelivery)
            .where(SalesDelivery.order_id == order.id)
            .order_by(SalesDelivery.created_at)
        )
    ]
    result["amendments"] = [
        output(a)
        for a in db.scalars(
            select(SalesAmendment)
            .where(SalesAmendment.order_id == order.id)
            .order_by(SalesAmendment.version)
        )
    ]
    return result


def delivery_view(db, delivery):
    result = output(delivery)
    result["order_code"] = get_record(db, SalesOrder, delivery.order_id).code
    result["lines"] = []
    for line in delivery_lines(db, delivery):
        row = output(line)
        allocation = get_record(db, SalesAllocation, line.allocation_id)
        order_line = get_record(db, SalesLine, allocation.line_id)
        row.update(
            item_name=order_line.item_name,
            item_id=str(order_line.item_id),
            unit_name=order_line.unit_name,
        )
        link = db.scalar(
            select(SalesReservationLink)
            .where(SalesReservationLink.allocation_id == allocation.id)
            .order_by(SalesReservationLink.parent_id.asc().nullsfirst())
        )
        reservation = get_record(db, Reservation, link.reservation_id)
        balance = get_record(db, StockBalance, reservation.balance_id)
        row.update(
            location_id=str(balance.location_id),
            location_name=get_record(db, Location, balance.location_id).name,
            lot_id=str(balance.lot_id) if balance.lot_id else None,
        )
        consumption = db.scalar(
            select(SalesConsumption).where(SalesConsumption.delivery_line_id == line.id)
        )
        row["movement_id"] = str(consumption.movement_id) if consumption else None
        result["lines"].append(row)
    return result


def precision(db, line, amount):
    unit = get_record(db, Unit, line.unit_id)
    if amount != amount.quantize(Decimal(1).scaleb(-unit.decimal_places)):
        inv.fail(
            "UNIT_PRECISION",
            f"Quantity must use {unit.decimal_places} decimal places for {unit.name}",
            422,
        )


def references(db, data):
    customer = get_record(db, Customer, data.customer_id)
    if not customer.is_active:
        inv.fail("INACTIVE_CUSTOMER", "Select an active customer", 422)
    project_id = data.project_id
    if data.lpo_id:
        lpo = get_record(db, Lpo, data.lpo_id)
        if (
            lpo.customer_id != customer.id
            or lpo.status != "active"
            or (project_id and lpo.project_id != project_id)
        ):
            inv.fail(
                "INVALID_LPO",
                "Select an active LPO belonging to this customer and project",
                422,
            )
        project_id = project_id or lpo.project_id
    if project_id:
        project = get_record(db, Project, project_id)
        if project.customer_id != customer.id or project.status != "active":
            inv.fail(
                "INVALID_PROJECT",
                "Select an active project belonging to this customer",
                422,
            )
    return project_id


def snapshot(db, order):
    return {
        "customer_id": str(order.customer_id),
        "project_id": str(order.project_id) if order.project_id else None,
        "lpo_id": str(order.lpo_id) if order.lpo_id else None,
        "requested_date": str(order.requested_date) if order.requested_date else None,
        "priority": order.priority,
        "notes": order.notes,
        "lines": [
            dict(
                id=str(l.id),
                item_id=str(l.item_id),
                quantity=str(l.quantity),
                unit_id=str(l.unit_id),
            )
            for l in lines(db, order)
        ],
    }


def progress(db, order):
    db.flush()
    amounts = [(l.quantity, shipped(db, l)) for l in lines(db, order)]
    order.status = (
        "COMPLETED"
        if all(q == s for q, s in amounts)
        else ("PARTIALLY_DISPATCHED" if any(s for _, s in amounts) else "CONFIRMED")
    )


def operation(key, suffix, reason):
    return Operation(request_key=uuid.uuid5(key, suffix), reason=reason)


def active_order(order):
    if order.status not in ("CONFIRMED", "PARTIALLY_DISPATCHED"):
        inv.fail(
            "ORDER_NOT_OPEN",
            "Confirm an open order before allocating or preparing stock",
        )


def auto_allocate(db, ctx, order, data):
    active_order(order)
    inv.authorize(db, ctx, "inventory.reservations.create")
    warehouse = get_record(db, Warehouse, data.warehouse_id)
    if not warehouse.is_active:
        inv.fail("INACTIVE_WAREHOUSE", "Select an active warehouse", 422)
    for line in lines(db, order):
        gap = line.quantity - shipped(db, line) - held(db, line)
        buckets = db.scalars(
            select(StockBalance)
            .join(Location, Location.id == StockBalance.location_id)
            .where(
                StockBalance.item_id == line.item_id,
                Location.warehouse_id == warehouse.id,
            )
            .order_by(StockBalance.id)
        ).all()
        for balance in buckets:
            amount = min(gap, inv.available(db, balance))
            if amount <= 0:
                continue
            reservation = inv.create_reservation(
                db,
                ctx,
                ReservationInput(
                    request_key=uuid.uuid5(
                        data.request_key, f"hold:{line.id}:{balance.id}"
                    ),
                    item_id=line.item_id,
                    location_id=balance.location_id,
                    lot_id=balance.lot_id,
                    quantity=amount,
                    reason=data.reason,
                    source_reference=order.code,
                ),
            )
            allocation = SalesAllocation(
                id=uuid.uuid4(),
                line_id=line.id,
                quantity=amount,
                current_reservation_id=reservation.id,
                created_by=ctx.user.id,
            )
            db.add(allocation)
            db.flush()
            db.add(
                SalesReservationLink(
                    reservation_id=reservation.id, allocation_id=allocation.id
                )
            )
            db.flush()
            gap -= amount


def claimed(db, allocation):
    return (
        db.scalar(
            select(SalesDeliveryLine.id)
            .join(SalesDelivery, SalesDelivery.id == SalesDeliveryLine.delivery_id)
            .where(
                SalesDeliveryLine.allocation_id == allocation.id,
                SalesDelivery.status.in_(["DRAFT", "PICKED", "LOADED"]),
            )
        )
        is not None
    )


def release(db, ctx, allocation, data):
    inv.authorize(db, ctx, "inventory.reservations.release")
    if claimed(db, allocation):
        inv.fail(
            "DELIVERY_IN_PROGRESS",
            "Cancel the delivery preparation before releasing its allocation",
        )
    if allocation.current_reservation_id:
        inv.close_reservation(
            db,
            ctx,
            allocation.current_reservation_id,
            "release",
            operation(data.request_key, f"release:{allocation.id}", data.reason),
            sales_internal=True,
        )
        allocation.current_reservation_id = None


def consume(db, ctx, allocation, line, delivery, data):
    inv.authorize(db, ctx, "inventory.reservations.consume")
    reservation = (
        inv.locked(db, Reservation, allocation.current_reservation_id)
        if allocation.current_reservation_id
        else None
    )
    if (
        not reservation
        or reservation.status != "ACTIVE"
        or line.loaded_quantity > reservation.quantity
    ):
        inv.fail(
            "ALLOCATION_CHANGED",
            "The allocated stock is no longer available; cancel and prepare again",
        )
    amount = line.loaded_quantity
    if amount < reservation.quantity:
        inv.authorize(db, ctx, "inventory.reservations.create")
        inv.authorize(db, ctx, "inventory.reservations.release")
        inv.close_reservation(
            db,
            ctx,
            reservation.id,
            "release",
            operation(data.request_key, f"split:{line.id}", data.reason),
            sales_internal=True,
        )
        balance = get_record(db, StockBalance, reservation.balance_id)
        children = []
        for label, qty in [
            ("consume", amount),
            ("remainder", reservation.quantity - amount),
        ]:
            child = inv.create_reservation(
                db,
                ctx,
                ReservationInput(
                    request_key=uuid.uuid5(data.request_key, f"{label}:{line.id}"),
                    item_id=balance.item_id,
                    location_id=balance.location_id,
                    lot_id=balance.lot_id,
                    quantity=qty,
                    reason=data.reason,
                    source_reference=delivery.code,
                ),
            )
            db.add(
                SalesReservationLink(
                    reservation_id=child.id,
                    allocation_id=allocation.id,
                    parent_id=reservation.id,
                )
            )
            children.append(child)
        db.flush()
        reservation = children[0]
        allocation.current_reservation_id = children[1].id
        db.flush()
    else:
        allocation.current_reservation_id = None
    inv.close_reservation(
        db,
        ctx,
        reservation.id,
        "consume",
        operation(data.request_key, f"issue:{line.id}", data.reason),
        sales_internal=True,
        source_reference=delivery.code,
    )
    db.add(
        SalesConsumption(
            delivery_line_id=line.id,
            reservation_id=reservation.id,
            movement_id=reservation.consumed_movement_id,
            quantity=amount,
        )
    )
    db.flush()


def execute(db, ctx, action, data, identity=None):
    inv.authorize(db, ctx, "sales." + PERMISSIONS[action])
    inv.lock_inventory(db)
    fingerprint = inv.digest(
        {
            "action": action,
            "identity": identity,
            "body": data.model_dump(exclude={"request_key"}),
        }
    )
    previous = db.get(SalesOperation, data.request_key)
    target_model = (
        SalesDelivery
        if action
        in ("prepare", "pick", "load", "dispatch", "reverse", "cancel-delivery")
        else SalesOrder
    )
    if previous:
        if previous.request_hash != fingerprint or previous.created_by != ctx.user.id:
            inv.fail(
                "IDEMPOTENCY_CONFLICT",
                "This request key belongs to a different operation",
            )
        return get_record(db, target_model, previous.target_id)
    if action == "create":
        project_id = references(db, data)
        order = inv.identified(
            SalesOrder,
            "SO",
            ctx.user,
            customer_id=data.customer_id,
            project_id=project_id,
            lpo_id=data.lpo_id,
            requested_date=data.requested_date,
            priority=data.priority,
            notes=data.notes,
            status="DRAFT",
            version=1,
        )
        db.add(order)
        db.flush()
        for entry in data.lines:
            item = get_record(db, Item, entry.item_id)
            unit = get_record(db, Unit, item.unit_id)
            if not item.is_active or not unit.is_active:
                inv.fail("INACTIVE_ITEM", "Select an active item and unit", 422)
            line = SalesLine(
                order_id=order.id,
                item_id=item.id,
                unit_id=unit.id,
                item_name=item.name,
                unit_name=unit.name,
                quantity=entry.quantity,
            )
            precision(db, line, entry.quantity)
            db.add(line)
        result = order
    else:
        result = inv.locked(
            db,
            SalesDelivery
            if action in ("pick", "load", "dispatch", "reverse", "cancel-delivery")
            else SalesOrder,
            identity,
        )
        order = (
            inv.locked(db, SalesOrder, result.order_id)
            if isinstance(result, SalesDelivery)
            else result
        )
        if action == "confirm":
            if order.status != "DRAFT":
                inv.fail("ORDER_NOT_DRAFT", "Only a draft order can be confirmed")
            references(db, order)
            for line in lines(db, order):
                item = get_record(db, Item, line.item_id)
                if not item.is_active or item.unit_id != line.unit_id:
                    inv.fail(
                        "ITEM_CHANGED", "Review the item and unit before confirmation"
                    )
            order.status, order.confirmed_at = "CONFIRMED", utcnow()
        elif action in ("edit", "amend"):
            if (action == "edit") != (
                order.status == "DRAFT"
            ) or order.status == "CANCELLED":
                inv.fail(
                    "AMENDMENT_REQUIRED",
                    "Use a controlled amendment for a confirmed order",
                )
            if data.version != order.version:
                inv.fail("STALE_ORDER", "This order changed; refresh before saving")
            existing = {l.id: l for l in lines(db, order)}
            if set(existing) != {l.id for l in data.lines} or len(existing) != len(
                data.lines
            ):
                inv.fail(
                    "LINE_SET_CHANGED",
                    "Amend quantities on the existing lines; create a new order for additional items",
                    422,
                )
            before = snapshot(db, order)
            for entry in data.lines:
                line = existing[entry.id]
                precision(db, line, entry.quantity)
                if entry.quantity < shipped(db, line) + held(db, line):
                    inv.fail(
                        "QUANTITY_COMMITTED",
                        "Quantity cannot be below dispatched plus allocated stock; release unused allocations first",
                    )
            after = dict(
                before,
                requested_date=str(data.requested_date)
                if data.requested_date
                else None,
                priority=data.priority,
                notes=data.notes,
                lines=[
                    dict(
                        l,
                        quantity=str(
                            next(e.quantity for e in data.lines if str(e.id) == l["id"])
                        ),
                    )
                    for l in before["lines"]
                ],
            )
            db.add(
                SalesAmendment(
                    order_id=order.id,
                    version=order.version + 1,
                    before=before,
                    after=after,
                    reason=data.reason,
                    created_by=ctx.user.id,
                )
            )
            db.flush()
            order.version += 1
            order.requested_date, order.priority, order.notes = (
                data.requested_date,
                data.priority,
                data.notes,
            )
            db.flush()
            for entry in data.lines:
                existing[entry.id].quantity = entry.quantity
            db.flush()
            if order.status != "DRAFT":
                progress(db, order)
        elif action == "allocate":
            auto_allocate(db, ctx, order, data)
        elif action == "release":
            inv.authorize(db, ctx, "inventory.reservations.release")
            for line in lines(db, order):
                for allocation in db.scalars(
                    select(SalesAllocation).where(SalesAllocation.line_id == line.id)
                ):
                    release(db, ctx, allocation, data)
        elif action == "prepare":
            auto_allocate(db, ctx, order, data)
            if data.driver_id:
                driver = get_record(db, User, data.driver_id)
                if not driver.is_active or not any(
                    r.code == "DRIVER" for r in driver.roles
                ):
                    inv.fail("INVALID_DRIVER", "Select an active driver identity", 422)
            delivery = inv.identified(
                SalesDelivery,
                "DLV",
                ctx.user,
                order_id=order.id,
                warehouse_id=data.warehouse_id,
                destination=data.destination,
                driver_id=data.driver_id,
                status="DRAFT",
                reason=data.reason,
            )
            db.add(delivery)
            db.flush()
            count = 0
            for line in lines(db, order):
                for allocation in db.scalars(
                    select(SalesAllocation)
                    .where(
                        SalesAllocation.line_id == line.id,
                        SalesAllocation.current_reservation_id.is_not(None),
                    )
                    .order_by(SalesAllocation.id)
                ):
                    reservation = get_record(
                        db, Reservation, allocation.current_reservation_id
                    )
                    balance = get_record(db, StockBalance, reservation.balance_id)
                    if (
                        reservation.status == "ACTIVE"
                        and get_record(db, Location, balance.location_id).warehouse_id
                        == data.warehouse_id
                        and not claimed(db, allocation)
                    ):
                        db.add(
                            SalesDeliveryLine(
                                delivery_id=delivery.id,
                                allocation_id=allocation.id,
                                quantity=reservation.quantity,
                            )
                        )
                        count += 1
            if not count:
                inv.fail(
                    "NO_FULFILLABLE_STOCK",
                    "No unclaimed allocated stock at this warehouse; receive stock or review open preparations",
                )
            result = delivery
        elif action in ("pick", "load"):
            expected = "DRAFT" if action == "pick" else "PICKED"
            if result.status != expected:
                inv.fail(
                    "DELIVERY_STAGE",
                    f"This delivery must be {expected.lower()} before this action",
                )
            entries = {l.id: l for l in delivery_lines(db, result)}
            if set(entries) != {e.id for e in data.lines} or len(entries) != len(
                data.lines
            ):
                inv.fail(
                    "ACTUAL_QUANTITIES_REQUIRED",
                    "Enter an actual quantity for every delivery line",
                    422,
                )
            for entry in data.lines:
                line = entries[entry.id]
                allocation = get_record(db, SalesAllocation, line.allocation_id)
                precision(
                    db, get_record(db, SalesLine, allocation.line_id), entry.quantity
                )
                maximum = line.quantity if action == "pick" else line.picked_quantity
                if entry.quantity > maximum:
                    inv.fail(
                        "ACTUAL_EXCEEDS_PREVIOUS",
                        "Actual quantity cannot exceed the previous preparation stage",
                        422,
                    )
                setattr(
                    line,
                    "picked_quantity" if action == "pick" else "loaded_quantity",
                    entry.quantity,
                )
            db.flush(list(entries.values()))
            result.status = "PICKED" if action == "pick" else "LOADED"
            setattr(
                result, "picked_by" if action == "pick" else "loaded_by", ctx.user.id
            )
            setattr(result, "picked_at" if action == "pick" else "loaded_at", utcnow())
        elif action == "dispatch":
            active_order(order)
            if result.driver_id:
                from app.services.routing import eligible_driver
                eligible_driver(db, result.driver_id)
            if result.status != "LOADED":
                inv.fail(
                    "DELIVERY_NOT_LOADED",
                    "Confirm actual picking and loading before dispatch",
                )
            actual = delivery_lines(db, result)
            if not any(l.loaded_quantity for l in actual):
                inv.fail("NOTHING_LOADED", "No actual stock was loaded")
            totals = {}
            for line in actual:
                allocation = inv.locked(db, SalesAllocation, line.allocation_id)
                totals[allocation.line_id] = (
                    totals.get(allocation.line_id, ZERO) + line.loaded_quantity
                )
            for line_id, amount in totals.items():
                line = get_record(db, SalesLine, line_id)
                if amount > line.quantity - shipped(db, line):
                    inv.fail(
                        "OVER_DELIVERY",
                        "Loaded quantity exceeds this order’s remaining demand",
                    )
            for line in actual:
                if line.loaded_quantity:
                    consume(
                        db,
                        ctx,
                        get_record(db, SalesAllocation, line.allocation_id),
                        line,
                        result,
                        data,
                    )
            result.status, result.dispatched_by, result.dispatched_at = (
                "DISPATCHED",
                ctx.user.id,
                utcnow(),
            )
            progress(db, order)
        elif action == "reverse":
            if result.status != "DISPATCHED":
                inv.fail("NOT_DISPATCHED", "Only a dispatched delivery can be reversed")
            for line in delivery_lines(db, result):
                consumption = db.scalar(
                    select(SalesConsumption).where(
                        SalesConsumption.delivery_line_id == line.id
                    )
                )
                if consumption:
                    inv.reverse_movement(
                        db,
                        ctx,
                        consumption.movement_id,
                        operation(data.request_key, f"reverse:{line.id}", data.reason),
                        sales_internal=True,
                    )
            result.status, result.reversed_at = "REVERSED", utcnow()
            progress(db, order)
        elif action == "cancel-delivery":
            if result.status not in ("DRAFT", "PICKED", "LOADED"):
                inv.fail(
                    "DELIVERY_POSTED",
                    "Dispatched stock requires a controlled physical return and reversal",
                )
            result.status = "CANCELLED"
        elif action == "cancel":
            if order.status == "CANCELLED" or any(
                shipped(db, l) for l in lines(db, order)
            ):
                inv.fail(
                    "ORDER_HAS_DISPATCHES",
                    "Only an order without net dispatched quantities can be cancelled",
                )
            inv.authorize(db, ctx, "inventory.reservations.release")
            for delivery in db.scalars(
                select(SalesDelivery).where(
                    SalesDelivery.order_id == order.id,
                    SalesDelivery.status.in_(["DRAFT", "PICKED", "LOADED"]),
                )
            ):
                delivery.status = "CANCELLED"
            db.flush()
            for line in lines(db, order):
                for allocation in db.scalars(
                    select(SalesAllocation).where(SalesAllocation.line_id == line.id)
                ):
                    release(db, ctx, allocation, data)
            order.status = "CANCELLED"
    db.flush()
    db.add(
        SalesOperation(
            id=data.request_key,
            action=action,
            target_id=result.id,
            request_hash=fingerprint,
            created_by=ctx.user.id,
        )
    )
    record_audit(
        db,
        ctx,
        "sales.deliveries" if isinstance(result, SalesDelivery) else "sales.orders",
        result,
        action,
        ["status", "quantities", "allocations"],
        reason=data.reason,
    )
    db.flush()
    return result
