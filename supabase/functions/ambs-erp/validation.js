
/* AMBS workspace domain model. */
const LEGACY=['meta','materials','products','bom','plans','purchaseRequests','receipts','movements','stockChecks','weighDocs'];
const LIVE=['customers','suppliers','processors','locations','materials','parts','products','variants','recipes','plans','orders','purchases','jobs','events','reviews','sales','drivers','trips'];
function ensureTables(s){if(s&&typeof s==='object')for(const name of LIVE)if(!Array.isArray(s[name]))s[name]=[];return s;}
const UNITS=['PCS','TUBE','SHEET','SET','M','M²','M³','MM','KG','G','T','L','ROLL','BOX','PACK','PAIR','BUNDLE'];
const validUnit=value=>typeof value==='string'&&/^[A-Z][A-Z0-9²³ _/-]{0,23}$/.test(value);

const EPS=1e-9;
const COMPANIES=LIVE.slice(0,3);
const need=(condition,message)=>{if(!condition)throw Error(message);};
const get=(s,table,id)=>s[table].find(row=>row.id===id);

const MEASURED_UNITS=new Set(['M','M²','M³','MM','KG','G','T','L']);
const measured=unit=>MEASURED_UNITS.has(unit);

function item(s,id){
  return get(s,'materials',id)||get(s,'parts',id)||get(s,'products',id)||get(s,'variants',id);
}

function evalFormula(input){
  try{
    const text=String(input??'').trim();
    need(text.length>0 && text.length<=240,'Enter a formula (maximum 240 characters).');
    const tokens=text.match(/(?:\d+(?:\.\d*)?|\.\d+)|[()+*/-]|[^\s]/g)||[];
    let p=0;
    const take=t=>tokens[p]===t && ++p;
    function factor(){
      if(take('(')){const value=sum(); need(take(')'),'Missing closing parenthesis.'); return value;}
      if(take('+'))return factor();
      if(take('-'))return -factor();
      const token=tokens[p++];
      need(token && /^(?:\d+(?:\.\d*)?|\.\d+)$/.test(token),'Use only numbers and +, −, *, /, parentheses.');
      return Number(token);
    }
    function term(){
      let a=factor();
      while(tokens[p]==='*'||tokens[p]==='/'){
        const op=tokens[p++], b=factor();
        need(op!=='/'||b!==0,'Division by zero.');
        a=op==='*'?a*b:a/b;
        need(Number.isFinite(a),'Formula is out of range.');
      }
      return a;
    }
    function sum(){
      let a=term();
      while(tokens[p]==='+'||tokens[p]==='-'){
        const op=tokens[p++], b=term();
        a=op==='+'?a+b:a-b;
        need(Number.isFinite(a),'Formula is out of range.');
      }
      return a;
    }
    const value=sum();
    need(p===tokens.length,'Unexpected formula input.');
    need(Number.isFinite(value)&&value>=0,'Formula result must be finite and nonnegative.');
    return {ok:true,value};
  }catch(error){return {ok:false,err:error.message};}
}

function validImage(value){return typeof value==='string' && /^data:image\/(?:png|jpeg|jpg|webp|gif);base64,[A-Za-z0-9+/]+=*$/.test(value);}

function codeCheck(s,table,row){
  need(row.code?.trim()&&row.name?.trim(),'Code and name are required.');
  const groups=COMPANIES.includes(table)?[table]:['materials','parts','products','variants'];
  need(!groups.some(k=>s[k].some(r=>r.id!==row.id&&r.code.toLowerCase()===row.code.toLowerCase())),
    'This code or SKU is already in use.');
}

function validRows(rows,name){
  need(Array.isArray(rows),name+' must be a list.');
  const ids=new Set();
  for(const row of rows){
    need(row&&typeof row==='object'&&!Array.isArray(row)&&typeof row.id==='string'&&row.id.length>0&&row.id.length<=200&&!ids.has(row.id),
      'Invalid or duplicate ID in '+name+'.');
    ids.add(row.id);
  }
}
function validateState(s){
  need(s&&s.schema===3&&s.settings&&typeof s.settings.company==='string'&&typeof s.settings.currentUser==='string','Invalid version 3 state.');
  need(s.deletedWorkbookParts==null||(Array.isArray(s.deletedWorkbookParts)&&s.deletedWorkbookParts.every(id=>typeof id==='string'&&id.length<=200)),
    'Invalid deleted workbook parts.');
  ensureTables(s);
  for(const name of LIVE)validRows(s[name],name);
  const ids=new Set();
  for(const t of [...COMPANIES,'materials','parts','products','variants']){
    for(const r of s[t]){
      need(typeof r.code==='string'&&typeof r.name==='string'&&!ids.has(r.id),'Invalid SKU or company in '+t+'.');
      ids.add(r.id);codeCheck(s,t,r);
      if(!COMPANIES.includes(t)){
        need(validUnit(r.unit)||(r.active===false&&r.legacy&&typeof r.unit==='string'),'Unknown unit on '+r.code+'.');
        if(r.image)need(validImage(r.image),'Invalid image on '+r.code+'.');
      }else{
        if(r.image)need(validImage(r.image),'Invalid logo on '+r.code+'.');
        need(r.contacts==null||Array.isArray(r.contacts)&&r.contacts.length<=50&&
          r.contacts.every(c=>c&&typeof c==='object'&&typeof c.name==='string'&&c.name.trim()),'Invalid contact people on '+r.code+'.');
        need(r.tags==null||Array.isArray(r.tags)&&r.tags.every(x=>typeof x==='string'),'Invalid tags on '+r.code+'.');
        need(r.creditLimit==null||Number.isFinite(r.creditLimit)&&r.creditLimit>=0,'Invalid credit limit on '+r.code+'.');
        need(r.leadTime==null||Number.isSafeInteger(r.leadTime)&&r.leadTime>=0,'Invalid lead time on '+r.code+'.');
      }
    }
  }
  for(const l of s.locations){
    need(typeof l.name==='string'&&typeof l.stock==='boolean','Invalid location.');
    if(l.ownerId)need(COMPANIES.includes(l.ownerType)&&get(s,l.ownerType,l.ownerId),'Location has an invalid company.');
  }
  for(const v of s.variants)need(get(s,'parts',v.partId)?.unit===v.unit,'Variant has an invalid parent or unit.');
  const site=id=>get(s,'locations',id);
  const sku=id=>item(s,id);
  const linkedSite=(type,companyId,siteId)=>(!companyId||!!get(s,type,companyId))&&
    (!siteId||site(siteId)?.ownerType===type&&site(siteId)?.ownerId===companyId);
  const positive=n=>Number.isFinite(n)&&n>0;
  const integral=n=>Number.isSafeInteger(n)&&n>0;
  const component=(n,unit)=>measured(unit)?positive(n):integral(n);
  const stockLines=lines=>Array.isArray(lines)&&lines.every(l=>sku(l.sku)&&positive(l.qty));
  const parts=lines=>Array.isArray(lines)&&lines.every(l=>get(s,'parts',l.partId)&&sku(l.sku)&&
    (l.sku===l.partId||get(s,'variants',l.sku)?.partId===l.partId)&&component(l.qty,sku(l.sku).unit)&&component(l.standard,sku(l.sku).unit));
  for(const r of s.recipes){
    need(typeof r.approved==='boolean'&&Array.isArray(r.lines)&&r.lines.length,'BOM has invalid lines.');
    if(r.kind==='part'){
      need(get(s,'parts',r.id)&&r.lines.every(l=>get(s,'materials',l.sku)&&typeof l.formula==='string'),'Part BOM has invalid references.');
      if(r.approved)for(const l of r.lines){
        const m=get(s,'materials',l.sku), f=evalFormula(l.formula);
        need(m.unit===l.unit&&f.ok&&positive(f.value)&&Number.isFinite(l.wastage)&&l.wastage>=0&&l.wastage<=100,'Invalid approved part recipe.');
      }
    }else need(r.kind==='product'&&get(s,'products',r.id)&&r.lines.every(l=>get(s,'parts',l.partId)&&component(l.count,get(s,'parts',l.partId).unit)&&
      (!l.variantId||get(s,'variants',l.variantId)?.partId===l.partId)),'Invalid product recipe.');
  }
  const trace=lines=>Array.isArray(lines)&&lines.every(l=>get(s,'materials',l.sku)&&sku(l.partSku)&&positive(l.qty)&&typeof l.formula==='string');
  for(const p of s.plans)need(site(p.location)&&linkedSite('customers',p.customerId,p.customerSiteId)&&parts(p.parts)&&stockLines(p.materials)&&trace(p.source)&&
    ['Draft','Reserved','Closed'].includes(p.status)&&Array.isArray(p.products)&&p.products.length&&p.products.every(l=>get(s,'products',l.productId)&&integral(l.qty)&&parts(l.parts)),
    'Invalid production plan.');
  for(const o of s.orders)need(site(o.location)&&linkedSite('customers',o.customerId,o.customerSiteId)&&
    linkedSite('processors',o.processorId,o.processorSiteId)&&get(s,'parts',o.partId)&&
    (o.sku===o.partId||get(s,'variants',o.sku)?.partId===o.partId)&&integral(o.qty)&&stockLines(o.materials)&&trace(o.source)&&
    ['Draft','Released','Completed','Cancelled'].includes(o.status),'Invalid production order.');
  for(const p of s.purchases)need(site(p.location)&&linkedSite('suppliers',p.supplierId,p.supplierSiteId)&&get(s,'suppliers',p.supplierId)&&stockLines(p.lines)&&p.lines.length&&
     p.lines.every(l=>Number.isFinite(l.received)&&l.received>=0&&l.received<=l.qty+EPS)&&
     ['Draft','Ordered','Received','Cancelled'].includes(p.status),'Invalid purchase request.');
  for(const j of s.jobs)need(site(j.location)&&site(j.destination)?.ownerId===j.customerId&&
    site(j.destination)?.ownerType==='customers'&&get(s,'customers',j.customerId)&&get(s,'products',j.productId)&&
    parts(j.parts)&&(j.finished||j.parts.length)&&integral(j.qty)&&Number.isSafeInteger(j.delivered)&&j.delivered>=0&&j.delivered<=j.qty&&
    typeof j.destinationSnapshot?.name==='string'&&(j.trackAtDestination==null||typeof j.trackAtDestination==='boolean')&&
    (!j.trackAtDestination||j.location!==j.destination)&&
    ['Open','Partially delivered','Delivered','Cancelled'].includes(j.status),'Invalid dispatch job.');
  for(const d of s.drivers)need(typeof d.name==='string'&&d.name.trim()&&typeof d.hasPapers==='boolean'&&(!d.image||validImage(d.image)),'Invalid driver.');
  for(const t of s.trips)need(typeof t.no==='string'&&get(s,'drivers',t.driverId)&&(!t.customerId||get(s,'customers',t.customerId))&&
    (!t.jobId||get(s,'jobs',t.jobId))&&(!t.salesId||get(s,'sales',t.salesId))&&Number.isFinite(t.km)&&t.km>=0&&
    ['Next','On the way','Delivered','Cancelled'].includes(t.status),'Invalid delivery trip.');
  for(const o of s.sales)need(typeof o.no==='string'&&get(s,'customers',o.customerId)&&linkedSite('customers',o.customerId,o.siteId)&&
    Array.isArray(o.lines)&&o.lines.length&&new Set(o.lines.map(l=>l.sku)).size===o.lines.length&&
    o.lines.every(l=>sku(l.sku)&&component(l.qty,sku(l.sku).unit)&&Number.isFinite(l.price)&&l.price>=0&&
      Number.isFinite(l.delivered)&&l.delivered>=0&&l.delivered<=l.qty+EPS)&&
    ['Draft','Confirmed','Partially delivered','Delivered','Cancelled'].includes(o.status),'Invalid sales order.');
  const sums=new Map(), delivered=new Map(), received=new Map(), shipped=new Map();
  for(const e of s.events){
    need(typeof e.at==='string'&&typeof e.type==='string'&&Array.isArray(e.lines),'Invalid stock event.');
    if(e.partyType||e.partyId||e.siteId){
      need(COMPANIES.includes(e.partyType)&&get(s,e.partyType,e.partyId),'Stock event has an invalid related company.');
      if(e.siteId){const linked=get(s,'locations',e.siteId);
        need(linked?.ownerType===e.partyType&&linked.ownerId===e.partyId,'Stock event site must belong to its related company.');}
    }
    if(e.orderId){
      const order=get(s,'orders',e.orderId);
      need(order&&e.id==='production:'+e.orderId,'Invalid production event link.');
      if(e.partyId)need(e.partyType==='customers'&&e.partyId===order.customerId&&
        e.siteId===(order.customerSiteId||''),'Production event has an invalid customer or site link.');
    }
    if(e.jobId){
      const job=get(s,'jobs',e.jobId);
      need(job&&integral(e.deliveredQty)&&typeof e.reference==='string','Invalid delivery event.');
      if(e.partyId)need(e.partyType==='customers'&&e.partyId===get(s,'jobs',e.jobId).customerId&&
        e.siteId===get(s,'jobs',e.jobId).destination,'Delivery event has an invalid customer or site link.');
      if(job.trackAtDestination){
        const totals=new Map();
        need(e.lines.some(line=>line.location===job.destination&&line.delta>0)&&
          e.lines.every(line=>line.location===job.location&&line.delta<0||line.location===job.destination&&line.delta>0),
          'Tracked delivery must transfer stock between source and customer site.');
        e.lines.forEach(line=>totals.set(line.sku,(totals.get(line.sku)||0)+line.delta));
        need([...totals.values()].every(total=>Math.abs(total)<EPS),'Tracked delivery quantities must balance.');
      }
      delivered.set(e.jobId,(delivered.get(e.jobId)||0)+e.deliveredQty);
    }
    if(e.purchaseId)need(get(s,'purchases',e.purchaseId)&&typeof e.reference==='string','Invalid receipt event.');
    if(e.purchaseId&&e.partyId)need(e.partyType==='suppliers'&&e.partyId===get(s,'purchases',e.purchaseId).supplierId&&
      e.siteId===(get(s,'purchases',e.purchaseId).supplierSiteId||''),
      'Receipt event has an invalid supplier link.');
    if(e.salesId){
      const sale=get(s,'sales',e.salesId);
      need(sale&&typeof e.reference==='string'&&e.partyType==='customers'&&e.partyId===sale.customerId&&
        (e.siteId||'')===(sale.siteId||'')&&e.lines.every(line=>line.delta<0),'Invalid sales delivery event.');
    }
    const sumsEvent=new Map();
    for(const l of e.lines){
      need(sku(l.sku)&&site(l.location)&&Number.isFinite(l.delta),'Stock event has an invalid SKU, location or quantity.');
      const k=JSON.stringify([l.sku,l.location]);
      sumsEvent.set(k,(sumsEvent.get(k)||0)+l.delta);
      if(e.salesId){
        const id=JSON.stringify([e.salesId,l.sku]);
        shipped.set(id,(shipped.get(id)||0)-l.delta);
      }
      if(e.purchaseId){
        const id=JSON.stringify([e.purchaseId,l.sku]);
        received.set(id,(received.get(id)||0)+l.delta);
      }
    }
    for(const [k,delta] of sumsEvent){
      const n=(sums.get(k)||0)+delta;need(Number.isFinite(n)&&n>=-EPS,'The backup produces an invalid or negative stock balance.');sums.set(k,n);
    }
  }
  for(const j of s.jobs)need((delivered.get(j.id)||0)===j.delivered,'Delivery totals do not match the ledger.');
  for(const p of s.purchases)for(const l of p.lines)need(Math.abs((received.get(JSON.stringify([p.id,l.sku]))||0)-l.received)<EPS*10,'Receipt totals do not match the ledger.');
  for(const o of s.orders)need((o.status==='Completed')===!!get(s,'events','production:'+o.id),'Completion does not match the ledger.');
  for(const o of s.sales)for(const l of o.lines)need(Math.abs((shipped.get(JSON.stringify([o.id,l.sku]))||0)-l.delivered)<EPS*10,
    'Sales delivery totals do not match the ledger.');
}
function nativeBackup(d){
  need(d?._app==='AMBS_MRP'&&[1,3].includes(d._version),'Choose a valid AMBS JSON backup.');
  if(d._version===3)validateState(d.state);
  const rows=d._version===3?d.legacy:{...Object.fromEntries(LEGACY.map(n=>[n,d[n]??[]])),
    meta:[{id:'settings',data:d.settings||{}},{id:'counters',data:d.counters||{}}]};
  need(rows&&typeof rows==='object','Legacy archive is missing.');
  for(const n of LEGACY)validRows(rows[n],n);
  for(const d of rows.weighDocs){
    need(/^[\w-]+$/.test(d.id)&&typeof d.name==='string'&&typeof d.no==='string'&&Array.isArray(d.lines)&&
      (d.plates==null||Array.isArray(d.plates))&&(d.costs==null||Array.isArray(d.costs)),'Invalid calculator document.');
  }
  for(const n of ['materials','products'])for(const m of rows[n]){
    need(typeof m.name==='string'&&(!m.code||typeof m.code==='string'),'Invalid legacy '+n+' record.');
  }
  for(const l of rows.bom)need(typeof l.productId==='string'&&typeof l.materialId==='string','Invalid legacy formula reference.');
  for(const m of rows.meta){
    need(m.data&&typeof m.data==='object'&&!Array.isArray(m.data),'Invalid legacy settings.');
    if(m.id==='settings')for(const name of ['company','currentUser','address','phone','email','logo','trn'])
      need(m.data[name]==null||typeof m.data[name]==='string','Invalid legacy profile field.');
  }
  return {data:d.state,rows};
}


export function validateSnapshot(snapshot) {
  need(snapshot?.state&&snapshot.legacy,'Invalid AMBS workspace.');
  nativeBackup({_app:'AMBS_MRP',_version:3,...snapshot});
  for (const collection of [...Object.values(snapshot.legacy), ...LIVE.map(name=>snapshot.state[name])]) {
    need(collection.every(row=>/^[a-zA-Z0-9_:.~|+-]{1,200}$/.test(row.id)),'Unsupported record identifier.');
  }
  need(!snapshot.state.settings.logo||validImage(snapshot.state.settings.logo),'Upload a valid company logo.');
}
