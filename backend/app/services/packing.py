"""Issued bytes and source snapshots are immutable; documents never post inventory."""

import base64
import hashlib
import io
import uuid
import warnings
from PIL import Image
from sqlalchemy import select
from app.core.security import utcnow, deny
from app.models.master import Customer, Project, Lpo, Item, ItemImage, Unit
from app.models.inventory import Warehouse, StockLot
from app.models.sales import (
    SalesOrder,
    SalesDelivery,
    SalesDeliveryLine,
    SalesLine,
    SalesAllocation,
    SalesConsumption,
)
from app.models.security import User
from app.models.packing import PackingDocument, DocumentEvent
from app.services import inventory as inv, sales, phase7
from app.services.master import get_record, record_audit
from app.services.packing_pdf import render
from app.api.images import storage_path, MAX_IMAGE_BYTES


def delivery_query(ctx):
    query = select(SalesDelivery)
    if "packing.company" not in ctx.permissions:
        query = query.where(
            SalesDelivery.driver_id == ctx.user.id
            if "deliveries.trip.own" in ctx.permissions
            else False
        )
    return query


def access_delivery(db, ctx, identity):
    inv.authorize(db, ctx, "packing.read")
    row = db.scalar(delivery_query(ctx).where(SalesDelivery.id == identity))
    if row is None:
        deny(
            db,
            404,
            "DOCUMENT_SOURCE_NOT_FOUND",
            "The delivery is unavailable",
            ctx.user,
            details={"scope": "packing_delivery"},
        )
    return row


def access_document(db, ctx, identity):
    inv.authorize(db, ctx, "packing.read")
    query = (
        select(PackingDocument)
        .join(SalesDelivery, SalesDelivery.id == PackingDocument.delivery_id)
        .where(PackingDocument.id == identity)
    )
    if "packing.company" not in ctx.permissions:
        query = query.where(
            SalesDelivery.driver_id == ctx.user.id
            if "deliveries.trip.own" in ctx.permissions
            else False
        )
    row = db.scalar(query)
    if row is None:
        deny(
            db,
            404,
            "DOCUMENT_NOT_FOUND",
            "The document is unavailable",
            ctx.user,
            details={"scope": "packing_document"},
        )
    return row


def picture(db, item_id):
    record = db.scalar(select(ItemImage).where(ItemImage.item_id == item_id))
    if record is None:
        return None
    try:
        path = storage_path(record.storage_key)
        if path.is_symlink() or path.stat().st_size > MAX_IMAGE_BYTES:
            return None
        raw = path.read_bytes()
        if hashlib.sha256(raw).hexdigest() != record.sha256:
            return None
        with warnings.catch_warnings():
            warnings.simplefilter("error", Image.DecompressionBombWarning)
            with Image.open(io.BytesIO(raw)) as image:
                if (
                    image.width * image.height > 16_000_000
                    or getattr(image, "n_frames", 1) != 1
                ):
                    return None
                image.load()
                image.thumbnail((160, 120))
                clean = Image.new("RGB", image.size, "white")
                clean.paste(image.convert("RGB"))
                stream = io.BytesIO()
                clean.save(stream, format="PNG")
                return base64.b64encode(stream.getvalue()).decode()
    except (
        OSError,
        ValueError,
        Image.DecompressionBombWarning,
        Image.DecompressionBombError,
    ):
        return None


def snapshot(db, delivery, ctx, kind, reference, revision, official):
    order = get_record(db, SalesOrder, delivery.order_id)
    customer = get_record(db, Customer, order.customer_id)
    project = db.get(Project, order.project_id) if order.project_id else None
    lpo = db.get(Lpo, order.lpo_id) if order.lpo_id else None
    rows = sales.delivery_view(db, delivery)["lines"]
    if len(rows) > 200:
        inv.fail(
            "DOCUMENT_TOO_LARGE", "Delivery documents support at most 200 lines", 422
        )
    result = dict(
        reference=reference,
        revision=revision,
        official=official,
        kind=kind,
        timestamp=utcnow().strftime("%Y-%m-%d %H:%M:%S"),
        employee=ctx.user.display_name,
        delivery=delivery.code,
        delivery_id=str(delivery.id),
        order=order.code,
        order_id=str(order.id),
        customer=customer.name,
        project=project.name if project else None,
        lpo=lpo.number if lpo else None,
        contact=" / ".join(
            filter(
                None,
                [
                    customer.contact_name,
                    customer.phone,
                    customer.email,
                    project.site_contact if project else None,
                    project.phone if project else None,
                ],
            )
        ),
        warehouse=get_record(db, Warehouse, delivery.warehouse_id).name,
        destination=delivery.destination,
        driver=get_record(db, User, delivery.driver_id).display_name
        if delivery.driver_id
        else None,
        dispatch_at=delivery.dispatched_at.strftime("%Y-%m-%d %H:%M:%S UTC")
        if delivery.dispatched_at
        else None,
        prepared_by=get_record(db, User, delivery.created_by).display_name,
        lines=[],
        remaining=[],
    )
    for row in rows:
        source = get_record(db, SalesDeliveryLine, row["id"])
        allocation = get_record(db, SalesAllocation, source.allocation_id)
        order_line = get_record(db, SalesLine, allocation.line_id)
        item = get_record(db, Item, order_line.item_id)
        unit = get_record(db, Unit, order_line.unit_id)
        consumption = db.scalar(
            select(SalesConsumption).where(
                SalesConsumption.delivery_line_id == source.id
            )
        )
        quantity = consumption.quantity if official and consumption else None
        if official and quantity is None:
            inv.fail(
                "MISSING_DISPATCH_EVIDENCE",
                "The posted dispatch evidence is incomplete",
                409,
            )
        if official and quantity == 0:
            continue

        def formatted(value):
            return (
                format(value, f".{unit.decimal_places}f") if value is not None else None
            )

        lot = db.get(StockLot, row["lot_id"]) if row.get("lot_id") else None
        result["lines"].append(
            dict(
                item_id=str(item.id),
                code=item.code,
                name=order_line.item_name,
                unit=order_line.unit_name,
                unit_id=str(order_line.unit_id),
                precision=unit.decimal_places,
                variant=", ".join(
                    f"{k}: {v}" for k, v in sorted(item.attributes.items())
                ),
                lot=lot.identifier if lot else None,
                lot_id=str(lot.id) if lot else None,
                planned=formatted(source.quantity),
                picked=formatted(source.picked_quantity),
                loaded=formatted(source.loaded_quantity),
                dispatched=formatted(quantity) if official else "0",
                image=picture(db, item.id),
            )
        )
    if not result["lines"]:
        inv.fail(
            "NO_DISPATCHED_LINES",
            "There are no actual dispatched quantities to document",
            409,
        )
    if sum(len(l.get("image") or "") for l in result["lines"]) > 4_000_000:
        inv.fail(
            "DOCUMENT_IMAGES_TOO_LARGE",
            "Reduce source delivery image workload before issuing",
            422,
        )
    for line in sales.lines(db, order):
        remaining = line.quantity - sales.shipped(db, line)
        if remaining > 0:
            result["remaining"].append(
                dict(name=line.item_name, unit=line.unit_name, quantity=str(remaining))
            )
    return result


def clean_snapshot(value):
    return {
        **value,
        "lines": [
            {
                **{k: v for k, v in line.items() if k != "image"},
                "has_image": bool(line.get("image")),
            }
            for line in value["lines"]
        ],
    }


def document_view(db, row):
    event = db.scalar(select(DocumentEvent).where(DocumentEvent.document_id == row.id))
    delivery = get_record(db, SalesDelivery, row.delivery_id)
    return dict(
        id=str(row.id),
        code=row.code,
        kind=row.kind,
        revision=row.revision,
        delivery_id=str(row.delivery_id),
        previous_id=str(row.previous_id) if row.previous_id else None,
        issued_at=row.created_at.isoformat(),
        issued_by=get_record(db, User, row.issued_by).display_name,
        status=event.kind if event else "ISSUED",
        source_status=delivery.status,
        source_reversed=delivery.status == "REVERSED",
        sha256=row.sha256,
        event=dict(
            kind=event.kind,
            reason=event.reason,
            at=event.created_at.isoformat(),
            replacement_id=str(event.replacement_id) if event.replacement_id else None,
        )
        if event
        else None,
        snapshot=clean_snapshot(row.snapshot),
    )


def preview(db, ctx, identity, kind):
    inv.authorize(db, ctx, "packing.prepare")
    delivery = access_delivery(db, ctx, identity)
    inv.lock_inventory(db)
    db.refresh(delivery)
    if delivery.status not in {"DRAFT", "PICKED", "LOADED"}:
        inv.fail(
            "PREPARATION_ONLY",
            "Preparation copies require an undispatched delivery",
            409,
        )
    value = snapshot(db, delivery, ctx, kind, "DRAFT-" + delivery.code, 0, False)
    record_audit(db, ctx, "packing", delivery, "previewed")
    return value


def issue(db, ctx, identity, data):
    inv.authorize(db, ctx, "packing.issue")
    delivery = access_delivery(db, ctx, identity)
    replay = phase7.replay(db, ctx, "packing.issue:" + str(identity), data)
    if replay:
        return get_record(db, PackingDocument, replay)
    db.refresh(delivery)
    if delivery.status != "DISPATCHED":
        inv.fail(
            "ACTUAL_DISPATCH_REQUIRED",
            "Official documents require an actual posted dispatch",
            409,
        )
    latest = db.scalar(
        select(PackingDocument)
        .where(
            PackingDocument.delivery_id == identity, PackingDocument.kind == data.kind
        )
        .order_by(PackingDocument.revision.desc())
        .limit(1)
    )
    if latest:
        inv.authorize(db, ctx, "packing.void")
        if data.replaces_id != latest.id:
            inv.fail(
                "DOCUMENT_ALREADY_ISSUED",
                "Use the explicit replacement action for the latest issued revision",
                409,
            )
        if db.scalar(
            select(DocumentEvent).where(DocumentEvent.document_id == latest.id)
        ):
            inv.fail(
                "DOCUMENT_TERMINATED",
                "The previous document is already voided or replaced",
                409,
            )
    elif data.replaces_id:
        inv.fail("REPLACEMENT_NOT_FOUND", "Select the current document to replace", 409)
    identity_new = uuid.uuid4()
    code = ("PL-" if data.kind == "PACKING_LIST" else "DO-") + identity_new.hex.upper()
    revision = latest.revision + 1 if latest else 1
    content = snapshot(db, delivery, ctx, data.kind, code, revision, True)
    pdf = render(content)
    row = PackingDocument(
        id=identity_new,
        code=code,
        delivery_id=delivery.id,
        kind=data.kind,
        revision=revision,
        previous_id=latest.id if latest else None,
        snapshot=content,
        pdf=pdf,
        sha256=hashlib.sha256(pdf).hexdigest(),
        issued_by=ctx.user.id,
        reason=data.reason,
    )
    db.add(row)
    db.flush()
    if latest:
        db.add(
            DocumentEvent(
                document_id=latest.id,
                kind="REPLACED",
                replacement_id=row.id,
                actor_id=ctx.user.id,
                reason=data.reason,
            )
        )
    return phase7.complete(db, ctx, "packing.issue:" + str(identity), data, row)


def void(db, ctx, identity, data):
    inv.authorize(db, ctx, "packing.void")
    document = access_document(db, ctx, identity)
    replay = phase7.replay(db, ctx, "packing.void:" + str(identity), data)
    if replay:
        return get_record(db, DocumentEvent, replay)
    if db.scalar(select(DocumentEvent).where(DocumentEvent.document_id == identity)):
        inv.fail(
            "DOCUMENT_TERMINATED", "The document already has a terminal event", 409
        )
    row = DocumentEvent(
        document_id=document.id, kind="VOID", actor_id=ctx.user.id, reason=data.reason
    )
    db.add(row)
    db.flush()
    return phase7.complete(db, ctx, "packing.void:" + str(identity), data, row)


def download(db, ctx, identity):
    inv.authorize(db, ctx, "packing.download")
    row = access_document(db, ctx, identity)
    if hashlib.sha256(row.pdf).hexdigest() != row.sha256:
        inv.fail("DOCUMENT_INTEGRITY", "Document integrity verification failed", 503)
    record_audit(db, ctx, "packing", row, "downloaded")
    return row
