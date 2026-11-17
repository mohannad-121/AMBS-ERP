"""Read summaries exercise PostgreSQL and the real permission catalog."""
from decimal import Decimal
import pytest
from sqlalchemy import select, func
from app.models.security import User, Role, AuditEvent
from app.models.inventory import StockBalance
from tests.test_security import security_db, accounts, browser, csrf, login  # noqa: F401
from tests.test_master import signed  # noqa: F401
from tests.test_inventory import stock  # noqa: F401
from tests.test_sales import receipt, order, prepare, dispatch

pytestmark = pytest.mark.integration


def summary(client):
    response = client.get("/api/dashboard")
    assert response.status_code == 200, response.text
    return response.json()


def test_empty_read_only_summary(signed, security_db):
    maker, _ = security_db
    with maker() as db:
        before = db.scalar(select(func.count()).select_from(AuditEvent))
    first, second = summary(signed), summary(signed)
    assert all(c["value"] == "0" for c in first["cards"])
    assert first["inventory"] == first["demand"] == []
    assert first["cards"] == second["cards"]
    assert all(not q["items"] for q in first["queues"])
    with maker() as db:
        assert db.scalar(select(func.count()).select_from(AuditEvent)) == before
        assert db.scalar(select(func.count()).select_from(StockBalance)) == 0


def test_actual_demand_stock_and_no_costs(signed, stock):
    receipt(signed, stock, "20")
    receipt(signed, stock, "3", kind="RETURN", destination=stock["quarantine"]["id"])
    order(signed, stock, "15")
    data = summary(signed)
    cards = {c["key"]: c["value"] for c in data["cards"]}
    assert cards["orders"] == cards["customers"] == "1"
    assert Decimal(data["demand"][0]["quantity"]) == 15
    row = data["inventory"][0]
    assert row["unit"] == "PCS" and row["precision"] == 0
    assert Decimal(row["on_hand"]) == 23
    assert Decimal(row["available"]) == 20
    assert Decimal(row["nonusable"]) == 3
    assert Decimal(row["reserved"]) == Decimal(row["external"]) == 0
    assert not any(k in str(data) for k in ["stock_value", "unit_cost", "password"])


@pytest.mark.parametrize("role", ["OPERATIONS", "SALES", "ACCOUNTS", "PACKING", "MANAGEMENT", "DRIVER"])
def test_role_sections_and_navigation_policy(browser, accounts, security_db, role):
    maker, _ = security_db
    with maker() as db:
        user = db.get(User, accounts["operator"])
        user.roles = [db.scalar(select(Role).where(Role.code == role))]
        db.commit()
    assert login(browser, accounts, "test.operations").status_code == 200
    me = browser.get("/api/auth/me").json()
    data = summary(browser)
    assert "activity" not in data
    assert ("inventory" in data) == ("inventory.read" in me["permissions"])
    assert ("demand" in data) == ("sales.orders.read" in me["permissions"])
    if role == "DRIVER":
        assert len(data["cards"]) == 1
        assert data["cards"][0]["label"] == "My pending deliveries"
        assert data["queues"][0]["items"] == []


def test_anonymous_and_no_grants(browser, accounts, security_db):
    assert browser.get("/api/dashboard").status_code == 401
    maker, _ = security_db
    with maker() as db:
        db.get(User, accounts["operator"]).roles = []
        db.commit()
    assert login(browser, accounts, "test.operations").status_code == 200
    assert browser.get("/api/dashboard").status_code == 403


def test_partial_dispatch_demand_and_reservations(signed, stock):
    receipt(signed, stock, "8")
    row = order(signed, stock, "15")
    delivery = prepare(signed, stock, row)
    before = summary(signed)
    assert Decimal(before["inventory"][0]["reserved"]) == 8
    assert Decimal(before["inventory"][0]["available"]) == 0
    dispatch(signed, delivery)
    after = summary(signed)
    assert Decimal(after["demand"][0]["quantity"]) == 7
    assert Decimal(after["inventory"][0]["on_hand"]) == 0


def test_driver_summary_scopes_real_assigned_deliveries(signed, stock, accounts, security_db):
    receipt(signed, stock, "40")
    first = prepare(signed, stock, order(signed, stock))
    prepare(signed, stock, order(signed, stock))
    maker, _ = security_db
    with maker() as db:
        user = db.get(User, accounts["operator"])
        user.roles = [db.scalar(select(Role).where(Role.code == "DRIVER"))]
        db.commit()
    from tests.test_sales import op
    response = signed.post(f"/api/routing/deliveries/{first['id']}/assign", json=op(driver_id=str(accounts["operator"])), headers=csrf(signed))
    assert response.status_code == 200, response.text
    assert login(signed, accounts, "test.operations").status_code == 200
    data = summary(signed)
    assert data["cards"][0]["value"] == "1"
    assert [r["id"] for r in data["queues"][0]["items"]] == [first["id"]]
    assert not {"inventory", "demand", "activity"} & data.keys()
