"""Synthetic-only migration review metadata; never an executable import queue."""
import uuid
from datetime import datetime
from sqlalchemy import String, Integer, ForeignKey, DateTime, UniqueConstraint, CheckConstraint, func
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import Mapped, mapped_column
from app.models.base import Base


class SourceManifest(Base):
    __tablename__ = 'import_review_sources'
    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    namespace: Mapped[str] = mapped_column(String(100))
    sha256: Mapped[str] = mapped_column(String(64))
    format: Mapped[str] = mapped_column(String(8))
    parser_version: Mapped[str] = mapped_column(String(40))
    policy_version: Mapped[str] = mapped_column(String(40))
    actor_id: Mapped[uuid.UUID] = mapped_column(ForeignKey('users.id', ondelete='RESTRICT'))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    __table_args__ = (UniqueConstraint('namespace', 'sha256', 'parser_version', 'policy_version', name='uq_review_source_revision'),)


class ReviewRevision(Base):
    __tablename__ = 'import_review_revisions'
    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    source_id: Mapped[uuid.UUID] = mapped_column(ForeignKey('import_review_sources.id', ondelete='RESTRICT'), index=True)
    ordinal: Mapped[int] = mapped_column(Integer)
    selection: Mapped[dict] = mapped_column(JSONB)
    selection_sha256: Mapped[str] = mapped_column(String(64))
    state: Mapped[str] = mapped_column(String(32), default='RECEIVED')
    version: Mapped[int] = mapped_column(Integer, default=1)
    actor_id: Mapped[uuid.UUID] = mapped_column(ForeignKey('users.id', ondelete='RESTRICT'))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    __table_args__ = (UniqueConstraint('source_id', 'ordinal', name='uq_review_revision_ordinal'), CheckConstraint("state IN ('RECEIVED','VALIDATED','REVIEW_REQUIRED','READY_FOR_APPROVAL','APPROVED','REJECTED','CANCELLED')", name='ck_review_state'))


class ValidationRun(Base):
    __tablename__ = 'import_review_validations'
    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    revision_id: Mapped[uuid.UUID] = mapped_column(ForeignKey('import_review_revisions.id', ondelete='RESTRICT'), index=True)
    result: Mapped[dict] = mapped_column(JSONB)
    result_sha256: Mapped[str] = mapped_column(String(64))
    reference_sha256: Mapped[str] = mapped_column(String(64))
    binding_sha256: Mapped[str] = mapped_column(String(64))
    actor_id: Mapped[uuid.UUID] = mapped_column(ForeignKey('users.id', ondelete='RESTRICT'))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class ReviewDecision(Base):
    __tablename__ = 'import_review_decisions'
    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    revision_id: Mapped[uuid.UUID] = mapped_column(ForeignKey('import_review_revisions.id', ondelete='RESTRICT'), index=True)
    validation_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey('import_review_validations.id', ondelete='RESTRICT'))
    binding_sha256: Mapped[str | None] = mapped_column(String(64))
    kind: Mapped[str] = mapped_column(String(32))
    reason: Mapped[str] = mapped_column(String(500))
    actor_id: Mapped[uuid.UUID] = mapped_column(ForeignKey('users.id', ondelete='RESTRICT'))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
