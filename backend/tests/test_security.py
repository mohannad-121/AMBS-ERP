import secrets
import uuid
from concurrent.futures import ThreadPoolExecutor
from datetime import timedelta
from pathlib import Path
from unittest.mock import patch

import pytest
from alembic.config import Config
from fastapi.testclient import TestClient
from pydantic import ValidationError
from sqlalchemy import create_engine, func, inspect, select, text
from sqlalchemy.orm import sessionmaker

from alembic import command
from app.cli import provision_admin
from app.core.config import Settings, get_settings
from app.core.security import (
    SecurityError,
    password_hasher,
    utcnow,
    verifier,
    verify_password,
)
from app.db.session import get_session
from app.main import app
from app.models.security import (
    AuditEvent,
    AuthSession,
    LoginRateBucket,
    Permission,
    Role,
    User,
)
from app.schemas.security import UserCreate
from app.services.users import create_user

ORIGIN = "http://127.0.0.1:3000"
pytestmark = pytest.mark.integration


@pytest.fixture
def security_db():
    # Each test receives a newly created, uniquely named database. Existing
    # development databases and security records are never truncated or reset.
    name = "ambs_test_" + uuid.uuid4().hex
    settings = get_settings()
    admin = create_engine(
        settings.database_url.set(database="postgres"), isolation_level="AUTOCOMMIT"
    )
    with admin.connect() as connection:
        connection.execute(text(f'CREATE DATABASE "{name}"'))
    engine = create_engine(
        settings.database_url.set(database=name), pool_size=5, max_overflow=5
    )
    try:
        config = Config(str(Path(__file__).resolve().parents[1] / "alembic.ini"))
        config.set_main_option(
            "script_location", str(Path(__file__).resolve().parents[1] / "alembic")
        )
        with engine.begin() as connection:
            config.attributes["connection"] = connection
            command.upgrade(config, "head")
        maker = sessionmaker(bind=engine, expire_on_commit=False)

        def override():
            with maker() as db:
                yield db

        app.dependency_overrides[get_session] = override
        yield maker, config
    finally:
        app.dependency_overrides.clear()
        engine.dispose()
        # Only the database created above is removed, using its generated name.
        with admin.connect() as connection:
            connection.execute(text(f'DROP DATABASE "{name}" WITH (FORCE)'))
        admin.dispose()


@pytest.fixture
def accounts(security_db):
    maker, _ = security_db
    password = secrets.token_urlsafe(24)
    with maker() as db:
        admin = provision_admin(
            db,
            UserCreate(
                username="test.admin",
                email="admin@example.com",
                display_name="Test Administrator",
                password=password,
            ),
        )
        operator = create_user(
            db,
            UserCreate(
                username="test.operations",
                email="operations@example.com",
                display_name="Test Operations",
                password=password,
                roles=["OPERATIONS", "SALES"],
            ),
            admin,
        )
        db.commit()
        return {"admin": admin.id, "operator": operator.id, "password": password}


@pytest.fixture
def browser(security_db):
    with TestClient(
        app, base_url=ORIGIN, headers={"Origin": ORIGIN}, raise_server_exceptions=False
    ) as client:
        yield client


def csrf(client):
    response = client.get("/api/auth/csrf")
    assert response.status_code == 200, response.text
    return {"X-CSRF-Token": response.json()["csrf_token"]}


def login(client, accounts, identifier="test.admin"):
    return client.post(
        "/api/auth/login",
        json={"identifier": identifier, "password": accounts["password"]},
        headers=csrf(client),
    )


def test_argon2id_passwords():
    password = secrets.token_urlsafe(24)
    encoded = password_hasher.hash(password)
    assert encoded.startswith("$argon2id$")
    assert verify_password(encoded, password)
    assert not verify_password(encoded, secrets.token_urlsafe(24))
    assert not verify_password("invalid hash", password)
    assert encoded != password


def test_interactive_admin_verification_by_username_and_email(security_db, accounts):
    from pydantic import SecretStr

    from app.cli import verify_admin_password

    maker, _ = security_db
    with maker() as db:
        verify_admin_password(db, " TEST.ADMIN ", SecretStr(accounts["password"]))
        verify_admin_password(
            db, " ADMIN@EXAMPLE.COM ", SecretStr(accounts["password"])
        )
        assert db.scalar(select(func.count()).select_from(AuthSession)) == 0
        assert (
            db.scalar(
                select(func.count())
                .select_from(AuditEvent)
                .where(AuditEvent.action == "admin.password_verified")
            )
            == 2
        )
        with pytest.raises(SecurityError) as error:
            verify_admin_password(
                db, "test.admin", SecretStr(secrets.token_urlsafe(24))
            )
        assert error.value.status == 401


def test_interactive_verification_preserves_rate_limit(security_db, accounts):
    from pydantic import SecretStr

    from app.cli import verify_admin_password

    maker, _ = security_db
    with maker() as db:
        db.add(
            LoginRateBucket(
                key="identity:" + verifier("test.admin"),
                attempts=get_settings().login_identity_limit,
                expires_at=utcnow() + timedelta(minutes=1),
            )
        )
        db.commit()
        with pytest.raises(SecurityError) as error:
            verify_admin_password(db, "test.admin", SecretStr(accounts["password"]))
        assert error.value.status == 429


def test_explicit_admin_reset_preserves_account_and_revokes_sessions(
    browser, accounts, security_db
):
    from app.cli import reset_admin_password
    from app.schemas.security import PasswordReset

    assert login(browser, accounts).status_code == 200
    maker, _ = security_db
    password = secrets.token_urlsafe(24)
    with maker() as db:
        reset_admin_password(
            db, " ADMIN@EXAMPLE.COM ", PasswordReset(password=password)
        )
        user = db.get(User, accounts["admin"])
        assert user.is_active and {role.code for role in user.roles} == {"SUPER_ADMIN"}
        assert db.scalar(select(func.count()).select_from(User)) == 2
        assert (
            db.scalar(
                select(func.count())
                .select_from(AuditEvent)
                .where(AuditEvent.action == "admin.password_reset")
            )
            == 1
        )
    assert browser.get("/api/auth/me").status_code == 401
    assert login(browser, accounts).status_code == 401
    assert (
        browser.post(
            "/api/auth/login",
            json={"identifier": "test.admin", "password": password},
            headers=csrf(browser),
        ).status_code
        == 200
    )


def test_admin_recovery_cannot_reset_other_roles(security_db, accounts):
    from app.cli import reset_admin_password
    from app.schemas.security import PasswordReset

    maker, _ = security_db
    with maker() as db, pytest.raises(SecurityError) as error:
        reset_admin_password(
            db, "test.operations", PasswordReset(password=secrets.token_urlsafe(24))
        )
    assert error.value.code == "ADMIN_NOT_FOUND"


def test_cli_requires_hidden_interactive_entry():
    from app.cli import main

    with (
        patch("sys.argv", ["cli", "provision-admin"]),
        patch("sys.stdin.isatty", return_value=False),
    ):
        assert main() == 1


def test_https_cookie_attributes():
    from unittest.mock import MagicMock

    from fastapi import Response

    from app.core.security import issue_session

    settings = Settings(
        postgres_db="test",
        postgres_user="test",
        postgres_password=secrets.token_urlsafe(24),
        app_env="production",
        auth_allowed_origins=["https://erp.example.com"],
        auth_cookie_secure=True,
        auth_bff_secret=secrets.token_urlsafe(32),
    )
    response = Response()
    with patch("app.core.security.get_settings", return_value=settings):
        issue_session(MagicMock(), response)
    cookies = response.headers.getlist("set-cookie")
    assert all(
        "Secure" in cookie and "Path=/" in cookie and "Domain=" not in cookie
        for cookie in cookies
    )
    assert any(
        cookie.startswith("__Host-ambs_session=") and "HttpOnly" in cookie
        for cookie in cookies
    )
    assert any(
        cookie.startswith("__Host-ambs_csrf=") and "HttpOnly" not in cookie
        for cookie in cookies
    )


def test_duplicate_update_rolls_back_roles_and_revocation(browser, accounts):
    login(browser, accounts)
    with TestClient(app, base_url=ORIGIN, headers={"Origin": ORIGIN}) as operator:
        login(operator, accounts, "test.operations")
        result = browser.patch(
            f"/api/users/{accounts['operator']}",
            json={"email": "admin@example.com", "roles": ["PACKING"]},
            headers=csrf(browser),
        )
        assert result.status_code == 409
        unchanged = operator.get("/api/auth/me")
        assert unchanged.status_code == 200
        assert set(unchanged.json()["roles"]) == {"OPERATIONS", "SALES"}


def test_csrf_tokens_are_bound_to_session(browser, accounts):
    token = csrf(browser)
    with TestClient(app, base_url=ORIGIN, headers={"Origin": ORIGIN}) as other:
        csrf(other)
        response = other.post(
            "/api/auth/login",
            json={"identifier": "test.admin", "password": accounts["password"]},
            headers=token,
        )
        assert response.status_code == 403


def test_rate_window_expires(browser, accounts, security_db):
    maker, _ = security_db
    with maker() as db:
        db.add(
            LoginRateBucket(
                key="identity:" + verifier("test.admin"),
                attempts=1000,
                expires_at=utcnow() - timedelta(seconds=1),
            )
        )
        db.commit()
    assert login(browser, accounts).status_code == 200


def test_relogin_rotates_and_revokes_previous_session(browser, accounts):
    login(browser, accounts)
    previous = browser.cookies.get("ambs_session")
    assert login(browser, accounts).status_code == 200
    assert browser.cookies.get("ambs_session") != previous
    assert (
        browser.get(
            "/api/auth/me", headers={"Cookie": f"ambs_session={previous}"}
        ).status_code
        == 401
    )


def test_migrations_catalog_and_drift(security_db):
    maker, config = security_db
    with maker() as db:
        tables = set(inspect(db.bind).get_table_names())
        assert {
            "users",
            "roles",
            "permissions",
            "user_roles",
            "role_permissions",
            "sessions",
            "audit_events",
            "login_rate_buckets",
        } <= tables
        assert (
            db.scalar(text("SELECT version_num FROM alembic_version"))
            == "0011_customer_import"
        )
        assert db.scalar(select(func.count()).select_from(Role)) == 7
        assert db.scalar(select(func.count()).select_from(User)) == 0
        for role in db.scalars(select(Role).where(Role.code != "SUPER_ADMIN")):
            permissions = {p.code for p in role.permissions}
            assert "system.read" in permissions
            assert not permissions.intersection({"users.read", "users.create", "users.update", "users.roles", "users.reset_password", "audit.read"})
    with maker().bind.begin() as connection:
        config.attributes["connection"] = connection
        command.upgrade(config, "head")
        command.check(config)


def test_provisioning_refuses_existing_admin(security_db, accounts):
    maker, _ = security_db
    with maker() as db, pytest.raises(SecurityError) as exc:
        provision_admin(
            db,
            UserCreate(
                username="another.admin",
                display_name="Another",
                password=secrets.token_urlsafe(24),
            ),
        )
    assert exc.value.code == "ADMIN_EXISTS"


def test_valid_login_and_private_cookie_verifiers(browser, accounts, security_db):
    pre_auth = csrf(browser)
    previous = browser.cookies.get("ambs_session")
    response = browser.post(
        "/api/auth/login",
        json={"identifier": " ADMIN@EXAMPLE.COM ", "password": accounts["password"]},
        headers=pre_auth,
    )
    assert response.status_code == 200
    assert response.json()["username"] == "test.admin"
    assert "password_hash" not in response.text and "token_hash" not in response.text
    assert browser.cookies.get("ambs_session") != previous
    cookies = response.headers.get_list("set-cookie")
    assert any("HttpOnly" in cookie and "SameSite=lax" in cookie for cookie in cookies)
    assert not any("Domain=" in cookie for cookie in cookies)
    assert browser.get("/api/auth/me").status_code == 200
    maker, _ = security_db
    with maker() as db:
        record = db.scalar(
            select(AuthSession).where(AuthSession.user_id == accounts["admin"])
        )
        assert record.token_hash == verifier(browser.cookies.get("ambs_session"))
        assert record.token_hash != browser.cookies.get("ambs_session")


def test_generic_invalid_login_and_audit(browser, accounts, security_db):
    wrong = secrets.token_urlsafe(24)
    results = []
    for identifier in ["test.admin", "missing.account"]:
        response = browser.post(
            "/api/auth/login",
            json={"identifier": identifier, "password": wrong},
            headers=csrf(browser),
        )
        results.append(response.json())
        assert response.status_code == 401
    assert results[0] == results[1]
    maker, _ = security_db
    with maker() as db:
        events = db.scalars(
            select(AuditEvent).where(AuditEvent.action == "auth.login_failed")
        ).all()
        assert len(events) == 2
        assert all(wrong not in str(event.details) for event in events)


def test_login_rate_limit_persists_across_clients(browser, accounts, security_db):
    wrong = secrets.token_urlsafe(24)
    for _ in range(get_settings().login_identity_limit):
        assert (
            browser.post(
                "/api/auth/login",
                json={"identifier": "test.admin", "password": wrong},
                headers=csrf(browser),
            ).status_code
            == 401
        )
    with TestClient(app, base_url=ORIGIN, headers={"Origin": ORIGIN}) as other:
        response = other.post(
            "/api/auth/login",
            json={"identifier": "TEST.ADMIN", "password": accounts["password"]},
            headers=csrf(other),
        )
    assert response.status_code == 429
    assert int(response.headers["retry-after"]) > 0
    maker, _ = security_db
    with maker() as db:
        assert (
            db.scalar(
                select(LoginRateBucket).where(
                    LoginRateBucket.key == "identity:" + verifier("test.admin")
                )
            ).attempts
            == get_settings().login_identity_limit + 1
        )


@pytest.mark.parametrize("change", ["idle", "absolute", "revoked", "disabled"])
def test_session_expiry_revocation_and_disabled_user(
    browser, accounts, security_db, change
):
    assert login(browser, accounts).status_code == 200
    maker, _ = security_db
    with maker() as db:
        record = db.scalar(
            select(AuthSession).where(
                AuthSession.token_hash == verifier(browser.cookies.get("ambs_session"))
            )
        )
        if change == "idle":
            record.last_seen_at = utcnow() - timedelta(
                seconds=get_settings().session_idle_seconds + 1
            )
        if change == "absolute":
            record.expires_at = utcnow() - timedelta(seconds=1)
        if change == "revoked":
            record.revoked_at = utcnow()
        if change == "disabled":
            db.get(User, accounts["admin"]).is_active = False
        db.commit()
    assert browser.get("/api/auth/me").status_code == 401


def test_logout_revokes_session(browser, accounts):
    login(browser, accounts)
    token = browser.cookies.get("ambs_session")
    assert (
        browser.post("/api/auth/logout", json={}, headers=csrf(browser)).status_code
        == 200
    )
    assert not browser.cookies.get("ambs_session")
    assert (
        browser.get(
            "/api/auth/me", headers={"Cookie": f"ambs_session={token}"}
        ).status_code
        == 401
    )


def test_anonymous_requests_and_no_registration(browser):
    for path in ["/api/auth/me", "/api/users", "/api/audit", "/api/system/status"]:
        assert browser.get(path).status_code == 401
    assert browser.post("/api/auth/register", json={}).status_code == 404


def test_operations_permission_denial_and_audit(browser, accounts, security_db):
    assert login(browser, accounts, "test.operations").status_code == 200
    assert browser.get("/api/system/status").status_code == 200
    assert browser.get("/api/users").status_code == 403
    assert browser.get("/api/audit").status_code == 403
    maker, _ = security_db
    with maker() as db:
        assert (
            db.scalar(
                select(func.count())
                .select_from(AuditEvent)
                .where(
                    AuditEvent.action == "security.denied",
                    AuditEvent.actor_id == accounts["operator"],
                )
            )
            == 2
        )


def test_multi_role_union(browser, accounts, security_db):
    maker, _ = security_db
    with maker() as db:
        sales = db.scalar(select(Role).where(Role.code == "SALES"))
        sales.permissions.append(
            db.scalar(select(Permission).where(Permission.code == "users.read"))
        )
        db.commit()
    response = login(browser, accounts, "test.operations")
    assert set(response.json()["roles"]) == {"OPERATIONS", "SALES"}
    assert {"system.read", "users.read", "customers.create", "items.read"} <= set(response.json()["permissions"])
    assert "users.roles" not in response.json()["permissions"]
    assert browser.get("/api/users").status_code == 200
    assert browser.get("/api/audit").status_code == 403


def test_privilege_escalation_is_denied(browser, accounts):
    login(browser, accounts, "test.operations")
    headers = csrf(browser)
    assert (
        browser.put(
            f"/api/users/{accounts['operator']}/roles",
            json={"roles": ["SUPER_ADMIN"]},
            headers=headers,
        ).status_code
        == 403
    )
    assert (
        browser.patch(
            f"/api/users/{accounts['operator']}",
            json={"roles": ["SUPER_ADMIN"]},
            headers=headers,
        ).status_code
        == 403
    )
    assert (
        browser.post(
            "/api/users",
            json={
                "username": "hacker",
                "display_name": "Test",
                "password": secrets.token_urlsafe(24),
                "roles": ["SUPER_ADMIN"],
            },
            headers=headers,
        ).status_code
        == 403
    )


def test_delegated_permissions_cannot_manage_superadmin(browser, accounts, security_db):
    maker, _ = security_db
    with maker() as db:
        role = db.scalar(select(Role).where(Role.code == "OPERATIONS"))
        role.permissions.extend(
            db.scalars(
                select(Permission).where(
                    Permission.code.in_(
                        [
                            "users.update",
                            "users.roles",
                            "users.create",
                            "users.reset_password",
                        ]
                    )
                )
            )
        )
        db.commit()
    login(browser, accounts, "test.operations")
    assert (
        browser.patch(
            f"/api/users/{accounts['admin']}",
            json={"display_name": "Changed"},
            headers=csrf(browser),
        ).status_code
        == 403
    )
    assert (
        browser.put(
            f"/api/users/{accounts['operator']}/roles",
            json={"roles": ["SUPER_ADMIN"]},
            headers=csrf(browser),
        ).status_code
        == 403
    )


def test_csrf_and_origin_enforcement(browser, accounts):
    headers = csrf(browser)
    payload = {"identifier": "test.admin", "password": accounts["password"]}
    assert browser.post("/api/auth/login", json=payload).status_code == 403
    assert (
        browser.post(
            "/api/auth/login",
            json=payload,
            headers={**headers, "Origin": "https://evil.example"},
        ).status_code
        == 403
    )
    assert (
        browser.post(
            "/api/auth/login", json=payload, headers={**headers, "Origin": "null"}
        ).status_code
        == 403
    )
    assert (
        browser.post(
            "/api/auth/login",
            json=payload,
            headers={**headers, "Sec-Fetch-Site": "cross-site"},
        ).status_code
        == 403
    )
    assert (
        browser.post("/api/auth/login", json=payload, headers=headers).status_code
        == 200
    )
    assert (
        browser.post("/api/auth/logout", json={}, headers=headers).status_code == 403
    )  # login rotated CSRF
    assert browser.post("/api/auth/logout", json={}).status_code == 403


def test_last_admin_activation_and_roles_protection(browser, accounts):
    login(browser, accounts)
    assert (
        browser.patch(
            f"/api/users/{accounts['admin']}/activation",
            json={"is_active": False},
            headers=csrf(browser),
        ).status_code
        == 409
    )
    assert (
        browser.put(
            f"/api/users/{accounts['admin']}/roles",
            json={"roles": ["OPERATIONS"]},
            headers=csrf(browser),
        ).status_code
        == 409
    )
    assert (
        browser.patch(
            f"/api/users/{accounts['admin']}",
            json={"display_name": "Should roll back", "roles": []},
            headers=csrf(browser),
        ).status_code
        == 409
    )
    assert browser.get("/api/auth/me").json()["display_name"] == "Test Administrator"


def test_concurrent_last_admin_guard(browser, accounts, security_db):
    maker, _ = security_db
    with maker() as db:
        second = create_user(
            db,
            UserCreate(
                username="second.admin",
                display_name="Second",
                password=accounts["password"],
                roles=["SUPER_ADMIN"],
            ),
        )
        db.commit()
        second_id = second.id
    login(browser, accounts)
    with TestClient(app, base_url=ORIGIN, headers={"Origin": ORIGIN}) as other:
        login(other, accounts, "second.admin")
        first_csrf, second_csrf = csrf(browser), csrf(other)
        with ThreadPoolExecutor(max_workers=2) as pool:
            first = pool.submit(
                browser.patch,
                f"/api/users/{accounts['admin']}/activation",
                json={"is_active": False},
                headers=first_csrf,
            )
            second_result = pool.submit(
                other.patch,
                f"/api/users/{second_id}/activation",
                json={"is_active": False},
                headers=second_csrf,
            )
            assert sorted(
                [first.result().status_code, second_result.result().status_code]
            ) == [200, 409]


def test_user_crud_normalization_pagination_and_safe_output(browser, accounts):
    login(browser, accounts)
    payload = {
        "username": " New.User ",
        "email": "NEW.USER@EXAMPLE.COM",
        "display_name": "New User",
        "password": secrets.token_urlsafe(24),
        "roles": ["PACKING", "SALES"],
    }
    response = browser.post("/api/users", json=payload, headers=csrf(browser))
    assert response.status_code == 201, response.text
    user = response.json()
    assert user["username"] == "new.user" and user["email"] == "new.user@example.com"
    assert set(user["roles"]) == {"PACKING", "SALES"}
    assert "password" not in user and "password_hash" not in user
    assert (
        browser.post("/api/users", json=payload, headers=csrf(browser)).status_code
        == 409
    )
    page = browser.get("/api/users?search=New.User&page_size=1").json()
    assert page["total"] == 1 and len(page["items"]) == 1
    assert browser.get(f"/api/users/{user['id']}").status_code == 200
    assert (
        browser.patch(
            f"/api/users/{user['id']}",
            json={"display_name": "Renamed", "email": None},
            headers=csrf(browser),
        ).json()["display_name"]
        == "Renamed"
    )
    assert (
        browser.patch(
            f"/api/users/{user['id']}",
            json={"password_hash": "forged"},
            headers=csrf(browser),
        ).status_code
        == 422
    )
    assert browser.get("/api/users?page_size=1000").status_code == 422


def test_role_changes_and_password_reset_revoke_sessions(browser, accounts):
    login(browser, accounts)
    with TestClient(app, base_url=ORIGIN, headers={"Origin": ORIGIN}) as operator:
        login(operator, accounts, "test.operations")
        response = browser.put(
            f"/api/users/{accounts['operator']}/roles",
            json={"roles": ["PACKING"]},
            headers=csrf(browser),
        )
        assert response.status_code == 200
        assert operator.get("/api/auth/me").status_code == 401
        assert login(operator, accounts, "test.operations").json()["roles"] == [
            "PACKING"
        ]
        new_password = secrets.token_urlsafe(24)
        assert (
            browser.post(
                f"/api/users/{accounts['operator']}/password",
                json={"password": new_password},
                headers=csrf(browser),
            ).status_code
            == 200
        )
        assert operator.get("/api/auth/me").status_code == 401
        assert login(operator, accounts, "test.operations").status_code == 401
        assert (
            operator.post(
                "/api/auth/login",
                json={"identifier": "test.operations", "password": new_password},
                headers=csrf(operator),
            ).status_code
            == 200
        )


def test_deactivation_revokes_and_blocks_login(browser, accounts):
    login(browser, accounts)
    with TestClient(app, base_url=ORIGIN, headers={"Origin": ORIGIN}) as operator:
        login(operator, accounts, "test.operations")
        assert (
            browser.patch(
                f"/api/users/{accounts['operator']}/activation",
                json={"is_active": False},
                headers=csrf(browser),
            ).status_code
            == 200
        )
        assert operator.get("/api/auth/me").status_code == 401
        assert login(operator, accounts, "test.operations").status_code == 401
        assert (
            browser.patch(
                f"/api/users/{accounts['operator']}/activation",
                json={"is_active": True},
                headers=csrf(browser),
            ).status_code
            == 200
        )
        assert login(operator, accounts, "test.operations").status_code == 200


def test_audit_filters_and_safe_metadata(browser, accounts):
    login(browser, accounts)
    response = browser.get(
        "/api/audit?action=auth.login_succeeded&actor=test.admin&page_size=1"
    )
    assert response.status_code == 200
    assert response.json()["total"] == 1
    assert response.json()["items"][0]["actor_id"] == str(accounts["admin"])
    assert accounts["password"] not in response.text
    assert browser.cookies.get("ambs_session") not in response.text
    assert browser.get("/api/audit?start_at=2099-01-01T00:00:00Z").json()["total"] == 0
    assert browser.get("/api/audit?start_at=2026-01-01").status_code == 422
    assert (
        browser.get(
            "/api/audit?start_at=2026-02-01T00:00:00Z&end_at=2026-01-01T00:00:00Z"
        ).status_code
        == 422
    )


def test_production_requires_https_and_secure_cookies():
    base = {
        "postgres_db": "test",
        "postgres_user": "test",
        "postgres_password": secrets.token_urlsafe(24),
        "app_env": "production",
    }
    with pytest.raises(ValidationError):
        Settings(**base)
    secure = Settings(
        **base,
        auth_allowed_origins=["https://erp.example.com"],
        auth_cookie_secure=True,
        auth_bff_secret=secrets.token_urlsafe(32),
    )
    assert secure.session_cookie_name == "__Host-ambs_session"
    assert secure.csrf_cookie_name == "__Host-ambs_csrf"
    from starlette.requests import Request

    from app.core.security import validate_transport

    with patch("app.core.security.get_settings", return_value=secure):
        with pytest.raises(SecurityError):
            validate_transport(Request({"type": "http", "headers": []}))
        request = Request(
            {
                "type": "http",
                "headers": [
                    (
                        b"x-ambs-bff-key",
                        secure.auth_bff_secret.get_secret_value().encode(),
                    ),
                    (b"x-ambs-external-proto", b"https"),
                ],
            }
        )
        validate_transport(request)

