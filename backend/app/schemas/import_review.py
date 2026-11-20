from typing import Annotated, Literal
from pydantic import BaseModel, ConfigDict, Field, field_validator
from app.api.onboarding import Upload, Category


class SourceUpload(Upload):
    namespace: str = Field(pattern=r'^[a-z0-9][a-z0-9_.-]{2,99}$')
    synthetic_only: Literal[True]


class Selection(BaseModel):
    model_config = ConfigDict(extra='forbid')
    category: Category
    sheet: int = Field(ge=0, le=15)
    header_row: int = Field(ge=1, le=100000)
    header_span: int = Field(default=1, ge=1, le=2)
    mapping: dict[Annotated[str, Field(max_length=40)], Annotated[str, Field(pattern=r'^[A-Z]{1,2}$')]] = Field(max_length=15)
    mapping_version: str = Field(pattern=r'^[a-zA-Z0-9_.-]{1,40}$')
    date_format: Literal['iso','dmy','mdy'] = 'iso'
    selected_rows: list[int] = Field(min_length=1,max_length=100)
    source_keys: dict[str,str] = Field(max_length=100)
    intended_action: Literal['PROPOSE_CREATE','PROPOSE_LINK','PROPOSE_UPDATE','HISTORICAL_REFERENCE_ONLY','PHYSICAL_REVIEW_ONLY']

    @field_validator('selected_rows')
    @classmethod
    def unique_rows(cls, rows):
        if len(rows)!=len(set(rows)) or any(x<1 or x>100000 for x in rows):
            raise ValueError('Select distinct positive source row numbers')
        return sorted(rows)

    @field_validator('source_keys')
    @classmethod
    def bounded_keys(cls, values):
        if any(not k.isdecimal() or len(v)>200 or not v.strip() for k,v in values.items()):
            raise ValueError('Use bounded nonempty source identities keyed by source row')
        return values


class RevisionInput(Selection):
    expected_version: int = Field(ge=0)


class Action(BaseModel):
    model_config = ConfigDict(extra='forbid')
    expected_version: int = Field(ge=1)
    reason: str = Field(min_length=3,max_length=500)
