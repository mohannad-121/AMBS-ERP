"""Standalone additive/downgrade proof, only a generated disposable PostgreSQL DB.

Run: python -m tests.verify_review_migration. Never uses the company database.
"""
import json
import uuid
from pathlib import Path
from alembic import command
from alembic.config import Config
from sqlalchemy import create_engine, inspect, text
from app.core.config import get_settings
from tests.backup_inventory import snapshot


def main():
    settings = get_settings()
    if settings.app_env != 'test':
        raise RuntimeError('Migration verification requires the isolated test environment')
    name = 'ambs_test_' + uuid.uuid4().hex
    admin = create_engine(settings.database_url.set(database='postgres'), isolation_level='AUTOCOMMIT')
    engine = create_engine(settings.database_url.set(database=name))
    config = Config(str(Path(__file__).resolve().parents[1] / 'alembic.ini'))
    config.set_main_option('script_location', str(Path(__file__).resolve().parents[1] / 'alembic'))
    def migrate(operation, target):
        with engine.begin() as connection:
            config.attributes['connection'] = connection
            operation(config, target)
    def schema(names):
        with engine.connect() as connection:
            inspector = inspect(connection)
            return {n: json.dumps({'columns': inspector.get_columns(n), 'indexes': inspector.get_indexes(n), 'checks': inspector.get_check_constraints(n), 'foreign_keys': inspector.get_foreign_keys(n)}, sort_keys=True, default=str) for n in names}
    try:
        with admin.connect() as connection:
            connection.execute(text(f'CREATE DATABASE "{name}"'))
        migrate(command.upgrade, '0009_packing_bom')
        before = snapshot(name); names = sorted(before); before_schema = schema(names)
        assert len(names) == 70
        migrate(command.upgrade, '0010_durable_review')
        after = snapshot(name)
        assert set(after) - set(before) == {'import_review_sources', 'import_review_revisions', 'import_review_validations', 'import_review_decisions'}
        assert all(before[n] == after[n] for n in names if n != 'alembic_version')
        assert schema(names) == before_schema
        migrate(command.downgrade, '0009_packing_bom')
        assert snapshot(name) == before and schema(names) == before_schema
        migrate(command.upgrade, '0010_durable_review')
        with engine.begin() as connection:
            config.attributes['connection'] = connection
            command.check(config)
        print(json.dumps({'status': 'PASS', 'original_tables': 70, 'added_tables': 4, 'original_columns_indexes_checks_foreign_keys_unchanged': True, 'existing_data_unchanged_except_expected_alembic_bookkeeping': True, 'downgrade_restores_all_70_fingerprints': True, 'upgrade_again_no_drift': True}))
    finally:
        engine.dispose()
        with admin.connect() as connection:
            connection.execute(text(f'DROP DATABASE IF EXISTS "{name}" WITH (FORCE)'))
        admin.dispose()


if __name__ == '__main__':
    main()
