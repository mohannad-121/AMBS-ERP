import uuid
from decimal import Decimal
from fastapi import APIRouter, Depends, Query, Request
from sqlalchemy import func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session
from app.core.security import current_context, require_permission, utcnow
from app.db.session import get_session
from app.models.master import Item, Unit
from app.models.inventory import (
    InventoryPolicy,
    Location,
    MovementLine,
    Reservation,
    StockBalance,
    StockCount,
    StockLot,
    StockMovement,
    StockThreshold,
    Warehouse,
)
from app.schemas.inventory import (
    CountInput,
    CountRecord,
    LocationInput,
    LotInput,
    LotStatus,
    MovementCreate,
    MovementInput,
    Operation,
    PolicyInput,
    ReservationInput,
    ThresholdInput,
    WarehouseInput,
)
from app.schemas.master import normalized
from app.services.master import get_record, output, record_audit
from app.services import inventory as engine
from app.services import inventory_queries as queries
from app.services.review_snapshot import review_request

router = APIRouter(prefix="/inventory", tags=["Inventory"])


def finish(db, context, value):
    try:
        db.flush()
        result = engine.public(value, context)
        db.commit()
        return result
    except IntegrityError:
        db.rollback()
        engine.fail(
            "INVENTORY_CONFLICT",
            "A stock identity, request key or relationship conflicts with an existing record",
        )


def page_result(rows, page, size, sort="code", direction="asc"):
    if sort not in {
        "code",
        "name",
        "created_at",
        "status",
        "on_hand",
        "available",
        "reserved",
    } or direction not in {"asc", "desc"}:
        engine.fail(
            "INVALID_SORT", "Select an allowed inventory sort field and direction", 422
        )

    def key(row):
        value = row.get(sort, "")
        return (
            Decimal(value)
            if sort in {"on_hand", "available", "reserved"} and value != ""
            else str(value)
        )

    rows = sorted(rows, key=key, reverse=direction == "desc")
    return {
        "items": rows[(page - 1) * size : page * size],
        "total": len(rows),
        "page": page,
        "page_size": size,
    }


@router.get("/balances")
def balance_list(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    item_id: uuid.UUID | None = None,
    warehouse_id: uuid.UUID | None = None,
    location_id: uuid.UUID | None = None,
    category_id: uuid.UUID | None = None,
    family_id: uuid.UUID | None = None,
    lot_id: uuid.UUID | None = None,
    item_type: str | None = None,
    search: str = Query("", max_length=200),
    view: str = "all",
    sort: str = "name",
    direction: str = "asc",
    requested_quantity: Decimal | None = Query(
        None, ge=0, max_digits=20, decimal_places=6
    ),
    context=Depends(require_permission("inventory.read")),
    db: Session = Depends(get_session),
):
    if view not in {"all", "available", "low", "out_of_stock", "nonusable"}:
        engine.fail(
            "INVALID_VIEW", "Choose all, available, low, out_of_stock or nonusable", 422
        )
    rows = queries.balances(
        db,
        item_id,
        warehouse_id,
        location_id,
        category_id,
        family_id,
        item_type,
        lot_id,
        search,
        view,
    )
    if requested_quantity is not None:
        for row in rows:
            row["shortage"] = str(
                max(Decimal(0), requested_quantity - Decimal(row["available"]))
            )
    return finish(db, context, page_result(rows, page, page_size, sort, direction))


@router.get("/overview")
def dashboard(
    warehouse_id: uuid.UUID | None = None,
    location_id: uuid.UUID | None = None,
    category_id: uuid.UUID | None = None,
    family_id: uuid.UUID | None = None,
    item_type: str | None = None,
    context=Depends(require_permission("inventory.read")),
    db: Session = Depends(get_session),
):
    return finish(
        db,
        context,
        queries.overview(
            db,
            warehouse_id=warehouse_id,
            location_id=location_id,
            category_id=category_id,
            family_id=family_id,
            item_type=item_type,
        ),
    )


@router.get("/reconciliation")
def reconcile(
    request: Request,
    context=Depends(require_permission("inventory.read")),
    db: Session = Depends(get_session),
):
    with review_request(db, context, request) as snapshot:
        result = engine.reconciliation(snapshot)
    return finish(db, context, result)


@router.get("/options/{resource}")
def options(
    resource: str,
    search: str = Query("", max_length=200),
    warehouse_id: uuid.UUID | None = None,
    item_id: uuid.UUID | None = None,
    page: int = Query(1, ge=1),
    page_size: int = Query(30, ge=1, le=100),
    context=Depends(require_permission("inventory.read")),
    db: Session = Depends(get_session),
):
    models = {
        "items": Item,
        "warehouses": Warehouse,
        "locations": Location,
        "lots": StockLot,
    }
    if resource not in models:
        engine.fail("INVALID_OPTIONS", "Unknown inventory reference resource", 404)
    model = models[resource]
    query = select(model).where(model.is_active.is_(True))
    if search:
        term = search.replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_")
        query = query.where(model.name.ilike(f"%{term}%", escape="\\"))
    if warehouse_id and resource == "locations":
        query = query.where(Location.warehouse_id == warehouse_id)
    if item_id and resource == "lots":
        query = query.where(StockLot.item_id == item_id)
    total = db.scalar(select(func.count()).select_from(query.subquery()))
    rows = []
    for row in db.scalars(
        query.order_by(model.name, model.id)
        .offset((page - 1) * page_size)
        .limit(page_size)
    ):
        entry = {"id": str(row.id), "name": row.name, "code": row.code}
        if resource == "items":
            entry.update(
                unit_id=str(row.unit_id),
                unit_name=get_record(db, Unit, row.unit_id).name,
                decimal_places=get_record(db, Unit, row.unit_id).decimal_places,
                tracking_mode=engine.tracking(db, row.id),
            )
        if resource == "locations":
            entry.update(warehouse_id=str(row.warehouse_id), kind=row.kind)
        if resource == "lots":
            entry.update(item_id=str(row.item_id), identifier=row.identifier)
        rows.append(entry)
    return finish(
        db,
        context,
        {"items": rows, "total": total, "page": page, "page_size": page_size},
    )


def register_reference(resource, model, schema, prefix):
    def listing(
        search: str = Query("", max_length=200),
        warehouse_id: uuid.UUID | None = None,
        page: int = Query(1, ge=1),
        page_size: int = Query(20, ge=1, le=100),
        sort: str = "name",
        direction: str = "asc",
        context=Depends(require_permission("inventory.read")),
        db: Session = Depends(get_session),
    ):
        rows = db.scalars(select(model).order_by(model.code)).all()
        result = [
            output(row)
            for row in rows
            if (not search or search.casefold() in row.name.casefold())
            and (
                not warehouse_id
                or resource != "locations"
                or row.warehouse_id == warehouse_id
            )
        ]
        return finish(
            db, context, page_result(result, page, page_size, sort, direction)
        )

    def save_reference(data, context, db, identity=None):
        engine.lock_inventory(db)
        row = engine.locked(db, model, identity) if identity else None
        values = data.model_dump()
        if resource == "locations":
            if row and row.kind == "EXTERNAL":
                engine.fail(
                    "CUSTODY_WORKFLOW_REQUIRED",
                    "Manage external custody through Purchasing to preserve its supplier identity",
                )
            get_record(db, Warehouse, data.warehouse_id)
            if row and row.warehouse_id != data.warehouse_id:
                engine.fail(
                    "LOCATION_WAREHOUSE_FIXED",
                    "Use a transfer instead of reassigning an existing location",
                    422,
                )
            ancestor, seen = data.parent_id, {identity}
            while ancestor:
                if ancestor in seen:
                    engine.fail(
                        "LOCATION_CYCLE",
                        "A storage location cannot be its own ancestor",
                        422,
                    )
                seen.add(ancestor)
                parent = get_record(db, Location, ancestor)
                if parent.warehouse_id != data.warehouse_id:
                    engine.fail(
                        "LOCATION_WAREHOUSE",
                        "A parent location must belong to the same warehouse",
                        422,
                    )
                ancestor = parent.parent_id
            if (
                row
                and row.kind != data.kind
                and db.scalar(
                    select(MovementLine.id)
                    .where(
                        (MovementLine.source_id == row.id)
                        | (MovementLine.destination_id == row.id)
                    )
                    .limit(1)
                )
            ):
                engine.fail(
                    "LOCATION_KIND_FIXED",
                    "A historically used location keeps its classification; create a new location and transfer stock",
                )
        if row and not data.is_active:
            stock = (
                select(StockBalance.id)
                .join(Location, Location.id == StockBalance.location_id)
                .where(StockBalance.on_hand > 0)
            )
            stock = (
                stock.where(Location.id == row.id)
                if resource == "locations"
                else stock.where(Location.warehouse_id == row.id)
            )
            if db.scalar(stock.limit(1)):
                engine.fail(
                    "LOCATION_HAS_STOCK",
                    "Move or dispose of existing stock before archiving this location/warehouse",
                )
        if resource == "warehouses" and data.is_default:
            for old in db.scalars(
                select(Warehouse).where(
                    Warehouse.is_default.is_(True), Warehouse.id != identity
                )
                if identity
                else select(Warehouse).where(Warehouse.is_default.is_(True))
            ):
                old.is_default = False
                record_audit(
                    db, context, "inventory.warehouses", old, "updated", ["is_default"]
                )
            db.flush()
        if row:
            for key, value in values.items():
                setattr(row, key, value)
            row.updated_at = utcnow()
        else:
            row = engine.identified(model, prefix, context.user, **values)
            db.add(row)
        record_audit(
            db,
            context,
            f"inventory.{resource}",
            row,
            "updated" if identity else "created",
            values.keys(),
        )
        db.flush()
        return finish(db, context, output(row))

    def create(
        data: schema,
        context=Depends(require_permission("inventory.locations.manage")),
        db: Session = Depends(get_session),
    ):
        return save_reference(data, context, db)

    def edit(
        identity: uuid.UUID,
        data: schema,
        context=Depends(require_permission("inventory.locations.manage")),
        db: Session = Depends(get_session),
    ):
        return save_reference(data, context, db, identity)

    router.add_api_route(
        f"/{resource}", listing, methods=["GET"], name=f"list_inventory_{resource}"
    )
    router.add_api_route(
        f"/{resource}",
        create,
        methods=["POST"],
        status_code=201,
        name=f"create_inventory_{resource}",
    )
    router.add_api_route(
        f"/{resource}/{{identity}}",
        edit,
        methods=["PUT"],
        name=f"update_inventory_{resource}",
    )


register_reference("warehouses", Warehouse, WarehouseInput, "WH")
register_reference("locations", Location, LocationInput, "LOC")


@router.get("/policies/{item_id}")
def policy_view(
    item_id: uuid.UUID,
    context=Depends(require_permission("inventory.read")),
    db: Session = Depends(get_session),
):
    get_record(db, Item, item_id)
    return finish(
        db,
        context,
        {"item_id": str(item_id), "tracking_mode": engine.tracking(db, item_id)},
    )


@router.put("/policies/{item_id}")
def policy_set(
    item_id: uuid.UUID,
    data: PolicyInput,
    context=Depends(require_permission("inventory.lots.manage")),
    db: Session = Depends(get_session),
):
    engine.lock_inventory(db)
    item = get_record(db, Item, item_id)
    old = db.get(InventoryPolicy, item_id)
    if data.tracking_mode != engine.tracking(db, item_id):
        if (
            db.scalar(
                select(MovementLine.id).where(MovementLine.item_id == item_id).limit(1)
            )
            or db.scalar(
                select(StockLot.id).where(StockLot.item_id == item_id).limit(1)
            )
            or db.scalar(
                select(StockBalance.id).where(StockBalance.item_id == item_id).limit(1)
            )
        ):
            engine.fail(
                "TRACKING_LOCKED",
                "Tracking mode is fixed after inventory activity or lot registration",
            )
    if (
        data.tracking_mode == "SERIAL"
        and get_record(db, Unit, item.unit_id).decimal_places != 0
    ):
        engine.fail(
            "SERIAL_UNIT",
            "Serial tracking requires an indivisible unit with zero decimal places",
            422,
        )
    if old:
        old.tracking_mode, old.updated_by, old.updated_at = (
            data.tracking_mode,
            context.user.id,
            utcnow(),
        )
    else:
        db.add(
            InventoryPolicy(
                item_id=item_id,
                tracking_mode=data.tracking_mode,
                updated_by=context.user.id,
            )
        )
    record_audit(db, context, "inventory.tracking", item, "updated", ["tracking_mode"])
    return finish(
        db, context, {"item_id": str(item_id), "tracking_mode": data.tracking_mode}
    )


@router.post("/lots", status_code=201)
def create_lot(
    data: LotInput,
    context=Depends(require_permission("inventory.lots.manage")),
    db: Session = Depends(get_session),
):
    engine.lock_inventory(db)
    item = get_record(db, Item, data.item_id)
    mode = engine.tracking(db, item.id)
    if mode == "NONE":
        engine.fail(
            "TRACKING_NOT_ENABLED",
            "Configure LOT or SERIAL tracking before registration",
            422,
        )
    identifier = normalized(data.identifier)
    if not identifier or len(identifier) > 120:
        engine.fail(
            "INVALID_LOT_IDENTIFIER", "Enter a valid lot/serial identifier", 422
        )
    lot = engine.identified(
        StockLot,
        "LOT",
        context.user,
        item_id=item.id,
        name=data.name,
        identifier=data.identifier,
        normalized_identifier=identifier,
        is_serial=mode == "SERIAL",
        status="ACTIVE",
        notes=data.notes,
    )
    db.add(lot)
    record_audit(
        db, context, "inventory.lots", lot, "created", ["identifier", "item_id"]
    )
    db.flush()
    return finish(db, context, output(lot))


@router.put("/lots/{lot_id}/status")
def set_lot_status(
    lot_id: uuid.UUID,
    data: LotStatus,
    context=Depends(require_permission("inventory.lots.manage")),
    db: Session = Depends(get_session),
):
    engine.lock_inventory(db)
    engine.authorize(db, context, "inventory.quality.manage")
    lot = engine.locked(db, StockLot, lot_id)
    if data.status == "BLOCKED" and db.scalar(
        select(StockBalance.id)
        .where(StockBalance.lot_id == lot.id, StockBalance.reserved > 0)
        .limit(1)
    ):
        engine.fail(
            "LOT_RESERVED", "Release active reservations before blocking this lot"
        )
    lot.status, lot.updated_at = data.status, utcnow()
    record_audit(
        db,
        context,
        "inventory.lots",
        lot,
        "status_changed",
        ["status"],
        reason=data.reason,
    )
    return finish(db, context, output(lot))


@router.get("/lots/{lot_id}/trace")
def trace(
    lot_id: uuid.UUID,
    context=Depends(require_permission("inventory.read")),
    db: Session = Depends(get_session),
):
    lot = get_record(db, StockLot, lot_id)
    movements = db.scalars(
        select(StockMovement)
        .join(MovementLine, MovementLine.movement_id == StockMovement.id)
        .where(MovementLine.lot_id == lot.id)
        .distinct()
        .order_by(StockMovement.created_at)
    ).all()
    return finish(
        db,
        context,
        {
            "lot": output(lot),
            "stock": queries.balances(db, item_id=lot.item_id, lot_id=lot.id),
            "movements": [engine.movement_view(db, row) for row in movements],
        },
    )


@router.get("/records/{resource}")
def records(
    resource: str,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    search: str = Query("", max_length=200),
    status: str = "",
    kind: str = "",
    item_id: uuid.UUID | None = None,
    location_id: uuid.UUID | None = None,
    warehouse_id: uuid.UUID | None = None,
    sort: str = "created_at",
    direction: str = "desc",
    context=Depends(require_permission("inventory.read")),
    db: Session = Depends(get_session),
):
    models = {
        "movements": StockMovement,
        "reservations": Reservation,
        "counts": StockCount,
        "lots": StockLot,
        "thresholds": StockThreshold,
    }
    if resource not in models:
        engine.fail("INVALID_RESOURCE", "Unknown inventory resource", 404)
    model = models[resource]
    query = select(model)
    if status and hasattr(model, "status"):
        query = query.where(model.status == status)
    if kind and resource == "movements":
        query = query.where(StockMovement.kind == kind)
    if item_id:
        if resource == "movements":
            query = query.where(
                StockMovement.id.in_(
                    select(MovementLine.movement_id).where(
                        MovementLine.item_id == item_id
                    )
                )
            )
        elif resource == "reservations":
            query = query.where(
                Reservation.balance_id.in_(
                    select(StockBalance.id).where(StockBalance.item_id == item_id)
                )
            )
        elif hasattr(model, "item_id"):
            query = query.where(model.item_id == item_id)
    if location_id and resource == "movements":
        query = query.where(
            StockMovement.id.in_(
                select(MovementLine.movement_id).where(
                    (MovementLine.source_id == location_id)
                    | (MovementLine.destination_id == location_id)
                )
            )
        )
    if location_id and resource == "reservations":
        query = query.where(
            Reservation.balance_id.in_(
                select(StockBalance.id).where(StockBalance.location_id == location_id)
            )
        )
    if location_id and resource in {"counts", "thresholds"}:
        query = query.where(model.location_id == location_id)
    if warehouse_id:
        locations = select(Location.id).where(Location.warehouse_id == warehouse_id)
        if resource == "movements":
            query = query.where(
                StockMovement.id.in_(
                    select(MovementLine.movement_id).where(
                        MovementLine.source_id.in_(locations)
                        | MovementLine.destination_id.in_(locations)
                    )
                )
            )
        elif resource == "reservations":
            query = query.where(
                Reservation.balance_id.in_(
                    select(StockBalance.id).where(
                        StockBalance.location_id.in_(locations)
                    )
                )
            )
        elif resource == "counts":
            query = query.where(StockCount.location_id.in_(locations))
        elif resource == "thresholds":
            query = query.where(StockThreshold.warehouse_id == warehouse_id)
    rows = []
    for row in db.scalars(query.order_by(model.id)):
        result = output(row)
        if resource == "reservations":
            balance = get_record(db, StockBalance, row.balance_id)
            result.update(
                item_id=str(balance.item_id),
                name=get_record(db, Item, balance.item_id).name,
                location_id=str(balance.location_id),
                location_name=get_record(db, Location, balance.location_id).name,
                unit_name=get_record(
                    db, Unit, get_record(db, Item, balance.item_id).unit_id
                ).name,
            )
        if resource == "thresholds":
            stock = queries.balances(
                db,
                item_id=row.item_id,
                warehouse_id=row.warehouse_id,
                location_id=row.location_id,
            )
            result.update(
                name=get_record(db, Item, row.item_id).name,
                available=stock[0]["available"] if stock else "0",
                unit_name=get_record(
                    db, Unit, get_record(db, Item, row.item_id).unit_id
                ).name,
                low_stock=Decimal(stock[0]["available"] if stock else "0")
                < row.minimum,
            )
        if (
            search
            and search.casefold()
            not in " ".join(
                str(result.get(key, ""))
                for key in ["name", "code", "source_reference", "identifier"]
            ).casefold()
        ):
            continue
        rows.append(result)
    return finish(db, context, page_result(rows, page, page_size, sort, direction))


@router.post("/movements", status_code=201)
def create_movement(
    data: MovementCreate,
    context=Depends(current_context),
    db: Session = Depends(get_session),
):
    return finish(
        db, context, engine.movement_view(db, engine.create_movement(db, context, data))
    )


@router.get("/movements/{identity}")
def movement_detail(
    identity: uuid.UUID,
    context=Depends(require_permission("inventory.read")),
    db: Session = Depends(get_session),
):
    return finish(
        db, context, engine.movement_view(db, get_record(db, StockMovement, identity))
    )


@router.put("/movements/{identity}")
def edit_movement(
    identity: uuid.UUID,
    data: MovementInput,
    context=Depends(current_context),
    db: Session = Depends(get_session),
):
    return finish(
        db,
        context,
        engine.movement_view(db, engine.edit_movement(db, context, identity, data)),
    )


@router.post("/movements/{identity}/{action}")
def movement_action(
    identity: uuid.UUID,
    action: str,
    data: Operation,
    context=Depends(current_context),
    db: Session = Depends(get_session),
):
    if action == "post":
        row = engine.post_movement(db, context, identity, data)
    elif action == "reverse":
        row = engine.reverse_movement(db, context, identity, data)
    elif action == "cancel":
        engine.lock_inventory(db)
        row = engine.locked(db, StockMovement, identity)
        engine.movement_authorize(db, context, row.kind, "create")
        if row.status != "DRAFT":
            engine.fail("NOT_DRAFT", "Only a draft can be cancelled")
        row.status = "CANCELLED"
        record_audit(db, context, "inventory.movements", row, "cancelled", ["status"])
    else:
        engine.fail("UNKNOWN_ACTION", "Unknown movement action", 404)
    return finish(db, context, engine.movement_view(db, row))


@router.post("/reservations", status_code=201)
def reserve(
    data: ReservationInput,
    context=Depends(require_permission("inventory.reservations.create")),
    db: Session = Depends(get_session),
):
    return finish(db, context, output(engine.create_reservation(db, context, data)))


@router.get("/reservations/{identity}")
def reservation_detail(
    identity: uuid.UUID,
    context=Depends(require_permission("inventory.read")),
    db: Session = Depends(get_session),
):
    return finish(db, context, output(get_record(db, Reservation, identity)))


@router.post("/reservations/{identity}/{action}")
def reservation_action(
    identity: uuid.UUID,
    action: str,
    data: Operation,
    context=Depends(current_context),
    db: Session = Depends(get_session),
):
    if action not in {"release", "cancel", "consume"}:
        engine.fail("UNKNOWN_ACTION", "Unknown reservation action", 404)
    engine.authorize(
        db,
        context,
        "inventory.reservations.consume"
        if action == "consume"
        else "inventory.reservations.release",
    )
    return finish(
        db,
        context,
        output(engine.close_reservation(db, context, identity, action, data)),
    )


@router.post("/counts", status_code=201)
def create_count(
    data: CountInput,
    context=Depends(require_permission("inventory.counts.create")),
    db: Session = Depends(get_session),
):
    return finish(
        db, context, engine.count_view(db, engine.create_count(db, context, data))
    )


@router.get("/counts/{identity}")
def count_detail(
    identity: uuid.UUID,
    context=Depends(require_permission("inventory.read")),
    db: Session = Depends(get_session),
):
    return finish(
        db, context, engine.count_view(db, get_record(db, StockCount, identity))
    )


@router.post("/counts/{identity}/record")
def count_record(
    identity: uuid.UUID,
    data: CountRecord,
    context=Depends(require_permission("inventory.counts.create")),
    db: Session = Depends(get_session),
):
    return finish(
        db,
        context,
        engine.count_view(db, engine.record_count(db, context, identity, data)),
    )


@router.post("/counts/{identity}/{action}")
def count_action(
    identity: uuid.UUID,
    action: str,
    data: Operation,
    context=Depends(current_context),
    db: Session = Depends(get_session),
):
    engine.authorize(
        db,
        context,
        "inventory.counts.post" if action == "post" else "inventory.counts.create",
    )
    if action == "post":
        row = engine.post_count(db, context, identity, data)
    elif action == "recount":
        row = engine.recount(db, context, identity)
    elif action in {"start", "cancel"}:
        engine.lock_inventory(db)
        row = engine.locked(db, StockCount, identity)
        if row.status in {"POSTED", "CANCELLED"}:
            engine.fail("COUNT_CLOSED", "This count is closed")
        row.status, row.updated_at = (
            "IN_PROGRESS" if action == "start" else "CANCELLED",
            utcnow(),
        )
        record_audit(db, context, "inventory.counts", row, action, ["status"])
    else:
        engine.fail("UNKNOWN_ACTION", "Unknown count action", 404)
    return finish(db, context, engine.count_view(db, row))


@router.put("/thresholds")
def set_threshold(
    data: ThresholdInput,
    context=Depends(require_permission("inventory.thresholds.manage")),
    db: Session = Depends(get_session),
):
    engine.lock_inventory(db)
    item = get_record(db, Item, data.item_id)
    get_record(db, Warehouse, data.warehouse_id)
    unit = get_record(db, Unit, item.unit_id)
    if data.minimum != data.minimum.quantize(Decimal(1).scaleb(-unit.decimal_places)):
        engine.fail(
            "INVALID_QUANTITY", "Minimum must respect the item's unit precision", 422
        )
    if (
        data.location_id
        and get_record(db, Location, data.location_id).warehouse_id != data.warehouse_id
    ):
        engine.fail(
            "LOCATION_WAREHOUSE",
            "Threshold location must belong to this warehouse",
            422,
        )
    row = db.scalar(
        select(StockThreshold).where(
            StockThreshold.item_id == data.item_id,
            StockThreshold.warehouse_id == data.warehouse_id,
            StockThreshold.location_id == data.location_id,
        )
    )
    if row:
        row.minimum, row.updated_by, row.updated_at = (
            data.minimum,
            context.user.id,
            utcnow(),
        )
    else:
        row = StockThreshold(
            id=uuid.uuid4(), **data.model_dump(), updated_by=context.user.id
        )
        db.add(row)
    record_audit(db, context, "inventory.thresholds", row, "updated", ["minimum"])
    return finish(db, context, output(row))
