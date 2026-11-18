"""Review-only routes. No posting, repair, import or persisted physical-count proposal."""
import uuid
from datetime import datetime
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from app.core.security import require_permission, deny
from app.db.session import get_session
from app.models.security import AuditEvent
from app.schemas.inventory_review import PhysicalPreview
from app.services import inventory_review as service
from app.services.item_journey import journey

router=APIRouter(prefix='/inventory',tags=['Read-only inventory review'])


@router.get('/review')
def review(item_id:uuid.UUID|None=None,location_id:uuid.UUID|None=None,lot_id:uuid.UUID|None=None,page:int=Query(1,ge=1),context=Depends(require_permission('inventory.read')),db:Session=Depends(get_session)):
    return service.review(db,item_id=item_id,location_id=location_id,lot_id=lot_id,page=page)


@router.post('/review/physical-preview')
def physical(data:PhysicalPreview,context=Depends(require_permission('inventory.read')),db:Session=Depends(get_session)):
    if not {r.code for r in context.user.roles}.intersection({'SUPER_ADMIN','OPERATIONS'}):
        deny(db,403,'PERMISSION_DENIED','Physical-count previews are restricted to administrators and operations',context.user)
    result=service.physical_preview(db,data)
    db.add(AuditEvent(actor_id=context.user.id,actor_username=context.user.username,action='inventory.physical_preview',target_type='inventory_review',details={'rows':len(data.lines),'summary':result['summary'],'stock_changes':0}))
    db.commit()
    return result


@router.get('/journey/{item_id}')
def global_journey(item_id:uuid.UUID,lot_id:uuid.UUID|None=None,page:int=Query(1,ge=1),search:str=Query('',max_length=200),kind:str=Query('',max_length=80),location_id:uuid.UUID|None=None,since:datetime|None=None,until:datetime|None=None,context=Depends(require_permission('items.trace.company')),db:Session=Depends(get_session)):
    from app.services.inventory import fail
    if any(t is not None and t.tzinfo is None for t in (since,until)) or since and until and since>until:
        fail('INVALID_DATE_RANGE','Use timezone-aware dates and an end date after the start date',422)
    return journey(db,context,None,item_id,lot_id,page,search,kind,location_id,since,until)
