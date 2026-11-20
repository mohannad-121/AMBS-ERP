"""Synthetic backend restart rehearsal; generated test database only."""
import json
import secrets
import sys
import uuid
from pathlib import Path
from types import SimpleNamespace
from fastapi import Response
from sqlalchemy import select
from app.cli import provision_admin
from app.core.config import get_settings
from app.core.security import issue_session
from app.db.session import SessionLocal, engine
from app.models.import_review import ReviewDecision
from app.models.master import Customer
from app.models.security import User
from app.schemas.customer_import import CustomerImportRequest
from app.schemas.security import UserCreate
from app.services import customer_import as importer
from app.services.users import create_user
from tests.test_customer_import import ready


def main():
    with SessionLocal() as db: importer.gate(db)
    proof_path = Path(get_settings().durable_review_storage_dir)/'restart-recovery.json'
    if sys.argv[1] == 'seed':
        with SessionLocal() as db:
            admin = provision_admin(db,UserCreate(username='p92.recovery.admin',display_name='Synthetic recovery administrator',password=secrets.token_urlsafe(26)))
            ids = {'reviewer':admin.id}
            for name,roles in [('uploader',['OPERATIONS']),('approver',['SUPER_ADMIN'])]:
                user = create_user(db,UserCreate(username='p92.recovery.'+name,display_name='Synthetic '+name,password=secrets.token_urlsafe(26),roles=roles),admin)
                ids[name] = user.id
            session,_ = issue_session(db,Response(),db.get(User,ids['uploader'])); db.flush(); db.commit()
            principal = SimpleNamespace(user=SimpleNamespace(id=ids['uploader']),session=SimpleNamespace(id=session.id))
        source,request = ready(SessionLocal,ids,namespace='synthetic.restart')
        result = importer.execute(engine,principal,source,request)
        proof_path.write_text(json.dumps({'actor':str(principal.user.id),'session':str(principal.session.id),
            'source':str(source),'request':request.model_dump(mode='json'),'receipt':result['receipt_id']}))
        assert result['receipt_counts']['applied_rows'] == 2
        print(json.dumps({'status':'PASS','phase':'before_restart','receipt':result['receipt_id'],'customers':2}))
    elif sys.argv[1] == 'retry':
        proof = json.loads(proof_path.read_text())
        principal = SimpleNamespace(user=SimpleNamespace(id=uuid.UUID(proof['actor'])),session=SimpleNamespace(id=uuid.UUID(proof['session'])))
        result = importer.execute(engine,principal,proof['source'],CustomerImportRequest.model_validate(proof['request']))
        assert result['receipt_id'] == proof['receipt'] and result['invocation']['applied_rows'] == 0
        with SessionLocal() as db: assert len(list(db.scalars(select(Customer)))) == 2
        print(json.dumps({'status':'PASS','phase':'after_restart','receipt':result['receipt_id'],'customers':2,'retry_applied_rows':0}))
    else: raise RuntimeError('Unknown recovery phase')


if __name__ == '__main__': main()
