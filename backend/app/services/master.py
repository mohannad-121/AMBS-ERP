import hashlib
import json
import uuid
from decimal import Decimal

from fastapi.encoders import jsonable_encoder
from sqlalchemy import inspect, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.core.security import SecurityError, utcnow
from app.models.master import Category, Customer, Family, Item, Lpo, Project, Unit
from app.models.security import AuditEvent
from app.schemas.master import normalized

RESOURCES = {
    "customers": (Customer, "CUS"),
    "projects": (Project, "PRJ"),
    "lpos": (Lpo, "LPO"),
    "items": (Item, "ITM"),
    "categories": (Category, "CAT"),
    "units": (Unit, "UOM"),
    "families": (Family, "FAM"),
}


def get_record(db, model, record_id):
    row = db.get(model, record_id)
    if row is None:
        raise SecurityError(
            404, "RECORD_NOT_FOUND", "The requested record was not found"
        )
    return row


def output(row):
    hidden = {"variant_signature", "storage_key"}
    return jsonable_encoder(
        {
            column.key: getattr(row, column.key)
            for column in inspect(row).mapper.column_attrs
            if column.key not in hidden
        },
        custom_encoder={Decimal: str},
    )


def record_audit(db, context, resource, row, action, fields=(), *, reason=None):
    db.add(
        AuditEvent(
            actor_id=context.user.id,
            actor_username=context.user.username,
            action=f"{resource}.{action}",
            target_type=resource,
            target_id=row.id,
            details={
                "fields": sorted(fields),
                **({"reason": reason} if reason else {}),
            },
        )
    )


def commit(db):
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise SecurityError(
            409,
            "MASTER_CONFLICT",
            "A code, customer LPO number or family variant already exists, or a linked record prevents this change",
        ) from None


def validate_values(db, resource, values, row=None):
    if row and resource in {"items", "units"}:
        from app.models.purchasing import OrderLine, PurchaseOrder

        identity_change = (
            resource == "items"
            and any(
                values.get(k) != getattr(row, k)
                for k in ["unit_id", "family_id", "attributes"]
            )
        ) or (resource == "units" and values["decimal_places"] != row.decimal_places)
        if identity_change:
            from app.models.packing import BomVersion, BomComponent

            output_reference = db.scalar(
                select(BomVersion.id).where(
                    BomVersion.status != "DRAFT",
                    BomVersion.item_id == row.id if resource == "items" else BomVersion.unit_id == row.id,
                ).limit(1)
            )
            component_reference = db.scalar(
                select(BomComponent.id).join(BomVersion, BomVersion.id == BomComponent.bom_id).where(
                    BomVersion.status != "DRAFT",
                    BomComponent.item_id == row.id if resource == "items" else BomComponent.unit_id == row.id,
                ).limit(1)
            )
            if output_reference or component_reference:
                raise SecurityError(
                    409, "BOM_IDENTITY_LOCKED",
                    "Submitted BOMs preserve unit precision and item/variant identity; create a distinct item or unit",
                )
            from app.models.sales import SalesLine, SalesOrder
            if db.scalar(select(SalesLine.id).join(SalesOrder, SalesOrder.id == SalesLine.order_id).where(
                SalesOrder.confirmed_at.is_not(None),
                SalesLine.item_id == row.id if resource == "items" else SalesLine.unit_id == row.id).limit(1)):
                raise SecurityError(409, "SALES_IDENTITY_LOCKED", "Unit precision and item identity are fixed by confirmed sales history; create a distinct identity")
            query = (
                select(OrderLine.id)
                .join(PurchaseOrder, PurchaseOrder.id == OrderLine.order_id)
                .where(
                    PurchaseOrder.status.notin_(["DRAFT", "CANCELLED"]),
                    OrderLine.item_id == row.id
                    if resource == "items"
                    else OrderLine.unit_id == row.id,
                )
                .limit(1)
            )
            if db.scalar(query):
                raise SecurityError(
                    409,
                    "PURCHASE_IDENTITY_LOCKED",
                    "Unit precision and item identity are fixed by confirmed purchasing history; create a distinct identity",
                )
    if row and resource in {"items", "units"}:
        from app.models.inventory import MovementLine, StockBalance

        if resource == "items" and any(
            values.get(key) != getattr(row, key)
            for key in ["unit_id", "family_id", "attributes"]
        ):
            if db.scalar(
                select(MovementLine.id).where(MovementLine.item_id == row.id).limit(1)
            ) or db.scalar(
                select(StockBalance.id).where(StockBalance.item_id == row.id).limit(1)
            ):
                raise SecurityError(
                    409,
                    "INVENTORY_IDENTITY_LOCKED",
                    "Unit and variant identity cannot change after inventory activity; create a distinct item",
                )
        if resource == "units" and values["decimal_places"] != row.decimal_places:
            if db.scalar(
                select(MovementLine.id).where(MovementLine.unit_id == row.id).limit(1)
            ) or db.scalar(
                select(StockBalance.id)
                .join(Item, Item.id == StockBalance.item_id)
                .where(Item.unit_id == row.id)
                .limit(1)
            ):
                raise SecurityError(
                    409,
                    "UNIT_PRECISION_LOCKED",
                    "Unit precision cannot change after inventory activity",
                )
    record_id = row.id if row else None
    if resource == "customers":
        values["normalized_name"] = normalized(values["name"])
        if len(values["normalized_name"]) > 200:
            raise SecurityError(
                422,
                "NAME_TOO_LONG",
                "The normalized customer name exceeds 200 characters",
            )
        candidate = db.scalar(
            select(Customer.id).where(
                Customer.normalized_name == values["normalized_name"],
                Customer.id != record_id,
            )
            if record_id
            else select(Customer.id).where(
                Customer.normalized_name == values["normalized_name"]
            )
        )
        acknowledged = values.pop("acknowledge_duplicate", False)
        reason = values.pop("duplicate_reason", None)
        if candidate and not (acknowledged and reason):
            raise SecurityError(
                409,
                "POSSIBLE_DUPLICATE",
                "A customer with the same normalized name exists. Review possible matches; if genuinely distinct, acknowledge the warning and enter a reason.",
            )
        if values.get("email"):
            values["email"] = str(values["email"]).lower()
    if resource in {"projects", "lpos"}:
        parent = get_record(db, Customer, values["customer_id"])
        if not parent.is_active and (row is None or row.customer_id != parent.id):
            raise SecurityError(422, "INACTIVE_CUSTOMER", "Select an active customer")
    if resource == "projects":
        if (
            row
            and values["customer_id"] != row.customer_id
            and db.scalar(select(Lpo.id).where(Lpo.project_id == row.id).limit(1))
        ):
            raise SecurityError(
                409,
                "PROJECT_HAS_LPOS",
                "A project with linked LPOs cannot be reassigned. Correct its LPO relationships first.",
            )
        values["is_active"] = values["status"] != "archived"
    if resource == "lpos":
        if values["project_id"]:
            project = get_record(db, Project, values["project_id"])
            if project.customer_id != values["customer_id"]:
                raise SecurityError(
                    422,
                    "PROJECT_CUSTOMER_MISMATCH",
                    "The selected project belongs to a different customer",
                )
            if not project.is_active and (not row or row.project_id != project.id):
                raise SecurityError(422, "INACTIVE_PROJECT", "Select an active project")
        values["normalized_number"] = normalized(values["number"])
        if not values["normalized_number"] or len(values["normalized_number"]) > 150:
            raise SecurityError(
                422, "INVALID_LPO_NUMBER", "Enter a customer-issued LPO number"
            )
        values["is_active"] = values["status"] == "active"
    if resource == "categories":
        seen = {record_id}
        parent_id = values["parent_id"]
        while parent_id:
            if parent_id in seen:
                raise SecurityError(
                    422, "CATEGORY_CYCLE", "A category cannot be its own ancestor"
                )
            seen.add(parent_id)
            parent = get_record(db, Category, parent_id)
            if not parent.is_active and (not row or row.parent_id != parent.id):
                raise SecurityError(
                    422, "INACTIVE_CATEGORY", "Select an active parent category"
                )
            parent_id = parent.parent_id
    if (
        resource == "families"
        and row
        and values["attribute_definitions"] != row.attribute_definitions
    ):
        for item in db.scalars(select(Item).where(Item.family_id == row.id)):
            validate_attributes(values["attribute_definitions"], item.attributes)
    if resource == "items":
        for key, model in [
            ("category_id", Category),
            ("unit_id", Unit),
            ("family_id", Family),
        ]:
            if values.get(key):
                target = get_record(db, model, values[key])
                if not target.is_active and (
                    row is None or getattr(row, key) != target.id
                ):
                    raise SecurityError(
                        422,
                        "INACTIVE_REFERENCE",
                        "Select an active category, unit and family",
                    )
        attributes = values["attributes"]
        if values["family_id"]:
            family = get_record(db, Family, values["family_id"])
            validate_attributes(family.attribute_definitions, attributes)
            for field, key in [
                ("colour", "colour"),
                ("design", "design"),
                ("dimensions", "length"),
            ]:
                if key in attributes:
                    if (
                        values.get(field)
                        and normalized(values[field]) != attributes[key]
                    ):
                        raise SecurityError(
                            422,
                            "VARIANT_FIELD_CONFLICT",
                            f"{field} must agree with the family attribute",
                        )
                    values[field] = attributes[key]
            values["variant_signature"] = hashlib.sha256(
                json.dumps(attributes, sort_keys=True, separators=(",", ":")).encode()
            ).hexdigest()
        else:
            if attributes:
                raise SecurityError(
                    422,
                    "FAMILY_REQUIRED",
                    "Select a family before specifying variant attributes",
                )
            values["variant_signature"] = None


def validate_attributes(definitions, attributes):
    if set(definitions) != set(attributes) or any(
        attributes[key] not in choices for key, choices in definitions.items()
    ):
        raise SecurityError(
            422,
            "INVALID_VARIANT",
            "Supply exactly the family's configured attributes and approved values. Review the family definition.",
        )


def save(db: Session, context, resource, data, row=None, *, commit_changes=True):
    model, prefix = RESOURCES[resource]
    values = data.model_dump()
    # Status changes require a separate archive permission even on full updates.
    if (
        resource == "projects"
        and (
            (row is None and values["status"] == "archived")
            or (
                row is not None
                and (values["status"] == "archived") != (row.status == "archived")
            )
        )
        and "projects.archive" not in context.permissions
    ):
        from app.core.security import deny

        deny(
            db,
            403,
            "PERMISSION_DENIED",
            "Project archive permission is required",
            context.user,
        )
    validate_values(db, resource, values, row)
    if row is None:
        identity = uuid.uuid4()
        row = model(
            id=identity,
            code=f"{prefix}-{identity.hex.upper()}",
            created_by=context.user.id,
            **values,
        )
        db.add(row)
        action = "created"
    else:
        previous_status = getattr(row, "status", None)
        for key, value in values.items():
            setattr(row, key, value)
        row.updated_at = utcnow()
        action = "updated"
        if (
            resource == "projects"
            and previous_status != row.status
            and row.status == "archived"
        ):
            action = "archived"
    record_audit(db, context, resource, row, action, values.keys())
    try:
        db.flush()
        result = output(row)
        if commit_changes:
            commit(db)
    except IntegrityError:
        if not commit_changes:
            # A transaction owner must roll back the whole batch, not one row.
            raise
        db.rollback()
        raise SecurityError(
            409,
            "MASTER_CONFLICT",
            "This customer LPO number or family variant already exists",
        ) from None
    return result
