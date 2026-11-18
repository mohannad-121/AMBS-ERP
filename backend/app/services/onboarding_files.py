"""Bounded, inert OOXML/CSV reader. No extraction, formulas, network or filesystem writes."""
import base64
import binascii
import csv
import io
import posixpath
import re
import unicodedata
import zipfile
from datetime import datetime, timedelta
from xml.etree import ElementTree as ET

from app.core.security import SecurityError

MAX_BYTES = 4 * 1024 * 1024
MAX_ROWS = 2000
MAX_TOTAL_ROWS = 5000
MAX_COLS = 50
MAX_CELLS = 50000
MAX_TEXT = 1_000_000
NS = "{http://schemas.openxmlformats.org/spreadsheetml/2006/main}"
REL = "{http://schemas.openxmlformats.org/package/2006/relationships}"
DOC_REL = "{http://schemas.openxmlformats.org/officeDocument/2006/relationships}"


def fail(message, code="INVALID_PREVIEW_FILE"):
    raise SecurityError(422, code, message)


def normalized(value):
    return " ".join(unicodedata.normalize("NFKC", str(value)).split()).casefold()


def key(value):
    return "".join(c for c in normalized(value) if c.isalnum())


def col(index):
    value = ""
    while index >= 0:
        index, remainder = divmod(index, 26)
        value = chr(65 + remainder) + value
        index -= 1
    return value


def decode(filename, encoded):
    if not filename or len(filename) > 180 or any(c in filename for c in "/\\:\x00\r\n") or filename in {".", ".."}:
        fail("Use a filename without folders or control characters")
    if not filename.lower().endswith((".xlsx", ".csv")):
        fail("Only .xlsx and UTF-8/UTF-16 CSV are supported; macros, legacy Excel, HTML and ZIP imports are not accepted")
    try:
        raw = base64.b64decode(encoded, validate=True)
    except (ValueError, binascii.Error):
        fail("The upload is not valid base64")
    if not raw or len(raw) > MAX_BYTES:
        fail("Upload a nonempty file of at most 4 MiB", "PREVIEW_SIZE_LIMIT")
    return raw


def read_file(filename, raw):
    count = [0, 0, 0]

    def cell(value="", kind="text", **extra):
        value = str(value)
        if len(value) > 2048 or "\x00" in value:
            fail("A cell exceeds 2,048 characters or contains a null character")
        count[0] += 1
        count[1] += len(value)
        if count[0] > MAX_CELLS or count[1] > MAX_TEXT:
            fail("The workbook exceeds the cell/text budget", "PREVIEW_SIZE_LIMIT")
        return {"value": value, "kind": kind, **extra}

    def sheet(name, rows):
        if len(rows) > MAX_ROWS:
            fail("A sheet exceeds 2,000 nonempty rows", "PREVIEW_SIZE_LIMIT")
        count[2] += len(rows)
        if count[2] > MAX_TOTAL_ROWS:
            fail("The workbook exceeds 5,000 nonempty rows", "PREVIEW_SIZE_LIMIT")
        return {"name": name, "rows": rows}

    if filename.lower().endswith(".csv"):
        try:
            if raw.startswith((b"%PDF-", b"PK\x03\x04", b"\xd0\xcf\x11\xe0", b"\x89PNG")):
                fail("The file signature does not match CSV text")
            text = raw.decode("utf-16" if raw.startswith((b"\xff\xfe", b"\xfe\xff")) else "utf-8-sig", errors="strict")
            if re.match(r"\s*<(?:!doctype\s+html|html\b|script\b)", text, re.I):
                fail("HTML is a reference format only, not an accepted data upload")
            try:
                dialect = csv.Sniffer().sniff(text[:4096], delimiters=",;\t|")
            except csv.Error:
                dialect = csv.excel
            rows = []
            for number, values in enumerate(csv.reader(io.StringIO(text, newline=""), dialect, strict=True), 1):
                if number > 10000:
                    fail("CSV contains too many physical rows", "PREVIEW_SIZE_LIMIT")
                if len(values) > MAX_COLS:
                    fail("At most 50 columns are supported")
                if not any(v.strip() for v in values):
                    continue
                rows.append({"number": number, "cells": [cell(v, "formula" if v.lstrip().startswith(("=", "+", "@")) else "text") for v in values]})
                if len(rows) > MAX_ROWS:
                    fail("CSV exceeds 2,000 nonempty rows", "PREVIEW_SIZE_LIMIT")
            return [sheet("CSV", rows)]
        except (UnicodeError, csv.Error):
            fail("CSV is malformed; save as UTF-8 or BOM-marked UTF-16 with consistent delimiters")

    try:
        with zipfile.ZipFile(io.BytesIO(raw)) as archive:
            members = archive.infolist()
            names = [m.filename for m in members]
            if len(names) > 256 or len(names) != len(set(names)) or sum(m.file_size for m in members) > 16 * 1024 * 1024:
                fail("Workbook archive exceeds the member/expanded-size limits", "PREVIEW_SIZE_LIMIT")
            xml = {}
            for info in members:
                name = info.filename
                low = name.lower()
                if name.startswith("/") or "\\" in name or ":" in name or ".." in name.split("/") or info.flag_bits & 1:
                    fail("Encrypted or unsafe archive members are not supported")
                if info.file_size > 8 * 1024 * 1024 or info.file_size > max(1, info.compress_size) * 200:
                    fail("Workbook expansion exceeds safe limits", "PREVIEW_SIZE_LIMIT")
                printer_settings = bool(re.fullmatch(r"xl/printersettings/printersettings[0-9]+\.bin", low))
                if any(token in low for token in ("vbaproject", "macrosheet", "activex", "externallink", "connections", "querytable", "embeddings", "customui")) or low.endswith((".exe", ".js", ".html", ".hta")) or low.endswith(".bin") and not printer_settings:
                    fail("Macros, executable content, workbook connections and embedded documents are not supported")
                if low.endswith((".xml", ".rels")):
                    data = archive.read(info)
                    # Reject entity declarations before ElementTree can process them.
                    decoded = data.decode("utf-16" if data.startswith((b"\xff\xfe", b"\xfe\xff")) else "utf-8-sig")
                    if "\x00" in decoded or any(token in decoded.upper() for token in ("<!DOCTYPE", "<!ENTITY", "<?XML-STYLESHEET")):
                        fail("XML entities and external stylesheets are not supported")
                    root = ET.fromstring(decoded)
                    if low.endswith(".rels"):
                        for rel in root:
                            if rel.get("TargetMode", "").strip().lower() not in {"", "internal"} or re.match(r"[a-z][a-z0-9+.-]*:", rel.get("Target", ""), re.I) or rel.get("Target", "").startswith("//"):
                                fail("External workbook relationships/connections are not supported")
                    xml[name] = root
            workbook = xml.get("xl/workbook.xml")
            relationships = xml.get("xl/_rels/workbook.xml.rels")
            if workbook is None or relationships is None or "[Content_Types].xml" not in xml:
                fail("The file is not a supported OOXML workbook")
            if any("macroEnabled" in str(x.attrib) for x in xml["[Content_Types].xml"]):
                fail("Macro-enabled workbooks are not supported")
            shared = []
            if "xl/sharedStrings.xml" in xml:
                for si in xml["xl/sharedStrings.xml"]:
                    value = "".join(t.text or "" for t in si.iter(NS + "t"))
                    if len(value) > 2048 or len(shared) >= MAX_CELLS:
                        fail("Shared strings exceed safe limits")
                    shared.append(value)
            styles = xml.get("xl/styles.xml")
            dates = set()
            if styles is not None:
                custom = {int(n.get("numFmtId")): n.get("formatCode", "") for n in styles.findall(NS + "numFmts/" + NS + "numFmt")}
                for i, xf in enumerate(styles.findall(NS + "cellXfs/" + NS + "xf")):
                    number = int(xf.get("numFmtId", "0"))
                    fmt = re.sub(r'"[^"]*"|\[[^\]]*\]|\\.', "", custom.get(number, "")).lower()
                    if number in set(range(14, 23)) | set(range(27, 37)) | set(range(50, 59)) or ("y" in fmt or "d" in fmt) and "m" in fmt:
                        dates.add(i)
            props = workbook.find(NS + "workbookPr")
            is1904 = props is not None and props.get("date1904") in {"1", "true"}
            links = {r.get("Id"): r.get("Target", "") for r in relationships}
            sheets = workbook.findall(NS + "sheets/" + NS + "sheet")
            if not 1 <= len(sheets) <= 16:
                fail("Workbooks must have 1–16 sheets", "PREVIEW_SIZE_LIMIT")
            result = []
            for entry in sheets:
                target = links.get(entry.get(DOC_REL + "id"), "")
                if ".." in target.split("/") or "\\" in target or ":" in target:
                    fail("Unsafe worksheet relationship")
                path = posixpath.normpath(target.lstrip("/") if target.startswith("/") else "xl/" + target)
                if not re.fullmatch(r"xl/worksheets/[^/]+\.xml", path) or path not in xml:
                    fail("Unsupported worksheet relationship")
                rows = []
                for row in xml[path].findall(NS + "sheetData/" + NS + "row"):
                    number = int(row.get("r", "0"))
                    if not 1 <= number <= 100000:
                        fail("Invalid worksheet row address")
                    values = {}
                    for node in row.findall(NS + "c"):
                        address = node.get("r", "")
                        match = re.fullmatch(r"([A-Z]{1,3})([1-9][0-9]{0,5})", address)
                        if not match or int(match[2]) != number:
                            fail("Invalid worksheet cell address")
                        column = 0
                        for letter in match[1]:
                            column = column * 26 + ord(letter) - 64
                        column -= 1
                        value = node.findtext(NS + "v", "")
                        kind = node.get("t", "n")
                        formula = node.find(NS + "f")
                        if formula is not None:
                            value, kind = "=" + (formula.text or ""), "formula"
                        elif kind == "s":
                            value = shared[int(value)]
                        elif kind == "inlineStr":
                            value = "".join(n.text or "" for n in node.iter(NS + "t"))
                        if not value:
                            continue
                        if column >= MAX_COLS or column in values:
                            fail("Nonempty cells must fit within 50 unique columns")
                        extra = {}
                        if kind == "n" and int(node.get("s", "0")) in dates:
                            serial = float(value)
                            if not 0 <= serial <= 100000 or not is1904 and 60 <= serial < 61:
                                fail("Invalid Excel date serial")
                            base = datetime(1904, 1, 1) if is1904 else datetime(1899, 12, 30) if serial >= 61 else datetime(1899, 12, 31)
                            extra["excel_date"] = (base + timedelta(days=serial)).date().isoformat()
                        values[column] = cell(value, kind, **extra)
                    if values:
                        rows.append({"number": number, "cells": [values.get(i, {"value": "", "kind": "text"}) for i in range(max(values) + 1)]})
                    if len(rows) > MAX_ROWS:
                        fail("A sheet exceeds 2,000 nonempty rows", "PREVIEW_SIZE_LIMIT")
                result.append(sheet(entry.get("name", "Worksheet")[:100], rows))
            return result
    except SecurityError:
        raise
    except (zipfile.BadZipFile, ET.ParseError, ValueError, KeyError, IndexError, OverflowError, RuntimeError, NotImplementedError):
        fail("The workbook is malformed or uses an unsupported Excel structure")
