import uuid
from datetime import datetime
from decimal import Decimal
from typing import Annotated, Literal
from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator
from app.schemas.master import Input

Qty = Annotated[Decimal, Field(gt=0, max_digits=20, decimal_places=6)]
Nonnegative = Annotated[Decimal, Field(ge=0, max_digits=20, decimal_places=6)]
Reason = Annotated[str, Field(min_length=10, max_length=1000)]
Kind = Literal[
    "RECEIPT",
    "ISSUE",
    "TRANSFER",
    "ADJUSTMENT_IN",
    "ADJUSTMENT_OUT",
    "RETURN",
    "DAMAGE",
    "QUARANTINE_TRANSFER",
    "INSPECTION_RELEASE",
]


class Strict(BaseModel):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)


class WarehouseInput(Input):
    description: Annotated[str, Field(max_length=2000)] | None = None
    address: Annotated[str, Field(max_length=1000)] | None = None
    is_default: bool = False
    is_active: bool = True


class LocationInput(Input):
    warehouse_id: uuid.UUID
    parent_id: uuid.UUID | None = None
    kind: Literal["USABLE", "QUARANTINE", "DAMAGED", "REJECTED"] = "USABLE"
    is_active: bool = True


class PolicyInput(Strict):
    tracking_mode: Literal["NONE", "LOT", "SERIAL"]


class LotInput(Input):
    item_id: uuid.UUID
    identifier: Annotated[str, Field(min_length=1, max_length=120)]
    notes: Annotated[str, Field(max_length=2000)] | None = None


class LotStatus(Strict):
    status: Literal["ACTIVE", "BLOCKED"]
    reason: Reason


class LineInput(Strict):
    item_id: uuid.UUID
    unit_id: uuid.UUID
    quantity: Qty
    source_id: uuid.UUID | None = None
    destination_id: uuid.UUID | None = None
    lot_id: uuid.UUID | None = None
    unit_cost: (
        Annotated[Decimal, Field(ge=0, max_digits=22, decimal_places=12)] | None
    ) = None
    currency: Annotated[str, Field(pattern=r"^[A-Z]{3}$")] | None = None

    @model_validator(mode="after")
    def cost_pair(self):
        if (self.unit_cost is None) != (self.currency is None):
            raise ValueError(
                "Supply both currency and unit cost, or leave both unknown"
            )
        return self


class MovementInput(Strict):
    kind: Kind
    reason: Reason
    source_reference: Annotated[str, Field(max_length=240)] | None = None
    occurred_at: datetime
    lines: list[LineInput] = Field(min_length=1, max_length=30)
    version: int | None = Field(default=None, ge=1)

    @field_validator("occurred_at")
    @classmethod
    def timezone_required(cls, value):
        if value.tzinfo is None:
            raise ValueError("Include the UTC offset")
        return value


class MovementCreate(MovementInput):
    request_key: uuid.UUID


class Operation(Strict):
    request_key: uuid.UUID
    reason: Reason = "Authorized inventory operation"


class ReservationInput(Strict):
    request_key: uuid.UUID
    item_id: uuid.UUID
    location_id: uuid.UUID
    lot_id: uuid.UUID | None = None
    quantity: Qty
    reason: Reason
    source_reference: Annotated[str, Field(max_length=240)] | None = None


class CountScope(Strict):
    item_id: uuid.UUID
    lot_id: uuid.UUID | None = None


class CountInput(Strict):
    request_key: uuid.UUID
    location_id: uuid.UUID
    reason: Reason
    lines: list[CountScope] = Field(min_length=1, max_length=30)


class CountValue(Strict):
    line_id: uuid.UUID
    counted_quantity: Nonnegative
    reason: Reason


class CountRecord(Strict):
    lines: list[CountValue] = Field(min_length=1, max_length=30)


class ThresholdInput(Strict):
    item_id: uuid.UUID
    warehouse_id: uuid.UUID
    location_id: uuid.UUID | None = None
    minimum: Nonnegative
