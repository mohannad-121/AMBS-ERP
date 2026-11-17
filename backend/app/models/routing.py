"""Immutable routing evidence, separate from physical inventory and fulfillment."""
import uuid
from datetime import datetime
from decimal import Decimal
from sqlalchemy import ForeignKey, String, Numeric, DateTime, Integer, Boolean, CheckConstraint, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy.dialects.postgresql import UUID, JSONB
from app.models.base import Base
from app.models.inventory import Identity


class VerifiedSite(Identity, Base):
    __tablename__ = 'routing_sites'
    source_kind: Mapped[str] = mapped_column(String(16))
    source_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), index=True)
    label: Mapped[str] = mapped_column(String(200))
    address: Mapped[str] = mapped_column(String(2000))
    latitude: Mapped[Decimal] = mapped_column(Numeric(10,7))
    longitude: Mapped[Decimal] = mapped_column(Numeric(10,7))
    verified_by: Mapped[uuid.UUID] = mapped_column(ForeignKey('users.id', ondelete='RESTRICT'))
    verified_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    request_key: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), unique=True)
    request_hash: Mapped[str] = mapped_column(String(64))
    __table_args__ = (CheckConstraint("source_kind IN ('warehouse','location','customer','project','delivery') AND latitude BETWEEN -90 AND 90 AND longitude BETWEEN -180 AND 180", name='ck_routing_site'),)


class DriverAssignment(Identity, Base):
    __tablename__ = 'delivery_driver_assignments'
    delivery_id: Mapped[uuid.UUID] = mapped_column(ForeignKey('sales_deliveries.id', ondelete='RESTRICT'), index=True)
    driver_id: Mapped[uuid.UUID] = mapped_column(ForeignKey('users.id', ondelete='RESTRICT'))
    revision: Mapped[int] = mapped_column(Integer)
    previous_driver_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey('users.id', ondelete='RESTRICT'))
    planned_departure: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    reason: Mapped[str] = mapped_column(String(1000))
    actor_id: Mapped[uuid.UUID] = mapped_column(ForeignKey('users.id', ondelete='RESTRICT'))
    request_key: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), unique=True)
    request_hash: Mapped[str] = mapped_column(String(64))
    __table_args__ = (UniqueConstraint('delivery_id','revision',name='uq_driver_assignment_revision'), CheckConstraint('revision>0',name='ck_driver_assignment_revision'))


class RouteCalculation(Identity, Base):
    __tablename__ = 'delivery_route_calculations'
    delivery_id: Mapped[uuid.UUID] = mapped_column(ForeignKey('sales_deliveries.id', ondelete='RESTRICT'), index=True)
    origin_id: Mapped[uuid.UUID] = mapped_column(ForeignKey('routing_sites.id', ondelete='RESTRICT'))
    destination_id: Mapped[uuid.UUID] = mapped_column(ForeignKey('routing_sites.id', ondelete='RESTRICT'))
    revision: Mapped[int] = mapped_column(Integer)
    provider: Mapped[str] = mapped_column(String(32))
    profile: Mapped[str] = mapped_column(String(24))
    status: Mapped[str] = mapped_column(String(24))
    message: Mapped[str] = mapped_column(String(300))
    distance_meters: Mapped[Decimal | None] = mapped_column(Numeric(20,3))
    duration_seconds: Mapped[Decimal | None] = mapped_column(Numeric(20,3))
    warnings: Mapped[list] = mapped_column(JSONB)
    geometry: Mapped[list | None] = mapped_column(JSONB(none_as_null=True))
    provider_timestamp: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    attempted: Mapped[bool] = mapped_column(Boolean)
    retry_after: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    estimated_cost: Mapped[Decimal | None] = mapped_column(Numeric(20,2))
    cost_basis: Mapped[dict | None] = mapped_column(JSONB)
    actor_id: Mapped[uuid.UUID] = mapped_column(ForeignKey('users.id', ondelete='RESTRICT'))
    reason: Mapped[str] = mapped_column(String(1000))
    request_key: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), unique=True)
    request_hash: Mapped[str] = mapped_column(String(64))
    __table_args__ = (UniqueConstraint('delivery_id','revision', name='uq_delivery_route_revision'),
        CheckConstraint("revision>0 AND profile='driving-car' AND status IN ('SUCCESS','NOT_CONFIGURED','AUTH_FAILED','QUOTA_EXCEEDED','INVALID_ENDPOINTS','NO_ROUTE','UNAVAILABLE','INVALID_RESPONSE') AND ((status='SUCCESS' AND distance_meters>=0 AND duration_seconds>=0 AND distance_meters IS NOT NULL AND duration_seconds IS NOT NULL) OR (status<>'SUCCESS' AND distance_meters IS NULL AND duration_seconds IS NULL AND geometry IS NULL))", name='ck_route_result'))


class RouteConfirmation(Identity, Base):
    __tablename__ = 'delivery_route_confirmations'
    delivery_id: Mapped[uuid.UUID] = mapped_column(ForeignKey('sales_deliveries.id', ondelete='RESTRICT'), index=True)
    calculation_id: Mapped[uuid.UUID] = mapped_column(ForeignKey('delivery_route_calculations.id', ondelete='RESTRICT'), unique=True)
    assignment_id: Mapped[uuid.UUID] = mapped_column(ForeignKey('delivery_driver_assignments.id', ondelete='RESTRICT'))
    actor_id: Mapped[uuid.UUID] = mapped_column(ForeignKey('users.id', ondelete='RESTRICT'))
    reason: Mapped[str] = mapped_column(String(1000))
    request_key: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), unique=True)
    request_hash: Mapped[str] = mapped_column(String(64))


class TripEvent(Identity, Base):
    __tablename__ = 'delivery_trip_events'
    delivery_id: Mapped[uuid.UUID] = mapped_column(ForeignKey('sales_deliveries.id', ondelete='RESTRICT'), index=True)
    assignment_id: Mapped[uuid.UUID] = mapped_column(ForeignKey('delivery_driver_assignments.id', ondelete='RESTRICT'))
    status: Mapped[str] = mapped_column(String(12))
    occurred_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    actor_id: Mapped[uuid.UUID] = mapped_column(ForeignKey('users.id', ondelete='RESTRICT'))
    reason: Mapped[str] = mapped_column(String(1000))
    request_key: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), unique=True)
    request_hash: Mapped[str] = mapped_column(String(64))
    __table_args__ = (CheckConstraint("status IN ('ARRIVED','COMPLETED')", name='ck_trip_status'), UniqueConstraint('delivery_id','status', name='uq_delivery_trip_status'))
