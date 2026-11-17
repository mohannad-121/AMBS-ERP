import uuid
from datetime import datetime
from decimal import Decimal
from typing import Annotated, Literal
from pydantic import Field, field_validator
from app.schemas.inventory import Operation


class SiteInput(Operation):
    source_kind: Literal['warehouse','location','customer','project','delivery']
    source_id: uuid.UUID
    label: str = Field(min_length=1, max_length=200)
    address: str = Field(min_length=1, max_length=2000)
    latitude: Annotated[Decimal, Field(ge=-90, le=90, max_digits=10, decimal_places=7)]
    longitude: Annotated[Decimal, Field(ge=-180, le=180, max_digits=10, decimal_places=7)]
    verified: Literal[True]


class AssignmentInput(Operation):
    driver_id: uuid.UUID
    planned_departure: datetime | None = None

    @field_validator('planned_departure')
    @classmethod
    def aware(cls, value):
        if value is not None and value.tzinfo is None:
            raise ValueError('Include the UTC offset')
        return value


class CalculateInput(Operation):
    origin_id: uuid.UUID
    destination_id: uuid.UUID
    profile: Literal['driving-car'] = 'driving-car'


class ConfirmInput(Operation):
    calculation_id: uuid.UUID
    assignment_id: uuid.UUID
    warnings_reviewed: Literal[True]


class TripInput(Operation):
    status: Literal['ARRIVED','COMPLETED']
    verified: Literal[True]
