import uuid
from datetime import date, datetime
from zoneinfo import ZoneInfo
from decimal import Decimal
from typing import Annotated, Literal
from pydantic import Field, EmailStr, model_validator
from app.schemas.inventory import Strict, Qty, Nonnegative, Reason, LineInput
from app.schemas.master import Input

Money = Annotated[Decimal, Field(ge=0, max_digits=30, decimal_places=12)]
Currency = Annotated[str, Field(pattern=r"^[A-Z]{3}$")]
Text = Annotated[str, Field(min_length=1, max_length=2000)]


class Attachment(Strict):
    name: Annotated[str, Field(min_length=1, max_length=200)]
    reference: Annotated[str, Field(min_length=1, max_length=240)]
    # Metadata only: no untrusted URL fetch, executable upload or exposed storage.
    sha256: Annotated[str, Field(pattern=r"^[a-f0-9]{64}$")] | None = None


class SupplierInput(Input):
    types: Annotated[
        list[
            Literal[
                "RAW_MATERIAL",
                "FABRICATION",
                "POWDER_COATING",
                "GALVANIZING",
                "FINISHED_COMPONENT",
                "MULTI_SERVICE",
            ]
        ],
        Field(min_length=1, max_length=6),
    ]
    address: Annotated[str, Field(max_length=1000)] | None = None
    country: Annotated[str, Field(max_length=80)] | None = None
    phone: Annotated[str, Field(max_length=80)] | None = None
    email: EmailStr | None = None
    tax_registration: Annotated[str, Field(max_length=100)] | None = None
    payment_terms: Annotated[str, Field(max_length=1000)] | None = None
    notes: Text | None = None
    duplicate_confirmed: bool = False
    is_active: bool = True


class ContactInput(Strict):
    supplier_id: uuid.UUID
    name: Annotated[str, Field(min_length=1, max_length=200)]
    position: Annotated[str, Field(max_length=100)] | None = None
    phone: Annotated[str, Field(max_length=80)] | None = None
    email: EmailStr | None = None
    is_main: bool = False
    is_active: bool = True


class MaterialInput(Strict):
    supplier_id: uuid.UUID
    item_id: uuid.UUID
    unit_id: uuid.UUID
    supplier_reference: Annotated[str, Field(max_length=200)] | None = None
    description: Annotated[str, Field(max_length=1000)] | None = None
    minimum_quantity: Nonnegative | None = None
    lead_days: Annotated[int, Field(ge=0, le=3650)] | None = None
    reported_available: Nonnegative | None = None
    verified_on: date | None = None
    is_active: bool = True
    notes: Text | None = None

    @model_validator(mode="after")
    def verification(self):
        if (
            self.verified_on
            and self.verified_on > datetime.now(ZoneInfo("Asia/Dubai")).date()
        ):
            raise ValueError("Availability verification cannot be future dated")
        return self


class CommercialInput(Strict):
    line_type: Literal["STOCK", "SERVICE"] = "STOCK"
    item_id: uuid.UUID | None = None
    unit_id: uuid.UUID
    description: Annotated[str, Field(min_length=1, max_length=1000)]
    quantity: Qty
    unit_price: (
        Annotated[Decimal, Field(ge=0, max_digits=22, decimal_places=12)] | None
    ) = None

    @model_validator(mode="after")
    def identity(self):
        if (self.line_type == "STOCK") != (self.item_id is not None):
            raise ValueError(
                "Stock lines require an item; service lines must not create a stock item"
            )
        return self


class DocumentInput(Strict):
    request_key: uuid.UUID
    notes: Text | None = None
    version: int | None = None


class QuoteInput(DocumentInput):
    supplier_id: uuid.UUID
    reference: Annotated[str, Field(min_length=1, max_length=200)]
    quoted_on: date
    valid_until: date | None = None
    currency: Currency
    freight: Money | None = None
    taxes: Money | None = None
    fees: Money | None = None
    lead_days: Annotated[int, Field(ge=0, le=3650)] | None = None
    supersedes_id: uuid.UUID | None = None
    attachments: Annotated[list[Attachment], Field(max_length=10)] = []
    lines: Annotated[list[CommercialInput], Field(min_length=1, max_length=30)]

    @model_validator(mode="after")
    def dates(self):
        if self.valid_until and self.valid_until < self.quoted_on:
            raise ValueError("Validity must not precede quotation date")
        return self


class RequestInput(DocumentInput):
    requested_on: date
    required_on: date | None = None
    priority: Literal["LOW", "NORMAL", "HIGH", "URGENT"] = "NORMAL"
    reason: Reason
    quotation_id: uuid.UUID | None = None
    lines: Annotated[list[CommercialInput], Field(min_length=1, max_length=30)]


class OrderInput(DocumentInput):
    supplier_id: uuid.UUID
    quotation_id: uuid.UUID | None = None
    request_id: uuid.UUID | None = None
    warehouse_id: uuid.UUID
    ordered_on: date
    expected_on: date | None = None
    currency: Currency
    freight: Money | None = None
    taxes: Money | None = None
    fees: Money | None = None
    lines: Annotated[list[CommercialInput], Field(min_length=1, max_length=30)]


class ReceiptLineInput(Strict):
    order_line_id: uuid.UUID
    quantity: Qty
    location_id: uuid.UUID | None = None
    lot_id: uuid.UUID | None = None


class ReceiptInput(DocumentInput):
    order_id: uuid.UUID
    received_at: datetime
    reason: Reason
    source_reference: Annotated[str, Field(max_length=240)] | None = None
    lines: Annotated[list[ReceiptLineInput], Field(min_length=1, max_length=30)]

    @model_validator(mode="after")
    def timezone(self):
        if self.received_at.tzinfo is None:
            raise ValueError("Receipt time must include a timezone")
        return self


class StageInput(Strict):
    name: Annotated[str, Field(min_length=1, max_length=100)]
    supplier_id: uuid.UUID
    location_id: uuid.UUID | None = None
    expected_on: date | None = None


class ProductionInput(DocumentInput):
    item_id: uuid.UUID
    quantity: Qty
    ownership: Literal["AMBS", "SUPPLIER"]
    purchase_order_line_id: uuid.UUID | None = None
    instructions: Text
    planned_start: date | None = None
    expected_finish: date | None = None
    attachments: Annotated[list[Attachment], Field(max_length=10)] = []
    stages: Annotated[list[StageInput], Field(min_length=1, max_length=12)]


class StageOperation(Strict):
    request_key: uuid.UUID
    quantity: Qty
    reason: Reason
    source_id: uuid.UUID | None = None
    location_id: uuid.UUID | None = None
    lot_id: uuid.UUID | None = None


class ScheduleInput(Strict):
    order_id: uuid.UUID | None = None
    stage_id: uuid.UUID | None = None
    requested_on: date | None = None
    confirmed_on: date | None = None
    eta: date | None = None
    reason: Reason
    evidence: Annotated[str, Field(min_length=10, max_length=1000)]

    @model_validator(mode="after")
    def target(self):
        if (self.order_id is None) == (self.stage_id is None):
            raise ValueError("Choose exactly one order or stage")
        return self


class CostInput(Strict):
    request_key: uuid.UUID
    supplier_id: uuid.UUID
    amount: Annotated[Decimal, Field(max_digits=30, decimal_places=12)]
    currency: Currency
    reference: Annotated[str, Field(min_length=1, max_length=200)]
    reason: Reason


class ConversionInput(Strict):
    request_key: uuid.UUID
    reason: Reason
    approved_reference: Annotated[str, Field(min_length=10, max_length=240)]
    inputs: Annotated[list[LineInput], Field(min_length=1, max_length=15)]
    outputs: Annotated[list[LineInput], Field(min_length=1, max_length=15)]


class CompareInput(Strict):
    item_id: uuid.UUID
    unit_id: uuid.UUID
    currency: Currency
    quantity: Qty


class ImportPreview(Strict):
    source_system: Annotated[str, Field(min_length=1, max_length=100)]
    rows: Annotated[list[Annotated[dict, Field(max_length=12)]], Field(max_length=100)]
