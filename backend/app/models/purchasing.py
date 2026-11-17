"""Purchasing commitments and production progress; physical balances stay in inventory."""

import uuid
from datetime import date, datetime
from decimal import Decimal
from sqlalchemy import (
    Boolean,
    CheckConstraint,
    Date,
    DateTime,
    ForeignKey,
    Integer,
    Index,
    String,
    UniqueConstraint,
    func,
    text,
)
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column
from app.models.base import Base
from app.models.master import MasterRecord
from app.models.inventory import Identity, QTY, VALUE


class Supplier(MasterRecord, Base):
    __tablename__ = "suppliers"
    normalized_name: Mapped[str] = mapped_column(String(200), index=True)
    types: Mapped[list] = mapped_column(JSONB)
    address: Mapped[str | None] = mapped_column(String(1000))
    country: Mapped[str | None] = mapped_column(String(80))
    phone: Mapped[str | None] = mapped_column(String(80))
    email: Mapped[str | None] = mapped_column(String(254))
    tax_registration: Mapped[str | None] = mapped_column(String(100))
    payment_terms: Mapped[str | None] = mapped_column(String(1000))
    notes: Mapped[str | None] = mapped_column(String(2000))


class SupplierContact(Identity, Base):
    __tablename__ = "supplier_contacts"
    supplier_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("suppliers.id", ondelete="RESTRICT"), index=True
    )
    name: Mapped[str] = mapped_column(String(200))
    position: Mapped[str | None] = mapped_column(String(100))
    phone: Mapped[str | None] = mapped_column(String(80))
    email: Mapped[str | None] = mapped_column(String(254))
    is_main: Mapped[bool] = mapped_column(Boolean, default=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)


class SupplierMaterial(Identity, Base):
    __tablename__ = "supplier_materials"
    supplier_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("suppliers.id", ondelete="RESTRICT"), index=True
    )
    item_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("items.id", ondelete="RESTRICT"), index=True
    )
    unit_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("units.id", ondelete="RESTRICT")
    )
    supplier_reference: Mapped[str | None] = mapped_column(String(200))
    description: Mapped[str | None] = mapped_column(String(1000))
    minimum_quantity: Mapped[Decimal | None] = mapped_column(QTY)
    lead_days: Mapped[int | None] = mapped_column(Integer)
    reported_available: Mapped[Decimal | None] = mapped_column(QTY)
    verified_on: Mapped[date | None] = mapped_column(Date)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    notes: Mapped[str | None] = mapped_column(String(2000))
    __table_args__ = (
        UniqueConstraint("supplier_id", "item_id", name="uq_supplier_material"),
        CheckConstraint(
            "(minimum_quantity IS NULL OR minimum_quantity>=0) AND (reported_available IS NULL OR reported_available>=0) AND (lead_days IS NULL OR lead_days>=0)",
            name="ck_supplier_material_values",
        ),
    )


class Document:
    code: Mapped[str] = mapped_column(String(40), unique=True)
    status: Mapped[str] = mapped_column(String(24), index=True)
    created_by: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("users.id", ondelete="RESTRICT")
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    version: Mapped[int] = mapped_column(Integer, default=1)
    create_key: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), unique=True)
    request_hash: Mapped[str] = mapped_column(String(64))
    notes: Mapped[str | None] = mapped_column(String(2000))


class Quotation(Document, Identity, Base):
    __tablename__ = "supplier_quotations"
    supplier_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("suppliers.id", ondelete="RESTRICT"), index=True
    )
    reference: Mapped[str] = mapped_column(String(200))
    quoted_on: Mapped[date] = mapped_column(Date)
    valid_until: Mapped[date | None] = mapped_column(Date)
    currency: Mapped[str] = mapped_column(String(3))
    freight: Mapped[Decimal | None] = mapped_column(VALUE)
    taxes: Mapped[Decimal | None] = mapped_column(VALUE)
    fees: Mapped[Decimal | None] = mapped_column(VALUE)
    lead_days: Mapped[int | None] = mapped_column(Integer)
    supersedes_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("supplier_quotations.id", ondelete="RESTRICT")
    )
    attachments: Mapped[list] = mapped_column(JSONB, default=list)
    __table_args__ = (
        CheckConstraint(
            "status IN ('DRAFT','ISSUED','SUPERSEDED','CANCELLED')",
            name="ck_quote_status",
        ),
        CheckConstraint(
            "valid_until IS NULL OR valid_until>=quoted_on", name="ck_quote_dates"
        ),
        Index(
            "uq_quote_published_successor",
            "supersedes_id",
            unique=True,
            postgresql_where=text(
                "supersedes_id IS NOT NULL AND status IN ('ISSUED','SUPERSEDED')"
            ),
        ),
    )


class CommercialLine:
    line_type: Mapped[str] = mapped_column(String(10))
    item_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("items.id", ondelete="RESTRICT"), index=True
    )
    unit_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("units.id", ondelete="RESTRICT")
    )
    description: Mapped[str] = mapped_column(String(1000))
    quantity: Mapped[Decimal] = mapped_column(QTY)
    unit_price: Mapped[Decimal | None] = mapped_column(VALUE)


class QuotationLine(CommercialLine, Identity, Base):
    __tablename__ = "supplier_quotation_lines"
    quotation_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("supplier_quotations.id", ondelete="RESTRICT"), index=True
    )
    __table_args__ = (
        CheckConstraint(
            "quantity>0 AND (unit_price IS NULL OR unit_price>=0) AND ((line_type='STOCK' AND item_id IS NOT NULL) OR (line_type='SERVICE' AND item_id IS NULL))",
            name="ck_quotation_line",
        ),
    )


class PurchaseRequest(Document, Identity, Base):
    __tablename__ = "purchase_requests"
    requested_on: Mapped[date] = mapped_column(Date)
    required_on: Mapped[date | None] = mapped_column(Date)
    priority: Mapped[str] = mapped_column(String(10))
    reason: Mapped[str] = mapped_column(String(1000))
    quotation_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("supplier_quotations.id", ondelete="RESTRICT")
    )
    __table_args__ = (
        CheckConstraint(
            "status IN ('DRAFT','SUBMITTED','CONVERTED','CANCELLED')",
            name="ck_request_status",
        ),
    )


class RequestLine(CommercialLine, Identity, Base):
    __tablename__ = "purchase_request_lines"
    request_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("purchase_requests.id", ondelete="RESTRICT"), index=True
    )
    __table_args__ = (
        CheckConstraint(
            "quantity>0 AND ((line_type='STOCK' AND item_id IS NOT NULL) OR (line_type='SERVICE' AND item_id IS NULL))",
            name="ck_request_line",
        ),
    )


class PurchaseOrder(Document, Identity, Base):
    __tablename__ = "purchase_orders"
    supplier_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("suppliers.id", ondelete="RESTRICT"), index=True
    )
    quotation_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("supplier_quotations.id", ondelete="RESTRICT")
    )
    request_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("purchase_requests.id", ondelete="RESTRICT"), unique=True
    )
    amends_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("purchase_orders.id", ondelete="RESTRICT"), unique=True
    )
    warehouse_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("warehouses.id", ondelete="RESTRICT")
    )
    ordered_on: Mapped[date] = mapped_column(Date)
    expected_on: Mapped[date | None] = mapped_column(Date)
    currency: Mapped[str] = mapped_column(String(3))
    freight: Mapped[Decimal | None] = mapped_column(VALUE)
    taxes: Mapped[Decimal | None] = mapped_column(VALUE)
    fees: Mapped[Decimal | None] = mapped_column(VALUE)
    confirmed_by: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("users.id", ondelete="RESTRICT")
    )
    confirmed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    closure_reason: Mapped[str | None] = mapped_column(String(1000))
    __table_args__ = (
        CheckConstraint(
            "status IN ('DRAFT','CONFIRMED','PARTIALLY_RECEIVED','RECEIVED','CANCELLED','CLOSED')",
            name="ck_po_status",
        ),
    )


class OrderLine(CommercialLine, Identity, Base):
    __tablename__ = "purchase_order_lines"
    order_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("purchase_orders.id", ondelete="RESTRICT"), index=True
    )
    __table_args__ = (
        CheckConstraint(
            "quantity>0 AND (unit_price IS NULL OR unit_price>=0) AND ((line_type='STOCK' AND item_id IS NOT NULL) OR (line_type='SERVICE' AND item_id IS NULL))",
            name="ck_order_line",
        ),
    )


class PurchaseReceipt(Document, Identity, Base):
    __tablename__ = "purchase_receipts"
    order_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("purchase_orders.id", ondelete="RESTRICT"), index=True
    )
    received_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    source_reference: Mapped[str | None] = mapped_column(String(240))
    reason: Mapped[str] = mapped_column(String(1000))
    movement_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("stock_movements.id", ondelete="RESTRICT"), unique=True
    )
    post_key: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), unique=True)
    reverse_key: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), unique=True
    )
    posted_by: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("users.id", ondelete="RESTRICT")
    )
    __table_args__ = (
        CheckConstraint(
            "status IN ('DRAFT','POSTED','REVERSED','CANCELLED')",
            name="ck_purchase_receipt_status",
        ),
    )


class ReceiptLine(Identity, Base):
    __tablename__ = "purchase_receipt_lines"
    receipt_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("purchase_receipts.id", ondelete="RESTRICT"), index=True
    )
    order_line_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("purchase_order_lines.id", ondelete="RESTRICT"), index=True
    )
    quantity: Mapped[Decimal] = mapped_column(QTY)
    location_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("storage_locations.id", ondelete="RESTRICT")
    )
    lot_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("stock_lots.id", ondelete="RESTRICT")
    )
    movement_line_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("stock_movement_lines.id", ondelete="RESTRICT"), unique=True
    )
    __table_args__ = (CheckConstraint("quantity>0", name="ck_receipt_quantity"),)


class ProductionOrder(Document, Identity, Base):
    __tablename__ = "production_orders"
    item_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("items.id", ondelete="RESTRICT"), index=True
    )
    quantity: Mapped[Decimal] = mapped_column(QTY)
    ownership: Mapped[str] = mapped_column(String(10))
    purchase_order_line_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("purchase_order_lines.id", ondelete="RESTRICT")
    )
    instructions: Mapped[str] = mapped_column(String(2000))
    planned_start: Mapped[date | None] = mapped_column(Date)
    expected_finish: Mapped[date | None] = mapped_column(Date)
    completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    attachments: Mapped[list] = mapped_column(JSONB, default=list)
    __table_args__ = (
        CheckConstraint(
            "quantity>0 AND ownership IN ('AMBS','SUPPLIER') AND status IN ('DRAFT','ACTIVE','COMPLETED','CANCELLED')",
            name="ck_production_order",
        ),
    )


class ProductionStage(Identity, Base):
    __tablename__ = "production_stages"
    order_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("production_orders.id", ondelete="RESTRICT"), index=True
    )
    sequence: Mapped[int] = mapped_column(Integer)
    name: Mapped[str] = mapped_column(String(100))
    supplier_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("suppliers.id", ondelete="RESTRICT")
    )
    location_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("storage_locations.id", ondelete="RESTRICT")
    )
    expected_on: Mapped[date | None] = mapped_column(Date)
    __table_args__ = (
        UniqueConstraint("order_id", "sequence", name="uq_production_route_sequence"),
        CheckConstraint("sequence>0", name="ck_stage_sequence"),
    )


class ProductionEvent(Identity, Base):
    __tablename__ = "production_events"
    stage_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("production_stages.id", ondelete="RESTRICT"), index=True
    )
    kind: Mapped[str] = mapped_column(String(12))
    quantity: Mapped[Decimal] = mapped_column(QTY)
    destination_stage_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("production_stages.id", ondelete="RESTRICT")
    )
    movement_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("stock_movements.id", ondelete="RESTRICT"), unique=True
    )
    receipt_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("purchase_receipts.id", ondelete="RESTRICT"), unique=True
    )
    lot_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("stock_lots.id", ondelete="RESTRICT")
    )
    actor_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("users.id", ondelete="RESTRICT")
    )
    reason: Mapped[str] = mapped_column(String(1000))
    operation_key: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), unique=True)
    request_hash: Mapped[str] = mapped_column(String(64))
    __table_args__ = (
        CheckConstraint(
            "quantity>0 AND kind IN ('START','COMPLETE','TRANSFER','YARD')",
            name="ck_production_event",
        ),
    )


class ProductionCost(Identity, Base):
    __tablename__ = "production_costs"
    order_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("production_orders.id", ondelete="RESTRICT"), index=True
    )
    supplier_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("suppliers.id", ondelete="RESTRICT")
    )
    amount: Mapped[Decimal] = mapped_column(VALUE)
    currency: Mapped[str] = mapped_column(String(3))
    reference: Mapped[str] = mapped_column(String(200))
    reason: Mapped[str] = mapped_column(String(1000))
    actor_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("users.id", ondelete="RESTRICT")
    )
    request_key: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), unique=True)
    __table_args__ = (CheckConstraint("amount<>0", name="ck_production_cost_amount"),)


class ScheduleUpdate(Identity, Base):
    __tablename__ = "supplier_schedule_updates"
    order_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("purchase_orders.id", ondelete="RESTRICT"), index=True
    )
    stage_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("production_stages.id", ondelete="RESTRICT"), index=True
    )
    requested_on: Mapped[date | None] = mapped_column(Date)
    confirmed_on: Mapped[date | None] = mapped_column(Date)
    eta: Mapped[date | None] = mapped_column(Date)
    reason: Mapped[str] = mapped_column(String(1000))
    evidence: Mapped[str] = mapped_column(String(1000))
    actor_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("users.id", ondelete="RESTRICT")
    )
    __table_args__ = (
        CheckConstraint("num_nonnulls(order_id,stage_id)=1", name="ck_schedule_target"),
    )


class ProductionConversion(Identity, Base):
    __tablename__ = "production_conversions"
    input_movement_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("stock_movements.id", ondelete="RESTRICT"), unique=True
    )
    output_movement_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("stock_movements.id", ondelete="RESTRICT"), unique=True
    )
    reason: Mapped[str] = mapped_column(String(1000))
    approved_reference: Mapped[str] = mapped_column(String(240))
    actor_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("users.id", ondelete="RESTRICT")
    )
    request_key: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), unique=True)
    request_hash: Mapped[str] = mapped_column(String(64))


class PurchasingImportKey(Identity, Base):
    __tablename__ = "purchasing_import_keys"
    source_system: Mapped[str] = mapped_column(String(100))
    source_key: Mapped[str] = mapped_column(String(200))
    resource: Mapped[str] = mapped_column(String(30))
    target_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True))
    __table_args__ = (
        UniqueConstraint(
            "source_system",
            "resource",
            "source_key",
            name="uq_purchasing_import_source",
        ),
    )
