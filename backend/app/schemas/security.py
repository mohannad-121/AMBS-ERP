import re
import unicodedata
import uuid
from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, EmailStr, Field, SecretStr, field_validator


def normalize_identity(value: str) -> str:
    if not isinstance(value, str):
        raise ValueError("A text identifier is required")
    return unicodedata.normalize("NFKC", value).strip().casefold()


class StrictModel(BaseModel):
    model_config = ConfigDict(extra="forbid")


class ActionResponse(BaseModel):
    status: Literal["ok"]


class CsrfResponse(BaseModel):
    csrf_token: str


class ServiceStatusResponse(BaseModel):
    available: bool
    message: str


class SystemStatusResponse(BaseModel):
    backend: ServiceStatusResponse
    database: ServiceStatusResponse
    checked_at: datetime = Field(alias="checkedAt")


class UserFields(StrictModel):
    username: str = Field(min_length=3, max_length=64)
    email: EmailStr | None = None
    display_name: str = Field(min_length=1, max_length=120)

    @field_validator("username", mode="before")
    @classmethod
    def normalized_username(cls, value: str) -> str:
        value = normalize_identity(value)
        if not re.fullmatch(r"[a-z0-9][a-z0-9_.-]{2,63}", value):
            raise ValueError("Use 3-64 letters, digits, dots, underscores or hyphens")
        return value

    @field_validator("email", mode="before")
    @classmethod
    def normalized_email(cls, value):
        return normalize_identity(value) if value else None

    @field_validator("display_name")
    @classmethod
    def valid_display_name(cls, value: str) -> str:
        value = value.strip()
        if not value or any(
            unicodedata.category(char).startswith("C") for char in value
        ):
            raise ValueError("A printable display name is required")
        return value


class RoleAssignment(StrictModel):
    roles: list[str] = Field(max_length=7)


class PasswordReset(StrictModel):
    password: SecretStr = Field(min_length=12, max_length=128)


class UserCreate(UserFields, PasswordReset):
    roles: list[str] = Field(default_factory=list, max_length=7)


class UserUpdate(StrictModel):
    username: str | None = Field(default=None, min_length=3, max_length=64)
    email: EmailStr | None = None
    display_name: str | None = Field(default=None, min_length=1, max_length=120)
    roles: list[str] | None = Field(default=None, max_length=7)

    @field_validator("username", mode="before")
    @classmethod
    def normalized_username(cls, value):
        if value is None:
            raise ValueError("Username cannot be null")
        return UserFields.normalized_username(value)

    @field_validator("email", mode="before")
    @classmethod
    def normalized_email(cls, value):
        return UserFields.normalized_email(value)

    @field_validator("display_name")
    @classmethod
    def valid_display_name(cls, value):
        if value is None:
            raise ValueError("Display name cannot be null")
        return UserFields.valid_display_name(value)


class ActivationUpdate(StrictModel):
    is_active: bool


class LoginRequest(StrictModel):
    identifier: str = Field(min_length=1, max_length=254)
    password: SecretStr = Field(min_length=1, max_length=128)


class UserResponse(BaseModel):
    id: uuid.UUID
    username: str
    email: str | None
    display_name: str
    is_active: bool
    roles: list[str]
    permissions: list[str]
    created_at: datetime
    updated_at: datetime


class UserPage(BaseModel):
    items: list[UserResponse]
    total: int
    page: int
    page_size: int


class RoleResponse(BaseModel):
    id: uuid.UUID
    code: str
    description: str
    permissions: list[str]


class PermissionResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    code: str
    description: str


class AuditResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: uuid.UUID
    actor_id: uuid.UUID | None
    actor_username: str | None
    action: str
    target_type: str | None
    target_id: uuid.UUID | None
    occurred_at: datetime
    details: dict


class AuditPage(BaseModel):
    items: list[AuditResponse]
    total: int
    page: int
    page_size: int
