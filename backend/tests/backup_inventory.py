"""Read-only database inventory/fingerprints for backup and restore verification."""
import argparse
import hashlib
import json
from datetime import datetime, UTC
from pathlib import Path
from sqlalchemy import create_engine, inspect, MetaData, Table, select
from app.core.config import get_settings


def snapshot(database=None):
    settings=get_settings()
    engine=create_engine(settings.database_url.set(database=database or settings.postgres_db))
    result={}
    try:
        with engine.connect() as connection:
            for name in sorted(inspect(connection).get_table_names()):
                table=Table(name,MetaData(),autoload_with=connection)
                cols=[c for c in table.columns if not (name=='sessions' and c.name in ('last_seen','last_seen_at'))]
                hashes=[]
                for row in connection.execute(select(*cols)):
                    encoded=json.dumps(list(row),sort_keys=True,separators=(',',':'),default=lambda v:v.astimezone(UTC).isoformat() if isinstance(v,datetime) else str(v))
                    hashes.append(hashlib.sha256(encoded.encode()).hexdigest())
                result[name]={'rows':len(hashes),'sha256':hashlib.sha256('\n'.join(sorted(hashes)).encode()).hexdigest()}
        return result
    finally:
        engine.dispose()


def main():
    parser=argparse.ArgumentParser();parser.add_argument('--database');args=parser.parse_args()
    print(json.dumps({'tables':snapshot(args.database)},sort_keys=True))


if __name__=='__main__':main()
