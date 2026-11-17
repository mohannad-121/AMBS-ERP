from collections import defaultdict
from decimal import Decimal, getcontext
from sqlalchemy import select
from app.models.master import Item, Unit
from app.models.inventory import (
    Location,
    StockBalance,
    StockLot,
    StockThreshold,
    StockMovement,
    StockCount,
    Warehouse,
    MovementLine,
    CountLine,
)
from app.services.master import get_record, output
from app.services.inventory import available, allocatable as is_allocatable, ZERO


def balances(
    db,
    item_id=None,
    warehouse_id=None,
    location_id=None,
    category_id=None,
    family_id=None,
    item_type=None,
    lot_id=None,
    search="",
    view="all",
):
    getcontext().prec = 60
    threshold_warehouse = warehouse_id
    if location_id and threshold_warehouse is None:
        threshold_warehouse = get_record(db, Location, location_id).warehouse_id
    query = select(Item)
    for key, value in dict(
        id=item_id, category_id=category_id, family_id=family_id, item_type=item_type
    ).items():
        if value is not None:
            query = query.where(getattr(Item, key) == value)
    if search.strip():
        term = (
            search.strip().replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_")
        )
        query = query.where(
            Item.name.ilike(f"%{term}%", escape="\\")
            | Item.code.ilike(f"%{term}%", escape="\\")
        )
    rows = []
    for item in db.scalars(query.order_by(Item.name, Item.id)):
        stock = (
            select(StockBalance)
            .join(Location, Location.id == StockBalance.location_id)
            .where(StockBalance.item_id == item.id)
        )
        if warehouse_id:
            stock = stock.where(Location.warehouse_id == warehouse_id)
        if location_id:
            stock = stock.where(Location.id == location_id)
        if lot_id:
            stock = stock.where(StockBalance.lot_id == lot_id)
        buckets = db.scalars(stock.order_by(StockBalance.id)).all()
        on_hand = sum((entry.on_hand for entry in buckets), ZERO)
        reserved = sum((entry.reserved for entry in buckets), ZERO)
        allocatable = sum((available(db, entry) for entry in buckets), ZERO)
        nonusable = sum(
            (
                entry.on_hand
                for entry in buckets
                if not is_allocatable(db, entry)
                and get_record(db, Location, entry.location_id).kind != "EXTERNAL"
            ),
            ZERO,
        )
        thresholds = db.scalars(
            select(StockThreshold).where(StockThreshold.item_id == item.id)
        ).all()
        low = False
        for threshold in thresholds:
            if threshold_warehouse and threshold.warehouse_id != threshold_warehouse:
                continue
            if location_id and threshold.location_id not in {None, location_id}:
                continue
            # A location/lot display filter must not turn a warehouse minimum
            # into a minimum for just that displayed subset.
            scope = (
                select(StockBalance)
                .join(Location, Location.id == StockBalance.location_id)
                .where(
                    StockBalance.item_id == item.id,
                    Location.warehouse_id == threshold.warehouse_id,
                )
            )
            if threshold.location_id:
                scope = scope.where(StockBalance.location_id == threshold.location_id)
            scoped = db.scalars(scope).all()
            if (
                sum((available(db, entry) for entry in scoped), ZERO)
                < threshold.minimum
            ):
                low = True
        if view == "available" and allocatable <= 0:
            continue
        if view == "out_of_stock" and allocatable > 0:
            continue
        if view == "low" and not low:
            continue
        if view == "nonusable" and nonusable <= 0:
            continue
        details = []
        for entry in buckets:
            loc = get_record(db, Location, entry.location_id)
            row = output(entry)
            row.update(
                location_name=loc.name,
                warehouse_id=str(loc.warehouse_id),
                warehouse_name=get_record(db, Warehouse, loc.warehouse_id).name,
                kind=loc.kind,
                available=str(available(db, entry)),
                lot_identifier=get_record(db, StockLot, entry.lot_id).identifier
                if entry.lot_id
                else None,
                lot_status=get_record(db, StockLot, entry.lot_id).status
                if entry.lot_id
                else None,
                average_cost=str(entry.stock_value / entry.on_hand)
                if entry.cost_complete
                and entry.on_hand
                and entry.stock_value is not None
                else None,
            )
            details.append(row)
        from app.services.inventory import tracking

        rows.append(
            dict(
                id=str(item.id),
                item_id=str(item.id),
                code=item.code,
                name=item.name,
                is_active=item.is_active,
                unit_id=str(item.unit_id),
                unit_name=get_record(db, Unit, item.unit_id).name,
                decimal_places=get_record(db, Unit, item.unit_id).decimal_places,
                tracking_mode=tracking(db, item.id),
                on_hand=str(on_hand),
                reserved=str(reserved),
                available=str(allocatable),
                nonusable=str(nonusable),
                external_on_hand=str(
                    sum(
                        (
                            b.on_hand
                            for b in buckets
                            if get_record(db, Location, b.location_id).kind
                            == "EXTERNAL"
                        ),
                        ZERO,
                    )
                ),
                status="Available" if allocatable > 0 else "Out of Stock",
                low_stock=low,
                buckets=details,
            )
        )
    return rows


def overview(db, **filters):
    from app.services.purchasing_queries import supply, external_work

    rows = balances(db, **filters)
    item_ids = [row["id"] for row in rows]
    locations = select(Location.id)
    if filters.get("warehouse_id"):
        locations = locations.where(Location.warehouse_id == filters["warehouse_id"])
    if filters.get("location_id"):
        locations = locations.where(Location.id == filters["location_id"])
    movement_scope = select(StockMovement).where(
        StockMovement.id.in_(
            select(MovementLine.movement_id).where(
                MovementLine.item_id.in_(item_ids),
                MovementLine.source_id.in_(locations)
                | MovementLine.destination_id.in_(locations),
            )
        )
    )
    count_scope = select(StockCount).where(
        StockCount.location_id.in_(locations),
        StockCount.id.in_(
            select(CountLine.count_id)
            .join(StockBalance, StockBalance.id == CountLine.balance_id)
            .where(StockBalance.item_id.in_(item_ids))
        ),
    )
    units = defaultdict(
        lambda: {
            "on_hand": ZERO,
            "reserved": ZERO,
            "available": ZERO,
            "nonusable": ZERO,
        }
    )
    valuation = defaultdict(Decimal)
    incomplete = 0
    for row in rows:
        for key in units[row["unit_id"]]:
            units[row["unit_id"]][key] += Decimal(row[key])
        for entry in row["buckets"]:
            if Decimal(entry["on_hand"]) > 0:
                if entry["cost_complete"] and entry["currency"]:
                    valuation[entry["currency"]] += Decimal(entry["stock_value"])
                else:
                    incomplete += 1
    return dict(
        total_active_items=sum(1 for row in rows if row["is_active"]),
        low_stock_items=sum(1 for row in rows if row["low_stock"]),
        out_of_stock_items=sum(
            1 for row in rows if row["is_active"] and Decimal(row["available"]) <= 0
        ),
        nonusable_items=sum(1 for row in rows if Decimal(row["nonusable"]) > 0),
        totals_by_unit=[
            dict(
                unit_id=key,
                unit_name=get_record(db, Unit, key).name,
                **{field: str(value) for field, value in totals.items()},
            )
            for key, totals in units.items()
        ],
        valuation=[
            {
                "currency": key,
                "value": str(value),
                "label": "Indicative known-cost stock only",
            }
            for key, value in valuation.items()
        ],
        incomplete_cost_buckets=incomplete,
        incoming=supply(
            db,
            warehouse_id=filters.get("warehouse_id"),
            location_id=filters.get("location_id"),
            item_ids=item_ids,
        ),
        in_production=external_work(
            db,
            warehouse_id=filters.get("warehouse_id"),
            location_id=filters.get("location_id"),
            item_ids=item_ids,
        ),
        incoming_supported=True,
        in_production_supported=True,
        pending_receipts=len(
            db.scalars(
                movement_scope.where(
                    StockMovement.status == "DRAFT",
                    StockMovement.kind.in_(["RECEIPT", "RETURN"]),
                )
            ).all()
        ),
        pending_counts=len(
            db.scalars(
                count_scope.where(
                    StockCount.status.in_(["DRAFT", "IN_PROGRESS", "REVIEW"])
                )
            ).all()
        ),
        recent_movements=[
            output(row)
            for row in db.scalars(
                movement_scope.order_by(StockMovement.created_at.desc()).limit(8)
            )
        ],
    )
