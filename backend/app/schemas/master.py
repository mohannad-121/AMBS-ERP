import re
import unicodedata
import uuid
from datetime import date
from decimal import Decimal
from typing import Annotated, Literal

from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator

Name = Annotated[str, Field(min_length=1, max_length=200)]
Short = Annotated[str, Field(max_length=150)]
Notes = Annotated[str, Field(max_length=4000)]


def clean(value: str) -> str:
    return " ".join(unicodedata.normalize("NFKC", value).split())


def normalized(value: str) -> str:
    return clean(value).casefold()


class Input(BaseModel):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)
    name: Name

    @field_validator("name")
    @classmethod
    def valid_name(cls, value):
        value = clean(value)
        if not value or len(value) > 200 or any(ord(c) < 32 for c in value):
            raise ValueError("Enter a name from 1 to 200 characters")
        return value


class CustomerInput(Input):
    customer_type: Annotated[str, Field(max_length=80)] | None = None
    contact_name: Short | None = None
    email: EmailStr | None = None
    phone: Annotated[str, Field(max_length=50)] | None = None
    address: Notes | None = None
    country: Annotated[str, Field(min_length=1, max_length=80)] = "United Arab Emirates"
    trn: Annotated[str, Field(pattern=r"^[0-9]{15}$")] | None = None
    notes: Notes | None = None
    acknowledge_duplicate: bool = False
    duplicate_reason: Annotated[str, Field(min_length=10, max_length=300)] | None = None


class ProjectInput(Input):
    customer_id: uuid.UUID
    location: Annotated[str, Field(max_length=255)] | None = None
    site_contact: Short | None = None
    phone: Annotated[str, Field(max_length=50)] | None = None
    status: Literal["active", "completed", "archived"] = "active"
    notes: Notes | None = None


class LpoInput(Input):
    customer_id: uuid.UUID
    project_id: uuid.UUID | None = None
    number: Annotated[str, Field(min_length=1, max_length=150)]
    lpo_date: date | None = None
    status: Literal["active", "closed", "cancelled"] = "active"
    notes: Notes | None = None
    document_reference: Annotated[str, Field(max_length=255)] | None = None


class CategoryInput(Input):
    parent_id: uuid.UUID | None = None


class UnitInput(Input):
    decimal_places: Annotated[int, Field(ge=0, le=6)] = 0


class FamilyInput(Input):
    description: Notes | None = None
    attribute_definitions: dict[str, list[str]] = Field(
        default_factory=dict, max_length=12
    )

    @field_validator("attribute_definitions")
    @classmethod
    def definitions(cls, value):
        result = {}
        for key, choices in value.items():
            key = normalized(key)
            if (
                not re.fullmatch(r"[a-z][a-z0-9_]{0,39}", key)
                or key in result
                or not 1 <= len(choices) <= 100
            ):
                raise ValueError("Use unique attribute keys and 1–100 approved values")
            values = [normalized(choice) for choice in choices]
            if any(not choice or len(choice) > 100 for choice in values) or len(
                set(values)
            ) != len(values):
                raise ValueError("Approved values must be nonempty and unique")
            result[key] = values
        return result


class ItemInput(Input):
    description: Notes | None = None
    item_type: Literal["finished", "raw_material", "component", "accessory", "kit"]
    category_id: uuid.UUID
    unit_id: uuid.UUID
    family_id: uuid.UUID | None = None
    attributes: dict[str, str] = Field(default_factory=dict, max_length=12)
    colour: Annotated[str, Field(max_length=80)] | None = None
    dimensions: Short | None = None
    design: Annotated[str, Field(max_length=80)] | None = None
    weight_kg: (
        Annotated[Decimal, Field(ge=0, max_digits=14, decimal_places=6)] | None
    ) = None

    @field_validator("attributes")
    @classmethod
    def attributes_valid(cls, value):
        result = {normalized(k): normalized(v) for k, v in value.items()}
        if len(result) != len(value) or any(
            not k or len(k) > 40 or not v or len(v) > 100 for k, v in result.items()
        ):
            raise ValueError("Use unique attribute keys and nonempty values")
        return result


class Activation(BaseModel):
    model_config = ConfigDict(extra="forbid")
    is_active: bool


class ImageInput(BaseModel):
    model_config = ConfigDict(extra="forbid")
    mime_type: Literal["image/png", "image/jpeg", "image/webp"]
    content_base64: str = Field(min_length=4, max_length=6990508)


class MasterPage(BaseModel):
    items: list[dict]
    total: int
    page: int
    page_size: int
