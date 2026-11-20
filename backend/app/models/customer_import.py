"""Immutable synthetic customer import receipts and identity provenance."""
import uuid
from datetime import datetime

from sqlalchemy import CheckConstraint, DateTime, ForeignKey, Index, Integer, String, UniqueConstraint, func, text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column
from app.models.base import Base


class History:
    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    actor_id: Mapped[uuid.UUID] = mapped_column(ForeignKey('users.id', ondelete='RESTRICT'))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class CustomerImportReceipt(History, Base):
    __tablename__ = 'customer_import_receipts'
    source_id: Mapped[uuid.UUID] = mapped_column(ForeignKey('import_review_sources.id', ondelete='RESTRICT'))
    revision_id: Mapped[uuid.UUID] = mapped_column(ForeignKey('import_review_revisions.id', ondelete='RESTRICT'), unique=True)
    validation_id: Mapped[uuid.UUID] = mapped_column(ForeignKey('import_review_validations.id', ondelete='RESTRICT'))
    approval_id: Mapped[uuid.UUID] = mapped_column(ForeignKey('import_review_decisions.id', ondelete='RESTRICT'))
    request_sha256: Mapped[str] = mapped_column(String(64), unique=True)
    source_sha256: Mapped[str] = mapped_column(String(64))
    binding_sha256: Mapped[str] = mapped_column(String(64))
    outcome: Mapped[str] = mapped_column(String(16))
    selected_rows: Mapped[int] = mapped_column(Integer)
    validated_rows: Mapped[int] = mapped_column(Integer)
    applied_rows: Mapped[int] = mapped_column(Integer)
    duplicate_rows: Mapped[int] = mapped_column(Integer)
    rejected_rows: Mapped[int] = mapped_column(Integer)
    conflicts: Mapped[int] = mapped_column(Integer)
    __table_args__ = (
        CheckConstraint("outcome IN ('APPLIED','CONFLICT','REJECTED')", name='ck_customer_import_outcome'),
        CheckConstraint('selected_rows > 0 AND validated_rows = selected_rows AND applied_rows >= 0 AND duplicate_rows >= 0 AND rejected_rows >= 0 AND conflicts >= 0 AND conflicts <= rejected_rows AND selected_rows = applied_rows + duplicate_rows + rejected_rows', name='ck_customer_import_counts'),
    )


class CustomerImportIdentity(History, Base):
    __tablename__ = 'customer_import_identities'
    namespace: Mapped[str] = mapped_column(String(100))
    source_key_sha256: Mapped[str] = mapped_column(String(64))
    content_sha256: Mapped[str] = mapped_column(String(64))
    customer_id: Mapped[uuid.UUID] = mapped_column(ForeignKey('customers.id', ondelete='RESTRICT'), unique=True)
    receipt_id: Mapped[uuid.UUID] = mapped_column(ForeignKey('customer_import_receipts.id', ondelete='RESTRICT'))
    __table_args__ = (UniqueConstraint('namespace', 'source_key_sha256', name='uq_customer_import_source_identity'),)


class CustomerImportRow(History, Base):
    __tablename__ = 'customer_import_rows'
    receipt_id: Mapped[uuid.UUID] = mapped_column(ForeignKey('customer_import_receipts.id', ondelete='RESTRICT'))
    source_row: Mapped[int] = mapped_column(Integer)
    source_key_sha256: Mapped[str] = mapped_column(String(64))
    content_sha256: Mapped[str] = mapped_column(String(64))
    customer_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey('customers.id', ondelete='RESTRICT'))
    outcome: Mapped[str] = mapped_column(String(16))
    code: Mapped[str] = mapped_column(String(40))
    __table_args__ = (
        UniqueConstraint('receipt_id', 'source_row', name='uq_customer_import_receipt_row'),
        CheckConstraint("outcome IN ('APPLIED','DUPLICATE','CONFLICT','REJECTED')", name='ck_customer_import_row_outcome'),
        CheckConstraint('source_row > 0', name='ck_customer_import_row_number'),
        Index('ix_customer_import_rows_receipt_id', 'receipt_id'),
    )


class CustomerImportAttempt(History, Base):
    __tablename__ = 'customer_import_attempts'
    receipt_id: Mapped[uuid.UUID] = mapped_column(ForeignKey('customer_import_receipts.id', ondelete='RESTRICT'))
    kind: Mapped[str] = mapped_column(String(24))
    __table_args__ = (
        CheckConstraint("kind IN ('INITIAL','DUPLICATE_RETRY')", name='ck_customer_import_attempt_kind'),
        Index('ix_customer_import_attempts_receipt_id', 'receipt_id'),
        Index('uq_customer_import_initial_attempt', 'receipt_id', unique=True, postgresql_where=text("kind = 'INITIAL'")),
    )
