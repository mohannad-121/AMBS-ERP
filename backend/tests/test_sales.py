"""Phase 6A regression tests on uniquely created PostgreSQL databases."""

from decimal import Decimal
from concurrent.futures import ThreadPoolExecutor
from threading import Barrier
from fastapi.testclient import TestClient
import pytest
from sqlalchemy import select, text, func
from sqlalchemy.exc import IntegrityError
from app.main import app
from app.models.sales import SalesOrder, SalesConsumption
from app.models.security import User, Role, AuditEvent
from tests.test_security import security_db, accounts, browser, csrf, ORIGIN, login  # noqa: F401
from tests.test_master import signed, post as master_post  # noqa: F401
from tests.test_inventory import stock  # noqa: F401
from tests.test_inventory import (
    draft,
    post_movement,
    balance,
    call as inventory,
    key,
)  # noqa: F401

pytestmark = pytest.mark.integration
REASON = "Synthetic verified sales operation"


def call(client, path, body=None, expected=200):
    response = (
        client.get("/api/sales/" + path)
        if body is None
        else client.post("/api/sales/" + path, json=body, headers=csrf(client))
    )
    assert response.status_code == expected, response.text
    return response.json()


def op(**values):
    return dict(request_key=key(), reason=REASON, **values)


def receipt(client, stock, quantity, **kwargs):
    movement, _ = draft(client, stock, str(quantity), **kwargs)
    post_movement(client, movement)
    return movement


def order(client, stock, quantity="15", confirm=True, customer=None, **kwargs):
    customer = customer or master_post(
        client,
        "customers",
        {"name": "Synthetic sales " + key(), "address": "Verified synthetic site"},
    )
    body = op(
        customer_id=customer["id"],
        lines=[dict(item_id=stock["item"]["id"], quantity=quantity)],
        **kwargs,
    )
    row = call(client, "orders", body, 201)
    return call(client, f"orders/{row['id']}/confirm", op()) if confirm else row


def prepare(client, stock, row):
    return call(
        client,
        f"orders/{row['id']}/prepare",
        op(
            warehouse_id=stock["warehouse"]["id"], destination="Verified synthetic site"
        ),
    )


def actual(client, delivery, action, amount=None):
    return call(
        client,
        f"deliveries/{delivery['id']}/{action}",
        op(
            verified=True,
            lines=[
                dict(
                    id=l["id"],
                    quantity=str(amount) if amount is not None else l["quantity"],
                )
                for l in delivery["lines"]
            ],
        ),
    )


def dispatch(client, delivery, amount=None):
    actual(client, delivery, "pick", amount)
    actual(client, delivery, "load", amount)
    return call(client, f"deliveries/{delivery['id']}/dispatch", op())


def test_mandatory_partial_delivery_and_receipt(signed, stock, security_db):
    receipt(signed, stock, 8)
    row = order(signed, stock)
    assert Decimal(balance(signed, stock)["on_hand"]) == 8
    d = prepare(signed, stock, row)
    assert Decimal(balance(signed, stock)["reserved"]) == 8
    assert Decimal(balance(signed, stock)["on_hand"]) == 8
    dispatch(signed, d)
    partial = call(signed, "orders/" + row["id"])
    assert partial["status"] == "PARTIALLY_DISPATCHED"
    assert Decimal(partial["lines"][0]["outstanding"]) == 7
    receipt(signed, stock, 7)
    dispatch(signed, prepare(signed, stock, row))
    final = call(signed, "orders/" + row["id"])
    assert final["status"] == "COMPLETED"
    assert Decimal(final["lines"][0]["outstanding"]) == 0
    assert len(final["deliveries"]) == 2
    assert Decimal(balance(signed, stock)["on_hand"]) == 0
    assert inventory(signed, "get", "reconciliation")["healthy"]
    maker, _ = security_db
    with maker() as db:
        assert db.scalar(select(func.count()).select_from(SalesConsumption)) == 2
        actions = set(db.scalars(select(AuditEvent.action)))
        assert {
            "sales.orders.create",
            "sales.orders.confirm",
            "sales.deliveries.dispatch",
        } <= actions


def test_partial_hold_split_preserves_original_and_reuses_remainder(
    signed, stock, security_db
):
    receipt(signed, stock, 8)
    row = order(signed, stock)
    d = prepare(signed, stock, row)
    original = call(signed, "orders/" + row["id"])["lines"][0]["allocations"][0][
        "history"
    ][0]
    dispatch(signed, d, 5)
    current = call(signed, "orders/" + row["id"])
    allocation = current["lines"][0]["allocations"][0]
    assert Decimal(allocation["remaining"]) == 3
    assert Decimal(current["lines"][0]["outstanding"]) == 10
    assert len(allocation["history"]) == 3
    original_now = next(h for h in allocation["history"] if h["id"] == original["id"])
    assert (
        Decimal(original_now["quantity"]) == 8 and original_now["status"] == "RELEASED"
    )
    dispatch(signed, prepare(signed, stock, row))
    assert Decimal(call(signed, "orders/" + row["id"])["lines"][0]["outstanding"]) == 7
    assert Decimal(balance(signed, stock)["reserved"]) == 0


def test_shortage_is_valid_demand_and_zero_stock_preparation_rolls_back(signed, stock):
    row = order(signed, stock)
    assert row["status"] == "CONFIRMED" and Decimal(row["lines"][0]["available"]) == 0
    call(
        signed,
        f"orders/{row['id']}/prepare",
        op(warehouse_id=stock["warehouse"]["id"], destination="Verified site"),
        409,
    )
    assert call(signed, "orders/" + row["id"])["deliveries"] == []


def test_release_idempotence_and_manual_holds_preserved(signed, stock):
    receipt(signed, stock, 10)
    manual = inventory(
        signed,
        "post",
        "reservations",
        dict(
            request_key=key(),
            item_id=stock["item"]["id"],
            location_id=stock["storage"]["id"],
            quantity="2",
            reason=REASON,
        ),
        201,
    )
    row = order(signed, stock)
    body = op(warehouse_id=stock["warehouse"]["id"])
    allocated = call(signed, f"orders/{row['id']}/allocate", body)
    assert (
        call(signed, f"orders/{row['id']}/allocate", body)["lines"][0]["allocations"]
        == allocated["lines"][0]["allocations"]
    )
    linked = allocated["lines"][0]["allocations"][0]["current_reservation_id"]
    inventory(signed, "post", f"reservations/{linked}/release", op(), 409)
    body = op()
    call(signed, f"orders/{row['id']}/release", body)
    call(signed, f"orders/{row['id']}/release", body)
    assert Decimal(balance(signed, stock)["reserved"]) == 2
    inventory(signed, "post", f"reservations/{manual['id']}/release", op())
    assert Decimal(balance(signed, stock)["reserved"]) == 0


def test_duplicate_dispatch_and_conflicting_key(signed, stock, security_db):
    receipt(signed, stock, 8)
    row = order(signed, stock)
    d = prepare(signed, stock, row)
    actual(signed, d, "pick")
    actual(signed, d, "load")
    body = op()
    first = call(signed, f"deliveries/{d['id']}/dispatch", body)
    assert call(signed, f"deliveries/{d['id']}/dispatch", body)["id"] == first["id"]
    call(signed, f"deliveries/{d['id']}/dispatch", op(), 409)
    call(
        signed,
        f"deliveries/{d['id']}/dispatch",
        dict(body, reason="Different verified operation"),
        409,
    )
    maker, _ = security_db
    with maker() as db:
        assert db.scalar(select(func.count()).select_from(SalesConsumption)) == 1


@pytest.mark.parametrize("same_key", [True, False])
def test_real_postgres_concurrent_dispatch(signed, stock, same_key):
    receipt(signed, stock, 8)
    d = prepare(signed, stock, order(signed, stock))
    actual(signed, d, "pick")
    actual(signed, d, "load")
    token = csrf(signed)
    cookies = dict(signed.cookies)
    barrier = Barrier(2)
    common = op()

    def worker(index):
        with TestClient(
            app,
            base_url=ORIGIN,
            headers={"Origin": ORIGIN},
            cookies=cookies,
            raise_server_exceptions=False,
        ) as client:
            barrier.wait(timeout=20)
            return client.post(
                f"/api/sales/deliveries/{d['id']}/dispatch",
                json=common if same_key else op(),
                headers=token,
            ).status_code

    with ThreadPoolExecutor(max_workers=2) as executor:
        results = list(executor.map(worker, range(2)))
    assert sorted(results) == ([200, 200] if same_key else [200, 409])
    assert Decimal(balance(signed, stock)["on_hand"]) == 0
    assert (
        Decimal(call(signed, "orders/" + d["order_id"])["lines"][0]["outstanding"]) == 7
    )


def test_order_relationships_and_multiple_orders(signed, stock):
    c1 = master_post(signed, "customers", {"name": "Synthetic customer one"})
    c2 = master_post(signed, "customers", {"name": "Synthetic customer two"})
    p1 = master_post(
        signed, "projects", {"name": "Synthetic project one", "customer_id": c1["id"]}
    )
    p2 = master_post(
        signed, "projects", {"name": "Synthetic project two", "customer_id": c1["id"]}
    )
    lpo = master_post(
        signed,
        "lpos",
        {
            "name": "Synthetic LPO",
            "number": "SYN-6A",
            "customer_id": c1["id"],
            "project_id": p1["id"],
        },
    )
    first = order(signed, stock, customer=c1, lpo_id=lpo["id"])
    second = order(signed, stock, customer=c1, project_id=p2["id"])
    assert first["id"] != second["id"] and first["project_id"] == p1["id"]
    for customer, project_id, lpo_id in [
        (c2, p1["id"], None),
        (c2, None, lpo["id"]),
        (c1, p2["id"], lpo["id"]),
    ]:
        call(
            signed,
            "orders",
            op(
                customer_id=customer["id"],
                project_id=project_id,
                lpo_id=lpo_id,
                lines=[dict(item_id=stock["item"]["id"], quantity="1")],
            ),
            422,
        )
    assert len(call(signed, "orders?customer_id=" + c1["id"])["items"]) == 2


def test_controlled_amendments_and_quantity_floor(signed, stock, security_db):
    receipt(signed, stock, 8)
    row = order(signed, stock)
    call(
        signed,
        f"orders/{row['id']}/allocate",
        op(warehouse_id=stock["warehouse"]["id"]),
    )
    body = op(version=1, lines=[dict(id=row["lines"][0]["id"], quantity="7")])
    call(signed, f"orders/{row['id']}/amend", body, 409)
    body["lines"][0]["quantity"] = "20"
    amended = call(signed, f"orders/{row['id']}/amend", body)
    assert amended["version"] == 2 and len(amended["amendments"]) == 1
    assert Decimal(amended["amendments"][0]["before"]["lines"][0]["quantity"]) == 15
    assert Decimal(amended["amendments"][0]["after"]["lines"][0]["quantity"]) == 20
    call(signed, f"orders/{row['id']}/amend", dict(body, request_key=key()), 409)
    maker, _ = security_db
    with maker() as db:
        with pytest.raises(IntegrityError):
            db.execute(
                text("UPDATE sales_order_lines SET quantity=99 WHERE id=:id"),
                {"id": row["lines"][0]["id"]},
            )
            db.commit()
        db.rollback()
        with pytest.raises(IntegrityError):
            db.execute(
                text("UPDATE sales_orders SET status='DRAFT' WHERE id=:id"),
                {"id": row["id"]},
            )
            db.commit()


def test_unusable_stock_excluded_and_no_over_reservation(signed, stock):
    receipt(signed, stock, 8)
    receipt(signed, stock, 99, kind="RETURN", destination=stock["quarantine"]["id"])
    first, second = order(signed, stock), order(signed, stock)
    availability = call(signed, "availability/" + stock["item"]["id"])
    assert (
        Decimal(availability["available"]) == 8
        and Decimal(availability["on_hand"]) == 8
    )
    call(
        signed,
        f"orders/{first['id']}/allocate",
        op(warehouse_id=stock["warehouse"]["id"]),
    )
    result = call(
        signed,
        f"orders/{second['id']}/allocate",
        op(warehouse_id=stock["warehouse"]["id"]),
    )
    assert result["lines"][0]["allocations"] == []
    assert Decimal(balance(signed, stock)["reserved"]) == 8


def test_actual_verification_stages_and_cancellation(signed, stock):
    receipt(signed, stock, 8)
    row = order(signed, stock)
    d = prepare(signed, stock, row)
    call(signed, f"deliveries/{d['id']}/dispatch", op(), 409)
    call(
        signed,
        f"deliveries/{d['id']}/load",
        op(verified=True, lines=[dict(id=l["id"], quantity="1") for l in d["lines"]]),
        409,
    )
    call(
        signed,
        f"deliveries/{d['id']}/pick",
        op(verified=False, lines=[dict(id=l["id"], quantity="1") for l in d["lines"]]),
        422,
    )
    call(
        signed,
        f"deliveries/{d['id']}/pick",
        op(verified=True, lines=[dict(id=l["id"], quantity="9") for l in d["lines"]]),
        422,
    )
    call(signed, f"orders/{row['id']}/release", op(), 409)
    call(signed, f"deliveries/{d['id']}/cancel", op())
    call(signed, f"orders/{row['id']}/cancel", op())
    assert (
        Decimal(balance(signed, stock)["on_hand"]) == 8
        and Decimal(balance(signed, stock)["reserved"]) == 0
    )


def test_reversal_requires_physical_return_and_protects_issue(signed, stock):
    receipt(signed, stock, 8)
    row = order(signed, stock, "8")
    d = dispatch(signed, prepare(signed, stock, row))
    inventory(
        signed, "post", f"movements/{d['lines'][0]['movement_id']}/reverse", op(), 409
    )
    call(signed, f"deliveries/{d['id']}/reverse", op(), 422)
    body = op(goods_returned_to_origin=True)
    call(signed, f"deliveries/{d['id']}/reverse", body)
    call(signed, f"deliveries/{d['id']}/reverse", body)
    current = call(signed, "orders/" + row["id"])
    assert (
        current["status"] == "CONFIRMED"
        and Decimal(current["lines"][0]["outstanding"]) == 8
    )
    assert (
        Decimal(balance(signed, stock)["on_hand"]) == 8
        and Decimal(balance(signed, stock)["reserved"]) == 0
    )
    assert inventory(signed, "get", "reconciliation")["healthy"]


@pytest.mark.parametrize(
    "role", ["SALES", "PACKING", "ACCOUNTS", "MANAGEMENT", "DRIVER"]
)
def test_role_boundaries(signed, stock, security_db, accounts, role):
    receipt(signed, stock, 8)
    row = order(signed, stock)
    d = prepare(signed, stock, row)
    maker, _ = security_db
    with maker() as db:
        user = db.get(User, accounts["operator"])
        user.roles = [db.scalar(select(Role).where(Role.code == role))]
        db.commit()
    assert login(signed, accounts, "test.operations").status_code == 200
    call(signed, f"deliveries/{d['id']}/dispatch", op(), 403)
    call(
        signed,
        "orders/" + row["id"],
        expected=403 if role in ["PACKING", "DRIVER"] else 200,
    )
    call(signed, "deliveries/" + d["id"], expected=403 if role == "DRIVER" else 200)
    if role == "PACKING":
        actual(signed, d, "pick")
        actual(signed, d, "load")
    elif role == "SALES":
        order(signed, stock, customer={"id": row["customer_id"]})
        call(
            signed,
            f"orders/{row['id']}/allocate",
            op(warehouse_id=stock["warehouse"]["id"]),
            403,
        )


@pytest.mark.parametrize("tracking", ["LOT", "SERIAL"])
def test_lot_serial_identity_and_blocked_stock(signed, stock, tracking):
    inventory(
        signed, "put", f"policies/{stock['item']['id']}", {"tracking_mode": tracking}
    )
    lots = [
        inventory(
            signed,
            "post",
            "lots",
            {
                "name": f"Synthetic {tracking} {i}",
                "item_id": stock["item"]["id"],
                "identifier": f"6A-{tracking}-{i}",
            },
            201,
        )
        for i in range(2)
    ]
    for lot in lots:
        receipt(signed, stock, 1 if tracking == "SERIAL" else 8, lot=lot["id"])
    inventory(
        signed,
        "put",
        f"lots/{lots[0]['id']}/status",
        {"status": "BLOCKED", "reason": REASON},
    )
    available = call(signed, "availability/" + stock["item"]["id"])
    assert Decimal(available["available"]) == (1 if tracking == "SERIAL" else 8)
    row = order(signed, stock, "15")
    d = prepare(signed, stock, row)
    assert len(d["lines"]) == 1 and d["lines"][0]["lot_id"] == lots[1]["id"]
    inventory(
        signed,
        "put",
        f"lots/{lots[1]['id']}/status",
        {"status": "BLOCKED", "reason": REASON},
        409,
    )
    dispatch(signed, d)
    inventory(
        signed,
        "put",
        f"lots/{lots[0]['id']}/status",
        {"status": "ACTIVE", "reason": REASON},
    )
    d = prepare(signed, stock, row)
    assert d["lines"][0]["lot_id"] == lots[0]["id"]
    dispatch(signed, d)
    remaining = Decimal(call(signed, "orders/" + row["id"])["lines"][0]["outstanding"])
    assert remaining == (13 if tracking == "SERIAL" else 0)
    assert inventory(signed, "get", "reconciliation")["healthy"]


def test_multiline_create_retry_draft_edit_and_atomic_actuals(signed, stock):
    customer = master_post(
        signed, "customers", {"name": "Synthetic multiline customer"}
    )
    second_item = master_post(
        signed,
        "items",
        {
            "name": "Synthetic other sales item",
            "item_type": "component",
            "category_id": stock["category"]["id"],
            "unit_id": stock["unit"]["id"],
        },
    )
    body = op(
        customer_id=customer["id"],
        lines=[
            {"item_id": stock["item"]["id"], "quantity": "2"},
            {"item_id": second_item["id"], "quantity": "3"},
        ],
    )
    row = call(signed, "orders", body, 201)
    assert call(signed, "orders", body, 201)["id"] == row["id"]
    call(signed, "orders", dict(body, notes="different"), 409)
    edited = call(
        signed,
        f"orders/{row['id']}/edit",
        op(version=1, lines=[{"id": l["id"], "quantity": "4"} for l in row["lines"]]),
    )
    assert edited["status"] == "DRAFT" and edited["version"] == 2
    row = call(signed, f"orders/{row['id']}/confirm", op())
    receipt(signed, stock, 4)
    receipt(signed, dict(stock, item=second_item), 4)
    d = prepare(signed, stock, row)
    assert len(d["lines"]) == 2
    call(
        signed,
        f"deliveries/{d['id']}/pick",
        op(
            verified=True,
            lines=[
                {"id": l["id"], "quantity": "4" if i == 0 else "5"}
                for i, l in enumerate(d["lines"])
            ],
        ),
        422,
    )
    unchanged = call(signed, "deliveries/" + d["id"])
    assert unchanged["status"] == "DRAFT" and all(
        l["picked_quantity"] is None for l in unchanged["lines"]
    )
    dispatch(signed, d)
    assert call(signed, "orders/" + row["id"])["status"] == "COMPLETED"


def test_concurrent_allocations_cannot_oversubscribe(signed, stock):
    receipt(signed, stock, 8)
    rows = [order(signed, stock), order(signed, stock)]
    token, cookies, barrier = csrf(signed), dict(signed.cookies), Barrier(2)

    def worker(row):
        with TestClient(
            app,
            base_url=ORIGIN,
            headers={"Origin": ORIGIN},
            cookies=cookies,
            raise_server_exceptions=False,
        ) as client:
            barrier.wait(timeout=20)
            response = client.post(
                f"/api/sales/orders/{row['id']}/allocate",
                json=op(warehouse_id=stock["warehouse"]["id"]),
                headers=token,
            )
            assert response.status_code == 200
            return Decimal(response.json()["lines"][0]["allocated"])

    with ThreadPoolExecutor(max_workers=2) as executor:
        amounts = list(executor.map(worker, rows))
    assert sorted(amounts) == [0, 8]
    assert Decimal(balance(signed, stock)["reserved"]) == 8


def test_sales_csrf_driver_validation_and_unit_precision(signed, stock):
    row = order(signed, stock)
    assert (
        signed.post(
            f"/api/sales/orders/{row['id']}/allocate",
            json=op(warehouse_id=stock["warehouse"]["id"]),
        ).status_code
        == 403
    )
    call(
        signed,
        "orders",
        op(
            customer_id=row["customer_id"],
            lines=[{"item_id": stock["item"]["id"], "quantity": "1.5"}],
        ),
        422,
    )
    receipt(signed, stock, 8)
    user = signed.get("/api/auth/me").json()
    call(
        signed,
        f"orders/{row['id']}/prepare",
        op(
            warehouse_id=stock["warehouse"]["id"],
            destination="Verified site",
            driver_id=user["id"],
        ),
        422,
    )
    assert Decimal(balance(signed, stock)["reserved"]) == 0


def test_posted_history_is_immutable_and_order_identity_preserved(
    signed, stock, security_db
):
    receipt(signed, stock, 8)
    row = order(signed, stock, "8")
    d = dispatch(signed, prepare(signed, stock, row))
    maker, _ = security_db
    with maker() as db:
        for statement in [
            "UPDATE sales_deliveries SET destination='Changed' WHERE id=:id",
            "UPDATE sales_deliveries SET status='DRAFT' WHERE id=:id",
        ]:
            with pytest.raises(IntegrityError):
                db.execute(text(statement), {"id": d["id"]})
                db.commit()
            db.rollback()
        for table in [
            "sales_consumptions",
            "sales_reservation_links",
            "sales_operations",
        ]:
            with pytest.raises(IntegrityError):
                db.execute(text(f"DELETE FROM {table}"))
                db.commit()
            db.rollback()
        assert db.scalar(select(func.count()).select_from(SalesOrder)) == 1
    assert inventory(signed, "get", "reconciliation")["healthy"]
