"""Synthetic customer import receipts; never apply to company without approval.

Revision ID: 0011_customer_import
Revises: 0010_durable_review
"""
from alembic import op
import sqlalchemy as sa

revision = '0011_customer_import'
down_revision = '0010_durable_review'
branch_labels = None
depends_on = None


def common():
    return [sa.Column('id', sa.UUID(), primary_key=True),
            sa.Column('actor_id', sa.UUID(), sa.ForeignKey('users.id', ondelete='RESTRICT'), nullable=False),
            sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False)]


def foreign(name, table, **kwargs):
    return sa.Column(name, sa.UUID(), sa.ForeignKey(table + '.id', ondelete='RESTRICT'), nullable=False, **kwargs)


def upgrade():
    op.create_table('customer_import_receipts', *common(),
        foreign('source_id', 'import_review_sources'), foreign('revision_id', 'import_review_revisions', unique=True),
        foreign('validation_id', 'import_review_validations'), foreign('approval_id', 'import_review_decisions'),
        sa.Column('request_sha256', sa.String(64), nullable=False, unique=True),
        sa.Column('source_sha256', sa.String(64), nullable=False), sa.Column('binding_sha256', sa.String(64), nullable=False),
        sa.Column('outcome', sa.String(16), nullable=False),
        *[sa.Column(name, sa.Integer(), nullable=False) for name in ['selected_rows','validated_rows','applied_rows','duplicate_rows','rejected_rows','conflicts']],
        sa.CheckConstraint("outcome IN ('APPLIED','CONFLICT','REJECTED')", name='ck_customer_import_outcome'),
        sa.CheckConstraint('selected_rows > 0 AND validated_rows = selected_rows AND applied_rows >= 0 AND duplicate_rows >= 0 AND rejected_rows >= 0 AND conflicts >= 0 AND conflicts <= rejected_rows AND selected_rows = applied_rows + duplicate_rows + rejected_rows', name='ck_customer_import_counts'))
    op.create_table('customer_import_identities', *common(),
        sa.Column('namespace', sa.String(100), nullable=False), sa.Column('source_key_sha256', sa.String(64), nullable=False),
        sa.Column('content_sha256', sa.String(64), nullable=False), foreign('customer_id','customers',unique=True),
        foreign('receipt_id','customer_import_receipts'),
        sa.UniqueConstraint('namespace','source_key_sha256',name='uq_customer_import_source_identity'))
    op.create_table('customer_import_rows', *common(), foreign('receipt_id','customer_import_receipts'),
        sa.Column('source_row',sa.Integer(),nullable=False),sa.Column('source_key_sha256',sa.String(64),nullable=False),
        sa.Column('content_sha256',sa.String(64),nullable=False),
        sa.Column('customer_id',sa.UUID(),sa.ForeignKey('customers.id',ondelete='RESTRICT')),
        sa.Column('outcome',sa.String(16),nullable=False),sa.Column('code',sa.String(40),nullable=False),
        sa.UniqueConstraint('receipt_id','source_row',name='uq_customer_import_receipt_row'),
        sa.CheckConstraint("outcome IN ('APPLIED','DUPLICATE','CONFLICT','REJECTED')",name='ck_customer_import_row_outcome'),
        sa.CheckConstraint('source_row > 0',name='ck_customer_import_row_number'))
    op.create_index('ix_customer_import_rows_receipt_id','customer_import_rows',['receipt_id'])
    op.create_table('customer_import_attempts', *common(), foreign('receipt_id','customer_import_receipts'),
        sa.Column('kind',sa.String(24),nullable=False),
        sa.CheckConstraint("kind IN ('INITIAL','DUPLICATE_RETRY')",name='ck_customer_import_attempt_kind'))
    op.create_index('ix_customer_import_attempts_receipt_id','customer_import_attempts',['receipt_id'])
    op.create_index('uq_customer_import_initial_attempt','customer_import_attempts',['receipt_id'],unique=True,postgresql_where=sa.text("kind = 'INITIAL'"))
    op.execute("""CREATE FUNCTION guard_customer_import_history() RETURNS trigger LANGUAGE plpgsql AS $$
    BEGIN RAISE EXCEPTION 'Immutable customer import history' USING ERRCODE='23514'; END $$""")
    for table in ['customer_import_receipts','customer_import_identities','customer_import_rows','customer_import_attempts']:
        op.execute(f'CREATE TRIGGER immutable_customer_import_history BEFORE UPDATE OR DELETE ON {table} FOR EACH ROW EXECUTE FUNCTION guard_customer_import_history()')


def downgrade():
    for table in ['customer_import_attempts','customer_import_rows','customer_import_identities','customer_import_receipts']:
        op.drop_table(table)
    op.execute('DROP FUNCTION guard_customer_import_history()')
