"""Authenticated, read-only report and inert CSV endpoints."""
from typing import Annotated
from fastapi import APIRouter, Depends, Query, Request
from fastapi.responses import Response
from sqlalchemy.orm import Session
from app.core.security import current_context, deny
from app.db.session import get_session
from app.schemas.reporting import ReportFilters, Category
from app.services import reporting as service
from app.services.review_snapshot import review_request

router = APIRouter(prefix='/reports', tags=['Operational reporting'])


@router.get('/options')
def options(ctx=Depends(current_context)):
    return dict(categories=service.options(ctx.permissions), timezone=service.TIMEZONE)


@router.get('/choices')
def choices(request: Request, category: Category, field: str=Query(max_length=30),
            search: str=Query('', max_length=120), ctx=Depends(current_context), db: Session=Depends(get_session)):
    if not service.allowed(category, ctx.permissions):
        deny(db, 403, 'PERMISSION_DENIED', 'You do not have permission for this report', ctx.user)
    with review_request(db, ctx, request) as snapshot:
        items = service.choices(snapshot, ctx.permissions, category, field, search)
    db.commit()
    return dict(items=items)


def execute(request, filters, ctx, db, export=False):
    if not service.allowed(filters.category, ctx.permissions):
        deny(db, 403, 'PERMISSION_DENIED', 'You do not have permission for this report', ctx.user,
             details={'resource': 'operational_report'})
    with review_request(db, ctx, request) as snapshot:
        result = service.report(snapshot, ctx.permissions, filters, export=export)
    db.commit()
    return result


@router.get('')
def report(request: Request, filters: Annotated[ReportFilters, Query()],
           ctx=Depends(current_context), db: Session=Depends(get_session)):
    return execute(request, filters, ctx, db)


@router.get('/export')
def export(request: Request, filters: Annotated[ReportFilters, Query()],
           ctx=Depends(current_context), db: Session=Depends(get_session)):
    result = execute(request, filters, ctx, db, export=True)
    return Response(service.export_csv(result), media_type='text/csv; charset=utf-8', headers={
        'Content-Disposition': 'attachment; filename="ambs-operational-report.csv"',
        'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff',
    })
