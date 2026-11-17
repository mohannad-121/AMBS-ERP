"""Real PostgreSQL purchasing, production custody and security regression tests."""

import uuid
from datetime import date, datetime, UTC, timedelta
from decimal import Decimal
from concurrent.futures import ThreadPoolExecutor
from threading import Barrier
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import select, text
from sqlalchemy.exc import IntegrityError
from app.main import app
from app.models.security import User, Role, AuditEvent
from tests.test_security import security_db, accounts, browser, login, csrf, ORIGIN  # noqa: F401
from tests.test_master import signed, post as master_post  # noqa: F401
from tests.test_inventory import stock  # noqa: F401
from tests.test_inventory import (
    balance,
    call as inventory_call,
)  # noqa: F401

pytestmark = pytest.mark.integration


def key():
    return str(uuid.uuid4())


def call(client, method, path, data=None, expected=200):
    response = getattr(client, method)(
        f"/api/purchasing/{path}",
        **({"json": data, "headers": csrf(client)} if method != "get" else {}),
    )
    assert response.status_code == expected, response.text
    return response.json()


def operation(client, path, request_key=None, expected=200):
    return call(
        client,
        "post",
        path,
        {
            "request_key": request_key or key(),
            "reason": "Synthetic authorized verification operation",
        },
        expected,
    )


@pytest.fixture
def suppliers(signed):
    return [
        call(
            signed,
            "post",
            "suppliers",
            {
                "name": f"Synthetic supplier {n}",
                "types": ["FABRICATION", "POWDER_COATING"],
            },
            201,
        )
        for n in ["A", "B"]
    ]


def line(stock, quantity="100", price="2.50", **values):
    return {
        "line_type": "STOCK",
        "item_id": stock["item"]["id"],
        "unit_id": stock["unit"]["id"],
        "description": "Synthetic steel component snapshot",
        "quantity": quantity,
        "unit_price": price,
        **values,
    }


def po(signed, stock, suppliers, quantity="100", lines=None, **values):
    body = {
        "request_key": key(),
        "supplier_id": suppliers[0]["id"],
        "warehouse_id": stock["warehouse"]["id"],
        "ordered_on": date.today().isoformat(),
        "currency": "AED",
        "lines": lines or [line(stock, quantity)],
        **values,
    }
    order = call(signed, "post", "orders", body, 201)
    operation(signed, f"orders/{order['id']}/confirm")
    return call(signed, "get", f"orders/{order['id']}"), body


def receipt(signed, order, quantity, location, post=True):
    body = {
        "request_key": key(),
        "order_id": order["id"],
        "received_at": datetime.now(UTC).isoformat(),
        "reason": "Synthetic verified received materials",
        "lines": [
            {
                "order_line_id": order["lines"][0]["id"],
                "quantity": quantity,
                "location_id": location,
            }
        ],
    }
    row = call(signed, "post", "receipts", body, 201)
    if post:
        row = operation(signed, f"receipts/{row['id']}/post")
    return row, body


def external(signed, stock, supplier, name):
    return call(
        signed,
        "post",
        "custody-locations",
        {
            "name": name,
            "supplier_id": supplier["id"],
            "warehouse_id": stock["warehouse"]["id"],
        },
        201,
    )


def production(signed, stock, suppliers, ownership, pol=None, locations=None, **values):
    body = {
        "request_key": key(),
        "item_id": stock["item"]["id"],
        "quantity": "100",
        "ownership": ownership,
        "instructions": "Synthetic approved production route",
        "purchase_order_line_id": pol,
        "stages": [
            {
                "name": "FABRICATION",
                "supplier_id": suppliers[0]["id"],
                "location_id": locations[0]["id"] if locations else None,
            },
            {
                "name": "POWDER_COATING",
                "supplier_id": suppliers[1]["id"],
                "location_id": locations[1]["id"] if locations else None,
            },
        ],
    }
    return call(signed, "post", "production", {**body, **values}, 201)


def stage(signed, stage_id, action, quantity, **values):
    expected = values.pop("expected", 200)
    return call(
        signed,
        "post",
        f"stages/{stage_id}/{action}",
        {
            "request_key": key(),
            "quantity": quantity,
            "reason": "Synthetic verified stage operation",
            **values,
        },
        expected,
    )


def test_supplier_contacts_catalog_duplicates_and_dry_run(signed, stock, suppliers):
    supplier = suppliers[0]
    call(
        signed,
        "post",
        "suppliers",
        {"name": "  SYNTHETIC   SUPPLIER a ", "types": ["FABRICATION"]},
        409,
    )
    other = call(
        signed,
        "post",
        "suppliers",
        {
            "name": "Synthetic supplier A",
            "types": ["GALVANIZING"],
            "duplicate_confirmed": True,
        },
        201,
    )
    assert other["id"] != supplier["id"]
    for name in ["Synthetic first contact", "Synthetic second contact"]:
        call(
            signed,
            "post",
            "contacts",
            {"supplier_id": supplier["id"], "name": name, "is_main": True},
            201,
        )
    material = {
        "supplier_id": supplier["id"],
        "item_id": stock["item"]["id"],
        "unit_id": stock["unit"]["id"],
        "reported_available": "500",
        "minimum_quantity": "5",
    }
    saved = call(signed, "put", "catalog", material)
    assert "unverified" in saved["availability_status"].lower()
    material["verified_on"] = date.today().isoformat()
    call(signed, "put", "catalog", material)
    detail = call(signed, "get", f"suppliers/{supplier['id']}")
    assert (
        sum(c["is_main"] for c in detail["contacts"]) == 1
        and len(detail["catalog"]) == 1
    )
    assert Decimal(balance(signed, stock)["on_hand"]) == 0
    preview = call(
        signed,
        "post",
        "import-preview",
        {
            "source_system": "SYNTHETIC",
            "rows": [
                {"source_key": "1", "name": supplier["name"]},
                {"source_key": "1", "name": "Duplicate synthetic"},
            ],
        },
    )
    assert (
        preview["writes"] == 0
        and preview["dry_run"]
        and preview["rows"][0]["duplicate_candidates"]
        and preview["rows"][1]["issues"]
    )
    call(
        signed,
        "put",
        f"suppliers/{supplier['id']}",
        {
            "name": supplier["name"],
            "types": ["FABRICATION"],
            "is_active": False,
            "duplicate_confirmed": True,
        },
    )
    assert not call(signed, "get", f"suppliers/{supplier['id']}")["is_active"]


@pytest.mark.parametrize(
    "variant",
    [
        "valid",
        "currency",
        "unit",
        "expired",
        "unknown",
        "charges",
        "quantity",
        "larger_quantity",
        "minimum",
    ],
)
def test_quotation_comparison_validity_missing_data_and_history(
    signed, stock, suppliers, variant
):
    body = {
        "request_key": key(),
        "supplier_id": suppliers[0]["id"],
        "reference": "SYNTHETIC-QUOTE",
        "quoted_on": date.today().isoformat(),
        "valid_until": (date.today() + timedelta(days=30)).isoformat(),
        "currency": "USD" if variant == "currency" else "AED",
        "freight": None if variant == "charges" else "10",
        "taxes": "0",
        "fees": "0",
        "lines": [line(stock, price=None if variant == "unknown" else "2")],
    }
    if variant == "expired":
        body.update(
            quoted_on=(date.today() - timedelta(days=10)).isoformat(),
            valid_until=(date.today() - timedelta(days=1)).isoformat(),
        )
    if variant == "unit":
        unit = master_post(signed, "units", {"name": "KG", "decimal_places": 3})
        body["lines"][0]["unit_id"] = unit["id"]
    quote = call(signed, "post", "quotations", body, 201)
    if variant == "minimum":
        call(
            signed,
            "put",
            "catalog",
            {
                "supplier_id": suppliers[0]["id"],
                "item_id": stock["item"]["id"],
                "unit_id": stock["unit"]["id"],
                "minimum_quantity": "200",
            },
        )
    operation(signed, f"quotations/{quote['id']}/issue")
    compared = call(
        signed,
        "post",
        "compare",
        {
            "item_id": stock["item"]["id"],
            "unit_id": stock["unit"]["id"],
            "currency": "AED",
            "quantity": "50"
            if variant == "quantity"
            else "150"
            if variant == "larger_quantity"
            else "100",
        },
    )
    result = compared["items"][0]
    assert (result["comparison"] == "Comparable") == (variant == "valid")
    if variant == "valid":
        assert Decimal(result["landed_cost"]) == 210 and result["rank"] == 1
        order, _ = po(
            signed,
            stock,
            suppliers,
            quotation_id=quote["id"],
            lines=[line(stock, price="3")],
        )
        assert Decimal(order["lines"][0]["unit_price_variance"]) == 1
    else:
        assert result["landed_cost"] is None and result["reasons"]
    body.update(request_key=key(), supersedes_id=quote["id"])
    body["lines"][0]["unit_price"] = "3"
    new = call(signed, "post", "quotations", body, 201)
    if variant == "valid":
        operation(signed, f"quotations/{new['id']}/cancel")
        body["request_key"] = key()
        new = call(signed, "post", "quotations", body, 201)
    operation(signed, f"quotations/{new['id']}/issue")
    old = call(signed, "get", f"quotations/{quote['id']}")
    assert (
        old["status"] == "SUPERSEDED"
        and old["lines"][0]["unit_price"] == quote["lines"][0]["unit_price"]
    )


def test_requests_conversion_confirmed_snapshots_and_amendments(
    signed, stock, suppliers, security_db
):
    request = call(
        signed,
        "post",
        "requests",
        {
            "request_key": key(),
            "requested_on": date.today().isoformat(),
            "priority": "HIGH",
            "reason": "Synthetic internal procurement need",
            "lines": [line(stock)],
        },
        201,
    )
    operation(signed, f"requests/{request['id']}/submit")
    order, body = po(signed, stock, suppliers, request_id=request["id"])
    body["request_key"] = key()
    call(signed, "post", "orders", body, 409)
    body["version"] = order["version"]
    call(signed, "put", f"orders/{order['id']}", body, 409)
    maker, _ = security_db
    with maker() as db, pytest.raises(IntegrityError):
        db.execute(
            text("UPDATE purchase_order_lines SET quantity=999 WHERE id=:id"),
            {"id": order["lines"][0]["id"]},
        )
        db.commit()
    with maker() as db, pytest.raises(IntegrityError):
        db.execute(
            text("UPDATE purchase_orders SET status='DRAFT' WHERE id=:id"),
            {"id": order["id"]},
        )
        db.commit()
    received, _ = receipt(signed, order, "40", stock["storage"]["id"])
    replacement = {
        **body,
        "request_key": key(),
        "request_id": None,
        "lines": [line(stock, "60", "3")],
    }
    amended = call(
        signed,
        "post",
        f"orders/{order['id']}/amend",
        {
            "reason": "Synthetic commercial remainder amendment",
            "replacement": replacement,
        },
    )
    assert amended["amends_id"] == order["id"] and amended["status"] == "DRAFT"
    closed = call(signed, "get", f"orders/{order['id']}")
    assert (
        closed["status"] == "CLOSED"
        and Decimal(closed["lines"][0]["received"]) == 40
        and Decimal(closed["lines"][0]["closed_remainder"]) == 60
    )


def test_partial_receipts_idempotency_and_reversal(signed, stock, suppliers):
    order, _ = po(signed, stock, suppliers)
    first, body = receipt(signed, order, "40", stock["storage"]["id"], False)
    assert Decimal(balance(signed, stock)["on_hand"]) == 0
    assert call(signed, "post", "receipts", body, 201)["id"] == first["id"]
    post_key = key()
    posted = operation(signed, f"receipts/{first['id']}/post", post_key)
    operation(signed, f"receipts/{first['id']}/post", post_key)
    operation(signed, f"receipts/{first['id']}/post", expected=409)
    partial = call(signed, "get", f"orders/{order['id']}")
    assert (
        partial["status"] == "PARTIALLY_RECEIVED"
        and Decimal(partial["lines"][0]["outstanding"]) == 60
    )
    second, _ = receipt(signed, order, "60", stock["storage"]["id"])
    assert Decimal(balance(signed, stock)["on_hand"]) == 100
    assert call(signed, "get", f"orders/{order['id']}")["status"] == "RECEIVED"
    inventory_call(
        signed,
        "post",
        f"movements/{posted['movement_id']}/reverse",
        {"request_key": key(), "reason": "Synthetic attempted bypass correction"},
        409,
    )
    reverse_key = key()
    operation(signed, f"receipts/{second['id']}/reverse", reverse_key)
    operation(signed, f"receipts/{second['id']}/reverse", reverse_key)
    assert Decimal(balance(signed, stock)["on_hand"]) == 40
    assert (
        Decimal(call(signed, "get", f"orders/{order['id']}")["lines"][0]["outstanding"])
        == 60
    )
    assert inventory_call(signed, "get", "reconciliation")["healthy"]


def test_concurrent_receipts_never_exceed_outstanding(
    signed, stock, suppliers, accounts, security_db
):
    order, _ = po(signed, stock, suppliers, "10")
    receipts = [
        receipt(signed, order, "8", stock["storage"]["id"], False)[0] for _ in range(2)
    ]
    from app.services.users import create_user
    from app.schemas.security import UserCreate

    maker, _ = security_db
    with maker() as db:
        for index in range(2):
            create_user(
                db,
                UserCreate(
                    username=f"po.receiver.{index}",
                    display_name=f"Synthetic receiver {index}",
                    password=accounts["password"],
                    roles=["OPERATIONS"],
                ),
                db.get(User, accounts["admin"]),
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
        assert login(client, accounts, f"po.receiver.{index}").status_code == 200
        headers.append(csrf(client))
    barrier = Barrier(2)

    def attempt(index):
        barrier.wait(timeout=10)
        return (
            clients[index]
            .post(
                f"/api/purchasing/receipts/{receipts[index]['id']}/post",
                json={"request_key": key()},
                headers=headers[index],
            )
            .status_code
        )

    with ThreadPoolExecutor(max_workers=2) as pool:
        statuses = list(pool.map(attempt, range(2)))
    for client in clients:
        client.close()
    assert sorted(statuses) == [200, 409]
    assert Decimal(balance(signed, stock)["on_hand"]) == 8
    updated = call(signed, "get", f"orders/{order['id']}")
    assert (
        Decimal(updated["lines"][0]["received"]) == 8
        and Decimal(updated["lines"][0]["outstanding"]) == 2
    )
    assert inventory_call(signed, "get", "reconciliation")["healthy"]


@pytest.mark.parametrize("ownership", ["SUPPLIER", "AMBS"])
def test_production_partial_fabrication_coating_custody_yard(
    signed, stock, suppliers, ownership
):
    order, _ = po(signed, stock, suppliers)
    locations = (
        [
            external(signed, stock, supplier, f"Synthetic external {index}")
            for index, supplier in enumerate(suppliers)
        ]
        if ownership == "AMBS"
        else None
    )
    if ownership == "AMBS":
        receipt(signed, order, "100", locations[0]["id"])
    work = production(
        signed,
        stock,
        suppliers,
        ownership,
        order["lines"][0]["id"],
        locations,
    )
    stages = work["stages"]
    first = stages[0]["id"]
    second = stages[1]["id"]
    stage(
        signed,
        first,
        "start",
        "100",
        source_id=locations[0]["id"] if locations else None,
    )
    stage(signed, first, "transfer", "60", expected=409)
    stage(signed, first, "complete", "60")
    stage(signed, first, "transfer", "60")
    stage(signed, second, "complete", "45")
    stage(
        signed, second, "yard", "46", location_id=stock["storage"]["id"], expected=409
    )
    stage(signed, second, "yard", "45", location_id=stock["storage"]["id"])
    actual = call(signed, "get", f"production/{work['id']}")
    assert (
        Decimal(actual["stages"][0]["in_process"]) == 40
        and Decimal(actual["stages"][0]["current_custody"]) == 40
    )
    assert (
        Decimal(actual["stages"][1]["in_process"]) == 15
        and Decimal(actual["stages"][1]["current_custody"]) == 15
    )
    b = balance(signed, stock)
    assert (
        Decimal(b["on_hand"]) == (100 if ownership == "AMBS" else 45)
        and Decimal(b["available"]) == 45
    )
    assert (
        Decimal(actual["yard_received"]) == 45 and Decimal(actual["outstanding"]) == 55
    )
    if ownership == "SUPPLIER":
        assert (
            Decimal(
                call(signed, "get", f"orders/{order['id']}")["lines"][0]["received"]
            )
            == 45
        )
    assert inventory_call(signed, "get", "reconciliation")["healthy"]


def test_delay_unknown_dates_history_and_costs(signed, stock, suppliers):
    order, _ = po(signed, stock, suppliers)
    assert (
        order["delivery_status"] == "Awaiting Supplier Confirmation"
        and order["due_on"] is None
    )
    body = {
        "order_id": order["id"],
        "confirmed_on": (date.today() - timedelta(days=2)).isoformat(),
        "reason": "Synthetic recorded supplier delay",
        "evidence": "Synthetic supplier confirmation reference",
    }
    call(signed, "post", "schedules", body, 201)
    delayed = call(signed, "get", f"orders/{order['id']}")
    assert delayed["delivery_status"] == "Delayed"
    body["eta"] = (date.today() + timedelta(days=5)).isoformat()
    call(signed, "post", "schedules", body, 201)
    updated = call(signed, "get", f"orders/{order['id']}")
    assert (
        len(updated["schedule_history"]) == 2
        and updated["delivery_status"] == "Supplier Confirmed"
    )
    work = production(
        signed,
        stock,
        suppliers,
        "SUPPLIER",
        order["lines"][0]["id"],
        expected_finish=(date.today() - timedelta(days=1)).isoformat(),
    )
    assert work["stages"][0]["delivery_status"] == "Delayed"
    assert call(signed, "get", "dashboard")["delayed_stages"]
    cost = {
        "request_key": key(),
        "supplier_id": suppliers[1]["id"],
        "amount": "25.123456789012",
        "currency": "AED",
        "reference": "SYNTHETIC processing charge",
        "reason": "Synthetic approved indicative processing cost",
    }
    first = call(signed, "post", f"production/{work['id']}/costs", cost, 201)
    assert (
        call(signed, "post", f"production/{work['id']}/costs", cost, 201)["id"]
        == first["id"]
    )
    assert Decimal(balance(signed, stock)["on_hand"]) == 0
    assert call(signed, "get", f"production/{work['id']}")["costs"][0][
        "allocation_status"
    ].startswith("Pending")


@pytest.mark.parametrize(
    "role,can_read,can_write,costs",
    [
        ("SUPER_ADMIN", True, True, True),
        ("OPERATIONS", True, True, True),
        ("SALES", True, False, False),
        ("ACCOUNTS", True, False, True),
        ("PACKING", False, False, False),
        ("MANAGEMENT", True, False, True),
        ("DRIVER", False, False, False),
    ],
)
def test_roles_prices_csrf_and_independent_write_denial(
    signed, stock, suppliers, accounts, security_db, role, can_read, can_write, costs
):
    order, _ = po(signed, stock, suppliers)
    maker, _ = security_db
    with maker() as db:
        user = db.get(User, accounts["operator"])
        user.roles = [db.scalar(select(Role).where(Role.code == role))]
        db.commit()
    assert login(signed, accounts, "test.operations").status_code == 200
    response = signed.get(f"/api/purchasing/orders/{order['id']}")
    assert response.status_code == (200 if can_read else 403)
    if can_read:
        assert ("unit_price" in response.json()["lines"][0]) == costs
    operation(
        signed, f"orders/{order['id']}/confirm", expected=200 if can_write else 403
    )
    call(
        signed,
        "post",
        "quotations",
        {
            "request_key": key(),
            "supplier_id": suppliers[0]["id"],
            "reference": "SYNTHETIC role-protected price change",
            "quoted_on": date.today().isoformat(),
            "currency": "AED",
            "lines": [line(stock)],
        },
        201 if can_write else 403,
    )
    call(
        signed,
        "post",
        "suppliers",
        {"name": "Forbidden or permitted synthetic", "types": ["FABRICATION"]},
        201 if can_write else 403,
    )
    assert (
        signed.post(
            "/api/purchasing/suppliers",
            json={"name": "Unsafe synthetic", "types": ["FABRICATION"]},
        ).status_code
        == 403
    )


def test_atomic_receipt_failure_service_acceptance_and_audit(
    signed, stock, suppliers, security_db
):
    service_line = {
        "line_type": "SERVICE",
        "unit_id": stock["unit"]["id"],
        "description": "Synthetic coating service",
        "quantity": "10",
        "unit_price": "5",
    }
    order, _ = po(signed, stock, suppliers, lines=[line(stock, "10"), service_line])
    goods = next(l for l in order["lines"] if l["line_type"] == "STOCK")
    service = next(l for l in order["lines"] if l["line_type"] == "SERVICE")
    receipt_body = {
        "request_key": key(),
        "order_id": order["id"],
        "received_at": datetime.now(UTC).isoformat(),
        "reason": "Synthetic atomic goods and service receiving",
        "lines": [
            {
                "order_line_id": goods["id"],
                "quantity": "5",
                "location_id": stock["quarantine"]["id"],
            },
            {"order_line_id": service["id"], "quantity": "11"},
        ],
    }
    row = call(signed, "post", "receipts", receipt_body, 201)
    operation(signed, f"receipts/{row['id']}/post", expected=409)
    assert Decimal(balance(signed, stock)["on_hand"]) == 0
    receipt_body["request_key"] = key()
    receipt_body["lines"][1]["quantity"] = "10"
    row = call(signed, "post", "receipts", receipt_body, 201)
    operation(signed, f"receipts/{row['id']}/post")
    assert (
        Decimal(balance(signed, stock)["on_hand"]) == 5
        and Decimal(balance(signed, stock)["available"]) == 0
    )
    maker, _ = security_db
    with maker() as db:
        assert db.scalar(
            select(AuditEvent.id).where(
                AuditEvent.action == "purchasing.receipt_posted"
            )
        )


def test_measured_conversion_protects_claimed_stock(signed, stock, suppliers):
    loc = external(signed, stock, suppliers[0], "Synthetic conversion custodian")
    order, _ = po(signed, stock, suppliers, "100")
    receipt(signed, order, "100", loc["id"])
    output_item = master_post(
        signed,
        "items",
        {
            "name": "Synthetic measured fabricated output",
            "item_type": "component",
            "category_id": stock["category"]["id"],
            "unit_id": stock["unit"]["id"],
        },
    )
    body = {
        "request_key": key(),
        "reason": "Synthetic measured and approved conversion",
        "approved_reference": "SYNTHETIC approved conversion reference",
        "inputs": [
            {
                "item_id": stock["item"]["id"],
                "unit_id": stock["unit"]["id"],
                "quantity": "10",
                "source_id": loc["id"],
            }
        ],
        "outputs": [
            {
                "item_id": output_item["id"],
                "unit_id": stock["unit"]["id"],
                "quantity": "8",
                "destination_id": loc["id"],
            }
        ],
    }
    result = call(signed, "post", "conversions", body, 201)
    assert call(signed, "post", "conversions", body, 201)["id"] == result["id"]
    assert Decimal(balance(signed, stock)["on_hand"]) == 90
    assert inventory_call(signed, "get", "reconciliation")["healthy"]


def test_active_external_claims_block_double_allocation_reversal_and_conversion(
    signed, stock, suppliers
):
    locations = [
        external(signed, stock, s, f"Synthetic protected custodian {i}")
        for i, s in enumerate(suppliers)
    ]
    inventory_call(
        signed,
        "put",
        f"locations/{locations[0]['id']}",
        {
            "name": locations[0]["name"],
            "warehouse_id": stock["warehouse"]["id"],
            "kind": "USABLE",
        },
        409,
    )
    order, _ = po(signed, stock, suppliers)
    acquired, _ = receipt(signed, order, "100", locations[0]["id"])
    work = production(signed, stock, suppliers, "AMBS", locations=locations)
    stage(signed, work["stages"][0]["id"], "start", "100", source_id=locations[0]["id"])
    another = production(signed, stock, suppliers, "AMBS", locations=locations)
    stage(
        signed,
        another["stages"][0]["id"],
        "start",
        "1",
        source_id=locations[0]["id"],
        expected=409,
    )
    operation(signed, f"receipts/{acquired['id']}/reverse", expected=409)
    body = {
        "request_key": key(),
        "reason": "Synthetic attempted consumption of claimed custody",
        "approved_reference": "SYNTHETIC measured conversion approval",
        "inputs": [
            {
                "item_id": stock["item"]["id"],
                "unit_id": stock["unit"]["id"],
                "quantity": "1",
                "source_id": locations[0]["id"],
            }
        ],
        "outputs": [
            {
                "item_id": stock["item"]["id"],
                "unit_id": stock["unit"]["id"],
                "quantity": "1",
                "destination_id": stock["storage"]["id"],
            }
        ],
    }
    call(signed, "post", "conversions", body, 409)
    count = inventory_call(
        signed,
        "post",
        "counts",
        {
            "request_key": key(),
            "location_id": locations[0]["id"],
            "reason": "Synthetic external physical count",
            "lines": [{"item_id": stock["item"]["id"]}],
        },
        201,
    )
    inventory_call(
        signed,
        "post",
        f"counts/{count['id']}/record",
        {
            "lines": [
                {
                    "line_id": count["lines"][0]["id"],
                    "counted_quantity": "99",
                    "reason": "Synthetic attempted custody discrepancy",
                }
            ]
        },
    )
    inventory_call(
        signed, "post", f"counts/{count['id']}/post", {"request_key": key()}, 409
    )
    assert Decimal(balance(signed, stock)["on_hand"]) == 100
    assert Decimal(balance(signed, stock)["available"]) == 0
    scoped = inventory_call(
        signed, "get", f"overview?warehouse_id={stock['warehouse']['id']}"
    )
    assert (
        scoped["in_production"][0]["ownership"] == "AMBS"
        and Decimal(scoped["in_production"][0]["quantity"]) == 100
    )
    assert inventory_call(signed, "get", "reconciliation")["healthy"]


def test_single_optional_galvanizing_route_completes_and_plan_edits_lock(
    signed, stock, suppliers
):
    order, _ = po(signed, stock, suppliers, "5")
    body = {
        "request_key": key(),
        "item_id": stock["item"]["id"],
        "quantity": "5",
        "ownership": "SUPPLIER",
        "purchase_order_line_id": order["lines"][0]["id"],
        "instructions": "Synthetic single optional galvanizing route",
        "stages": [{"name": "GALVANIZING", "supplier_id": suppliers[0]["id"]}],
    }
    work = call(signed, "post", "production", body, 201)
    edit = {
        **body,
        "version": work["version"],
        "instructions": "Synthetic revised unstarted route",
    }
    changed = call(signed, "put", f"production/{work['id']}", edit)
    call(signed, "put", f"production/{work['id']}", edit, 409)
    stage_id = changed["stages"][0]["id"]
    stage(signed, stage_id, "start", "5")
    edit["version"] = changed["version"]
    call(signed, "put", f"production/{work['id']}", edit, 409)
    stage(signed, stage_id, "complete", "5")
    stage(signed, stage_id, "yard", "5", location_id=stock["storage"]["id"])
    assert call(signed, "get", f"production/{work['id']}")["status"] == "COMPLETED"
    assert Decimal(balance(signed, stock)["on_hand"]) == 5


@pytest.mark.parametrize("kind", ["posting_retry", "stage_completion"])
def test_simultaneous_retry_and_stage_progress_are_idempotent_or_bounded(
    signed, stock, suppliers, kind
):
    order, _ = po(signed, stock, suppliers)
    if kind == "posting_retry":
        target = receipt(signed, order, "8", stock["storage"]["id"], False)[0]
        path = f"receipts/{target['id']}/post"
        payload = {"request_key": key()}
    else:
        work = production(signed, stock, suppliers, "SUPPLIER", order["lines"][0]["id"])
        target = work["stages"][0]
        stage(signed, target["id"], "start", "100")
        path = f"stages/{target['id']}/complete"
        payload = {
            "quantity": "80",
            "reason": "Synthetic simultaneous stage completion",
        }
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
                f"/api/purchasing/{path}",
                json=payload
                if kind == "posting_retry"
                else {**payload, "request_key": key()},
                headers=headers,
            ).status_code

    with ThreadPoolExecutor(max_workers=2) as pool:
        statuses = list(pool.map(attempt, range(2)))
    assert sorted(statuses) == ([200, 200] if kind == "posting_retry" else [200, 409])
    if kind == "posting_retry":
        assert Decimal(balance(signed, stock)["on_hand"]) == 8
    else:
        assert (
            Decimal(
                call(signed, "get", f"production/{work['id']}")["stages"][0][
                    "completed"
                ]
            )
            == 80
        )
    assert inventory_call(signed, "get", "reconciliation")["healthy"]


def test_purchase_unit_freeze_closed_remainder_and_receipt_history_immutable(
    signed, stock, suppliers, security_db
):
    order, _ = po(signed, stock, suppliers)
    response = signed.put(
        f"/api/master/units/{stock['unit']['id']}",
        json={"name": "PCS", "decimal_places": 2},
        headers=csrf(signed),
    )
    assert response.status_code == 409
    first, _ = receipt(signed, order, "5", stock["storage"]["id"])
    maker, _ = security_db
    with maker() as db, pytest.raises(IntegrityError):
        db.execute(
            text("UPDATE purchase_receipt_lines SET quantity=8 WHERE receipt_id=:id"),
            {"id": first["id"]},
        )
        db.commit()
    operation(signed, f"orders/{order['id']}/close")
    assert call(signed, "get", "orders?open_only=true")["total"] == 0
    call(
        signed,
        "post",
        "receipts",
        {
            "request_key": key(),
            "order_id": order["id"],
            "received_at": datetime.now(UTC).isoformat(),
            "reason": "Synthetic attempted receipt against closed obligation",
            "lines": [
                {
                    "order_line_id": order["lines"][0]["id"],
                    "quantity": "1",
                    "location_id": stock["storage"]["id"],
                }
            ],
        },
        409,
    )
    closed = call(signed, "get", f"orders/{order['id']}")
    assert Decimal(closed["lines"][0]["closed_remainder"]) == 95


def test_receiving_requires_inventory_permission_and_service_does_not_create_stock(
    signed, stock, suppliers, accounts, security_db
):
    order, _ = po(signed, stock, suppliers)
    pending, _ = receipt(signed, order, "5", stock["storage"]["id"], False)
    maker, _ = security_db
    with maker() as db:
        role = db.scalar(select(Role).where(Role.code == "OPERATIONS"))
        role.permissions = [
            p for p in role.permissions if p.code != "inventory.receipts.post"
        ]
        db.commit()
    assert login(signed, accounts, "test.operations").status_code == 200
    operation(signed, f"receipts/{pending['id']}/post", expected=403)
    assert Decimal(balance(signed, stock)["on_hand"]) == 0
    assert (
        Decimal(call(signed, "get", f"orders/{order['id']}")["lines"][0]["received"])
        == 0
    )


def test_supplier_owned_yard_cannot_bypass_purchase_outstanding(
    signed, stock, suppliers
):
    order, _ = po(signed, stock, suppliers)
    old_draft, _ = receipt(signed, order, "8", stock["storage"]["id"], False)
    work = production(signed, stock, suppliers, "SUPPLIER", order["lines"][0]["id"])
    operation(signed, f"receipts/{old_draft['id']}/post", expected=409)
    assert (
        call(signed, "get", f"orders/{order['id']}")["outstanding_work"][0]["id"]
        == work["id"]
    )
    first, second = [s["id"] for s in work["stages"]]
    stage(signed, first, "start", "100")
    stage(signed, first, "complete", "100")
    stage(signed, first, "transfer", "100")
    stage(signed, second, "complete", "100")
    call(
        signed,
        "post",
        "receipts",
        {
            "request_key": key(),
            "order_id": order["id"],
            "received_at": datetime.now(UTC).isoformat(),
            "reason": "Synthetic attempted manual production receipt bypass",
            "lines": [
                {
                    "order_line_id": order["lines"][0]["id"],
                    "quantity": "80",
                    "location_id": stock["storage"]["id"],
                }
            ],
        },
        409,
    )
    stage(signed, second, "yard", "80", location_id=stock["storage"]["id"])
    stage(
        signed, second, "yard", "30", location_id=stock["storage"]["id"], expected=409
    )
    assert Decimal(balance(signed, stock)["on_hand"]) == 80
    assert (
        Decimal(call(signed, "get", f"production/{work['id']}")["yard_received"]) == 80
    )
    assert inventory_call(signed, "get", "reconciliation")["healthy"]


def test_service_only_receipt_is_non_stock_and_unauthenticated_access_is_rejected(
    signed, stock, suppliers
):
    order, _ = po(
        signed,
        stock,
        suppliers,
        lines=[
            {
                "line_type": "SERVICE",
                "unit_id": stock["unit"]["id"],
                "description": "Synthetic outsourced coating service acceptance",
                "quantity": "10",
                "unit_price": "5",
            }
        ],
    )
    accepted, _ = receipt(signed, order, "10", None)
    assert accepted["movement_id"] is None
    assert call(signed, "get", f"orders/{order['id']}")["status"] == "RECEIVED"
    assert Decimal(balance(signed, stock)["on_hand"]) == 0
    assert inventory_call(signed, "get", "records/movements")["total"] == 0
    with TestClient(app, base_url=ORIGIN) as anonymous:
        assert anonymous.get("/api/purchasing/suppliers").status_code == 401


def test_lot_receiving_trace_and_wrong_item_lot_rollback(signed, stock, suppliers):
    inventory_call(
        signed, "put", f"policies/{stock['item']['id']}", {"tracking_mode": "LOT"}
    )
    lot = inventory_call(
        signed,
        "post",
        "lots",
        {
            "name": "Synthetic received lot",
            "identifier": "LOT-PHASE5-TEST",
            "item_id": stock["item"]["id"],
        },
        201,
    )
    order, _ = po(signed, stock, suppliers)
    body = {
        "request_key": key(),
        "order_id": order["id"],
        "received_at": datetime.now(UTC).isoformat(),
        "reason": "Synthetic received lot trace check",
        "lines": [
            {
                "order_line_id": order["lines"][0]["id"],
                "quantity": "40",
                "location_id": stock["storage"]["id"],
                "lot_id": lot["id"],
            }
        ],
    }
    received = call(signed, "post", "receipts", body, 201)
    operation(signed, f"receipts/{received['id']}/post")
    trace = inventory_call(signed, "get", f"lots/{lot['id']}/trace")
    assert (
        trace["movements"][0]["kind"] == "PURCHASE_RECEIPT"
        and Decimal(trace["stock"][0]["on_hand"]) == 40
    )
    other = master_post(
        signed,
        "items",
        {
            "name": "Synthetic other lot item",
            "item_type": "component",
            "category_id": stock["category"]["id"],
            "unit_id": stock["unit"]["id"],
        },
    )
    inventory_call(signed, "put", f"policies/{other['id']}", {"tracking_mode": "LOT"})
    wrong = inventory_call(
        signed,
        "post",
        "lots",
        {
            "name": "Synthetic different item lot",
            "identifier": "LOT-PHASE5-WRONG",
            "item_id": other["id"],
        },
        201,
    )
    body["request_key"] = key()
    body["lines"][0]["lot_id"] = wrong["id"]
    call(signed, "post", "receipts", body, 422)
    assert Decimal(balance(signed, stock)["on_hand"]) == 40


def test_large_quantity_comparison_preserves_all_recorded_cost_digits(
    signed, stock, suppliers
):
    quote = call(
        signed,
        "post",
        "quotations",
        {
            "request_key": key(),
            "supplier_id": suppliers[0]["id"],
            "reference": "SYNTHETIC exact Decimal comparison",
            "quoted_on": date.today().isoformat(),
            "valid_until": (date.today() + timedelta(days=30)).isoformat(),
            "currency": "AED",
            "freight": "0.123456789012",
            "taxes": "0",
            "fees": "0",
            "lines": [line(stock, "10000000000000", "1234567890.123456789012")],
        },
        201,
    )
    operation(signed, f"quotations/{quote['id']}/issue")
    compared = call(
        signed,
        "post",
        "compare",
        {
            "item_id": stock["item"]["id"],
            "unit_id": stock["unit"]["id"],
            "currency": "AED",
            "quantity": "10000000000000",
        },
    )
    assert Decimal(compared["items"][0]["landed_cost"]) == Decimal(
        "12345678901234567890120.123456789012"
    )


def test_supplier_owned_plan_excludes_already_acquired_purchase_quantity(
    signed, stock, suppliers
):
    order, _ = po(signed, stock, suppliers)
    receipt(signed, order, "40", stock["storage"]["id"])
    body = {
        "request_key": key(),
        "item_id": stock["item"]["id"],
        "quantity": "100",
        "ownership": "SUPPLIER",
        "purchase_order_line_id": order["lines"][0]["id"],
        "instructions": "Synthetic unowned outstanding allocation",
        "stages": [{"name": "FABRICATION", "supplier_id": suppliers[0]["id"]}],
    }
    call(signed, "post", "production", body, 409)
    body["request_key"] = key()
    body["quantity"] = "60"
    work = call(signed, "post", "production", body, 201)
    assert Decimal(work["quantity"]) == 60
    assert Decimal(balance(signed, stock)["on_hand"]) == 40
