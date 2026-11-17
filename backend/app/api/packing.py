import uuid
from typing import Literal
from fastapi import APIRouter, Depends, Query, Response
from sqlalchemy import select, func, case
from sqlalchemy.orm import Session
from app.core.security import current_context
from app.db.session import get_session
from app.models.packing import PackingDocument, BomVersion, MaterialPlan
from app.models.sales import SalesDelivery, SalesOrder
from app.models.master import Item, Unit
from app.models.inventory import Warehouse
from app.models.purchasing import ProductionOrder
from app.schemas.packing import IssueDocument, BomInput, BomApproval, Change, PlanInput
from app.services import (
    packing as documents,
    material_planning as planning,
    inventory as inv,
)
from app.services.master import get_record
from app.services.packing_pdf import render

router = APIRouter(tags=["Packing documents, BOM and material planning"])


def page_rows(db, query, page, formatter):
    total = db.scalar(select(func.count()).select_from(query.subquery()))
    return dict(
        items=[
            formatter(row)
            for row in db.scalars(query.offset((page - 1) * 25).limit(25))
        ],
        total=total,
        page=page,
        page_size=25,
    )


def pdf_response(pdf, filename, **extra):
    return Response(
        pdf,
        media_type="application/pdf",
        headers={
            "Content-Disposition": f'attachment; filename="{filename}"',
            "Cache-Control": "no-store",
            "X-Content-Type-Options": "nosniff",
            **extra,
        },
    )


@router.get("/packing/deliveries")
def deliveries(
    page: int = Query(1, ge=1),
    search: str = Query("", max_length=120),
    db: Session = Depends(get_session),
    ctx=Depends(current_context),
):
    inv.authorize(db, ctx, "packing.read")
    query = (
        documents.delivery_query(ctx)
        .where(SalesDelivery.code.ilike("%" + search + "%"))
        .order_by(SalesDelivery.created_at.desc(), SalesDelivery.id)
    )
    return page_rows(
        db,
        query,
        page,
        lambda r: dict(
            id=str(r.id),
            code=r.code,
            status=r.status,
            order_code=get_record(db, SalesOrder, r.order_id).code,
            destination=r.destination,
        ),
    )


@router.get("/packing/deliveries/{identity}/documents")
def delivery_documents(
    identity: uuid.UUID,
    db: Session = Depends(get_session),
    ctx=Depends(current_context),
):
    delivery = documents.access_delivery(db, ctx, identity)
    rows = db.scalars(
        select(PackingDocument)
        .where(PackingDocument.delivery_id == identity)
        .order_by(PackingDocument.created_at.desc())
    )
    return dict(
        delivery_id=str(identity),
        delivery_code=delivery.code,
        source_status=delivery.status,
        items=[documents.document_view(db, row) for row in rows],
    )


@router.get("/packing/deliveries/{identity}/preview")
def preview(
    identity: uuid.UUID,
    kind: Literal["PACKING_LIST", "DELIVERY_ORDER"] = "PACKING_LIST",
    db: Session = Depends(get_session),
    ctx=Depends(current_context),
):
    snapshot = documents.preview(db, ctx, identity, kind)
    pdf = render(snapshot)
    db.commit()
    return pdf_response(pdf, "PREPARATION-" + str(identity) + ".pdf")


@router.post("/packing/deliveries/{identity}/documents", status_code=201)
def issue(
    identity: uuid.UUID,
    data: IssueDocument,
    db: Session = Depends(get_session),
    ctx=Depends(current_context),
):
    row = documents.issue(db, ctx, identity, data)
    result = documents.document_view(db, row)
    db.commit()
    return result


@router.get("/packing/documents/{identity}")
def document(
    identity: uuid.UUID,
    db: Session = Depends(get_session),
    ctx=Depends(current_context),
):
    return documents.document_view(db, documents.access_document(db, ctx, identity))


@router.get("/packing/documents/{identity}/download")
def download(
    identity: uuid.UUID,
    db: Session = Depends(get_session),
    ctx=Depends(current_context),
):
    row = documents.download(db, ctx, identity)
    view = documents.document_view(db, row)
    db.commit()
    return pdf_response(
        row.pdf,
        row.code + "-R" + str(row.revision) + ".pdf",
        **{
            "X-AMBS-Document-SHA256": row.sha256,
            "X-AMBS-Source-Status": view["source_status"],
            "X-AMBS-Document-Status": view["status"],
        },
    )


@router.post("/packing/documents/{identity}/void")
def void(
    identity: uuid.UUID,
    data: Change,
    db: Session = Depends(get_session),
    ctx=Depends(current_context),
):
    documents.void(db, ctx, identity, data)
    result = documents.document_view(db, documents.access_document(db, ctx, identity))
    db.commit()
    return result


@router.get("/boms")
def boms(
    item_id: uuid.UUID | None = None,
    page: int = Query(1, ge=1),
    db: Session = Depends(get_session),
    ctx=Depends(current_context),
):
    inv.authorize(db, ctx, "bom.read")
    query = select(BomVersion).order_by(BomVersion.created_at.desc(), BomVersion.id)
    if item_id:
        query = query.where(BomVersion.item_id == item_id)
    return page_rows(
        db,
        query,
        page,
        lambda r: {
            k: v for k, v in planning.bom_view(db, r).items() if k != "components"
        },
    )


@router.get("/boms/{identity}")
def bom(
    identity: uuid.UUID,
    db: Session = Depends(get_session),
    ctx=Depends(current_context),
):
    inv.authorize(db, ctx, "bom.read")
    return planning.bom_view(db, get_record(db, BomVersion, identity))


@router.post("/boms", status_code=201)
def create_bom(
    data: BomInput, db: Session = Depends(get_session), ctx=Depends(current_context)
):
    row = planning.save_bom(db, ctx, data)
    result = planning.bom_view(db, row)
    db.commit()
    return result


@router.patch("/boms/{identity}")
def edit_bom(
    identity: uuid.UUID,
    data: BomInput,
    db: Session = Depends(get_session),
    ctx=Depends(current_context),
):
    row = planning.save_bom(db, ctx, data, identity)
    result = planning.bom_view(db, row)
    db.commit()
    return result


@router.post("/boms/{identity}/approve")
def approve(
    identity: uuid.UUID,
    data: BomApproval,
    db: Session = Depends(get_session),
    ctx=Depends(current_context),
):
    row = planning.transition_bom(db, ctx, identity, "approve", data)
    result = planning.bom_view(db, row)
    db.commit()
    return result


@router.post("/boms/{identity}/{action}")
def change_bom(
    identity: uuid.UUID,
    action: Literal["submit", "archive"],
    data: Change,
    db: Session = Depends(get_session),
    ctx=Depends(current_context),
):
    row = planning.transition_bom(db, ctx, identity, action, data)
    result = planning.bom_view(db, row)
    db.commit()
    return result


@router.get("/material-plans")
def plans(
    page: int = Query(1, ge=1),
    sales_order_id: uuid.UUID | None = None,
    production_order_id: uuid.UUID | None = None,
    item_id: uuid.UUID | None = None,
    db: Session = Depends(get_session),
    ctx=Depends(current_context),
):
    inv.authorize(db, ctx, "material_plans.read")
    query = select(MaterialPlan).order_by(
        MaterialPlan.created_at.desc(), MaterialPlan.id
    )
    if sales_order_id:
        query = query.where(MaterialPlan.sales_order_id == sales_order_id)
    if production_order_id:
        query = query.where(MaterialPlan.production_order_id == production_order_id)
    if item_id:
        from app.models.packing import MaterialPlanLine

        query = query.where(
            MaterialPlan.source_snapshot["demands"].contains(
                [{"item_id": str(item_id)}]
            )
            | MaterialPlan.id.in_(
                select(MaterialPlanLine.plan_id).where(
                    MaterialPlanLine.item_id == item_id
                )
            )
        )
    return page_rows(
        db,
        query,
        page,
        lambda r: dict(
            id=str(r.id),
            code=r.code,
            status=r.status,
            source=r.source_snapshot,
            created_at=r.created_at.isoformat(),
        ),
    )


@router.post("/material-plans", status_code=201)
def calculate(
    data: PlanInput, db: Session = Depends(get_session), ctx=Depends(current_context)
):
    row = planning.calculate(db, ctx, data)
    result = planning.plan_view(db, ctx, row)
    db.commit()
    return result


@router.get("/material-plans/{identity}")
def plan(
    identity: uuid.UUID,
    db: Session = Depends(get_session),
    ctx=Depends(current_context),
):
    inv.authorize(db, ctx, "material_plans.read")
    inv.lock_inventory(db)
    return planning.plan_view(db, ctx, get_record(db, MaterialPlan, identity))


@router.post("/material-plans/{identity}/review")
def review(
    identity: uuid.UUID,
    data: Change,
    db: Session = Depends(get_session),
    ctx=Depends(current_context),
):
    planning.review(db, ctx, identity, data)
    result = planning.plan_view(db, ctx, get_record(db, MaterialPlan, identity))
    db.commit()
    return result


@router.get("/manufacturing/options/{resource}")
def options(
    resource: Literal["items", "orders", "production", "warehouses"],
    selected_id: uuid.UUID | None = None,
    search: str = Query("", max_length=120),
    db: Session = Depends(get_session),
    ctx=Depends(current_context),
):
    permission = {
        "items": "bom.read",
        "orders": "sales.orders.read",
        "production": "production.read",
        "warehouses": "inventory.read",
    }[resource]
    inv.authorize(db, ctx, permission)
    if resource != "items":
        inv.authorize(db, ctx, "material_plans.calculate")
    model = {
        "items": Item,
        "orders": SalesOrder,
        "production": ProductionOrder,
        "warehouses": Warehouse,
    }[resource]
    name = model.name if hasattr(model, "name") else model.code
    query = select(model).where(
        name.ilike("%" + search + "%") | (model.id == selected_id)
    )
    if resource in {"items", "warehouses"}:
        query = query.where(model.is_active)
    if resource == "orders":
        query = query.where(model.status.in_(["CONFIRMED", "PARTIALLY_DISPATCHED"]))
    if resource == "production":
        query = query.where(model.status == "ACTIVE")
    rows = []
    for row in db.scalars(
        query.order_by(
            case((model.id == selected_id, 0), else_=1), name, model.id
        ).limit(100)
    ):
        result = dict(
            id=str(row.id), name=getattr(row, "name", row.code), code=row.code
        )
        if resource == "items":
            result.update(
                unit_id=str(row.unit_id),
                unit_name=get_record(db, Unit, row.unit_id).name,
            )
        rows.append(result)
    return dict(items=rows)
