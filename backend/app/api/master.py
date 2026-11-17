import uuid

from fastapi import APIRouter, Depends, Query
from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session

from app.core.security import (
    SecurityContext,
    SecurityError,
    current_context,
    deny,
    require_permission,
    utcnow,
)
from app.db.session import get_session
from app.models.master import Customer, Item, ItemImage, Lpo
from app.schemas.master import (
    Activation,
    CategoryInput,
    CustomerInput,
    FamilyInput,
    ItemInput,
    LpoInput,
    MasterPage,
    ProjectInput,
    UnitInput,
    normalized,
)
from app.services.master import (
    RESOURCES,
    commit,
    get_record,
    output,
    record_audit,
    save,
)

router = APIRouter(prefix="/master", tags=["Business master data"])
SCHEMAS = dict(
    zip(
        RESOURCES,
        [
            CustomerInput,
            ProjectInput,
            LpoInput,
            ItemInput,
            CategoryInput,
            UnitInput,
            FamilyInput,
        ],
    )
)


def read_permission(resource):
    def permission(
        context: SecurityContext = Depends(current_context),
        db: Session = Depends(get_session),
    ):
        allowed = (
            {f"{resource}.read"}
            if resource not in {"categories", "units", "families"}
            else {"items.read", f"{resource}.manage"}
        )
        if not allowed.intersection(context.permissions):
            deny(
                db,
                403,
                "PERMISSION_DENIED",
                "You do not have permission to view this master data",
                context.user,
                details={"resource": resource},
            )
        return context

    return permission


def register(resource, schema):
    model = RESOURCES[resource][0]
    reference = resource in {"categories", "units", "families"}
    create_permission = f"{resource}.manage" if reference else f"{resource}.create"
    update_permission = f"{resource}.manage" if reference else f"{resource}.update"

    def listing(
        page: int = Query(1, ge=1),
        page_size: int = Query(20, ge=1, le=100),
        search: str = Query("", max_length=200),
        active: bool | None = None,
        status: str | None = Query(None, max_length=20),
        customer_id: uuid.UUID | None = None,
        project_id: uuid.UUID | None = None,
        category_id: uuid.UUID | None = None,
        family_id: uuid.UUID | None = None,
        item_type: str | None = Query(None, max_length=30),
        attribute_key: str | None = Query(None, max_length=40),
        attribute_value: str | None = Query(None, max_length=100),
        sort: str = "name",
        direction: str = "asc",
        context=Depends(read_permission(resource)),
        db: Session = Depends(get_session),
    ):
        if sort not in {
            "name",
            "code",
            "created_at",
            "updated_at",
        } or direction not in {"asc", "desc"}:
            raise SecurityError(
                422,
                "INVALID_SORT",
                "Choose name, code, created_at or updated_at and asc or desc",
            )
        query = select(model)
        if search.strip():
            term = (
                normalized(search)
                .replace("\\", "\\\\")
                .replace("%", "\\%")
                .replace("_", "\\_")
            )
            columns = [model.name, model.code]
            if resource == "customers":
                columns.append(Customer.normalized_name)
            if resource == "lpos":
                columns.append(Lpo.number)
            query = query.where(
                or_(*(func.lower(c).like(f"%{term}%", escape="\\") for c in columns))
            )
        if active is not None:
            query = query.where(model.is_active == active)
        for key, value in dict(
            status=status,
            customer_id=customer_id,
            project_id=project_id,
            category_id=category_id,
            family_id=family_id,
            item_type=item_type,
        ).items():
            if value is not None:
                if not hasattr(model, key):
                    raise SecurityError(
                        422,
                        "INVALID_FILTER",
                        "This filter is not applicable to this resource",
                    )
                query = query.where(getattr(model, key) == value)
        if attribute_key is not None or attribute_value is not None:
            if resource != "items" or not attribute_key or not attribute_value:
                raise SecurityError(
                    422, "INVALID_FILTER", "Supply both an item attribute key and value"
                )
            query = query.where(
                Item.attributes.contains(
                    {normalized(attribute_key): normalized(attribute_value)}
                )
            )
        total = db.scalar(select(func.count()).select_from(query.subquery()))
        column = getattr(model, sort)
        rows = db.scalars(
            query.order_by(
                column.desc() if direction == "desc" else column.asc(), model.id
            )
            .offset((page - 1) * page_size)
            .limit(page_size)
        ).all()
        result = {
            "items": [output(row) for row in rows],
            "total": total,
            "page": page,
            "page_size": page_size,
        }
        db.commit()
        return result

    def detail(
        record_id: uuid.UUID,
        context=Depends(read_permission(resource)),
        db: Session = Depends(get_session),
    ):
        result = output(get_record(db, model, record_id))
        if resource == "items":
            image = db.scalar(select(ItemImage).where(ItemImage.item_id == record_id))
            result["image"] = output(image) if image else None
        db.commit()
        return result

    def create(
        data: schema,
        context=Depends(require_permission(create_permission)),
        db: Session = Depends(get_session),
    ):
        return save(db, context, resource, data)

    def update(
        record_id: uuid.UUID,
        data: schema,
        context=Depends(require_permission(update_permission)),
        db: Session = Depends(get_session),
    ):
        return save(db, context, resource, data, get_record(db, model, record_id))

    def activation(
        record_id: uuid.UUID,
        data: Activation,
        context=Depends(
            require_permission(
                f"{resource}.manage" if reference else f"{resource}.archive"
            )
        ),
        db: Session = Depends(get_session),
    ):
        row = get_record(db, model, record_id)
        if resource == "items" and not data.is_active:
            from app.models.inventory import StockBalance

            if db.scalar(
                select(StockBalance.id)
                .where(StockBalance.item_id == row.id, StockBalance.on_hand > 0)
                .limit(1)
            ):
                raise SecurityError(
                    409,
                    "ITEM_HAS_STOCK",
                    "Clear the item's physical stock through authorized movements before archiving it",
                )
        row.is_active = data.is_active
        row.updated_at = utcnow()
        if resource == "projects":
            row.status = "active" if data.is_active else "archived"
        record_audit(
            db,
            context,
            resource,
            row,
            "activated" if data.is_active else "archived",
            ["is_active"],
        )
        result = output(row)
        commit(db)
        return result

    for endpoint, path, method, response in [
        (listing, "", "GET", MasterPage),
        (detail, "/{record_id}", "GET", dict),
        (create, "", "POST", dict),
        (update, "/{record_id}", "PUT", dict),
    ]:
        router.add_api_route(
            f"/{resource}{path}",
            endpoint,
            methods=[method],
            response_model=response,
            status_code=201 if method == "POST" else 200,
            name=f"{method.lower()}_{resource}{'_detail' if path else ''}",
        )
    if resource != "lpos":
        router.add_api_route(
            f"/{resource}/{{record_id}}/activation",
            activation,
            methods=["PATCH"],
            response_model=dict,
            name=f"activation_{resource}",
        )


@router.get("/customers/duplicates", response_model=list[dict])
def duplicate_customers(
    name: str = Query(..., min_length=1, max_length=200),
    context=Depends(read_permission("customers")),
    db: Session = Depends(get_session),
):
    rows = db.scalars(
        select(Customer)
        .where(Customer.normalized_name == normalized(name))
        .order_by(Customer.code)
        .limit(20)
    ).all()
    result = [
        {"id": row.id, "code": row.code, "name": row.name, "is_active": row.is_active}
        for row in rows
    ]
    db.commit()
    return result


for resource, schema in SCHEMAS.items():
    register(resource, schema)
