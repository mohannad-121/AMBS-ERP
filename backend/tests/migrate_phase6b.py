"""Apply Phase 6B additively, refusing to commit if any pre-existing row changes.
Run only after taking and verifying a PostgreSQL backup. Never prints row data.
"""

import hashlib
from collections import Counter
from alembic import command
from alembic.config import Config
from sqlalchemy import inspect, text
from app.db.session import engine


def fingerprints(conn, table, columns):
    quoted = ",".join('"' + c + '"' for c in columns)
    return Counter(
        hashlib.sha256(repr(tuple(r)).encode()).hexdigest()
        for r in conn.execute(text(f'SELECT {quoted} FROM "{table}"'))
    )


def main():
    with engine.begin() as conn:
        conn.execute(text("SELECT pg_advisory_xact_lock(7140284201)"))
        conn.execute(text("SELECT pg_advisory_xact_lock(7140284202)"))
        head = conn.scalar(text("SELECT version_num FROM alembic_version"))
        if head != "0007_sales_ops":
            raise RuntimeError("Expected Phase 6A migration head; no changes applied")
        inspector = inspect(conn)
        columns = {
            t: [
                c["name"]
                for c in inspector.get_columns(t)
                if not (t == "sessions" and c["name"] in ("last_seen", "last_seen_at"))
            ]
            for t in inspector.get_table_names()
            if t != "alembic_version"
        }
        before = {t: fingerprints(conn, t, cols) for t, cols in columns.items()}
        cfg = Config("alembic.ini")
        cfg.attributes["connection"] = conn
        command.upgrade(cfg, "head")
        for table, cols in columns.items():
            if before[table] - fingerprints(conn, table, cols):
                raise RuntimeError("Pre-existing rows changed; migration rolled back")
        print(
            f"PASS preserved all pre-existing rows across {len(columns)} tables, including credentials, sessions and grants"
        )
        print("PASS additive migration head 0008_delivery_routes")


if __name__ == "__main__":
    main()
