"""Only fresh, isolated containment clusters; credentials never printed except seed stdin protocol."""
import os
import re
from pathlib import Path
import psycopg
from psycopg import sql


def main():
    database = os.environ["POSTGRES_DB"]
    if not re.fullmatch(r"ambs_http_test_[a-f0-9]{32}", database) or os.environ.get("APP_ENV") != "test" or os.environ["POSTGRES_HOST"] != "db":
        raise SystemExit("Only an isolated containment fixture is allowed")
    owner_password = Path("/run/secrets/database_owner_password").read_text().strip()
    os.environ["POSTGRES_PASSWORD"] = owner_password
    import sys
    if sys.argv[1] == "migrate":
        os.execvp("alembic", ["alembic", "upgrade", "head"])
    if sys.argv[1] == "seed":
        from tests.live_fixture import main as seed
        seed()
        return
    if sys.argv[1] != "grant":
        raise SystemExit("Unknown fixture action")
    runtime_password = Path("/run/secrets/database_password").read_text().strip()
    # No shell/CLI interpolation of either generated password.
    with psycopg.connect(host="db", dbname=database, user=os.environ["POSTGRES_USER"], password=owner_password) as conn:
        with conn.cursor() as cursor:
            cursor.execute("SET log_statement = 'none'")
            cursor.execute("SET log_min_error_statement = 'panic'")
            cursor.execute(sql.SQL("CREATE ROLE ambs_runtime LOGIN PASSWORD {}").format(sql.Literal(runtime_password)))
            cursor.execute("REVOKE CREATE ON SCHEMA public FROM PUBLIC")
            cursor.execute("GRANT USAGE ON SCHEMA public TO ambs_runtime")
            cursor.execute("GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO ambs_runtime")
            cursor.execute("GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO ambs_runtime")
            # Preserve application-enforced and trigger-enforced append-only records.
            cursor.execute("REVOKE INSERT, UPDATE, DELETE ON alembic_version, roles, permissions, role_permissions FROM ambs_runtime")
    print("PASS isolated non-owner runtime role created")


if __name__ == "__main__":
    main()
