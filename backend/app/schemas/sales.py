import uuid
from datetime import date
from typing import Literal
from pydantic import Field
from app.schemas.inventory import Strict, Qty, Nonnegative, Operation


class OrderLine(Strict):
    item_id: uuid.UUID
    quantity: Qty


class OrderInput(Operation):
    customer_id: uuid.UUID
    project_id: uuid.UUID | None = None
    lpo_id: uuid.UUID | None = None
    requested_date: date | None = None
    priority: Literal["LOW", "NORMAL", "HIGH", "URGENT"] = "NORMAL"
    notes: str | None = Field(default=None, max_length=2000)
    lines: list[OrderLine] = Field(min_length=1, max_length=30)


class AmendLine(Strict):
    id: uuid.UUID
    quantity: Qty


class Amendment(Operation):
    version: int = Field(ge=1)
    requested_date: date | None = None
    priority: Literal["LOW", "NORMAL", "HIGH", "URGENT"] = "NORMAL"
    notes: str | None = Field(default=None, max_length=2000)
    lines: list[AmendLine] = Field(min_length=1, max_length=30)


class Allocate(Operation):
    warehouse_id: uuid.UUID


class Prepare(Allocate):
    destination: str = Field(min_length=1, max_length=1000)
    driver_id: uuid.UUID | None = None


class ActualLine(Strict):
    id: uuid.UUID
    quantity: Nonnegative


class Actual(Operation):
    verified: Literal[True]
    lines: list[ActualLine] = Field(min_length=1, max_length=100)


class Reverse(Operation):
    goods_returned_to_origin: Literal[True]
