import base64
import io
import uuid
from concurrent.futures import ThreadPoolExecutor

import pytest
from PIL import Image
from sqlalchemy import select, text
from sqlalchemy.exc import IntegrityError

from app.core.config import get_settings
from app.models.master import ItemImage, Lpo
from app.models.security import AuditEvent, Role, User
from tests.test_security import security_db, accounts, browser, login, csrf  # noqa: F401

pytestmark = pytest.mark.integration


def post(client, resource, data, status=201):
    response = client.post(f"/api/master/{resource}", json=data, headers=csrf(client))
    assert response.status_code == status, response.text
    return response.json()


@pytest.fixture
def signed(browser, accounts):
    assert login(browser, accounts).status_code == 200
    return browser


@pytest.fixture
def catalog(signed):
    category = post(signed, "categories", {"name": "Synthetic Safety"})
    unit = post(signed, "units", {"name": "Pieces", "decimal_places": 0})
    family = post(
        signed,
        "families",
        {
            "name": "Synthetic Net",
            "attribute_definitions": {
                "design": ["STD", "MAXI"],
                "length": ["4.0 m", "6.0 m"],
                "colour": ["Yellow", "Red"],
            },
        },
    )
    item = {
        "name": "Synthetic STD",
        "item_type": "finished",
        "category_id": category["id"],
        "unit_id": unit["id"],
        "family_id": family["id"],
        "attributes": {"design": "STD", "length": "4.0 m", "colour": "Yellow"},
    }
    return category, unit, family, item


def test_customer_lifecycle_duplicate_and_search(signed):
    customer = post(signed, "customers", {"name": "  China   STATE  "})
    assert customer["normalized_name"] == "china state"
    assert (
        signed.get(
            "/api/master/customers/duplicates", params={"name": "china STATE"}
        ).json()[0]["id"]
        == customer["id"]
    )
    conflict = post(signed, "customers", {"name": "China state"}, 409)
    assert conflict["error"]["code"] == "POSSIBLE_DUPLICATE"
    post(
        signed, "customers", {"name": "China State", "acknowledge_duplicate": True}, 409
    )
    distinct = post(
        signed,
        "customers",
        {
            "name": "China State",
            "acknowledge_duplicate": True,
            "duplicate_reason": "Different registered entity confirmed",
        },
    )
    assert distinct["id"] != customer["id"]
    result = signed.get(
        "/api/master/customers?search=CHINA%20%20state&page_size=1&sort=code&direction=desc"
    ).json()
    assert result["total"] == 2 and len(result["items"]) == 1
    updated = signed.put(
        f"/api/master/customers/{customer['id']}",
        json={"name": "Updated test company", "trn": "123456789012345"},
        headers=csrf(signed),
    )
    assert updated.status_code == 200 and updated.json()["code"] == customer["code"]
    for active in [False, True]:
        response = signed.patch(
            f"/api/master/customers/{customer['id']}/activation",
            json={"is_active": active},
            headers=csrf(signed),
        )
        assert response.status_code == 200 and response.json()["is_active"] == active
    assert (
        signed.delete(
            f"/api/master/customers/{customer['id']}", headers=csrf(signed)
        ).status_code
        == 405
    )
    assert signed.get("/api/master/customers?sort=password_hash").status_code == 422
    assert signed.get("/api/master/customers?search=%25").json()["total"] == 0


def test_projects_lpos_and_database_relationships(signed, security_db):
    customer = post(signed, "customers", {"name": "Synthetic customer"})
    other = post(signed, "customers", {"name": "Other customer"})
    projects = [
        post(
            signed, "projects", {"name": f"Project {i}", "customer_id": customer["id"]}
        )
        for i in range(3)
    ]
    for i, project in enumerate(projects):
        post(
            signed,
            "lpos",
            {
                "name": "Site LPO",
                "number": f"REF {i}",
                "customer_id": customer["id"],
                "project_id": project["id"],
            },
        )
    post(
        signed,
        "lpos",
        {
            "name": "Wrong",
            "number": "bad",
            "customer_id": other["id"],
            "project_id": projects[0]["id"],
        },
        422,
    )
    post(
        signed,
        "lpos",
        {"name": "Duplicate", "number": " ref   0 ", "customer_id": customer["id"]},
        409,
    )
    post(
        signed,
        "lpos",
        {"name": "Unrelated issuer", "number": "ref 0", "customer_id": other["id"]},
    )
    assert (
        signed.get(f"/api/master/projects?customer_id={customer['id']}").json()["total"]
        == 3
    )
    response = signed.put(
        f"/api/master/projects/{projects[0]['id']}",
        json={"name": "Reassigned", "customer_id": other["id"]},
        headers=csrf(signed),
    )
    assert response.status_code == 409
    assert (
        signed.patch(
            f"/api/master/projects/{projects[0]['id']}/activation",
            json={"is_active": False},
            headers=csrf(signed),
        ).json()["status"]
        == "archived"
    )
    maker, _ = security_db
    with maker() as db:
        db.add(
            Lpo(
                id=uuid.uuid4(),
                code="TEST-INVALID",
                name="bad FK",
                number="x",
                normalized_number="x",
                status="active",
                customer_id=uuid.UUID(other["id"]),
                project_id=uuid.UUID(projects[0]["id"]),
                created_by=db.scalar(
                    select(User.id).where(User.username == "test.admin")
                ),
            )
        )
        with pytest.raises(IntegrityError):
            db.commit()
        db.rollback()
        with pytest.raises(IntegrityError):
            db.execute(
                text("DELETE FROM customers WHERE id=:id"), {"id": customer["id"]}
            )
            db.commit()


def test_items_variant_validation_and_reference_integrity(signed, catalog):
    category, unit, family, item = catalog
    created = post(signed, "items", item)
    assert created["attributes"]["design"] == "std" and created["colour"] == "yellow"
    post(
        signed,
        "items",
        {
            **item,
            "name": "Duplicate spelling",
            "attributes": {"design": " std ", "length": "4.0 m", "colour": "YELLOW"},
        },
        409,
    )
    post(signed, "items", {**item, "attributes": {"design": "UNAPPROVED"}}, 422)
    post(signed, "items", {**item, "colour": "red"}, 422)
    post(signed, "items", {**item, "weight_kg": -1}, 422)
    post(signed, "items", {**item, "family_id": None}, 422)
    second = post(
        signed,
        "items",
        {**item, "attributes": {"design": "maxi", "length": "6.0 m", "colour": "red"}},
    )
    assert second["id"] != created["id"] and second["code"] != created["code"]
    assert (
        signed.get(
            f"/api/master/items?family_id={family['id']}&attribute_key=design&attribute_value=MAXI"
        ).json()["total"]
        == 1
    )
    assert (
        signed.put(
            f"/api/master/families/{family['id']}",
            json={
                "name": "Invalid revision",
                "attribute_definitions": {"design": ["other"]},
            },
            headers=csrf(signed),
        ).status_code
        == 422
    )
    response = signed.put(
        f"/api/master/items/{created['id']}",
        json={**item, "name": "Revised item"},
        headers=csrf(signed),
    )
    assert response.status_code == 200 and response.json()["code"] == created["code"]
    assert (
        signed.patch(
            f"/api/master/items/{created['id']}/activation",
            json={"is_active": False},
            headers=csrf(signed),
        ).json()["is_active"]
        is False
    )
    assert (
        signed.patch(
            f"/api/master/units/{unit['id']}/activation",
            json={"is_active": False},
            headers=csrf(signed),
        ).status_code
        == 200
    )
    post(signed, "items", {**item, "family_id": None, "attributes": {}}, 422)


def test_category_cycles_in_api_and_database(signed, security_db):
    parent = post(signed, "categories", {"name": "Parent"})
    child = post(signed, "categories", {"name": "Child", "parent_id": parent["id"]})
    assert (
        signed.put(
            f"/api/master/categories/{parent['id']}",
            json={"name": "Parent", "parent_id": child["id"]},
            headers=csrf(signed),
        ).status_code
        == 422
    )
    maker, _ = security_db
    with maker() as db, pytest.raises(IntegrityError):
        db.execute(
            text("UPDATE product_categories SET parent_id=:child WHERE id=:parent"),
            {"parent": parent["id"], "child": child["id"]},
        )
        db.commit()


@pytest.mark.parametrize(
    "role,can_read,can_write",
    [
        ("SUPER_ADMIN", True, True),
        ("OPERATIONS", True, True),
        ("SALES", True, False),
        ("ACCOUNTS", True, False),
        ("PACKING", False, False),
        ("MANAGEMENT", True, False),
        ("DRIVER", False, False),
    ],
)
def test_business_role_authorization(
    browser, accounts, security_db, role, can_read, can_write
):
    assert login(browser, accounts).status_code == 200
    existing = post(browser, "customers", {"name": "Restricted customer"})
    maker, _ = security_db
    with maker() as db:
        operator = db.get(User, accounts["operator"])
        operator.roles = [db.scalar(select(Role).where(Role.code == role))]
        db.commit()
    assert login(browser, accounts, "test.operations").status_code == 200
    assert browser.get("/api/master/customers").status_code == (
        200 if can_read else 403
    )
    for method, path, body, expected in [
        ("post", "/api/master/customers", {"name": "New"}, 201),
        ("put", f"/api/master/customers/{existing['id']}", {"name": "Edited"}, 200),
        (
            "patch",
            f"/api/master/customers/{existing['id']}/activation",
            {"is_active": False},
            200,
        ),
    ]:
        response = getattr(browser, method)(path, json=body, headers=csrf(browser))
        assert response.status_code == (expected if can_write else 403)
    if role == "OPERATIONS":
        assert browser.get("/api/users").status_code == 403
        assert browser.get("/api/audit").status_code == 403


def test_unauthenticated_csrf_audit_atomicity(browser, accounts, security_db):
    assert browser.get("/api/master/items").status_code == 401
    assert login(browser, accounts).status_code == 200
    assert (
        browser.post("/api/master/customers", json={"name": "Unsafe"}).status_code
        == 403
    )
    row = post(browser, "customers", {"name": "Audited"})
    post(browser, "customers", {"name": "Audited"}, 409)
    maker, _ = security_db
    with maker() as db:
        events = db.scalars(
            select(AuditEvent).where(AuditEvent.target_id == uuid.UUID(row["id"]))
        ).all()
        assert len(events) == 1 and events[0].action == "customers.created"
        assert events[0].actor_id == accounts["admin"] and events[0].details["fields"]
        assert "Audited" not in str(events[0].details)


def png():
    buffer = io.BytesIO()
    Image.new("RGB", (12, 8), "yellow").save(buffer, format="PNG")
    return buffer.getvalue()


def test_image_upload_replacement_privacy_and_persistence(
    signed, catalog, monkeypatch, tmp_path, security_db
):
    monkeypatch.setattr(get_settings(), "image_storage_dir", str(tmp_path))
    item = post(signed, "items", catalog[3])
    endpoint = f"/api/master/items/{item['id']}/image"
    assert signed.get(endpoint).status_code == 404
    payload = {
        "mime_type": "image/png",
        "content_base64": base64.b64encode(png()).decode(),
    }
    first = signed.put(endpoint, json=payload, headers=csrf(signed))
    assert first.status_code == 200 and "storage_key" not in first.json()
    image = signed.get(endpoint)
    assert image.status_code == 200 and image.headers["content-type"] == "image/png"
    Image.open(io.BytesIO(image.content)).verify()
    assert (
        signed.put(
            endpoint, json={**payload, "mime_type": "image/jpeg"}, headers=csrf(signed)
        ).status_code
        == 422
    )
    assert (
        signed.put(
            endpoint,
            json={
                **payload,
                "content_base64": base64.b64encode(b"not an image").decode(),
            },
            headers=csrf(signed),
        ).status_code
        == 422
    )
    assert (
        signed.put(
            endpoint,
            json={**payload, "filename": "../../unsafe.png"},
            headers=csrf(signed),
        ).status_code
        == 422
    )
    assert (
        signed.put(
            endpoint,
            json={
                **payload,
                "content_base64": base64.b64encode(
                    b"x" * (5 * 1024 * 1024 + 1)
                ).decode(),
            },
            headers=csrf(signed),
        ).status_code
        == 413
    )
    second = signed.put(endpoint, json=payload, headers=csrf(signed))
    assert second.json()["id"] == first.json()["id"]
    assert len(list(tmp_path.iterdir())) == 2
    assert all(
        len(path.stem) == 32 and path.suffix == ".png" for path in tmp_path.iterdir()
    )
    maker, _ = security_db
    with maker() as db:
        stored = db.scalar(
            select(ItemImage).where(ItemImage.item_id == uuid.UUID(item["id"]))
        )
        assert (tmp_path / stored.storage_key).exists()
        assert stored.byte_size == len(signed.get(endpoint).content)
    signed.post("/api/auth/logout", json={}, headers=csrf(signed))
    assert signed.get(endpoint).status_code == 401


def test_concurrent_codes_are_unique(security_db, accounts, catalog):
    from app.core.security import SecurityContext, effective_permissions
    from app.schemas.master import CustomerInput, ItemInput
    from app.services.master import save

    maker, _ = security_db

    def create(index):
        with maker() as db:
            user = db.get(User, accounts["admin"])
            context = SecurityContext(user, None, effective_permissions(user))
            customer = save(
                db, context, "customers", CustomerInput(name=f"Test {index}")
            )
            item = save(
                db,
                context,
                "items",
                ItemInput(
                    **{
                        **catalog[3],
                        "family_id": None,
                        "attributes": {},
                        "name": f"Component {index}",
                    }
                ),
            )
            return customer["code"], item["code"]

    with ThreadPoolExecutor(max_workers=5) as workers:
        codes = list(workers.map(create, range(20)))
    assert len(set(codes)) == 20
    assert len({customer for customer, _ in codes}) == 20
    assert len({item for _, item in codes}) == 20


def test_failed_image_commit_preserves_previous_file(
    signed, catalog, monkeypatch, tmp_path
):
    from sqlalchemy.exc import SQLAlchemyError
    import app.api.images as images

    monkeypatch.setattr(get_settings(), "image_storage_dir", str(tmp_path))
    item = post(signed, "items", catalog[3])
    endpoint = f"/api/master/items/{item['id']}/image"
    payload = {
        "mime_type": "image/png",
        "content_base64": base64.b64encode(png()).decode(),
    }
    assert signed.put(endpoint, json=payload, headers=csrf(signed)).status_code == 200
    before = signed.get(endpoint).content

    def fail(db):
        raise SQLAlchemyError()

    monkeypatch.setattr(images, "commit", fail)
    assert signed.put(endpoint, json=payload, headers=csrf(signed)).status_code == 503
    assert signed.get(endpoint).content == before
    assert len(list(tmp_path.iterdir())) == 1


def test_streamed_request_limit_precedes_json_parsing(signed):
    oversized = (b"x" * 8192 for _ in range(3))
    response = signed.post(
        "/api/master/customers",
        content=oversized,
        headers={**csrf(signed), "Content-Type": "application/json"},
    )
    assert response.status_code == 413


def test_image_metadata_and_trailing_content_are_removed():
    from PIL.PngImagePlugin import PngInfo
    from app.api.images import verified_image
    from app.schemas.master import ImageInput

    data = io.BytesIO()
    metadata = PngInfo()
    metadata.add_text("Description", "Synthetic untrusted metadata")
    Image.new("RGB", (10, 10), "red").save(data, format="PNG", pnginfo=metadata)
    encoded, width, height = verified_image(
        ImageInput(
            mime_type="image/png",
            content_base64=base64.b64encode(
                data.getvalue() + b"trailing-untrusted-bytes"
            ).decode(),
        )
    )
    assert (width, height) == (10, 10)
    assert b"untrusted" not in encoded
    assert not Image.open(io.BytesIO(encoded)).info


def test_read_only_role_cannot_mutate_any_master_resource(
    signed, catalog, accounts, security_db
):
    customer = post(signed, "customers", {"name": "Permission test customer"})
    project = post(
        signed,
        "projects",
        {"name": "Permission project", "customer_id": customer["id"]},
    )
    lpo = post(
        signed,
        "lpos",
        {"name": "Permission LPO", "number": "P-1", "customer_id": customer["id"]},
    )
    item = post(signed, "items", catalog[3])
    maker, _ = security_db
    with maker() as db:
        user = db.get(User, accounts["operator"])
        user.roles = [db.scalar(select(Role).where(Role.code == "SALES"))]
        db.commit()
    assert login(signed, accounts, "test.operations").status_code == 200
    entries = [
        ("customers", customer, {"name": "Forbidden"}),
        ("projects", project, {"name": "Forbidden", "customer_id": customer["id"]}),
        (
            "lpos",
            lpo,
            {"name": "Forbidden", "number": "P-2", "customer_id": customer["id"]},
        ),
        ("items", item, catalog[3]),
        ("categories", catalog[0], {"name": "Forbidden"}),
        ("units", catalog[1], {"name": "Forbidden"}),
        ("families", catalog[2], {"name": "Forbidden"}),
    ]
    for resource, row, payload in entries:
        assert signed.get(f"/api/master/{resource}").status_code == 200
        assert (
            signed.post(
                f"/api/master/{resource}", json=payload, headers=csrf(signed)
            ).status_code
            == 403
        )
        assert (
            signed.put(
                f"/api/master/{resource}/{row['id']}",
                json=payload,
                headers=csrf(signed),
            ).status_code
            == 403
        )
        if resource != "lpos":
            assert (
                signed.patch(
                    f"/api/master/{resource}/{row['id']}/activation",
                    json={"is_active": False},
                    headers=csrf(signed),
                ).status_code
                == 403
            )
    assert (
        signed.put(
            f"/api/master/items/{item['id']}/image",
            json={
                "mime_type": "image/png",
                "content_base64": base64.b64encode(png()).decode(),
            },
            headers=csrf(signed),
        ).status_code
        == 403
    )
    with maker() as db:
        denied = db.scalars(
            select(AuditEvent).where(
                AuditEvent.actor_id == accounts["operator"],
                AuditEvent.action == "security.denied",
            )
        ).all()
        assert len(denied) == 21
