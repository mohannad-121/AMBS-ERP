"""Customer demand and fulfillment; physical quantities remain in the inventory ledger."""

import uuid
from datetime import date, datetime
from decimal import Decimal
from sqlalchemy import (
    String,
    ForeignKey,
    ForeignKeyConstraint,
    Integer,
    Date,
    DateTime,
    CheckConstraint,
    UniqueConstraint,
    func,
)
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column
from app.models.base import Base
from app.models.inventory import Identity, QTY


class SalesOrder(Identity, Base):
    __tablename__ = "sales_orders"
    code: Mapped[str] = mapped_column(String(40), unique=True)
    customer_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("customers.id", ondelete="RESTRICT"), index=True
    )
    project_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True))
    lpo_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True))
    requested_date: Mapped[date | None] = mapped_column(Date)
    priority: Mapped[str] = mapped_column(String(10), default="NORMAL")
    notes: Mapped[str | None] = mapped_column(String(2000))
    status: Mapped[str] = mapped_column(String(24), default="DRAFT", index=True)
    version: Mapped[int] = mapped_column(Integer, default=1)
    created_by: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("users.id", ondelete="RESTRICT")
    )
    confirmed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    __table_args__ = (
        ForeignKeyConstraint(
            ["project_id", "customer_id"],
            ["projects.id", "projects.customer_id"],
            name="fk_sales_project_customer",
            ondelete="RESTRICT",
        ),
        ForeignKeyConstraint(
            ["lpo_id", "customer_id"],
            ["customer_lpos.id", "customer_lpos.customer_id"],
            name="fk_sales_lpo_customer",
            ondelete="RESTRICT",
        ),
        CheckConstraint(
            "status IN ('DRAFT','CONFIRMED','PARTIALLY_DISPATCHED','COMPLETED','CANCELLED')",
            name="ck_sales_order_status",
        ),
        CheckConstraint(
            "priority IN ('LOW','NORMAL','HIGH','URGENT')", name="ck_sales_priority"
        ),
    )


class SalesLine(Identity, Base):
    __tablename__ = "sales_order_lines"
    order_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("sales_orders.id", ondelete="RESTRICT"), index=True
    )
    item_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("items.id", ondelete="RESTRICT")
    )
    unit_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("units.id", ondelete="RESTRICT")
    )
    item_name: Mapped[str] = mapped_column(String(240))
    unit_name: Mapped[str] = mapped_column(String(240))
    quantity: Mapped[Decimal] = mapped_column(QTY)
    __table_args__ = (CheckConstraint("quantity > 0", name="ck_sales_line_quantity"),)


class SalesAmendment(Identity, Base):
    __tablename__ = "sales_amendments"
    order_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("sales_orders.id", ondelete="RESTRICT"), index=True
    )
    version: Mapped[int] = mapped_column(Integer)
    before: Mapped[dict] = mapped_column(JSONB)
    after: Mapped[dict] = mapped_column(JSONB)
    reason: Mapped[str] = mapped_column(String(1000))
    created_by: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("users.id", ondelete="RESTRICT")
    )
    __table_args__ = (
        UniqueConstraint("order_id", "version", name="uq_sales_amendment_version"),
    )


class SalesAllocation(Identity, Base):
    __tablename__ = "sales_allocations"
    line_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("sales_order_lines.id", ondelete="RESTRICT"), index=True
    )
    quantity: Mapped[Decimal] = mapped_column(QTY)
    current_reservation_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("stock_reservations.id", ondelete="RESTRICT"), unique=True
    )
    created_by: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("users.id", ondelete="RESTRICT")
    )
    __table_args__ = (
        CheckConstraint("quantity > 0", name="ck_sales_allocation_quantity"),
    )


class SalesReservationLink(Base):
    __tablename__ = "sales_reservation_links"
    reservation_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("stock_reservations.id", ondelete="RESTRICT"), primary_key=True
    )
    allocation_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("sales_allocations.id", ondelete="RESTRICT"), index=True
    )
    parent_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("stock_reservations.id", ondelete="RESTRICT")
    )


class SalesDelivery(Identity, Base):
    __tablename__ = "sales_deliveries"
    code: Mapped[str] = mapped_column(String(40), unique=True)
    order_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("sales_orders.id", ondelete="RESTRICT"), index=True
    )
    warehouse_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("warehouses.id", ondelete="RESTRICT")
    )
    destination: Mapped[str] = mapped_column(String(1000))
    driver_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("users.id", ondelete="RESTRICT")
    )
    status: Mapped[str] = mapped_column(String(12), default="DRAFT", index=True)
    created_by: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("users.id", ondelete="RESTRICT")
    )
    picked_by: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("users.id", ondelete="RESTRICT")
    )
    loaded_by: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("users.id", ondelete="RESTRICT")
    )
    dispatched_by: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("users.id", ondelete="RESTRICT")
    )
    picked_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    loaded_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    dispatched_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    reversed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    reason: Mapped[str] = mapped_column(String(1000))
    __table_args__ = (
        CheckConstraint(
            "status IN ('DRAFT','PICKED','LOADED','DISPATCHED','REVERSED','CANCELLED')",
            name="ck_sales_delivery_status",
        ),
    )


class SalesDeliveryLine(Identity, Base):
    __tablename__ = "sales_delivery_lines"
    delivery_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("sales_deliveries.id", ondelete="RESTRICT"), index=True
    )
    allocation_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("sales_allocations.id", ondelete="RESTRICT")
    )
    quantity: Mapped[Decimal] = mapped_column(QTY)
    picked_quantity: Mapped[Decimal | None] = mapped_column(QTY)
    loaded_quantity: Mapped[Decimal | None] = mapped_column(QTY)
    __table_args__ = (
        UniqueConstraint(
            "delivery_id", "allocation_id", name="uq_sales_delivery_allocation"
        ),
        CheckConstraint(
            "quantity > 0 AND (picked_quantity IS NULL OR picked_quantity BETWEEN 0 AND quantity) AND (loaded_quantity IS NULL OR (picked_quantity IS NOT NULL AND loaded_quantity BETWEEN 0 AND picked_quantity))",
            name="ck_sales_delivery_quantities",
        ),
    )


class SalesConsumption(Identity, Base):
    __tablename__ = "sales_consumptions"
    delivery_line_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("sales_delivery_lines.id", ondelete="RESTRICT"), unique=True
    )
    reservation_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("stock_reservations.id", ondelete="RESTRICT"), unique=True
    )
    movement_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("stock_movements.id", ondelete="RESTRICT"), unique=True
    )
    quantity: Mapped[Decimal] = mapped_column(QTY)
    __table_args__ = (
        CheckConstraint("quantity > 0", name="ck_sales_consumption_quantity"),
    )


class SalesOperation(Base):
    __tablename__ = "sales_operations"
    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True)
    action: Mapped[str] = mapped_column(String(80))
    target_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True))
    request_hash: Mapped[str] = mapped_column(String(64))
    created_by: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("users.id", ondelete="RESTRICT")
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
