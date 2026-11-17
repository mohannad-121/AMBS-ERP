"""Documents and approved planning evidence; never an inventory balance."""

import uuid
from datetime import date, datetime
from decimal import Decimal
from sqlalchemy import (
    String,
    Integer,
    Date,
    DateTime,
    ForeignKey,
    CheckConstraint,
    UniqueConstraint,
    LargeBinary,
    Numeric,
    Index,
    text,
)
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column
from app.models.base import Base
from app.models.inventory import Identity, QTY


class PackingDocument(Identity, Base):
    __tablename__ = "packing_documents"
    code: Mapped[str] = mapped_column(String(40), unique=True)
    delivery_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("sales_deliveries.id", ondelete="RESTRICT"), index=True
    )
    kind: Mapped[str] = mapped_column(String(20))
    revision: Mapped[int] = mapped_column(Integer)
    previous_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("packing_documents.id", ondelete="RESTRICT"), unique=True
    )
    snapshot: Mapped[dict] = mapped_column(JSONB)
    pdf: Mapped[bytes] = mapped_column(LargeBinary)
    sha256: Mapped[str] = mapped_column(String(64))
    issued_by: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("users.id", ondelete="RESTRICT")
    )
    reason: Mapped[str] = mapped_column(String(1000))
    __table_args__ = (
        UniqueConstraint("delivery_id", "kind", "revision", name="uq_packing_revision"),
        CheckConstraint(
            "kind IN ('PACKING_LIST','DELIVERY_ORDER') AND revision>0 AND octet_length(pdf) BETWEEN 1 AND 10485760 AND length(sha256)=64",
            name="ck_packing_content",
        ),
    )


class DocumentEvent(Identity, Base):
    __tablename__ = "packing_document_events"
    document_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("packing_documents.id", ondelete="RESTRICT"), unique=True
    )
    kind: Mapped[str] = mapped_column(String(12))
    replacement_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("packing_documents.id", ondelete="RESTRICT"), unique=True
    )
    actor_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("users.id", ondelete="RESTRICT")
    )
    reason: Mapped[str] = mapped_column(String(1000))
    __table_args__ = (
        CheckConstraint(
            "(kind='VOID' AND replacement_id IS NULL) OR (kind='REPLACED' AND replacement_id IS NOT NULL AND replacement_id<>document_id)",
            name="ck_document_event",
        ),
    )


class BomVersion(Identity, Base):
    __tablename__ = "bom_versions"
    code: Mapped[str] = mapped_column(String(40), unique=True)
    item_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("items.id", ondelete="RESTRICT"), index=True
    )
    revision: Mapped[int] = mapped_column(Integer)
    previous_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("bom_versions.id", ondelete="RESTRICT")
    )
    status: Mapped[str] = mapped_column(String(20), default="DRAFT")
    output_quantity: Mapped[Decimal] = mapped_column(QTY)
    unit_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("units.id", ondelete="RESTRICT")
    )
    effective_from: Mapped[date | None] = mapped_column(Date)
    effective_until: Mapped[date | None] = mapped_column(Date)
    source_reference: Mapped[str] = mapped_column(String(2000))
    reason: Mapped[str] = mapped_column(String(1000))
    version: Mapped[int] = mapped_column(Integer, default=1)
    prepared_by: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("users.id", ondelete="RESTRICT")
    )
    approved_by: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("users.id", ondelete="RESTRICT")
    )
    approved_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    __table_args__ = (
        UniqueConstraint("item_id", "revision", name="uq_bom_item_revision"),
        Index(
            "uq_bom_approved_item",
            "item_id",
            unique=True,
            postgresql_where=text("status='APPROVED'"),
        ),
        CheckConstraint(
            "output_quantity>0 AND revision>0 AND version>0 AND status IN ('DRAFT','PENDING_APPROVAL','APPROVED','SUPERSEDED','ARCHIVED')",
            name="ck_bom_state",
        ),
        CheckConstraint(
            "effective_from IS NULL OR effective_until IS NULL OR effective_from<=effective_until",
            name="ck_bom_dates",
        ),
        CheckConstraint(
            "status NOT IN ('APPROVED','SUPERSEDED') OR (approved_by IS NOT NULL AND approved_at IS NOT NULL)",
            name="ck_bom_approval",
        ),
    )


class BomComponent(Identity, Base):
    __tablename__ = "bom_components"
    bom_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("bom_versions.id", ondelete="RESTRICT"), index=True
    )
    item_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("items.id", ondelete="RESTRICT")
    )
    unit_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("units.id", ondelete="RESTRICT")
    )
    quantity: Mapped[Decimal] = mapped_column(QTY)
    waste_percent: Mapped[Decimal | None] = mapped_column(Numeric(7, 4))
    __table_args__ = (
        UniqueConstraint("bom_id", "item_id", name="uq_bom_component_item"),
        CheckConstraint(
            "quantity>0 AND (waste_percent IS NULL OR waste_percent BETWEEN 0 AND 100)",
            name="ck_bom_component_quantity",
        ),
    )


class MaterialPlan(Identity, Base):
    __tablename__ = "material_plans"
    code: Mapped[str] = mapped_column(String(40), unique=True)
    sales_order_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("sales_orders.id", ondelete="RESTRICT"), index=True
    )
    production_order_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("production_orders.id", ondelete="RESTRICT"), index=True
    )
    warehouse_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("warehouses.id", ondelete="RESTRICT")
    )
    previous_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("material_plans.id", ondelete="RESTRICT")
    )
    status: Mapped[str] = mapped_column(String(30))
    source_snapshot: Mapped[dict] = mapped_column(JSONB)
    input_signature: Mapped[str] = mapped_column(String(64))
    applications: Mapped[list] = mapped_column(JSONB)
    missing_boms: Mapped[list] = mapped_column(JSONB)
    prepared_by: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("users.id", ondelete="RESTRICT")
    )
    reason: Mapped[str] = mapped_column(String(1000))
    __table_args__ = (
        CheckConstraint(
            "(sales_order_id IS NOT NULL) <> (production_order_id IS NOT NULL)",
            name="ck_plan_source",
        ),
        CheckConstraint(
            "status IN ('AVAILABLE','PARTIALLY_AVAILABLE','SHORTAGE','AWAITING_APPROVED_BOM')",
            name="ck_plan_status",
        ),
    )


class MaterialPlanLine(Identity, Base):
    __tablename__ = "material_plan_lines"
    plan_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("material_plans.id", ondelete="RESTRICT"), index=True
    )
    item_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("items.id", ondelete="RESTRICT")
    )
    unit_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("units.id", ondelete="RESTRICT")
    )
    item_name: Mapped[str] = mapped_column(String(200))
    unit_name: Mapped[str] = mapped_column(String(200))
    precision: Mapped[int] = mapped_column(Integer)
    required: Mapped[Decimal] = mapped_column(QTY)
    usable_on_hand: Mapped[Decimal] = mapped_column(QTY)
    reserved: Mapped[Decimal] = mapped_column(QTY)
    available: Mapped[Decimal] = mapped_column(QTY)
    shortage: Mapped[Decimal] = mapped_column(QTY)
    external_custody: Mapped[Decimal] = mapped_column(QTY)
    unavailable_on_hand: Mapped[Decimal] = mapped_column(QTY)
    expected_incoming: Mapped[Decimal] = mapped_column(QTY)
    __table_args__ = (
        UniqueConstraint("plan_id", "item_id", name="uq_plan_component"),
        CheckConstraint(
            "required>0 AND usable_on_hand>=reserved AND reserved>=0 AND available>=0 AND shortage>=0 AND external_custody>=0 AND unavailable_on_hand>=0 AND expected_incoming>=0 AND precision BETWEEN 0 AND 6",
            name="ck_plan_line_quantities",
        ),
    )


class PlanReview(Identity, Base):
    __tablename__ = "material_plan_reviews"
    plan_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("material_plans.id", ondelete="RESTRICT"), unique=True
    )
    actor_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("users.id", ondelete="RESTRICT")
    )
    reason: Mapped[str] = mapped_column(String(1000))


class Phase7Operation(Identity, Base):
    __tablename__ = "packing_planning_operations"
    request_key: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), unique=True)
    action: Mapped[str] = mapped_column(String(80))
    target_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True))
    request_hash: Mapped[str] = mapped_column(String(64))
    actor_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("users.id", ondelete="RESTRICT")
    )
