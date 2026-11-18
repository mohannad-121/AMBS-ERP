"""Production-only secret loading; no credential values or SQL parameters in errors."""
import os
from pathlib import Path


def main():
    if os.environ.get("APP_ENV") != "production":
        raise SystemExit("Production environment required")
    for key, filename in (("POSTGRES_PASSWORD", "database_password"), ("AUTH_BFF_SECRET", "bff_secret"), ("ORS_API_KEY", "ors_api_key")):
        os.environ[key] = Path("/run/secrets", filename).read_text().strip()
    from app.core.config import get_settings
    from sqlalchemy import create_engine, text
    settings = get_settings()
    # The application must never run with a cluster administrator or schema owner.
    engine = create_engine(settings.database_url, hide_parameters=True)
    try:
        with engine.connect() as connection:
            unsafe = connection.scalar(text("""
                SELECT rolsuper OR rolcreatedb OR rolcreaterole OR rolreplication OR rolbypassrls
                  OR pg_has_role(current_user, (SELECT pg_get_userbyid(datdba) FROM pg_database WHERE datname=current_database()), 'MEMBER')
                  OR has_schema_privilege(current_user, 'public', 'CREATE')
                  OR EXISTS (SELECT 1 FROM pg_tables WHERE schemaname='public' AND pg_has_role(current_user, tableowner, 'MEMBER'))
                FROM pg_roles WHERE rolname=current_user
            """))
            if unsafe is not False:
                raise SystemExit("Production requires a dedicated non-owner database role")
    except SystemExit:
        raise
    except Exception:
        raise SystemExit("Production database privilege verification failed") from None
    finally:
        engine.dispose()
    os.execvp("uvicorn", ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--no-access-log", "--proxy-headers", "--forwarded-allow-ips", ""])


if __name__ == "__main__":
    main()
