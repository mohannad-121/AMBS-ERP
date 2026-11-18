"""Strict declarations: quantities come from domain records, never PDF clients."""

import uuid
from datetime import date
from decimal import Decimal
from typing import Annotated, Literal
from pydantic import Field, model_validator
from app.schemas.inventory import Strict, Operation, Qty, Reason


class Change(Operation):
    reason: Reason


class BomApproval(Change):
    specification_confirmed: Literal[True]


class IssueDocument(Change):
    kind: Literal["PACKING_LIST", "DELIVERY_ORDER"]
    replaces_id: uuid.UUID | None = None


class ComponentInput(Strict):
    item_id: uuid.UUID
    quantity: Qty
    unit_id: uuid.UUID
    waste_percent: (
        Annotated[Decimal, Field(ge=0, le=100, max_digits=7, decimal_places=4)] | None
    ) = None


class BomInput(Change):
    item_id: uuid.UUID
    output_quantity: Qty
    unit_id: uuid.UUID
    components: Annotated[list[ComponentInput], Field(min_length=1, max_length=80)]
    source_reference: Annotated[str, Field(min_length=5, max_length=2000)]
    effective_from: date | None = None
    effective_until: date | None = None
    previous_id: uuid.UUID | None = None
    version: int = Field(1, ge=1)

    @model_validator(mode="after")
    def dates(self):
        if (
            self.effective_from
            and self.effective_until
            and self.effective_from > self.effective_until
        ):
            raise ValueError("Effective dates must be in order")
        return self


class PlanInput(Change):
    sales_order_id: uuid.UUID | None = None
    production_order_id: uuid.UUID | None = None
    warehouse_id: uuid.UUID | None = None
    previous_id: uuid.UUID | None = None

    @model_validator(mode="after")
    def source(self):
        if bool(self.sales_order_id) == bool(self.production_order_id):
            raise ValueError("Choose exactly one existing source")
        return self
