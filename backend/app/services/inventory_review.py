"""Read-only inventory reconciliation. Never creates balances, counts or ledger rows."""
from decimal import Decimal
from sqlalchemy import func, select
from app.models.inventory import LedgerEffect, MovementLine, StockMovement, Reservation, StockBalance, StockLot, Location
from app.models.master import Item, Unit
from app.services import inventory as inv
from app.services.master import get_record

ZERO = Decimal(0)
NOTICE = 'REVIEW ONLY — no stock balances or ledger entries have been changed. Owner approval is required before any real business-data change.'


def review(db, *, item_id=None, location_id=None, lot_id=None, page=1):
    inv.lock_inventory(db)
    ledger = select(LedgerEffect.balance_id, func.sum(LedgerEffect.quantity_delta).label('quantity')).group_by(LedgerEffect.balance_id).subquery()
    holds = select(Reservation.balance_id, func.sum(Reservation.quantity).label('quantity')).where(Reservation.status=='ACTIVE').group_by(Reservation.balance_id).subquery()
    query = select(StockBalance, func.coalesce(ledger.c.quantity, 0), func.coalesce(holds.c.quantity, 0)).outerjoin(ledger, ledger.c.balance_id==StockBalance.id).outerjoin(holds, holds.c.balance_id==StockBalance.id)
    for field, value in [(StockBalance.item_id,item_id),(StockBalance.location_id,location_id),(StockBalance.lot_id,lot_id)]:
        if value is not None: query=query.where(field==value)
    total=db.scalar(select(func.count()).select_from(query.subquery()))
    rows=[]
    for balance, actual, reserved in db.execute(query.order_by(StockBalance.id).offset((page-1)*100).limit(100)):
        item=get_record(db,Item,balance.item_id);unit=get_record(db,Unit,item.unit_id)
        location=get_record(db,Location,balance.location_id)
        issues=[]
        if actual!=balance.on_hand: issues.append('BALANCE_LEDGER_MISMATCH')
        if reserved!=balance.reserved: issues.append('RESERVATION_CACHE_MISMATCH')
        if reserved>actual: issues.append('RESERVATIONS_EXCEED_LEDGER')
        rows.append(dict(balance_id=str(balance.id),item_id=str(item.id),item_name=item.name,sku=item.code,unit=unit.name,unit_id=str(unit.id),location_id=str(location.id),location=location.name,location_kind=location.kind,
            lot_id=str(balance.lot_id) if balance.lot_id else None,lot=get_record(db,StockLot,balance.lot_id).identifier if balance.lot_id else None,
            ledger_on_hand=str(actual),cached_on_hand=str(balance.on_hand),active_reserved=str(reserved),cached_reserved=str(balance.reserved),
            ledger_unreserved=str(actual-reserved),usable_available=str(max(ZERO,actual-reserved)) if inv.allocatable(db,balance) else '0',issues=issues))
    return dict(notice=NOTICE,items=rows,total=total,page=page,page_size=100,scope='ERP ledger/cache consistency; not proof of a physical stock count',stock_changes=0)


def physical_preview(db, data):
    inv.lock_inventory(db)
    seen=set();rows=[]
    for n, line in enumerate(data.lines,1):
        identity=(line.item_id,line.location_id,line.lot_id)
        if identity in seen: inv.fail('DUPLICATE_COUNT_IDENTITY','Each item/location/lot may occur only once; duplicate counts are never combined',422)
        seen.add(identity)
        item=get_record(db,Item,line.item_id);unit=get_record(db,Unit,item.unit_id);location=get_record(db,Location,line.location_id)
        if line.unit_id!=unit.id: inv.fail('UNIT_MISMATCH','Count in the item base unit; implicit conversions are not supported',422)
        if line.quantity!=line.quantity.quantize(Decimal(1).scaleb(-unit.decimal_places)): inv.fail('INVALID_QUANTITY','Count quantity must respect the item unit precision',422)
        mode=inv.tracking(db,item.id)
        if (mode!='NONE') != (line.lot_id is not None): inv.fail('LOT_REQUIRED','Select the exact lot/serial for tracked stock, and no lot for untracked stock',422)
        if line.lot_id:
            lot=get_record(db,StockLot,line.lot_id)
            if lot.item_id!=item.id: inv.fail('LOT_ITEM_MISMATCH','The selected lot/serial belongs to another item',422)
            if lot.is_serial and line.quantity not in (ZERO,Decimal(1)): inv.fail('SERIAL_QUANTITY','A serial count must be zero or one',422)
        balance=db.scalar(select(StockBalance).where(StockBalance.item_id==item.id,StockBalance.location_id==location.id,StockBalance.lot_id==line.lot_id))
        actual=db.scalar(select(func.coalesce(func.sum(LedgerEffect.quantity_delta),0)).where(LedgerEffect.balance_id==balance.id)) if balance else ZERO
        reserved=db.scalar(select(func.coalesce(func.sum(Reservation.quantity),0)).where(Reservation.balance_id==balance.id,Reservation.status=='ACTIVE')) if balance else ZERO
        issues=[]
        if not item.is_active or not location.is_active: issues.append('INACTIVE_REFERENCE')
        if line.quantity<reserved: issues.append('COUNT_BELOW_ACTIVE_RESERVATIONS')
        if balance and (balance.on_hand!=actual or balance.reserved!=reserved): issues.append('ERP_CONSISTENCY_REVIEW_REQUIRED')
        if not balance: issues.append('NO_EXISTING_STOCK_BUCKET')
        delta=line.quantity-actual
        references=list(db.scalars(select(StockMovement.code).join(MovementLine,MovementLine.movement_id==StockMovement.id).join(LedgerEffect,LedgerEffect.line_id==MovementLine.id).where(LedgerEffect.balance_id==balance.id).distinct().order_by(StockMovement.code).limit(20))) if balance else []
        rows.append(dict(row=n,item_id=str(item.id),item_name=item.name,location=location.name,unit=unit.name,lot_id=str(line.lot_id) if line.lot_id else None,references=references,
            counted_quantity=str(line.quantity),ledger_on_hand=str(actual),cached_on_hand=str(balance.on_hand) if balance else '0',active_reserved=str(reserved),ledger_unreserved=str(actual-reserved),variance=str(delta),
            status='SHORTAGE' if delta<0 else 'SURPLUS' if delta>0 else 'MATCH',issues=issues))
    return dict(notice=NOTICE,items=rows,summary={status.lower():sum(r['status']==status for r in rows) for status in ('SHORTAGE','SURPLUS','MATCH')},
        retention='Request/browser memory only; recheck against a fresh ledger snapshot before any separately approved posting',stock_changes=0,ledger_changes=0)


def reconcile_file(db, data):
    """Reuse Phase 8A's inert parser/reference validation, retaining invalid rows."""
    import uuid
    from app.services.onboarding import validate
    from app.schemas.inventory_review import PhysicalLine, PhysicalPreview
    inv.lock_inventory(db)
    result=validate(data,db)
    if len(result['records'])>100:
        inv.fail('RECONCILIATION_ROW_LIMIT','Reconcile at most 100 count rows per review; split the source without duplicating identities',422)
    identities={}
    for row in result['records']:
        if all(f in row['matches'] for f in ('sku','location')):
            identity=tuple(row['matches'][f]['id'] for f in ('sku','location'))
            identities.setdefault(identity,[]).append(row)
    for group in identities.values():
        if len(group)>1:
            for row in group:
                row['valid']=False
                row['issues'].append({'field':'row','code':'DUPLICATE_COUNT_IDENTITY','severity':'error','message':'Multiple source rows resolve to the same stock identity; correct them before comparison. Counts are not summed.'})
    result['summary']['valid']=sum(r['valid'] for r in result['records'])
    result['summary']['invalid']=len(result['records'])-result['summary']['valid']
    for row in result['records']:
        if not row['valid']:
            row['reconciliation']={'status':'INVALID','variance':None,'ledger_on_hand':None,'counted_quantity':row['proposed'].get('quantity'),'issues':['Resolve source validation errors before comparison'],'references':[]}
            continue
        matches=row['matches'];item=get_record(db,Item,uuid.UUID(matches['sku']['id']))
        if inv.tracking(db,item.id)!='NONE':
            row['reconciliation']={'status':'REVIEW_REQUIRED','variance':None,'ledger_on_hand':None,'counted_quantity':row['proposed']['quantity'],'issues':['Exact lot/serial required; this file format does not establish it'],'references':[]}
            continue
        line=PhysicalLine(item_id=item.id,location_id=matches['location']['id'],unit_id=matches['unit']['id'],quantity=row['proposed']['quantity'])
        row['reconciliation']=physical_preview(db,PhysicalPreview(lines=[line]))['items'][0]
    result['notice']=NOTICE
    result['reconciliation_summary']={status.lower():sum(r['reconciliation']['status']==status for r in result['records']) for status in ('MATCH','SHORTAGE','SURPLUS','INVALID','REVIEW_REQUIRED')}
    result['warnings'].append('Partial source scope only; omitted SKUs are not zero counts. Missing/ambiguous SKUs, duplicates and unit errors are never silently combined. Movement references are capped at 20 per row.')
    return result


def reconciliation_csv(result):
    import csv,io,json
    def safe(value):
        text='' if value is None else str(value)
        return "'"+text if text.lstrip().startswith(('=','+','-','@')) or text[:1] and (text[0].isspace() or ord(text[0])<32 or text[0] in {'\ufeff','\u200b'}) else text
    stream=io.StringIO(newline='');writer=csv.writer(stream,quoting=csv.QUOTE_ALL)
    writer.writerow([NOTICE]);writer.writerow(['Source SHA-256',result.get('sha256','')])
    writer.writerow(['Selection',safe(json.dumps(result.get('selection',{}),sort_keys=True))])
    writer.writerow(['Source row','Original values','Status','Expected (ledger)','Counted','Difference','Active reserved','Findings','Supporting movements (max 20)'])
    for row in result['records']:
        r=row['reconciliation'];findings=[i['message'] for i in row['issues']]+r.get('issues',[])
        writer.writerow([safe(v) for v in [row['row'],json.dumps(row['original'],ensure_ascii=False,sort_keys=True),r['status'],r.get('ledger_on_hand'),r.get('counted_quantity'),r.get('variance'),r.get('active_reserved'),'; '.join(findings),'; '.join(r.get('references',[]))]])
    return ('\ufeff'+stream.getvalue()).encode('utf-8')
