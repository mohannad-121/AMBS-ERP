"""Guarded fixtures for the isolated live BFF verification stack."""

import json
import re
import secrets
import sys

from sqlalchemy import create_engine, text

from app.cli import provision_admin
from app.core.config import get_settings
from app.db.session import SessionLocal
from app.schemas.security import UserCreate


def main():
    settings = get_settings()
    if settings.app_env == "production":
        raise RuntimeError(
            "Live test fixtures require a development or test environment"
        )
    action = sys.argv[1]
    database = sys.argv[2] if len(sys.argv) > 2 else settings.postgres_db
    if not re.fullmatch(r"ambs_http_test_[a-f0-9]{32}", database):
        raise RuntimeError(
            "Only an explicitly named temporary HTTP test database is allowed"
        )
    if action in {"create-db", "drop-db"}:
        engine = create_engine(
            settings.database_url.set(database="postgres"), isolation_level="AUTOCOMMIT"
        )
        statement = (
            f'CREATE DATABASE "{database}"'
            if action == "create-db"
            else f'DROP DATABASE "{database}" WITH (FORCE)'
        )
        with engine.connect() as connection:
            connection.execute(text(statement))
        engine.dispose()
        return
    if action != "seed" or database != settings.postgres_db:
        raise RuntimeError("Invalid fixture command")
    password = secrets.token_urlsafe(32)
    worker_password = secrets.token_urlsafe(32)
    with SessionLocal() as db:
        provision_admin(
            db,
            UserCreate(
                username="http.test.admin",
                display_name="HTTP Test Administrator",
                email="http.admin@example.com",
                password=password,
            ),
        )
    # The orchestrator captures stdout in memory and passes this only over stdin
    # to the verifier. Credentials never become command-line arguments or logs.
    print(
        json.dumps(
            {
                "username": "http.test.admin",
                "email": "http.admin@example.com",
                "password": password,
                "workerPassword": worker_password,
            }
        )
    )


if __name__ == "__main__":
    main()
