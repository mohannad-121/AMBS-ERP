"""Business identities. No stock balances or workflow quantities belong here."""

import uuid
from datetime import date, datetime
from decimal import Decimal

from sqlalchemy import (
    Boolean,
    CheckConstraint,
    Date,
    DateTime,
    ForeignKey,
    ForeignKeyConstraint,
    Index,
    Integer,
    Numeric,
    String,
    Text,
    UniqueConstraint,
    func,
)
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base


class MasterRecord:
    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    code: Mapped[str] = mapped_column(String(40), unique=True)
    name: Mapped[str] = mapped_column(String(200))
    is_active: Mapped[bool] = mapped_column(
        Boolean, server_default="true", default=True
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )
    created_by: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("users.id", ondelete="RESTRICT")
    )


class Customer(MasterRecord, Base):
    __tablename__ = "customers"
    normalized_name: Mapped[str] = mapped_column(String(200), index=True)
    customer_type: Mapped[str | None] = mapped_column(String(80))
    contact_name: Mapped[str | None] = mapped_column(String(150))
    email: Mapped[str | None] = mapped_column(String(254))
    phone: Mapped[str | None] = mapped_column(String(50))
    address: Mapped[str | None] = mapped_column(Text)
    country: Mapped[str] = mapped_column(String(80), default="United Arab Emirates")
    trn: Mapped[str | None] = mapped_column(String(15))
    notes: Mapped[str | None] = mapped_column(Text)
    __table_args__ = (
        CheckConstraint("trn IS NULL OR trn ~ '^[0-9]{15}$'", name="ck_customer_trn"),
    )


class Project(MasterRecord, Base):
    __tablename__ = "projects"
    customer_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("customers.id", ondelete="RESTRICT"), index=True
    )
    location: Mapped[str | None] = mapped_column(String(255))
    site_contact: Mapped[str | None] = mapped_column(String(150))
    phone: Mapped[str | None] = mapped_column(String(50))
    status: Mapped[str] = mapped_column(String(20), default="active")
    notes: Mapped[str | None] = mapped_column(Text)
    __table_args__ = (
        UniqueConstraint("id", "customer_id", name="uq_project_customer"),
        CheckConstraint(
            "status IN ('active','completed','archived')", name="ck_project_status"
        ),
    )


class Lpo(MasterRecord, Base):
    __tablename__ = "customer_lpos"
    customer_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("customers.id", ondelete="RESTRICT"), index=True
    )
    project_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), index=True)
    number: Mapped[str] = mapped_column(String(150))
    normalized_number: Mapped[str] = mapped_column(String(150))
    lpo_date: Mapped[date | None] = mapped_column(Date)
    status: Mapped[str] = mapped_column(String(20), default="active")
    notes: Mapped[str | None] = mapped_column(Text)
    document_reference: Mapped[str | None] = mapped_column(String(255))
    __table_args__ = (
        UniqueConstraint("id", "customer_id", name="uq_lpo_customer"),
        ForeignKeyConstraint(
            ["project_id", "customer_id"],
            ["projects.id", "projects.customer_id"],
            ondelete="RESTRICT",
            name="fk_lpo_project_customer",
        ),
        UniqueConstraint(
            "customer_id", "normalized_number", name="uq_customer_lpo_number"
        ),
        CheckConstraint(
            "status IN ('active','closed','cancelled')", name="ck_lpo_status"
        ),
    )


class Category(MasterRecord, Base):
    __tablename__ = "product_categories"
    parent_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("product_categories.id", ondelete="RESTRICT"), index=True
    )
    __table_args__ = (
        CheckConstraint(
            "parent_id IS NULL OR parent_id <> id", name="ck_category_not_self"
        ),
    )


class Unit(MasterRecord, Base):
    __tablename__ = "units"
    decimal_places: Mapped[int] = mapped_column(Integer, default=0)
    __table_args__ = (
        CheckConstraint("decimal_places BETWEEN 0 AND 6", name="ck_unit_precision"),
    )


class Family(MasterRecord, Base):
    __tablename__ = "product_families"
    description: Mapped[str | None] = mapped_column(Text)
    # Every configured key is required; each list contains approved values.
    attribute_definitions: Mapped[dict] = mapped_column(
        JSONB, default=dict, server_default="{}"
    )


class Item(MasterRecord, Base):
    __tablename__ = "items"
    description: Mapped[str | None] = mapped_column(Text)
    item_type: Mapped[str] = mapped_column(String(30))
    category_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("product_categories.id", ondelete="RESTRICT"), index=True
    )
    unit_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("units.id", ondelete="RESTRICT"), index=True
    )
    family_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("product_families.id", ondelete="RESTRICT"), index=True
    )
    attributes: Mapped[dict] = mapped_column(JSONB, default=dict, server_default="{}")
    variant_signature: Mapped[str | None] = mapped_column(String(64))
    colour: Mapped[str | None] = mapped_column(String(80))
    dimensions: Mapped[str | None] = mapped_column(String(150))
    design: Mapped[str | None] = mapped_column(String(80))
    weight_kg: Mapped[Decimal | None] = mapped_column(Numeric(14, 6))
    __table_args__ = (
        UniqueConstraint("family_id", "variant_signature", name="uq_family_variant"),
        CheckConstraint("weight_kg IS NULL OR weight_kg >= 0", name="ck_item_weight"),
        CheckConstraint(
            "item_type IN ('finished','raw_material','component','accessory','kit')",
            name="ck_item_type",
        ),
        CheckConstraint(
            "(family_id IS NULL AND variant_signature IS NULL AND attributes = '{}'::jsonb) OR (family_id IS NOT NULL AND variant_signature IS NOT NULL)",
            name="ck_item_variant",
        ),
        Index("ix_items_attributes", "attributes", postgresql_using="gin"),
    )


class ItemImage(Base):
    __tablename__ = "item_images"
    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    item_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("items.id", ondelete="RESTRICT"), unique=True
    )
    storage_key: Mapped[str] = mapped_column(String(80), unique=True)
    mime_type: Mapped[str] = mapped_column(String(30))
    byte_size: Mapped[int] = mapped_column(Integer)
    sha256: Mapped[str] = mapped_column(String(64))
    width: Mapped[int] = mapped_column(Integer)
    height: Mapped[int] = mapped_column(Integer)
    created_by: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("users.id", ondelete="RESTRICT")
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    __table_args__ = (
        CheckConstraint(
            "byte_size BETWEEN 1 AND 5242880 AND width > 0 AND height > 0",
            name="ck_image_size",
        ),
    )


class LegacyReference(Base):
    """Approved import mappings, populated only by later reviewed import tooling."""

    __tablename__ = "legacy_references"
    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    source_system: Mapped[str] = mapped_column(String(100))
    source_key: Mapped[str] = mapped_column(String(200))
    entity_type: Mapped[str] = mapped_column(String(40))
    customer_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("customers.id", ondelete="RESTRICT")
    )
    project_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("projects.id", ondelete="RESTRICT")
    )
    lpo_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("customer_lpos.id", ondelete="RESTRICT")
    )
    item_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("items.id", ondelete="RESTRICT")
    )
    __table_args__ = (
        UniqueConstraint(
            "source_system", "entity_type", "source_key", name="uq_legacy_source"
        ),
        CheckConstraint(
            "num_nonnulls(customer_id,project_id,lpo_id,item_id) = 1",
            name="ck_legacy_one_target",
        ),
    )
