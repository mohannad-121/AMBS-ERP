"""Phase 7 uses real isolated PostgreSQL; all records are synthetic."""

import io
import uuid
from concurrent.futures import ThreadPoolExecutor
from threading import Barrier
from decimal import Decimal
import pytest
from fastapi.testclient import TestClient
from pypdf import PdfReader
from sqlalchemy import text, select
from sqlalchemy.exc import IntegrityError
from app.main import app
from app.models.security import User, Role
from tests.test_security import security_db, accounts, browser, login, csrf, ORIGIN  # noqa: F401
from tests.test_master import signed, post as master_post  # noqa: F401
from tests.test_inventory import stock, key  # noqa: F401
from tests.test_sales import (
    receipt,
    order,
    prepare,
    dispatch,
    actual,
    op,
    call as sales,
)
from tests.test_purchasing import (
    suppliers,
    po,
    receipt as purchase_receipt,
    external,
    production,
    operation as purchase_operation,
    stage as production_stage,
)  # noqa: F401

pytestmark = pytest.mark.integration


def call(client, path, body=None, status=200, method="post"):
    r = (
        client.get("/api/" + path)
        if body is None
        else getattr(client, method)("/api/" + path, json=body, headers=csrf(client))
    )
    assert r.status_code == status, r.text
    return r.json()


def pdf(client, path):
    r = client.get("/api/" + path)
    assert r.status_code == 200, r.text
    assert r.headers["content-type"] == "application/pdf"
    return r, " ".join(
        " ".join(
            p.extract_text() for p in PdfReader(io.BytesIO(r.content)).pages
        ).split()
    )


def issue(client, d, **kwargs):
    return call(
        client,
        f"packing/deliveries/{d['id']}/documents",
        op(kind="PACKING_LIST", **kwargs),
        201,
    )


def bom_data(stock, component=None, **kwargs):
    component = component or stock["component"]
    return op(
        item_id=stock["item"]["id"],
        unit_id=stock["unit"]["id"],
        output_quantity="1",
        components=[
            dict(item_id=component["id"], unit_id=stock["unit"]["id"], quantity="2")
        ],
        source_reference="Synthetic approved mathematical test only",
        **kwargs,
    )


def assembly(signed, stock):
    stock["component"] = stock["item"]
    stock["item"] = master_post(
        signed,
        "items",
        dict(
            name="Synthetic assembly",
            item_type="finished",
            category_id=stock["category"]["id"],
            unit_id=stock["unit"]["id"],
        ),
    )
    return stock


def approve(client, row):
    call(client, f"boms/{row['id']}/submit", op())
    return call(client, f"boms/{row['id']}/approve", op(specification_confirmed=True))


def ledger(maker):
    with maker() as db:
        return db.execute(
            text("SELECT id,on_hand,reserved FROM stock_balances ORDER BY id")
        ).all(), db.scalar(text("SELECT count(*) FROM stock_ledger_effects"))


def test_partial_documents_snapshot_reprint_and_second_dispatch(
    signed, stock, security_db, monkeypatch, tmp_path
):
    receipt(signed, stock, 8)
    source = order(signed, stock)
    d = dispatch(signed, prepare(signed, stock, source))
    import base64
    from PIL import Image
    from app.core.config import get_settings

    monkeypatch.setattr(get_settings(), "image_storage_dir", str(tmp_path))
    image = io.BytesIO()
    Image.new("RGB", (120, 60), "red").save(image, format="PNG")
    uploaded = signed.put(
        f"/api/master/items/{stock['item']['id']}/image",
        json={
            "mime_type": "image/png",
            "content_base64": base64.b64encode(image.getvalue()).decode(),
        },
        headers=csrf(signed),
    )
    assert uploaded.status_code == 200
    before = ledger(security_db[0])
    doc = issue(signed, d)
    assert doc["snapshot"]["lines"][0]["dispatched"] == "8"
    assert Decimal(doc["snapshot"]["remaining"][0]["quantity"]) == 7
    first, content = pdf(signed, f"packing/documents/{doc['id']}/download")
    assert sum(len(p.images) for p in PdfReader(io.BytesIO(first.content)).pages) > 0
    assert "Receiver name / signature:" in content
    assert "VAT" not in content and "2.000000" not in content
    assert first.headers["x-ambs-document-sha256"] == doc["sha256"]
    assert ledger(security_db[0]) == before
    maker, _ = security_db
    with maker() as db:
        db.execute(text("UPDATE customers SET name='Changed later'"))
        db.commit()
    assert (
        pdf(signed, f"packing/documents/{doc['id']}/download")[0].content
        == first.content
    )
    receipt(signed, stock, 7)
    second = dispatch(signed, prepare(signed, stock, source))
    doc2 = issue(signed, second)
    assert (
        doc2["snapshot"]["lines"][0]["dispatched"] == "7"
        and doc2["delivery_id"] != doc["delivery_id"]
    )
    assert doc2["snapshot"]["remaining"] == []
    do = call(
        signed,
        f"packing/deliveries/{second['id']}/documents",
        op(kind="DELIVERY_ORDER"),
        201,
    )
    assert "DELIVERY ORDER" in pdf(signed, f"packing/documents/{do['id']}/download")[1]


def test_draft_pick8_load6_and_immutable_reversal(signed, stock, security_db):
    receipt(signed, stock, 8)
    source = order(signed, stock)
    d = prepare(signed, stock, source)
    actual(signed, d, "pick", 8)
    actual(signed, d, "load", 6)
    _, content = pdf(signed, f"packing/deliveries/{d['id']}/preview")
    assert "DRAFT - PREPARATION COPY - NOT DISPATCHED" in content
    assert "LOADED" in content and "6" in content and "DISPATCHED" in content
    call(
        signed, f"packing/deliveries/{d['id']}/documents", op(kind="PACKING_LIST"), 409
    )
    d = sales(signed, f"deliveries/{d['id']}/dispatch", op())
    doc = issue(signed, d)
    assert doc["snapshot"]["lines"][0]["dispatched"] == "6"
    before = pdf(signed, f"packing/documents/{doc['id']}/download")[0].content
    sales(signed, f"deliveries/{d['id']}/reverse", op(goods_returned_to_origin=True))
    current = call(signed, f"packing/documents/{doc['id']}")
    assert current["source_reversed"]
    after = pdf(signed, f"packing/documents/{doc['id']}/download")[0]
    assert (
        after.content == before and after.headers["x-ambs-source-status"] == "REVERSED"
    )
    assert call(signed, f"packing/documents/{doc['id']}/void", op())["status"] == "VOID"
    with security_db[0]() as db:
        with pytest.raises(IntegrityError):
            db.execute(text("UPDATE packing_documents SET reason=reason"))
            db.flush()


def test_document_replacement_and_actor_bound_idempotency(signed, stock, accounts):
    receipt(signed, stock, 8)
    d = dispatch(signed, prepare(signed, stock, order(signed, stock)))
    body = op(kind="PACKING_LIST")
    path = f"packing/deliveries/{d['id']}/documents"
    doc = call(signed, path, body, 201)
    assert call(signed, path, body, 201)["id"] == doc["id"]
    call(signed, path, op(kind="PACKING_LIST"), 409)
    replacement = issue(signed, d, replaces_id=doc["id"])
    assert replacement["revision"] == 2 and replacement["previous_id"] == doc["id"]
    assert call(signed, f"packing/documents/{doc['id']}")["status"] == "REPLACED"
    assert login(signed, accounts, "test.operations").status_code == 200
    call(signed, path, body, 409)


def test_concurrent_issue_single_effect(signed, stock, accounts):
    receipt(signed, stock, 8)
    d = dispatch(signed, prepare(signed, stock, order(signed, stock)))
    barrier = Barrier(2)
    body = op(kind="PACKING_LIST")

    def worker(_):
        with TestClient(app, base_url=ORIGIN, headers={"Origin": ORIGIN}) as client:
            assert login(client, accounts).status_code == 200
            headers = csrf(client)
            barrier.wait()
            r = client.post(
                f"/api/packing/deliveries/{d['id']}/documents",
                json=body,
                headers=headers,
            )
            return r.status_code, r.json().get("id")

    with ThreadPoolExecutor(2) as pool:
        results = list(pool.map(worker, range(2)))
    assert results[0][0] == results[1][0] == 201 and results[0][1] == results[1][1]
    assert len(call(signed, f"packing/deliveries/{d['id']}/documents")["items"]) == 1


def test_missing_bom_approval_shortage_recalculation_no_stock_effect(
    signed, stock, security_db
):
    receipt(signed, stock, 6)
    assembly(signed, stock)
    source = order(signed, stock, "5")
    before = ledger(security_db[0])
    body = op(sales_order_id=source["id"])
    missing = call(signed, "material-plans", body, 201)
    assert missing["status"] == "AWAITING_APPROVED_BOM" and missing["lines"] == []
    row = call(signed, "boms", bom_data(stock), 201)
    call(signed, f"boms/{row['id']}/approve", op(specification_confirmed=True), 409)
    call(signed, f"boms/{row['id']}/submit", op())
    call(signed, f"boms/{row['id']}/approve", op(), 422)
    call(signed, f"boms/{row['id']}/approve", op(specification_confirmed=True))
    plan = call(
        signed,
        "material-plans",
        op(sales_order_id=source["id"], previous_id=missing["id"]),
        201,
    )
    line = plan["lines"][0]
    assert (
        Decimal(line["required"]) == 10
        and Decimal(line["available"]) == 6
        and Decimal(line["shortage"]) == 4
    )
    assert plan["status"] == "PARTIALLY_AVAILABLE" and not plan["stale"]
    call(signed, f"material-plans/{plan['id']}/review", op())
    assert ledger(security_db[0]) == before
    call(signed, f"boms/{row['id']}", bom_data(stock), 409, method="patch")
    receipt(signed, {**stock, "item": stock["component"]}, 4)
    assert call(signed, f"material-plans/{plan['id']}")["stale"]
    fresh = call(
        signed,
        "material-plans",
        op(sales_order_id=source["id"], previous_id=plan["id"]),
        201,
    )
    assert (
        fresh["status"] == "AVAILABLE" and Decimal(fresh["lines"][0]["available"]) == 10
    )


@pytest.mark.parametrize("bad", ["self", "negative", "precision", "unit", "duplicate"])
def test_invalid_bom_inputs(signed, stock, bad):
    assembly(signed, stock)
    body = bom_data(stock)
    component = body["components"][0]
    if bad == "self":
        component["item_id"] = stock["item"]["id"]
    if bad == "negative":
        component["quantity"] = "-1"
    if bad == "precision":
        component["quantity"] = "1.2"
    if bad == "unit":
        component["unit_id"] = master_post(
            signed, "units", dict(name="Other", decimal_places=0)
        )["id"]
    if bad == "duplicate":
        body["components"].append(dict(component))
    call(signed, "boms", body, 422)


def test_bom_revision_preserves_approval_and_old_plan(signed, stock, security_db):
    assembly(signed, stock)
    source = order(signed, stock, "5")
    first = approve(signed, call(signed, "boms", bom_data(stock), 201))
    plan = call(signed, "material-plans", op(sales_order_id=source["id"]), 201)
    body = bom_data(stock, previous_id=first["id"])
    body["components"][0]["quantity"] = "3"
    second = approve(signed, call(signed, "boms", body, 201))
    assert (
        second["revision"] == 2
        and call(signed, f"boms/{first['id']}")["status"] == "SUPERSEDED"
    )
    old = call(signed, f"material-plans/{plan['id']}")
    assert old["stale"] and Decimal(old["lines"][0]["required"]) == 10
    with security_db[0]() as db:
        with pytest.raises(IntegrityError):
            db.execute(
                text("UPDATE bom_components SET quantity=4 WHERE bom_id=:id"),
                dict(id=second["id"]),
            )


@pytest.mark.parametrize(
    "role", ["PACKING", "OPERATIONS", "MANAGEMENT", "SALES", "DRIVER", "ACCOUNTS"]
)
def test_role_permissions_and_driver_idor(signed, stock, security_db, accounts, role):
    receipt(signed, stock, 8)
    d = dispatch(signed, prepare(signed, stock, order(signed, stock)))
    doc = issue(signed, d)
    with security_db[0]() as db:
        user = db.get(User, accounts["operator"])
        user.roles = [db.scalar(select(Role).where(Role.code == role))]
        db.commit()
    assert login(signed, accounts, "test.operations").status_code == 200
    allowed = role not in {"ACCOUNTS", "DRIVER"}
    call(
        signed,
        f"packing/documents/{doc['id']}",
        status=200 if allowed else 404 if role == "DRIVER" else 403,
    )
    call(
        signed,
        f"packing/documents/{doc['id']}/download",
        status=200 if allowed else 404 if role == "DRIVER" else 403,
    ) if not allowed else None
    if role != "OPERATIONS":
        call(
            signed,
            f"packing/deliveries/{d['id']}/documents",
            op(kind="DELIVERY_ORDER"),
            403,
        )
    if role not in {"OPERATIONS", "MANAGEMENT"}:
        call(signed, "boms", status=403)
    if role != "MANAGEMENT":
        call(
            signed,
            f"boms/{uuid.uuid4()}/approve",
            op(specification_confirmed=True),
            403,
        )


def test_procurement_receipt_reserved_blocked_and_external_separation(
    signed, stock, suppliers, security_db
):
    receipt(signed, stock, 10)
    reserved_order = order(signed, stock, "4")
    prepare(signed, stock, reserved_order)
    receipt(signed, stock, 9, kind="RETURN", destination=stock["quarantine"]["id"])
    custody = external(signed, stock, suppliers[0], "Synthetic external custody")
    second_custody = external(signed, stock, suppliers[1], "Synthetic second custody")
    owned = production(
        signed,
        stock,
        suppliers,
        "AMBS",
        locations=[custody, second_custody],
        quantity="3",
    )
    production_stage(
        signed, owned["stages"][0]["id"], "start", "3", source_id=stock["storage"]["id"]
    )
    purchasing_stock = dict(stock)
    purchase, _ = po(signed, purchasing_stock, suppliers, "8")
    assembly(signed, stock)
    source = order(signed, stock, "5")
    approve(signed, call(signed, "boms", bom_data(stock), 201))
    before = ledger(security_db[0])
    plan = call(signed, "material-plans", op(sales_order_id=source["id"]), 201)
    line = plan["lines"][0]
    assert (
        Decimal(line["usable_on_hand"]) == 7
        and Decimal(line["reserved"]) == 4
        and Decimal(line["available"]) == 3
    )
    assert (
        Decimal(line["unavailable_on_hand"]) == 9
        and Decimal(line["external_custody"]) == 3
        and Decimal(line["expected_incoming"]) == 8
    )
    assert ledger(security_db[0]) == before
    purchase_receipt(signed, purchase, "2", stock["storage"]["id"])
    assert call(signed, f"material-plans/{plan['id']}")["stale"]
    fresh = call(
        signed,
        "material-plans",
        op(sales_order_id=source["id"], previous_id=plan["id"]),
        201,
    )
    assert (
        Decimal(fresh["lines"][0]["available"]) == 5
        and Decimal(fresh["lines"][0]["expected_incoming"]) == 6
    )


def test_shared_components_round_once_after_aggregation_and_production_demand(
    signed, stock, suppliers
):
    assembly(signed, stock)
    body = bom_data(stock)
    body["output_quantity"] = "3"
    body["components"][0]["quantity"] = "1"
    approve(signed, call(signed, "boms", body, 201))
    second = master_post(
        signed,
        "items",
        dict(
            name="Second synthetic assembly",
            item_type="finished",
            category_id=stock["category"]["id"],
            unit_id=stock["unit"]["id"],
        ),
    )
    body = bom_data({**stock, "item": second})
    body["output_quantity"] = "3"
    body["components"][0]["quantity"] = "1"
    approve(signed, call(signed, "boms", body, 201))
    customer = master_post(signed, "customers", dict(name="Synthetic shared demand"))
    source = sales(
        signed,
        "orders",
        op(
            customer_id=customer["id"],
            lines=[
                dict(item_id=stock["item"]["id"], quantity="1"),
                dict(item_id=second["id"], quantity="1"),
            ],
        ),
        201,
    )
    sales(signed, f"orders/{source['id']}/confirm", op())
    p = call(signed, "material-plans", op(sales_order_id=source["id"]), 201)
    assert len(p["lines"]) == 1 and Decimal(p["lines"][0]["required"]) == 1
    purchase, _ = po(signed, stock, suppliers, "100")
    prod = production(signed, stock, suppliers, "SUPPLIER", purchase["lines"][0]["id"])
    production_stage(signed, prod["stages"][0]["id"], "start", "100")
    result = call(signed, "material-plans", op(production_order_id=prod["id"]), 201)
    assert (
        result["source"]["type"] == "production_order"
        and result["source"]["ownership"] == "SUPPLIER"
    )
    assert result["lines"] and result["source"]["demands"][0]["basis"].startswith(
        "Full production target"
    )


def test_assigned_driver_download_and_untrusted_fields(
    signed, stock, accounts, security_db
):
    receipt(signed, stock, 8)
    source = order(signed, stock)
    d = prepare(signed, stock, source)
    with security_db[0]() as db:
        user = db.get(User, accounts["operator"])
        user.roles = [db.scalar(select(Role).where(Role.code == "DRIVER"))]
        db.commit()
    call(
        signed,
        f"routing/deliveries/{d['id']}/assign",
        op(driver_id=str(accounts["operator"])),
    )
    dispatch(signed, d)
    doc = issue(signed, d)
    call(
        signed,
        f"packing/deliveries/{d['id']}/documents",
        dict(op(kind="DELIVERY_ORDER"), lines=[{"quantity": "999"}]),
        422,
    )
    assert login(signed, accounts, "test.operations").status_code == 200
    assert call(signed, f"packing/documents/{doc['id']}")["id"] == doc["id"]
    assert pdf(signed, f"packing/documents/{doc['id']}/download")[0].status_code == 200
    assert call(signed, "packing/deliveries")["items"][0]["id"] == d["id"]


def test_pdf_multipage_escaped_text_and_images(tmp_path):
    import base64
    from PIL import Image
    from app.services.packing_pdf import render

    image = io.BytesIO()
    Image.new("RGB", (160, 80), "#CC0605").save(image, format="PNG")
    line = dict(
        name="Synthetic <b>literal</b> & long component description " * 3,
        code="SYNTHETIC",
        unit="PCS",
        dispatched="8",
        planned="8",
        picked="8",
        loaded="6",
        image=base64.b64encode(image.getvalue()).decode(),
        lot="SYNTHETIC LOT",
    )
    snapshot = dict(
        reference="PL-SYNTHETIC-QUALITY",
        revision=1,
        official=True,
        kind="PACKING_LIST",
        timestamp="2026-11-17 12:00:00",
        employee="Synthetic employee",
        customer="Synthetic customer " * 16,
        lines=[line] * 45,
        remaining=[],
    )
    result = render(snapshot)
    reader = PdfReader(io.BytesIO(result))
    assert len(reader.pages) > 2
    content = " ".join(p.extract_text() for p in reader.pages)
    assert "<b>literal</b> &" in content and all(
        "Page " in p.extract_text() for p in reader.pages
    )
    assert sum(len(p.images) for p in reader.pages) > 0
    assert sum("DISPATCHED" in p.extract_text() for p in reader.pages) > 1
    # Optional ignored visual-review export, never written into the source tree.
    import os

    directory = os.getenv("PHASE7_PDF_ARTIFACTS")
    if directory:
        from pathlib import Path

        target = Path(directory)
        target.mkdir(parents=True, exist_ok=True)
        for name, changes in [
            ("multipage", {}),
            ("normal", {"lines": [line]}),
            ("missing-image", {"lines": [{**line, "image": None}]}),
            (
                "preparation",
                {"official": False, "lines": [{**line, "dispatched": "0"}]},
            ),
        ]:
            (target / (name + ".pdf")).write_bytes(render({**snapshot, **changes}))


def test_submitted_bom_preserves_master_unit_and_variant_identity(signed, stock):
    assembly(signed, stock)
    family = master_post(
        signed,
        "families",
        {
            "name": "Synthetic approved variants",
            "attribute_definitions": {"design": ["std", "maxi"]},
        },
    )
    body = dict(
        name=stock["item"]["name"],
        item_type="finished",
        category_id=stock["category"]["id"],
        unit_id=stock["unit"]["id"],
        family_id=family["id"],
        attributes={"design": "std"},
    )
    endpoint = f"/api/master/items/{stock['item']['id']}"
    assert signed.put(endpoint, json=body, headers=csrf(signed)).status_code == 200
    approve(signed, call(signed, "boms", bom_data(stock), 201))
    new_unit = master_post(
        signed, "units", {"name": "Other synthetic unit", "decimal_places": 0}
    )
    for changes in [{"attributes": {"design": "maxi"}}, {"unit_id": new_unit["id"]}]:
        response = signed.put(endpoint, json={**body, **changes}, headers=csrf(signed))
        assert (
            response.status_code == 409
            and response.json()["error"]["code"] == "BOM_IDENTITY_LOCKED"
        )
    response = signed.put(
        f"/api/master/units/{stock['unit']['id']}",
        json={"name": stock["unit"]["name"], "decimal_places": 1},
        headers=csrf(signed),
    )
    assert (
        response.status_code == 409
        and response.json()["error"]["code"] == "BOM_IDENTITY_LOCKED"
    )
    component = stock["component"]
    response = signed.put(
        f"/api/master/items/{component['id']}",
        json=dict(
            name=component["name"],
            item_type="component",
            category_id=stock["category"]["id"],
            unit_id=new_unit["id"],
        ),
        headers=csrf(signed),
    )
    assert (
        response.status_code == 409
        and response.json()["error"]["code"] == "BOM_IDENTITY_LOCKED"
    )
    assert (
        signed.put(
            endpoint,
            json={**body, "name": "Renamed synthetic assembly"},
            headers=csrf(signed),
        ).status_code
        == 200
    )
    options = call(signed, f"manufacturing/options/items?selected_id={component['id']}")
    assert options["items"][0]["id"] == component["id"]
