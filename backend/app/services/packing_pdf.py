"""Bounded A4 documents from server snapshots. No URL fetching or executable templates."""

import base64
import io
from pathlib import Path
from xml.sax.saxutils import escape
from reportlab.lib import colors
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.enums import TA_RIGHT
from reportlab.lib.pagesizes import A4
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import (
    SimpleDocTemplate,
    Paragraph,
    Spacer,
    Table,
    LongTable,
    TableStyle,
    Image,
    KeepTogether,
)

FONT_DIR = Path(__import__("reportlab").__file__).parent / "fonts"
pdfmetrics.registerFont(TTFont("AMBS", str(FONT_DIR / "Vera.ttf")))
pdfmetrics.registerFont(TTFont("AMBS-Bold", str(FONT_DIR / "VeraBd.ttf")))
RED, AMBER, INK, LINE = map(
    colors.HexColor, ["#CC0605", "#F7A600", "#161B24", "#E2E5EA"]
)
BODY = ParagraphStyle(
    "body",
    fontName="AMBS",
    fontSize=8,
    leading=12,
    textColor=INK,
    spaceAfter=3,
    splitLongWords=True,
)
SMALL = ParagraphStyle("small", parent=BODY, fontSize=7, leading=10)
HEADING = ParagraphStyle(
    "heading", parent=BODY, fontName="AMBS-Bold", fontSize=17, leading=23, spaceAfter=10
)
RIGHT = ParagraphStyle("number", parent=SMALL, alignment=TA_RIGHT)


def p(text, style=BODY):
    # User/customer/item data can never introduce Paragraph markup or file URLs.
    return Paragraph(escape(str(text or "Not recorded")).replace("\n", "<br/>"), style)


def render(snapshot):
    if len(snapshot["lines"]) > 200:
        raise ValueError("Document line limit exceeded")
    stream = io.BytesIO()
    document = SimpleDocTemplate(
        stream,
        pagesize=A4,
        rightMargin=36,
        leftMargin=36,
        topMargin=54,
        bottomMargin=52,
        title=snapshot["reference"],
        author="AM Building Solutions",
        subject="Historical issued delivery snapshot"
        if snapshot["official"]
        else "Preparation copy - not proof of dispatch",
    )
    width = A4[0] - 72
    story = [
        p(
            "AMBS / AM BUILDING SOLUTIONS",
            ParagraphStyle(
                "brand",
                parent=BODY,
                fontName="AMBS-Bold",
                textColor=RED,
                fontSize=13,
                leading=20,
            ),
        ),
        p(
            "PACKING LIST" if snapshot["kind"] == "PACKING_LIST" else "DELIVERY ORDER",
            HEADING,
        ),
        p(
            "ISSUED DISPATCH SNAPSHOT"
            if snapshot["official"]
            else "DRAFT - PREPARATION COPY - NOT DISPATCHED",
            ParagraphStyle("state", parent=BODY, fontName="AMBS-Bold", textColor=RED),
        ),
        p(f"{snapshot['reference']} / Revision {snapshot['revision']}", SMALL),
        p(
            f"Issued/prepared at {snapshot['timestamp']} UTC by {snapshot['employee']}",
            SMALL,
        ),
        Spacer(1, 10),
    ]
    metadata = []
    for label, key in [
        ("Customer", "customer"),
        ("Project", "project"),
        ("Contact details", "contact"),
        ("Customer LPO", "lpo"),
        ("Sales order", "order"),
        ("Delivery", "delivery"),
        ("Warehouse", "warehouse"),
        ("Destination", "destination"),
        ("Driver", "driver"),
        ("Dispatch time", "dispatch_at"),
        ("Prepared by", "prepared_by"),
    ]:
        metadata.append([p(label, SMALL), p(snapshot.get(key), SMALL)])
    details = Table(metadata, colWidths=[98, width - 98], hAlign="LEFT")
    details.setStyle(
        TableStyle(
            [
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
                ("BACKGROUND", (0, 0), (0, -1), colors.HexColor("#F4F5F7")),
                ("LINEBELOW", (0, 0), (-1, -1), 0.3, LINE),
                ("LEFTPADDING", (0, 0), (-1, -1), 8),
                ("TOPPADDING", (0, 0), (-1, -1), 5),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
            ]
        )
    )
    story += [details, Spacer(1, 16)]
    if snapshot["official"]:
        header = ["ITEM / LOT / VARIANT", "UNIT", "DISPATCHED", "PICTURE"]
        widths = [width - 206, 58, 72, 76]
    else:
        header = ["ITEM / LOT", "UNIT", "PLANNED", "PICKED", "LOADED", "DISPATCHED"]
        widths = [width - 290, 50, 60, 60, 60, 60]
    rows = [[p(t, SMALL) for t in header]]
    for line in snapshot["lines"]:
        identity = line["name"] + "\n" + line["code"]
        if line.get("variant"):
            identity += "\nVariant: " + line["variant"]
        if line.get("lot"):
            identity += "\nLot/serial: " + line["lot"]
        if snapshot["official"]:
            image = p("Picture unavailable", SMALL)
            if line.get("image"):
                raw = base64.b64decode(line["image"], validate=True)
                photo = Image(io.BytesIO(raw))
                photo._restrictSize(60, 58)
                image = photo
            rows.append(
                [
                    p(identity, SMALL),
                    p(line["unit"], SMALL),
                    p(line["dispatched"], RIGHT),
                    image,
                ]
            )
        else:
            rows.append(
                [
                    p(identity, SMALL),
                    p(line["unit"], SMALL),
                    *[
                        p(line[k] if line[k] is not None else "Not verified", RIGHT)
                        for k in ["planned", "picked", "loaded", "dispatched"]
                    ],
                ]
            )
    table = LongTable(rows, colWidths=widths, repeatRows=1, splitByRow=1, hAlign="LEFT")
    table.setStyle(
        TableStyle(
            [
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
                ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#F4F5F7")),
                ("LINEBELOW", (0, 0), (-1, 0), 2, AMBER),
                ("LINEBELOW", (0, 1), (-1, -1), 0.4, LINE),
                ("LEFTPADDING", (0, 0), (-1, -1), 7),
                ("RIGHTPADDING", (0, 0), (-1, -1), 7),
                ("TOPPADDING", (0, 0), (-1, -1), 9),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 9),
            ]
        )
    )
    story += [table, Spacer(1, 14)]
    if snapshot.get("remaining"):
        story.append(
            p(
                "Remaining order demand (reference only; NOT dispatched in this document):",
                SMALL,
            )
        )
        for row in snapshot["remaining"]:
            story.append(p(f"{row['name']}: {row['quantity']} {row['unit']}", SMALL))
    story += [
        Spacer(1, 12),
        p(
            "Only this delivery's actual posted dispatch establishes shipped quantities. Preparation, document issue and reprint do not move stock.",
            SMALL,
        ),
        p(
            "Historical snapshot. Check current issue, void/replacement and source-reversal status in AMBS ERP using the reference above. A driver arrival event is not signed customer acceptance.",
            SMALL,
        ),
        Spacer(1, 18),
    ]
    signatures = Table(
        [
            [
                p("Receiver name / signature: __________________", SMALL),
                p("Driver signature: __________________", SMALL),
            ],
            [
                p("Date: __________________", SMALL),
                p("Date: __________________", SMALL),
            ],
        ],
        colWidths=[width / 2] * 2,
    )
    signatures.setStyle(
        TableStyle(
            [
                ("TOPPADDING", (0, 0), (-1, -1), 10),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 10),
            ]
        )
    )
    story.append(KeepTogether([signatures]))

    def page(canvas, doc):
        canvas.saveState()
        canvas.setStrokeColor(RED)
        canvas.setLineWidth(2)
        canvas.line(36, A4[1] - 32, A4[0] - 36, A4[1] - 32)
        canvas.setFont("AMBS", 7)
        canvas.setFillColor(INK)
        canvas.drawString(
            36, 27, snapshot["reference"] + " / R" + str(snapshot["revision"])
        )
        canvas.drawRightString(A4[0] - 36, 27, "Page " + str(doc.page))
        canvas.restoreState()

    document.build(story, onFirstPage=page, onLaterPages=page)
    result = stream.getvalue()
    if len(result) > 10 * 1024 * 1024:
        raise ValueError("Generated document exceeds the size limit")
    return result
