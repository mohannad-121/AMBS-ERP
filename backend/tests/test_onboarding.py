"""Synthetic files only. No original company files or main-database imports."""
import base64
import csv
import io
import json
import zipfile
from xml.sax.saxutils import escape
import pytest
from sqlalchemy import select, text, event
from app.api.onboarding import Upload, Validation
from app.core.security import SecurityError
from app.models.security import AuditEvent
from app.services.onboarding import inspect_file, validate, validation_csv
from app.services.onboarding_files import read_file, decode, col
from tests.test_security import security_db, accounts, browser, csrf, login  # noqa: F401
from tests.test_master import signed, post  # noqa: F401
from tests.test_inventory import stock  # noqa: F401


def payload(text_value="Name,Email\nSynthetic New,new@example.com\n", category="customers", **kwargs):
    return {"category": category, "filename": "synthetic.csv", "content_base64": base64.b64encode(text_value.encode("utf-8")).decode(), **kwargs}


def validation(text_value="Name,Email\nSynthetic New,new@example.com\n", category="customers", **kwargs):
    return Validation(**payload(text_value, category, sheet=0, header_row=1, mapping={"name": "A", "email": "B"}, **kwargs))


def book(rows, *, formula=False, date_style=False, external=False, extra=None, encoding="utf-8"):
    """Minimal inert OOXML fixture; generated structurally, never executed."""
    entries = {
        "[Content_Types].xml": '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/></Types>',
        "xl/workbook.xml": '<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="Synthetic" sheetId="1" r:id="rId1"/></sheets></workbook>',
        "xl/_rels/workbook.xml.rels": '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Target="worksheets/sheet1.xml"' + (' TargetMode="External"' if external else '') + '/></Relationships>',
        "xl/styles.xml": '<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><cellXfs><xf numFmtId="0"/><xf numFmtId="14"/></cellXfs></styleSheet>',
    }
    content = '<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData>'
    for number, values in enumerate(rows, 1):
        content += f'<row r="{number}">'
        for i, value in enumerate(values):
            address = col(i) + str(number)
            if formula and number == 2 and i == 0:
                content += f'<c r="{address}"><f>1+1</f><v>2</v></c>'
            elif date_style and number == 2 and i == 0:
                content += f'<c r="{address}" s="1"><v>{escape(str(value))}</v></c>'
            else:
                content += f'<c r="{address}" t="inlineStr"><is><t>{escape(str(value))}</t></is></c>'
        content += '</row>'
    entries["xl/worksheets/sheet1.xml"] = content + '</sheetData></worksheet>'
    entries.update(extra or {})
    out = io.BytesIO()
    with zipfile.ZipFile(out, "w", zipfile.ZIP_DEFLATED) as z:
        for name, value in entries.items(): z.writestr(name, value.encode(encoding) if isinstance(value, str) else value)
    return out.getvalue()


def api(client, path, body, status=200):
    response = client.post("/api/onboarding/" + path, json=body, headers=csrf(client))
    assert response.status_code == status, response.text
    return response


def test_unicode_normalization_duplicates_and_report_never_mutate(security_db):
    maker, _ = security_db
    data = validation("Name,Email\n  Synthetic New  ,new@example.com\nSynthetic New,new@example.com\nشركة تجريبية,arabic@example.com\n")
    with maker() as db:
        first = validate(data, db); second = validate(data, db)
        assert first == second
        assert first["summary"]["total"] == 3 and first["summary"]["possible_duplicates"] == 1
        assert first["records"][0]["original"]["name"] == "  Synthetic New  "
        assert first["records"][0]["proposed"]["name"] == "Synthetic New"
        assert first["records"][2]["proposed"]["name"] == "شركة تجريبية"
        assert db.scalar(text("SELECT count(*) FROM customers")) == 0
        assert db.scalar(text("SELECT count(*) FROM stock_ledger_effects")) == 0
        assert first["mutations"] == {"business_records": 0, "stock_ledger": 0}
        assert first["summary"]["would_import"] == 0


@pytest.mark.parametrize("filename,raw", [("bad.xls", b"not xlsx"), ("file.xlsm", b"not xlsx"), ("bad.html", b"<script>"), ("../file.csv", b"x"), ("C:\\file.csv", b"x"), ("bad.csv", b"\xff\x00"), ("bad.xlsx", b"PKnotzip")])
def test_invalid_types_paths_and_encodings(filename, raw):
    with pytest.raises(SecurityError):
        data = decode(filename, base64.b64encode(raw).decode()); read_file(filename, data)


@pytest.mark.parametrize("extra", [{"xl/vbaProject.bin": b"macro"}, {"xl/connections.xml": "<connections/>"}, {"../file.xml": "<bad/>"}, {"xl/worksheets/sheet1.xml": '<!DOCTYPE a [<!ENTITY x "bad">]><a>&x;</a>'}])
def test_active_and_unsafe_archive_content_is_rejected(extra):
    with pytest.raises(SecurityError): read_file("safe.xlsx", book([["Name"], ["Synthetic"]], extra=extra))


def test_utf16_entity_declaration_and_external_links_rejected():
    with pytest.raises(SecurityError): read_file("safe.xlsx", book([["Name"]], encoding="utf-16", extra={"xl/worksheets/sheet1.xml": '<!DOCTYPE a [<!ENTITY x "bad">]><a>&x;</a>'}))
    with pytest.raises(SecurityError): read_file("safe.xlsx", book([["Name"]], external=True))


def test_formula_not_cached_value_and_csv_export_safety(security_db):
    maker, _ = security_db
    raw = book([["Name"], ["ignored"]], formula=True)
    data = Validation(category="customers", filename="safe.xlsx", content_base64=base64.b64encode(raw).decode(), sheet=0, header_row=1, mapping={"name": "A"})
    with maker() as db:
        result = validate(data, db)
        assert result["records"][0]["original"]["name"] == "=1+1"
        assert not result["records"][0]["valid"]
        exported = list(csv.reader(io.StringIO(validation_csv(result).decode("utf-8-sig"))))
        assert any("'=1+1" in row for row in exported)


@pytest.mark.parametrize("value", ["=SUM(1)", "+calc", "@reference", "-expression", "\t=expression", "  =expression"])
def test_all_export_formula_prefixes_are_inert(value):
    data = {"records": [{"row": 2, "original": {"name": value}, "proposed": {"name": value}, "issues": [], "valid": True}]}
    rows = list(csv.reader(io.StringIO(validation_csv(data).decode("utf-8-sig"))))
    record = next(row for row in rows if len(row) == 6 and row[1] == "name")
    assert record[2].startswith("'") and record[3].startswith("'")


def test_bounded_files_rows_columns_and_cells():
    with pytest.raises(SecurityError): decode("large.csv", base64.b64encode(b"x" * (4 * 1024 * 1024 + 1)).decode())
    with pytest.raises(SecurityError): read_file("large.csv", ("Name\n" + "Synthetic\n" * 2001).encode())
    with pytest.raises(SecurityError): read_file("wide.csv", (",".join("X" for _ in range(51))).encode())
    with pytest.raises(SecurityError): read_file("long.csv", ("Name\n" + "X" * 2049).encode())
    with pytest.raises(SecurityError): read_file("bomb.xlsx", book([["Name"]], extra={"padding.xml": "<padding>" + "0" * 100000 + "</padding>"}))


def test_multilevel_headers_excel_dates_and_utf16_csv():
    raw = book([["Synthetic title"], ["Delivery", "Customer"], ["Date", "Name"], ["2026-01-01", "Synthetic"]])
    data = Upload(category="packing_deliveries", filename="synthetic.xlsx", content_base64=base64.b64encode(raw).decode())
    result = inspect_file(data)
    candidate = next(c for c in result["sheets"][0]["candidates"] if c["header_row"] == 2 and c["header_span"] == 2)
    assert candidate["suggested_mapping"]["delivery_date"] == "A"
    assert read_file("date.xlsx", book([["Date"], ["46023"]], date_style=True))[0]["rows"][1]["cells"][0]["excel_date"] == "2026-01-01"
    assert read_file("unicode.csv", "Name\nشركة تجريبية\n".encode("utf-16"))[0]["rows"][1]["cells"][0]["value"] == "شركة تجريبية"
    simple = inspect_file(Upload(**payload()))
    assert simple["sheets"][0]["candidates"][0]["header_span"] == 1
    assert not simple["sheets"][0]["ambiguous"]


def test_mapping_missing_columns_unknown_refs_status_dates_and_quantities(security_db):
    maker, _ = security_db
    raw = "Packing no,LPO,SKU,Driver,Date,Status,Qty\nP-1,L-1,I-1,Synthetic Driver,01/02/2026,DELVERD,-1\nP-2,L-2,I-2,Synthetic Driver,2026-01-01,DELIVERD,NaN\n"
    data = Validation(**payload(raw, "packing_deliveries"), sheet=0, header_row=1, mapping=dict(zip(["packing_number", "lpo", "sku", "driver", "delivery_date", "status", "quantity"], list("ABCDEFG"))))
    with maker() as db:
        result = validate(data, db)
        assert all(not r["valid"] for r in result["records"])
        assert all(r["proposed"]["status"] == "DELIVERED" for r in result["records"])
        codes = {i["code"] for r in result["records"] for i in r["issues"]}
        assert {"UNKNOWN_REFERENCE", "INVALID_QUANTITY", "INVALID_OR_AMBIGUOUS_DATE", "HISTORICAL_REFERENCE_ONLY"} <= codes
        data.date_format = "dmy"; result = validate(data, db)
        assert result["records"][0]["proposed"]["delivery_date"] == "2026-02-01"
        missing = validate(Validation(**payload("Only\nSynthetic\n"), sheet=0, header_row=1, mapping={}), db)
        assert missing["missing_columns"] == ["name"] and missing["summary"]["invalid"] == 1
        with pytest.raises(SecurityError): validate(data.model_copy(update={"mapping": {"sku": "Z"}}), db)
        with pytest.raises(SecurityError): validate(data.model_copy(update={"mapping": {"sku": "A", "driver": "A"}}), db)


def test_api_rbac_csrf_audit_no_business_mutations(signed, security_db, accounts):
    maker, _ = security_db
    mutations = []
    def observe(connection, cursor, statement, parameters, context, many):
        import re
        match = re.match(r"\s*(?:INSERT INTO|UPDATE|DELETE FROM)\s+([a-z_]+)", statement, re.I)
        if match: mutations.append(match[1].lower())
    event.listen(maker.kw["bind"], "before_cursor_execute", observe)
    body = payload("Name,Email\nConfidential Synthetic,new@example.com\n")
    assert signed.get("/api/onboarding/options").status_code == 200
    assert signed.post("/api/onboarding/inspect", json=body).status_code == 403
    found = api(signed, "inspect", body).json(); assert found["sheets"]
    request = {**body, "sheet": 0, "header_row": 1, "mapping": {"name": "A", "email": "B"}}
    first = api(signed, "validate", request).json(); assert first == api(signed, "validate", request).json()
    assert api(signed, "report", request).headers["content-type"].startswith("text/csv")
    assert signed.get("/api/onboarding/files/unknown").status_code == 404
    assert signed.post("/api/onboarding/import", json=request, headers=csrf(signed)).status_code == 404
    event.remove(maker.kw["bind"], "before_cursor_execute", observe)
    assert set(mutations) <= {"audit_events", "sessions", "login_rate_buckets"}
    with maker() as db:
        actions = list(db.scalars(select(AuditEvent).where(AuditEvent.action.like("onboarding.%"))))
        assert {a.action for a in actions} >= {"onboarding.inspected", "onboarding.validated", "onboarding.report_exported"}
        assert all("Confidential Synthetic" not in json.dumps(a.details) and "synthetic.csv" not in json.dumps(a.details) for a in actions)
        assert db.scalar(text("SELECT count(*) FROM customers")) == 0
        assert db.scalar(text("SELECT count(*) FROM stock_balances")) == 0
        assert db.scalar(text("SELECT count(*) FROM stock_ledger_effects")) == 0
    signed.post("/api/auth/logout", json={}, headers=csrf(signed))
    assert signed.get("/api/onboarding/options").status_code == 401


def test_existing_matches_spelling_items_duplicates_and_ambiguity(signed, security_db):
    customer = post(signed, "customers", {"name": "Synthetic Trading"})
    unit = post(signed, "units", {"name": "Synthetic PCS", "decimal_places": 0})
    category = post(signed, "categories", {"name": "Synthetic Components"})
    item = post(signed, "items", {"name": "Synthetic item", "item_type": "component", "unit_id": unit["id"], "category_id": category["id"]})
    maker, _ = security_db
    with maker() as db:
        result = validate(validation("Name,Email\nSynthetic Trading,one@example.com\nSynthetic Tradin,two@example.com\n"), db)
        assert result["records"][0]["matches"]["name"]["id"] == customer["id"]
        assert any(i["code"] == "POSSIBLE_SPELLING_VARIANT" for i in result["records"][1]["issues"])
        data = Validation(**payload(f"SKU,Name,Unit,Category\n{item['code']},Different name,Synthetic PCS,Synthetic Components\n{item['code']},Different name,Unknown,Unknown\n", "items"), sheet=0, header_row=1, mapping={"sku": "A", "name": "B", "unit": "C", "category": "D"})
        result = validate(data, db); codes = {i["code"] for r in result["records"] for i in r["issues"]}
        assert {"EXISTING_MATCH", "DESCRIPTION_CONFLICT", "DUPLICATE_SOURCE", "UNKNOWN_REFERENCE"} <= codes


def test_operations_authorized_and_sales_denied(browser, accounts, security_db):
    assert login(browser, accounts, "test.operations").status_code == 200
    assert browser.get("/api/onboarding/options").status_code == 200
    # An authenticated user without either privileged role cannot access file contents.
    from app.models.security import User, Role
    maker, _ = security_db
    with maker() as session:
        user = session.scalar(select(User).where(User.username == "test.operations"))
        user.roles = [session.scalar(select(Role).where(Role.code == "SALES"))]; session.commit()
    assert browser.get("/api/onboarding/options").status_code == 403
    api(browser, "inspect", payload(), 403)


def test_authoritative_field_rules_are_reused(security_db):
    maker, _ = security_db
    with maker() as db:
        result = validate(validation("Name,Email\nSynthetic,bad@-invalid.example\n"), db)
        assert any(i["code"] == "ERP_FIELD_RULE" for i in result["records"][0]["issues"])
        data = Validation(**payload("Number,Customer\nL-1,Unknown\n", "lpos"), sheet=0, header_row=1, mapping={"number": "A", "customer": "B"})
        result = validate(data, db)
        assert "name" in result["missing_columns"]
        assert result["summary"]["invalid"] == 1


def test_cumulative_deliveries_respect_authoritative_order_quantity(signed, stock, security_db):
    from tests.test_sales import order
    customer = post(signed, "customers", {"name": "Synthetic order customer"})
    lpo = post(signed, "lpos", {"name": "Synthetic LPO", "customer_id": customer["id"], "number": "SYN-LPO"})
    sales_order = order(signed, stock, quantity="3", customer=customer, lpo_id=lpo["id"])
    content = f"PL,LPO,SKU,Driver,Date,Status,Qty,Order,Unit,Source quantity\nP-1,SYN-LPO,{stock['item']['code']},Unknown,2026-01-01,DELIVERED,2,{sales_order['code']},PCS,999\nP-2,SYN-LPO,{stock['item']['code']},Unknown,2026-01-02,DELIVERED,2,{sales_order['code']},PCS,999\n"
    mapping = dict(zip(["packing_number", "lpo", "sku", "driver", "delivery_date", "status", "quantity", "order_number", "unit", "order_quantity"], list("ABCDEFGHIJ")))
    data = Validation(**payload(content, "packing_deliveries"), sheet=0, header_row=1, mapping=mapping)
    maker, _ = security_db
    with maker() as db:
        result = validate(data, db)
        assert any(i["code"] == "EXCEEDS_SUPPORTED_ORDER" for i in result["records"][1]["issues"])
        assert db.scalar(text("SELECT count(*) FROM sales_deliveries")) == 0
        assert db.scalar(text("SELECT count(*) FROM stock_ledger_effects")) == 0
