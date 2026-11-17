"""Physical stock is authoritative only through immutable ledger effects."""

import uuid
from datetime import datetime
from decimal import Decimal
from sqlalchemy import (
    Boolean,
    CheckConstraint,
    DateTime,
    ForeignKey,
    ForeignKeyConstraint,
    Index,
    Integer,
    Numeric,
    String,
    UniqueConstraint,
    func,
    text,
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column
from app.models.base import Base
from app.models.master import MasterRecord

QTY = Numeric(20, 6)
VALUE = Numeric(30, 12)


class Identity:
    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )


class Warehouse(MasterRecord, Base):
    __tablename__ = "warehouses"
    description: Mapped[str | None] = mapped_column(String(2000))
    address: Mapped[str | None] = mapped_column(String(1000))
    is_default: Mapped[bool] = mapped_column(
        Boolean, default=False, server_default="false"
    )
    __table_args__ = (
        Index(
            "uq_warehouse_default",
            "is_default",
            unique=True,
            postgresql_where=text("is_default AND is_active"),
        ),
    )


class Location(MasterRecord, Base):
    __tablename__ = "storage_locations"
    warehouse_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("warehouses.id", ondelete="RESTRICT"), index=True
    )
    parent_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), index=True)
    kind: Mapped[str] = mapped_column(String(20), default="USABLE")
    supplier_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("suppliers.id", ondelete="RESTRICT"), index=True)
    __table_args__ = (
        UniqueConstraint("id", "warehouse_id", name="uq_location_warehouse"),
        ForeignKeyConstraint(
            ["parent_id", "warehouse_id"],
            ["storage_locations.id", "storage_locations.warehouse_id"],
            ondelete="RESTRICT",
            name="fk_location_parent_warehouse",
        ),
        CheckConstraint(
            "parent_id IS NULL OR parent_id <> id", name="ck_location_parent"
        ),
        CheckConstraint(
            "kind IN ('USABLE','QUARANTINE','DAMAGED','REJECTED','EXTERNAL')",
            name="ck_location_kind",
        ),
        CheckConstraint("(kind='EXTERNAL') = (supplier_id IS NOT NULL) AND (kind<>'EXTERNAL' OR parent_id IS NULL)", name="ck_location_custody"),
    )


class InventoryPolicy(Base):
    __tablename__ = "inventory_item_policies"
    item_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("items.id", ondelete="RESTRICT"), primary_key=True
    )
    tracking_mode: Mapped[str] = mapped_column(String(10), default="NONE")
    updated_by: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("users.id", ondelete="RESTRICT")
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    __table_args__ = (
        CheckConstraint(
            "tracking_mode IN ('NONE','LOT','SERIAL')", name="ck_tracking_mode"
        ),
    )


class StockLot(MasterRecord, Base):
    __tablename__ = "stock_lots"
    item_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("items.id", ondelete="RESTRICT"), index=True
    )
    identifier: Mapped[str] = mapped_column(String(120))
    normalized_identifier: Mapped[str] = mapped_column(String(120))
    is_serial: Mapped[bool] = mapped_column(Boolean)
    status: Mapped[str] = mapped_column(String(12), default="ACTIVE")
    notes: Mapped[str | None] = mapped_column(String(2000))
    __table_args__ = (
        UniqueConstraint("id", "item_id", name="uq_lot_item"),
        UniqueConstraint(
            "item_id", "normalized_identifier", name="uq_item_lot_identifier"
        ),
        Index(
            "uq_serial_identifier",
            "normalized_identifier",
            unique=True,
            postgresql_where=text("is_serial"),
        ),
        CheckConstraint("status IN ('ACTIVE','BLOCKED')", name="ck_lot_status"),
    )


class StockMovement(Identity, Base):
    __tablename__ = "stock_movements"
    code: Mapped[str] = mapped_column(String(40), unique=True)
    kind: Mapped[str] = mapped_column(String(30), index=True)
    status: Mapped[str] = mapped_column(String(12), default="DRAFT", index=True)
    reason: Mapped[str] = mapped_column(String(1000))
    source_reference: Mapped[str | None] = mapped_column(String(240))
    occurred_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    created_by: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("users.id", ondelete="RESTRICT")
    )
    posted_by: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("users.id", ondelete="RESTRICT")
    )
    posted_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), index=True
    )
    create_key: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), unique=True)
    request_hash: Mapped[str] = mapped_column(String(64))
    post_key: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), unique=True)
    reverses_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("stock_movements.id", ondelete="RESTRICT"), unique=True
    )
    version: Mapped[int] = mapped_column(Integer, default=1)
    __table_args__ = (
        CheckConstraint(
            "status IN ('DRAFT','POSTED','REVERSED','CANCELLED')",
            name="ck_movement_status",
        ),
        CheckConstraint(
            "kind IN ('RECEIPT','ISSUE','TRANSFER','ADJUSTMENT_IN','ADJUSTMENT_OUT','RETURN','DAMAGE','QUARANTINE_TRANSFER','INSPECTION_RELEASE','REVERSAL','COUNT_ADJUSTMENT','PURCHASE_RECEIPT','CUSTODY_TRANSFER','PRODUCTION_INPUT','PRODUCTION_OUTPUT')",
            name="ck_movement_kind",
        ),
    )


class MovementLine(Identity, Base):
    __tablename__ = "stock_movement_lines"
    movement_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("stock_movements.id", ondelete="RESTRICT"), index=True
    )
    item_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("items.id", ondelete="RESTRICT"), index=True
    )
    unit_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("units.id", ondelete="RESTRICT")
    )
    source_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("storage_locations.id", ondelete="RESTRICT"), index=True
    )
    destination_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("storage_locations.id", ondelete="RESTRICT"), index=True
    )
    lot_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), index=True)
    quantity: Mapped[Decimal] = mapped_column(QTY)
    unit_cost: Mapped[Decimal | None] = mapped_column(VALUE)
    currency: Mapped[str | None] = mapped_column(String(3))
    __table_args__ = (
        ForeignKeyConstraint(
            ["lot_id", "item_id"],
            ["stock_lots.id", "stock_lots.item_id"],
            name="fk_movement_lot_item",
            ondelete="RESTRICT",
        ),
        CheckConstraint("quantity > 0", name="ck_movement_quantity"),
        CheckConstraint(
            "source_id IS NOT NULL OR destination_id IS NOT NULL",
            name="ck_movement_location",
        ),
        CheckConstraint(
            "source_id IS NULL OR destination_id IS NULL OR source_id <> destination_id",
            name="ck_movement_different_locations",
        ),
        CheckConstraint("unit_cost IS NULL OR unit_cost >= 0", name="ck_movement_cost"),
    )


class StockBalance(Identity, Base):
    __tablename__ = "stock_balances"
    item_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("items.id", ondelete="RESTRICT"), index=True
    )
    location_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("storage_locations.id", ondelete="RESTRICT"), index=True
    )
    lot_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), index=True)
    on_hand: Mapped[Decimal] = mapped_column(
        QTY, default=Decimal(0), server_default="0"
    )
    reserved: Mapped[Decimal] = mapped_column(
        QTY, default=Decimal(0), server_default="0"
    )
    version: Mapped[int] = mapped_column(Integer, default=0, server_default="0")
    stock_value: Mapped[Decimal | None] = mapped_column(
        VALUE, default=Decimal(0), server_default="0"
    )
    currency: Mapped[str | None] = mapped_column(String(3))
    cost_complete: Mapped[bool] = mapped_column(
        Boolean, default=True, server_default="true"
    )
    __table_args__ = (
        UniqueConstraint(
            "item_id",
            "location_id",
            "lot_id",
            name="uq_stock_bucket",
            postgresql_nulls_not_distinct=True,
        ),
        ForeignKeyConstraint(
            ["lot_id", "item_id"],
            ["stock_lots.id", "stock_lots.item_id"],
            name="fk_balance_lot_item",
            ondelete="RESTRICT",
        ),
        CheckConstraint(
            "on_hand >= reserved AND reserved >= 0", name="ck_stock_nonnegative"
        ),
        CheckConstraint(
            "stock_value IS NULL OR stock_value >= 0", name="ck_stock_value"
        ),
    )


class LedgerEffect(Identity, Base):
    __tablename__ = "stock_ledger_effects"
    line_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("stock_movement_lines.id", ondelete="RESTRICT"), index=True
    )
    balance_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("stock_balances.id", ondelete="RESTRICT"), index=True
    )
    quantity_delta: Mapped[Decimal] = mapped_column(QTY)
    value_delta: Mapped[Decimal | None] = mapped_column(VALUE)
    currency: Mapped[str | None] = mapped_column(String(3))
    __table_args__ = (
        UniqueConstraint("line_id", "balance_id", name="uq_line_effect_bucket"),
        CheckConstraint("quantity_delta <> 0", name="ck_effect_nonzero"),
    )


class Reservation(Identity, Base):
    __tablename__ = "stock_reservations"
    code: Mapped[str] = mapped_column(String(40), unique=True)
    balance_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("stock_balances.id", ondelete="RESTRICT"), index=True
    )
    quantity: Mapped[Decimal] = mapped_column(QTY)
    status: Mapped[str] = mapped_column(String(12), default="ACTIVE", index=True)
    reason: Mapped[str] = mapped_column(String(1000))
    source_reference: Mapped[str | None] = mapped_column(String(240))
    created_by: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("users.id", ondelete="RESTRICT")
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    released_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    create_key: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), unique=True)
    request_hash: Mapped[str] = mapped_column(String(64))
    close_key: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), unique=True)
    consumed_movement_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("stock_movements.id", ondelete="RESTRICT"), unique=True
    )
    __table_args__ = (
        CheckConstraint("quantity > 0", name="ck_reservation_quantity"),
        CheckConstraint(
            "status IN ('ACTIVE','RELEASED','CONSUMED','CANCELLED')",
            name="ck_reservation_status",
        ),
    )


class StockCount(Identity, Base):
    __tablename__ = "inventory_counts"
    code: Mapped[str] = mapped_column(String(40), unique=True)
    location_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("storage_locations.id", ondelete="RESTRICT"), index=True
    )
    reason: Mapped[str] = mapped_column(String(1000))
    status: Mapped[str] = mapped_column(String(15), default="DRAFT", index=True)
    created_by: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("users.id", ondelete="RESTRICT")
    )
    counted_by: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("users.id", ondelete="RESTRICT")
    )
    posted_by: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("users.id", ondelete="RESTRICT")
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    posted_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    movement_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("stock_movements.id", ondelete="RESTRICT"), unique=True
    )
    create_key: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), unique=True)
    request_hash: Mapped[str] = mapped_column(String(64))
    post_key: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), unique=True)
    __table_args__ = (
        CheckConstraint(
            "status IN ('DRAFT','IN_PROGRESS','REVIEW','POSTED','CANCELLED')",
            name="ck_count_status",
        ),
    )


class CountLine(Identity, Base):
    __tablename__ = "inventory_count_lines"
    count_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("inventory_counts.id", ondelete="RESTRICT"), index=True
    )
    balance_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("stock_balances.id", ondelete="RESTRICT")
    )
    expected_quantity: Mapped[Decimal] = mapped_column(QTY)
    stock_version: Mapped[int] = mapped_column(Integer)
    counted_quantity: Mapped[Decimal | None] = mapped_column(QTY)
    reason: Mapped[str | None] = mapped_column(String(1000))
    __table_args__ = (
        UniqueConstraint("count_id", "balance_id", name="uq_count_bucket"),
        CheckConstraint(
            "expected_quantity >= 0 AND (counted_quantity IS NULL OR counted_quantity >= 0)",
            name="ck_count_quantity",
        ),
    )


class StockThreshold(Identity, Base):
    __tablename__ = "stock_thresholds"
    item_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("items.id", ondelete="RESTRICT"), index=True
    )
    warehouse_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("warehouses.id", ondelete="RESTRICT"), index=True
    )
    location_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), index=True
    )
    minimum: Mapped[Decimal] = mapped_column(QTY)
    updated_by: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("users.id", ondelete="RESTRICT")
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    __table_args__ = (
        UniqueConstraint(
            "item_id",
            "warehouse_id",
            "location_id",
            name="uq_threshold_scope",
            postgresql_nulls_not_distinct=True,
        ),
        ForeignKeyConstraint(
            ["location_id", "warehouse_id"],
            ["storage_locations.id", "storage_locations.warehouse_id"],
            name="fk_threshold_location_warehouse",
            ondelete="RESTRICT",
        ),
        CheckConstraint("minimum >= 0", name="ck_threshold_minimum"),
    )
