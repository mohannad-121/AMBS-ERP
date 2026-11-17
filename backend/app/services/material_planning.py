"""Single-level approved quantity-per-output rules. Decimal arithmetic, no formulas or stock writes."""

from zoneinfo import ZoneInfo
from decimal import Decimal, ROUND_CEILING
from sqlalchemy import select, func, delete
from app.core.security import utcnow
from app.models.master import Item, Unit
from app.models.inventory import StockBalance, Location, Warehouse
from app.models.purchasing import ProductionOrder, PurchaseOrder, OrderLine
from app.models.sales import SalesOrder
from app.models.security import User
from app.models.packing import (
    BomVersion,
    BomComponent,
    MaterialPlan,
    MaterialPlanLine,
    PlanReview,
)
from app.services import inventory as inv, sales, purchasing, phase7
from app.services.master import get_record, record_audit

ZERO = Decimal(0)
MAX_QUANTITY = Decimal("99999999999999.999999")


def today():
    return utcnow().astimezone(ZoneInfo("Asia/Dubai")).date()


def checked_quantity(db, item_id, unit_id, quantity):
    item = get_record(db, Item, item_id)
    unit = get_record(db, Unit, unit_id)
    if not item.is_active or not unit.is_active:
        inv.fail("INACTIVE_BOM_ITEM", "BOM items and units must be active", 409)
    if item.unit_id != unit_id:
        inv.fail(
            "UNAPPROVED_UNIT_CONVERSION",
            "Use the item's existing unit; no unit conversion is approved",
            422,
        )
    if quantity != quantity.quantize(Decimal(1).scaleb(-unit.decimal_places)):
        inv.fail(
            "UNIT_PRECISION",
            f"Use {unit.decimal_places} decimal places for {unit.name}",
            422,
        )
    return item, unit


def components(db, bom):
    return list(
        db.scalars(
            select(BomComponent)
            .where(BomComponent.bom_id == bom.id)
            .order_by(BomComponent.id)
        )
    )


def bom_view(db, bom):
    return dict(
        id=str(bom.id),
        code=bom.code,
        item_id=str(bom.item_id),
        item_name=get_record(db, Item, bom.item_id).name,
        unit_id=str(bom.unit_id),
        unit_name=get_record(db, Unit, bom.unit_id).name,
        output_quantity=str(bom.output_quantity),
        revision=bom.revision,
        version=bom.version,
        status=bom.status,
        previous_id=str(bom.previous_id) if bom.previous_id else None,
        source_reference=bom.source_reference,
        reason=bom.reason,
        effective_from=str(bom.effective_from) if bom.effective_from else None,
        effective_until=str(bom.effective_until) if bom.effective_until else None,
        prepared_by=get_record(db, User, bom.prepared_by).display_name,
        approved_by=get_record(db, User, bom.approved_by).display_name
        if bom.approved_by
        else None,
        approved_at=bom.approved_at.isoformat() if bom.approved_at else None,
        components=[
            dict(
                id=str(c.id),
                item_id=str(c.item_id),
                item_name=get_record(db, Item, c.item_id).name,
                quantity=str(c.quantity),
                unit_id=str(c.unit_id),
                unit_name=get_record(db, Unit, c.unit_id).name,
                waste_percent=str(c.waste_percent)
                if c.waste_percent is not None
                else None,
            )
            for c in components(db, bom)
        ],
        model="Flat quantity-per-output BOM; subassemblies are stocked components, not recursively exploded",
    )


def save_bom(db, ctx, data, identity=None):
    inv.authorize(db, ctx, "bom.edit" if identity else "bom.create")
    action = "bom.save:" + (str(identity) if identity else "new")
    replay = phase7.replay(db, ctx, action, data)
    if replay:
        return get_record(db, BomVersion, replay)
    checked_quantity(db, data.item_id, data.unit_id, data.output_quantity)
    if len({c.item_id for c in data.components}) != len(data.components):
        inv.fail("DUPLICATE_COMPONENT", "Use one line per component material", 422)
    for c in data.components:
        if c.item_id == data.item_id:
            inv.fail("SELF_COMPONENT", "An assembly cannot be its own component", 422)
        checked_quantity(db, c.item_id, c.unit_id, c.quantity)
    if identity:
        row = get_record(db, BomVersion, identity)
        if row.status != "DRAFT":
            inv.fail(
                "BOM_IMMUTABLE",
                "Create a new draft revision; submitted and approved definitions cannot be edited",
                409,
            )
        if row.version != data.version:
            inv.fail(
                "STALE_BOM_EDIT", "Reload the BOM before editing this version", 409
            )
        if row.item_id != data.item_id or row.previous_id != data.previous_id:
            inv.fail(
                "BOM_IDENTITY",
                "A draft edit cannot change the assembly or its revision lineage",
                409,
            )
        db.execute(delete(BomComponent).where(BomComponent.bom_id == row.id))
        row.version += 1
    else:
        if data.previous_id:
            previous = get_record(db, BomVersion, data.previous_id)
            if previous.item_id != data.item_id:
                inv.fail(
                    "BOM_REVISION_ITEM",
                    "A revision must use the same finished item",
                    422,
                )
        revision = (
            db.scalar(
                select(func.max(BomVersion.revision)).where(
                    BomVersion.item_id == data.item_id
                )
            )
            or 0
        ) + 1
        import uuid

        new_id = uuid.uuid4()
        row = BomVersion(
            id=new_id,
            code="BOM-" + new_id.hex.upper(),
            item_id=data.item_id,
            revision=revision,
            previous_id=data.previous_id,
            status="DRAFT",
            prepared_by=ctx.user.id,
        )
        db.add(row)
    row.output_quantity, row.unit_id = data.output_quantity, data.unit_id
    row.source_reference, row.reason = data.source_reference, data.reason
    row.effective_from, row.effective_until = data.effective_from, data.effective_until
    db.flush()
    for c in data.components:
        db.add(BomComponent(bom_id=row.id, **c.model_dump()))
    db.flush()
    return phase7.complete(db, ctx, action, data, row)


def transition_bom(db, ctx, identity, action, data):
    inv.authorize(
        db,
        ctx,
        {"submit": "bom.edit", "approve": "bom.approve", "archive": "bom.archive"}[
            action
        ],
    )
    operation = "bom." + action + ":" + str(identity)
    replay = phase7.replay(db, ctx, operation, data)
    if replay:
        return get_record(db, BomVersion, replay)
    row = get_record(db, BomVersion, identity)
    if action == "submit":
        if row.status != "DRAFT":
            inv.fail("BOM_STATE", "Only a draft can be submitted", 409)
        row.status = "PENDING_APPROVAL"
    elif action == "approve":
        if row.status != "PENDING_APPROVAL":
            inv.fail("BOM_STATE", "Submit this BOM for approval first", 409)
        if row.effective_from and row.effective_from > today():
            inv.fail(
                "BOM_NOT_EFFECTIVE",
                "Future definitions must remain pending until their effective date",
                409,
            )
        if row.effective_until and row.effective_until < today():
            inv.fail("BOM_EXPIRED", "An expired definition cannot be activated", 409)
        checked_quantity(db, row.item_id, row.unit_id, row.output_quantity)
        for c in components(db, row):
            checked_quantity(db, c.item_id, c.unit_id, c.quantity)
        old = db.scalars(
            select(BomVersion).where(
                BomVersion.item_id == row.item_id, BomVersion.status == "APPROVED"
            )
        ).all()
        for previous in old:
            previous.status = "SUPERSEDED"
            record_audit(db, ctx, "bom", previous, "superseded", reason=data.reason)
        db.flush()
        row.status, row.approved_by, row.approved_at = "APPROVED", ctx.user.id, utcnow()
    else:
        if row.status == "ARCHIVED":
            inv.fail("BOM_STATE", "This definition is already archived", 409)
        row.status = "ARCHIVED"
    db.flush()
    return phase7.complete(db, ctx, operation, data, row)


def applicable(db, item_id):
    row = db.scalar(
        select(BomVersion).where(
            BomVersion.item_id == item_id, BomVersion.status == "APPROVED"
        )
    )
    if (
        row
        and (not row.effective_from or row.effective_from <= today())
        and (not row.effective_until or row.effective_until >= today())
    ):
        for entry in [row, *components(db, row)]:
            item = get_record(db, Item, entry.item_id)
            unit = get_record(db, Unit, entry.unit_id)
            quantity = (
                entry.output_quantity
                if isinstance(entry, BomVersion)
                else entry.quantity
            )
            if (
                not item.is_active
                or not unit.is_active
                or item.unit_id != unit.id
                or quantity
                != quantity.quantize(Decimal(1).scaleb(-unit.decimal_places))
            ):
                return None
        return row
    return None


def incoming(db, item_id, warehouse_id):
    query = (
        select(OrderLine)
        .join(PurchaseOrder, PurchaseOrder.id == OrderLine.order_id)
        .where(
            OrderLine.item_id == item_id,
            OrderLine.unit_id == get_record(db, Item, item_id).unit_id,
            OrderLine.line_type == "STOCK",
            PurchaseOrder.status.in_(["CONFIRMED", "PARTIALLY_RECEIVED"]),
        )
    )
    if warehouse_id:
        query = query.where(PurchaseOrder.warehouse_id == warehouse_id)
    return sum(
        (
            max(ZERO, line.quantity - purchasing.received(db, line.id))
            for line in db.scalars(query)
        ),
        ZERO,
    )


def availability(db, item_id, warehouse_id):
    # Reuse the inventory engine's exact allocatable/available predicates.
    query = (
        select(StockBalance)
        .join(Location, Location.id == StockBalance.location_id)
        .where(StockBalance.item_id == item_id)
    )
    if warehouse_id:
        query = query.where(Location.warehouse_id == warehouse_id)
    result = dict(
        usable_on_hand=ZERO,
        reserved=ZERO,
        available=ZERO,
        unavailable_on_hand=ZERO,
        external_custody=ZERO,
    )
    for bucket in db.scalars(query):
        if get_record(db, Location, bucket.location_id).kind == "EXTERNAL":
            result["external_custody"] += bucket.on_hand
        elif inv.allocatable(db, bucket):
            result["usable_on_hand"] += bucket.on_hand
            result["reserved"] += bucket.reserved
            result["available"] += inv.available(db, bucket)
        else:
            result["unavailable_on_hand"] += bucket.on_hand
    result["expected_incoming"] = incoming(db, item_id, warehouse_id)
    return result


def inputs(db, sales_order_id=None, production_order_id=None, warehouse_id=None):
    demands = []
    if warehouse_id:
        get_record(db, Warehouse, warehouse_id)
    if sales_order_id:
        source = get_record(db, SalesOrder, sales_order_id)
        state = dict(
            type="sales_order",
            id=str(source.id),
            code=source.code,
            version=source.version,
            status=source.status,
        )
        for line in sales.lines(db, source):
            remaining = line.quantity - sales.shipped(db, line)
            if remaining > 0:
                demands.append(
                    dict(
                        item_id=str(line.item_id),
                        unit_id=str(line.unit_id),
                        quantity=str(remaining),
                        line_id=str(line.id),
                    )
                )
    else:
        source = get_record(db, ProductionOrder, production_order_id)
        state = dict(
            type="production_order",
            id=str(source.id),
            code=source.code,
            version=source.version,
            status=source.status,
            ownership=source.ownership,
        )
        demands.append(
            dict(
                item_id=str(source.item_id),
                quantity=str(source.quantity),
                basis="Full production target; no inferred manufacturing consumption",
            )
        )
    if len(demands) > 50:
        inv.fail("PLAN_TOO_LARGE", "Plan at most 50 source lines at a time", 422)
    state["demands"] = demands
    applications, missing, raw, stock = [], [], {}, {}
    for demand in demands:
        item_id = __import__("uuid").UUID(demand["item_id"])
        bom = applicable(db, item_id)
        if not bom or (demand.get("unit_id") and demand["unit_id"] != str(bom.unit_id)):
            missing.append(
                {
                    **demand,
                    "item_name": get_record(db, Item, item_id).name,
                    "reason": "An effective approved BOM is required",
                }
            )
            continue
        applications.append(
            dict(
                bom_id=str(bom.id),
                bom_code=bom.code,
                revision=bom.revision,
                demand=demand,
                output_quantity=str(bom.output_quantity),
            )
        )
        for component in components(db, bom):
            amount = (
                Decimal(demand["quantity"]) * component.quantity / bom.output_quantity
            )
            if component.waste_percent is not None:
                amount *= 1 + component.waste_percent / Decimal(100)
            raw[component.item_id] = raw.get(component.item_id, ZERO) + amount
    if len(raw) > 80:
        inv.fail(
            "PLAN_TOO_LARGE", "A plan supports at most 80 distinct components", 422
        )
    rows = []
    for item_id in sorted(raw, key=str):
        item = get_record(db, Item, item_id)
        unit = get_record(db, Unit, item.unit_id)
        required = raw[item_id].quantize(
            Decimal(1).scaleb(-unit.decimal_places), rounding=ROUND_CEILING
        )
        values = availability(db, item_id, warehouse_id)
        if required > MAX_QUANTITY or any(
            value > MAX_QUANTITY for value in values.values()
        ):
            inv.fail(
                "PLAN_QUANTITY_LIMIT",
                "The calculated quantity exceeds supported precision",
                422,
            )
        shortage = max(ZERO, required - values["available"])
        rows.append(
            dict(
                item_id=item_id,
                unit_id=unit.id,
                item_name=item.name,
                unit_name=unit.name,
                precision=unit.decimal_places,
                required=required,
                shortage=shortage,
                **values,
            )
        )
        stock[str(item_id)] = {k: str(v) for k, v in values.items()}
    signature = inv.digest(
        dict(
            source=state,
            applications=applications,
            missing=missing,
            stock=stock,
            warehouse_id=warehouse_id,
            quantities=[{k: str(v) for k, v in r.items()} for r in rows],
        )
    )
    return state, applications, missing, rows, signature


def calculate(db, ctx, data):
    inv.authorize(db, ctx, "material_plans.calculate")
    inv.authorize(
        db, ctx, "sales.orders.read" if data.sales_order_id else "production.read"
    )
    replay = phase7.replay(db, ctx, "material_plans.calculate", data)
    if replay:
        return get_record(db, MaterialPlan, replay)
    source, applied, missing, rows, signature = inputs(
        db, data.sales_order_id, data.production_order_id, data.warehouse_id
    )
    if source["status"] not in (
        {"CONFIRMED", "PARTIALLY_DISPATCHED"} if data.sales_order_id else {"ACTIVE"}
    ):
        inv.fail(
            "UNAPPROVED_DEMAND",
            "Use an open confirmed sales order or active production order",
            409,
        )
    if not source["demands"]:
        inv.fail("NO_OUTSTANDING_DEMAND", "The source has no outstanding demand", 409)
    if data.previous_id:
        old = get_record(db, MaterialPlan, data.previous_id)
        if (
            old.sales_order_id != data.sales_order_id
            or old.production_order_id != data.production_order_id
        ):
            inv.fail(
                "PLAN_SOURCE_MISMATCH", "Recalculation must retain the same source", 422
            )
    status = (
        "AWAITING_APPROVED_BOM"
        if missing
        else "AVAILABLE"
        if all(r["shortage"] == 0 for r in rows)
        else "PARTIALLY_AVAILABLE"
        if any(r["available"] > 0 for r in rows)
        else "SHORTAGE"
    )
    import uuid

    identity = uuid.uuid4()
    row = MaterialPlan(
        id=identity,
        code="MRP-" + identity.hex.upper(),
        sales_order_id=data.sales_order_id,
        production_order_id=data.production_order_id,
        warehouse_id=data.warehouse_id,
        previous_id=data.previous_id,
        status=status,
        source_snapshot=source,
        input_signature=signature,
        applications=applied,
        missing_boms=missing,
        prepared_by=ctx.user.id,
        reason=data.reason,
    )
    db.add(row)
    db.flush()
    for values in rows:
        db.add(MaterialPlanLine(plan_id=row.id, **values))
    db.flush()
    return phase7.complete(db, ctx, "material_plans.calculate", data, row)


def plan_view(db, ctx, row):
    current = inputs(db, row.sales_order_id, row.production_order_id, row.warehouse_id)[
        -1
    ]
    review = db.scalar(select(PlanReview).where(PlanReview.plan_id == row.id))
    lines = []
    for line in db.scalars(
        select(MaterialPlanLine)
        .where(MaterialPlanLine.plan_id == row.id)
        .order_by(MaterialPlanLine.item_name, MaterialPlanLine.id)
    ):
        data = {
            k: str(getattr(line, k))
            for k in [
                "required",
                "usable_on_hand",
                "reserved",
                "available",
                "shortage",
                "external_custody",
                "unavailable_on_hand",
            ]
        }
        if "purchasing.orders.read" in ctx.permissions:
            data["expected_incoming"] = str(line.expected_incoming)
        lines.append(
            dict(
                id=str(line.id),
                item_id=str(line.item_id),
                item_name=line.item_name,
                unit_name=line.unit_name,
                precision=line.precision,
                **data,
            )
        )
    return dict(
        id=str(row.id),
        code=row.code,
        source=row.source_snapshot,
        status=row.status,
        applications=row.applications,
        missing_boms=row.missing_boms,
        lines=lines,
        stale=current != row.input_signature,
        stale_reason="Source demand, effective BOM, unit definition or stock/receipts changed"
        if current != row.input_signature
        else None,
        sales_order_id=str(row.sales_order_id) if row.sales_order_id else None,
        production_order_id=str(row.production_order_id)
        if row.production_order_id
        else None,
        warehouse_id=str(row.warehouse_id) if row.warehouse_id else None,
        previous_id=str(row.previous_id) if row.previous_id else None,
        prepared_by=get_record(db, User, row.prepared_by).display_name,
        created_at=row.created_at.isoformat(),
        review=dict(
            actor=get_record(db, User, review.actor_id).display_name,
            at=review.created_at.isoformat(),
            reason=review.reason,
        )
        if review
        else None,
        note="Planning evidence only: no stock reservation, issue, purchase order or production completion is created. Incoming stock is not on-hand.",
    )


def review(db, ctx, identity, data):
    inv.authorize(db, ctx, "material_plans.review")
    replay = phase7.replay(db, ctx, "material_plans.review:" + str(identity), data)
    if replay:
        return get_record(db, PlanReview, replay)
    row = get_record(db, MaterialPlan, identity)
    if row.status == "AWAITING_APPROVED_BOM" or plan_view(db, ctx, row)["stale"]:
        inv.fail(
            "PLAN_NOT_REVIEWABLE",
            "Recalculate from approved current rules and current stock before review",
            409,
        )
    if db.scalar(select(PlanReview).where(PlanReview.plan_id == identity)):
        inv.fail("PLAN_ALREADY_REVIEWED", "This snapshot is already reviewed", 409)
    record = PlanReview(plan_id=row.id, actor_id=ctx.user.id, reason=data.reason)
    db.add(record)
    db.flush()
    return phase7.complete(
        db, ctx, "material_plans.review:" + str(identity), data, record
    )
