import uuid
from decimal import Decimal
from fastapi import APIRouter, Depends, Query
from sqlalchemy import select, func
from sqlalchemy.orm import Session
from app.core.security import current_context
from app.db.session import get_session
from app.models.sales import SalesOrder, SalesDelivery
from app.models.master import Customer, Project, Lpo, Item, Unit
from app.models.inventory import Warehouse
from app.models.security import User
from app.schemas.sales import OrderInput, Amendment, Allocate, Prepare, Actual, Reverse
from app.schemas.inventory import Operation, Nonnegative
from app.services import sales as service, inventory as inv
from app.services.master import get_record

router = APIRouter(prefix="/sales", tags=["Orders and dispatch"])


def read(db, ctx, permission):
    inv.authorize(db, ctx, "sales." + permission)
    inv.lock_inventory(db)


def finish(db, ctx, row):
    result = (
        service.delivery_view(db, row)
        if isinstance(row, SalesDelivery)
        else service.view(db, row)
    )
    result = inv.public(result, ctx)
    db.commit()
    return result


@router.get("/orders")
def orders(
    search: str = Query("", max_length=120),
    status: str | None = None,
    outstanding: bool = False,
    page: int = Query(1, ge=1),
    customer_id: uuid.UUID | None = None,
    project_id: uuid.UUID | None = None,
    db: Session = Depends(get_session),
    ctx=Depends(current_context),
):
    read(db, ctx, "orders.read")
    query = select(SalesOrder).join(Customer, Customer.id == SalesOrder.customer_id)
    if search:
        query = query.where(
            SalesOrder.code.ilike("%" + search + "%")
            | Customer.name.ilike("%" + search + "%")
        )
    if status:
        query = query.where(SalesOrder.status == status)
    if outstanding:
        query = query.where(
            SalesOrder.status.in_(["CONFIRMED", "PARTIALLY_DISPATCHED"])
        )
    if customer_id:
        query = query.where(SalesOrder.customer_id == customer_id)
    if project_id:
        query = query.where(SalesOrder.project_id == project_id)
    total = db.scalar(select(func.count()).select_from(query.subquery()))
    rows = db.scalars(
        query.order_by(SalesOrder.created_at.desc(), SalesOrder.id)
        .offset((page - 1) * 25)
        .limit(25)
    )
    return {
        "items": [inv.public(service.view(db, r), ctx) for r in rows],
        "total": total,
        "page": page,
        "page_size": 25,
    }


@router.get("/orders/{identity}")
def order(
    identity: uuid.UUID,
    db: Session = Depends(get_session),
    ctx=Depends(current_context),
):
    read(db, ctx, "orders.read")
    return inv.public(service.view(db, get_record(db, SalesOrder, identity)), ctx)


@router.post("/orders", status_code=201)
def create(
    data: OrderInput, db: Session = Depends(get_session), ctx=Depends(current_context)
):
    return finish(db, ctx, service.execute(db, ctx, "create", data))


def register(action, schema, resource="orders"):
    def endpoint(
        identity: uuid.UUID,
        data: schema,
        db: Session = Depends(get_session),
        ctx=Depends(current_context),
    ):
        return finish(db, ctx, service.execute(db, ctx, action, data, identity))

    route_action = "cancel" if action == "cancel-delivery" else action
    router.add_api_route(
        f"/{resource}/{{identity}}/{route_action}",
        endpoint,
        methods=["POST"],
        name=f"sales_{action}",
    )


for action, schema in [
    ("confirm", Operation),
    ("edit", Amendment),
    ("amend", Amendment),
    ("cancel", Operation),
    ("allocate", Allocate),
    ("release", Operation),
    ("prepare", Prepare),
]:
    register(action, schema)
for action, schema in [
    ("pick", Actual),
    ("load", Actual),
    ("dispatch", Operation),
    ("reverse", Reverse),
    ("cancel-delivery", Operation),
]:
    register(action, schema, "deliveries")


@router.get("/deliveries")
def deliveries(
    status: str | None = None,
    page: int = Query(1, ge=1),
    db: Session = Depends(get_session),
    ctx=Depends(current_context),
):
    read(db, ctx, "deliveries.read")
    query = select(SalesDelivery)
    if status:
        query = query.where(SalesDelivery.status == status)
    total = db.scalar(select(func.count()).select_from(query.subquery()))
    return {
        "items": [
            service.delivery_view(db, d)
            for d in db.scalars(
                query.order_by(SalesDelivery.created_at.desc(), SalesDelivery.id)
                .offset((page - 1) * 25)
                .limit(25)
            )
        ],
        "total": total,
        "page": page,
        "page_size": 25,
    }


@router.get("/deliveries/{identity}")
def delivery(
    identity: uuid.UUID,
    db: Session = Depends(get_session),
    ctx=Depends(current_context),
):
    read(db, ctx, "deliveries.read")
    return service.delivery_view(db, get_record(db, SalesDelivery, identity))


@router.get("/availability/{item_id}")
def availability(
    item_id: uuid.UUID,
    warehouse_id: uuid.UUID | None = None,
    ordered: Nonnegative = Decimal(0),
    db: Session = Depends(get_session),
    ctx=Depends(current_context),
):
    read(db, ctx, "orders.read")
    get_record(db, Item, item_id)
    result = service.stock(db, item_id, warehouse_id)
    available = Decimal(result["available"])
    result.update(
        fulfillable=str(min(ordered, available)),
        shortage=str(max(Decimal(0), ordered - available)),
    )
    return result


@router.get("/options")
def options(db: Session = Depends(get_session), ctx=Depends(current_context)):
    read(db, ctx, "orders.read")
    return {
        "customers": [
            dict(id=str(c.id), name=c.name, address=c.address)
            for c in db.scalars(select(Customer).where(Customer.is_active))
        ],
        "projects": [
            dict(
                id=str(p.id),
                name=p.name,
                customer_id=str(p.customer_id),
                location=p.location,
            )
            for p in db.scalars(select(Project).where(Project.status == "active"))
        ],
        "lpos": [
            dict(
                id=str(l.id),
                name=l.number,
                customer_id=str(l.customer_id),
                project_id=str(l.project_id) if l.project_id else None,
            )
            for l in db.scalars(select(Lpo).where(Lpo.status == "active"))
        ],
        "items": [
            dict(
                id=str(i.id),
                name=i.name,
                unit_id=str(i.unit_id),
                unit_name=get_record(db, Unit, i.unit_id).name,
            )
            for i in db.scalars(select(Item).where(Item.is_active))
        ],
        "warehouses": [
            dict(id=str(w.id), name=w.name)
            for w in db.scalars(select(Warehouse).where(Warehouse.is_active))
        ],
        "drivers": [
            dict(id=str(u.id), name=u.display_name)
            for u in db.scalars(select(User).where(User.is_active))
            if any(r.code == "DRIVER" for r in u.roles)
        ],
    }
