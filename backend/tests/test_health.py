from unittest.mock import MagicMock

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.exc import OperationalError

from app.db.session import get_session
from app.main import app


@pytest.fixture
def client():
    with TestClient(app, raise_server_exceptions=False) as client:
        yield client
    app.dependency_overrides.clear()


def test_health(client):
    response = client.get("/api/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok", "service": "AMBS ERP API"}


@pytest.mark.integration
def test_database_health(client):
    response = client.get("/api/health/db")
    assert response.status_code == 200
    assert response.json()["service"] == "PostgreSQL"


def test_database_failure_is_safe(client):
    session = MagicMock()
    session.execute.side_effect = OperationalError(
        "SELECT 1", {}, Exception("secret-password")
    )
    app.dependency_overrides[get_session] = lambda: session
    response = client.get("/api/health/db")
    assert response.status_code == 503
    assert response.json() == {
        "error": {"code": "HTTP_503", "message": "Database temporarily unavailable"}
    }
    assert "secret-password" not in response.text


def test_unexpected_error_is_safe(client):
    session = MagicMock()
    session.execute.side_effect = RuntimeError("secret-password")
    app.dependency_overrides[get_session] = lambda: session
    response = client.get("/api/health/db")
    assert response.status_code == 500
    assert response.json()["error"]["code"] == "INTERNAL_ERROR"
    assert "secret-password" not in response.text


def test_not_found(client):
    assert client.get("/missing").json()["error"]["code"] == "HTTP_404"


def test_openapi(client):
    assert "/api/health/db" in client.get("/openapi.json").json()["paths"]
