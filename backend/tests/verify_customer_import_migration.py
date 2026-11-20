"""Generated-database additive/downgrade/drift proof for P9-2A only."""
import json
import re
import uuid
from pathlib import Path
from alembic import command
from alembic.config import Config
from sqlalchemy import create_engine, inspect, text
from app.core.config import get_settings
from tests.backup_inventory import snapshot


def main():
    settings = get_settings()
    if settings.app_env != 'test' or not re.fullmatch(r'ambs_(?:http_)?test_[0-9a-f]{8,32}',settings.postgres_db):
        raise RuntimeError('Only an isolated generated synthetic environment is allowed')
    name = 'ambs_test_' + uuid.uuid4().hex
    admin = create_engine(settings.database_url.set(database='postgres'),isolation_level='AUTOCOMMIT')
    engine = create_engine(settings.database_url.set(database=name))
    config = Config(str(Path(__file__).resolve().parents[1]/'alembic.ini'))
    config.set_main_option('script_location',str(Path(__file__).resolve().parents[1]/'alembic'))
    def migrate(operation,target):
        with engine.begin() as connection:
            config.attributes['connection'] = connection; operation(config,target)
    def schema(names):
        with engine.connect() as connection:
            inspector = inspect(connection)
            return {n:json.dumps({'columns':inspector.get_columns(n),'indexes':inspector.get_indexes(n),
                'checks':inspector.get_check_constraints(n),'foreign_keys':inspector.get_foreign_keys(n)},sort_keys=True,default=str) for n in names}
    try:
        with admin.connect() as connection: connection.execute(text(f'CREATE DATABASE "{name}"'))
        migrate(command.upgrade,'0010_durable_review')
        before = snapshot(name); names = sorted(before); before_schema = schema(names)
        assert len(before) == 74
        migrate(command.upgrade,'0011_customer_import')
        after = snapshot(name)
        assert set(after)-set(before) == {'customer_import_receipts','customer_import_identities','customer_import_rows','customer_import_attempts'}
        assert all(before[n] == after[n] for n in names if n != 'alembic_version')
        assert schema(names) == before_schema
        migrate(command.downgrade,'0010_durable_review')
        assert snapshot(name) == before and schema(names) == before_schema
        migrate(command.upgrade,'0011_customer_import')
        with engine.begin() as connection:
            config.attributes['connection'] = connection; command.check(config)
        print(json.dumps({'status':'PASS','tables':[74,78,74,78],'original_schema_unchanged':True,
            'original_data_unchanged_except_alembic':True,'no_final_drift':True}))
    finally:
        engine.dispose()
        with admin.connect() as connection: connection.execute(text(f'DROP DATABASE IF EXISTS "{name}" WITH (FORCE)'))
        admin.dispose()


if __name__ == '__main__': main()
