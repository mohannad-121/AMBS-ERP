"""Durable review tables only; independently review before company application.

Revision ID: 0010_durable_review
Revises: 0009_packing_bom
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import JSONB

revision = '0010_durable_review'
down_revision = '0009_packing_bom'
branch_labels = None
depends_on = None


def upgrade():
    # Explicit new-table schema; never create/drop/update any existing table.
    common = lambda: [sa.Column('id', sa.UUID(), primary_key=True), sa.Column('actor_id', sa.UUID(), sa.ForeignKey('users.id', ondelete='RESTRICT'), nullable=False), sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False)]
    op.create_table('import_review_sources', *common(), sa.Column('namespace', sa.String(100), nullable=False), sa.Column('sha256', sa.String(64), nullable=False), sa.Column('format', sa.String(8), nullable=False), sa.Column('parser_version', sa.String(40), nullable=False), sa.Column('policy_version', sa.String(40), nullable=False), sa.UniqueConstraint('namespace','sha256','parser_version','policy_version',name='uq_review_source_revision'))
    op.create_table('import_review_revisions', *common(), sa.Column('source_id',sa.UUID(),sa.ForeignKey('import_review_sources.id',ondelete='RESTRICT'),nullable=False),sa.Column('ordinal',sa.Integer(),nullable=False),sa.Column('selection',JSONB(),nullable=False),sa.Column('selection_sha256',sa.String(64),nullable=False),sa.Column('state',sa.String(32),nullable=False),sa.Column('version',sa.Integer(),nullable=False),sa.UniqueConstraint('source_id','ordinal',name='uq_review_revision_ordinal'),sa.CheckConstraint("state IN ('RECEIVED','VALIDATED','REVIEW_REQUIRED','READY_FOR_APPROVAL','APPROVED','REJECTED','CANCELLED')",name='ck_review_state'))
    op.create_table('import_review_validations',*common(),sa.Column('revision_id',sa.UUID(),sa.ForeignKey('import_review_revisions.id',ondelete='RESTRICT'),nullable=False),sa.Column('result',JSONB(),nullable=False),sa.Column('result_sha256',sa.String(64),nullable=False),sa.Column('reference_sha256',sa.String(64),nullable=False),sa.Column('binding_sha256',sa.String(64),nullable=False))
    op.create_table('import_review_decisions',*common(),sa.Column('revision_id',sa.UUID(),sa.ForeignKey('import_review_revisions.id',ondelete='RESTRICT'),nullable=False),sa.Column('validation_id',sa.UUID(),sa.ForeignKey('import_review_validations.id',ondelete='RESTRICT')),sa.Column('binding_sha256',sa.String(64)),sa.Column('kind',sa.String(32),nullable=False),sa.Column('reason',sa.String(500),nullable=False))
    for table,column in [('import_review_revisions','source_id'),('import_review_validations','revision_id'),('import_review_decisions','revision_id')]:
        op.create_index('ix_'+table+'_'+column,table,[column])
    op.execute("""CREATE FUNCTION guard_import_review_history() RETURNS trigger LANGUAGE plpgsql AS $$
    BEGIN
      IF TG_TABLE_NAME = 'import_review_revisions' AND TG_OP = 'UPDATE' THEN
        IF (to_jsonb(NEW) - 'state' - 'version') = (to_jsonb(OLD) - 'state' - 'version') THEN RETURN NEW; END IF;
      END IF;
      RAISE EXCEPTION 'Immutable review history' USING ERRCODE='23514';
    END $$""")
    for table in ['import_review_sources','import_review_revisions','import_review_validations','import_review_decisions']:
        op.execute(f'CREATE TRIGGER immutable_review_history BEFORE UPDATE OR DELETE ON {table} FOR EACH ROW EXECUTE FUNCTION guard_import_review_history()')


def downgrade():
    for table in ['import_review_decisions','import_review_validations','import_review_revisions','import_review_sources']:
        op.drop_table(table)
    op.execute('DROP FUNCTION guard_import_review_history()')
