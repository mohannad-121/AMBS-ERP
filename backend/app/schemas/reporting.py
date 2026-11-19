"""Typed, fail-closed reporting scope. No write schema or financial transactions."""
from datetime import date
from typing import Literal
from uuid import UUID
from pydantic import BaseModel, ConfigDict, Field, model_validator

Category = Literal['sales','purchasing','inventory','low_stock','movements','production','production_events','deliveries','packing','exceptions']

class ReportFilters(BaseModel):
    model_config = ConfigDict(extra='forbid')
    category: Category = 'sales'
    page: int = Field(1, ge=1, le=10000)
    since: date | None = None
    until: date | None = None
    customer_id: UUID | None = None
    project_id: UUID | None = None
    item_id: UUID | None = None
    warehouse_id: UUID | None = None
    location_id: UUID | None = None
    supplier_id: UUID | None = None
    status: str = Field('', max_length=30, pattern=r'^[A-Z_]*$')
    search: str = Field('', max_length=120)

    @model_validator(mode='after')
    def date_order(self):
        if any(d and not 1900 <= d.year <= 9998 for d in [self.since, self.until]):
            raise ValueError('Reporting dates must be between 1900 and 9998')
        if self.since and self.until and self.since > self.until:
            raise ValueError('The through date must be on or after the from date')
        return self
