"""Preview-only normalization and existing-entity matching. Never writes business models."""
import csv
import hashlib
import io
import re
import unicodedata
from collections import defaultdict
from datetime import date, datetime
from decimal import Decimal, InvalidOperation

from sqlalchemy import select
from pydantic import ValidationError
from app.schemas.master import CustomerInput, ProjectInput, LpoInput, ItemInput, UnitInput, CategoryInput
from app.models.master import Customer, Project, Lpo, Item, Unit, Category, Family
from app.models.inventory import Warehouse, Location
from app.models.packing import PackingDocument
from app.models.sales import SalesOrder, SalesLine
from app.models.security import User
from app.services.onboarding_files import col, decode, fail, key, normalized, read_file

NOTICE = "PREVIEW ONLY — NO DATA HAS BEEN IMPORTED"
FIELDS = {
    "customers": ("name", "code", "email", "phone", "contact_name", "address", "trn", "notes"),
    "projects": ("name", "customer", "code", "location", "status"),
    "lpos": ("name", "number", "customer", "project", "lpo_date"),
    "items": ("sku", "name", "unit", "category", "item_type", "family", "colour", "dimensions", "design", "description"),
    "units": ("name", "code", "decimal_places"),
    "categories": ("name", "code", "parent"),
    "packing_deliveries": ("packing_number", "lpo", "customer", "project", "sku", "unit", "driver", "delivery_date", "status", "quantity", "order_number", "order_quantity"),
    "physical_stock": ("sku", "unit", "warehouse", "location", "quantity"),
}
REQUIRED = {
    "customers": ("name",), "projects": ("name", "customer"), "lpos": ("name", "number", "customer"),
    "items": ("sku", "name", "unit", "category", "item_type"), "units": ("name",), "categories": ("name",),
    "packing_deliveries": ("packing_number", "lpo", "sku", "driver", "delivery_date", "status", "quantity"),
    "physical_stock": ("sku", "unit", "warehouse", "location", "quantity"),
}
ALIASES = {
    "name": ["name", "customer name", "project name", "item name", "description", "company name"],
    "sku": ["sku", "item code", "product code", "item no", "item number", "material code"],
    "customer": ["customer", "customer name", "company", "client"],
    "packing_number": ["packing no", "packing list no", "packing list number", "pl no", "packing number", "pl"],
    "number": ["lpo no", "lpo number", "purchase order", "number"],
    "lpo": ["lpo", "lpo no", "lpo number", "po no"],
    "delivery_date": ["delivery date", "date delivered", "date", "dispatch date"],
    "quantity": ["qty", "quantity", "delivered qty", "delivery qty", "stock quantity"],
    "unit": ["unit", "uom", "units"], "driver": ["driver", "driver name"],
    "status": ["status", "delivery status", "remarks"], "project": ["project", "project name", "site"],
    "order_number": ["sales order", "sales order no", "order no"],
    "parent": ["parent", "parent category"],
}
STATUS = {"DELIVERD": "DELIVERED", "DELVERD": "DELIVERED", "DELIVERED": "DELIVERED", "PENDING": "PENDING", "PARTIAL": "PARTIALLY_DELIVERED", "PARTIALLY DELIVERED": "PARTIALLY_DELIVERED", "CANCELLED": "CANCELLED", "DISPATCHED": "DISPATCHED"}


def headers(rows, start, span):
    selected = [next((r for r in rows if r["number"] == start + offset), {"cells": []})["cells"] for offset in range(span)]
    width = max((len(r) for r in selected), default=0)
    return [{"column": col(i), "label": " / ".join(dict.fromkeys(r[i]["value"].strip() for r in selected if i < len(r) and r[i]["value"].strip())) or col(i)} for i in range(width)]


def suggest(category, columns):
    mapping, used = {}, set()
    for field in FIELDS[category]:
        aliases = {key(a) for a in [field, *ALIASES.get(field, [])]}
        matches = [h["column"] for h in columns if key(h["label"]) in aliases or any(key(part) in aliases for part in h["label"].split(" / "))]
        if len(matches) == 1 and matches[0] not in used:
            mapping[field] = matches[0]
            used.add(matches[0])
    return mapping


def parse(data):
    raw = decode(data.filename, data.content_base64)
    return raw, read_file(data.filename, raw)


def inspect_file(data):
    raw, sheets = parse(data)
    result = []
    for index, sheet in enumerate(sheets):
        candidates = []
        for row in sheet["rows"][:20]:
            for span in (1, 2):
                columns = headers(sheet["rows"], row["number"], span)
                mapping = suggest(data.category, columns)
                score = 5 * sum(f in mapping for f in REQUIRED[data.category]) + len(mapping)
                if span == 2 and mapping == suggest(data.category, headers(sheet["rows"], row["number"], 1)):
                    score -= 1  # Do not mistake the first data row for a second header.
                candidates.append({"header_row": row["number"], "header_span": span, "columns": columns, "suggested_mapping": mapping, "score": score})
        candidates.sort(key=lambda x: (-x["score"], x["header_span"], x["header_row"]))
        top = candidates
        best = top[0]["score"] if top else 0
        result.append({"index": index, "name": sheet["name"], "nonempty_rows": len(sheet["rows"]), "candidates": top, "ambiguous": not best or sum(c["score"] == best for c in candidates) > 1, "sample": [{"row": r["number"], "values": [c["value"] for c in r["cells"]]} for r in sheet["rows"][:8]], "formula_cells": sum(c["kind"] == "formula" for r in sheet["rows"] for c in r["cells"])})
    return {"notice": NOTICE, "sha256": hashlib.sha256(raw).hexdigest(), "sheets": result, "warnings": ["Header suggestions are heuristic. Confirm the sheet, header rows and each mapping before validating.", "Formula cells are literal text and never evaluated. Form-style templates and repeated headers require manual review."]}


def reference_catalog(db, category):
    models = {"customer": Customer, "project": Project, "lpo": Lpo, "sku": Item, "unit": Unit, "category": Category, "family": Family, "warehouse": Warehouse, "location": Location, "packing_number": PackingDocument, "order_number": SalesOrder, "driver": User}
    catalog = {}
    needed = {"customers": {"customer"}, "projects": {"customer", "project"}, "lpos": {"customer", "project", "lpo"}, "items": {"sku", "unit", "category", "family"}, "units": {"unit"}, "categories": {"category"}, "physical_stock": {"sku", "unit", "warehouse", "location"}, "packing_deliveries": {"sku", "unit", "customer", "project", "lpo", "order_number", "packing_number", "driver"}}[category]
    for field, model in models.items():
        rows = list(db.scalars(select(model).order_by(model.id).limit(10001))) if field in needed else []
        if len(rows) > 10000:
            fail("The ERP reference catalog exceeds the preview budget; ask an administrator to scope the review")
        if field == "driver":
            rows = [r for r in rows if r.is_active and any(role.code == "DRIVER" for role in r.roles)]
        index = defaultdict(list)
        for row in rows:
            values = [getattr(row, attr, None) for attr in ("code", "name", "number", "username", "display_name")]
            for value in {normalized(v) for v in values if v}:
                index[value].append(row)
        catalog[field] = index
    return catalog


def one_edit(a, b):
    if abs(len(a) - len(b)) > 1 or a == b:
        return False
    i = j = edits = 0
    while i < len(a) and j < len(b):
        if a[i] == b[j]:
            i += 1; j += 1
        else:
            edits += 1
            if edits > 1:
                return False
            if len(a) <= len(b): j += 1
            if len(a) >= len(b): i += 1
    return edits + (i < len(a)) + (j < len(b)) <= 1


def validate(data, db):
    raw, sheets = parse(data)
    mapping = dict(sorted(data.mapping.items()))
    if data.sheet >= len(sheets):
        fail("Choose an existing worksheet")
    sheet = sheets[data.sheet]
    columns = headers(sheet["rows"], data.header_row, data.header_span)
    if not any(r["number"] == data.header_row for r in sheet["rows"]):
        fail("Choose a nonempty header row")
    known = {c["column"]: i for i, c in enumerate(columns)}
    if set(data.mapping) - set(FIELDS[data.category]) or set(data.mapping.values()) - set(known) or len(set(data.mapping.values())) != len(data.mapping):
        fail("Map distinct source columns to supported ERP fields")
    missing = [f for f in REQUIRED[data.category] if f not in data.mapping]
    catalog = reference_catalog(db, data.category)
    spelling = defaultdict(list)
    for name in sorted(catalog["customer"]):
        bucket = spelling[name[:1], len(name)]
        if len(bucket) < 40: bucket.append(name)
    result, seen = [], {}
    totals = defaultdict(Decimal)
    group_refs = {}
    for source in sheet["rows"]:
        if source["number"] < data.header_row + data.header_span:
            continue
        original, proposed, kinds, matches, issues = {}, {}, {}, {}, []
        def issue(field, code, message, severity="error"):
            issues.append({"field": field, "code": code, "message": message, "severity": severity})
        for field in missing:
            issue(field, "MISSING_COLUMN", "Map the required ERP field to a source column")
        for field, column in mapping.items():
            i = known[column]
            cell = source["cells"][i] if i < len(source["cells"]) else {"value": "", "kind": "text"}
            original[field] = cell["value"]
            proposed[field] = " ".join(unicodedata.normalize("NFKC", cell["value"]).split())
            kinds[field] = cell
            if proposed[field] != original[field]:
                issue(field, "NORMALIZATION_PROPOSED", "Whitespace/Unicode normalization proposed; original value is preserved", "warning")
            if field in REQUIRED[data.category] and not proposed[field]:
                issue(field, "REQUIRED", "A value is required")
            if len(proposed[field]) > (40 if field in {"sku", "code"} else 2000 if field in {"notes", "description", "address"} else 200):
                issue(field, "FIELD_LENGTH", "Value exceeds the supported ERP field length")
        if any(c["kind"] == "formula" for c in source["cells"]):
            issue("row", "FORMULA_NOT_EVALUATED", "A formula is present; its cached result is not trusted or used")
        if any(c["kind"] == "e" for c in source["cells"]):
            issue("row", "EXCEL_ERROR_CELL", "An Excel error cell requires correction; it is not a valid source value")
        if any(any(ord(ch) < 32 and ch not in "\t\r\n" or 0x202A <= ord(ch) <= 0x202E or 0x2066 <= ord(ch) <= 0x2069 for ch in v) for v in original.values()):
            issue("row", "CONTROL_CHARACTER", "Invisible control/directional characters need manual review")
        identity_fields = {"customers": ("name",), "projects": ("customer", "name"), "lpos": ("customer", "number"), "items": ("sku",), "units": ("name",), "categories": ("name",), "packing_deliveries": ("packing_number", "sku"), "physical_stock": ("sku", "warehouse", "location")}[data.category]
        identity = tuple(normalized(proposed.get(f, "")) for f in identity_fields)
        if any(identity):
            if identity in seen:
                issue("row", "DUPLICATE_SOURCE", f"Possible duplicate of source row {seen[identity]}; no rows are merged")
            else:
                seen[identity] = source["number"]
        for field, value in sorted(proposed.items(), key=lambda pair: ({"customer": 0, "warehouse": 0, "project": 1, "lpo": 2}.get(pair[0], 3), pair[0])):
            ref = "category" if field == "parent" else field
            if field == "name": ref = {"customers": "customer", "projects": "project", "units": "unit", "categories": "category"}.get(data.category, "")
            if field == "number" and data.category == "lpos": ref = "lpo"
            if ref not in catalog or not value:
                continue
            found = catalog[ref].get(normalized(value), [])
            if ref in {"project", "lpo"} and "customer" in matches:
                found = [r for r in found if str(getattr(r, "customer_id", "")) == matches["customer"]["id"]]
            if ref == "location" and "warehouse" in matches:
                found = [r for r in found if str(r.warehouse_id) == matches["warehouse"]["id"]]
            if len(found) == 1:
                record = found[0]
                matches[field] = {"id": str(record.id), "code": getattr(record, "code", None)}
                if not getattr(record, "is_active", True): issue(field, "INACTIVE_REFERENCE", "Matched ERP reference is inactive")
                if data.category in {"customers", "projects", "items", "units", "categories", "lpos"} and field in {"name", "sku", "number"}:
                    issue(field, "EXISTING_MATCH", "An existing ERP record matches; any future action requires review", "warning")
            elif len(found) > 1:
                issue(field, "AMBIGUOUS_REFERENCE", "More than one ERP record matches; use an exact code and verify the relationship")
            elif field in {"customer", "project", "unit", "category", "family", "warehouse", "location", "driver", "lpo", "order_number", "parent"} or ref == "sku" and data.category != "items":
                issue(field, "UNKNOWN_REFERENCE", "No active, unambiguous existing ERP reference matches")
        if data.category == "categories" and proposed.get("parent") and normalized(proposed["parent"]) == normalized(proposed.get("name", "")):
            issue("parent", "SELF_PARENT", "A category cannot be its own parent")
        if data.category == "customers":
            name = normalized(proposed.get("name", ""))
            candidates = sorted({n for length in (len(name) - 1, len(name), len(name) + 1) for n in spelling[name[:1], length]})[:40]
            if any(one_edit(name, n) or key(name) == key(n) and name != n for n in candidates):
                issue("name", "POSSIBLE_SPELLING_VARIANT", "A similar customer spelling exists; confirm manually", "warning")
            bucket = spelling[name[:1], len(name)]
            if name and name not in bucket and len(bucket) < 40: bucket.append(name)
            if proposed.get("email") and not re.fullmatch(r"[^\s@]+@[^\s@]+\.[^\s@]+", proposed["email"]): issue("email", "INVALID_EMAIL", "Check email format")
            if proposed.get("trn") and not re.fullmatch(r"[0-9]{15}", proposed["trn"]): issue("trn", "INVALID_TRN", "UAE TRN must contain 15 digits")
        if data.category == "items":
            if not proposed.get("item_type"):
                issue("item_type", "TYPE_REVIEW", "Confirm finished, raw_material, component, accessory or kit before any future import", "warning")
            elif proposed["item_type"] not in {"finished", "raw_material", "component", "accessory", "kit"}: issue("item_type", "INVALID_ITEM_TYPE", "Choose an existing ERP item type")
            if proposed.get("family") or any(proposed.get(f) for f in ("colour", "dimensions", "design")):
                issue("family", "VARIANT_REVIEW", "Confirm approved family attributes and variant identity; no variant is synthesized", "warning")
            if "sku" in matches:
                record = next(r for r in catalog["sku"][normalized(proposed["sku"])] if str(r.id) == matches["sku"]["id"])
                if normalized(record.name) != normalized(proposed.get("name", "")) or proposed.get("description") and normalized(record.description or "") != normalized(proposed["description"]):
                    issue("description", "DESCRIPTION_CONFLICT", "Existing item name/description differs; verify the SKU", "warning")
        if "location" in matches and "warehouse" in matches:
            record = catalog["location"][normalized(proposed["location"])][0]
            if str(record.warehouse_id) != matches["warehouse"]["id"]: issue("location", "RELATIONSHIP_MISMATCH", "Location does not belong to the selected warehouse")
        if "sku" in matches and "unit" in matches:
            record = next(r for r in catalog["sku"][normalized(proposed["sku"])] if str(r.id) == matches["sku"]["id"])
            if str(record.unit_id) != matches["unit"]["id"]:
                issue("unit", "UNIT_MISMATCH", "Source unit differs from the authoritative item's unit; no conversion is assumed")
        if "customer" in matches:
            for field in ("project", "lpo"):
                if field in matches:
                    record = next(r for r in catalog[field][normalized(proposed[field])] if str(r.id) == matches[field]["id"])
                    if str(record.customer_id) != matches["customer"]["id"]: issue(field, "RELATIONSHIP_MISMATCH", "Reference belongs to a different customer")
        if data.category == "units" and proposed.get("decimal_places"):
            if not re.fullmatch(r"[0-6]", proposed["decimal_places"]): issue("decimal_places", "INVALID_PRECISION", "Unit precision must be an integer from 0 to 6")
        amount = None
        if "quantity" in proposed and proposed["quantity"]:
            try:
                amount = Decimal(proposed["quantity"])
                if not amount.is_finite() or amount < 0 or amount > Decimal("999999999999.999999") or amount.as_tuple().exponent < -6 or data.category == "packing_deliveries" and amount == 0:
                    raise InvalidOperation
                proposed["quantity"] = format(amount, "f")
                if "unit" in matches:
                    unit = next(r for r in catalog["unit"][normalized(proposed["unit"])] if str(r.id) == matches["unit"]["id"])
                    if amount != amount.quantize(Decimal(1).scaleb(-unit.decimal_places)):
                        issue("quantity", "UNIT_PRECISION", "Quantity exceeds the authoritative unit's decimal precision")
            except (InvalidOperation, ValueError):
                amount = None
                issue("quantity", "INVALID_QUANTITY", "Use a bounded nonnegative quantity with at most six decimals; delivery quantity must be positive")
        if data.category == "packing_deliveries":
            supplied = proposed.get("status", "").upper()
            canonical = STATUS.get(supplied)
            if not canonical: issue("status", "UNKNOWN_STATUS", "Confirm the source status; no operational status will be changed")
            else:
                proposed["status"] = canonical
                if canonical != original.get("status"): issue("status", "STATUS_PROPOSAL", "Canonical historical label proposed only; this is not an ERP dispatch or stock issue", "warning")
            group = normalized(proposed.get("packing_number", ""))
            references = tuple(normalized(proposed.get(f, "")) for f in ("lpo", "customer", "project"))
            if group in group_refs and group_refs[group] != references: issue("packing_number", "PACKING_GROUP_CONFLICT", "Repeated packing number has inconsistent customer/project/LPO references")
            group_refs[group] = references
            if "packing_number" in matches: issue("packing_number", "EXISTING_PACKING_NUMBER", "An ERP packing document already uses this number")
            if not proposed.get("order_number") or "order_number" not in matches or "sku" not in matches:
                issue("order_number", "ORDER_SUPPORT_REQUIRED", "Existing order and item support must be confirmed; spreadsheet order quantity is not authority", "warning")
            elif amount is not None:
                order_id, item_id = matches["order_number"]["id"], matches["sku"]["id"]
                order = next(r for r in catalog["order_number"][normalized(proposed["order_number"])] if str(r.id) == order_id)
                support = list(db.scalars(select(SalesLine).where(SalesLine.order_id == order.id, SalesLine.item_id == item_id)))
                supported = sum((r.quantity for r in support), Decimal(0))
                totals[order_id, item_id] += amount
                if not support or totals[order_id, item_id] > supported: issue("quantity", "EXCEEDS_SUPPORTED_ORDER", "Cumulative source quantity exceeds the authoritative ERP order/item quantity")
                if "customer" in matches and str(order.customer_id) != matches["customer"]["id"] or "lpo" in matches and str(order.lpo_id) != matches["lpo"]["id"]:
                    issue("order_number", "ORDER_RELATIONSHIP_MISMATCH", "Order customer/LPO does not match the proposed references")
            if not proposed.get("unit"):
                issue("unit", "SOURCE_UNIT_REVIEW", "Confirm source quantity units; no historical unit conversion is assumed", "warning")
            issue("status", "HISTORICAL_REFERENCE_ONLY", "Historical delivery labels never create deliveries, ledger effects or proof of signed receipt", "warning")
        for field in ("delivery_date", "lpo_date"):
            if not proposed.get(field): continue
            try:
                value = kinds[field].get("excel_date", proposed[field])
                if re.fullmatch(r"\d{4}-\d{2}-\d{2}", value): parsed = date.fromisoformat(value)
                elif data.date_format != "iso": parsed = datetime.strptime(value, "%d/%m/%Y" if data.date_format == "dmy" else "%m/%d/%Y").date()
                else: raise ValueError
                if not 1900 <= parsed.year <= 2100: raise ValueError
                proposed[field] = parsed.isoformat()
                if proposed[field] != original[field]: issue(field, "DATE_PROPOSAL", "Date conversion uses the explicitly selected convention or Excel date style", "warning")
            except ValueError:
                issue(field, "INVALID_OR_AMBIGUOUS_DATE", "Use YYYY-MM-DD or explicitly select day/month/year versus month/day/year")
        if data.category == "physical_stock": issue("quantity", "PHYSICAL_VERIFICATION_REQUIRED", "A spreadsheet count is a proposal only; opening balances/adjustments require separate approval and audited ledger posting", "warning")
        # Reuse the authoritative DTO rules as an additional check, without calling
        # create/update services or synthesizing any ORM/business object.
        schemas = {"customers": CustomerInput, "projects": ProjectInput, "lpos": LpoInput, "items": ItemInput, "units": UnitInput, "categories": CategoryInput}
        if data.category in schemas:
            schema = schemas[data.category]
            values = {field: value for field, value in proposed.items() if field in schema.model_fields and value != ""}
            relations = {"customer_id": "customer", "project_id": "project", "category_id": "category", "unit_id": "unit", "family_id": "family", "parent_id": "parent"}
            for target, field in relations.items():
                if target in schema.model_fields and field in matches: values[target] = matches[field]["id"]
            try:
                schema.model_validate(values)
            except ValidationError as errors:
                for error in errors.errors(include_input=False):
                    field = str(error["loc"][0]); field = relations.get(field, field)
                    issue(field, "ERP_FIELD_RULE", "Value or reference does not satisfy the existing ERP field rules")
        if not data.mapping: issue("row", "NO_MAPPING", "Map source columns before validation")
        result.append({"row": source["number"], "original": original, "proposed": proposed, "matches": matches, "issues": issues, "valid": not any(i["severity"] == "error" for i in issues)})
    summary = {"total": len(result), "valid": sum(r["valid"] for r in result), "invalid": sum(not r["valid"] for r in result), "possible_duplicates": sum(any(i["code"] in {"DUPLICATE_SOURCE", "POSSIBLE_SPELLING_VARIANT", "EXISTING_PACKING_NUMBER"} for i in r["issues"]) for r in result), "missing_relationships": sum(any(i["code"] in {"UNKNOWN_REFERENCE", "AMBIGUOUS_REFERENCE", "RELATIONSHIP_MISMATCH", "ORDER_RELATIONSHIP_MISMATCH"} for i in r["issues"]) for r in result), "existing_matches": sum(bool(r["matches"]) for r in result), "manual_review": sum(bool(r["issues"]) for r in result), "would_import": 0}
    return {"notice": NOTICE, "category": data.category, "sha256": hashlib.sha256(raw).hexdigest(), "sheet": sheet["name"], "selection": {"sheet_index": data.sheet, "header_row": data.header_row, "header_span": data.header_span, "date_format": data.date_format, "mapping": mapping}, "missing_columns": missing, "summary": summary, "records": result, "mutations": {"business_records": 0, "stock_ledger": 0}, "warnings": ["Preview only. Valid means these checks passed, not authorization to import.", "Similarity hints use a bounded deterministic candidate set and are not exhaustive entity resolution."]}


def validation_csv(result):
    def safe(value):
        text = str(value)
        prefix = text[:1]
        return "'" + text if text.lstrip().startswith(("=", "+", "-", "@")) or prefix and (prefix.isspace() or ord(prefix) < 32 or prefix in {"\ufeff", "\u200b"}) else text
    stream = io.StringIO(newline="")
    writer = csv.writer(stream, quoting=csv.QUOTE_ALL)
    writer.writerow([NOTICE])
    writer.writerow(["Source SHA-256", result.get("sha256", "")])
    writer.writerow(["Category", result.get("category", "")])
    writer.writerow(["Worksheet", safe(result.get("sheet", ""))])
    for field, value in sorted(result.get("selection", {}).items()):
        writer.writerow([field, safe(str(value))])
    for field, value in sorted(result.get("summary", {}).items()):
        writer.writerow([field, value])
    writer.writerow([])
    writer.writerow(["Source row", "ERP field", "Original value", "Proposed value", "Validation", "Messages"])
    for record in result["records"]:
        for field in sorted(set(record["original"]) | {i["field"] for i in record["issues"]}):
            messages = [i["message"] for i in record["issues"] if i["field"] in {field, "row"}]
            writer.writerow([record["row"], safe(field), safe(record["original"].get(field, "")), safe(record["proposed"].get(field, "")), "valid with review" if record["valid"] and record["issues"] else "valid" if record["valid"] else "invalid", safe("; ".join(messages))])
    return ("\ufeff" + stream.getvalue()).encode("utf-8")
