"""Internal synthetic service contract. Not mounted as an HTTP route."""
import uuid
from pydantic import BaseModel, ConfigDict, Field


class CustomerImportRequest(BaseModel):
    model_config = ConfigDict(extra='forbid')
    revision_id: uuid.UUID
    validation_id: uuid.UUID
    approval_id: uuid.UUID
    expected_version: int = Field(ge=1)
