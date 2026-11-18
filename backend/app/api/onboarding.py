"""Inert inspection, validation and report export. There is no import endpoint."""
from typing import Annotated, Literal
from fastapi import APIRouter, Depends
from fastapi.responses import Response
from pydantic import BaseModel, ConfigDict, Field
from sqlalchemy.orm import Session
from app.core.security import SecurityError, current_context, deny
from app.db.session import get_session
from app.models.security import AuditEvent
from app.services import onboarding as engine

router = APIRouter(prefix="/onboarding", tags=["Import preview only"])
Category = Literal["customers", "projects", "lpos", "items", "units", "categories", "packing_deliveries", "physical_stock"]


class Upload(BaseModel):
    model_config = ConfigDict(extra="forbid")
    category: Category
    filename: str = Field(min_length=1, max_length=180)
    content_base64: str = Field(min_length=4, max_length=5592408)


class Validation(Upload):
    sheet: int = Field(ge=0, le=15)
    header_row: int = Field(ge=1, le=100000)
    header_span: int = Field(default=1, ge=1, le=2)
    mapping: dict[Annotated[str, Field(max_length=40)], Annotated[str, Field(pattern=r"^[A-Z]{1,2}$")]] = Field(max_length=15)
    date_format: Literal["iso", "dmy", "mdy"] = "iso"


def access(context=Depends(current_context), db: Session = Depends(get_session)):
    if not {r.code for r in context.user.roles}.intersection({"SUPER_ADMIN", "OPERATIONS"}):
        deny(db, 403, "PERMISSION_DENIED", "Import previews are restricted to administrators and operations", context.user, details={"resource": "onboarding"})
    return context


def audited(db, context, action, data, operation):
    try:
        result = operation()
    except SecurityError as error:
        deny(db, error.status, error.code, error.message, context.user, action="onboarding.rejected", details={"category": data.category})
    details = {"category": data.category, "sha256": result["sha256"], "summary": result.get("summary", {"sheets": len(result.get("sheets", []))})}
    # Never retain filename, source values, mappings, report text or customer names.
    db.add(AuditEvent(actor_id=context.user.id, actor_username=context.user.username, action="onboarding." + action, target_type="import_preview", details=details))
    db.commit()
    return result


@router.get("/options")
def options(context=Depends(access)):
    return {"notice": engine.NOTICE, "categories": [{"id": c, "fields": list(fields), "required": list(engine.REQUIRED[c])} for c, fields in engine.FIELDS.items()], "limits": {"upload_mib": 4, "sheets": 16, "rows_per_sheet": 2000, "total_rows": 5000, "columns": 50, "cells": 50000, "cell_characters": 2048}, "retention": "Request memory only; no server file or preview is retained. Reselect the source after a page refresh."}


@router.post("/inspect")
def inspect_upload(data: Upload, context=Depends(access), db: Session = Depends(get_session)):
    return audited(db, context, "inspected", data, lambda: engine.inspect_file(data))


@router.post("/validate")
def validate_upload(data: Validation, context=Depends(access), db: Session = Depends(get_session)):
    return audited(db, context, "validated", data, lambda: engine.validate(data, db))


@router.post("/report")
def report(data: Validation, context=Depends(access), db: Session = Depends(get_session)):
    result = audited(db, context, "report_exported", data, lambda: engine.validate(data, db))
    return Response(content=engine.validation_csv(result), media_type="text/csv; charset=utf-8", headers={"Content-Disposition": 'attachment; filename="ambs-validation-preview.csv"', "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff"})
