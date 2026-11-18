"""Bounded count proposals only; no adjustment or posting command exists."""
import uuid
from pydantic import Field
from app.schemas.inventory import Strict, Nonnegative


class PhysicalLine(Strict):
    item_id: uuid.UUID
    location_id: uuid.UUID
    unit_id: uuid.UUID
    lot_id: uuid.UUID | None = None
    quantity: Nonnegative


class PhysicalPreview(Strict):
    lines: list[PhysicalLine] = Field(min_length=1, max_length=100)
