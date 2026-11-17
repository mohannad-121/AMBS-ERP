"""All mutations use real PostgreSQL transactions in uniquely named test DBs."""

import uuid
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, UTC
from decimal import Decimal
from threading import Barrier

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import select, text
from sqlalchemy.exc import IntegrityError
from app.main import app
from app.models.inventory import StockBalance
from app.models.security import AuditEvent, Role, User
from tests.test_security import security_db, accounts, browser, login, csrf, ORIGIN  # noqa: F401
from tests.test_master import signed, post as master_post  # noqa: F401

pytestmark = pytest.mark.integration


def key():
    return str(uuid.uuid4())


def call(client, method, path, body=None, expected=200):
    response = (
        getattr(client, method)(
            f"/api/inventory/{path}", json=body, headers=csrf(client)
        )
        if method != "get"
        else client.get(f"/api/inventory/{path}")
    )
    assert response.status_code == expected, response.text
    return response.json()


@pytest.fixture
def stock(signed):
    category = master_post(
        signed, "categories", {"name": "Synthetic inventory category"}
    )
    unit = master_post(signed, "units", {"name": "PCS", "decimal_places": 0})
    item = master_post(
        signed,
        "items",
        {
            "name": "Synthetic component",
            "item_type": "component",
            "category_id": category["id"],
            "unit_id": unit["id"],
        },
    )
    wh = call(
        signed,
        "post",
        "warehouses",
        {"name": "Synthetic yard", "is_default": True},
        201,
    )
    locations = {}
    for name, kind in [
        ("storage", "USABLE"),
        ("packing", "USABLE"),
        ("quarantine", "QUARANTINE"),
        ("damaged", "DAMAGED"),
        ("rejected", "REJECTED"),
    ]:
        locations[name] = call(
            signed,
            "post",
            "locations",
            {"name": f"Synthetic {name}", "warehouse_id": wh["id"], "kind": kind},
            201,
        )
    return {
        "item": item,
        "unit": unit,
        "category": category,
        "warehouse": wh,
        **locations,
    }


def draft(
    client,
    stock,
    quantity="50",
    kind="RECEIPT",
    source=None,
    destination=None,
    lot=None,
    cost="2",
    currency="AED",
    request_key=None,
):
    line = {
        "item_id": stock["item"]["id"],
        "unit_id": stock["unit"]["id"],
        "quantity": quantity,
        "source_id": source,
        "destination_id": destination
        or (
            stock["storage"]["id"]
            if kind in {"RECEIPT", "RETURN", "ADJUSTMENT_IN"}
            else None
        ),
        "lot_id": lot,
    }
    if kind in {"RECEIPT", "RETURN", "ADJUSTMENT_IN"}:
        line.update(unit_cost=cost, currency=currency if cost is not None else None)
    body = {
        "request_key": request_key or key(),
        "kind": kind,
        "reason": "Synthetic authorized stock operation",
        "occurred_at": datetime.now(UTC).isoformat(),
        "lines": [line],
    }
    return call(client, "post", "movements", body, 201), body


def post_movement(client, movement, request_key=None, expected=200):
    return call(
        client,
        "post",
        f"movements/{movement['id']}/post",
        {"request_key": request_key or key()},
        expected,
    )


def balance(client, stock, location=None, view="all"):
    path = f"balances?item_id={stock['item']['id']}&view={view}"
    if location:
        path += f"&location_id={location}"
    rows = call(client, "get", path)["items"]
    return rows[0] if rows else None


def reserve(client, stock, amount, request_key=None, expected=201, lot=None):
    return call(
        client,
        "post",
        "reservations",
        {
            "request_key": request_key or key(),
            "item_id": stock["item"]["id"],
            "location_id": stock["storage"]["id"],
            "quantity": amount,
            "lot_id": lot,
            "reason": "Synthetic operational internal hold",
        },
        expected,
    )


def test_receipts_reservations_zero_availability_and_retries(signed, stock):
    movement, body = draft(signed, stock)
    assert Decimal(balance(signed, stock)["on_hand"]) == 0
    duplicate = call(signed, "post", "movements", body, 201)
    assert duplicate["id"] == movement["id"]
    operation_key = key()
    post_movement(signed, movement, operation_key)
    post_movement(signed, movement, operation_key)
    post_movement(signed, movement, expected=409)
    row = balance(signed, stock)
    assert [Decimal(row[k]) for k in ["on_hand", "reserved", "available"]] == [
        50,
        0,
        50,
    ]
    hold_key = key()
    hold = reserve(signed, stock, "20", hold_key)
    assert reserve(signed, stock, "20", hold_key)["id"] == hold["id"]
    reserve(signed, stock, "35", expected=409)
    assert Decimal(balance(signed, stock)["available"]) == 30
    second = reserve(signed, stock, "30")
    assert balance(signed, stock)["status"] == "Out of Stock"
    assert balance(signed, stock, view="available") is None
    release_key = key()
    for _ in range(2):
        call(
            signed,
            "post",
            f"reservations/{hold['id']}/release",
            {"request_key": release_key},
        )
    assert Decimal(balance(signed, stock)["available"]) == 20
    call(signed, "post", f"reservations/{second['id']}/cancel", {"request_key": key()})
    assert Decimal(balance(signed, stock)["available"]) == 50
    assert call(signed, "get", "reconciliation")["healthy"]


def test_issues_transfer_and_reservation_consumption(signed, stock):
    movement, _ = draft(signed, stock)
    post_movement(signed, movement)
    hold = reserve(signed, stock, "20")
    movement, _ = draft(
        signed,
        stock,
        "10",
        "TRANSFER",
        stock["storage"]["id"],
        stock["packing"]["id"],
        cost=None,
    )
    post_movement(signed, movement)
    assert Decimal(balance(signed, stock)["on_hand"]) == 50
    assert Decimal(balance(signed, stock, stock["storage"]["id"])["on_hand"]) == 40
    assert Decimal(balance(signed, stock, stock["packing"]["id"])["on_hand"]) == 10
    consume_key = key()
    consumed = call(
        signed,
        "post",
        f"reservations/{hold['id']}/consume",
        {"request_key": consume_key},
    )
    assert consumed["status"] == "CONSUMED" and consumed["consumed_movement_id"]
    call(
        signed,
        "post",
        f"reservations/{hold['id']}/consume",
        {"request_key": consume_key},
    )
    call(
        signed,
        "post",
        f"reservations/{hold['id']}/consume",
        {"request_key": key()},
        409,
    )
    assert Decimal(balance(signed, stock)["on_hand"]) == 30
    oversized, _ = draft(
        signed, stock, "21", "ISSUE", stock["storage"]["id"], cost=None
    )
    post_movement(signed, oversized, expected=409)
    assert Decimal(balance(signed, stock)["on_hand"]) == 30
    assert call(signed, "get", "reconciliation")["healthy"]


def test_multiline_rollback_and_reversal_safety(signed, stock, security_db):
    movement, _ = draft(signed, stock, "50")
    post_movement(signed, movement)
    hold = reserve(signed, stock, "1")
    call(
        signed,
        "post",
        f"movements/{movement['id']}/reverse",
        {"request_key": key(), "reason": "Synthetic reversal while reserved"},
        409,
    )
    call(signed, "post", f"reservations/{hold['id']}/release", {"request_key": key()})
    issue, body = draft(signed, stock, "20", "ISSUE", stock["storage"]["id"], cost=None)
    body["request_key"] = key()
    body["lines"].append({**body["lines"][0], "quantity": "40"})
    bad = call(signed, "post", "movements", body, 201)
    post_movement(signed, bad, expected=409)
    assert Decimal(balance(signed, stock)["on_hand"]) == 50
    post_movement(signed, issue)
    call(
        signed,
        "post",
        f"movements/{movement['id']}/reverse",
        {"request_key": key(), "reason": "Synthetic reversal after consumption"},
        409,
    )
    reverse_key = key()
    reversal = call(
        signed,
        "post",
        f"movements/{issue['id']}/reverse",
        {"request_key": reverse_key, "reason": "Correction of an erroneous issue"},
    )
    assert reversal["reverses_id"] == issue["id"]
    assert (
        call(
            signed,
            "post",
            f"movements/{issue['id']}/reverse",
            {"request_key": reverse_key},
        )["id"]
        == reversal["id"]
    )
    assert Decimal(balance(signed, stock)["on_hand"]) == 50
    maker, _ = security_db
    with maker() as db:
        with pytest.raises(IntegrityError):
            db.execute(
                text("UPDATE stock_movements SET reason='tamper' WHERE id=:id"),
                {"id": movement["id"]},
            )
            db.commit()
        db.rollback()
        with pytest.raises(IntegrityError):
            db.execute(text("DELETE FROM stock_ledger_effects"))
            db.commit()
    assert call(signed, "get", "reconciliation")["healthy"]


@pytest.mark.parametrize("actual,expected", [("47", 47), ("53", 53), ("50", 50)])
def test_count_variances_and_duplicate_post(signed, stock, actual, expected):
    movement, _ = draft(signed, stock)
    post_movement(signed, movement)
    count = call(
        signed,
        "post",
        "counts",
        {
            "request_key": key(),
            "location_id": stock["storage"]["id"],
            "reason": "Synthetic controlled physical count",
            "lines": [{"item_id": stock["item"]["id"]}],
        },
        201,
    )
    assert Decimal(count["lines"][0]["expected_quantity"]) == 50
    recorded = call(
        signed,
        "post",
        f"counts/{count['id']}/record",
        {
            "lines": [
                {
                    "line_id": count["lines"][0]["id"],
                    "counted_quantity": actual,
                    "reason": "Physical quantity verified by counting",
                }
            ]
        },
    )
    assert Decimal(recorded["lines"][0]["variance"]) == Decimal(actual) - 50
    post_key = key()
    result = call(
        signed, "post", f"counts/{count['id']}/post", {"request_key": post_key}
    )
    assert result["status"] == "POSTED"
    call(signed, "post", f"counts/{count['id']}/post", {"request_key": post_key})
    call(signed, "post", f"counts/{count['id']}/post", {"request_key": key()}, 409)
    assert Decimal(balance(signed, stock)["on_hand"]) == expected
    assert call(signed, "get", "reconciliation")["healthy"]


def test_count_snapshot_changes_require_recount(signed, stock):
    movement, _ = draft(signed, stock)
    post_movement(signed, movement)
    count = call(
        signed,
        "post",
        "counts",
        {
            "request_key": key(),
            "location_id": stock["storage"]["id"],
            "reason": "Synthetic count snapshot check",
            "lines": [{"item_id": stock["item"]["id"]}],
        },
        201,
    )
    entry = {
        "line_id": count["lines"][0]["id"],
        "counted_quantity": "47",
        "reason": "Physical measurement for test",
    }
    call(signed, "post", f"counts/{count['id']}/record", {"lines": [entry]})
    movement, _ = draft(signed, stock, "1")
    post_movement(signed, movement)
    response = call(
        signed, "post", f"counts/{count['id']}/post", {"request_key": key()}, 409
    )
    assert response["error"]["code"] == "COUNT_STALE"
    fresh = call(
        signed, "post", f"counts/{count['id']}/recount", {"request_key": key()}
    )
    assert (
        fresh["lines"][0]["counted_quantity"] is None
        and Decimal(fresh["lines"][0]["expected_quantity"]) == 51
    )
    call(
        signed,
        "post",
        f"counts/{count['id']}/record",
        {"lines": [{**entry, "counted_quantity": "51"}]},
    )
    call(signed, "post", f"counts/{count['id']}/post", {"request_key": key()})


def test_lot_serial_traceability_and_quality(signed, stock):
    call(signed, "put", f"policies/{stock['item']['id']}", {"tracking_mode": "SERIAL"})
    lot = call(
        signed,
        "post",
        "lots",
        {
            "name": "Synthetic serial",
            "item_id": stock["item"]["id"],
            "identifier": "SERIAL-TEST-001",
        },
        201,
    )
    call(
        signed,
        "post",
        "lots",
        {
            "name": "Duplicate serial",
            "item_id": stock["item"]["id"],
            "identifier": "serial-test-001",
        },
        409,
    )
    movement, _ = draft(signed, stock, "1", lot=lot["id"])
    post_movement(signed, movement)
    duplicate, _ = draft(signed, stock, "1", lot=lot["id"])
    post_movement(signed, duplicate, expected=409)
    bad, body = draft(signed, stock, "1", lot=lot["id"])
    body["request_key"] = key()
    body["lines"][0]["quantity"] = "2"
    call(signed, "post", "movements", body, 422)
    damage, _ = draft(
        signed,
        stock,
        "1",
        "DAMAGE",
        stock["storage"]["id"],
        stock["damaged"]["id"],
        lot["id"],
        cost=None,
    )
    post_movement(signed, damage)
    assert (
        Decimal(balance(signed, stock)["on_hand"]) == 1
        and Decimal(balance(signed, stock)["available"]) == 0
    )
    release, _ = draft(
        signed,
        stock,
        "1",
        "INSPECTION_RELEASE",
        stock["damaged"]["id"],
        stock["storage"]["id"],
        lot["id"],
        cost=None,
    )
    post_movement(signed, release)
    assert Decimal(balance(signed, stock)["available"]) == 1
    hold = reserve(signed, stock, "1", lot=lot["id"])
    call(
        signed,
        "put",
        f"lots/{lot['id']}/status",
        {"status": "BLOCKED", "reason": "Synthetic quarantine inspection"},
        409,
    )
    call(signed, "post", f"reservations/{hold['id']}/release", {"request_key": key()})
    call(
        signed,
        "put",
        f"lots/{lot['id']}/status",
        {"status": "BLOCKED", "reason": "Synthetic quarantine inspection"},
    )
    assert Decimal(balance(signed, stock)["available"]) == 0
    trace = call(signed, "get", f"lots/{lot['id']}/trace")
    assert len(trace["movements"]) >= 3 and len(trace["stock"][0]["buckets"]) >= 2


def test_weighted_average_missing_cost_and_currency(signed, stock):
    first, _ = draft(signed, stock, "10", cost="2")
    post_movement(signed, first)
    second, _ = draft(signed, stock, "10", cost="4")
    post_movement(signed, second)
    row = balance(signed, stock)["buckets"][0]
    assert Decimal(row["stock_value"]) == 60 and Decimal(row["average_cost"]) == 3
    issue, _ = draft(signed, stock, "5", "ISSUE", stock["storage"]["id"], cost=None)
    post_movement(signed, issue)
    assert Decimal(balance(signed, stock)["buckets"][0]["stock_value"]) == 45
    mixed, _ = draft(signed, stock, "1", cost="2", currency="USD")
    post_movement(signed, mixed)
    row = balance(signed, stock)["buckets"][0]
    assert row["stock_value"] is None and row["cost_complete"] is False
    dashboard = call(signed, "get", "overview")
    assert dashboard["valuation"] == [] and dashboard["incomplete_cost_buckets"] == 1
    # Phase 5 supplies real confirmed purchase quantities; an empty catalog has none.
    assert dashboard["incoming"] == [] and dashboard["incoming_supported"]


def test_warehouses_hierarchy_inactive_and_unit_precision(signed, stock, security_db):
    parent = stock["storage"]
    child = call(
        signed,
        "post",
        "locations",
        {
            "name": "Synthetic child",
            "warehouse_id": stock["warehouse"]["id"],
            "parent_id": parent["id"],
        },
        201,
    )
    call(
        signed,
        "put",
        f"locations/{parent['id']}",
        {
            "name": parent["name"],
            "warehouse_id": stock["warehouse"]["id"],
            "parent_id": child["id"],
        },
        422,
    )
    other = call(
        signed, "post", "warehouses", {"name": "Synthetic second warehouse"}, 201
    )
    call(
        signed,
        "post",
        "locations",
        {
            "name": "Wrong parent",
            "warehouse_id": other["id"],
            "parent_id": parent["id"],
        },
        422,
    )
    call(
        signed,
        "put",
        f"locations/{parent['id']}",
        {
            "name": parent["name"],
            "warehouse_id": stock["warehouse"]["id"],
            "is_active": False,
        },
    )
    line = {
        "item_id": stock["item"]["id"],
        "unit_id": stock["unit"]["id"],
        "quantity": "1",
        "destination_id": parent["id"],
    }
    call(
        signed,
        "post",
        "movements",
        {
            "request_key": key(),
            "kind": "RECEIPT",
            "reason": "Inactive location test receipt",
            "occurred_at": datetime.now(UTC).isoformat(),
            "lines": [line],
        },
        422,
    )
    call(
        signed,
        "put",
        f"locations/{parent['id']}",
        {"name": parent["name"], "warehouse_id": stock["warehouse"]["id"]},
    )
    call(
        signed,
        "post",
        "movements",
        {
            "request_key": key(),
            "kind": "RECEIPT",
            "reason": "Fractional indivisible unit test",
            "occurred_at": datetime.now(UTC).isoformat(),
            "lines": [{**line, "quantity": "1.5"}],
        },
        422,
    )
    movement, _ = draft(signed, stock, "1")
    post_movement(signed, movement)
    call(
        signed,
        "put",
        f"locations/{parent['id']}",
        {
            "name": parent["name"],
            "warehouse_id": stock["warehouse"]["id"],
            "is_active": False,
        },
        409,
    )
    response = signed.put(
        f"/api/master/units/{stock['unit']['id']}",
        json={"name": "PCS", "decimal_places": 2},
        headers=csrf(signed),
    )
    assert response.status_code == 409
    maker, _ = security_db
    with maker() as db, pytest.raises(IntegrityError):
        db.execute(
            text("UPDATE storage_locations SET parent_id=:child WHERE id=:parent"),
            {"child": child["id"], "parent": parent["id"]},
        )
        db.commit()


def test_thresholds_shortage_and_zero_stock(signed, stock):
    movement, _ = draft(signed, stock, "8")
    post_movement(signed, movement)
    call(
        signed,
        "put",
        "thresholds",
        {
            "item_id": stock["item"]["id"],
            "warehouse_id": stock["warehouse"]["id"],
            "minimum": "10",
        },
    )
    row = call(
        signed, "get", f"balances?item_id={stock['item']['id']}&requested_quantity=15"
    )["items"][0]
    assert Decimal(row["shortage"]) == 7
    assert len(call(signed, "get", "balances?view=low")["items"]) == 1
    assert call(signed, "get", "overview")["low_stock_items"] == 1
    assert call(signed, "get", "records/thresholds")["items"][0]["low_stock"]
    reserve(signed, stock, "8")
    assert call(signed, "get", "balances?view=available")["total"] == 0
    assert call(signed, "get", "balances?view=out_of_stock")["total"] == 1


def test_two_simultaneous_api_reservations_cannot_oversubscribe(
    signed, stock, accounts, security_db
):
    movement, _ = draft(signed, stock, "15")
    post_movement(signed, movement)
    # Distinct sessions/users reach PostgreSQL at the same barrier; no shared
    # browser or mock/sequential request loop can make this test pass falsely.
    from app.schemas.security import UserCreate
    from app.services.users import create_user

    maker, _ = security_db
    with maker() as db:
        admin = db.get(User, accounts["admin"])
        for index in range(2):
            create_user(
                db,
                UserCreate(
                    username=f"concurrent.{index}",
                    display_name=f"Concurrent operator {index}",
                    password=accounts["password"],
                    roles=["OPERATIONS"],
                ),
                admin,
            )
        db.commit()
    clients = [
        TestClient(
            app,
            base_url=ORIGIN,
            headers={"Origin": ORIGIN},
            raise_server_exceptions=False,
        )
        for _ in range(2)
    ]
    headers = []
    for index, client in enumerate(clients):
        assert login(client, accounts, f"concurrent.{index}").status_code == 200
        headers.append(csrf(client))
    barrier = Barrier(2)

    def attempt(index):
        barrier.wait(timeout=10)
        return (
            clients[index]
            .post(
                "/api/inventory/reservations",
                json={
                    "request_key": key(),
                    "item_id": stock["item"]["id"],
                    "location_id": stock["storage"]["id"],
                    "quantity": "10",
                    "reason": "Concurrent internal stock allocation",
                },
                headers=headers[index],
            )
            .status_code
        )

    with ThreadPoolExecutor(max_workers=2) as pool:
        statuses = list(pool.map(attempt, range(2)))
    for client in clients:
        client.close()
    assert sorted(statuses) == [201, 409]
    row = balance(signed, stock)
    assert Decimal(row["reserved"]) == 10 and Decimal(row["available"]) == 5
    assert call(signed, "get", "reconciliation")["healthy"]


@pytest.mark.parametrize("kind", ["RECEIPT", "ISSUE", "TRANSFER"])
def test_concurrent_posting_is_atomic_and_idempotent(signed, stock, kind):
    initial, _ = draft(signed, stock, "15")
    post_movement(signed, initial)
    movement, _ = draft(
        signed,
        stock,
        "5",
        kind,
        stock["storage"]["id"] if kind != "RECEIPT" else None,
        stock["packing"]["id"] if kind == "TRANSFER" else None,
    )
    cookies, token, operation_key = dict(signed.cookies), csrf(signed), key()
    barrier = Barrier(2)

    def attempt(index):
        client = TestClient(
            app,
            base_url=ORIGIN,
            headers={"Origin": ORIGIN},
            raise_server_exceptions=False,
        )
        client.cookies.update(cookies)
        barrier.wait(timeout=10)
        response = client.post(
            f"/api/inventory/movements/{movement['id']}/post",
            json={"request_key": operation_key},
            headers=token,
        )
        client.close()
        return response.status_code

    with ThreadPoolExecutor(max_workers=2) as pool:
        statuses = list(pool.map(attempt, range(2)))
    assert statuses == [200, 200]
    assert (
        Decimal(balance(signed, stock)["on_hand"])
        == {"RECEIPT": 20, "ISSUE": 10, "TRANSFER": 15}[kind]
    )
    assert call(signed, "get", "reconciliation")["healthy"]


@pytest.mark.parametrize(
    "role,read,costs,write",
    [
        ("SUPER_ADMIN", True, True, True),
        ("OPERATIONS", True, True, True),
        ("SALES", True, False, False),
        ("ACCOUNTS", True, True, False),
        ("PACKING", True, False, False),
        ("MANAGEMENT", True, True, False),
        ("DRIVER", False, False, False),
    ],
)
def test_inventory_rbac_and_cost_redaction(
    signed, stock, accounts, security_db, role, read, costs, write
):
    receipt, _ = draft(signed, stock, "5")
    post_movement(signed, receipt)
    maker, _ = security_db
    with maker() as db:
        user = db.get(User, accounts["operator"])
        user.roles = [db.scalar(select(Role).where(Role.code == role))]
        db.commit()
    assert login(signed, accounts, "test.operations").status_code == 200
    response = signed.get("/api/inventory/balances")
    assert response.status_code == (200 if read else 403)
    if read:
        bucket = response.json()["items"][0]["buckets"][0]
        assert ("stock_value" in bucket) == costs
        detail = call(signed, "get", f"movements/{receipt['id']}")
        assert ("unit_cost" in detail["lines"][0]) == costs
    response = signed.post(
        "/api/inventory/warehouses",
        json={"name": "Restricted warehouse"},
        headers=csrf(signed),
    )
    assert response.status_code == (201 if write else 403)
    response = signed.post(
        "/api/inventory/reservations",
        json={
            "request_key": key(),
            "item_id": stock["item"]["id"],
            "location_id": stock["storage"]["id"],
            "quantity": "1",
            "reason": "Role authorization reservation test",
        },
        headers=csrf(signed),
    )
    assert response.status_code == (201 if write else 403)


@pytest.mark.parametrize("kind", ["RECEIPT", "ISSUE", "TRANSFER"])
def test_independent_simultaneous_movements_and_new_bucket(signed, stock, kind):
    if kind != "RECEIPT":
        initial, _ = draft(signed, stock, "15")
        post_movement(signed, initial)
    movements = [
        draft(
            signed,
            stock,
            "10",
            kind,
            stock["storage"]["id"] if kind != "RECEIPT" else None,
            stock["packing"]["id"] if kind == "TRANSFER" else None,
        )[0]
        for _ in range(2)
    ]
    cookies, headers = dict(signed.cookies), csrf(signed)
    barrier = Barrier(2)

    def attempt(index):
        with TestClient(
            app,
            base_url=ORIGIN,
            headers={"Origin": ORIGIN},
            raise_server_exceptions=False,
        ) as client:
            client.cookies.update(cookies)
            barrier.wait(timeout=10)
            return client.post(
                f"/api/inventory/movements/{movements[index]['id']}/post",
                json={"request_key": key()},
                headers=headers,
            ).status_code

    with ThreadPoolExecutor(max_workers=2) as pool:
        statuses = list(pool.map(attempt, range(2)))
    assert sorted(statuses) == ([200, 200] if kind == "RECEIPT" else [200, 409])
    assert (
        Decimal(balance(signed, stock)["on_hand"])
        == {"RECEIPT": 20, "ISSUE": 5, "TRANSFER": 15}[kind]
    )
    assert call(signed, "get", "reconciliation")["healthy"]


def test_draft_edit_version_and_missing_cost(signed, stock):
    movement, body = draft(signed, stock, "5", cost=None)
    edit = {k: v for k, v in body.items() if k != "request_key"}
    edit["version"] = movement["version"]
    edit["lines"][0]["quantity"] = "6"
    updated = call(signed, "put", f"movements/{movement['id']}", edit)
    assert updated["version"] == movement["version"] + 1
    call(signed, "put", f"movements/{movement['id']}", edit, 409)
    post_movement(signed, updated)
    row = balance(signed, stock)
    assert Decimal(row["on_hand"]) == 6
    assert row["buckets"][0]["stock_value"] is None
    assert not row["buckets"][0]["cost_complete"]
    call(signed, "put", f"movements/{movement['id']}", edit, 409)


def test_lot_return_quarantine_and_inspection(signed, stock):
    call(signed, "put", f"policies/{stock['item']['id']}", {"tracking_mode": "LOT"})
    lot = call(
        signed,
        "post",
        "lots",
        {
            "name": "Synthetic lot",
            "identifier": "LOT-RETURN",
            "item_id": stock["item"]["id"],
        },
        201,
    )
    returned, _ = draft(
        signed,
        stock,
        "4",
        "RETURN",
        destination=stock["quarantine"]["id"],
        lot=lot["id"],
    )
    post_movement(signed, returned)
    row = balance(signed, stock)
    assert Decimal(row["on_hand"]) == 4 and Decimal(row["available"]) == 0
    inspected, _ = draft(
        signed,
        stock,
        "4",
        "INSPECTION_RELEASE",
        source=stock["quarantine"]["id"],
        destination=stock["storage"]["id"],
        lot=lot["id"],
    )
    post_movement(signed, inspected)
    assert Decimal(balance(signed, stock)["available"]) == 4
    trace = call(signed, "get", f"lots/{lot['id']}/trace")
    assert len(trace["movements"]) == 2


def test_warehouse_minimum_keeps_scope_under_location_filter(signed, stock):
    receipt, _ = draft(signed, stock, "20")
    post_movement(signed, receipt)
    transfer, _ = draft(
        signed, stock, "12", "TRANSFER", stock["storage"]["id"], stock["packing"]["id"]
    )
    post_movement(signed, transfer)
    call(
        signed,
        "put",
        "thresholds",
        {
            "item_id": stock["item"]["id"],
            "warehouse_id": stock["warehouse"]["id"],
            "minimum": "15",
        },
    )
    row = balance(signed, stock, stock["storage"]["id"])
    assert Decimal(row["available"]) == 8
    assert not row["low_stock"]
    other = call(signed, "post", "warehouses", {"name": "Other synthetic yard"}, 201)
    call(signed, "put", "thresholds", {"item_id": stock["item"]["id"], "warehouse_id": other["id"], "minimum": "99"})
    assert not balance(signed, stock, stock["storage"]["id"])["low_stock"]
    call(
        signed,
        "put",
        "thresholds",
        {
            "item_id": stock["item"]["id"],
            "warehouse_id": stock["warehouse"]["id"],
            "location_id": stock["storage"]["id"],
            "minimum": "10",
        },
    )
    assert balance(signed, stock, stock["storage"]["id"])["low_stock"]
    assert not balance(signed, stock, stock["packing"]["id"])["low_stock"]


def test_count_post_requires_adjustment_authority(signed, stock, security_db, accounts):
    movement, _ = draft(signed, stock)
    post_movement(signed, movement)
    count = call(
        signed,
        "post",
        "counts",
        {
            "request_key": key(),
            "location_id": stock["storage"]["id"],
            "reason": "Synthetic permission regression count",
            "lines": [{"item_id": stock["item"]["id"]}],
        },
        201,
    )
    call(
        signed,
        "post",
        f"counts/{count['id']}/record",
        {
            "lines": [
                {
                    "line_id": count["lines"][0]["id"],
                    "counted_quantity": "47",
                    "reason": "Synthetic measured quantity explanation",
                }
            ]
        },
    )
    maker, _ = security_db
    with maker() as db:
        role = db.scalar(select(Role).where(Role.code == "OPERATIONS"))
        role.permissions = [
            p for p in role.permissions if p.code != "inventory.adjustments.post"
        ]
        db.commit()
    assert login(signed, accounts, "test.operations").status_code == 200
    response = call(
        signed, "post", f"counts/{count['id']}/post", {"request_key": key()}, 403
    )
    assert response["error"]["code"] == "PERMISSION_DENIED"
    assert Decimal(balance(signed, stock)["on_hand"]) == 50
    assert call(signed, "get", f"counts/{count['id']}")["status"] == "REVIEW"
    assert call(signed, "get", "reconciliation")["healthy"]


def test_csrf_audit_and_stock_reconciliation(signed, stock, security_db):
    assert (
        signed.post("/api/inventory/warehouses", json={"name": "Unsafe"}).status_code
        == 403
    )
    receipt, _ = draft(signed, stock, "5")
    post_movement(signed, receipt)
    maker, _ = security_db
    with maker() as db:
        events = db.scalars(
            select(AuditEvent).where(AuditEvent.target_id == uuid.UUID(receipt["id"]))
        ).all()
        assert {event.action for event in events} == {
            "inventory.movements.created",
            "inventory.movements.posted",
        }
        assert all("Synthetic authorized" not in str(event.details) for event in events)
        # Corruption is never repaired by an ordinary read: reconciliation reports it.
        row = db.scalar(select(StockBalance))
        row.on_hand += 1
        db.commit()
    assert call(signed, "get", "reconciliation")["healthy"] is False
    signed.post("/api/auth/logout", json={}, headers=csrf(signed))
    assert signed.get("/api/inventory/balances").status_code == 401
