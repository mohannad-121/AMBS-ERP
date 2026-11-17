"""Harden confirmed state transitions and retain cancelled quote draft branches.

Revision ID: 0006_workflow_guards
Revises: 0005_purchasing
"""

from alembic import op
import sqlalchemy as sa

revision = "0006_workflow_guards"
down_revision = "0005_purchasing"
branch_labels = None
depends_on = None


def upgrade():
    op.drop_constraint(
        "supplier_quotations_supersedes_id_key", "supplier_quotations", type_="unique"
    )
    op.create_index(
        "uq_quote_published_successor",
        "supplier_quotations",
        ["supersedes_id"],
        unique=True,
        postgresql_where=sa.text(
            "supersedes_id IS NOT NULL AND status IN ('ISSUED','SUPERSEDED')"
        ),
    )
    op.execute("""
    CREATE OR REPLACE FUNCTION ambs_purchasing_document_guard() RETURNS trigger LANGUAGE plpgsql AS $$
    BEGIN
      IF TG_OP='DELETE' THEN RAISE EXCEPTION 'Commercial history cannot be deleted' USING ERRCODE='23514'; END IF;
      IF OLD.status<>'DRAFT' THEN
        IF (to_jsonb(OLD)-ARRAY['status','updated_at','closure_reason','completed_at'])<>
           (to_jsonb(NEW)-ARRAY['status','updated_at','closure_reason','completed_at'])
        THEN RAISE EXCEPTION 'Confirmed commercial terms are immutable' USING ERRCODE='23514'; END IF;
        IF NEW.status='DRAFT' THEN RAISE EXCEPTION 'Confirmed documents cannot return to draft' USING ERRCODE='23514'; END IF;
        IF TG_TABLE_NAME='purchase_orders' THEN
          IF (OLD.status IN ('CLOSED','CANCELLED') AND NEW.status<>OLD.status)
             OR NEW.status NOT IN ('CONFIRMED','PARTIALLY_RECEIVED','RECEIVED','CLOSED','CANCELLED')
             OR (OLD.status NOT IN ('CLOSED','CANCELLED') AND NEW.status='CANCELLED')
             OR (OLD.closure_reason IS DISTINCT FROM NEW.closure_reason AND NOT (OLD.status<>'CLOSED' AND NEW.status='CLOSED'))
          THEN RAISE EXCEPTION 'Invalid purchase order transition' USING ERRCODE='23514'; END IF;
        ELSIF TG_TABLE_NAME='supplier_quotations' THEN
          IF (OLD.status='ISSUED' AND NEW.status NOT IN ('ISSUED','SUPERSEDED'))
             OR (OLD.status IN ('SUPERSEDED','CANCELLED') AND NEW.status<>OLD.status)
          THEN RAISE EXCEPTION 'Invalid quotation transition' USING ERRCODE='23514'; END IF;
        ELSIF TG_TABLE_NAME='purchase_requests' THEN
          IF (OLD.status='SUBMITTED' AND NEW.status NOT IN ('SUBMITTED','CONVERTED','CANCELLED'))
             OR (OLD.status IN ('CONVERTED','CANCELLED') AND NEW.status<>OLD.status)
          THEN RAISE EXCEPTION 'Invalid request transition' USING ERRCODE='23514'; END IF;
        ELSIF TG_TABLE_NAME='production_orders' THEN
          IF (OLD.status='ACTIVE' AND NEW.status NOT IN ('ACTIVE','COMPLETED'))
             OR (OLD.status IN ('COMPLETED','CANCELLED') AND NEW.status<>OLD.status)
             OR (OLD.completed_at IS DISTINCT FROM NEW.completed_at AND NOT (OLD.status='ACTIVE' AND NEW.status='COMPLETED'))
          THEN RAISE EXCEPTION 'Invalid production transition' USING ERRCODE='23514'; END IF;
        END IF;
      END IF;
      RETURN NEW;
    END $$;
    """)


def downgrade():
    raise RuntimeError("Retain purchasing history; use reviewed forward migrations.")
