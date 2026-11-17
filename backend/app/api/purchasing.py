import uuid
from fastapi import APIRouter, Depends, Query
from sqlalchemy import select, func
from sqlalchemy.orm import Session
from app.core.security import current_context, utcnow
from app.db.session import get_session
from app.models.master import Item, Unit
from app.models.inventory import (
    Location,
    Warehouse,
    StockLot,
    StockBalance,
    StockMovement,
)
from app.models.purchasing import (
    Supplier,
    SupplierContact,
    SupplierMaterial,
    Quotation,
    PurchaseRequest,
    PurchaseOrder,
    OrderLine,
    PurchaseReceipt,
    ProductionOrder,
    ProductionStage,
    ProductionEvent,
    ProductionCost,
    ScheduleUpdate,
    PurchasingImportKey,
    ProductionConversion,
)
from app.schemas.purchasing import (
    SupplierInput,
    ContactInput,
    MaterialInput,
    QuoteInput,
    RequestInput,
    OrderInput,
    ReceiptInput,
    ProductionInput,
    StageOperation,
    ScheduleInput,
    CostInput,
    ConversionInput,
    CompareInput,
    ImportPreview,
)
from app.schemas.inventory import Operation
from app.schemas.master import normalized
from app.schemas.purchasing import Strict
from pydantic import Field
from typing import Annotated
from app.services import (
    purchasing as service,
    purchasing_queries as queries,
    inventory as inv,
)
from app.services.master import output, get_record

router = APIRouter(prefix="/purchasing", tags=["Purchasing and external production"])
MODELS = {
    "suppliers": Supplier,
    "contacts": SupplierContact,
    "catalog": SupplierMaterial,
    "quotations": Quotation,
    "requests": PurchaseRequest,
    "orders": PurchaseOrder,
    "receipts": PurchaseReceipt,
    "production": ProductionOrder,
    "transfers": ProductionEvent,
    "schedules": ScheduleUpdate,
    "custody-locations": Location,
    "conversions": ProductionConversion,
}
READ = {
    "suppliers": "suppliers.read",
    "contacts": "suppliers.read",
    "catalog": "suppliers.read",
    "quotations": "suppliers.prices.read",
    "requests": "purchasing.requests.read",
    "orders": "purchasing.orders.read",
    "receipts": "purchasing.orders.read",
    "production": "production.read",
    "transfers": "production.read",
    "schedules": "purchasing.orders.read",
    "custody-locations": "production.read",
    "conversions": "production.read",
}


def finish(db, ctx, value):
    db.flush()
    value = service.clean(value, ctx)
    db.commit()
    return value


def view(db, resource, row):
    if resource in service.CONFIG:
        return service.document_view(db, resource, row)
    if resource == "production":
        return service.production_view(db, row)
    if resource == "receipts":
        return service.receipt_view(db, row)
    result = output(row)
    if getattr(row, "supplier_id", None):
        result["supplier_name"] = get_record(db, Supplier, row.supplier_id).name
    if getattr(row, "item_id", None):
        result["item_name"] = get_record(db, Item, row.item_id).name
    if resource == "catalog":
        result["unit_name"] = get_record(db, Unit, row.unit_id).name
        result["availability_status"] = (
            "Verified supplier report; not live stock"
            if row.verified_on
            and row.verified_on >= service.business_today() - service.timedelta(days=30)
            else "Stale or unverified"
        )
    if resource == "conversions":
        result["input_lines"] = inv.movement_view(
            db, get_record(db, StockMovement, row.input_movement_id)
        )["lines"]
        result["output_lines"] = inv.movement_view(
            db, get_record(db, StockMovement, row.output_movement_id)
        )["lines"]
    result["name"] = (
        result.get("name")
        or result.get("supplier_name")
        or result.get("reference")
        or result.get("code")
        or result.get("reason")
        or str(row.id)
    )
    return result


@router.get("/dashboard")
def dashboard(ctx=Depends(current_context), db: Session = Depends(get_session)):
    if not {"purchasing.orders.read", "production.read"}.intersection(ctx.permissions):
        service.authorize(db, ctx, "purchasing.orders.read")
    result = queries.dashboard(db)
    if "purchasing.orders.read" not in ctx.permissions:
        result = {
            k: v
            for k, v in result.items()
            if k
            in {
                "active_production",
                "production_orders",
                "stages",
                "delayed_stages",
                "pending_collection",
                "latest_events",
                "ownership_note",
            }
        }
    if "production.read" not in ctx.permissions:
        result = {
            k: v
            for k, v in result.items()
            if k
            not in {
                "production_orders",
                "stages",
                "delayed_stages",
                "pending_collection",
                "latest_events",
            }
        }
    return finish(db, ctx, result)


@router.get("/options/{resource}")
def options(
    resource: str,
    search: str = Query("", max_length=200),
    page: int = Query(1, ge=1),
    page_size: int = Query(30, ge=1, le=100),
    ctx=Depends(current_context),
    db: Session = Depends(get_session),
):
    if not any(
        p in ctx.permissions
        for p in [
            "suppliers.read",
            "purchasing.orders.read",
            "production.read",
            "purchasing.requests.create",
        ]
    ):
        service.authorize(db, ctx, "suppliers.read")
    models = {
        "suppliers": Supplier,
        "items": Item,
        "units": Unit,
        "warehouses": Warehouse,
        "locations": Location,
        "lots": StockLot,
        "orders": PurchaseOrder,
        "production": ProductionOrder,
        "quotations": Quotation,
        "requests": PurchaseRequest,
    }
    if resource not in models:
        inv.fail("UNKNOWN_OPTIONS", "Unknown purchasing references", 404)
    for restricted, permission in [
        ("orders", "purchasing.orders.read"),
        ("quotations", "suppliers.prices.read"),
        ("requests", "purchasing.requests.read"),
    ]:
        if resource == restricted:
            service.authorize(db, ctx, permission)
    model = models[resource]
    query = select(model)
    if hasattr(model, "is_active"):
        query = query.where(model.is_active.is_(True))
    rows = []
    for r in db.scalars(query.order_by(model.id)):
        name = getattr(r, "name", None) or getattr(r, "code", str(r.id))
        if search.casefold() not in name.casefold():
            continue
        entry = {"id": str(r.id), "name": name}
        for key in [
            "unit_id",
            "warehouse_id",
            "supplier_id",
            "item_id",
            "kind",
            "status",
            "identifier",
        ]:
            if getattr(r, key, None) is not None:
                entry[key] = str(getattr(r, key))
        rows.append(entry)
    return finish(
        db,
        ctx,
        {
            "items": rows[(page - 1) * page_size : page * page_size],
            "total": len(rows),
            "page": page,
            "page_size": page_size,
        },
    )


@router.post("/compare")
def compare(
    data: CompareInput, ctx=Depends(current_context), db: Session = Depends(get_session)
):
    service.authorize(db, ctx, "suppliers.prices.read")
    return finish(db, ctx, service.compare(db, data))


@router.post("/suppliers", status_code=201)
def supplier_create(
    data: SupplierInput,
    ctx=Depends(current_context),
    db: Session = Depends(get_session),
):
    return finish(db, ctx, output(service.supplier_save(db, ctx, data)))


@router.put("/suppliers/{identity}")
def supplier_update(
    identity: uuid.UUID,
    data: SupplierInput,
    ctx=Depends(current_context),
    db: Session = Depends(get_session),
):
    return finish(db, ctx, output(service.supplier_save(db, ctx, data, identity)))


@router.post("/contacts", status_code=201)
def contact_create(
    data: ContactInput, ctx=Depends(current_context), db: Session = Depends(get_session)
):
    return contact_save(None, data, ctx, db)


@router.put("/contacts/{identity}")
def contact_save(
    identity: uuid.UUID,
    data: ContactInput,
    ctx=Depends(current_context),
    db: Session = Depends(get_session),
):
    inv.lock_inventory(db)
    service.authorize(db, ctx, "suppliers.update")
    service.active(db, Supplier, data.supplier_id)
    row = (
        inv.locked(db, SupplierContact, identity)
        if identity
        else SupplierContact(**data.model_dump())
    )
    if identity and row.supplier_id != data.supplier_id:
        inv.fail("CONTACT_SUPPLIER", "Contact ownership cannot change", 422)
    if data.is_main:
        for old in db.scalars(
            select(SupplierContact).where(
                SupplierContact.supplier_id == data.supplier_id,
                SupplierContact.is_main.is_(True),
            )
        ):
            old.is_main = False
    for key, value in data.model_dump().items():
        setattr(row, key, value)
    db.add(row)
    db.flush()
    service.audit(db, ctx, row, "contact_saved", ["contact_fields"])
    return finish(db, ctx, output(row))


@router.put("/catalog")
def catalog(
    data: MaterialInput,
    ctx=Depends(current_context),
    db: Session = Depends(get_session),
):
    inv.lock_inventory(db)
    service.authorize(db, ctx, "suppliers.update")
    service.active(db, Supplier, data.supplier_id)
    service.active(db, Item, data.item_id)
    service.active(db, Unit, data.unit_id)
    row = db.scalar(
        select(SupplierMaterial).where(
            SupplierMaterial.supplier_id == data.supplier_id,
            SupplierMaterial.item_id == data.item_id,
        )
    )
    if not row:
        row = SupplierMaterial(**data.model_dump())
        db.add(row)
    else:
        for key, value in data.model_dump().items():
            setattr(row, key, value)
    db.flush()
    service.audit(db, ctx, row, "catalog_saved", ["material", "reported_availability"])
    return finish(db, ctx, view(db, "catalog", row))


@router.post("/quotations", status_code=201)
def quote_create(
    data: QuoteInput, ctx=Depends(current_context), db: Session = Depends(get_session)
):
    return finish(
        db,
        ctx,
        service.document_view(
            db, "quotations", service.save_document(db, ctx, "quotations", data)
        ),
    )


@router.put("/quotations/{identity}")
def quote_edit(
    identity: uuid.UUID,
    data: QuoteInput,
    ctx=Depends(current_context),
    db: Session = Depends(get_session),
):
    return finish(
        db,
        ctx,
        service.document_view(
            db,
            "quotations",
            service.save_document(db, ctx, "quotations", data, identity),
        ),
    )


@router.post("/requests", status_code=201)
def request_create(
    data: RequestInput, ctx=Depends(current_context), db: Session = Depends(get_session)
):
    return finish(
        db,
        ctx,
        service.document_view(
            db, "requests", service.save_document(db, ctx, "requests", data)
        ),
    )


@router.put("/requests/{identity}")
def request_edit(
    identity: uuid.UUID,
    data: RequestInput,
    ctx=Depends(current_context),
    db: Session = Depends(get_session),
):
    return finish(
        db,
        ctx,
        service.document_view(
            db, "requests", service.save_document(db, ctx, "requests", data, identity)
        ),
    )


@router.post("/orders", status_code=201)
def order_create(
    data: OrderInput, ctx=Depends(current_context), db: Session = Depends(get_session)
):
    return finish(
        db,
        ctx,
        service.document_view(
            db, "orders", service.save_document(db, ctx, "orders", data)
        ),
    )


@router.put("/orders/{identity}")
def order_edit(
    identity: uuid.UUID,
    data: OrderInput,
    ctx=Depends(current_context),
    db: Session = Depends(get_session),
):
    return finish(
        db,
        ctx,
        service.document_view(
            db, "orders", service.save_document(db, ctx, "orders", data, identity)
        ),
    )


class Amendment(Strict):
    reason: Annotated[str, Field(min_length=10, max_length=1000)]
    replacement: OrderInput


@router.post("/orders/{identity}/amend")
def amend(
    identity: uuid.UUID,
    data: Amendment,
    ctx=Depends(current_context),
    db: Session = Depends(get_session),
):
    return finish(
        db,
        ctx,
        service.document_view(
            db,
            "orders",
            service.amend_order(db, ctx, identity, data.replacement, data.reason),
        ),
    )


@router.post("/receipts", status_code=201)
def receipt_create(
    data: ReceiptInput, ctx=Depends(current_context), db: Session = Depends(get_session)
):
    return finish(
        db, ctx, service.receipt_view(db, service.create_receipt(db, ctx, data))
    )


@router.post("/receipts/{identity}/{action}")
def receipt_action(
    identity: uuid.UUID,
    action: str,
    data: Operation,
    ctx=Depends(current_context),
    db: Session = Depends(get_session),
):
    if action == "post":
        row = service.post_receipt(db, ctx, identity, data)
    elif action == "reverse":
        row = service.reverse_receipt(db, ctx, identity, data)
    elif action == "cancel":
        inv.lock_inventory(db)
        service.authorize(db, ctx, "purchasing.receipts.create")
        row = inv.locked(db, PurchaseReceipt, identity)
        if row.status != "DRAFT":
            inv.fail("NOT_DRAFT", "Only draft receipts can be cancelled")
        row.status = "CANCELLED"
        service.audit(db, ctx, row, "receipt_cancelled", ["status"], data.reason)
    else:
        inv.fail("UNKNOWN_ACTION", "Unknown receipt action", 404)
    return finish(db, ctx, service.receipt_view(db, row))


@router.post("/production", status_code=201)
def production_create(
    data: ProductionInput,
    ctx=Depends(current_context),
    db: Session = Depends(get_session),
):
    return finish(
        db, ctx, service.production_view(db, service.production_create(db, ctx, data))
    )


@router.put("/production/{identity}")
def production_edit(
    identity: uuid.UUID,
    data: ProductionInput,
    ctx=Depends(current_context),
    db: Session = Depends(get_session),
):
    return finish(
        db,
        ctx,
        service.production_view(db, service.production_create(db, ctx, data, identity)),
    )


@router.post("/production/{identity}/cancel")
def production_cancel(
    identity: uuid.UUID,
    data: Operation,
    ctx=Depends(current_context),
    db: Session = Depends(get_session),
):
    inv.lock_inventory(db)
    service.authorize(db, ctx, "production.manage")
    row = inv.locked(db, ProductionOrder, identity)
    if row.status != "DRAFT":
        inv.fail(
            "PRODUCTION_STARTED",
            "Started production cannot be cancelled while custody remains; complete or reconcile it explicitly",
        )
    row.status = "CANCELLED"
    service.audit(db, ctx, row, "production_cancelled", ["status"], data.reason)
    return finish(db, ctx, service.production_view(db, row))


@router.post("/stages/{identity}/{action}")
def stage_action(
    identity: uuid.UUID,
    action: str,
    data: StageOperation,
    ctx=Depends(current_context),
    db: Session = Depends(get_session),
):
    return finish(
        db, ctx, output(service.stage_action(db, ctx, identity, action, data))
    )


class CustodyInput(Strict):
    name: Annotated[str, Field(min_length=1, max_length=200)]
    supplier_id: uuid.UUID
    warehouse_id: uuid.UUID
    is_active: bool = True


@router.post("/custody-locations", status_code=201)
def custody(
    data: CustodyInput, ctx=Depends(current_context), db: Session = Depends(get_session)
):
    inv.lock_inventory(db)
    service.authorize(db, ctx, "production.manage")
    service.authorize(db, ctx, "inventory.locations.manage")
    service.active(db, Supplier, data.supplier_id)
    service.active(db, Warehouse, data.warehouse_id)
    row = inv.identified(
        Location, "LOC", ctx.user, kind="EXTERNAL", **data.model_dump()
    )
    db.add(row)
    db.flush()
    service.audit(db, ctx, row, "custody_location_created", ["supplier", "warehouse"])
    return finish(db, ctx, output(row))


@router.put("/custody-locations/{identity}")
def custody_edit(
    identity: uuid.UUID,
    data: CustodyInput,
    ctx=Depends(current_context),
    db: Session = Depends(get_session),
):
    inv.lock_inventory(db)
    service.authorize(db, ctx, "production.manage")
    service.authorize(db, ctx, "inventory.locations.manage")
    row = inv.locked(db, Location, identity)
    if (
        row.kind != "EXTERNAL"
        or row.supplier_id != data.supplier_id
        or row.warehouse_id != data.warehouse_id
    ):
        inv.fail(
            "CUSTODY_IDENTITY_LOCKED",
            "Custodian and warehouse identities cannot be reassigned; register a new verified custody location",
        )
    if not data.is_active and (
        db.scalar(
            select(StockBalance.id).where(
                StockBalance.location_id == identity, StockBalance.on_hand > 0
            )
        )
        or db.scalar(
            select(ProductionStage.id)
            .join(ProductionOrder, ProductionOrder.id == ProductionStage.order_id)
            .where(
                ProductionStage.location_id == identity,
                ProductionOrder.status.in_(["DRAFT", "ACTIVE"]),
            )
        )
    ):
        inv.fail(
            "CUSTODY_ACTIVE",
            "Reconcile owned stock and active plans before archiving custody",
        )
    row.name = data.name
    row.is_active = data.is_active
    row.updated_at = utcnow()
    service.audit(db, ctx, row, "custody_location_updated", ["name", "is_active"])
    return finish(db, ctx, output(row))


@router.post("/conversions", status_code=201)
def conversion(
    data: ConversionInput,
    ctx=Depends(current_context),
    db: Session = Depends(get_session),
):
    return finish(db, ctx, output(service.convert(db, ctx, data)))


@router.post("/schedules", status_code=201)
def schedule(
    data: ScheduleInput,
    ctx=Depends(current_context),
    db: Session = Depends(get_session),
):
    inv.lock_inventory(db)
    service.authorize(
        db,
        ctx,
        "production.stages.update" if data.stage_id else "purchasing.orders.confirm",
    )
    if data.order_id:
        get_record(db, PurchaseOrder, data.order_id)
    if data.stage_id:
        get_record(db, ProductionStage, data.stage_id)
    row = ScheduleUpdate(actor_id=ctx.user.id, **data.model_dump())
    db.add(row)
    db.flush()
    service.audit(db, ctx, row, "schedule_updated", ["recorded_dates", "evidence"])
    return finish(db, ctx, output(row))


@router.post("/production/{identity}/costs", status_code=201)
def costs(
    identity: uuid.UUID,
    data: CostInput,
    ctx=Depends(current_context),
    db: Session = Depends(get_session),
):
    inv.lock_inventory(db)
    service.authorize(db, ctx, "production.costs.manage")
    get_record(db, ProductionOrder, identity)
    service.active(db, Supplier, data.supplier_id)
    old = db.scalar(
        select(ProductionCost).where(ProductionCost.request_key == data.request_key)
    )
    if old:
        if old.order_id != identity or any(
            getattr(old, k) != v
            for k, v in data.model_dump(exclude={"request_key"}).items()
        ):
            inv.fail(
                "IDEMPOTENCY_CONFLICT",
                "Cost key already belongs to another recorded amount",
            )
        return finish(db, ctx, output(old))
    total = db.scalar(
        select(func.coalesce(func.sum(ProductionCost.amount), 0)).where(
            ProductionCost.order_id == identity,
            ProductionCost.currency == data.currency,
        )
    )
    if not data.amount or total + data.amount < 0:
        inv.fail(
            "COST_CORRECTION",
            "Cost corrections require nonzero amounts and cannot make the currency total negative",
            422,
        )
    row = ProductionCost(order_id=identity, actor_id=ctx.user.id, **data.model_dump())
    db.add(row)
    db.flush()
    service.audit(
        db, ctx, row, "production_cost_recorded", ["amount", "currency", "unallocated"]
    )
    return finish(db, ctx, output(row))


@router.post("/import-preview")
def import_preview(
    data: ImportPreview,
    ctx=Depends(current_context),
    db: Session = Depends(get_session),
):
    service.authorize(db, ctx, "suppliers.create")
    rows = []
    seen = set()
    for index, row in enumerate(data.rows):
        key = str(row.get("source_key", ""))
        name = str(row.get("name", ""))
        issues = []
        if not key or not name:
            issues.append("source_key and supplier name required")
        if key in seen:
            issues.append("Duplicate source key in batch")
        seen.add(key)
        existing = db.scalar(
            select(PurchasingImportKey).where(
                PurchasingImportKey.source_system == data.source_system,
                PurchasingImportKey.resource == "suppliers",
                PurchasingImportKey.source_key == key,
            )
        )
        matches = (
            db.scalars(
                select(Supplier.id).where(Supplier.normalized_name == normalized(name))
            ).all()
            if name
            else []
        )
        rows.append(
            {
                "row": index + 1,
                "source_key": key,
                "mapped_id": str(existing.target_id) if existing else None,
                "duplicate_candidates": [str(v) for v in matches],
                "issues": issues,
                "action": "REVIEW"
                if issues or matches
                else "ALREADY_MAPPED"
                if existing
                else "VALIDATE_BEFORE_APPROVED_IMPORT",
            }
        )
    return {
        "dry_run": True,
        "writes": 0,
        "rows": rows,
        "policy": "No Odoo connection or automatic import. Resolve identities, reconcile quantities and approve a separately reviewed Phase 9 import.",
    }


@router.post("/{resource}/{identity}/{action}")
def document_action(
    resource: str,
    identity: uuid.UUID,
    action: str,
    data: Operation,
    ctx=Depends(current_context),
    db: Session = Depends(get_session),
):
    if resource not in service.CONFIG:
        inv.fail("UNKNOWN_RESOURCE", "Unknown document action", 404)
    return finish(
        db,
        ctx,
        service.document_view(
            db,
            resource,
            service.document_action(db, ctx, resource, identity, action, data),
        ),
    )


@router.get("/{resource}/{identity}")
def detail(
    resource: str,
    identity: uuid.UUID,
    ctx=Depends(current_context),
    db: Session = Depends(get_session),
):
    if resource not in MODELS:
        inv.fail("UNKNOWN_RESOURCE", "Unknown purchasing resource", 404)
    service.authorize(db, ctx, READ[resource])
    row = get_record(db, MODELS[resource], identity)
    result = view(db, resource, row)
    if resource == "orders" and "production.read" in ctx.permissions:
        result["outstanding_work"] = [
            service.production_view(db, p)
            for p in db.scalars(
                select(ProductionOrder)
                .where(
                    ProductionOrder.purchase_order_line_id.in_(
                        select(OrderLine.id).where(OrderLine.order_id == identity)
                    )
                )
                .order_by(ProductionOrder.created_at)
            )
        ]
    if resource == "suppliers":
        result["contacts"] = [
            output(r)
            for r in db.scalars(
                select(SupplierContact).where(SupplierContact.supplier_id == identity)
            )
        ]
        result["catalog"] = [
            view(db, "catalog", r)
            for r in db.scalars(
                select(SupplierMaterial).where(SupplierMaterial.supplier_id == identity)
            )
        ]
        if "purchasing.orders.read" in ctx.permissions:
            result["orders"] = [
                service.document_view(db, "orders", r)
                for r in db.scalars(
                    select(PurchaseOrder).where(PurchaseOrder.supplier_id == identity)
                )
            ]
        if "suppliers.prices.read" in ctx.permissions:
            result["quotations"] = [
                service.document_view(db, "quotations", r)
                for r in db.scalars(
                    select(Quotation).where(Quotation.supplier_id == identity)
                )
            ]
        if "production.read" in ctx.permissions:
            result["outstanding_work"] = [
                service.production_view(db, r)
                for r in db.scalars(
                    select(ProductionOrder).where(
                        ProductionOrder.id.in_(
                            select(ProductionStage.order_id).where(
                                ProductionStage.supplier_id == identity
                            )
                        ),
                        ProductionOrder.status.in_(["DRAFT", "ACTIVE"]),
                    )
                )
            ]
    return finish(db, ctx, result)


@router.get("/{resource}")
def records(
    resource: str,
    search: str = Query("", max_length=200),
    status: str = Query("", max_length=24),
    supplier_id: uuid.UUID | None = None,
    item_id: uuid.UUID | None = None,
    supplier_type: str = Query("", max_length=30),
    open_only: bool = False,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    sort: str = "created_at",
    direction: str = "desc",
    ctx=Depends(current_context),
    db: Session = Depends(get_session),
):
    if resource not in MODELS:
        inv.fail("UNKNOWN_RESOURCE", "Unknown purchasing resource", 404)
    service.authorize(db, ctx, READ[resource])
    model = MODELS[resource]
    query = select(model)
    if status and hasattr(model, "status"):
        query = query.where(model.status == status)
    if supplier_id and hasattr(model, "supplier_id"):
        query = query.where(model.supplier_id == supplier_id)
    if item_id and hasattr(model, "item_id"):
        query = query.where(model.item_id == item_id)
    if open_only and resource == "orders":
        query = query.where(
            PurchaseOrder.status.in_(["CONFIRMED", "PARTIALLY_RECEIVED"])
        )
    if item_id and resource in service.CONFIG:
        line_model = service.CONFIG[resource][1]
        fk = service.CONFIG[resource][2]
        query = query.where(
            model.id.in_(
                select(getattr(line_model, fk)).where(line_model.item_id == item_id)
            )
        )
    if resource == "custody-locations":
        query = query.where(Location.kind == "EXTERNAL")
    if resource == "transfers":
        query = query.where(ProductionEvent.kind.in_(["START", "TRANSFER", "YARD"]))
    if supplier_type and resource == "suppliers":
        query = query.where(Supplier.types.contains([supplier_type]))
    rows = [view(db, resource, r) for r in db.scalars(query.order_by(model.id))]
    if search:
        rows = [
            r
            for r in rows
            if normalized(search)
            in normalized(
                " ".join(
                    str(r.get(k) or "")
                    for k in [
                        "name",
                        "code",
                        "supplier_name",
                        "item_name",
                        "reference",
                        "status",
                        "normalized_name",
                    ]
                )
            )
        ]
    if sort not in {"created_at", "name", "code", "status"} or direction not in {
        "asc",
        "desc",
    }:
        inv.fail("INVALID_SORT", "Select an allowed sort field and direction", 422)
    rows.sort(key=lambda r: str(r.get(sort) or ""), reverse=direction == "desc")
    return finish(
        db,
        ctx,
        {
            "items": rows[(page - 1) * page_size : page * page_size],
            "total": len(rows),
            "page": page,
            "page_size": page_size,
        },
    )
