
/* ========================================================================
   AM Building Solutions DWC LLC — Production Planning & Stock Control
   Cloud workspace for AMBS.
   ===================================================================== */
'use strict';

/* ---------------- Icons (inline SVG) ---------------- */
const IP = {
  dashboard:'M3 13h8V3H3v10zm0 8h8v-6H3v6zm10 0h8V11h-8v10zm0-18v6h8V3h-8z',
  box:'M21 8l-9-5-9 5v8l9 5 9-5V8zM3 8l9 5 9-5M12 13v8',
  cube:'M12 2l9 5v10l-9 5-9-5V7l9-5zm0 2.3L5 8v8l7 3.9L19 16V8l-7-3.7z',
  bom:'M4 4h6v6H4V4zm10 0h6v6h-6V4zM4 14h6v6H4v-6zm10 0h6v6h-6v-6z',
  plan:'M9 2h6a1 1 0 011 1v1h2a2 2 0 012 2v13a2 2 0 01-2 2H6a2 2 0 01-2-2V6a2 2 0 012-2h2V3a1 1 0 011-1zm0 4h6V4H9v2z',
  cart:'M6 6h15l-1.5 9h-12L6 6zm0 0L5 3H2m5 15a1.5 1.5 0 100 3 1.5 1.5 0 000-3zm11 0a1.5 1.5 0 100 3 1.5 1.5 0 000-3z',
  truck:'M3 6h11v9H3V6zm11 3h4l3 3v3h-7V9zM7 18a1.5 1.5 0 100 3 1.5 1.5 0 000-3zm10 0a1.5 1.5 0 100 3 1.5 1.5 0 000-3z',
  swap:'M7 4l-4 4 4 4M3 8h13M17 20l4-4-4-4M21 16H8',
  check:'M9 11l3 3L22 4M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11',
  chart:'M3 3v18h18M8 15v3M13 9v9M18 5v13',
  gear:'M12 8a4 4 0 100 8 4 4 0 000-8zm8.4 4a6.5 6.5 0 00-.1-1.2l2-1.6-2-3.4-2.4 1a6.6 6.6 0 00-2-1.2l-.4-2.6H9.5l-.4 2.6a6.6 6.6 0 00-2 1.2l-2.4-1-2 3.4 2 1.6a6.6 6.6 0 000 2.4l-2 1.6 2 3.4 2.4-1a6.6 6.6 0 002 1.2l.4 2.6h4.9l.4-2.6a6.6 6.6 0 002-1.2l2.4 1 2-3.4-2-1.6c.1-.4.1-.8.1-1.2z',
  help:'M12 2a10 10 0 100 20 10 10 0 000-20zm0 15h.01M9.5 9a2.5 2.5 0 114 2c-1 .7-1.5 1.2-1.5 2.5',
  search:'M11 4a7 7 0 105 12l4 4M11 4a7 7 0 010 14',
  plus:'M12 5v14M5 12h14',edit:'M4 20h4L20 8l-4-4L4 16v4zM14 6l4 4',
  trash:'M4 7h16M9 7V4h6v3m-8 0v13h10V7',download:'M12 3v12m0 0l-4-4m4 4l4-4M4 21h16',
  pdf:'M6 2h9l5 5v13a2 2 0 01-2 2H6a2 2 0 01-2-2V4a2 2 0 012-2zm8 0v6h6',
  x:'M6 6l12 12M18 6L6 18',warn:'M12 3l10 18H2L12 3zm0 7v5m0 3h.01',
  ok:'M20 6L9 17l-5-5',alert:'M12 8v5m0 3h.01M12 2a10 10 0 100 20 10 10 0 000-20z',
  save:'M5 3h11l3 3v15H5V3zm4 0v6h6V3M8 21v-7h8v7',copy:'M9 9h11v11H9V9zm-4 6H4V4h11v1',
  filter:'M3 5h18l-7 8v6l-4 2v-8L3 5z',send:'M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z',
  cal:'M7 2v3M17 2v3M3 8h18M5 5h14a1 1 0 011 1v14a1 1 0 01-1 1H5a1 1 0 01-1-1V6a1 1 0 011-1z',
  layers:'M12 2l9 5-9 5-9-5 9-5zm9 10l-9 5-9-5m18 5l-9 5-9-5',
  refresh:'M20 11a8 8 0 10-2 5m2 3v-5h-5',
  calc:'M7 3h10a1 1 0 011 1v16a1 1 0 01-1 1H7a1 1 0 01-1-1V4a1 1 0 011-1zm1 3h8v3H8V6zm0 6h2m3 0h2m-7 3h2m3 0h2m-7 3h2',
  grid:'M3 3h7v7H3V3zm11 0h7v7h-7V3zM3 14h7v7H3v-7zm11 0h7v7h-7v-7z',
  users:'M16 21v-2a4 4 0 00-4-4H6a4 4 0 00-4 4v2M9 11a4 4 0 100-8 4 4 0 000 8zm13 10v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75',
  warehouse:'M3 21h18M5 21V8l7-5 7 5v13M9 21v-6h6v6M9 10h6',
  factory:'M2 21h20M4 21V11l5 3v-3l5 3v-3l5 3V4h2v17M8 17h2m4 0h2',
  stack:'M4 6c0-1.66 3.58-3 8-3s8 1.34 8 3-3.58 3-8 3-8-1.34-8-3zm0 0v6c0 1.66 3.58 3 8 3s8-1.34 8-3V6m-16 6v6c0 1.66 3.58 3 8 3s8-1.34 8-3v-6',
  nut:'M12 2l8.66 5v10L12 22l-8.66-5V7L12 2zm0 7a3 3 0 100 6 3 3 0 000-6z',
  tree:'M4 4h6v5H4V4zm0 11h6v5H4v-5zm10-5h6v5h-6v-5zM7 9v6m3-3h4',
  wrench:'M14.7 6.3a4 4 0 00-5.4 5.4L3 18l3 3 6.3-6.3a4 4 0 005.4-5.4l-2.5 2.5-2.4-.6-.6-2.4 2.5-2.5z',
  invoice:'M6 2h9l5 5v15H6V2zm8 0v6h6M9 12h8M9 16h8M9 8h2',
  route:'M6 19a2 2 0 100-4 2 2 0 000 4zm12-10a2 2 0 100-4 2 2 0 000 4zM6 15V9a4 4 0 014-4h2m0 14h2a4 4 0 004-4V9',
  driver:'M12 12a4 4 0 100-8 4 4 0 000 8zm-7 9v-1a5 5 0 015-5h4a5 5 0 015 5v1M9 4.5h6',
  pulse:'M3 12h4l3-8 4 16 3-8h4',
  idcard:'M3 5h18v14H3V5zm5 4a2 2 0 100 4 2 2 0 000-4zm-3 8a3 3 0 016 0m3-7h5m-5 4h4',
  pin:'M12 22s7-6.2 7-12a7 7 0 10-14 0c0 5.8 7 12 7 12zm0-9a3 3 0 100-6 3 3 0 000 6z',
  alert:'M12 3l10 18H2L12 3zm0 7v5m0 3v.5',
  xls:'M6 2h9l5 5v15H6V2zm8 0v6h6M9 11l5 6m0-6l-5 6',
  list:'M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01',
  phone:'M5 4h4l2 5-2.5 1.5a11 11 0 005 5L15 13l5 2v4a2 2 0 01-2 2A16 16 0 013 6a2 2 0 012-2'
};
function ic(name,cls){return `<svg class="${cls||''}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="${IP[name]||''}"/></svg>`;}

/* ---------------- Helpers ---------------- */
const EPS=1e-9;
function uid(p){return (p||'id')+Date.now().toString(36)+Math.random().toString(36).slice(2,7);}
function imgFmt(d){return /^data:image\/jpe?g/i.test(d||'')?'JPEG':'PNG';}
function esc(s){return (s==null?'':String(s)).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
function nfmt(n,dp){ if(n==null||isNaN(n))return '0'; dp=dp==null?3:dp;
  let r=Math.round(n*1e6)/1e6; let v=Number(r.toFixed(dp));
  return v.toLocaleString('en-US',{maximumFractionDigits:dp}); }
function intfmt(n){return Math.round(n).toLocaleString('en-US');}
function todayISO(){const d=new Date();return d.toISOString().slice(0,10);}
function fmtDate(iso){ if(!iso)return '—'; const d=new Date(iso+ (iso.length<=10?'T00:00:00':'') );
  if(isNaN(d))return iso; return d.toLocaleDateString('en-GB',{day:'2-digit',month:'short',year:'2-digit'}); }
function roundUpPcs(x){return x<=EPS?0:Math.ceil(x-EPS);}
function suggestBuy(shortage,bundle){ if(shortage<=EPS)return 0;
  if(bundle&&bundle>1)return Math.ceil((shortage-EPS)/bundle)*bundle; return Math.ceil(shortage-EPS); }
/* strict formula evaluator: only digits + - * / ( ) . space */
function $(sel,root){return (root||document).querySelector(sel);}
function toast(msg,kind){ const box=$('#toasts'); const t=document.createElement('div');
  t.className='toast '+(kind||''); const i=kind==='bad'?'alert':kind==='warn'?'warn':'ok';
  t.innerHTML=ic(i)+`<span>${esc(msg)}</span>`; box.appendChild(t);
  setTimeout(()=>{t.style.opacity='0';t.style.transition='opacity .3s';setTimeout(()=>t.remove(),300);},2600); }
let _modalStack=0;
function openModal(html,size){ const back=document.createElement('div'); back.className='modal-back';
  back.innerHTML=`<div class="modal ${size||''}" role="dialog">${html}</div>`;
  back.addEventListener('mousedown',e=>{ if(e.target===back) closeModal(back); });
  document.body.appendChild(back); _modalStack++; return back; }
function closeModal(back){ if(!back){const all=document.querySelectorAll('.modal-back');back=all[all.length-1];}
  if(back){back.remove();_modalStack=Math.max(0,_modalStack-1);} }
function confirmModal(opts){ // {title,message,confirmText,danger,onConfirm}
  const back=openModal(`
    <div class="modal-head"><div><h3>${esc(opts.title||'Please confirm')}</h3></div>
      <button class="x" onclick="closeModal()">${ic('x')}</button></div>
    <div class="modal-body"><p style="margin:0;font-size:14px;color:#374151">${opts.message||''}</p></div>
    <div class="modal-foot"><button class="btn btn-ghost" onclick="closeModal()">Cancel</button>
      <button class="btn ${opts.danger?'btn-danger':'btn-primary'}" id="cfmBtn">${esc(opts.confirmText||'Confirm')}</button></div>`);
  back.querySelector('#cfmBtn').addEventListener('click',async()=>{ closeModal(back); if(opts.onConfirm) await opts.onConfirm(); });
}
function statusChip(k,label){ const map={ok:'ok',warn:'warn',bad:'bad',info:'info'};
  return `<span class="chip ${map[k]||'neutral'}"><span class="dot" aria-hidden="true"></span>${esc(label)}</span>`; }
function download(filename,content,type){ const blob=new Blob([content],{type:type||'application/json'});
  const url=URL.createObjectURL(blob); const a=document.createElement('a'); a.href=url; a.download=filename;
  document.body.appendChild(a); a.click(); a.remove(); setTimeout(()=>URL.revokeObjectURL(url),1500);
  // Browsers cannot show Excel / CSV files themselves, so say clearly where the file went.
  setTimeout(()=>toast('Downloaded '+filename+' — open it from your Downloads (Ctrl+J). Excel may ask you to click "Enable Editing".','ok'),50); }
function emptyState(icon,title,msg,btnHtml){ return `<div class="empty"><div class="ei">${ic(icon)}</div>
  <h4>${esc(title)}</h4><p>${esc(msg)}</p>${btnHtml||''}</div>`; }
let _clockTimer=null;
function startClock(){ const set=()=>{ const c=$('#clock'); if(!c)return; const d=new Date();
  c.innerHTML=`<b>${d.toLocaleDateString('en-GB',{weekday:'short',day:'2-digit',month:'short'})}</b>${d.toLocaleTimeString('en-GB',{hour:'2-digit',minute:'2-digit'})}`; };
  set(); if(_clockTimer)clearInterval(_clockTimer); _clockTimer=setInterval(set,30000); }



/* AMBS workspace domain model. */
const LEGACY=['meta','materials','products','bom','plans','purchaseRequests','receipts','movements','stockChecks','weighDocs'];
const LIVE=['customers','suppliers','processors','locations','materials','parts','products','variants','recipes','plans','orders','purchases','jobs','events','reviews','sales','drivers','trips'];
/* Workspaces saved before a collection existed simply get an empty list. */
const SALES_OPEN=['Draft','Confirmed','Partially delivered'];
function ensureTables(s){if(s&&typeof s==='object')for(const name of LIVE)if(!Array.isArray(s[name]))s[name]=[];return s;}
const UNITS=['PCS','TUBE','SHEET','SET','M','M²','M³','MM','KG','G','T','L','ROLL','BOX','PACK','PAIR','BUNDLE'];
const validUnit=value=>typeof value==='string'&&/^[A-Z][A-Z0-9²³ _/-]{0,23}$/.test(value);
const unitChoices=()=>[...new Set([...UNITS,...['materials','parts','products','variants'].flatMap(type=>(state?.[type]||[]).map(row=>row.unit).filter(validUnit))])];
const DEFAULTS={company:'AM Building Solutions DWC LLC',address:'',phone:'',email:'',trn:'',logo:'',currentUser:'Store Keeper'};
const DB={weighDocs:[],materials:[]};
let SET={...DEFAULTS}, state, legacy={};
const now=()=>new Date().toISOString();
const key=()=>globalThis.crypto?.randomUUID?.() || uid('id');
const need=(condition,message)=>{if(!condition)throw Error(message);};
const get=(s,table,id)=>s[table].find(row=>row.id===id);
const live=(s,table,id)=>{
  const row=get(s,table,id);
  need(row && row.active!==false,'Select an active record.');
  return row;
};
const current=(s,table)=>s[table].filter(r=>r.active!==false);
const unit=v=>String(v||'').trim().toUpperCase().replace(/^M2$/,'M²').replace(/^M3$/,'M³');
const qty=(v,label='Quantity',zero=false)=>{
  const n=Number(v);
  need(String(v??'').trim()!=='' && Number.isFinite(n) && (zero?n>=0:n>0),label+' must be '+(zero?'zero or greater.':'greater than zero.'));
  return n;
};
const whole=(v,label='Quantity',zero=false)=>{
  const n=qty(v,label,zero); need(Number.isSafeInteger(n),label+' must be a whole number.'); return n;
};
const MEASURED_UNITS=new Set(['M','M²','M³','MM','KG','G','T','L']);
const measured=unit=>MEASURED_UNITS.has(unit);
const roundMeasured=n=>Number(n.toFixed(6));
function componentQty(value,unit,label='Quantity',zero=false){
  if(!measured(unit))return whole(value,label,zero);
  const n=roundMeasured(qty(value,label,zero));
  need(zero||n>0,label+' must be at least 0.000001.');
  return n;
}
/* The person working now: their name/email in the cloud, the operator name in the browser demo. */
const whoami=()=>typeof CLOUD!=='undefined'&&!CLOUD.demo?(CLOUD.name||CLOUD.email||'—'):(typeof SET!=='undefined'&&SET.currentUser||'This browser');
const add=(list,obj)=>{const i=list.findIndex(x=>x.id===obj.id), t=new Date().toISOString(), who=whoami();
  if(i<0){obj.createdBy??=who;obj.createdAt??=t;} else{obj.createdBy??=list[i].createdBy;obj.createdAt??=list[i].createdAt;}
  obj.editedBy=who;obj.editedAt=t;
  if(i<0)list.push(obj); else list[i]=obj;};
const escapeArg=x=>esc(JSON.stringify(x));
function operationNo(prefix){return prefix+'-'+key().slice(0,8).toUpperCase();}
function label(row){return row ? [row.code,row.name,...(row.packingQuantities?[row.category]:[row.size,row.color])].filter(Boolean).join(' · ') : '—';}
function item(s,id){
  return get(s,'materials',id)||get(s,'parts',id)||get(s,'products',id)||get(s,'variants',id);
}
function stockItem(s,id){
  const row=item(s,id);
  need(row && row.active!==false && validUnit(row.unit) &&
    (!row.partId || get(s,'parts',row.partId)?.active!==false) &&
    !(get(s,'parts',id) && s.variants.some(v=>v.partId===id)),
    'Select an active stock SKU. Parts with variants use the specific variant SKU.');
  return row;
}
function loc(s,id){
  const row=live(s,'locations',id);
  need(row.stock && (!row.ownerId || get(s,row.ownerType,row.ownerId)?.active!==false),'Select an active stock custody location.');
  return row;
}
function locName(s,id){
  const l=get(s,'locations',id);
  if(!l)return '—';
  return l.ownerId ? (get(s,l.ownerType,l.ownerId)?.name||'Company')+' / '+l.name : l.name;
}
function availability(s,id,location){
  return s.events.reduce((total,e)=>total+e.lines.reduce((n,l)=>n+(l.sku===id&&l.location===location?l.delta:0),0),0);
}
function physical(s,id){
  return s.events.reduce((total,e)=>total+e.lines.reduce((n,l)=>n+(l.sku===id?l.delta:0),0),0);
}
function aggregate(lines,field='sku',amount='qty'){
  const result=new Map();
  for(const l of lines)result.set(l[field],(result.get(l[field])||0)+l[amount]);
  return Array.from(result,([sku,qty])=>({sku,qty}));
}
function stockRows(s){
  const pairs=new Map();
  for(const e of s.events)for(const l of e.lines){
    const k=JSON.stringify([l.sku,l.location]);
    const p=pairs.get(k)||{sku:l.sku,location:l.location,qty:0};
    p.qty+=l.delta; pairs.set(k,p);
  }
  return [...pairs.values()].filter(r=>Math.abs(r.qty)>EPS);
}
function event(s,id,type,lines,note=''){
  need(!get(s,'events',id),'This action has already been recorded.');
  const totals=new Map();
  for(const line of lines){
    stockItem(s,line.sku); loc(s,line.location);
    need(Number.isFinite(line.delta),'Invalid stock quantity.');
    const k=JSON.stringify([line.sku,line.location]);
    totals.set(k,(totals.get(k)||0)+line.delta);
  }
  for(const [k,delta] of totals){
    const [sku,location]=JSON.parse(k);
    const balance=availability(s,sku,location);
    need(Number.isFinite(balance+delta) && balance+delta>=-EPS,
      'Insufficient stock for '+label(item(s,sku))+' at '+locName(s,location)+'. Available '+nfmt(balance,6)+' '+item(s,sku).unit+'.');
  }
  s.events.push({id,type,lines,note,at:now(),by:whoami()});
}
function stockEventContext(s,lines,rawParty='',selectedSite=''){
  const explicit=rawParty?JSON.parse(rawParty):null;
  const owners=[...new Map(lines.map(line=>get(s,'locations',line.location)).filter(l=>l.ownerId)
    .map(l=>[JSON.stringify([l.ownerType,l.ownerId]),[l.ownerType,l.ownerId]])).values()];
  if(explicit&&owners.length===1)need(explicit[0]===owners[0][0]&&explicit[1]===owners[0][1],
    'The selected stock location belongs to a different company.');
  const [partyType,partyId]=explicit||((owners.length===1)?owners[0]:[]);
  if(!partyId){need(!selectedSite,'Choose a related company for this site.');return {};}
  need(COMPANIES.includes(partyType),'Choose a valid related company.');
  live(s,partyType,partyId);
  const siteId=selectedSite||lines.map(line=>line.location)
    .find(locationId=>get(s,'locations',locationId)?.ownerId===partyId)||'';
  if(siteId){const site=live(s,'locations',siteId);
    need(site.ownerType===partyType&&site.ownerId===partyId,'Choose a site belonging to the related company.');}
  return {partyType,partyId,siteId};
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
function recipeLine(s,line){
  const material=live(s,'materials',line.sku);
  need(validUnit(line.unit) && line.unit===material.unit,'The BOM line unit must match the raw material stock unit.');
  const result=evalFormula(line.formula);
  need(result.ok,result.err);
  need(result.value>0,'Material usage must be greater than zero.');
  const wastage=qty(line.wastage??0,'Wastage',true);
  need(wastage<=100,'Wastage must be within 0–100%.');
  const gross=result.value*(1+wastage/100);
  need(Number.isFinite(gross),'Material usage is out of range.');
  return {...line,base:result.value,wastage,gross};
}
function expandPart(s,partId,count,variantId=''){
  const part=live(s,'parts',partId);
  const sku=variantId||part.id;
  const stock=stockItem(s,sku);
  need(!variantId||stock.partId===part.id,'The selected variant belongs to a different part.');
  const recipe=get(s,'recipes',part.id);
  if(['Purchased','Stocked'].includes(part.source))return [];
  need(recipe?.kind==='part' && recipe.approved && recipe.lines.length,'Approve the Part BOM for '+label(part)+' first.');
  return recipe.lines.map(line=>{
    const l=recipeLine(s,line);
    return {...l,partId,partSku:sku,qty:qty(l.gross*count)};
  });
}
function productParts(s,productId,count){
  const product=live(s,'products',productId), recipe=get(s,'recipes',product.id);
  need(recipe?.kind==='product' && recipe.approved && recipe.lines.length,'Save the Product BOM for '+label(product)+' first.');
  return recipe.lines.map(l=>{
    const part=live(s,'parts',l.partId);
    const required=componentQty(l.count*count,part.unit);
    return {partId:l.partId,standard:required,qty:required,variantId:l.variantId||''};
  });
}
function configuredParts(s,standard,overrides){
  need(standard.length===overrides.length,'The standard BOM changed. Reload the product to use the latest recipe.');
  return standard.map((line,index)=>{
    const chosen=overrides[index];
    need(line.partId===chosen.partId && line.standard===chosen.standard,'The standard BOM changed. Reload the product.');
    const variantId=chosen.variantId || '';
    const sku=variantId||line.partId, stock=stockItem(s,sku);
    need(!variantId||stock.partId===line.partId,'Select a variant belonging to that part.');
    return {...line,variantId,sku,qty:componentQty(chosen.qty,stock.unit,'Adjusted quantity')};
  });
}
function pending(s,sku,location){
  return s.purchases.filter(p=>p.location===location&&p.status==='Ordered')
    .reduce((n,p)=>n+p.lines.reduce((sum,line)=>sum+(line.sku===sku?line.qty-line.received:0),0),0);
}
function reserved(s,sku,location,exclude=''){
  const orders=s.orders.filter(o=>o.status==='Released' && o.location===location && o.id!==exclude);
  const plans=s.plans.filter(p=>p.status==='Reserved' && p.location===location && p.id!==exclude);
  return orders.concat(plans).reduce((n,p)=>n+p.materials.filter(l=>l.sku===sku).reduce((sum,l)=>sum+l.qty,0),0);
}
function emptyStateData(settings={}){
  return {...Object.fromEntries(LIVE.map(k=>[k,[]])),settings:{...DEFAULTS,...settings},deletedWorkbookParts:[],schema:3};
}
function oldUnit(value){
  const aliases={PIECE:'PCS',PIECES:'PCS',PC:'PCS',EA:'PCS',METRE:'M',METER:'M',TON:'T',TONNE:'T'};
  return aliases[unit(value)]||unit(value||'PCS');
}
function migrated(s,old){
  for(const m of old.materials){
    const code=String(m.code||m.id);
    if(item(s,m.id)||[...s.materials,...s.parts,...s.products,...s.variants].some(x=>x.code.toLowerCase()===code.toLowerCase())){
      s.reviews.push({id:'material:'+m.id,type:'Material code conflict',legacyId:m.id});
      continue;
    }
    const u=oldUnit(m.unit);
    s.materials.push({...m,code,unit:u,active:m.active!==false&&UNITS.includes(u),legacy:true});
    const hasBalance=m.initialStock||old.movements.some(x=>x.itemType==='material'&&x.itemId===m.id);
    if(hasBalance||!UNITS.includes(u))s.reviews.push({id:'opening:'+m.id,type:'Opening stock / unit',legacyId:m.id});
  }
  const partNames=/^(slab attachment|main body|extension leg|adjustable coupler|kneed? brace|knee brace)(?:\s+\d+(?:\.\d+)?\s*m)?$/i;
  for(const p of old.products){
    const code=String(p.code||p.id), review={id:'product:'+p.id,type:'Legacy product classification',legacyId:p.id};
    s.reviews.push(review);
    if(partNames.test(String(p.name).trim())&&!item(s,p.id)&&![...s.materials,...s.parts,...s.products,...s.variants].some(x=>x.code.toLowerCase()===code.toLowerCase())){
      s.parts.push({...p,code,unit:oldUnit(p.unit),source:'Manufactured',active:p.active!==false&&UNITS.includes(oldUnit(p.unit)),legacy:true});
      const raw=old.bom.filter(l=>l.productId===p.id);
      if(raw.length&&raw.every(l=>get(s,'materials',l.materialId)))s.recipes.push({id:p.id,kind:'part',approved:false,lines:raw.map(l=>({
        sku:l.materialId,formula:String(l.formula||l.ratio||''),wastage:l.wastage??0,unit:get(s,'materials',l.materialId).unit,notes:l.notes||''
      }))});
      review.resolved='Mapped to Part; review BOM and verify physical balance.';
    }
  }
  return s;
}
function reads(t,names,when,abort){
  const values={};
  let left=names.length;
  for(const name of names){
    const r=t.objectStore(name).getAll();
    r.onsuccess=()=>{
      values[name]=r.result;
      if(--left===0)try{when(values);}catch(e){abort(e);}
    };
  }
}
function workspaceList(name){return transaction([name],'readonly',(t,done,abort)=>reads(t,[name],r=>done(r[name]),abort));}
function workspacePut(name,obj){return transaction([name],'readwrite',t=>t.objectStore(name).put(obj));}
function workspaceDelete(name,id){return transaction([name],'readwrite',t=>t.objectStore(name).delete(id));}
async function nextNo(kind){
  need(kind==='wgt','Unknown document type.');
  return operationNo('WGT');
}
function reflect(next){
  state=ensureTables(next);
  SET=state.settings;
  DB.materials=state.materials;
}
function val(id){return document.getElementById(id)?.value?.trim()||'';}
function numval(id){return parseFloat(val(id))||0;}
/* The reference embeds jsPDF. Draw report tables directly so exports work offline. */
function drawPDFTable(doc,options){
  const head=options.head[0], margin=options.margin||{}, left=margin.left??40, right=margin.right??40;
  const width=doc.internal.pageSize.getWidth()-left-right, stop=doc.internal.pageSize.getHeight()-(margin.bottom??40);
  const fontSize=options.styles?.fontSize||8.5, pad=options.styles?.cellPadding||4;
  const step=fontSize*1.2, cols=options.widths?options.widths.map(w=>w*width):head.map(()=>width/head.length);
  let y=options.startY??margin.top??70;
  function content(row){
    let x=left;
    return row.map((raw,index)=>{
      const cell=raw&&typeof raw==='object'?raw:{content:raw};
      const span=Math.min(cell.colSpan||1,head.length-index), area=cols.slice(index,index+span).reduce((n,w)=>n+w,0);
      const strings=doc.splitTextToSize(String(cell.content??''),area-pad*2);
      const result={x,area,strings,style:cell.styles||{}};
      x+=area;return result;
    });
  }
  function rowHeight(cells){return Math.max(1,...cells.map(c=>c.strings.length))*step+pad*2;}
  function draw(cells,heading,alternate,maxLines=Infinity){
    const height=Math.min(rowHeight(cells),maxLines*step+pad*2);
    for(const c of cells){
      const bg=c.style.fillColor||(heading?(options.headStyles?.fillColor||[30,35,43]):alternate?[248,249,250]:[255,255,255]);
      if(Array.isArray(bg))doc.setFillColor(...bg);else doc.setFillColor(bg);
      doc.setDrawColor(227,230,234);doc.setLineWidth(.4);doc.rect(c.x,y,c.area,height,'FD');
      const fg=c.style.textColor??(heading?255:30);
      if(Array.isArray(fg))doc.setTextColor(...fg);else doc.setTextColor(fg);
      doc.setFont('helvetica',c.style.fontStyle||(heading?'bold':'normal'));doc.setFontSize(fontSize);
      const align=c.style.halign==='right'?'right':'left';
      doc.text(c.strings.splice(0,maxLines),align==='right'?c.x+c.area-pad:c.x+pad,y+pad+fontSize,{align,lineHeightFactor:1.2});
    }
    y+=height;
  }
  doc.setFont('helvetica','bold');doc.setFontSize(fontSize);
  const headingHeight=rowHeight(content(head));
  if(y+headingHeight+step+pad*2>stop){doc.addPage();y=margin.top??70;}
  function page(){
    options.didDrawPage?.();
    doc.setFont('helvetica','bold');doc.setFontSize(fontSize);
    draw(content(head),true,false);
  }
  function next(){
    doc.addPage();y=margin.top??70;page();
  }
  page();
  for(let i=0;i<options.body.length;i++){
    doc.setFont('helvetica','normal');doc.setFontSize(fontSize);
    const cells=content(options.body[i]);
    const freshRoom=stop-(margin.top??70)-headingHeight;
    if(rowHeight(cells)>stop-y && rowHeight(cells)<=freshRoom)next();
    while(cells.some(c=>c.strings.length)){
      const capacity=Math.floor((stop-y-pad*2)/step);
      if(capacity<1){next();continue;}
      draw(cells,false,i%2>0,capacity);
      if(cells.some(c=>c.strings.length))next();
    }
  }
  doc.lastAutoTable={finalY:y};
  return doc;
}
const PDFR={
  _ok(){ if(!window.jspdf||!window.jspdf.jsPDF){ toast('PDF export is unavailable','warn'); return false; }
    return true; },
  _doc(orientation){ const {jsPDF}=window.jspdf; const doc=new jsPDF({unit:'pt',format:'a4',orientation:orientation||'portrait'}); doc.autoTable=options=>drawPDFTable(doc,options);
    // Every PDF is saved to Downloads under its proper name AND opened in a new tab so it can be seen straight away.
    const saveFile=doc.save.bind(doc);
    doc.save=name=>{ saveFile(name); let opened=null;
      try{ opened=window.open(URL.createObjectURL(doc.output('blob')),'_blank'); }catch(e){}
      toast(opened?'PDF opened in a new tab and saved to Downloads.':'PDF saved to Downloads: '+name+' (Ctrl+J to open it).','ok'); return doc; };
    return doc; },
  _hf(doc,docTitle){ return ()=>{ const W=doc.internal.pageSize.getWidth(),H=doc.internal.pageSize.getHeight();
    doc.setFillColor(204,6,5); doc.rect(0,0,W,56,'F'); doc.setFillColor(255,173,0); doc.rect(0,56,W,3.5,'F');
    let x=40; if(SET.logo){ try{ doc.addImage(SET.logo,imgFmt(SET.logo),40,11,34,34); x=84; }catch(e){} }
    doc.setTextColor(255,255,255); doc.setFont('helvetica','bold'); doc.setFontSize(14); doc.text(SET.company||'',x,26);
    doc.setFont('helvetica','normal'); doc.setFontSize(8);
    doc.text([SET.address,SET.phone+'   ·   '+SET.email].filter(Boolean).join('   ·   '),x,40);
    doc.setFont('helvetica','bold'); doc.setFontSize(10.5); doc.setTextColor(255,231,153);
    doc.text((docTitle||'').toUpperCase(),W-40,30,{align:'right'});
    // footer
    doc.setDrawColor(225); doc.setLineWidth(.6); doc.line(40,H-32,W-40,H-32);
    doc.setFont('helvetica','normal'); doc.setFontSize(7.5); doc.setTextColor(130);
    doc.text((SET.company||'')+(SET.trn?('   ·   TRN '+SET.trn):''),40,H-19);
    doc.text('Generated '+new Date().toLocaleString('en-GB'),W/2,H-19,{align:'center'});
    const pg=doc.internal.getNumberOfPages(); doc.text('Page '+doc.internal.getCurrentPageInfo().pageNumber+' / '+pg,W-40,H-19,{align:'right'});
  }; },
  _meta(doc,pairs){ let y=78; doc.setFontSize(9); const W=doc.internal.pageSize.getWidth(); let x=40; const colW=(W-80)/2;
    pairs.forEach((p,i)=>{ const cx=40+(i%2)*colW; const cy=78+Math.floor(i/2)*15;
      doc.setFont('helvetica','bold'); doc.setTextColor(90); doc.text(p[0]+':',cx,cy);
      doc.setFont('helvetica','normal'); doc.setTextColor(20); doc.text(String(p[1]||'—'),cx+72,cy); });
    return 78+Math.ceil(pairs.length/2)*15+8; },
  _sig(doc,startY,labels){ const W=doc.internal.pageSize.getWidth(),H=doc.internal.pageSize.getHeight();
    let y=startY+24; if(y>H-90)y=H-90; const cw=(W-80)/labels.length;
    doc.setFontSize(9); labels.forEach((lab,i)=>{ const x=40+i*cw; doc.setDrawColor(140); doc.line(x,y+28,x+cw-24,y+28);
      doc.setFont('helvetica','bold'); doc.setTextColor(60); doc.text(lab,x,y+40); doc.setFont('helvetica','normal'); doc.setTextColor(120); doc.setFontSize(7.5); doc.text('Name / Signature / Date',x,y+51); doc.setFontSize(9); }); },
  _statusColor(txt){ txt=(txt||'').toLowerCase();
    if(txt.includes('buy')||txt.includes('short')||txt.includes('below')||txt.includes('out'))return [253,236,236];
    if(txt.includes('watch'))return [253,243,224]; if(txt.includes('cover')||txt.includes('ok'))return [230,244,234]; return null; },
  _table(doc,head,body,startY,statusCol){ doc.autoTable({ head:[head], body, startY,
    margin:{top:70,bottom:44,left:40,right:40}, styles:{font:'helvetica',fontSize:8.5,cellPadding:4,lineColor:[225,228,232],lineWidth:.5,textColor:[30,34,40]},
    headStyles:{fillColor:[31,35,43],textColor:255,fontStyle:'bold',fontSize:8.5,halign:'left'},
    alternateRowStyles:{fillColor:[248,249,250]},
    didParseCell:(d)=>{ if(statusCol!=null&&d.section==='body'&&d.column.index===statusCol){ const c=PDFR._statusColor(d.cell.raw); if(c){d.cell.styles.fillColor=c;d.cell.styles.fontStyle='bold';} } },
    didDrawPage:this._hf(doc) }); return doc.lastAutoTable.finalY; },
  weigh(id){ if(!this._ok())return; const d=DB.weighDocs.find(x=>x.id===id); if(!d)return; const doc=this._doc();
    this._hf(doc,'Product Weight Take-off')();
    let y=this._meta(doc,[['Doc No',d.no],['Date',fmtDate(d.date)],['Product',d.name||'—'],['Project / Client',d.project||'—'],['Prepared by',d.preparedBy||'—'],['Sections',(d.lines||[]).length]]);
    const body=(d.lines||[]).map((l,i)=>[String(i+1),l.desc,(TWC_MAT[l.material]||TWC_MAT.steel).n,twcW(l.unitKg),intfmt(l.qty),twcW(l.lineKg)]);
    body.push([{content:'TOTAL PRODUCT WEIGHT',colSpan:5,styles:{halign:'right',fontStyle:'bold',fillColor:[31,35,43],textColor:255}},{content:nfmt(d.total,2)+' kg',styles:{halign:'right',fontStyle:'bold',fillColor:[31,35,43],textColor:255}}]);
    doc.autoTable({head:[['#','Section / size','Material','Unit wt (kg)','Qty','Line wt (kg)']],body,startY:y+4,
      margin:{top:70,bottom:44,left:40,right:40},styles:{font:'helvetica',fontSize:8.5,cellPadding:4,lineColor:[225,228,232],lineWidth:.5},
      headStyles:{fillColor:[31,35,43],textColor:255,fontStyle:'bold'},alternateRowStyles:{fillColor:[248,249,250]},
      columnStyles:{0:{cellWidth:24,halign:'center'},3:{halign:'right'},4:{halign:'right'},5:{halign:'right'}},didDrawPage:this._hf(doc)});
    y=doc.lastAutoTable.finalY;
    if(d.notes){ doc.setFont('helvetica','italic');doc.setFontSize(8.5);doc.setTextColor(90); const W=doc.internal.pageSize.getWidth();
      doc.text(doc.splitTextToSize('Notes: '+d.notes,W-80),40,y+16); y+=16+ (Math.ceil(d.notes.length/110)*11); }
    this._sig(doc,y+4,['Prepared by','Checked by','Approved by']);
    doc.save(d.no+'_Product_Weight.pdf'); },
  nest(){ if(!this._ok())return; const R=Nest._res; if(!R){toast('Run nesting first','warn');return;} const doc=this._doc();
    this._hf(doc,'Cutting Plan & Material Requirement')();
    const totalBars=R.groups.reduce((s,o)=>s+o.res.newBarCount,0);
    let y=this._meta(doc,[['Product',R.doc?.name||'—'],['Take-off',R.doc?.no||'—'],['Sets',R.sets],['Kerf / min off-cut',R.kerf+' mm / '+R.minOff+' mm'],
      ['Total bars to buy',totalBars],['Total raw weight',nfmt(R.totKg,1)+' kg'+(R.totCost?('  ·  '+nfmt(R.totCost,2)+' AED'):'')]]);
    // summary table
    doc.setFont('helvetica','bold');doc.setFontSize(9.5);doc.setTextColor(204,6,5);doc.text('MATERIAL SUMMARY',40,y+6);
    const sbody=R.groups.map(o=>[o.g.label,(TWC_MAT[o.g.material]||TWC_MAT.steel).n,nfmt(o.st.len,2)+' m',String(o.res.newBarCount),
      nfmt(o.res.utilization*100,1)+'%',nfmt(o.kg,1),o.rate?nfmt(o.cost,2):'—']);
    y=this._table(doc,['Section','Material','Stock len','Bars to buy','Utilization','Weight (kg)','Cost (AED)'],sbody,y+12);
    // cutting patterns per group
    for(const o of R.groups){
      const pat={}; o.res.bars.forEach(b=>{ const sig=(b.offcut?'off-cut ':'')+nfmt(b.stockLen,2)+' m: '+b.cuts.map(c=>nfmt(c.len,3)).sort((a,b2)=>b2-a).join(' + ');
        pat[sig]=(pat[sig]||0)+1; });
      doc.setFont('helvetica','bold');doc.setFontSize(9.5);doc.setTextColor(204,6,5);
      if(y>doc.internal.pageSize.getHeight()-120){doc.addPage();this._hf(doc)();y=72;}
      doc.text(('CUTTING PATTERNS — '+o.g.label).toUpperCase(),40,y+16);
      const pbody=Object.keys(pat).map(sig=>['× '+pat[sig],sig,nfmt((sig.includes('off-cut')?0:o.st.len),2)?'':'']).map(r=>[r[0],r[1]]);
      y=this._table(doc,['Bars','Pattern (cut lengths in m)'],pbody,y+22);
    }
    if(R.plates.length){ doc.setFont('helvetica','bold');doc.setFontSize(9.5);doc.setTextColor(204,6,5);
      if(y>doc.internal.pageSize.getHeight()-120){doc.addPage();this._hf(doc)();y=72;}
      doc.text('PLATES & SHEETS (BY AREA)',40,y+16);
      y=this._table(doc,['Item','Qty','Unit kg','Total kg'],R.plates.map(p=>[p.desc,intfmt(p.qty),twcW(p.unitKg),nfmt(p.kg,1)]),y+22); }
    this._sig(doc,y,['Prepared by','Checked by','Approved by']);
    doc.save((R.doc?.no||'NEST')+'_Cutting_Plan.pdf'); }
};

const SECT_GEO = {
  plate:  {name:'Steel Plate / Sheet', std:'—', diag:'plate',
    fields:[['t','Thickness, t','mm',10],['W','Width, W','mm',1500],['L','Length, L','mm',6000]],
    area:v=>v.t*v.W, plate:true},
  chequer:{name:'Chequered Plate', std:'ASTM A36', diag:'chequer',
    fields:[['t','Base thickness, t','mm',5],['W','Width, W','mm',1500],['L','Length, L','mm',6000],['p','Pattern add','kg/m²',2.5]],
    area:v=>v.t*v.W, plate:true, chequer:true},
  round:  {name:'Round Bar', std:'—', diag:'round',
    fields:[['D','Diameter, D','mm',20],['L','Length, L','mm',6000]], area:v=>Math.PI/4*v.D*v.D},
  square: {name:'Square Bar', std:'—', diag:'square',
    fields:[['a','Side, a','mm',20],['L','Length, L','mm',6000]], area:v=>v.a*v.a},
  flat:   {name:'Flat Bar', std:'—', diag:'flat',
    fields:[['a','Width, b','mm',50],['b','Thickness, t','mm',6],['L','Length, L','mm',6000]], area:v=>v.a*v.b},
  hex:    {name:'Hexagonal Bar', std:'—', diag:'hex',
    fields:[['s','Across flats, s','mm',20],['L','Length, L','mm',6000]], area:v=>Math.sqrt(3)/2*v.s*v.s},
};

/* ---- Hollow sections: size list per family, thickness list, mass table ---- */
/* SHS EN 10219 : key 'HxT' -> kg/m ; dims h=b, t */
const SHS = { std:'EN 10219', shape:'shs',
 sizes:['25','30','40','50','60','70','75','80','90','100','120','125','140','150','160','180','200','250','300','350','400'],
 t:{ '25':[1.2,1.5,1.8,2.0,2.3,2.5,3.0],'30':[1.2,1.5,1.8,2.0,2.5,3.0,4.0],
     '40':[2.5,3.0,3.2,4.0,4.9,5.0],'50':[2.5,3.0,3.2,4.0,4.9,5.0,6.0,6.3],
     '60':[3.0,3.2,4.0,4.9,5.0,6.0,6.3,7.1,8.0],'65':[2.0,2.5,3.0],
     '70':[3.0,3.2,3.6,4.0,4.9,5.0,6.0,6.3,7.1,8.0],'75':[2.5,3.0,4.0,5.0,6.0],
     '80':[3.2,3.6,4.0,4.9,5.0,5.6,6.0],'90':[3.6,4.0,4.9,5.0,5.6,6.0,6.3,7.1,8.0],
     '100':[3.6,4.0,4.9,5.0,5.6,6.0,6.3,7.1,8.0,10.0],'120':[4.0,4.9,5.0,5.6,6.0,6.3,7.1,8.0,8.8,10.0],
     '125':[2.5,3.0,4.0,5.0,6.0,8.0,9.0],'140':[4.9,5.0,5.6,6.0,6.3,7.1,8.0,8.8,10.0,12.0,12.5],
     '150':[4.9,5.0,5.6,6.0,6.3,7.1,8.0,8.8,10.0,12.0,12.5,16.0],
     '160':[5.0,5.6,6.0,6.3,7.1,8.0,8.8,10.0,12.0,12.5,14.2,16.0],
     '180':[5.0,5.6,6.0,6.3,7.1,8.0,8.8,10.0,12.0,12.5,14.2,16.0],
     '200':[5.0,5.6,6.0,6.3,7.1,8.0,8.8,10.0,12.0,12.5,14.2,16.0],
     '250':[5.0,5.6,6.0,6.3,8.0,10.0,12.0,12.5,14.2,16.0],
     '300':[6.0,8.0,10.0,12.0,16.0],'350':[8.0,10.0,12.0],'400':[8.0,10.0,12.0,16.0] },
 /* mass kg/m keyed 'H_T' (verified vs catalogue where listed) */
 m:{'25_1.2':0.87,'25_1.5':1.06,'25_1.8':1.25,'25_2.0':1.36,'25_2.3':1.53,'25_2.5':1.64,'25_3.0':1.89,
    '30_1.2':1.06,'30_1.5':1.30,'30_1.8':1.53,'30_2.0':1.68,'30_2.5':2.03,'30_3.0':2.36,'30_4.0':2.94,
    '40_2.5':2.89,'40_3.0':3.41,'40_3.2':3.61,'40_4.0':4.39,'40_4.9':5.20,'40_5.0':5.28,
    '50_2.5':3.68,'50_3.0':4.35,'50_3.2':4.62,'50_4.0':5.64,'50_4.9':6.74,'50_5.0':6.85,'50_6.0':7.99,'50_6.3':8.31,
    '60_3.0':5.29,'60_3.2':5.62,'60_4.0':6.90,'60_4.9':8.28,'60_5.0':8.42,'60_6.0':9.87,'60_6.3':10.3,'60_7.1':11.4,'60_8.0':12.5,
    '65_2.0':3.94,'65_2.5':4.88,'65_3.0':5.80,
    '70_3.0':6.24,'70_3.2':6.63,'70_3.6':7.40,'70_4.0':8.15,'70_4.9':9.81,'70_5.0':9.99,'70_6.0':11.8,'70_6.3':12.3,'70_7.1':13.6,'70_8.0':15.0,
    '75_2.5':5.56,'75_3.0':6.60,'75_4.0':8.59,'75_5.0':10.5,'75_6.0':12.3,
    '80_3.2':7.63,'80_3.6':8.53,'80_4.0':9.41,'80_4.9':11.4,'80_5.0':11.6,'80_5.6':12.8,'80_6.0':13.6,
    '90_3.6':9.66,'90_4.0':10.7,'90_4.9':12.9,'90_5.0':13.1,'90_5.6':14.6,'90_6.0':15.5,'90_6.3':16.2,'90_7.1':18.1,'90_8.0':20.1,
    '100_3.6':10.8,'100_4.0':11.9,'100_4.9':14.4,'100_5.0':14.7,'100_5.6':16.3,'100_6.0':17.4,'100_6.3':18.2,'100_7.1':20.3,'100_8.0':22.6,'100_10.0':27.4,
    '120_4.0':14.4,'120_4.9':17.5,'120_5.0':17.8,'120_5.6':19.9,'120_6.0':21.2,'120_6.3':22.2,'120_7.1':24.7,'120_8.0':27.6,'120_8.8':30.1,'120_10.0':33.7,
    '125_2.5':9.49,'125_3.0':11.31,'125_4.0':14.90,'125_5.0':18.30,'125_6.0':21.70,'125_8.0':27.70,'125_9.0':30.60,
    '140_4.9':20.6,'140_5.0':21.0,'140_5.6':23.4,'140_6.0':24.9,'140_6.3':26.1,'140_7.1':29.2,'140_8.0':32.6,'140_8.8':35.6,'140_10.0':40.0,'140_12.0':47.0,'140_12.5':48.7,
    '150_4.9':22.1,'150_5.0':22.6,'150_5.6':25.1,'150_6.0':26.8,'150_6.3':28.1,'150_7.1':31.4,'150_8.0':35.1,'150_8.8':38.4,'150_10.0':43.1,'150_12.0':50.8,'150_12.5':52.7,'150_16.0':65.2,
    '160_5.0':24.1,'160_5.6':26.9,'160_6.0':28.7,'160_6.3':30.1,'160_7.1':33.7,'160_8.0':37.6,'160_8.8':41.1,'160_10.0':46.3,'160_12.0':54.6,'160_12.5':56.6,'160_14.2':63.3,'160_16.0':70.2,
    '180_5.0':27.3,'180_5.6':30.4,'180_6.0':32.5,'180_6.3':34.0,'180_7.1':38.1,'180_8.0':42.7,'180_8.8':46.7,'180_10.0':52.5,'180_12.0':62.1,'180_12.5':64.4,'180_14.2':72.2,'180_16.0':80.2,
    '200_5.0':30.4,'200_5.6':33.9,'200_6.0':36.2,'200_6.3':38.0,'200_7.1':42.6,'200_8.0':47.7,'200_8.8':52.2,'200_10.0':58.8,'200_12.0':69.6,'200_12.5':72.3,'200_14.2':81.1,'200_16.0':90.3,
    '250_5.0':38.3,'250_5.6':42.7,'250_6.0':45.7,'250_6.3':47.9,'250_8.0':60.5,'250_10.0':74.9,'250_12.0':88.5,'250_12.5':91.9,'250_14.2':103,'250_16.0':115,
    '300_6.0':54.7,'300_8.0':72.8,'300_10.0':88.4,'300_12.0':109.2,'300_16.0':144.0,
    '350_8.0':84.93,'350_10.0':106.0,'350_12.0':127.4,
    '400_8.0':97.0,'400_10.0':121.3,'400_12.0':145.6,'400_16.0':194.7 } };

/* RHS EN 10219 : key 'HxB' with thickness list; mass 'HxB_T' */
const RHS = { std:'EN 10219', shape:'rhs',
 sizes:['40x20','50x25','50x30','60x30','60x40','65x35','75x50','80x40','90x50','100x50','100x60',
        '120x60','120x80','125x75','150x75','150x100','160x80','180x100','200x100','200x120','200x150',
        '250x100','250x150','260x140','300x100','300x200','400x200','400x300','450x250','500x300'],
 t:{ '40x20':[1.2,1.5,1.8,2.0,2.5,3.0],'50x25':[1.5,1.8,2.0,2.5,3.0,4.0],'50x30':[2.5,3.0,3.2,4.0,4.9,5.0],
     '60x30':[1.5,1.8,2.0,2.5,3.0,4.0],'60x40':[2.5,3.0,3.2,4.0,4.9,5.0,6.0,6.3],
     '65x35':[2.0,2.5,3.0],'75x50':[1.5,1.8,2.0,2.5,3.0,4.0,5.0,6.0],
     '80x40':[3.0,3.2,4.0,4.9,5.0,6.0,6.3,8.0],'90x50':[3.0,3.2,3.6,4.0,4.9,5.0,5.6,6.0,6.3,7.1,8.0],
     '100x50':[3.2,3.6,4.0,4.9,5.0,6.0,6.3,7.1,8.0],'100x60':[3.0,3.2,3.6,4.0,4.9,5.0,5.6,6.0,6.3,7.1],
     '120x60':[3.6,4.0,4.9,5.0,5.6,6.0,6.3,7.1,8.0],'120x80':[3.6,4.0,4.9,5.0,5.6,6.0,6.3,7.1,8.0,10.0],
     '125x75':[2.5,3.0,4.0,4.5,5.0,5.5,6.0],'150x75':[2.0,2.5,3.0,4.0,4.5,5.0,5.5,6.0,8.0],
     '150x100':[4.0,4.9,5.0,5.6,6.0,6.3,7.1,8.0,8.8,10.0,12.0,12.5],
     '160x80':[4.0,4.9,5.0,5.6,6.0,6.3,7.1,8.0,8.8,10.0],
     '180x100':[5.0,5.6,6.0,6.3,7.1,8.0,8.8,10.0,12.0,12.5],
     '200x100':[5.0,5.6,6.0,6.3,7.1,8.0,8.8,10.0,12.0,12.5,14.2,16.0],
     '200x120':[5.0,5.6,6.0,6.3,7.1,8.0],
     '200x150':[5.0,5.6,6.0,6.3,7.1,8.0,8.8,10.0,12.0,12.5,14.2,16.0],
     '250x100':[5.0,5.6,6.0,6.3,7.1,8.0,8.8,10.0,12.0,12.5,14.2,16.0],
     '250x150':[5.0,5.6,6.0,6.3,7.1,8.0,8.8,10.0,12.0,12.5,14.2,16.0],
     '260x140':[5.0,5.6,6.0,6.3,7.1,8.0,8.8,10.0,12.0,12.5,14.2,16.0],
     '300x100':[5.0,5.6,6.0,6.3,7.1,8.0],
     '300x200':[5.0,5.6,6.0,6.3,7.1,8.0,8.8,10.0,12.0,12.5,14.2,16.0],
     '400x200':[6.0,6.3,7.1,8.0,8.8,10.0,12.0,16.0],
     '400x300':[8.0,8.8,10.0,12.0,12.5,14.2,16.0],'450x250':[8.0,10.0,12.0,16.0],'500x300':[8.0,12.0,16.0] },
 m:{'40x20_1.2':1.06,'40x20_1.5':1.30,'40x20_1.8':1.53,'40x20_2.0':1.68,'40x20_2.5':2.03,'40x20_3.0':2.36,
    '50x25_1.5':1.65,'50x25_1.8':1.95,'50x25_2.0':2.15,'50x25_2.5':3.07,'50x25_3.0':3.88,'50x25_4.0':4.20,
    '50x30_2.5':2.89,'50x30_3.0':3.41,'50x30_3.2':3.61,'50x30_4.0':4.39,'50x30_4.9':5.20,'50x30_5.0':5.28,
    '60x30_1.5':2.00,'60x30_1.8':2.38,'60x30_2.0':2.62,'60x30_2.5':3.21,'60x30_3.0':3.77,'60x30_4.0':4.83,
    '60x40_2.5':3.68,'60x40_3.0':4.35,'60x40_3.2':4.62,'60x40_4.0':5.64,'60x40_4.9':6.74,'60x40_5.0':6.85,'60x40_6.0':7.99,'60x40_6.3':8.31,
    '65x35_2.0':2.93,'65x35_2.5':3.60,'65x35_3.0':4.25,
    '75x50_1.5':2.83,'75x50_1.8':3.37,'75x50_2.0':3.72,'75x50_2.5':4.58,'75x50_3.0':5.42,'75x50_4.0':7.02,'75x50_5.0':8.52,'75x50_6.0':9.92,
    '80x40_3.0':5.29,'80x40_3.2':5.62,'80x40_4.0':6.90,'80x40_4.9':8.28,'80x40_5.0':8.42,'80x40_6.0':9.87,'80x40_6.3':10.3,'80x40_8.0':12.5,
    '90x50_3.0':6.24,'90x50_3.2':6.63,'90x50_3.6':7.40,'90x50_4.0':8.15,'90x50_4.9':9.81,'90x50_5.0':9.99,'90x50_5.6':11.1,'90x50_6.0':11.8,'90x50_6.3':12.3,'90x50_7.1':13.6,'90x50_8.0':15.0,
    '100x50_3.2':7.13,'100x50_3.6':7.96,'100x50_4.0':8.78,'100x50_4.9':10.6,'100x50_5.0':10.8,'100x50_6.0':12.7,'100x50_6.3':13.3,'100x50_7.1':14.7,'100x50_8.0':16.3,
    '100x60_3.0':7.18,'100x60_3.2':7.63,'100x60_3.6':8.53,'100x60_4.0':9.41,'100x60_4.9':11.4,'100x60_5.0':11.6,'100x60_5.6':12.8,'100x60_6.0':13.6,'100x60_6.3':14.2,'100x60_7.1':15.8,
    '120x60_3.6':9.70,'120x60_4.0':10.7,'120x60_4.9':12.9,'120x60_5.0':13.1,'120x60_5.6':14.6,'120x60_6.0':15.5,'120x60_6.3':16.2,'120x60_7.1':18.1,'120x60_8.0':20.1,
    '120x80_3.6':10.8,'120x80_4.0':11.9,'120x80_4.9':14.4,'120x80_5.0':14.7,'120x80_5.6':16.3,'120x80_6.0':17.4,'120x80_6.3':18.2,'120x80_7.1':20.3,'120x80_8.0':22.6,'120x80_10.0':27.4,
    '125x75_2.5':7.53,'125x75_3.0':8.96,'125x75_4.0':11.70,'125x75_4.5':13.08,'125x75_5.0':14.40,'125x75_5.5':15.71,'125x75_6.0':17.00,
    '150x75_2.0':6.86,'150x75_2.5':8.51,'150x75_3.0':10.13,'150x75_4.0':13.30,'150x75_4.5':14.85,'150x75_5.0':16.37,'150x75_5.5':17.87,'150x75_6.0':19.09,'150x75_8.0':21.53,
    '150x100_4.0':15.1,'150x100_4.9':18.3,'150x100_5.0':18.6,'150x100_5.6':20.7,'150x100_6.0':22.1,'150x100_6.3':23.1,'150x100_7.1':25.9,'150x100_8.0':28.9,'150x100_8.8':31.5,'150x100_10.0':35.3,'150x100_12.0':41.4,'150x100_12.5':42.8,
    '160x80_4.0':14.4,'160x80_4.9':17.5,'160x80_5.0':17.8,'160x80_5.6':19.9,'160x80_6.0':21.2,'160x80_6.3':22.2,'160x80_7.1':24.7,'160x80_8.0':27.6,'160x80_8.8':30.1,'160x80_10.0':33.7,
    '180x100_5.0':21.0,'180x100_5.6':23.4,'180x100_6.0':24.9,'180x100_6.3':26.1,'180x100_7.1':29.2,'180x100_8.0':32.6,'180x100_8.8':35.6,'180x100_10.0':40.0,'180x100_12.0':47.0,'180x100_12.5':48.7,
    '200x100_5.0':22.6,'200x100_5.6':25.1,'200x100_6.0':26.8,'200x100_6.3':28.1,'200x100_7.1':31.4,'200x100_8.0':35.1,'200x100_8.8':38.4,'200x100_10.0':43.1,'200x100_12.0':50.8,'200x100_12.5':52.7,'200x100_14.2':58.9,'200x100_16.0':65.2,
    '200x120_5.0':24.1,'200x120_5.6':26.9,'200x120_6.0':28.7,'200x120_6.3':30.1,'200x120_7.1':33.7,'200x120_8.0':37.6,
    '200x150_5.0':26.5,'200x150_5.6':29.5,'200x150_6.0':31.5,'200x150_6.3':33.0,'200x150_7.1':37.0,'200x150_8.0':41.4,'200x150_8.8':45.3,'200x150_10.0':51.0,'200x150_12.0':60.2,'200x150_12.5':62.5,'200x150_14.2':70.0,'200x150_16.0':77.7,
    '250x100_5.0':26.5,'250x100_5.6':29.5,'250x100_6.0':31.5,'250x100_6.3':33.0,'250x100_7.1':37.0,'250x100_8.0':41.4,'250x100_8.8':45.3,'250x100_10.0':51.0,'250x100_12.0':60.2,'250x100_12.5':62.5,'250x100_14.2':70.0,'250x100_16.0':77.7,
    '250x150_5.0':30.4,'250x150_5.6':33.9,'250x150_6.0':36.2,'250x150_6.3':38.0,'250x150_7.1':42.6,'250x150_8.0':47.7,'250x150_8.8':52.2,'250x150_10.0':58.8,'250x150_12.0':69.6,'250x150_12.5':72.3,'250x150_14.2':81.1,'250x150_16.0':90.3,
    '260x140_5.0':30.4,'260x140_5.6':33.9,'260x140_6.0':36.2,'260x140_6.3':38.0,'260x140_7.1':42.6,'260x140_8.0':47.7,'260x140_8.8':52.2,'260x140_10.0':58.8,'260x140_12.0':69.6,'260x140_12.5':72.3,'260x140_14.2':81.1,'260x140_16.0':90.3,
    '300x100_5.0':30.4,'300x100_5.6':33.9,'300x100_6.0':36.2,'300x100_6.3':38.0,'300x100_7.1':42.6,'300x100_8.0':47.7,
    '300x200_5.0':38.3,'300x200_5.6':42.7,'300x200_6.0':45.7,'300x200_6.3':47.9,'300x200_7.1':53.7,'300x200_8.0':60.3,'300x200_8.8':66.0,'300x200_10.0':74.5,'300x200_12.0':88.5,'300x200_12.5':91.9,'300x200_14.2':103,'300x200_16.0':115,
    '400x200_6.0':55.1,'400x200_6.3':57.8,'400x200_7.1':64.9,'400x200_8.0':72.8,'400x200_8.8':79.8,'400x200_10.0':90.2,'400x200_12.0':107,'400x200_16.0':141,
    '400x300_8.0':85.4,'400x300_8.8':93.6,'400x300_10.0':106,'400x300_12.0':126,'400x300_12.5':131,'400x300_14.2':148,'400x300_16.0':166,
    '450x250_8.0':85.4,'450x250_10.0':106,'450x250_12.0':126,'450x250_16.0':166,
    '500x300_8.0':97.0,'500x300_12.0':145.6,'500x300_16.0':194.7 } };

/* CHS / Pipe : ASTM A53 Sch40 nominal — [OD mm, wall mm, kg/m] keyed by NB label */
const CHS = { std:'ASTM A53 Sch 40', shape:'chs',
 sizes:['15','20','25','32','40','50','65','80','90','100','125','150','200','250','300'],
 d:{ '15':[21.3,2.77,1.27],'20':[26.7,2.87,1.69],'25':[33.4,3.38,2.50],'32':[42.2,3.56,3.39],
     '40':[48.3,3.68,4.05],'50':[60.3,3.91,5.44],'65':[73.0,5.16,8.63],'80':[88.9,5.49,11.29],
     '90':[101.6,5.74,13.57],'100':[114.3,6.02,16.07],'125':[141.3,6.55,21.77],'150':[168.3,7.11,28.26],
     '200':[219.1,8.18,42.55],'250':[273.0,9.27,60.29],'300':[323.8,10.31,79.70] },
 label:{'15':'1/2"','20':'3/4"','25':'1"','32':'1¼"','40':'1½"','50':'2"','65':'2½"','80':'3"',
        '90':'3½"','100':'4"','125':'5"','150':'6"','200':'8"','250':'10"','300':'12"'} };


/* ---- I-sections & channels & angles : rows [designation, h, b, tw, tf, r, kg/m] ---- */
/* IPE — EN 10365 / DIN 1025-5 */
const IPE = { std:'EN 10365', shape:'ibeam', rows:[
 ['80',80,46,3.8,5.2,5,6.0],['100',100,55,4.1,5.7,7,8.1],['120',120,64,4.4,6.3,7,10.4],
 ['140',140,73,4.7,6.9,7,12.9],['160',160,82,5.0,7.4,9,15.8],['180',180,91,5.3,8.0,9,18.8],
 ['200',200,100,5.6,8.5,12,22.4],['220',220,110,5.9,9.2,12,26.2],['240',240,120,6.2,9.8,15,30.7],
 ['270',270,135,6.6,10.2,15,36.1],['300',300,150,7.1,10.7,15,42.2],['330',330,160,7.5,11.5,18,49.1],
 ['360',360,170,8.0,12.7,18,57.1],['400',400,180,8.6,13.5,21,66.3],['450',450,190,9.4,14.6,21,77.6],
 ['500',500,200,10.2,16.0,21,90.7],['550',550,210,11.1,17.2,24,106],['600',600,220,12.0,19.0,24,122] ] };

/* IPN — DIN 1025-1 (tapered flange; tf is mean) */
const IPN = { std:'DIN 1025-1', shape:'ibeam', rows:[
 ['80',80,42,3.9,5.9,3.9,5.94],['100',100,50,4.5,6.8,4.5,8.34],['120',120,58,5.1,7.7,5.1,11.1],
 ['140',140,66,5.7,8.6,5.7,14.3],['160',160,74,6.3,9.5,6.3,17.9],['180',180,82,6.9,10.4,6.9,21.9],
 ['200',200,90,7.5,11.3,7.5,26.2],['220',220,98,8.1,12.2,8.1,31.1],['240',240,106,8.7,13.1,8.7,36.2],
 ['260',260,113,9.4,14.1,9.4,41.9],['280',280,119,10.1,15.2,10.1,47.9],['300',300,125,10.8,16.2,10.8,54.2],
 ['320',320,131,11.5,17.3,11.5,61.0],['340',340,137,12.2,18.3,12.2,68.0],['360',360,143,13.0,19.5,13.0,76.1],
 ['380',380,149,13.7,20.5,13.7,84.0],['400',400,155,14.4,21.6,14.4,92.4],['450',450,170,16.2,24.3,16.2,115],
 ['500',500,185,18.0,27.0,18.0,141],['550',550,200,19.0,30.0,19.0,166],['600',600,215,21.6,32.4,21.6,199] ] };

/* HEA — DIN 1025-3 (HE-A / IPBL) */
const HEA = { std:'DIN 1025-3', shape:'ibeam', rows:[
 ['100',96,100,5.0,8.0,12,16.7],['120',114,120,5.0,8.0,12,19.9],['140',133,140,5.5,8.5,12,24.7],
 ['160',152,160,6.0,9.0,15,30.4],['180',171,180,6.0,9.5,15,35.5],['200',190,200,6.5,10.0,18,42.3],
 ['220',210,220,7.0,11.0,18,50.5],['240',230,240,7.5,12.0,21,60.3],['260',250,260,7.5,12.5,24,68.2],
 ['280',270,280,8.0,13.0,24,76.4],['300',290,300,8.5,14.0,27,88.3],['320',310,300,9.0,15.5,27,97.6],
 ['340',330,300,9.5,16.5,27,105],['360',350,300,10.0,17.5,27,112],['400',390,300,11.0,19.0,27,125],
 ['450',440,300,11.5,21.0,27,140],['500',490,300,12.0,23.0,27,155],['550',540,300,12.5,24.0,27,166],
 ['600',590,300,13.0,25.0,27,178],['650',640,300,13.5,26.0,27,190],['700',690,300,14.5,27.0,27,204],
 ['800',790,300,15.0,28.0,30,224],['900',890,300,16.0,30.0,30,252],['1000',990,300,16.5,31.0,30,272] ] };

/* HEB — DIN 1025-2 (HE-B / IPB) */
const HEB = { std:'DIN 1025-2', shape:'ibeam', rows:[
 ['100',100,100,6.0,10.0,12,20.4],['120',120,120,6.5,11.0,12,26.7],['140',140,140,7.0,12.0,12,33.7],
 ['160',160,160,8.0,13.0,15,42.6],['180',180,180,8.5,14.0,15,51.2],['200',200,200,9.0,15.0,18,61.3],
 ['220',220,220,9.5,16.0,18,71.5],['240',240,240,10.0,17.0,21,83.2],['260',260,260,10.0,17.5,24,93.0],
 ['280',280,280,10.5,18.0,24,103],['300',300,300,11.0,19.0,27,117],['320',320,300,11.5,20.5,27,127],
 ['340',340,300,12.0,21.5,27,134],['360',360,300,12.5,22.5,27,142],['400',400,300,13.5,24.0,27,155],
 ['450',450,300,14.0,26.0,27,171],['500',500,300,14.5,28.0,27,187],['550',550,300,15.0,29.0,27,199],
 ['600',600,300,15.5,30.0,27,212],['650',650,300,16.0,31.0,27,225],['700',700,300,17.0,32.0,27,241],
 ['800',800,300,17.5,33.0,30,262],['900',900,300,18.5,35.0,30,291],['1000',1000,300,19.0,36.0,30,314] ] };

/* HEM — DIN 1025-4 (HE-M / IPBv) common range */
const HEM = { std:'DIN 1025-4', shape:'ibeam', rows:[
 ['100',120,106,12.0,20.0,12,41.8],['120',140,126,12.5,21.0,12,52.1],['140',160,146,13.0,22.0,12,63.2],
 ['160',180,166,14.0,23.0,15,76.2],['180',200,186,14.5,24.0,15,88.9],['200',220,206,15.0,25.0,18,103],
 ['220',240,226,15.5,26.0,18,117],['240',270,248,18.0,32.0,21,157],['260',290,268,18.0,32.5,24,172],
 ['280',310,288,18.5,33.0,24,189],['300',340,310,21.0,39.0,27,238],['320',359,309,21.0,40.0,27,245],
 ['340',377,309,21.0,40.0,27,248],['360',395,308,21.0,40.0,27,250],['400',432,307,21.0,40.0,27,256] ] };

/* UB Universal Beams — BS 4-1 : 1993 (subset of common sizes) */
const UB = { std:'BS 4-1', shape:'ibeam', rows:[
 ['127x76x13',127,76,4.0,7.6,7.6,13.0],['152x89x16',152.4,88.7,4.5,7.7,7.6,16.0],['178x102x19',177.8,101.2,4.8,7.9,7.6,19.0],
 ['203x102x23',203.2,101.8,5.4,9.3,7.6,23.1],['203x133x25',203.2,133.2,5.7,7.8,7.6,25.1],['203x133x30',206.8,133.9,6.4,9.6,7.6,30.0],
 ['254x102x25',257.2,101.9,6.0,8.4,7.6,25.2],['254x146x31',251.4,146.1,6.0,8.6,7.6,31.1],['254x146x37',256.0,146.4,6.3,10.9,7.6,37.0],
 ['254x146x43',259.6,147.3,7.2,12.7,7.6,43.0],['305x102x25',305.1,101.6,5.8,7.0,7.6,24.8],['305x127x37',304.4,123.3,7.1,10.7,8.9,37.0],
 ['305x165x40',303.4,165.0,6.0,10.2,8.9,40.3],['305x165x46',306.6,165.7,6.7,11.8,8.9,46.1],['305x165x54',310.4,166.9,7.9,13.7,8.9,54.0],
 ['356x171x45',351.4,171.1,7.0,9.7,10.2,45.0],['356x171x57',358.0,172.2,8.1,13.0,10.2,57.0],['406x178x60',406.4,177.9,7.9,12.8,10.2,60.1],
 ['406x178x74',412.8,179.5,9.5,16.0,10.2,74.2],['457x152x52',449.8,152.4,7.6,10.9,10.2,52.3],['457x191x67',453.4,189.9,8.5,12.7,10.2,67.1],
 ['457x191x82',460.0,191.3,9.9,16.0,10.2,82.0],['533x210x82',528.3,208.8,9.6,13.2,12.7,82.2],['533x210x101',536.7,210.0,10.8,17.4,12.7,101.0],
 ['610x229x101',602.6,227.6,10.5,14.8,12.7,101.2],['610x229x125',612.2,229.0,11.9,19.6,12.7,125.1],['610x305x149',612.4,304.8,11.8,19.7,16.5,149.1],
 ['686x254x125',677.9,253.0,11.7,16.2,15.2,125.2],['762x267x147',754.0,265.2,12.8,17.5,16.5,146.9],['838x292x176',834.9,291.7,14.0,18.8,17.8,175.9],
 ['914x305x201',903.0,303.3,15.1,20.2,19.1,200.9],['914x419x343',911.8,418.5,19.4,32.0,24.1,343.3],['1016x305x222',970.3,300.0,16.0,21.1,30.0,222.0] ] };

/* UC Universal Columns — BS 4-1 : 1993 */
const UC = { std:'BS 4-1', shape:'ibeam', rows:[
 ['152x152x23',152.4,152.2,5.8,6.8,7.6,23.0],['152x152x30',157.6,152.9,6.5,9.4,7.6,30.0],['152x152x37',161.8,154.4,8.0,11.5,7.6,37.0],
 ['203x203x46',203.2,203.6,7.2,11.0,10.2,46.1],['203x203x52',206.2,204.3,7.9,12.5,10.2,52.0],['203x203x60',209.6,205.8,9.4,14.2,10.2,60.0],
 ['203x203x71',215.8,206.4,10.0,17.3,10.2,71.0],['203x203x86',222.2,209.1,12.7,20.5,10.2,86.1],['254x254x73',254.1,254.6,8.6,14.2,12.7,73.1],
 ['254x254x89',260.3,256.3,10.3,17.3,12.7,88.9],['254x254x107',266.7,258.8,12.8,20.5,12.7,107.1],['254x254x132',276.3,261.3,15.3,25.3,12.7,132.0],
 ['254x254x167',289.1,265.2,19.2,31.7,12.7,167.1],['305x305x97',307.9,305.3,9.9,15.4,15.2,96.9],['305x305x118',314.5,307.4,12.0,18.7,15.2,117.9],
 ['305x305x137',320.5,309.2,13.8,21.7,15.2,136.9],['305x305x158',327.1,311.2,15.8,25.0,15.2,158.1],['305x305x198',339.9,314.5,19.1,31.4,15.2,198.1],
 ['305x305x240',352.5,318.4,23.0,37.7,15.2,240.0],['305x305x283',365.3,322.2,26.8,44.1,15.2,282.9],['356x368x129',355.6,368.6,10.4,17.5,15.2,129.0],
 ['356x368x153',362.0,370.5,12.3,20.7,15.2,152.9],['356x368x177',368.2,372.6,14.4,23.8,15.2,177.0],['356x406x235',381.0,394.8,18.4,30.2,15.2,235.1],
 ['356x406x287',393.6,399.0,22.6,36.5,15.2,287.1],['356x406x340',406.4,403.0,26.6,42.9,15.2,339.9],['356x406x467',436.6,412.2,35.8,58.0,15.2,467.0],
 ['356x406x634',474.6,424.0,47.6,77.0,15.2,633.9] ] };

/* UPN — DIN 1026 : [desig, h, b, tw, tf, r, kg/m] */
const UPN = { std:'DIN 1026', shape:'channel', rows:[
 ['80',80,45,6.0,8.0,8.0,8.64],['100',100,50,6.0,8.5,8.5,10.6],['120',120,55,7.0,9.0,9.0,13.4],
 ['140',140,60,7.0,10.0,10.0,16.0],['160',160,65,7.5,10.5,10.5,18.8],['180',180,70,8.0,11.0,11.0,22.0],
 ['200',200,75,8.5,11.5,11.5,25.3],['220',220,80,9.0,12.5,12.5,29.4],['240',240,85,9.5,13.0,13.0,33.2],
 ['260',260,90,10.0,14.0,14.0,37.9],['280',280,95,10.0,15.0,15.0,41.8],['300',300,100,10.0,16.0,16.0,46.2],
 ['320',320,100,14.0,17.5,17.5,59.5],['350',350,100,14.0,16.0,16.0,60.6],['380',380,102,13.5,16.0,16.0,63.1],
 ['400',400,110,14.0,18.0,18.0,71.8] ] };

/* PFC Parallel Flange Channels — BS 4-1 : 1993 */
const PFC = { std:'BS 4-1', shape:'channel', rows:[
 ['100x50x10',100,50,5.0,8.5,9,10.2],['125x65x15',125,65,5.5,9.5,12,14.8],['150x75x18',150,75,5.5,10.0,12,17.9],
 ['150x90x24',150,90,6.5,12.0,12,23.9],['180x75x20',180,75,6.0,10.5,12,20.3],['180x90x26',180,90,6.5,12.5,12,26.1],
 ['200x75x23',200,75,6.0,12.5,12,23.4],['200x90x30',200,90,7.0,14.0,12,29.7],['230x75x26',230,75,6.5,12.5,12,25.7],
 ['230x90x32',230,90,7.5,14.0,12,32.2],['260x75x28',260,75,7.0,12.0,12,27.6],['260x90x35',260,90,8.0,14.0,12,34.8],
 ['300x90x41',300,90,9.0,15.5,12,41.4],['300x100x46',300,100,9.0,16.5,15,45.5],['380x100x54',380,100,9.5,17.5,15,54.0],
 ['430x100x64',430,100,11.0,19.0,15,64.4] ] };

/* Equal Angles — BS 4848 Part 4 : [AxA, t, kg/m] ; leg=A */
const ANGLE_EQ = { std:'BS 4848-4', shape:'eangle', rows:[
 ['25x25x3',25,3,1.11],['25x25x4',25,4,1.45],['25x25x5',25,5,1.77],
 ['40x40x4',40,4,2.42],['40x40x5',40,5,2.97],['40x40x6',40,6,3.52],
 ['50x50x5',50,5,3.77],['50x50x6',50,6,4.47],['50x50x8',50,8,5.82],
 ['60x60x5',60,5,4.57],['60x60x6',60,6,5.42],['60x60x8',60,8,7.09],['60x60x10',60,10,8.69],
 ['65x65x5',65,5,5.00],['65x65x6',65,6,5.91],['65x65x8',65,8,7.66],['65x65x10',65,10,9.42],
 ['70x70x6',70,6,6.38],['70x70x8',70,8,8.36],['70x70x10',70,10,10.3],
 ['75x75x6',75,6,6.87],['75x75x8',75,8,9.00],['75x75x10',75,10,11.10],['75x75x12',75,12,13.10],
 ['80x80x6',80,6,7.34],['80x80x8',80,8,9.63],['80x80x10',80,10,11.9],
 ['90x90x6',90,6,8.30],['90x90x8',90,8,10.9],['90x90x10',90,10,13.4],['90x90x12',90,12,15.9],
 ['100x100x8',100,8,12.2],['100x100x10',100,10,15.0],['100x100x12',100,12,17.8],['100x100x15',100,15,21.9],
 ['120x120x10',120,10,18.2],['120x120x12',120,12,21.6],['120x120x15',120,15,26.6],
 ['130x130x10',130,10,19.8],['130x130x12',130,12,23.5],['130x130x16',130,16,30.8],
 ['150x150x10',150,10,23.0],['150x150x12',150,12,27.3],['150x150x15',150,15,33.8],['150x150x18',150,18,40.1],['150x150x20',150,20,44.2],
 ['200x200x16',200,16,48.5],['200x200x18',200,18,54.2],['200x200x20',200,20,59.9],['200x200x24',200,24,71.1] ] };

/* Unequal Angles — BS 4848 Part 4 : [AxBxt, A, B, t, kg/m] */
const ANGLE_UEQ = { std:'BS 4848-4', shape:'uangle', rows:[
 ['65x50x5',65,50,5,4.35],['65x50x6',65,50,6,5.16],['65x50x8',65,50,8,6.75],
 ['75x50x6',75,50,6,5.65],['75x50x8',75,50,8,7.39],['75x50x10',75,50,10,9.07],
 ['80x60x6',80,60,6,6.37],['80x60x7',80,60,7,7.36],['80x60x8',80,60,8,8.34],
 ['100x50x6',100,50,6,6.85],['100x50x8',100,50,8,8.99],['100x50x10',100,50,10,11.10],
 ['100x65x7',100,65,7,8.77],['100x65x8',100,65,8,9.94],['100x65x10',100,65,10,12.3],
 ['100x75x8',100,75,8,10.6],['100x75x10',100,75,10,13.0],['100x75x12',100,75,12,15.4],
 ['120x80x8',120,80,8,12.20],['120x80x10',120,80,10,15.00],['120x80x12',120,80,12,17.80],
 ['125x75x8',125,75,8,12.2],['125x75x10',125,75,10,15.0],['125x75x12',125,75,12,17.8],
 ['150x75x10',150,75,10,17.0],['150x75x12',150,75,12,20.2],['150x75x15',150,75,15,24.8],
 ['150x90x10',150,90,10,18.2],['150x90x12',150,90,12,21.6],['150x90x15',150,90,15,26.6],
 ['150x100x10',150,100,10,19.0],['150x100x12',150,100,12,22.6],['150x100x15',150,100,15,27.8],
 ['200x100x10',200,100,10,23.0],['200x100x12',200,100,12,27.3],['200x100x15',200,100,15,33.7],
 ['200x150x12',200,150,12,32.0],['200x150x15',200,150,15,39.6],['200x150x18',200,150,18,47.1] ] };

/* ======================================================================
   SECTION LIBRARY — registry, weight engine, dimensioned SVG sketches
   Depends on data in sections_data.js (SECT_GEO, SHS, RHS, CHS, IPE, ...)
   ==================================================================== */

/* master registry: key -> {name, family, std, kind, ...} */
const SECT = {};
(function buildRegistry(){
  // geometric
  for(const k in SECT_GEO){ SECT[k]=Object.assign({key:k,kind:'geo',family:SECT_GEO[k].name},SECT_GEO[k]); }
  // hollow families
  SECT.shs={key:'shs',kind:'shs',family:'Square Hollow Section (SHS)',std:SHS.std,shape:'shs',data:SHS};
  SECT.rhs={key:'rhs',kind:'rhs',family:'Rectangular Hollow Section (RHS)',std:RHS.std,shape:'rhs',data:RHS};
  SECT.chs={key:'chs',kind:'chs',family:'Circular Pipe / Tube (CHS)',std:CHS.std,shape:'chs',data:CHS};
  // profile families [desig,h,b,tw,tf,r,kg]
  const P=(key,name,src)=>{ SECT[key]={key,kind:'profile',family:name,std:src.std,shape:src.shape,rows:src.rows}; };
  P('ipe','Beam — IPE',IPE); P('ipn','Beam — IPN',IPN);
  P('hea','Beam — HEA (IPBL)',HEA); P('heb','Beam — HEB (IPB)',HEB); P('hem','Beam — HEM (IPBv)',HEM);
  P('ub','Universal Beam (UB)',UB); P('uc','Universal Column (UC)',UC);
  P('upn','Channel — UPN',UPN); P('pfc','Parallel Flange Channel (PFC)',PFC);
  P('eangle','Equal Angle',ANGLE_EQ); P('uangle','Unequal Angle',ANGLE_UEQ);
})();

const SECT_GROUPS=[
  ['Hollow sections',['shs','rhs','chs']],
  ['Beams & columns',['ipe','ipn','hea','heb','hem','ub','uc']],
  ['Channels',['upn','pfc']],
  ['Angles',['eangle','uangle']],
  ['Plates & bars',['plate','chequer','flat','round','square','hex']],
];

/* ---- size list for a family (array of size keys/designations) ---- */
function sectSizes(key){ const s=SECT[key];
  if(s.kind==='shs'||s.kind==='rhs') return s.data.sizes;
  if(s.kind==='chs') return s.data.sizes;
  if(s.kind==='profile') return s.rows.map(r=>r[0]);
  return []; }
function sectThk(key,size){ const s=SECT[key]; if(s.kind==='shs'||s.kind==='rhs') return s.data.t[size]||[]; return []; }

/* ---- resolve a chosen section to dimensions {h,b,tw,tf,r,od,wall,a,t...} + kg/m ---- */
function thkKey(t){ // normalize numeric thickness to the string used in mass tables (one decimal)
  const n=+t; return (Number.isInteger(n)?n.toFixed(1):String(n)); }
function sectDims(key,sel){ const s=SECT[key]; // sel: {size, t} for hollow; {size} for profile
  if(s.kind==='shs'){ const h=+sel.size, t=+sel.t; return {shape:'shs',h,b:h,t,kgm:s.data.m[sel.size+'_'+thkKey(sel.t)]}; }
  if(s.kind==='rhs'){ const [h,b]=sel.size.split('x').map(Number); const t=+sel.t; return {shape:'rhs',h,b,t,kgm:s.data.m[sel.size+'_'+thkKey(sel.t)]}; }
  if(s.kind==='chs'){ const d=s.data.d[sel.size]; return {shape:'chs',od:d[0],wall:d[1],kgm:d[2],label:s.data.label[sel.size]}; }
  if(s.kind==='profile'){ const r=s.rows.find(x=>x[0]===sel.size); if(!r)return null;
    if(s.shape==='eangle'){ const [dg,a,t,kg]=r; return {shape:'eangle',a,b:a,t,r:0,kgm:kg}; }
    if(s.shape==='uangle'){ const [dg,a,b,t,kg]=r; return {shape:'uangle',a,b,t,kgm:kg}; }
    const [dg,h,b,tw,tf,rr,kg]=r; return {shape:s.shape,h,b,tw,tf,r:rr,kgm:kg}; }
  return null; }

/* ---- weight per metre & per piece ---- */
function sectWeight(key,sel,material,lenM){
  const rho=(TWC_MAT[material]||TWC_MAT.steel).d; const s=SECT[key];
  if(s.kind==='geo'){ const v=sel; const a=Math.max(0,s.area(v)); let perM=a*1e-6*rho; let piece=a*1e-9*rho*(v.L||0);
    if(s.chequer){ perM=a*1e-6*rho+(v.p||0)*((v.W||0)/1000); piece+=(v.p||0)*((v.W||0)*(v.L||0)*1e-6); }
    return {perM,piece,Lm:(v.L||0)/1000}; }
  const dm=sectDims(key,sel); if(!dm||!dm.kgm) return {perM:0,piece:0,Lm:lenM||0};
  const perM=dm.kgm*(rho/7850); const L=lenM||sel.L||0; return {perM,piece:perM*L,Lm:L}; }

/* ---- human description ---- */
function sectDesc(key,sel,lenM){ const s=SECT[key];
  if(s.kind==='geo'){ return twcDesc(key,sel); }
  const L=(lenM!=null?lenM:sel.L)||0;
  if(s.kind==='shs') return `SHS ${sel.size}×${sel.size}×${sel.t} — L ${nfmt(L,3)} m`;
  if(s.kind==='rhs') return `RHS ${sel.size.replace('x','×')}×${sel.t} — L ${nfmt(L,3)} m`;
  if(s.kind==='chs'){ const d=s.data.d[sel.size]; return `Pipe ${s.data.label[sel.size]} (Ø${d[0]}×${d[1]}) — L ${nfmt(L,3)} m`; }
  return `${key.toUpperCase()} ${sel.size} — L ${nfmt(L,3)} m`; }
function sectShortLabel(key,sel){ const s=SECT[key];
  if(s.kind==='shs') return `SHS ${sel.size}×${sel.size}×${sel.t}`;
  if(s.kind==='rhs') return `RHS ${sel.size.replace('x','×')}×${sel.t}`;
  if(s.kind==='chs') return `Pipe ${s.data.label[sel.size]}`;
  if(s.kind==='profile') return `${key.toUpperCase()} ${sel.size}`;
  return twcDesc(key,sel).replace(/ — L.*$/,''); }

/* ======================================================================
   DIMENSIONED CROSS-SECTION SKETCHES  (drawn to scale from real dims)
   ==================================================================== */
function sketchSVG(shape,dm,opt){
  opt=opt||{}; const W=opt.w||280, H=opt.h||220, pad=48;
  const A='stroke="#1E232B" stroke-width="1.6" fill="#e9edf2"';
  const dim='stroke="#CC0605" stroke-width="1" fill="none"';
  const dt='fill="#CC0605" font-size="11" font-family="ui-monospace,monospace"';
  const lt='fill="#14171A" font-size="11" font-family="ui-monospace,monospace"';
  function scaleBox(w,h){ const s=Math.min((W-2*pad)/w,(H-2*pad)/h); return {s,ox:(W-w*s)/2,oy:(H-h*s)/2}; }
  const P=(x,y)=>`${x.toFixed(1)},${y.toFixed(1)}`;
  let body='';
  if(shape==='shs'||shape==='rhs'){ const w=dm.b,h=dm.h,t=dm.t; const {s,ox,oy}=scaleBox(w,h);
    const x=ox,y=oy,ww=w*s,hh=h*s,ti=t*s;
    body=`<path d="M${P(x,y)} h${ww} v${hh} h${-ww} z M${P(x+ti,y+ti)} v${hh-2*ti} h${ww-2*ti} v${-(hh-2*ti)} z" ${A} fill-rule="evenodd"/>
      <line x1="${x}" y1="${y-14}" x2="${x+ww}" y2="${y-14}" ${dim}/><text x="${x+ww/2}" y="${y-18}" text-anchor="middle" ${lt}>b=${w}</text>
      <line x1="${x+ww+14}" y1="${y}" x2="${x+ww+14}" y2="${y+hh}" ${dim}/><text x="${x+ww+18}" y="${y+hh/2}" ${lt} transform="rotate(90 ${x+ww+18} ${y+hh/2})" text-anchor="middle">h=${h}</text>
      <line x1="${x+ti/2}" y1="${y+hh+4}" x2="${x+ti/2}" y2="${y+hh+14}" ${dim}/><text x="${x+ti/2}" y="${y+hh+25}" text-anchor="middle" ${dt}>t=${t}</text>`;
  } else if(shape==='chs'){ const od=dm.od,wall=dm.wall; const {s}=scaleBox(od,od);
    const cx=W/2,cy=H/2,R=od/2*s,ri=(od/2-wall)*s;
    body=`<circle cx="${cx}" cy="${cy}" r="${R}" ${A}/><circle cx="${cx}" cy="${cy}" r="${ri}" fill="#fff" stroke="#1E232B" stroke-width="1.2"/>
      <line x1="${cx-R}" y1="${cy}" x2="${cx+R}" y2="${cy}" ${dim}/><text x="${cx}" y="${cy-6}" text-anchor="middle" ${lt}>OD=${od}</text>
      <line x1="${cx+ri}" y1="${cy+ri*0.7}" x2="${cx+R+16}" y2="${cy+R*0.7+10}" ${dim}/><text x="${cx+R+18}" y="${cy+R*0.7+14}" ${dt}>t=${wall}</text>`;
  } else if(shape==='ibeam'){ const h=dm.h,b=dm.b,tw=dm.tw,tf=dm.tf; const {s,ox,oy}=scaleBox(b,h);
    const x=ox,y=oy,bb=b*s,hh=h*s,tfs=tf*s,tws=tw*s; const cx=x+bb/2;
    body=`<path d="M${P(x,y)} h${bb} v${tfs} h${-(bb-tws)/2} v${hh-2*tfs} h${(bb-tws)/2} v${tfs} h${-bb} v${-tfs} h${(bb-tws)/2} v${-(hh-2*tfs)} h${-(bb-tws)/2} z" ${A}/>
      <line x1="${x}" y1="${y-14}" x2="${x+bb}" y2="${y-14}" ${dim}/><text x="${cx}" y="${y-18}" text-anchor="middle" ${lt}>b=${b}</text>
      <line x1="${x+bb+16}" y1="${y}" x2="${x+bb+16}" y2="${y+hh}" ${dim}/><text x="${x+bb+20}" y="${y+hh/2}" ${lt} transform="rotate(90 ${x+bb+20} ${y+hh/2})" text-anchor="middle">h=${h}</text>
      <line x1="${cx+tws/2}" y1="${y+hh/2}" x2="${cx+tws/2+22}" y2="${y+hh/2}" ${dim}/><text x="${cx+tws/2+24}" y="${y+hh/2+4}" ${dt}>tw=${tw}</text>
      <line x1="${x+bb*0.25}" y1="${y}" x2="${x+bb*0.25}" y2="${y+tfs}" ${dim}/><text x="${x-4}" y="${y+tfs+13}" text-anchor="end" ${dt}>tf=${tf}</text>
      ${dm.r?`<text x="${cx+tws/2+24}" y="${y+hh/2+18}" fill="#B7791F" font-size="10" font-family="ui-monospace,monospace">r=${dm.r}</text>`:''}`;
  } else if(shape==='channel'){ const h=dm.h,b=dm.b,tw=dm.tw,tf=dm.tf; const {s,ox,oy}=scaleBox(b,h);
    const x=ox,y=oy,bb=b*s,hh=h*s,tfs=tf*s,tws=tw*s;
    body=`<path d="M${P(x,y)} h${bb} v${tfs} h${-(bb-tws)} v${hh-2*tfs} h${bb-tws} v${tfs} h${-bb} z" ${A}/>
      <line x1="${x}" y1="${y-14}" x2="${x+bb}" y2="${y-14}" ${dim}/><text x="${x+bb/2}" y="${y-18}" text-anchor="middle" ${lt}>b=${b}</text>
      <line x1="${x-16}" y1="${y}" x2="${x-16}" y2="${y+hh}" ${dim}/><text x="${x-20}" y="${y+hh/2}" ${lt} transform="rotate(-90 ${x-20} ${y+hh/2})" text-anchor="middle">h=${h}</text>
      <line x1="${x+tws}" y1="${y+hh/2}" x2="${x+tws+22}" y2="${y+hh/2}" ${dim}/><text x="${x+tws+24}" y="${y+hh/2+4}" ${dt}>tw=${tw}</text>
      <line x1="${x+bb*0.55}" y1="${y}" x2="${x+bb*0.55}" y2="${y+tfs}" ${dim}/><text x="${x+bb*0.55+3}" y="${y+tfs/2+4}" ${dt}>tf=${tf}</text>`;
  } else if(shape==='eangle'||shape==='uangle'){ const a=dm.h||dm.a,b=dm.b||dm.a,t=dm.t; const {s,ox,oy}=scaleBox(b,a);
    const x=ox,y=oy,aa=a*s,bb=b*s,ts=t*s;
    body=`<path d="M${P(x,y)} h${ts} v${aa-ts} h${bb-ts} v${ts} h${-bb} z" ${A}/>
      <line x1="${x}" y1="${y+aa+14}" x2="${x+bb}" y2="${y+aa+14}" ${dim}/><text x="${x+bb/2}" y="${y+aa+26}" text-anchor="middle" ${lt}>b=${b}</text>
      <line x1="${x-16}" y1="${y}" x2="${x-16}" y2="${y+aa}" ${dim}/><text x="${x-20}" y="${y+aa/2}" ${lt} transform="rotate(-90 ${x-20} ${y+aa/2})" text-anchor="middle">a=${a}</text>
      <line x1="${x+ts}" y1="${y+aa*0.6}" x2="${x+ts+22}" y2="${y+aa*0.6}" ${dim}/><text x="${x+ts+24}" y="${y+aa*0.6+4}" ${dt}>t=${t}</text>`;
  } else if(shape==='plate'||shape==='chequer'){ const {s,ox,oy}=scaleBox(160,40); const x=ox,y=H/2-20;
    body=`<rect x="${x}" y="${y}" width="${160*s}" height="${40*s}" ${A}/>${shape==='chequer'?`<path d="M${x} ${y+8} l160 0 M${x} ${y+16} l160 0" stroke="#1E232B" stroke-width="0.5" opacity="0.4"/>`:''}
      <text x="${x+80*s}" y="${y-8}" text-anchor="middle" ${lt}>W=${dm.W||'—'}</text><text x="${x+80*s}" y="${y+40*s+16}" text-anchor="middle" ${dt}>t=${dm.t||'—'}</text>`;
  } else if(shape==='round'){ const {s}=scaleBox(80,80); const cx=W/2,cy=H/2,R=40*s;
    body=`<circle cx="${cx}" cy="${cy}" r="${R}" ${A}/><line x1="${cx-R}" y1="${cy}" x2="${cx+R}" y2="${cy}" ${dim}/><text x="${cx}" y="${cy-6}" text-anchor="middle" ${lt}>Ø=${dm.D||'—'}</text>`;
  } else if(shape==='square'){ const {s,ox,oy}=scaleBox(70,70); const x=ox,y=oy,aa=70*s;
    body=`<rect x="${x}" y="${y}" width="${aa}" height="${aa}" ${A}/><text x="${x+aa/2}" y="${y-8}" text-anchor="middle" ${lt}>a=${dm.a||'—'}</text>`;
  } else if(shape==='flat'){ const {s,ox,oy}=scaleBox(120,24); const x=ox,y=H/2-12;
    body=`<rect x="${x}" y="${y}" width="${120*s}" height="${24*s}" ${A}/><text x="${x+60*s}" y="${y-8}" text-anchor="middle" ${lt}>b=${dm.a||'—'}</text><text x="${x+60*s}" y="${y+24*s+16}" text-anchor="middle" ${dt}>t=${dm.b||'—'}</text>`;
  } else if(shape==='hex'){ const {s}=scaleBox(70,70); const cx=W/2,cy=H/2,R=35*s;
    const pts=[]; for(let i=0;i<6;i++){const ang=Math.PI/6+i*Math.PI/3; pts.push(P(cx+R*Math.cos(ang),cy+R*Math.sin(ang)));}
    body=`<polygon points="${pts.join(' ')}" ${A}/><text x="${cx}" y="${cy+4}" text-anchor="middle" ${lt}>AF=${dm.s||'—'}</text>`;
  }
  return `<svg viewBox="0 0 ${W} ${H}" width="100%" style="max-width:${W}px" xmlns="http://www.w3.org/2000/svg"><rect width="${W}" height="${H}" fill="#fbfcfd" rx="6"/>${body}</svg>`;
}

const TWC_MAT={ steel:{n:'Steel (mild / S235)',d:7850}, stainless:{n:'Stainless steel (304)',d:8000},
  castiron:{n:'Cast iron',d:7200}, aluminium:{n:'Aluminium',d:2700}, brass:{n:'Brass',d:8500}, copper:{n:'Copper',d:8960} };
const TWC_SHAPES={
  plate:{name:'Steel sheet / plate',diag:'plate',fields:[['t','Thickness, t','mm',1],['W','Width, W','mm',1000],['L','Length, L','mm',2000]],area:v=>v.t*v.W},
  chequer:{name:'Chequer / tread plate',diag:'plate',fields:[['t','Base thickness, t','mm',5],['W','Width, W','mm',1250],['L','Length, L','mm',2500],['p','Pattern add','kg/m²',2.5]],area:v=>v.t*v.W,chequer:true},
  pipec:{name:'Seamless pipe / circular hollow',diag:'pipe',fields:[['D','Outside diameter, D','mm',60],['t','Wall thickness, t','mm',3],['L','Length, L','mm',6000]],area:v=>Math.PI/4*(v.D*v.D-Math.pow(Math.max(0,v.D-2*v.t),2))},
  shs:{name:'Hollow section — square (SHS)',diag:'shs',fields:[['A','Outside size, a','mm',50],['t','Wall thickness, t','mm',2.5],['L','Length, L','mm',6000]],area:v=>v.A*v.A-Math.pow(Math.max(0,v.A-2*v.t),2)},
  rhs:{name:'Hollow section — rectangular (RHS)',diag:'rhs',fields:[['H','Height, h','mm',60],['B','Width, b','mm',40],['t','Wall thickness, t','mm',3],['L','Length, L','mm',6000]],area:v=>v.H*v.B-Math.max(0,v.H-2*v.t)*Math.max(0,v.B-2*v.t)},
  round:{name:'Round bar',diag:'round',fields:[['D','Diameter, D','mm',20],['L','Length, L','mm',6000]],area:v=>Math.PI/4*v.D*v.D},
  square:{name:'Square bar',diag:'square',fields:[['a','Side, a','mm',20],['L','Length, L','mm',6000]],area:v=>v.a*v.a},
  flat:{name:'Flat bar',diag:'flat',fields:[['a','Width, b','mm',40],['b','Thickness, t','mm',6],['L','Length, L','mm',6000]],area:v=>v.a*v.b},
  hex:{name:'Hexagonal bar',diag:'hex',fields:[['s','Across flats, s','mm',20],['L','Length, L','mm',6000]],area:v=>Math.sqrt(3)/2*v.s*v.s},
  eangle:{name:'Equal angle',diag:'angle',fields:[['a','Leg, a','mm',50],['t','Thickness, t','mm',5],['L','Length, L','mm',6000]],area:v=>v.t*(2*v.a-v.t)},
  uangle:{name:'Unequal angle',diag:'angle',fields:[['a','Long leg, a','mm',75],['b','Short leg, b','mm',50],['t','Thickness, t','mm',6],['L','Length, L','mm',6000]],area:v=>v.t*(v.a+v.b-v.t)},
};
const TWC_PROFILES={
  upn:{name:'Channel — UPN (DIN 1026)',std:'DIN 1026',data:{'50':5.59,'65':7.09,'80':8.64,'100':10.6,'120':13.4,'140':16.0,'160':18.8,'180':22.0,'200':25.3,'220':29.4,'240':33.2,'260':37.9,'280':41.8,'300':46.2,'320':59.5,'350':60.6,'380':63.1,'400':71.8}},
  ipn:{name:'Beam — IPN (DIN 1025-1)',std:'DIN 1025-1',data:{'80':5.94,'100':8.34,'120':11.1,'140':14.3,'160':17.9,'180':21.9,'200':26.2,'220':31.1,'240':36.2,'260':41.9,'280':47.9,'300':54.2,'320':61.0,'340':68.0,'360':76.1,'380':84.0,'400':92.4,'450':115,'500':141,'550':166,'600':199}},
  ipe:{name:'Beam — IPE (EN 10365)',std:'EN 10365',data:{'80':6.0,'100':8.1,'120':10.4,'140':12.9,'160':15.8,'180':18.8,'200':22.4,'220':26.2,'240':30.7,'270':36.1,'300':42.2,'330':49.1,'360':57.1,'400':66.3,'450':77.6,'500':90.7,'550':106,'600':122}},
  hea:{name:'Beam — HEA / IPBL (DIN 1025-3)',std:'DIN 1025-3',data:{'100':16.7,'120':19.9,'140':24.7,'160':30.4,'180':35.5,'200':42.3,'220':50.5,'240':60.3,'260':68.2,'280':76.4,'300':88.3,'320':97.6,'340':105,'360':112,'400':125,'450':140,'500':155,'550':166,'600':178}},
  heb:{name:'Beam — HEB / IPB (DIN 1025-2)',std:'DIN 1025-2',data:{'100':20.4,'120':26.7,'140':33.7,'160':42.6,'180':51.2,'200':61.3,'220':71.5,'240':83.2,'260':93.0,'280':103,'300':117,'320':127,'340':134,'360':142,'400':155,'450':171,'500':187,'550':199,'600':212}},
};
function twcDiag(k){ const s='stroke="currentColor" fill="none" stroke-width="1.6"'; const f='fill="currentColor" opacity="0.12"';
  const M={
   plate:`<polygon points="20,55 95,55 120,35 45,35" ${f}/><polygon points="20,55 95,55 95,68 20,68" ${f}/><polygon points="95,55 120,35 120,48 95,68" ${f}/><polygon points="20,55 95,55 120,35 45,35" ${s}/><polyline points="95,55 95,68 20,68 20,55" ${s}/><polyline points="95,68 120,48 120,35" ${s}/>`,
   pipe:`<circle cx="65" cy="52" r="30" ${s}/><circle cx="65" cy="52" r="20" ${s}/><circle cx="65" cy="52" r="30" ${f}/>`,
   round:`<circle cx="65" cy="52" r="30" ${s}/><circle cx="65" cy="52" r="30" ${f}/>`,
   square:`<rect x="35" y="22" width="60" height="60" ${s}/><rect x="35" y="22" width="60" height="60" ${f}/>`,
   shs:`<rect x="33" y="20" width="64" height="64" ${s}/><rect x="43" y="30" width="44" height="44" ${s}/><rect x="33" y="20" width="64" height="64" ${f}/>`,
   rhs:`<rect x="25" y="28" width="80" height="48" ${s}/><rect x="34" y="37" width="62" height="30" ${s}/><rect x="25" y="28" width="80" height="48" ${f}/>`,
   flat:`<rect x="20" y="44" width="90" height="16" ${s}/><rect x="20" y="44" width="90" height="16" ${f}/>`,
   hex:`<polygon points="65,22 95,39 95,73 65,90 35,73 35,39" ${s}/><polygon points="65,22 95,39 95,73 65,90 35,73 35,39" ${f}/>`,
   angle:`<polygon points="35,20 50,20 50,70 100,70 100,84 35,84" ${s}/><polygon points="35,20 50,20 50,70 100,70 100,84 35,84" ${f}/>`,
   profile:`<path d="M35 22 H95 V32 H70 V72 H95 V82 H35 V72 H60 V32 H35 Z" ${s}/><path d="M35 22 H95 V32 H70 V72 H95 V82 H35 V72 H60 V32 H35 Z" ${f}/>`
  };
  return `<svg viewBox="0 0 130 104" width="128" height="104" xmlns="http://www.w3.org/2000/svg">${M[k]||M.square}</svg>`; }
function twcW(x){return nfmt(x, x<1?3:2);}
/* grouped <optgroup> options for the section family picker */
function sectGroupedOptions(sel){ return SECT_GROUPS.map(([label,keys])=>
  `<optgroup label="${esc(label)}">${keys.map(k=>`<option value="${k}" ${sel===k?'selected':''}>${esc(SECT[k].family)}</option>`).join('')}</optgroup>`).join(''); }
/* shared weight engine used by both Steel Weight Calculator and Product Calculator */
function twcWeightOf(typeKey,vals,material){
  const rho=(TWC_MAT[material]||TWC_MAT.steel).d;
  if(TWC_PROFILES[typeKey]){ const base=TWC_PROFILES[typeKey].data[vals.size]||0; const perM=base*(rho/7850);
    const Lm=vals.L||0; return {perM,piece:perM*Lm,Lm}; }
  const sh=TWC_SHAPES[typeKey]; if(!sh)return {perM:0,piece:0,Lm:0};
  const a=Math.max(0,sh.area(vals)); const Lmm=vals.L||0;
  let perM=a*1e-6*rho, piece=a*1e-9*rho*Lmm;
  if(sh.chequer){ perM = a*1e-6*rho + (vals.p||0)*((vals.W||0)/1000); piece += (vals.p||0)*((vals.W||0)*Lmm*1e-6); }
  return {perM,piece,Lm:Lmm/1000};
}
function twcDesc(typeKey,v){
  if(TWC_PROFILES[typeKey]) return typeKey.toUpperCase()+' '+v.size+' — L '+nfmt(v.L,3)+' m';
  const nm={plate:'Plate',chequer:'Chequer plate',pipec:'Pipe',shs:'SHS',rhs:'RHS',round:'Round bar',square:'Square bar',flat:'Flat bar',hex:'Hex bar',eangle:'Equal angle',uangle:'Unequal angle'}[typeKey]||typeKey;
  let d='';
  if(typeKey==='plate'||typeKey==='chequer')d=`${v.t}×${v.W}×${v.L} mm`;
  else if(typeKey==='pipec')d=`Ø${v.D}×${v.t}, L ${v.L} mm`;
  else if(typeKey==='shs')d=`${v.A}×${v.A}×${v.t}, L ${v.L} mm`;
  else if(typeKey==='rhs')d=`${v.H}×${v.B}×${v.t}, L ${v.L} mm`;
  else if(typeKey==='round')d=`Ø${v.D}, L ${v.L} mm`;
  else if(typeKey==='square')d=`${v.a}×${v.a}, L ${v.L} mm`;
  else if(typeKey==='flat')d=`${v.a}×${v.b}, L ${v.L} mm`;
  else if(typeKey==='hex')d=`AF ${v.s}, L ${v.L} mm`;
  else if(typeKey==='eangle')d=`${v.a}×${v.a}×${v.t}, L ${v.L} mm`;
  else if(typeKey==='uangle')d=`${v.a}×${v.b}×${v.t}, L ${v.L} mm`;
  return nm+' '+d;
}
function fieldRow(id,label,unit,value,handler,ro){ return `<div class="field" style="display:grid;grid-template-columns:180px 1fr 54px;align-items:center;gap:12px;margin-bottom:9px">
  <label style="margin:0">${label}</label>
  <input class="inp mono" id="${id}" ${ro?'readonly style="background:#f7f8fa"':`type="number" min="0" step="0.001" value="${value}" oninput="${handler}"`}>
  <span class="sub" style="font-weight:600">${unit}</span></div>`; }

/* ======================================================================
   1D NESTING ENGINE — cutting stock
   First-Fit-Decreasing seeded, refined with Best-Fit placement, kerf per
   cut, minimum usable off-cut, and optional reusable off-cut stock used
   before new full bars. Returns bar-by-bar cutting maps + utilization.
   ==================================================================== */
function nest1D(cuts, stockLens, opt){
  // cuts: [{len,qty,label}]  stockLens: [{len,qty|Infinity,offcut?:true}]  opt:{kerf,minOffcut}
  const kerf=Math.max(0,(opt&&opt.kerf)||0), minOff=Math.max(0,(opt&&opt.minOffcut)||0);
  const pieces=[]; for(const c of cuts){ for(let i=0;i<c.qty;i++) pieces.push({len:c.len,label:c.label}); }
  pieces.sort((a,b)=>b.len-a.len);
  // stock pool: offcuts first (shortest-first so big bars are preserved), then full bars
  const pool=[];
  stockLens.forEach((s,si)=>{ const q=(s.qty===Infinity||s.qty==null)?Infinity:s.qty;
    pool.push({len:s.len,qty:q,offcut:!!s.offcut,si}); });
  pool.sort((a,b)=>(b.offcut-a.offcut)||(a.len-b.len));
  const bars=[]; const impossible=[];
  const maxLen=Math.max(...pool.map(p=>p.len),0);
  for(const pc of pieces){
    if(pc.len>maxLen+1e-9){ impossible.push(pc); continue; }
    // BEST-FIT among open bars: smallest remaining that still fits (tightest)
    let best=null,bestRem=Infinity;
    for(const b of bars){ const need=pc.len+(b.cuts.length?kerf:0);
      if(b.rem>=need-1e-9 && b.rem-need<bestRem){ best=b; bestRem=b.rem-need; } }
    if(best){ const need=pc.len+(best.cuts.length?kerf:0); best.cuts.push(pc); best.rem-=need; continue; }
    // open a new bar: tightest stock length that fits (prefer offcuts, already ordered)
    let src=null;
    for(const p of pool){ if(p.qty>0 && p.len>=pc.len-1e-9){ if(!src||p.offcut&&!src.offcut||((p.offcut===src.offcut)&&p.len<src.len)) src=p; } }
    if(!src){ impossible.push(pc); continue; }
    if(src.qty!==Infinity)src.qty--;
    bars.push({stockLen:src.len,offcut:src.offcut,rem:src.len-pc.len,cuts:[pc]});
  }
  // post-pass: try to merge the emptiest bar's cuts into others (simple improvement)
  bars.sort((a,b)=>a.cuts.reduce((s,c)=>s+c.len,0)-b.cuts.reduce((s,c)=>s+c.len,0));
  for(let bi=0;bi<bars.length;bi++){ const b=bars[bi]; if(b.offcut)continue;
    const movable=b.cuts.slice(); let allMoved=true; const moves=[];
    for(const pc of movable){ let tgt=null,tRem=Infinity;
      for(let j=0;j<bars.length;j++){ if(j===bi)continue; const o=bars[j];
        const need=pc.len+(o.cuts.length?kerf:0);
        if(o.rem>=need-1e-9&&o.rem-need<tRem){tgt=o;tRem=o.rem-need;} }
      if(tgt){ moves.push([pc,tgt]); tgt.rem-=pc.len+(tgt.cuts.length?kerf:0); tgt.cuts.push(pc); }
      else { allMoved=false; for(const [mp,mt] of moves){ mt.cuts.pop(); mt.rem+=mp.len+(mt.cuts.length?kerf:0);} moves.length=0; break; } }
    if(allMoved&&movable.length){ bars.splice(bi,1); bi--; } }
  // refinement: iteratively take the K emptiest new bars and repack their pieces via FFD;
  // if they fit in fewer bars, accept. Repeat until no improvement.
  function repack(){
    const idx=bars.map((b,i)=>({i,fill:b.cuts.reduce((s,c)=>s+c.len,0)/b.stockLen,off:b.offcut}))
      .filter(x=>!x.off).sort((a,b)=>a.fill-b.fill);
    for(let K=2;K<=Math.min(6,idx.length);K++){
      const pickIdx=idx.slice(0,K).map(x=>x.i);
      const picked=pickIdx.map(i=>bars[i]);
      const pcs=[]; picked.forEach(b=>pcs.push(...b.cuts)); pcs.sort((a,b)=>b.len-a.len);
      const lens=picked.map(b=>b.stockLen).sort((a,b)=>b-a);
      const trial=[];
      let ok=true;
      for(const pc of pcs){ let t=null,tr=Infinity;
        for(const tb of trial){ const need=pc.len+(tb.cuts.length?kerf:0);
          if(tb.rem>=need-1e-9&&tb.rem-need<tr){t=tb;tr=tb.rem-need;} }
        if(t){ t.rem-=pc.len+(t.cuts.length?kerf:0); t.cuts.push(pc); }
        else if(trial.length<lens.length-1){ const L=lens[trial.length]; if(pc.len<=L+1e-9){trial.push({stockLen:L,offcut:false,rem:L-pc.len,cuts:[pc]});} else {ok=false;break;} }
        else {ok=false;break;} }
      if(ok&&trial.length<picked.length){
        pickIdx.sort((a,b)=>b-a).forEach(i=>bars.splice(i,1));
        bars.push(...trial); return true; }
    }
    return false;
  }
  let guard=0; while(repack()&&guard++<50){}
  bars.sort((a,b)=>b.stockLen-a.stockLen||b.cuts.length-a.cuts.length);
  const used=bars.reduce((s,b)=>s+b.stockLen,0);
  const cutSum=bars.reduce((s,b)=>s+b.cuts.reduce((x,c)=>x+c.len,0),0);
  const newBars=bars.filter(b=>!b.offcut);
  const usable=bars.filter(b=>b.rem>=minOff-1e-9&&b.rem>0.0005).map(b=>b.rem);
  return { bars, impossible,
    totalStockLen:used, totalCutLen:cutSum,
    utilization: used>0?cutSum/used:0,
    wasteLen: used-cutSum,
    newBarCount:newBars.length, offcutBarCount:bars.length-newBars.length,
    usableOffcuts:usable };
}
const Tools={ _type:'shs',_mat:'steel',_sel:{},
  render(){ const S=SECT[this._type];
    const matSel=`<select class="sel" id="twc_mat" onchange="Tools.setMat(this.value)">${Object.keys(TWC_MAT).map(k=>`<option value="${k}" ${this._mat===k?'selected':''}>${esc(TWC_MAT[k].n)} · ${TWC_MAT[k].d} kg/m³</option>`).join('')}</select>`;
    const famSel=`<select class="sel" id="twc_type" onchange="Tools.pick(this.value)">${sectGroupedOptions(this._type)}</select>`;
    return `<div class="view-head"><div><div class="eyebrow">Tools</div><h1 class="h1">Steel Weight Calculator</h1></div>
        <div class="head-actions"><button class="btn btn-ghost" onclick="App.go('market')">${ic('grid')}Browse Market Sections</button></div></div>
      <div class="grid" style="grid-template-columns:1.15fr 1fr;align-items:start;gap:22px">
        <div>
          <div class="card"><div class="card-head"><div class="card-title">Choose section</div></div>
            <div class="card-body">
              <div class="field" style="display:grid;grid-template-columns:150px 1fr;align-items:center;gap:12px;margin-bottom:10px"><label style="margin:0">Family</label>${famSel}</div>
              <div class="field" style="display:grid;grid-template-columns:150px 1fr;align-items:center;gap:12px;margin-bottom:10px"><label style="margin:0">Material</label>${matSel}</div>
              <div id="twc_form"></div>
              <div class="field" style="display:grid;grid-template-columns:150px 1fr;align-items:center;gap:12px;margin-top:4px"><label style="margin:0">Number of pieces</label><input class="inp mono" id="twc_pcs" type="number" min="1" step="1" value="1" oninput="Tools.calc()"></div>
              <div class="field" style="display:grid;grid-template-columns:150px 1fr 40px;align-items:center;gap:12px;margin-top:4px"><label style="margin:0">Tonnage rate</label><input class="inp mono" id="twc_rate" type="number" min="0" step="0.01" value="0" oninput="Tools.calc()" placeholder="0.00"><span class="sub">AED/Ton</span></div>
            </div></div>
          <div class="card" style="margin-top:16px"><div class="card-head"><div class="card-title">Result</div><span class="card-title muted" id="twc_note"></span></div>
            <div class="card-body"><div class="kpis" style="grid-template-columns:repeat(auto-fit,minmax(135px,1fr));margin:0" id="twc_result"></div></div></div>
        </div>
        <div class="card"><div class="card-head"><div class="card-title">Cross-section &amp; dimensions</div></div>
          <div class="card-body"><div id="twc_sketch" style="display:grid;place-items:center;min-height:220px"></div>
          <div id="twc_dims" class="sub" style="margin-top:10px;line-height:1.8"></div>
          <div class="note info" style="margin-top:14px">Weight = cross-section × length × density. Rolled beams &amp; channels (IPE/IPN/HE/UB/UC/UPN/PFC) use published nominal mass per metre. Hollow &amp; angle weights are the standard tabulated values. Density scales with the chosen material.</div>
          </div></div>
      </div>`;
  },
  after(){ this.fields(); this.calc(); },
  pick(k){ this._type=k; this._sel={}; App.render(); },
  setMat(m){ this._mat=m; this.calc(); },
  fields(){ const t=this._type; const S=SECT[t]; const c=$('#twc_form'); if(!c)return; let h='';
    if(S.kind==='geo'){ h=S.fields.map(f=>`<div class="field" style="display:grid;grid-template-columns:150px 1fr 40px;align-items:center;gap:12px;margin-bottom:9px"><label style="margin:0">${esc(f[1])}</label><input class="inp mono" id="twc_${f[0]}" type="number" min="0" step="0.001" value="${f[3]}" oninput="Tools.calc()"><span class="sub">${f[2]}</span></div>`).join('');
    } else if(S.kind==='shs'||S.kind==='rhs'){ const sizes=sectSizes(t); const s0=sizes[0]; const thks=sectThk(t,s0);
      h=`<div class="field" style="display:grid;grid-template-columns:150px 1fr;align-items:center;gap:12px;margin-bottom:9px"><label style="margin:0">Size (${S.kind==='shs'?'a×a':'h×b'})</label><select class="sel" id="twc_size" onchange="Tools.sizeChange()">${sizes.map(s=>`<option value="${s}">${s} mm</option>`).join('')}</select></div>
        <div class="field" style="display:grid;grid-template-columns:150px 1fr;align-items:center;gap:12px;margin-bottom:9px"><label style="margin:0">Wall thickness, t</label><select class="sel" id="twc_t" onchange="Tools.calc()">${thks.map(x=>`<option value="${x}">${x} mm</option>`).join('')}</select></div>
        ${this.lenRow()}`;
    } else { const sizes=sectSizes(t);
      h=`<div class="field" style="display:grid;grid-template-columns:150px 1fr;align-items:center;gap:12px;margin-bottom:9px"><label style="margin:0">Designation</label><select class="sel" id="twc_size" onchange="Tools.calc()">${sizes.map(s=>`<option value="${s}">${t.toUpperCase()} ${s}</option>`).join('')}</select></div>${this.lenRow()}`; }
    c.innerHTML=h; },
  lenRow(){ return `<div class="field" style="display:grid;grid-template-columns:150px 1fr;align-items:center;gap:12px;margin-bottom:9px"><label style="margin:0">Length</label>
    <div style="display:flex;gap:8px"><select class="sel" id="twc_Lpreset" style="max-width:110px" onchange="Tools.lenPreset(this.value)"><option value="6">6 m</option><option value="12">12 m</option><option value="custom">Custom…</option></select>
    <input class="inp mono" id="twc_L" type="number" min="0" step="0.001" value="6" oninput="Tools.calc()" readonly style="background:#f7f8fa"></div></div>`; },
  lenPreset(v){ const inp=$('#twc_L'); if(!inp)return; if(v==='custom'){ inp.readOnly=false; inp.style.background=''; inp.focus(); } else { inp.value=v; inp.readOnly=true; inp.style.background='#f7f8fa'; this.calc(); } },
  sizeChange(){ const t=this._type; const size=val('twc_size'); const thks=sectThk(t,size); const sel=$('#twc_t');
    if(sel) sel.innerHTML=thks.map(x=>`<option value="${x}">${x} mm</option>`).join(''); this.calc(); },
  readVals(){ const t=this._type; const S=SECT[t]; const v={};
    if(S.kind==='geo'){ S.fields.forEach(f=>v[f[0]]=numval('twc_'+f[0])); }
    else if(S.kind==='shs'||S.kind==='rhs'){ v.size=val('twc_size'); v.t=+val('twc_t'); v.L=numval('twc_L')||0; }
    else { v.size=val('twc_size'); v.L=numval('twc_L')||0; } return v; },
  calc(){ const t=this._type; const S=SECT[t]; const v=this.readVals();
    const lenM=(S.kind==='geo')?undefined:(v.L||0);
    const r=sectWeight(t,v,this._mat,lenM); const pcs=Math.max(1,Math.round(numval('twc_pcs')||1));
    let dm=null; if(S.kind==='geo'){ dm=Object.assign({shape:S.diag},v); } else { dm=sectDims(t,v); }
    const sk=$('#twc_sketch'); if(sk&&dm) sk.innerHTML=sketchSVG(dm.shape||S.shape||S.diag,dm,{w:270,h:210});
    const dd=$('#twc_dims'); if(dd) dd.innerHTML=PWC.dimText(t,dm,S);
    const totKg=r.piece*pcs; const totTon=totKg/1000; const rate=Math.max(0,numval('twc_rate')||0); const cost=totTon*rate;
    const cards=[];
    if(r.perM>0) cards.push(['k-ink','Weight per metre',twcW(r.perM)+' <span style="font-size:14px">kg/m</span>']);
    cards.push(['k-red','Single piece',twcW(r.piece)+' <span style="font-size:14px">kg</span>']);
    cards.push(['k-yellow','Total ('+pcs+' pcs)',twcW(totKg)+' <span style="font-size:14px">kg</span>']);
    cards.push(['k-ink','Total tonnage',nfmt(totTon,4)+' <span style="font-size:14px">t</span>']);
    if(rate>0) cards.push(['k-red','Total cost',nfmt(cost,2)+' <span style="font-size:14px">AED</span>']);
    const rr=$('#twc_result'); if(rr)rr.innerHTML=cards.map(c=>`<div class="kpi ${c[0]}"><div class="kl">${c[1]}</div><div class="kv">${c[2]}</div></div>`).join('');
    const n=$('#twc_note'); if(n)n.textContent=(S.std&&S.std!=='—'?S.std+' · ':'')+(TWC_MAT[this._mat]||TWC_MAT.steel).d+' kg/m³'+(rate>0?' · '+nfmt(rate,2)+' AED/Ton':'');
  }
};

/* ======================================================================
   TOOLS — MARKET SECTIONS  (browse-only catalogue; no engineering analysis)
   ==================================================================== */
const Market={ _fam:'shs', _q:'', _len:6,
  render(){
    const famBtns=SECT_GROUPS.map(([label,keys])=>`<div class="mkt-grp"><div class="nav-group" style="padding:8px 4px 4px">${esc(label)}</div>${keys.map(k=>`<button class="btn ${this._fam===k?'btn-primary':''}" style="width:100%;justify-content:flex-start;margin-bottom:5px;text-align:left;font-size:12.5px" onclick="Market.setFam('${k}')">${esc(SECT[k].family)}</button>`).join('')}</div>`).join('');
    return `<div class="view-head"><div><div class="eyebrow">Tools</div><h1 class="h1">Market Sections</h1></div>
      <div class="head-actions">
        <div class="seg"><span class="sub" style="margin-right:8px">Stock length</span>
          <button class="btn btn-sm ${this._len===6?'btn-primary':''}" onclick="Market.setLen(6)">6 m</button>
          <button class="btn btn-sm ${this._len===12?'btn-primary':''}" onclick="Market.setLen(12)">12 m</button></div>
      </div></div>
      <div class="note info" style="margin-bottom:14px">A browse-only catalogue of standard steel sections available in the market — shape, outer size, thickness, width and length only. Pick any size to send it straight into the Product Calculator.</div>
      <div class="grid" style="grid-template-columns:240px 1fr;align-items:start;gap:20px">
        <div class="card"><div class="card-head"><div class="card-title">Families</div></div>
          <div class="card-body" style="max-height:74vh;overflow:auto;padding-top:6px">${famBtns}</div></div>
        <div>
          <div class="card" style="margin-bottom:14px"><div class="card-body" style="padding:12px">
            <div style="position:relative"><span style="position:absolute;left:12px;top:50%;transform:translateY(-50%);color:var(--muted)">${ic('search')}</span>
            <input class="inp" id="mkt_q" placeholder="Search size… e.g. 100x50, 200, 6&quot;" value="${esc(this._q)}" oninput="Market.search(this.value)" style="padding-left:38px"></div>
          </div></div>
          <div id="mkt_list"></div>
        </div>
      </div>`;
  },
  after(){ this.list(); },
  setFam(k){ this._fam=k; this._q=''; App.render(); },
  setLen(n){ this._len=n; App.render(); },
  search(v){ this._q=v; this.list(); },
  list(){ const el=$('#mkt_list'); if(!el)return; const t=this._fam; const S=SECT[t]; const q=(this._q||'').toLowerCase().trim();
    let items=[];
    if(S.kind==='geo'){ // bars & plate: single card explaining custom dimensions
      const dm=Object.assign({shape:S.diag}, Object.fromEntries(S.fields.map(f=>[f[0],f[3]])));
      el.innerHTML=`<div class="card"><div class="card-body" style="display:grid;grid-template-columns:280px 1fr;gap:20px;align-items:center">
        <div>${sketchSVG(S.diag,dm,{w:270,h:200})}</div>
        <div><div class="eyebrow">${esc(S.family)}</div>
          <p class="sub" style="margin:8px 0 14px">${esc(S.family)} is made to order — set the exact ${S.fields.map(f=>f[1].split(',')[0].toLowerCase()).join(', ')} in the Product Calculator.</p>
          <button class="btn btn-primary" onclick="Market.toCalc('${t}',null)">${ic('layers')}Open in Product Calculator</button>
        </div></div></div>`;
      return; }
    // hollow: expand size×thickness ; profiles: each designation
    if(S.kind==='shs'||S.kind==='rhs'){ for(const size of sectSizes(t)){ for(const th of sectThk(t,size)){
      const dm=sectDims(t,{size,t:th}); const lbl=S.kind==='shs'?`${size}×${size}×${th}`:`${size}×${th}`;
      if(q && !(lbl.toLowerCase().includes(q)||size.toLowerCase().includes(q))) continue;
      items.push({key:{size,t:th},dm,title:(S.kind==='shs'?'SHS ':'RHS ')+lbl,
        specs:[['Outer',S.kind==='shs'?`${dm.h}×${dm.b} mm`:`${dm.h}×${dm.b} mm`],['Wall t',`${dm.t} mm`],['Length',`${this._len} m`]]}); } } }
    else if(S.kind==='chs'){ for(const size of sectSizes(t)){ const dm=sectDims(t,{size});
      const lbl=`${dm.label} (Ø${dm.od})`;
      if(q && !(lbl.toLowerCase().includes(q)||String(dm.od).includes(q)||size.includes(q))) continue;
      items.push({key:{size},dm,title:`Pipe ${dm.label}`,specs:[['Outside Ø',`${dm.od} mm`],['Wall t',`${dm.wall} mm`],['Length',`${this._len} m`]]}); } }
    else { for(const size of sectSizes(t)){ const dm=sectDims(t,{size});
      if(q && !size.toLowerCase().includes(q)) continue;
      const sp=[]; if(dm.h){sp.push(['Depth h',`${dm.h} mm`]);} if(dm.b){sp.push(['Width b',`${dm.b} mm`]);}
      if(dm.tw)sp.push(['Web tw',`${dm.tw} mm`]); if(dm.tf)sp.push(['Flange tf',`${dm.tf} mm`]);
      if(dm.a&&!dm.h)sp.push(['Leg a',`${dm.a} mm`]); if(dm.t)sp.push(['Thick t',`${dm.t} mm`]);
      sp.push(['Length',`${this._len} m`]);
      items.push({key:{size},dm,title:`${t.toUpperCase()} ${size}`,specs:sp}); } }
    if(!items.length){ el.innerHTML=`<div class="card"><div class="card-body"><div class="empty" style="padding:24px">No sizes match “${esc(this._q)}”.</div></div></div>`; return; }
    const shape=(S.shape||S.diag);
    el.innerHTML=`<div class="mkt-grid">${items.map(it=>`
      <div class="card mkt-card"><div class="card-body" style="padding:12px">
        <div style="display:grid;place-items:center;background:#fbfcfd;border-radius:8px;padding:6px;margin-bottom:10px">${sketchSVG(it.dm.shape||shape,it.dm,{w:220,h:150})}</div>
        <div style="font-weight:700;font-size:13.5px;margin-bottom:2px">${esc(it.title)}</div>
        <div class="chip" style="margin-bottom:8px">${esc(S.std&&S.std!=='—'?S.std:'standard')}</div>
        <table class="mkt-spec">${it.specs.map(s=>`<tr><td class="sub">${esc(s[0])}</td><td class="mono" style="text-align:right">${esc(s[1])}</td></tr>`).join('')}</table>
        <button class="btn btn-sm btn-primary" style="width:100%;margin-top:10px" onclick='Market.toCalc("${t}",${JSON.stringify(it.key)})'>${ic('plus')}Add to Product Calc</button>
      </div></div>`).join('')}</div>`;
  },
  toCalc(typeKey,key){ // hand a chosen section to the Product Calculator's Add-Section dialog
    Market._pending={typeKey,key,len:this._len};
    if(!PWC._id && !(PWC._lines&&PWC._lines.length) && !PWC._name){ PWC._init(); }
    PWC._keep=true; App.go('prodcalc-new');
    setTimeout(()=>Market._applyPending(),80);
  },
  _applyPending(){ const p=Market._pending; if(!p)return; Market._pending=null;
    PWC.lineEditor(null); // open dialog
    setTimeout(()=>{ // set family, size, thickness, length in the open dialog
      const ty=$('#le_type'); if(ty){ ty.value=p.typeKey; PWC.leType(p.typeKey); }
      setTimeout(()=>{
        if(p.key){ const sz=$('#le_size'); if(sz&&p.key.size!=null){ sz.value=p.key.size; if(SECT[p.typeKey].kind==='shs'||SECT[p.typeKey].kind==='rhs')PWC.leSizeChange(); }
          if(p.key.t!=null){ const tt=$('#le_t'); if(tt)tt.value=p.key.t; } }
        const lp=$('#le_Lpreset'); const li=$('#le_L'); if(lp&&li&&[6,12].includes(p.len)){ lp.value=String(p.len); li.value=p.len; }
        PWC.leCalc();
      },40);
    },40);
  }
};
function twcTypeOptions(sel){ const g=Object.keys(TWC_SHAPES).map(k=>`<option value="${k}" ${sel===k?'selected':''}>${esc(TWC_SHAPES[k].name)}</option>`).join('');
  const p=Object.keys(TWC_PROFILES).map(k=>`<option value="${k}" ${sel===k?'selected':''}>${esc(TWC_PROFILES[k].name)}</option>`).join('');
  return `<optgroup label="Plates, bars, hollow &amp; angles">${g}</optgroup><optgroup label="Rolled channels &amp; beams">${p}</optgroup>`; }
/* cost-centre categories for non-steel (zero-weight) line items */
/* ===== INLINED ENGINES: manual geometry + 2D plate nesting + verification ===== */
/* ======================================================================
   AMBS ENGINES — manual section geometry + 2D plate nesting
   Pure functions, no DOM. Unit-tested before UI integration.
   Density: 7850 kg/m³  (0.00785 kg per mm²·m ; 0.00000785 kg per mm³)
   ==================================================================== */

/* ---------- MANUAL SECTION GEOMETRY ----------
   Returns {kgm, area_mm2, ok, err}. Dimensions in mm. */
function manualSHS(B, T){
  B=+B; T=+T;
  if(!(T>0)) return {ok:false,err:'Thickness must be greater than 0'};
  if(!(T < B/2)) return {ok:false,err:'Thickness must be less than half of outside size'};
  const inner=B-2*T; if(!(inner>0)) return {ok:false,err:'Inner size cannot be zero or negative'};
  const A=B*B-inner*inner;               // mm²
  return {ok:true, area_mm2:A, kgm:A*0.00785};
}
function manualRHS(W, H, T){
  W=+W; H=+H; T=+T;
  if(!(T>0)) return {ok:false,err:'Thickness must be greater than 0'};
  const smaller=Math.min(W,H);
  if(!(T < smaller/2)) return {ok:false,err:'Thickness must be less than half of the smaller side'};
  const iw=W-2*T, ih=H-2*T;
  if(!(iw>0&&ih>0)) return {ok:false,err:'Inner width and inner height cannot be zero or negative'};
  const A=W*H-iw*ih;
  return {ok:true, area_mm2:A, kgm:A*0.00785};
}
function manualCHS(OD, T){
  OD=+OD; T=+T;
  if(!(T>0)) return {ok:false,err:'Thickness must be greater than 0'};
  if(!(T < OD/2)) return {ok:false,err:'Thickness must be less than half of outside diameter'};
  const ID=OD-2*T; if(!(ID>0)) return {ok:false,err:'Inside diameter cannot be zero or negative'};
  const A=Math.PI/4*(OD*OD-ID*ID);
  return {ok:true, area_mm2:A, kgm:A*0.00785, id:ID};
}
/* Plate weight from mm dims → kg (single piece) */
function plateWeightKg(L_mm,W_mm,T_mm){ return L_mm*W_mm*T_mm*0.00000785; }
function plateKgM2(T_mm){ return T_mm*7.85; } // kg per m² for given thickness

/* ===== 2D PLATE NESTING ENGINE v2 (rotation + guillotine + strict verify) ===== */
const PLATE_DENSITY = 0.00000785;

/* rotation legality: can this part be rotated 90° under the mode? */
function canRotate(mode){
  // auto & rot90 allow rotation; lock & grain do NOT
  return mode==='auto' || mode==='rot90';
}

/* place one rectangle (fw×fh incl. kerf) at a free rect corner, return score for strategy */
function fitScore(fr, fw, fh, strat){
  const leftoverW = fr.w - fw, leftoverH = fr.h - fh;
  if(strat==='BAF')  return fr.w*fr.h - fw*fh;                 // best area fit
  if(strat==='BSSF') return Math.min(leftoverW, leftoverH);    // best short side fit
  if(strat==='BLSF') return Math.max(leftoverW, leftoverH);    // best long side fit
  if(strat==='GUIL') return leftoverW*fr.h + leftoverH*fw;     // guillotine: minimize split remnants
  if(strat==='SHELF')return fr.y*1e6 + fr.x;                   // shelf: fill rows top-left
  return fr.w*fr.h - fw*fh;
}

/* MaxRects: split EVERY free rect that intersects the occupied rect U(ux,uy,uw,uh) */
function placeRectMaxRects(free, ux, uy, uw, uh){
  const out=[];
  for(const F of free){
    // no intersection → keep
    if(ux>=F.x+F.w-1e-9 || ux+uw<=F.x+1e-9 || uy>=F.y+F.h-1e-9 || uy+uh<=F.y+1e-9){ out.push(F); continue; }
    // left slab
    if(ux>F.x+1e-9) out.push({x:F.x,y:F.y,w:ux-F.x,h:F.h});
    // right slab
    if(ux+uw<F.x+F.w-1e-9) out.push({x:ux+uw,y:F.y,w:(F.x+F.w)-(ux+uw),h:F.h});
    // bottom slab
    if(uy>F.y+1e-9) out.push({x:F.x,y:F.y,w:F.w,h:uy-F.y});
    // top slab
    if(uy+uh<F.y+F.h-1e-9) out.push({x:F.x,y:uy+uh,w:F.w,h:(F.y+F.h)-(uy+uh)});
    // F itself dropped
  }
  return out;
}
function pruneFree(free){
  for(let i=0;i<free.length;i++){
    for(let j=0;j<free.length;j++){
      if(i===j) continue; const a=free[i], b=free[j]; if(!a||!b) continue;
      if(a.x>=b.x-1e-6 && a.y>=b.y-1e-6 && a.x+a.w<=b.x+b.w+1e-6 && a.y+a.h<=b.y+b.h+1e-6){ free.splice(i,1); i--; break; }
    }
  }
}

/* pack a list of pieces onto as many identical plates as needed with one strategy.
   pieces: [{id,label,l,w,mode}]  PL,PW usable area (already minus 2*margin)
   returns [{parts:[{id,label,l,w,x,y,rot}]}]  x,y are inside usable area (add margin for absolute) */
/* pack pieces onto identical plates with one strategy.
   Optimized: (1) iterate UNIQUE dimensions, (2) build one plate template then
   replicate it k× while the remaining pool can reproduce the same pattern. */
function packStrategy(pieces, PL, PW, kerf, strat){
  const poolMap=new Map();
  for(const p of pieces){ const key=p.l+'x'+p.w+'x'+p.mode;
    if(!poolMap.has(key)) poolMap.set(key,{key,l:p.l,w:p.w,mode:p.mode,ids:[]});
    poolMap.get(key).ids.push({id:p.id,label:p.label}); }
  const pool=poolMap; // key → {l,w,mode,ids[]}
  const order=()=>[...pool.values()].filter(pd=>pd.ids.length).sort((a,b)=> Math.max(b.l,b.w)-Math.max(a.l,a.w) || (b.l*b.w)-(a.l*a.w));
  const avail=key=>pool.get(key).ids.length;
  const plates=[]; let guard=0;
  while(guard++<200000){
    const dims=order(); if(!dims.length) break;
    // ---- build one template plate against a virtual count copy ----
    const vcount=new Map(); dims.forEach(pd=>vcount.set(pd.key,pd.ids.length));
    const template={ free:[{x:0,y:0,w:PL,h:PW}], parts:[] }; const used=new Map();
    let placed=true;
    while(placed){ placed=false; let best=null;
      for(const pd of dims){ if((vcount.get(pd.key)||0)<=0) continue;
        const oris=[{l:pd.l,w:pd.w,rot:false}];
        if(canRotate(pd.mode) && pd.l!==pd.w) oris.push({l:pd.w,w:pd.l,rot:true});
        for(const o of oris){ const fw=o.l+kerf, fh=o.w+kerf;
          for(const fr of template.free){ if(fw<=fr.w+1e-6 && fh<=fr.h+1e-6){ const score=fitScore(fr,fw,fh,strat);
            if(!best || score<best.score){ best={pd,o,fr,fw,fh,score}; } } }
        }
      }
      if(best){ const {pd,o,fr,fw,fh}=best;
        template.parts.push({key:pd.key,l:o.l,w:o.w,x:fr.x,y:fr.y,rot:o.rot});
        vcount.set(pd.key,(vcount.get(pd.key)||0)-1); used.set(pd.key,(used.get(pd.key)||0)+1);
        template.free=placeRectMaxRects(template.free,fr.x,fr.y,fw,fh); pruneFree(template.free);
        placed=true;
      }
    }
    if(!template.parts.length) break;
    // ---- how many identical plates can we make? ----
    let k=Infinity; used.forEach((n,key)=>{ k=Math.min(k, Math.floor(avail(key)/n)); });
    if(!isFinite(k)||k<1) k=1;
    // ---- materialize k plates, assigning real ids from the pool ----
    for(let c=0;c<k;c++){ const plate={parts:[]};
      for(const tp of template.parts){ const inst=pool.get(tp.key).ids.pop();
        plate.parts.push({id:inst.id,label:inst.label,l:tp.l,w:tp.w,x:tp.x,y:tp.y,rot:tp.rot}); }
      plates.push(plate);
    }
  }
  return plates;
}

/* main entry: nest one compatible group of parts onto identical stock plates */
function nest2D(parts, stock, opt){
  opt=opt||{};
  const margin=opt.margin||0, kerf=opt.kerf||0, gmode=opt.rotationMode||'auto';
  const PL=stock.L-2*margin, PW=stock.W-2*margin;  // usable
  const effMode=(pm)=>{ const m=pm||gmode; return (m==='grain'||m==='lock')?'lock':m; };
  // expand parts to individual pieces, attach effective rotation mode
  const pieces=[];
  for(const p of parts){ const pmode=effMode(p.rotationMode);
    for(let i=0;i<p.qty;i++) pieces.push({id:p.id,label:p.label,l:p.l,w:p.w,mode:pmode}); }
  // separate parts that cannot fit even rotated (respecting each piece's own mode)
  const fits=(p)=>{ const normal=(p.l+kerf<=PL+1e-6 && p.w+kerf<=PW+1e-6);
    const rotated=canRotate(p.mode) && (p.w+kerf<=PL+1e-6 && p.l+kerf<=PW+1e-6);
    return normal||rotated; };
  const placeable=pieces.filter(fits); const unplaced=pieces.filter(p=>!fits(p));

  const strategies=['BAF','BSSF','BLSF','GUIL','SHELF'];
  let best=null;
  for(const S of strategies){
    const plates=packStrategy(placeable, PL, PW, kerf, S);
    const plateCount=plates.length;
    const usedArea=plates.reduce((s,pl)=>s+pl.parts.reduce((a,pp)=>a+pp.l*pp.w,0),0);
    const totalArea=plateCount*PL*PW;
    const util=totalArea>0?usedArea/totalArea:0;
    const cand={plates,plateCount,util,strategy:S,usedArea};
    // selection: fewest plates, then highest utilization
    if(!best || cand.plateCount<best.plateCount ||
       (cand.plateCount===best.plateCount && cand.util>best.util)) best=cand;
  }
  best=best||{plates:[],plateCount:0,util:0,strategy:'-',usedArea:0};
  best.unplaced=unplaced.map(p=>({id:p.id,label:p.label,l:p.l,w:p.w}));
  best.placedCount=best.plates.reduce((s,pl)=>s+pl.parts.length,0);
  best.margin=margin; best.kerf=kerf; best.stock=stock; best.rotationMode=gmode; best.usablePL=PL; best.usablePW=PW;
  best.rotatedCount=best.plates.reduce((s,pl)=>s+pl.parts.filter(p=>p.rot).length,0);
  return best;
}

/* strict verification of a 2D result against required part quantities */
function verify2D(required, result){
  const errors=[]; const PL=result.usablePL, PW=result.usablePW, kerf=result.kerf, mode=result.rotationMode;
  // 1-4 counts
  const reqMap={}; required.forEach(p=>reqMap[p.id]=(reqMap[p.id]||0)+p.qty);
  const placedMap={}; result.plates.forEach(pl=>pl.parts.forEach(pp=>placedMap[pp.id]=(placedMap[pp.id]||0)+1));
  const unplacedMap={}; result.unplaced.forEach(u=>unplacedMap[u.id]=(unplacedMap[u.id]||0)+1);
  for(const id in reqMap){ const need=reqMap[id]; const got=(placedMap[id]||0)+(unplacedMap[id]||0);
    if(got!==need) errors.push(`Part ${id}: required ${need}, accounted ${got}`); }
  for(const id in placedMap){ if(!reqMap[id]) errors.push(`Unexpected part ${id} placed`); }
  // 5 oversize
  if(result.unplaced.length) errors.push(`${result.unplaced.length} part(s) do not fit the stock plate`);
  // per-plate geometry
  result.plates.forEach((pl,pi)=>{
    for(let a=0;a<pl.parts.length;a++){ const A=pl.parts[a];
      // 6 bounds (within usable area; kerf must still fit inside)
      if(A.x<-1e-6 || A.y<-1e-6 || A.x+A.l>PL+1e-6 || A.y+A.w>PW+1e-6)
        errors.push(`Plate ${pi+1}: ${A.label} outside boundary`);
      // 10/11 rotation legality
      if(A.rot && !(mode==='auto'||mode==='rot90'))
        errors.push(`Plate ${pi+1}: ${A.label} rotated but mode is ${mode}`);
      // 7 overlap incl. kerf spacing (8/9)
      for(let b=a+1;b<pl.parts.length;b++){ const B=pl.parts[b];
        const gapX = (A.x+A.l+kerf<=B.x+1e-6) || (B.x+B.l+kerf<=A.x+1e-6);
        const gapY = (A.y+A.w+kerf<=B.y+1e-6) || (B.y+B.w+kerf<=A.y+1e-6);
        if(!gapX && !gapY) errors.push(`Plate ${pi+1}: ${A.label} overlaps ${B.label} (or kerf violated)`);
      }
    }
  });
  return {pass:errors.length===0, errors};
}

/* full costed metrics for a nested group */
function metrics2D(result, thickness, ratePerTon){
  const stock=result.stock; const stockAreaEach=stock.L*stock.W;
  const stockWeightEach=stock.L*stock.W*thickness*PLATE_DENSITY;
  const plateCount=result.plateCount;
  const purchaseArea=plateCount*stockAreaEach;
  const usedArea=result.plates.reduce((s,pl)=>s+pl.parts.reduce((a,pp)=>a+pp.l*pp.w,0),0);
  const wasteArea=Math.max(0,purchaseArea-usedArea);
  const utilization=purchaseArea>0?usedArea/purchaseArea*100:0;
  const wastePct=purchaseArea>0?wasteArea/purchaseArea*100:0;
  const purchaseWeight=plateCount*stockWeightEach;
  const usedWeight=result.plates.reduce((s,pl)=>s+pl.parts.reduce((a,pp)=>a+pp.l*pp.w*thickness*PLATE_DENSITY,0),0);
  const wasteWeight=Math.max(0,purchaseWeight-usedWeight);
  const purchaseCost=purchaseWeight/1000*(ratePerTon||0);
  const usedCost=usedWeight/1000*(ratePerTon||0);
  const wasteValue=wasteWeight/1000*(ratePerTon||0);
  return {plateCount,stockAreaEach,stockWeightEach,purchaseArea,usedArea,wasteArea,utilization,wastePct,
    purchaseWeight,usedWeight,wasteWeight,purchaseCost,usedCost,wasteValue};
}

function verify1D(groups, results){
  // groups: [{key,cuts:[{len,qty}], stockLen}] ; results: from nest1D per group
  const errors=[];
  results.forEach(r=>{
    const req=r.reqPieces, placed=r.placedPieces;
    if(req!==placed) errors.push(`${r.label}: required ${req} pieces, placed ${placed}`);
    r.bars.forEach((b,i)=>{ const sum=b.cuts.reduce((s,c)=>s+c.len,0)+r.kerf*(b.cuts.length-1);
      if(sum>b.stockLen+1e-6) errors.push(`${r.label} bar ${i+1}: cuts exceed stock length`); });
  });
  return {pass:errors.length===0, errors};
}

/* ===== INLINED EXPORTERS: DXF writer + cut-sequence + 1D trials ===== */
/* ======================================================================
   AMBS EXPORT/TRIAL MODULES — DXF writer, cut-sequence, extra 1D trials
   Pure functions, unit-tested before UI wiring. Units = mm.
   ==================================================================== */

/* ---------- DXF WRITER (real CAD geometry, ASCII DXF R12) ----------
   Minimal but valid DXF: HEADER + TABLES(layers) + ENTITIES.
   Entities: LWPOLYLINE (closed) for boundaries/parts, TEXT for labels.
   Y is flipped so parts read the same as screen (DXF Y is up). */
function dxfDoc(){
  return { layers:new Set(['0']), body:[] };
}
function dxfAddLayer(doc,name){ doc.layers.add(name); }
function dxfPolyline(doc, layer, pts, closed){
  dxfAddLayer(doc,layer);
  const b=doc.body;
  // heavyweight POLYLINE (R12-compatible, no AcDb subclass required → opens everywhere)
  b.push('0','POLYLINE','8',layer,'66','1','70',closed?'1':'0','10','0','20','0','30','0');
  for(const p of pts){ b.push('0','VERTEX','8',layer,'10',fmtNum(p[0]),'20',fmtNum(p[1]),'30','0'); }
  b.push('0','SEQEND','8',layer);
}
function dxfText(doc, layer, x, y, h, str){
  dxfAddLayer(doc,layer);
  const b=doc.body;
  b.push('0','TEXT','8',layer,'10',fmtNum(x),'20',fmtNum(y),'30','0','40',fmtNum(h),'1',String(str));
}
function fmtNum(n){ return (Math.round(n*1000)/1000).toString(); }
function dxfSerialize(doc){
  const layers=[...doc.layers];
  const head=[];
  head.push('0','SECTION','2','HEADER','9','$ACADVER','1','AC1009','9','$INSUNITS','70','4','0','ENDSEC');
  head.push('0','SECTION','2','TABLES','0','TABLE','2','LAYER','70',String(layers.length));
  const colors={SHEET_BOUNDARY:'5',CUT_PARTS:'3',PART_LABELS:'7',CUT_SEQUENCE:'1',DIMENSIONS:'8',OFFCUTS:'4','0':'7'};
  for(const L of layers){ head.push('0','LAYER','2',L,'70','0','62',colors[L]||'7','6','CONTINUOUS'); }
  head.push('0','ENDTAB','0','ENDSEC','0','SECTION','2','ENTITIES');
  const foot=['0','ENDSEC','0','EOF'];
  // concat strings (avoid spreading very large body arrays → stack overflow)
  return head.join('\r\n')+'\r\n'+doc.body.join('\r\n')+'\r\n'+foot.join('\r\n');
}

/* Build a DXF for one or more nested sheets.
   sheets: [{sheetWidthMm, sheetLengthMm, placedParts:[{x,y,width,height,originalLengthMm,originalWidthMm,rotated,partName,cutSequence}]}]
   opts: {allInOne, includeLabels, includeBoundary, includeSeq, gap} */
function buildDXF(sheets, opts){
  opts=opts||{}; const gap=opts.gap!=null?opts.gap:500;
  const includeLabels=opts.includeLabels!==false, includeBoundary=opts.includeBoundary!==false, includeSeq=opts.includeSeq!==false;
  const doc=dxfDoc();
  let offX=0;
  sheets.forEach((sh,si)=>{
    const H=sh.sheetLengthMm, W=sh.sheetWidthMm;
    const ox=offX, oy=0;
    if(includeBoundary){
      dxfPolyline(doc,'SHEET_BOUNDARY',[[ox,oy],[ox+W,oy],[ox+W,oy+H],[ox,oy+H]],true);
    }
    for(const p of sh.placedParts){
      // internal convention: x = width axis, y = length axis. Flip Y so it reads top-down.
      const x1=ox+p.x, y1=oy+(H-(p.y+p.height)); const x2=x1+p.width, y2=y1+p.height;
      dxfPolyline(doc,'CUT_PARTS',[[x1,y1],[x2,y1],[x2,y2],[x1,y2]],true);
      if(includeLabels){
        const h=Math.max(20,Math.min(p.width,p.height)*0.14);
        const label=`${p.partName} ${p.originalLengthMm}x${p.originalWidthMm}${p.rotated?' R':''}`;
        dxfText(doc,'PART_LABELS', x1+p.width/2 - label.length*h*0.28, y1+p.height/2 - h/2, h, label);
      }
      if(includeSeq && p.cutSequence!=null){
        const h=Math.max(24,Math.min(p.width,p.height)*0.16);
        dxfText(doc,'CUT_SEQUENCE', x1+h*0.3, y2-h*1.2, h, String(p.cutSequence));
      }
    }
    offX += W + (opts.allInOne?gap:0);
  });
  return dxfSerialize(doc);
}

/* ---------- CUT-SEQUENCE ----------
   2D: order placed parts by sheet, then y (length), then x (width). */
function assignCutSequence2D(sheets){
  sheets.forEach(sh=>{
    const sorted=sh.placedParts.slice().sort((a,b)=> a.y-b.y || a.x-b.x);
    sorted.forEach((p,i)=>{ p.cutSequence=i+1; });
  });
  return sheets;
}
/* 1D: within each bar order cuts by descending length; assign sequence. */
function assignCutSequence1D(bars){
  bars.forEach(bar=>{ const sorted=bar.cuts.slice().sort((a,b)=>b.len-a.len);
    sorted.forEach((c,i)=>{ c.cutSequence=i+1; }); });
  return bars;
}

/* ---------- EXTRA 1D TRIALS (worst-fit, shortest-first) ----------
   Each returns {bars:[{cuts:[{len}], stockLen}], newBarCount}. kerf in metres. */
function ffd1D(cuts, stockLen, kerf){ // first-fit decreasing
  const sorted=cuts.slice().sort((a,b)=>b-a); const bars=[];
  for(const c of sorted){ let placed=false;
    for(const bar of bars){ const used=bar.cuts.reduce((s,x)=>s+x,0)+kerf*bar.cuts.length; if(used+c<=stockLen+1e-9){ bar.cuts.push(c); placed=true; break; } }
    if(!placed) bars.push({cuts:[c],stockLen}); }
  return {bars,newBarCount:bars.length};
}
function bfd1D(cuts, stockLen, kerf){ // best-fit decreasing
  const sorted=cuts.slice().sort((a,b)=>b-a); const bars=[];
  for(const c of sorted){ let best=null,bestRem=Infinity;
    for(const bar of bars){ const used=bar.cuts.reduce((s,x)=>s+x,0)+kerf*bar.cuts.length; const rem=stockLen-(used+c); if(rem>=-1e-9&&rem<bestRem){best=bar;bestRem=rem;} }
    if(best) best.cuts.push(c); else bars.push({cuts:[c],stockLen}); }
  return {bars,newBarCount:bars.length};
}
function wfd1D(cuts, stockLen, kerf){ // worst-fit decreasing (spreads cuts; good for reusable offcuts)
  const sorted=cuts.slice().sort((a,b)=>b-a); const bars=[];
  for(const c of sorted){ let best=null,bestRem=-1;
    for(const bar of bars){ const used=bar.cuts.reduce((s,x)=>s+x,0)+kerf*bar.cuts.length; const rem=stockLen-(used+c); if(rem>=-1e-9&&rem>bestRem){best=bar;bestRem=rem;} }
    if(best) best.cuts.push(c); else bars.push({cuts:[c],stockLen}); }
  return {bars,newBarCount:bars.length};
}
function sff1D(cuts, stockLen, kerf){ // shortest-first fit
  const sorted=cuts.slice().sort((a,b)=>a-b); const bars=[];
  for(const c of sorted){ let placed=false;
    for(const bar of bars){ const used=bar.cuts.reduce((s,x)=>s+x,0)+kerf*bar.cuts.length; if(used+c<=stockLen+1e-9){ bar.cuts.push(c); placed=true; break; } }
    if(!placed) bars.push({cuts:[c],stockLen}); }
  return {bars,newBarCount:bars.length};
}
function combo1D(cuts, stockLen, kerf){ // combination search: fill each bar close to full
  let remaining=cuts.slice().sort((a,b)=>b-a); const bars=[]; let guard=0;
  while(remaining.length && guard++<100000){
    const cand=remaining.slice(0,24); // limit for performance
    // greedy subset: keep adding the largest cut that still fits
    const pick=[]; let used=0;
    for(let i=0;i<cand.length;i++){ const c=cand[i]; const add=used===0?c:c+kerf; if(used+add<=stockLen+1e-9){ pick.push(i); used+=add; } }
    if(!pick.length){ pick.push(0); }
    // materialize bar; remove picked from remaining (by index in cand → find in remaining)
    const barCuts=pick.map(i=>cand[i]); bars.push({cuts:barCuts,stockLen});
    // remove one instance each
    const rem2=remaining.slice(); pick.forEach(i=>{ const v=cand[i]; const idx=rem2.indexOf(v); if(idx>=0)rem2.splice(idx,1); }); remaining=rem2;
  }
  return {bars,newBarCount:bars.length};
}
function best1D(cuts, stockLen, kerf){ // run trials, keep fewest bars then best utilization
  const trials=[['First-Fit Decreasing',ffd1D],['Best-Fit Decreasing',bfd1D],['Worst-Fit Decreasing',wfd1D],['Shortest-First Fit',sff1D],['Combination Search',combo1D]];
  // randomized FFD ×10
  let best=null; const summary=[];
  const totalCut=cuts.reduce((s,c)=>s+c,0);
  for(const [name,fn] of trials){ const r=fn(cuts,stockLen,kerf);
    const util=totalCut/(r.newBarCount*stockLen);
    summary.push({name,bars:r.newBarCount,util});
    if(!best||r.newBarCount<best.newBarCount||(r.newBarCount===best.newBarCount&&util>best.util)){ best={...r,name,util}; } }
  // randomized first-fit ×10
  let rng=12345; const rand=()=>((rng=rng*1103515245+12345&0x7fffffff)/0x7fffffff);
  for(let t=0;t<10;t++){ const shuffled=cuts.slice(); for(let i=shuffled.length-1;i>0;i--){ const j=Math.floor(rand()*(i+1)); [shuffled[i],shuffled[j]]=[shuffled[j],shuffled[i]]; }
    const r=ffd1D(shuffled,stockLen,kerf); const util=totalCut/(r.newBarCount*stockLen);
    if(r.newBarCount<best.newBarCount||(r.newBarCount===best.newBarCount&&util>best.util)){ best={...r,name:'Randomized First-Fit',util}; } }
  summary.push({name:best.name+' (selected)',bars:best.newBarCount,util:best.util});
  best.trialsSummary=summary;
  return best;
}

const COST_CATS=['Paint','Powder Coating','Hot Dip Galvanizing','Consumables','Fasteners / Hardware','Cutting / Machining','Welding','Labour','Freight / Transport','Other'];
const COST_UNITS=['pc','set','kg','m','m²','lot','hour','litre'];
const PWC={ _keep:false,_id:null,_name:'',_project:'',_notes:'',_by:'',_date:'',_lines:[],_sets:1,_q:'',_letype:'plate',_lemat:'steel',_lerate:0,
  render(){
    let rows=DB.weighDocs.slice().sort((a,b)=>(b.createdAt||'').localeCompare(a.createdAt||''));
    if(this._q){ const q=this._q.toLowerCase(); rows=rows.filter(d=>(d.no+' '+(d.name||'')+' '+(d.project||'')).toLowerCase().includes(q)); }
    const body=rows.length?rows.map(d=>`<tr>
      <td class="code">${esc(d.no)}</td><td>${fmtDate(d.date)}</td>
      <td><div style="font-weight:600">${esc(d.name||'—')}</div><div class="sub">${esc(d.project||'')}${d.sets>1?' · '+d.sets+' sets':''}</div></td>
      <td class="c">${(d.lines||[]).length}</td>
      <td class="qty" style="font-weight:700">${nfmt(d.total||0,2)} <span class="sub">kg</span></td>
      <td class="qty" style="font-weight:700">${d.totalCost?nfmt(d.totalCost,2)+' <span class="sub">AED</span>':'<span class="sub">—</span>'}</td>
      <td><div class="row-actions">
        <button class="icon-btn" title="View" onclick="PWC.view('${d.id}')">${ic('search')}</button>
        <button class="icon-btn" title="PDF" onclick="PDFR.weigh('${d.id}')">${ic('pdf')}</button>
        <button class="icon-btn" title="Edit" onclick="PWC.edit('${d.id}')">${ic('edit')}</button>
        <button class="icon-btn" title="Delete" onclick="PWC.del('${d.id}')">${ic('trash')}</button></div></td></tr>`).join('')
      :`<tr><td colspan="7">${emptyState('layers','No product take-offs yet','Build a product from steel sections with tonnage rates and cost centres — or load a worked sample to explore.',`<button class="btn btn-primary" onclick="PWC.new()">${ic('plus')}Create new</button> <button class="btn" onclick="PWC.loadSample()">${ic('layers')}Load sample product</button>`)}</td></tr>`;
    return `<div class="view-head"><div><div class="eyebrow">Tools</div><h1 class="h1">Product Calculator</h1></div>
      <div class="head-actions"><button class="btn btn-primary" onclick="PWC.new()">${ic('plus')}Create new</button></div></div>
      <div class="note info" style="margin-bottom:14px">Build any product from steel sections — beams, plates, chequer plate, hollow sections and more — with per-section tonnage rates and non-steel cost centres (paint, galvanizing, consumables, labour). Get weight and full cost, set a manufacturing batch, print a cutting list, and save.</div>
      <div class="card"><div class="toolbar">
        <div class="search">${ic('search')}<input class="inp" placeholder="Search by number, product or project…" value="${esc(this._q)}" oninput="PWC._q=this.value;App.render()"></div>
        <span class="pill-legend" style="margin-left:auto"><b>${DB.weighDocs.length}</b> saved</span></div>
      <div class="tbl-wrap"><table class="tbl"><thead><tr>
        <th>No.</th><th>Date</th><th>Product / project</th><th class="c">Lines</th><th class="r">Total weight</th><th class="r">Total cost</th><th></th></tr></thead>
        <tbody>${body}</tbody></table></div></div>`;
  },
  _init(){ this._id=null;this._name='';this._project='';this._notes='';this._by=SET.currentUser||'';this._date=todayISO();this._rev='0';this._lines=[];this._plates=[];this._sets=1;this._tab='info'; },
  new(){ this._init(); this._keep=true; App.go('prodcalc-new'); },
  loadSample(){ this._init();
    const steel=(tk,v,m,q,r)=>{ const S=SECT[tk]; const lm=(S.kind==='geo')?undefined:(v.L||0);
      const rr=sectWeight(tk,v,m,lm); const kg=rr.piece*q;
      this._lines.push({id:uid('wl'),kind:'steel',typeKey:tk,material:m,vals:v,qty:q,desc:sectDesc(tk,v,lm),unitKg:rr.piece,perM:rr.perM,lineKg:kg,rateTon:r,lineCost:(kg/1000)*r}); };
    steel('shs',{size:'50',t:3,L:1.2},'steel',4,2800);
    steel('rhs',{size:'100x50',t:4,L:2.0},'steel',2,2750);
    steel('chs',{size:'50',L:1.5},'steel',3,3200);
    steel('ipe',{size:'200',L:3.0},'steel',1,3000);
    steel('eangle',{size:'50x50x5',L:0.8},'steel',6,2900);
    // manual custom SHS 75×75×4 @ 1.5m, ×2 (calculated from geometry)
    (()=>{ const m=manualSHS(75,4); const rho=7850; const lenM=1.5; const piece=m.kgm*lenM; const qty=2; const rate=2850;
      this._lines.push({id:uid('wl'),kind:'steel',typeKey:'shs',material:'steel',inputMode:'manual',vals:{L:lenM},manual:{B:75,T:4},overrideKgm:0,stockLen:6,qty,desc:`SHS 75×75×4 (custom) — L ${nfmt(lenM,3)} m`,unitKg:piece,perM:m.kgm,lineKg:piece*qty,rateTon:rate,lineCost:(piece*qty/1000)*rate}); })();
    // plate parts for 2D nesting
    this._plates.push({id:uid('pl'),label:'Base plate',l:300,w:300,t:12,qty:2,grade:'S275JR',rateTon:2600,remarks:''});
    this._plates.push({id:uid('pl'),label:'Gusset',l:200,w:150,t:8,qty:4,grade:'S275JR',rateTon:2600,remarks:''});
    const sk=this._lines.reduce((s,l)=>s+l.lineKg,0)+this._plates.reduce((s,p)=>s+plateWeightKg(p.l,p.w,p.t)*p.qty,0);
    this._lines.push({id:uid('cc'),kind:'cost',costCat:'Hot Dip Galvanizing',unit:'kg',desc:'HDG coating (85 µm)',qty:+sk.toFixed(1),unitCost:3.5,lineCost:sk*3.5,unitKg:0,lineKg:0});
    this._lines.push({id:uid('cc'),kind:'cost',costCat:'Paint',unit:'m²',desc:'Epoxy 2-coat system',qty:2.5,unitCost:45,lineCost:112.5,unitKg:0,lineKg:0});
    this._lines.push({id:uid('cc'),kind:'cost',costCat:'Consumables',unit:'set',desc:'Welding wire, gas & discs',qty:1,unitCost:35,lineCost:35,unitKg:0,lineKg:0});
    this._lines.push({id:uid('cc'),kind:'cost',costCat:'Labour',unit:'hour',desc:'Cut, fit & weld',qty:3,unitCost:55,lineCost:165,unitKg:0,lineKg:0});
    this._name='Cantilever edge-protection bracket'; this._project='Sample project'; this._by=SET.currentUser||''; this._sets=60;
    this._keep=true; App.go('prodcalc-new'); toast('Sample product loaded — edit or save it','ok'); },
  edit(id){ const d=DB.weighDocs.find(x=>x.id===id); if(!d)return; this._id=id;
    this._name=d.name||'';this._project=d.project||'';this._notes=d.notes||'';this._by=d.preparedBy||'';this._date=d.date||todayISO();this._rev=d.rev||'0';
    this._lines=(d.lines||[]).map(l=>Object.assign({},l)); this._plates=(d.plates||[]).map(p=>Object.assign({},p)); this._sets=d.sets||1; this._tab='info'; this._keep=true; App.go('prodcalc-new'); },
  builder(){ if(!this._keep){ this._init(); } this._keep=false;
    const tabs=[['info','Product Info','box'],['steel','Steel Lines','layers'],['plates','Plate Parts','grid'],['cost','Cost Centres','cart'],['nesting','Nesting','calc'],['purchase','Purchase','cart'],['reports','Reports','pdf']];
    const nSteel=this._lines.filter(l=>l.kind!=='cost').length, nCost=this._lines.filter(l=>l.kind==='cost').length, nPlate=this._plates.length;
    const badge={steel:nSteel,plates:nPlate,cost:nCost};
    const tabBar=`<div class="pwc-tabs">${tabs.map(([k,label,ic0])=>`<button class="pwc-tab ${this._tab===k?'on':''}" onclick="PWC.tab('${k}')">${ic(ic0)}<span>${label}</span>${badge[k]?`<span class="tb-badge">${badge[k]}</span>`:''}</button>`).join('')}</div>`;
    const doc=this._id?DB.weighDocs.find(d=>d.id===this._id):null;
    return `<div class="view-head"><div><div class="eyebrow">Tools · ${this._id?'edit':'new'} ${this._rev&&this._rev!=='0'?'· Rev '+esc(this._rev):''}</div><h1 class="h1">${doc?esc(doc.no)+' — '+esc(this._name||''):'New Product'}</h1></div>
      <div class="head-actions">
        <button class="btn" onclick="PWC.save(false)">${ic('save')}Save</button>
        <button class="btn btn-ghost" onclick="App.go('prodcalc')">${ic('x')}Close</button></div></div>
      ${tabBar}
      <div id="pwc_tab" style="margin-top:16px">${this.tabContent()}</div>`;
  },
  tab(k){ this._tab=k; const el=$('#pwc_tab'); if(el){ el.innerHTML=this.tabContent(); this.tabWire(); } 
    document.querySelectorAll('.pwc-tab').forEach(b=>b.classList.remove('on')); const btn=[...document.querySelectorAll('.pwc-tab')].find(b=>b.textContent.trim().startsWith(({info:'Product',steel:'Steel',plates:'Plate',cost:'Cost',nesting:'Nesting',purchase:'Purchase',reports:'Reports'})[k])); if(btn)btn.classList.add('on'); },
  wire(){ this.tabWire(); },
  tabWire(){ if(this._tab==='steel'||this._tab==='cost') this.refreshLines(); if(this._tab==='plates') this.refreshPlates(); if(this._tab==='nesting') this.nestWire(); },
  tabContent(){ switch(this._tab){
    case 'info': return this.tabInfo();
    case 'steel': return this.tabSteel();
    case 'plates': return this.tabPlates();
    case 'cost': return this.tabCost();
    case 'nesting': return this.tabNesting();
    case 'purchase': return this.tabPurchase();
    case 'reports': return this.tabReports();
    default: return this.tabInfo(); } },
  tabInfo(){ return `<div class="card"><div class="card-head"><div class="card-title">Product information</div></div><div class="card-body">
      <div class="form-grid">
        <div class="field full"><label>Product name <span class="req">*</span></label><input class="inp" id="w_name" value="${esc(this._name)}" placeholder="e.g. Cantilever edge-protection bracket assembly"></div>
        <div class="field"><label>Project / client reference</label><input class="inp" id="w_project" value="${esc(this._project)}"></div>
        <div class="field"><label>Revision</label><input class="inp mono" id="w_rev" value="${esc(this._rev)}" placeholder="0"></div>
        <div class="field"><label>Date</label><input class="inp" id="w_date" type="date" value="${esc(this._date)}"></div>
        <div class="field"><label>Prepared by</label><input class="inp" id="w_by" value="${esc(this._by)}"></div>
        <div class="field"><label>Sets / units to manufacture</label><input class="inp mono" id="w_sets" type="number" min="1" step="1" value="${this._sets}" oninput="PWC.setsChange(this.value)"><div class="hint">Multiplies every line for the batch total.</div></div>
        <div class="field full"><label>Description / special notes</label><textarea class="inp" id="w_notes" rows="2" placeholder="Optional">${esc(this._notes)}</textarea></div>
      </div>
      <div class="note info" style="margin-top:12px">Fill product info, then add steel sections, plate parts and cost centres in their tabs. The <b>Nesting</b> tab optimises stock, the <b>Purchase</b> and <b>Reports</b> tabs give printable outputs. Everything scales by the number of sets.</div>
      <div id="pwc_infosum" style="margin-top:14px">${this.summaryCards()}</div>
    </div></div>`; },
  summaryCards(){ const sets=Math.max(1,this._sets||1);
    const steel=this._lines.filter(l=>l.kind!=='cost'); const costs=this._lines.filter(l=>l.kind==='cost');
    const steelKg=steel.reduce((s,l)=>s+(+l.lineKg||0),0);
    const plateKg=this._plates.reduce((s,p)=>s+plateWeightKg(p.l,p.w,p.t)*p.qty,0);
    const totKg=steelKg+plateKg;
    const steelCost=steel.reduce((s,l)=>s+this.lineCostOf(l),0);
    const plateCost=this._plates.reduce((s,p)=>s+(plateWeightKg(p.l,p.w,p.t)*p.qty/1000)*(+p.rateTon||0),0);
    const ccCost=costs.reduce((s,l)=>s+this.lineCostOf(l),0);
    const grand=steelCost+plateCost+ccCost;
    return `<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:10px">
      <div class="kpi k-ink"><div class="kl">Weight / unit</div><div class="kv">${nfmt(totKg,2)} <span style="font-size:12px">kg</span></div><div class="kf">${nfmt(totKg/1000,4)} t</div></div>
      <div class="kpi k-ink"><div class="kl">Total cost / unit</div><div class="kv">${nfmt(grand,2)}<span style="font-size:11px"> AED</span></div><div class="kf">steel ${nfmt(steelCost+plateCost,0)} · cc ${nfmt(ccCost,0)}</div></div>
      <div class="kpi k-red"><div class="kl">Batch × ${sets}</div><div class="kv">${nfmt(grand*sets,2)}<span style="font-size:11px"> AED</span></div><div class="kf">${nfmt(totKg*sets/1000,3)} t</div></div>
      <div class="kpi k-ok"><div class="kl">Lines</div><div class="kv">${steel.length+this._plates.length+costs.length}</div><div class="kf">${steel.length} steel · ${this._plates.length} plate · ${costs.length} cost</div></div>
    </div>`; },
  tabSteel(){ return `<div class="card"><div class="card-head"><div class="card-title">Steel section lines</div>
      <button class="btn btn-sm btn-primary" onclick="PWC.lineEditor()">${ic('plus')}Add steel section</button></div>
      <div class="tbl-wrap"><table class="tbl"><thead><tr>
        <th style="width:32px">#</th><th>Section / size</th><th>Mode</th><th class="r">kg/m</th><th class="r">Len (m)</th><th class="r">Qty</th><th class="r">Line wt (kg)</th><th class="r">AED/T</th><th class="r">Line cost</th><th></th></tr></thead>
        <tbody id="pwcLines"></tbody></table></div>
      <div class="card-pad" style="border-top:1px solid var(--line-2)"><div id="pwcTotals"></div></div></div>`; },
  tabCost(){ return `<div class="card"><div class="card-head"><div class="card-title">Cost centres &amp; consumables</div>
      <button class="btn btn-sm btn-primary" onclick="PWC.costEditor()">${ic('plus')}Add cost item</button></div>
      <div class="tbl-wrap"><table class="tbl"><thead><tr>
        <th style="width:32px">#</th><th>Item</th><th>Category</th><th class="r">Qty</th><th>Unit</th><th class="r">Unit price</th><th class="r">Line cost (AED)</th><th></th></tr></thead>
        <tbody id="pwcCostLines"></tbody></table></div>
      <div class="card-pad" style="border-top:1px solid var(--line-2)"><div id="pwcCostTotals"></div></div></div>`; },
  setsChange(v){ this._sets=Math.max(1,Math.round(+v||1)); this.refreshLines(); },
  isCost(l){ return l.kind==='cost'; },
  lineCostOf(l){ if(l.kind==='cost') return (+l.lineCost||0);
    const tons=(+l.lineKg||0)/1000; return tons*(+l.rateTon||0); },
  refreshLines(){ const b=$('#pwcLines'); const sets=Math.max(1,this._sets||1);
    const steel=this._lines.filter(l=>l.kind!=='cost'); const costs=this._lines.filter(l=>l.kind==='cost');
    if(b){ b.innerHTML=steel.length?steel.map((l)=>{ const i=this._lines.indexOf(l); const lc=this.lineCostOf(l);
      const modeTag=l.inputMode==='manual'?'<span class="chip warn">manual</span>':(l.overrideKgm?'<span class="chip warn">override</span>':'<span class="chip">catalogue</span>');
      const lenM=twcCutLenM(l.typeKey,l.vals);
      return `<tr>
        <td class="code">${i+1}</td><td>${esc(l.desc)}<div class="sub">${esc((TWC_MAT[l.material]||TWC_MAT.steel).n)}${l.stockLen?' · stock '+nfmt(l.stockLen,0)+'m':''}</div></td>
        <td>${modeTag}</td>
        <td class="qty">${l.perM?twcW(l.perM):'—'}</td><td class="qty">${nfmt(lenM,3)}</td><td class="qty">${intfmt(l.qty)}</td>
        <td class="qty" style="font-weight:700">${twcW(l.lineKg)}</td>
        <td class="qty">${l.rateTon?nfmt(l.rateTon,2):'<span class="sub">—</span>'}</td>
        <td class="qty" style="font-weight:700">${lc?nfmt(lc,2):'<span class="sub">—</span>'}</td>
        <td><div class="row-actions"><button class="icon-btn" onclick="PWC.lineEditor(${i})">${ic('edit')}</button>
          <button class="icon-btn" onclick="PWC.rmLine(${i})">${ic('x')}</button></div></td></tr>`;}).join('')
      :`<tr><td colspan="10" class="empty" style="padding:24px">No steel sections yet — click “Add steel section”.</td></tr>`; }
    // steel totals
    const t=$('#pwcTotals'); if(t){ const steelKg=steel.reduce((s,l)=>s+(+l.lineKg||0),0);
      const plateKg=this._plates.reduce((s,p)=>s+plateWeightKg(p.l,p.w,p.t)*p.qty,0);
      const steelCost=steel.reduce((s,l)=>s+this.lineCostOf(l),0);
      const plateCost=this._plates.reduce((s,p)=>s+(plateWeightKg(p.l,p.w,p.t)*p.qty/1000)*(+p.rateTon||0),0);
      const ccCost=costs.reduce((s,l)=>s+this.lineCostOf(l),0); const grand=steelCost+plateCost+ccCost; const totKg=steelKg+plateKg;
      t.innerHTML=`<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:10px">
        <div class="kpi k-ink"><div class="kl">Steel weight / unit</div><div class="kv">${nfmt(steelKg,2)} <span style="font-size:12px">kg</span></div><div class="kf">+ plates ${nfmt(plateKg,1)} kg</div></div>
        <div class="kpi k-ink"><div class="kl">Steel cost / unit</div><div class="kv">${nfmt(steelCost,2)}<span style="font-size:11px"> AED</span></div></div>
        <div class="kpi k-red"><div class="kl">Total cost / unit</div><div class="kv">${nfmt(grand,2)}<span style="font-size:11px"> AED</span></div></div>
        <div class="kpi k-ok"><div class="kl">Batch × ${sets}</div><div class="kv">${nfmt(grand*sets,2)}<span style="font-size:11px"> AED</span></div><div class="kf">${nfmt(totKg*sets/1000,3)} t</div></div>
      </div>`; }
    this.refreshCostLines();
  },
  refreshCostLines(){ const b=$('#pwcCostLines'); const sets=Math.max(1,this._sets||1);
    const costs=this._lines.filter(l=>l.kind==='cost');
    if(b){ b.innerHTML=costs.length?costs.map((l)=>{ const i=this._lines.indexOf(l); const lc=this.lineCostOf(l);
      return `<tr><td class="code">${i+1}</td><td>${esc(l.desc||l.costCat)}${l.remarks?`<div class="sub">${esc(l.remarks)}</div>`:''}</td>
        <td><span class="chip neutral">${esc(l.costCat)}</span></td>
        <td class="qty">${nfmt(l.qty,2)}</td><td>${esc(l.unit||'')}</td><td class="qty">${nfmt(l.unitCost,2)}</td>
        <td class="qty" style="font-weight:700">${nfmt(lc,2)}</td>
        <td><div class="row-actions"><button class="icon-btn" onclick="PWC.costEditor(${i})">${ic('edit')}</button>
          <button class="icon-btn" onclick="PWC.rmLine(${i})">${ic('x')}</button></div></td></tr>`;}).join('')
      :`<tr><td colspan="8" class="empty" style="padding:24px">No cost items yet — paint, galvanizing, consumables, labour…</td></tr>`; }
    const t=$('#pwcCostTotals'); if(t){ const catMap={}; costs.forEach(l=>{catMap[l.costCat]=(catMap[l.costCat]||0)+this.lineCostOf(l);});
      const ccCost=costs.reduce((s,l)=>s+this.lineCostOf(l),0);
      t.innerHTML=`<div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:10px">
        <div style="display:flex;flex-wrap:wrap;gap:6px">${Object.entries(catMap).map(([k,v])=>`<span class="chip neutral">${esc(k)}: <b class="num">${nfmt(v,2)}</b></span>`).join('')||'<span class="sub">No cost centres</span>'}</div>
        <div class="kpi k-yellow" style="min-width:180px"><div class="kl">Cost centres / unit</div><div class="kv">${nfmt(ccCost,2)}<span style="font-size:11px"> AED</span></div><div class="kf">× ${sets} = ${nfmt(ccCost*sets,2)} AED</div></div></div>`; }
  },
  rmLine(i){ this._lines.splice(i,1); this.refreshLines(); },
  lineEditor(idx){ const ex=(idx!=null)?this._lines[idx]:null;
    this._letype=ex?ex.typeKey:'shs'; this._lemat=ex?ex.material:'steel';
    this._lemode=ex?(ex.inputMode||'catalogue'):'catalogue'; this._leoverride=ex?!!ex.overrideKgm:false;
    this._lesel=ex?Object.assign({},ex.vals):{};
    const canManual=['shs','rhs','chs'].includes(this._letype);
    const back=openModal(`<div class="modal-head"><div><h3>${ex?'Edit section':'Add section'}</h3><div class="msub">Catalogue or manual custom dimensions · per-line AED/Ton rate</div></div><button class="x" onclick="closeModal()">${ic('x')}</button></div>
      <div class="modal-body"><div style="display:grid;grid-template-columns:1.1fr 1fr;gap:18px;align-items:start">
        <div>
          <div class="field"><label>Section family</label><select class="sel" id="le_type" onchange="PWC.leType(this.value)">${sectGroupedOptions(this._letype)}</select></div>
          <div class="field" id="le_moderow" style="${canManual?'':'display:none'}"><label>Input mode</label>
            <div class="seg" role="group">
              <button type="button" class="btn btn-sm ${this._lemode==='catalogue'?'btn-primary':''}" id="le_mode_cat" onclick="PWC.leMode('catalogue')">Catalogue section</button>
              <button type="button" class="btn btn-sm ${this._lemode==='manual'?'btn-primary':''}" id="le_mode_man" onclick="PWC.leMode('manual')">Manual custom section</button>
            </div><div class="hint" id="le_modehint">${this._lemode==='manual'?'kg/m calculated from the dimensions you enter.':'Uses standard catalogue kg/m.'}</div></div>
          <div class="field"><label>Material</label><select class="sel" id="le_mat" onchange="PWC._lemat=this.value;PWC.leCalc()">${Object.keys(TWC_MAT).map(k=>`<option value="${k}" ${this._lemat===k?'selected':''}>${esc(TWC_MAT[k].n)}</option>`).join('')}</select></div>
          <div id="le_fields"></div>
          <div class="field"><label>Quantity (pcs)</label><input class="inp mono" id="le_qty" type="number" min="1" step="1" value="${ex?ex.qty:1}" oninput="PWC.leCalc()"></div>
          <div class="field"><label>Tonnage rate <span class="sub">(AED/Ton — optional)</span></label><input class="inp mono" id="le_rate" type="number" min="0" step="0.01" value="${ex&&ex.rateTon?ex.rateTon:0}" oninput="PWC.leCalc()" placeholder="0.00"></div>
          <div class="field"><label style="display:flex;align-items:center;gap:8px;cursor:pointer"><input type="checkbox" id="le_ovchk" ${this._leoverride?'checked':''} onchange="PWC.leToggleOverride(this.checked)"> Override kg/m manually</label>
            <div id="le_ovwrap" style="${this._leoverride?'':'display:none'};margin-top:6px">
              <input class="inp mono" id="le_ovval" type="number" min="0" step="0.001" value="${ex&&ex.overrideKgm?ex.overrideKgm:''}" placeholder="kg/m" oninput="PWC.leCalc()">
              <div class="note" style="margin-top:6px;border-left-color:var(--warn,#B7791F)">⚠ Manual kg/m override active — verify before saving.</div></div></div>
        </div>
        <div>
          <div class="card" style="margin:0"><div class="card-body" style="padding:12px">
            <div class="eyebrow" style="margin-bottom:6px">Cross-section &amp; dimensions</div>
            <div id="le_sketch" style="display:grid;place-items:center;min-height:200px"></div>
            <div id="le_dims" class="sub" style="margin-top:8px;line-height:1.7"></div>
          </div></div>
          <div class="note" id="le_prev" style="margin-top:12px">…</div>
        </div>
      </div></div>
      <div class="modal-foot"><button class="btn btn-ghost" onclick="closeModal()">Cancel</button>
        <button class="btn btn-primary" onclick="PWC.leSave(${idx!=null?idx:'null'})">${ic('save')}${ex?'Update section':'Add section'}</button></div>`,'xl');
    this.leFields(ex); this.leCalc();
  },
  leMode(m){ this._lemode=m; document.getElementById('le_mode_cat')?.classList.toggle('btn-primary',m==='catalogue');
    document.getElementById('le_mode_man')?.classList.toggle('btn-primary',m==='manual');
    const hint=$('#le_modehint'); if(hint)hint.textContent=m==='manual'?'kg/m calculated from the dimensions you enter.':'Uses standard catalogue kg/m.';
    this.leFields(null); this.leCalc(); },
  leToggleOverride(on){ this._leoverride=on; const w=$('#le_ovwrap'); if(w)w.style.display=on?'':'none'; this.leCalc(); },
  leType(k){ this._letype=k; this._lesel={}; const canManual=['shs','rhs','chs'].includes(k);
    if(!canManual)this._lemode='catalogue'; const mr=$('#le_moderow'); if(mr)mr.style.display=canManual?'':'none';
    this.leFields(null); this.leCalc(); },
  leFields(ex){ const t=this._letype; const c=$('#le_fields'); if(!c)return; const S=SECT[t]; let h='';
    const manual=this._lemode==='manual'&&['shs','rhs','chs'].includes(t);
    if(manual){
      const g=(id,lab,ph,dv)=>`<div class="field"><label>${lab}</label><input class="inp mono" id="le_${id}" type="number" min="0" step="0.001" value="${ex&&ex.manual&&ex.manual[id]!=null?ex.manual[id]:(dv!=null?dv:'')}" placeholder="${ph}" oninput="PWC.leCalc()"></div>`;
      if(t==='shs') h=`<div class="form-grid">${g('B','Size B = H (mm)','e.g. 100',100)}${g('T','Wall thickness T (mm)','e.g. 4',4)}${this.stockLenField(ex)}</div>`;
      else if(t==='rhs') h=`<div class="form-grid">${g('W','Width W (mm)','e.g. 100',100)}${g('H','Height H (mm)','e.g. 50',50)}${g('T','Wall thickness T (mm)','e.g. 4',4)}${this.stockLenField(ex)}</div>`;
      else h=`<div class="form-grid">${g('OD','Outside Ø OD (mm)','e.g. 60.3',60.3)}${g('T','Wall thickness T (mm)','e.g. 3.6',3.6)}${this.stockLenField(ex)}</div>`;
      c.innerHTML=h; return;
    }
    if(S.kind==='geo'){ // free-dimension bars/plate
      h=`<div class="form-grid">${S.fields.map(f=>`<div class="field"><label>${esc(f[1])} <span class="sub">(${f[2]})</span></label><input class="inp mono" id="le_${f[0]}" type="number" min="0" step="0.001" value="${ex&&ex.vals[f[0]]!=null?ex.vals[f[0]]:f[3]}" oninput="PWC.leCalc()"></div>`).join('')}</div>`;
    } else if(S.kind==='shs'||S.kind==='rhs'){ const sizes=sectSizes(t); const selSize=(ex&&ex.vals.size)||sizes[0];
      const thks=sectThk(t,selSize); const selThk=(ex&&ex.vals.t)||thks[0];
      h=`<div class="form-grid">
        <div class="field"><label>Size (${S.kind==='shs'?'a×a':'h×b'})</label><select class="sel" id="le_size" onchange="PWC.leSizeChange()">${sizes.map(s=>`<option value="${s}" ${s===selSize?'selected':''}>${s} mm</option>`).join('')}</select></div>
        <div class="field"><label>Wall thickness, t</label><select class="sel" id="le_t" onchange="PWC.leCalc()">${thks.map(x=>`<option value="${x}" ${x===+selThk?'selected':''}>${x} mm</option>`).join('')}</select></div>
        ${this.stockLenField(ex)}</div>`;
    } else { // profile (I-beams, channels, angles) — size dropdown + stock length
      const sizes=sectSizes(t); const selSize=(ex&&ex.vals.size)||sizes[0];
      h=`<div class="form-grid">
        <div class="field"><label>Designation</label><select class="sel" id="le_size" onchange="PWC.leCalc()">${sizes.map(s=>`<option value="${s}" ${s===selSize?'selected':''}>${t.toUpperCase()} ${s}</option>`).join('')}</select></div>
        ${this.stockLenField(ex)}</div>`; }
    c.innerHTML=h; },
  stockLenField(ex){ const L=ex?(ex.vals&&ex.vals.L!=null?ex.vals.L:6):6;
    const sl=ex&&ex.stockLen?ex.stockLen:6; const preset=[6,9,12].includes(+sl)?+sl:'custom';
    return `<div class="field"><label>Cut length, L (m)</label><input class="inp mono" id="le_L" type="number" min="0" step="0.001" value="${L}" oninput="PWC.leCalc()">
      <div class="hint">Length of each cut piece.</div></div>
      <div class="field"><label>Standard stock length</label><div style="display:flex;gap:8px">
      <select class="sel" id="le_Spreset" style="max-width:110px" onchange="PWC.leStockPreset(this.value)"><option value="6" ${preset===6?'selected':''}>6 m</option><option value="9" ${preset===9?'selected':''}>9 m</option><option value="12" ${preset===12?'selected':''}>12 m</option><option value="custom" ${preset==='custom'?'selected':''}>Custom…</option></select>
      <input class="inp mono" id="le_S" type="number" min="0.1" step="0.001" value="${sl}" oninput="PWC.leCalc()" ${preset!=='custom'?'readonly style="background:#f7f8fa"':''}></div>
      <div class="hint">Raw bar length purchased (used in nesting).</div></div>`; },
  leStockPreset(v){ const inp=$('#le_S'); if(!inp)return; if(v==='custom'){ inp.readOnly=false; inp.style.background=''; inp.focus(); } else { inp.value=v; inp.readOnly=true; inp.style.background='#f7f8fa'; this.leCalc(); } },
  leSizeChange(){ const t=this._letype; const size=val('le_size'); const thks=sectThk(t,size); const cur=+val('le_t');
    const sel=$('#le_t'); if(sel){ sel.innerHTML=thks.map(x=>`<option value="${x}" ${x===cur&&thks.includes(cur)?'selected':(x===thks[0]&&!thks.includes(cur)?'selected':'')}>${x} mm</option>`).join(''); }
    this.leCalc(); },
  leReadVals(){ const t=this._letype; const S=SECT[t]; const v={};
    const manual=this._lemode==='manual'&&['shs','rhs','chs'].includes(t);
    if(manual){ v.L=numval('le_L')||0; return v; } // manual dims read separately
    if(S.kind==='geo'){ S.fields.forEach(f=>v[f[0]]=numval('le_'+f[0])); }
    else if(S.kind==='shs'||S.kind==='rhs'){ v.size=val('le_size'); v.t=+val('le_t'); v.L=numval('le_L')||0; }
    else { v.size=val('le_size'); v.L=numval('le_L')||0; }
    return v; },
  leManualRes(){ const t=this._letype; const B=numval('le_B'),T=numval('le_T'),W=numval('le_W'),H=numval('le_H'),OD=numval('le_OD');
    if(t==='shs') return {r:manualSHS(B,T), dm:{shape:'shs',h:B,b:B,t:T}, dims:{B,T}};
    if(t==='rhs') return {r:manualRHS(W,H,T), dm:{shape:'rhs',h:H,b:W,t:T}, dims:{W,H,T}};
    return {r:manualCHS(OD,T), dm:{shape:'chs',od:OD,wall:T,label:'custom'}, dims:{OD,T}}; },
  leEffKgm(baseKgm){ if(this._leoverride){ const ov=numval('le_ovval'); return ov>0?ov:baseKgm; } return baseKgm; },
  leCalc(){ const t=this._letype; const S=SECT[t]; const q=Math.max(1,Math.round(numval('le_qty')||1));
    const manual=this._lemode==='manual'&&['shs','rhs','chs'].includes(t);
    let perM=0, lenM=0, dm=null, valid=true, errMsg='';
    if(manual){ const M=this.leManualRes(); lenM=numval('le_L')||0; dm=M.dm;
      if(!M.r.ok){ valid=false; errMsg=M.r.err; } else { perM=M.r.kgm; }
    } else if(S.kind==='geo'){ const v=this.leReadVals(); const r=sectWeight(t,v,this._lemat,undefined);
      perM=r.perM||0; lenM=(v.L||0); dm=Object.assign({shape:S.diag},v);
      // for geo, "piece" already includes length; handle below
      var geoPiece=r.piece;
    } else { const v=this.leReadVals(); const r=sectWeight(t,v,this._lemat,v.L||0); perM=r.perM||0; lenM=v.L||0; dm=sectDims(t,v); }
    const baseKgm=perM; const effKgm=this.leEffKgm(baseKgm);
    // material density scaling already in perM for catalogue; manual uses 7850 base — scale by material
    let piece;
    if(manual){ const rho=(TWC_MAT[this._lemat]||TWC_MAT.steel).d; piece=effKgm*(rho/7850)*lenM; }
    else if(S.kind==='geo'){ piece=(this._leoverride?effKgm*lenM:geoPiece); }
    else { piece=effKgm*lenM; }
    // sketch + dims
    const sk=$('#le_sketch'); if(sk&&dm) sk.innerHTML=sketchSVG(dm.shape||S.shape||S.diag,dm,{w:250,h:200});
    const dd=$('#le_dims'); if(dd){ if(manual){ dd.innerHTML=this.manualDimText(t,dm,effKgm,baseKgm,valid,errMsg); } else dd.innerHTML=this.dimText(t,dm,S)+(this._leoverride?` <span class="chip warn">override ${nfmt(effKgm,3)} kg/m</span>`:''); }
    const p=$('#le_prev'); const rate=Math.max(0,numval('le_rate')||0); const lineKg=piece*q; const lineCost=(lineKg/1000)*rate;
    if(p){ if(!valid){ p.innerHTML=`<span style="color:var(--red)">⚠ ${esc(errMsg)}</span>`; }
      else p.innerHTML=`Unit weight = <b class="num">${twcW(piece)}</b> kg${effKgm?` &nbsp;·&nbsp; ${twcW(effKgm)} kg/m`:''} &nbsp;→&nbsp; Line (${q} pcs) = <b class="num" style="color:var(--red)">${twcW(lineKg)}</b> kg`
        +(rate>0?`<br>Rate ${nfmt(rate,2)} AED/Ton &nbsp;→&nbsp; Line cost = <b class="num" style="color:var(--red)">${nfmt(lineCost,2)}</b> AED`:''); }
    this._lelast={valid,perM:effKgm,piece,lenM,dm,manual}; },
  manualDimText(t,dm,eff,base,valid,err){ if(!valid) return `<span style="color:var(--red)">⚠ ${esc(err)}</span>`;
    const ov=this._leoverride&&Math.abs(eff-base)>1e-9;
    const tag=`<span class="chip warn">custom</span>${ov?` <span class="chip warn">override</span>`:''}`;
    if(t==='shs') return `SHS ${dm.h}×${dm.b}×${dm.t} mm ${tag}<br>Calculated from custom dimensions · <b>${twcW(eff)} kg/m</b>${ov?` <span class="sub">(geometry ${nfmt(base,3)})</span>`:''}`;
    if(t==='rhs') return `RHS ${dm.h}×${dm.b}×${dm.t} mm ${tag}<br>Calculated from custom dimensions · <b>${twcW(eff)} kg/m</b>${ov?` <span class="sub">(geometry ${nfmt(base,3)})</span>`:''}`;
    return `Pipe Ø${dm.od}×${dm.wall} mm ${tag}<br>Calculated from custom dimensions · <b>${twcW(eff)} kg/m</b>${ov?` <span class="sub">(geometry ${nfmt(base,3)})</span>`:''}`; },
  leSave(idx){ const t=this._letype; const S=SECT[t]; const q=Math.max(1,Math.round(numval('le_qty')||1));
    const manual=this._lemode==='manual'&&['shs','rhs','chs'].includes(t);
    const rateTon=Math.max(0,numval('le_rate')||0); const stockLen=numval('le_S')||6;
    let vals, desc, perM, piece, manualDims=null;
    if(manual){ const M=this.leManualRes(); if(!M.r.ok){ toast(M.r.err,'bad'); return; }
      const lenM=numval('le_L')||0; if(lenM<=0){ toast('Enter cut length','bad'); return; }
      const base=M.r.kgm; perM=this.leEffKgm(base); const rho=(TWC_MAT[this._lemat]||TWC_MAT.steel).d;
      piece=perM*(rho/7850)*lenM; manualDims=M.dims; vals={L:lenM};
      desc=(t==='shs'?`SHS ${M.dims.B}×${M.dims.B}×${M.dims.T}`:t==='rhs'?`RHS ${M.dims.W}×${M.dims.H}×${M.dims.T}`:`Pipe Ø${M.dims.OD}×${M.dims.T}`)+` (custom) — L ${nfmt(lenM,3)} m`;
    } else {
      vals=this.leReadVals(); const lenM=(S.kind==='geo')?undefined:(vals.L||0);
      const r=sectWeight(t,vals,this._lemat,lenM); const base=r.perM||0; perM=this.leEffKgm(base);
      if(this._leoverride && perM>0){ piece=(S.kind==='geo')?perM*(vals.L||0):perM*(vals.L||0); }
      else piece=r.piece;
      if(piece<=0){ toast('Choose a valid section / dimensions','bad'); return; }
      desc=sectDesc(t,vals,lenM);
    }
    const lineKg=piece*q; const lineCost=(lineKg/1000)*rateTon;
    const line={id:uid('wl'),kind:'steel',typeKey:t,material:this._lemat,inputMode:manual?'manual':'catalogue',
      vals,manual:manualDims,overrideKgm:this._leoverride?perM:0,stockLen,qty:q,desc,unitKg:piece,perM,lineKg,rateTon,lineCost};
    if(idx==null||idx===undefined) this._lines.push(line); else this._lines[idx]=line;
    closeModal(); this.refreshLines(); },
  dimText(t,dm,S){ if(!dm)return ''; const std=S.std&&S.std!=='—'?` <span class="chip">${esc(S.std)}</span>`:'';
    if(S.kind==='geo'){ return `${esc(S.family)}${std}`; }
    if(dm.shape==='shs') return `SHS ${dm.h}×${dm.b}×${dm.t} mm${std}<br>Height h=${dm.h} · Width b=${dm.b} · Wall t=${dm.t} · <b>${twcW(dm.kgm)} kg/m</b>`;
    if(dm.shape==='rhs') return `RHS ${dm.h}×${dm.b}×${dm.t} mm${std}<br>h=${dm.h} · b=${dm.b} · Wall t=${dm.t} · <b>${twcW(dm.kgm)} kg/m</b>`;
    if(dm.shape==='chs') return `Pipe ${dm.label} — Ø${dm.od}×${dm.wall} mm${std}<br>OD=${dm.od} · Wall t=${dm.wall} · <b>${twcW(dm.kgm)} kg/m</b>`;
    if(dm.shape==='ibeam') return `${t.toUpperCase()} ${val('le_size')}${std}<br>h=${dm.h} · b=${dm.b} · web tw=${dm.tw} · flange tf=${dm.tf} · root r=${dm.r} · <b>${twcW(dm.kgm)} kg/m</b>`;
    if(dm.shape==='channel') return `${t.toUpperCase()} ${val('le_size')}${std}<br>h=${dm.h} · b=${dm.b} · web tw=${dm.tw} · flange tf=${dm.tf} · r=${dm.r} · <b>${twcW(dm.kgm)} kg/m</b>`;
    if(dm.shape==='eangle') return `Equal angle ${dm.a}×${dm.a}×${dm.t} mm${std}<br>Leg a=${dm.a} · Thickness t=${dm.t} · <b>${twcW(dm.kgm)} kg/m</b>`;
    if(dm.shape==='uangle') return `Unequal angle ${dm.a}×${dm.b}×${dm.t} mm${std}<br>Long a=${dm.a} · Short b=${dm.b} · t=${dm.t} · <b>${twcW(dm.kgm)} kg/m</b>`;
    return ''; },
  /* ---- cost-centre (non-steel) line items ---- */
  costEditor(idx){ const ex=(idx!=null&&this._lines[idx]&&this._lines[idx].kind==='cost')?this._lines[idx]:null;
    const categories=[...new Set([...COST_CATS,...this._lines.filter(l=>l.kind==='cost').map(l=>l.costCat),ex?.costCat].filter(Boolean))];
    const units=[...new Set([...COST_UNITS,...this._lines.filter(l=>l.kind==='cost').map(l=>l.unit),ex?.unit].filter(Boolean))];
    openModal(`<div class="modal-head"><div><h3>${ex?'Edit cost item':'Add cost item'}</h3><div class="msub">Non-steel cost — paint, galvanizing, consumables, labour…</div></div><button class="x" onclick="closeModal()">${ic('x')}</button></div>
      <div class="modal-body"><div class="form-grid">
        <div class="field"><label>Category</label><input class="inp" id="ci_cat" list="ci_categories" value="${esc(ex?.costCat||'')}" placeholder="Choose or type a category"><datalist id="ci_categories">${categories.map(c=>`<option value="${esc(c)}"></option>`).join('')}</datalist></div>
        <div class="field"><label>Unit</label><input class="inp" id="ci_unit" list="ci_units" value="${esc(ex?.unit||'')}" placeholder="Choose or type a unit"><datalist id="ci_units">${units.map(u=>`<option value="${esc(u)}"></option>`).join('')}</datalist></div>
        <div class="field full"><label>Description</label><input class="inp" id="ci_desc" value="${ex?esc(ex.desc||''):''}" placeholder="e.g. Two-coat epoxy paint system"></div>
        <div class="field"><label>Quantity</label><input class="inp mono" id="ci_qty" type="number" min="0" step="0.001" value="${ex?ex.qty:1}" oninput="PWC.ciCalc()"></div>
        <div class="field"><label>Unit cost (AED)</label><input class="inp mono" id="ci_uc" type="number" min="0" step="0.01" value="${ex?ex.unitCost:0}" oninput="PWC.ciCalc()"></div>
        <div class="field full"><label>Remarks <span class="sub">(optional)</span></label><input class="inp" id="ci_rem" value="${ex?esc(ex.remarks||''):''}"></div>
        <div class="field full"><div class="note" id="ci_prev">…</div></div>
      </div></div>
      <div class="modal-foot"><button class="btn btn-ghost" onclick="closeModal()">Cancel</button>
        <button class="btn btn-primary" onclick="PWC.costSave(${idx!=null?idx:'null'})">${ic('save')}${ex?'Update':'Add cost item'}</button></div>`,'lg');
    this.ciCalc(); },
  ciCalc(){ const q=numval('ci_qty')||0, uc=numval('ci_uc')||0; const p=$('#ci_prev');
    if(p)p.innerHTML=`Line cost = <b class="num" style="color:var(--red)">${nfmt(q*uc,2)}</b> AED`; },
  costSave(idx){ const costCat=val('ci_cat'); const unit=val('ci_unit'); const desc=val('ci_desc'); const remarks=val('ci_rem');
    const qty=Math.max(0,numval('ci_qty')||0); const unitCost=Math.max(0,numval('ci_uc')||0);
    if(!costCat||!unit||qty<=0||unitCost<=0){ toast('Enter category, unit, quantity and unit cost','bad'); return; }
    const line={id:uid('cc'),kind:'cost',costCat,unit,desc:desc||costCat,remarks,qty,unitCost,lineCost:qty*unitCost,unitKg:0,lineKg:0};
    if(idx==null||idx===undefined) this._lines.push(line); else this._lines[idx]=line;
    closeModal(); this.refreshLines(); },

  /* ==================== PLATE PARTS (2D) ==================== */
  tabPlates(){ const presets=['2000×1000','2500×1250','3000×1500','6000×1500','6000×2000','12000×2000'];
    return `<div class="card"><div class="card-body" style="padding:14px 16px">
      <div class="pill-legend" style="gap:14px;font-size:12px"><span><b>Step 1</b> Enter plate parts</span><span><b>2</b> Stock size</span><span><b>3</b> Rotation</span><span><b>4</b> Run</span><span><b>5</b> Review</span><span><b>6</b> Print</span></div></div>
    <div class="card" style="margin-top:12px"><div class="card-head"><div class="card-title">Plate parts <span class="muted">· for 2D nesting</span></div>
      <div style="display:flex;gap:8px;flex-wrap:wrap">
        <button class="btn btn-sm btn-primary" onclick="PWC.plateEditor()">${ic('plus')}Add plate part</button>
        <button class="btn btn-sm" onclick="PWC.tab('nesting')">${ic('calc')}Run nesting</button></div></div>
      <div class="tbl-wrap"><table class="tbl"><thead><tr>
        <th style="width:32px">#</th><th>Part name</th><th class="r">L (mm)</th><th class="r">W (mm)</th><th class="r">Thk</th><th class="r">Qty/set</th><th class="r">Total</th><th>Grade</th><th>Stock plate</th><th>Rotation</th><th class="r">Line kg</th><th class="r">Cost</th><th></th></tr></thead>
        <tbody id="pwcPlateLines"></tbody></table></div>
      <div class="card-pad" style="border-top:1px solid var(--line-2)"><div id="pwcPlateTotals"></div></div>
      <div class="note info" style="margin:0 16px 16px">Rectangular parts. Enter length &amp; width only — the engine auto-picks the best orientation when you nest. Parts group by thickness + grade + stock plate size.</div></div>`; },
  refreshPlates(){ const b=$('#pwcPlateLines'); const sets=Math.max(1,this._sets||1); if(!b)return;
    const rotLbl={auto:'Auto',rot90:'90° only',lock:'Locked',grain:'Grain'};
    b.innerHTML=this._plates.length?this._plates.map((p,i)=>{ const uk=plateWeightKg(p.l,p.w,p.t); const lk=uk*p.qty; const lc=(lk/1000)*(+p.rateTon||0);
      const stock=(p.stockL&&p.stockW)?`${p.stockL}×${p.stockW}`:'default';
      return `<tr><td class="code">${i+1}</td><td>${esc(p.label)}${p.remarks?`<div class="sub">${esc(p.remarks)}</div>`:''}</td>
        <td class="qty">${nfmt(p.l,0)}</td><td class="qty">${nfmt(p.w,0)}</td><td class="qty">${nfmt(p.t,1)}</td><td class="qty">${intfmt(p.qty)}</td><td class="qty">${intfmt(p.qty*sets)}</td>
        <td class="sub">${esc(p.grade||'—')}</td><td class="sub">${esc(stock)}</td><td><span class="chip">${rotLbl[p.rotationMode||'auto']}</span></td>
        <td class="qty" style="font-weight:700">${twcW(lk)}</td><td class="qty">${lc?nfmt(lc,2):'—'}</td>
        <td><div class="row-actions"><button class="icon-btn" title="Duplicate" onclick="PWC.dupPlate(${i})">${ic('copy')||'⧉'}</button><button class="icon-btn" onclick="PWC.plateEditor(${i})">${ic('edit')}</button><button class="icon-btn" onclick="PWC.rmPlate(${i})">${ic('x')}</button></div></td></tr>`;}).join('')
      :`<tr><td colspan="13" class="empty" style="padding:24px">No plate parts yet — click “Add plate part”.</td></tr>`;
    const t=$('#pwcPlateTotals'); if(t){ const kg=this._plates.reduce((s,p)=>s+plateWeightKg(p.l,p.w,p.t)*p.qty,0);
      const cost=this._plates.reduce((s,p)=>s+(plateWeightKg(p.l,p.w,p.t)*p.qty/1000)*(+p.rateTon||0),0);
      t.innerHTML=`<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:10px">
        <div class="kpi k-ink"><div class="kl">Plate weight / unit</div><div class="kv">${nfmt(kg,2)} <span style="font-size:12px">kg</span></div></div>
        <div class="kpi k-ink"><div class="kl">Plate cost / unit</div><div class="kv">${nfmt(cost,2)}<span style="font-size:11px"> AED</span></div></div>
        <div class="kpi k-red"><div class="kl">Batch × ${sets}</div><div class="kv">${nfmt(cost*sets,2)}<span style="font-size:11px"> AED</span></div><div class="kf">${nfmt(kg*sets,1)} kg</div></div></div>`; }
  },
  rmPlate(i){ this._plates.splice(i,1); this.refreshPlates(); },
  dupPlate(i){ const p=this._plates[i]; if(!p)return; const c=Object.assign({},p); c.id=uid('pl'); c.label=p.label+' (copy)'; this._plates.splice(i+1,0,c); this.refreshPlates(); },
  plateEditor(idx){ const ex=(idx!=null)?this._plates[idx]:null;
    const presets=['2000×1000','2500×1250','3000×1500','6000×1500','6000×2000','12000×2000'];
    const curStock=(ex&&ex.stockL&&ex.stockW)?`${ex.stockL}×${ex.stockW}`:'default';
    openModal(`<div class="modal-head"><div><h3>${ex?'Edit plate part':'Add plate part'}</h3><div class="msub">Rectangular plate for 2D nesting — enter L &amp; W only</div></div><button class="x" onclick="closeModal()">${ic('x')}</button></div>
      <div class="modal-body"><div class="form-grid">
        <div class="field full"><label>Part name <span class="req">*</span></label><input class="inp" id="pl_name" value="${ex?esc(ex.label):''}" placeholder="e.g. Base plate / Gusset A"></div>
        <div class="field"><label>Length (mm)</label><input class="inp mono" id="pl_l" type="number" min="1" step="1" value="${ex?ex.l:300}" oninput="PWC.plCalc()"></div>
        <div class="field"><label>Width (mm)</label><input class="inp mono" id="pl_w" type="number" min="1" step="1" value="${ex?ex.w:200}" oninput="PWC.plCalc()"></div>
        <div class="field"><label>Thickness (mm)</label><input class="inp mono" id="pl_t" type="number" min="0.1" step="0.1" value="${ex?ex.t:10}" oninput="PWC.plCalc()"></div>
        <div class="field"><label>Quantity / set</label><input class="inp mono" id="pl_qty" type="number" min="1" step="1" value="${ex?ex.qty:1}" oninput="PWC.plCalc()"></div>
        <div class="field"><label>Material grade</label><input class="inp" id="pl_grade" value="${ex?esc(ex.grade||'S275JR'):'S275JR'}"></div>
        <div class="field"><label>Tonnage rate (AED/Ton)</label><input class="inp mono" id="pl_rate" type="number" min="0" step="0.01" value="${ex?ex.rateTon:0}" oninput="PWC.plCalc()"></div>
        <div class="field"><label>Stock plate size (mm)</label><input class="inp" id="pl_stock" list="pl_stock_sizes" value="${esc(curStock==='default'?'':curStock)}" placeholder="Nesting default or L×W"><datalist id="pl_stock_sizes">${presets.map(s=>`<option value="${s}"></option>`).join('')}</datalist></div>
        <div class="field"><label>Rotation mode</label><select class="sel" id="pl_rot"><option value="auto" ${(!ex||ex.rotationMode==='auto')?'selected':''}>Auto (best)</option><option value="rot90" ${ex&&ex.rotationMode==='rot90'?'selected':''}>90° only</option><option value="lock" ${ex&&ex.rotationMode==='lock'?'selected':''}>Lock orientation</option><option value="grain" ${ex&&ex.rotationMode==='grain'?'selected':''}>Grain locked</option></select></div>
        <div class="field full"><label>Remarks</label><input class="inp" id="pl_rem" value="${ex?esc(ex.remarks||''):''}"></div>
        <div class="field full"><div class="note" id="pl_prev">…</div></div>
      </div></div>
      <div class="modal-foot"><button class="btn btn-ghost" onclick="closeModal()">Cancel</button>
        <button class="btn btn-primary" onclick="PWC.plateSave(${idx!=null?idx:'null'})">${ic('save')}${ex?'Update':'Add plate'}</button></div>`,'lg');
    this.plCalc(); },
  plCalc(){ const l=numval('pl_l'),w=numval('pl_w'),t=numval('pl_t'),q=Math.max(1,numval('pl_qty')||1),rate=numval('pl_rate')||0;
    const uk=plateWeightKg(l,w,t); const lk=uk*q; const lc=(lk/1000)*rate; const p=$('#pl_prev');
    if(p)p.innerHTML=`Area ${nfmt(l*w/1e6,4)} m² · Unit = <b class="num">${twcW(uk)}</b> kg · Line (${q}) = <b class="num" style="color:var(--red)">${twcW(lk)}</b> kg${rate?` · Cost = <b class="num" style="color:var(--red)">${nfmt(lc,2)}</b> AED`:''}`; },
  plateSave(idx){ const label=val('pl_name'); if(!label){ toast('Enter part name','bad'); return; }
    const l=numval('pl_l'),w=numval('pl_w'),t=numval('pl_t'),qty=Math.max(1,Math.round(numval('pl_qty')||1));
    if(l<=0||w<=0||t<=0){ toast('Enter valid dimensions','bad'); return; }
    let stockL=null,stockW=null; const st=val('pl_stock'); if(st){
      const match=st.match(/^(\d+(?:\.\d+)?)\s*[×xX]\s*(\d+(?:\.\d+)?)$/);
      if(!match||+match[1]<=0||+match[2]<=0){toast('Enter stock plate size as length × width in mm.','bad');return;}
      stockL=+match[1];stockW=+match[2];
    }
    const plate={id:(idx!=null&&this._plates[idx]?this._plates[idx].id:uid('pl')),label,l,w,t,qty,grade:val('pl_grade'),rateTon:Math.max(0,numval('pl_rate')||0),stockL,stockW,rotationMode:val('pl_rot')||'auto',remarks:val('pl_rem')};
    if(idx==null||idx===undefined) this._plates.push(plate); else this._plates[idx]=plate;
    closeModal(); this.refreshPlates(); },

  /* ==================== NESTING (1D + 2D) ==================== */
  tabNesting(){ return `<div class="card"><div class="card-head"><div class="card-title">Nesting setup</div><span class="muted">1D bars + 2D plates</span></div><div class="card-body">
      <div class="form-grid">
        <div class="field"><label>Kerf — saw/cut width (mm)</label><input class="inp mono" id="pn_kerf" type="number" min="0" step="0.1" value="5"><div class="hint">Lost per cut. Typical 3–6 mm.</div></div>
        <div class="field"><label>Min. reusable off-cut (mm)</label><input class="inp mono" id="pn_minoff" type="number" min="0" step="1" value="500"><div class="hint">Remnants ≥ this are reusable, not scrap.</div></div>
        <div class="field"><label>Plate margin (mm)</label><input class="inp mono" id="pn_margin" type="number" min="0" step="1" value="10"><div class="hint">Clear edge band on every plate.</div></div>
        <div class="field"><label>Rotation mode</label><select class="sel" id="pn_rot">
          <option value="auto">Auto — best orientation</option><option value="rot90">Allow 90° rotation only</option>
          <option value="lock">Lock original orientation</option><option value="grain">Grain direction locked</option></select>
          <div class="hint">Auto tests both orientations and picks best utilization.</div></div>
        <div class="field"><label>Default plate stock size</label><select class="sel" id="pn_plate">
          ${['2000×1000','2500×1250','3000×1500','6000×1500','6000×2000','12000×2000'].map(s=>`<option value="${s}" ${s==='2500×1250'?'selected':''}>${s} mm</option>`).join('')}
          <option value="custom">Custom…</option></select><div class="hint">Used when a plate part has no stock size of its own.</div></div>
        <div class="field" id="pn_customplate" style="display:none"><label>Custom plate L × W (mm)</label><div style="display:flex;gap:8px"><input class="inp mono" id="pn_pl" type="number" value="2500" placeholder="L"><input class="inp mono" id="pn_pw" type="number" value="1250" placeholder="W"></div></div>
      </div>
      <div class="note info" style="margin-top:6px"><b>Steps:</b> 1 Enter plate parts → 2 Select stock size → 3 Choose rotation → 4 Run → 5 Review utilization → 6 Print cutting report. Parts are grouped by thickness + grade + stock size (never mixed).</div>
      <div style="display:flex;justify-content:flex-end;margin-top:8px"><button class="btn btn-primary" onclick="PWC.runNesting()">${ic('calc')}Run full nesting (1D + 2D)</button></div>
    </div></div>
    <div id="pn_result" style="margin-top:16px">${this._nest?this.nestResultHtml():'<div class="note">Set options and run nesting to optimise stock bars and plates for the batch.</div>'}</div>`; },
  nestWire(){ const sel=$('#pn_plate'); if(sel)sel.onchange=()=>{ const cp=$('#pn_customplate'); if(cp)cp.style.display=sel.value==='custom'?'':'none'; }; },
  /* group steel lines for 1D nesting (handles catalogue + manual) */
  steelGroups(){ const sets=Math.max(1,this._sets||1); const map={};
    for(const l of this._lines.filter(x=>x.kind!=='cost'&&twcIsLinear(x.typeKey))){
      const label=this.lineLabel(l); const stock=l.stockLen||6;
      const key=l.typeKey+'|'+label+'|'+l.material+'|'+stock;
      if(!map[key])map[key]={key,typeKey:l.typeKey,material:l.material,label,perM:l.perM||0,stockLen:stock,rateTon:l.rateTon||0,cuts:[]};
      map[key].cuts.push({len:twcCutLenM(l.typeKey,l.vals),qty:l.qty*sets,label:l.desc}); }
    return Object.values(map); },
  lineLabel(l){ if(l.inputMode==='manual'&&l.manual){ const m=l.manual;
      if(l.typeKey==='shs')return `SHS ${m.B}×${m.B}×${m.T} (custom)`;
      if(l.typeKey==='rhs')return `RHS ${m.W}×${m.H}×${m.T} (custom)`;
      return `Pipe Ø${m.OD}×${m.T} (custom)`; }
    return twcSectionLabel(l.typeKey,l.vals); },
  runNesting(){ const sets=Math.max(1,this._sets||1); const kerf=Math.max(0,numval('pn_kerf')); const minOff=Math.max(0,numval('pn_minoff'));
    // ---- 1D ----
    const groups=this.steelGroups(); const oneD=[];
    for(const g of groups){ const cuts=g.cuts.map(c=>({len:c.len,qty:c.qty,label:c.label}));
      const res=nest1D(cuts,[{len:g.stockLen}],{kerf:kerf/1000,minOffcut:minOff/1000});
      const reqPieces=g.cuts.reduce((s,c)=>s+c.qty,0);
      const placedPieces=res.bars.reduce((s,b)=>s+b.cuts.length,0);
      const purchasedLen=res.newBarCount*g.stockLen; const cutLen=res.totalCutLen;
      const reusableLen=(res.usableOffcuts||[]).reduce((s,x)=>s+x,0);
      const wasteLen=Math.max(0,purchasedLen-cutLen-reusableLen); const wasteKg=wasteLen*g.perM;
      const kg=res.newBarCount*g.stockLen*g.perM; const cost=(kg/1000)*g.rateTon;
      oneD.push({g,res,reqPieces,placedPieces,kerf:kerf/1000,purchasedLen,cutLen,reusableLen,wasteLen,wasteKg,
        wastePct:purchasedLen>0?wasteLen/purchasedLen:0,kg,cost,wasteCost:(wasteKg/1000)*g.rateTon}); }
    // ---- 2D plates: group by thickness + grade + stock size ----
    const gMode=val('pn_rot')||'auto'; const margin=Math.max(0,numval('pn_margin'));
    let defPlate; const psel=val('pn_plate');
    if(psel==='custom'){ defPlate={L:numval('pn_pl')||2500,W:numval('pn_pw')||1250}; }
    else if(psel){ const [L,W]=psel.split('×').map(Number); defPlate={L,W}; } else defPlate={L:2500,W:1250};
    const partsAgg={};
    this._plates.forEach(p=>{ const sL=p.stockL||defPlate.L, sW=p.stockW||defPlate.W;
      const key=p.t+'|'+(p.grade||'')+'|'+sL+'x'+sW;
      if(!partsAgg[key])partsAgg[key]={t:p.t,grade:p.grade,rateTon:p.rateTon,stock:{L:sL,W:sW},parts:[]};
      partsAgg[key].parts.push({id:p.id,label:p.label,l:p.l,w:p.w,qty:p.qty*sets,rotationMode:p.rotationMode||gMode}); });
    const twoD=[];
    for(const key in partsAgg){ const grp=partsAgg[key];
      const res=nest2D(grp.parts,grp.stock,{margin,kerf,rotationMode:gMode});
      const m=metrics2D(res,grp.t,grp.rateTon||0);
      const v=verify2D(grp.parts.map(p=>({id:p.id,qty:p.qty})),res);
      twoD.push({grp,res,plateSize:grp.stock,plateKgEach:m.stockWeightEach,purchaseKg:m.purchaseWeight,usedKg:m.usedWeight,
        wasteKg:m.wasteWeight,wastePct:m.wastePct/100,util:m.utilization/100,usedArea:m.usedArea,wasteArea:m.wasteArea,
        cost:m.purchaseCost,usedCost:m.usedCost,wasteCost:m.wasteValue,verify:v,metrics:m,rotatedCount:res.rotatedCount}); }
    // ---- verification ----
    const v1=verify1D(groups,oneD.map(o=>({label:o.g.label,reqPieces:o.reqPieces,placedPieces:o.placedPieces,bars:o.res.bars,kerf:o.kerf})));
    const allErrors=[...v1.errors]; twoD.forEach(t=>{ if(!t.verify.pass) allErrors.push(...t.verify.errors.map(e=>`[t${t.grp.t}] `+e)); });
    const verifyPass=allErrors.length===0;
    this._nest={sets,kerf,minOff,margin,rotMode:gMode,oneD,twoD,plateSize:defPlate,verifyPass,errors:allErrors,when:new Date().toISOString(),
      totBars:oneD.reduce((s,o)=>s+o.res.newBarCount,0), totBarKg:oneD.reduce((s,o)=>s+o.kg,0),
      totBarCost:oneD.reduce((s,o)=>s+o.cost,0), totBarWasteKg:oneD.reduce((s,o)=>s+o.wasteKg,0),
      totPlates:twoD.reduce((s,t)=>s+t.res.plateCount,0), totPlateKg:twoD.reduce((s,t)=>s+t.purchaseKg,0),
      totPlateCost:twoD.reduce((s,t)=>s+t.cost,0), totPlateWasteKg:twoD.reduce((s,t)=>s+t.wasteKg,0),
      totRotated:twoD.reduce((s,t)=>s+(t.rotatedCount||0),0), totOversize:twoD.reduce((s,t)=>s+t.res.unplaced.length,0)};
    const box=$('#pn_result'); if(box)box.innerHTML=this.nestResultHtml();
    toast(verifyPass?'Nesting complete — verification PASSED':'Nesting done — verification FAILED', verifyPass?'ok':'warn'); },
  nestResultHtml(){ const N=this._nest; if(!N)return '';
    const vbadge=N.verifyPass?`<span class="chip ok" style="font-size:13px">✓ Verification PASSED</span>`
      :`<span class="chip bad" style="font-size:13px">✗ Verification FAILED</span>`;
    const errs=N.errors.length?`<div class="note" style="border-left-color:var(--bad);margin-top:10px"><b>Issues:</b><ul style="margin:6px 0 0 18px">${N.errors.slice(0,12).map(e=>`<li>${esc(e)}</li>`).join('')}</ul></div>`:'';
    const kpi=(c,l,v,f)=>`<div class="kpi ${c}"><div class="kl">${l}</div><div class="kv" style="font-size:20px">${v}</div><div class="kf">${f||''}</div></div>`;
    const totWasteKg=N.totBarWasteKg+N.totPlateWasteKg; const totKg=N.totBarKg+N.totPlateKg;
    // 1D detail
    const oneDhtml=N.oneD.map(o=>{ const pat={}; o.res.bars.forEach(b=>{ const sig=b.cuts.map(c=>c.len.toFixed(3)).sort().join(','); if(!pat[sig])pat[sig]={n:0,b}; pat[sig].n++; });
      const rows=Object.values(pat).map(p=>`<tr><td><span class="tag">× ${p.n}</span></td><td>${this.barMap(p.b,o.g.stockLen,o.kerf,N.minOff/1000)}</td><td class="qty">${nfmt(p.b.stockLen||o.g.stockLen,2)} m</td></tr>`).join('');
      return `<div class="card" style="margin-top:12px"><div class="card-head"><div class="card-title">${esc(o.g.label)} <span class="muted">· ${esc((TWC_MAT[o.g.material]||TWC_MAT.steel).n)} · ${twcW(o.g.perM)} kg/m · stock ${nfmt(o.g.stockLen,0)}m</span></div>
        <div class="pill-legend"><span><b>${o.res.newBarCount}</b> bars</span><span>util <b>${nfmt(o.res.utilization*100,1)}%</b></span><span>scrap <b>${nfmt(o.wastePct*100,1)}%</b></span><span><b>${nfmt(o.kg,1)}</b> kg</span>${o.cost?`<span><b>${nfmt(o.cost,2)}</b> AED</span>`:''}</div></div>
        <div class="card-body"><table class="tbl"><thead><tr><th style="width:60px">Bars</th><th>Cutting pattern</th><th class="r" style="width:80px">Stock</th></tr></thead><tbody>${rows}</tbody></table></div></div>`; }).join('');
    // 2D detail
    const twoDhtml=N.twoD.map(t=>{ const platesVis=t.res.plates.slice(0,8).map((pl,i)=>this.plateMap(pl,t.plateSize,i,t.grp.t)).join('');
      const msgs=[]; if(t.rotatedCount>0) msgs.push(`${t.rotatedCount} part(s) rotated automatically for better utilization.`);
      if(t.res.unplaced.length) msgs.push(`${t.res.unplaced.length} part(s) cannot fit in the ${t.plateSize.L}×${t.plateSize.W} plate — use a larger sheet.`);
      if(t.util<0.55 && t.res.plateCount>0) msgs.push('High waste detected — try another stock plate size.');
      const utilColor=t.util>=0.8?'k-ok':t.util>=0.6?'k-yellow':'k-red';
      return `<div class="card" style="margin-top:12px"><div class="card-head"><div class="card-title">Plate t=${t.grp.t}mm ${esc(t.grp.grade||'')} <span class="muted">· stock ${t.plateSize.L}×${t.plateSize.W} mm</span></div>
        <div class="pill-legend"><span><b>${t.res.plateCount}</b> plates</span><span>util <b>${nfmt(t.util*100,1)}%</b></span><span>scrap <b>${nfmt(t.wastePct*100,1)}%</b></span><span><b>${nfmt(t.purchaseKg,1)}</b> kg</span>${t.cost?`<span><b>${nfmt(t.cost,2)}</b> AED</span>`:''}${t.verify.pass?'<span class="chip ok">✓ verified</span>':'<span class="chip bad">✗ failed</span>'}</div></div>
        <div class="card-body">
          <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(120px,1fr));gap:8px;margin-bottom:12px">
            <div class="kpi ${utilColor}" style="padding:8px"><div class="kl">Utilization</div><div class="kv" style="font-size:17px">${nfmt(t.util*100,1)}%</div></div>
            <div class="kpi k-ink" style="padding:8px"><div class="kl">Used area</div><div class="kv" style="font-size:15px">${nfmt(t.usedArea/1e6,3)} m²</div></div>
            <div class="kpi k-yellow" style="padding:8px"><div class="kl">Waste area</div><div class="kv" style="font-size:15px">${nfmt(t.wasteArea/1e6,3)} m²</div></div>
            <div class="kpi k-yellow" style="padding:8px"><div class="kl">Waste weight</div><div class="kv" style="font-size:15px">${nfmt(t.wasteKg,1)} kg</div></div>
            <div class="kpi k-red" style="padding:8px"><div class="kl">Waste AED</div><div class="kv" style="font-size:15px">${nfmt(t.wasteCost,2)}</div></div>
          </div>
          <div style="display:flex;flex-wrap:wrap;gap:14px;overflow:auto">${platesVis}</div>${t.res.plateCount>8?`<div class="sub" style="margin-top:8px">+ ${t.res.plateCount-8} more plates (same or similar pattern)</div>`:''}
          ${msgs.map(m=>`<div class="note" style="margin-top:8px;border-left-color:${m.includes('cannot fit')||m.includes('High waste')?'var(--bad)':'var(--gold,#B7791F)'}">${esc(m)}</div>`).join('')}
        </div></div>`; }).join('');
    const successMsg=N.verifyPass?`<div class="note" style="border-left-color:var(--ok);margin-top:10px">✓ Verification passed. Cutting list is ready to print.</div>`:'';
    return `<div class="card"><div class="card-body">
      <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:10px;margin-bottom:12px">
        <div style="font-weight:700">Nesting result · ${N.sets} sets · kerf ${N.kerf}mm · margin ${N.margin}mm · rotation ${esc(({auto:'Auto best',rot90:'90° only',lock:'Locked',grain:'Grain locked'})[N.rotMode]||N.rotMode)}</div>${vbadge}</div>
      <div class="kpis">
        ${kpi('k-red','Bars to buy',intfmt(N.totBars),nfmt(N.totBarKg,0)+' kg')}
        ${kpi('k-red','Plates to buy',intfmt(N.totPlates),nfmt(N.totPlateKg,0)+' kg')}
        ${kpi('k-ink','Total raw weight',nfmt(totKg,0)+' kg',nfmt(totKg/1000,3)+' t')}
        ${kpi('k-yellow','Scrap wastage',nfmt(totKg>0?totWasteKg/totKg*100:0,1)+'%',nfmt(totWasteKg,1)+' kg')}
        ${kpi('k-red','Raw cost',nfmt(N.totBarCost+N.totPlateCost,2),'AED')}
      </div>${errs}${successMsg}
      <div style="display:flex;gap:10px;margin-top:14px;flex-wrap:wrap">
        <button class="btn" onclick="PWC.cuttingList()">${ic('grid')}Cutting list</button>
        <button class="btn" onclick="PWC.tab('purchase')">${ic('cart')}Purchase list</button>
        <button class="btn" onclick="PWC.printReport('nest2d')">${ic('pdf')}2D layout report</button>
        <button class="btn" onclick="PWC.printReport('platewaste')">${ic('pdf')}Wastage report</button>
        <button class="btn btn-dark" onclick="PWC.exportPDF()">${ic('pdf')}Export PDF (drawings)</button>
        <button class="btn btn-dark" onclick="PWC.exportDXF('single')">${ic('layers')}DXF — all sheets</button>
        <button class="btn" onclick="PWC.exportDXF('persheet')">${ic('layers')}DXF — per sheet</button></div>
      </div></div>${oneDhtml}${twoDhtml}`; },
  barMap(b,stockLen,kerf,minOff){ const L=b.stockLen||stockLen; const segs=[]; let x=0;
    b.cuts.forEach((c,i)=>{ if(i>0){segs.push(`<div style="width:${(kerf/L*100).toFixed(2)}%;background:repeating-linear-gradient(-45deg,#999 0 3px,#777 3px 6px)"></div>`);x+=kerf;}
      segs.push(`<div style="width:${(c.len/L*100).toFixed(2)}%;background:var(--graphite-3,#2a2f37);color:#fff;font-size:10px;display:grid;place-items:center;border-right:1px solid #12151a" title="${esc(c.label||'')} ${nfmt(c.len,3)}m">${nfmt(c.len,2)}</div>`);x+=c.len; });
    const rem=L-x; if(rem>0.0005)segs.push(`<div style="width:${(rem/L*100).toFixed(2)}%;background:${rem>=minOff?'var(--ok-bg,#d6f0dd)':'var(--bad-bg,#f6d9d9)'};color:${rem>=minOff?'#12692c':'#a82020'};font-size:10px;display:grid;place-items:center" title="${rem>=minOff?'reusable':'scrap'} ${nfmt(rem,3)}m">${nfmt(rem,2)}</div>`);
    return `<div style="display:flex;height:24px;border:1px solid var(--line);border-radius:4px;overflow:hidden">${segs.join('')}</div>`; },
  plateMap(pl,stock,idx,thk){ const maxW=190; const SC=Math.min(maxW/stock.L, 130/stock.W); const w=stock.L*SC, h=stock.W*SC;
    const shades=['#2a2f37','#3a4250','#4a5568','#5a6478','#6b7280','#454b57'];
    const used=pl.parts.reduce((s,p)=>s+p.l*p.w,0); const util=(used/(stock.L*stock.W)*100);
    const parts=pl.parts.map((p,i)=>{ const bg=shades[i%shades.length];
      const showLabel=p.l*SC>26&&p.w*SC>12;
      return `<div style="position:absolute;left:${(p.x*SC).toFixed(1)}px;top:${(p.y*SC).toFixed(1)}px;width:${Math.max(2,p.l*SC-1).toFixed(1)}px;height:${Math.max(2,p.w*SC-1).toFixed(1)}px;background:${bg};border:1px solid #0d0f13;color:#fff;font-size:7px;overflow:hidden;display:grid;place-items:center;line-height:1.1" title="${esc(p.label)} · ${p.l}×${p.w}mm${p.rot?' (rotated 90°)':''}">${showLabel?`<span>${esc(p.label).slice(0,10)}${p.rot?' ↻':''}</span>`:(p.rot?'↻':'')}</div>`; }).join('');
    return `<div style="flex:0 0 auto"><div style="position:relative;width:${w.toFixed(0)}px;height:${h.toFixed(0)}px;background:#eef1f4;border:1.5px solid #1E232B;border-radius:3px">${parts}</div>
      <div class="sub" style="text-align:center;margin-top:3px;font-size:10px">Plate ${idx+1} · ${pl.parts.length} parts · ${nfmt(util,0)}%</div></div>`; },

  /* ==================== PURCHASE TAB ==================== */
  tabPurchase(){ if(!this._nest) return `<div class="card"><div class="card-body">${emptyState('cart','No nesting result yet','Run nesting first to generate the purchase list.',`<button class="btn btn-primary" onclick="PWC.tab('nesting')">${ic('calc')}Go to Nesting</button>`)}</div></div>`;
    const N=this._nest;
    const barRows=N.oneD.map((o,i)=>`<tr><td class="code">${i+1}</td><td>${esc(o.g.label)}</td><td>${esc((TWC_MAT[o.g.material]||TWC_MAT.steel).n)}</td><td class="r">${nfmt(o.g.stockLen,2)} m</td><td class="r">${intfmt(o.res.newBarCount)}</td><td class="r">${nfmt(o.kg,1)}</td><td class="r">${o.g.rateTon?nfmt(o.g.rateTon,2):'—'}</td><td class="r">${o.cost?nfmt(o.cost,2):'—'}</td></tr>`).join('');
    const plateRows=N.twoD.map((t,i)=>`<tr><td class="code">${i+1}</td><td>Plate t=${t.grp.t}mm ${esc(t.grp.grade||'')}</td><td>${t.plateSize.L}×${t.plateSize.W}</td><td class="r">—</td><td class="r">${intfmt(t.res.plateCount)}</td><td class="r">${nfmt(t.purchaseKg,1)}</td><td class="r">${t.grp.rateTon?nfmt(t.grp.rateTon,2):'—'}</td><td class="r">${t.cost?nfmt(t.cost,2):'—'}</td></tr>`).join('');
    const costs=this._lines.filter(l=>l.kind==='cost'); const sets=N.sets;
    const costRows=costs.map((l,i)=>`<tr><td class="code">${i+1}</td><td>${esc(l.desc||l.costCat)}</td><td>${esc(l.costCat)}</td><td class="r">${nfmt(l.qty*sets,2)} ${esc(l.unit||'')}</td><td class="r">${nfmt(l.unitCost,2)}</td><td class="r">${nfmt(l.lineCost*sets,2)}</td></tr>`).join('');
    return `<div class="card"><div class="card-head"><div class="card-title">Purchase list <span class="muted">· ${sets} sets</span></div>
      <button class="btn btn-sm btn-dark" onclick="PWC.printReport('purchase')">${ic('pdf')}Print</button></div>
      <div class="card-body"><div class="eyebrow" style="margin-bottom:6px">Steel — long products</div>
      <table class="tbl"><thead><tr><th>#</th><th>Section</th><th>Material</th><th class="r">Stock len</th><th class="r">Bars</th><th class="r">Weight kg</th><th class="r">AED/T</th><th class="r">Cost AED</th></tr></thead><tbody>${barRows||'<tr><td colspan="8" class="sub">None</td></tr>'}</tbody></table>
      <div class="eyebrow" style="margin:16px 0 6px">Steel — plates</div>
      <table class="tbl"><thead><tr><th>#</th><th>Plate</th><th>Stock size</th><th class="r">—</th><th class="r">Plates</th><th class="r">Weight kg</th><th class="r">AED/T</th><th class="r">Cost AED</th></tr></thead><tbody>${plateRows||'<tr><td colspan="8" class="sub">None</td></tr>'}</tbody></table>
      ${costRows?`<div class="eyebrow" style="margin:16px 0 6px">Non-steel cost items</div><table class="tbl"><thead><tr><th>#</th><th>Item</th><th>Category</th><th class="r">Qty</th><th class="r">Unit price</th><th class="r">Total AED</th></tr></thead><tbody>${costRows}</tbody></table>`:''}
      <div class="kpis" style="margin-top:14px">
        <div class="kpi k-red"><div class="kl">Steel purchase cost</div><div class="kv">${nfmt(N.totBarCost+N.totPlateCost,2)}<span style="font-size:11px"> AED</span></div></div>
        <div class="kpi k-yellow"><div class="kl">Cost items (batch)</div><div class="kv">${nfmt(costs.reduce((s,l)=>s+l.lineCost*sets,0),2)}<span style="font-size:11px"> AED</span></div></div>
        <div class="kpi k-ink"><div class="kl">Scrap wastage</div><div class="kv">${nfmt(N.totBarWasteKg+N.totPlateWasteKg,1)}<span style="font-size:11px"> kg</span></div></div>
      </div></div></div>`; },

  /* ==================== REPORTS TAB ==================== */
  tabReports(){ const reps=[
      ['costing','Product costing summary','Per-unit and batch cost with category breakdown'],
      ['breakdown','Full product breakdown','Every steel, plate and cost line'],
      ['weight','Steel weight calculation','Weights per line with kg/m and dimensions'],
      ['nest1d','1D nesting report','Bar cutting plan & purchase'],
      ['nest2d','2D plate nesting report','Plate layout & purchase'],
      ['platewaste','Plate wastage report','Per-group utilization & waste AED'],
      ['cutting','Cutting list','Per-piece cut schedule'],
      ['purchase','Purchase list','Raw material to buy'],
      ['supervisor','Supervisor production report','Shop-floor summary'],
      ['costcenter','Cost centre / consumables','Non-steel costs'],
      ['estimation','Full project estimation','Complete costed estimate'] ];
    return `<div class="card"><div class="card-head"><div class="card-title">Printable reports</div></div>
      <div class="card-body"><div class="note info" style="margin-bottom:12px">Each report opens a clean print view with the AM Building Solutions header. Save the product first for the document number to appear.</div>
      <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:12px">
        ${reps.map(([k,title,sub])=>`<div class="card" style="margin:0"><div class="card-body" style="padding:14px">
          <div style="font-weight:700">${title}</div><div class="sub" style="margin:4px 0 10px">${sub}</div>
          <button class="btn btn-sm btn-primary" style="width:100%" onclick="PWC.printReport('${k}')">${ic('pdf')}Print / preview</button></div></div>`).join('')}
      </div></div></div>
    <div class="card" style="margin-top:14px"><div class="card-head"><div class="card-title">Exports <span class="muted">· generated files</span></div></div>
      <div class="card-body"><div class="note info" style="margin-bottom:12px">Generated PDF has scaled sheet drawings. DXF is real CAD geometry (closed polylines on layers SHEET_BOUNDARY / CUT_PARTS / PART_LABELS / CUT_SEQUENCE) — opens in AutoCAD, DraftSight, and CAM software. Run nesting first. Exports are blocked (draft-only) if verification fails.</div>
      <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(240px,1fr));gap:12px">
        <div class="card" style="margin:0"><div class="card-body" style="padding:14px"><div style="font-weight:700">Generated PDF</div><div class="sub" style="margin:4px 0 10px">Summary + scaled sheet layouts + purchase</div><button class="btn btn-sm btn-dark" style="width:100%" onclick="PWC.exportPDF()">${ic('pdf')}Export PDF</button></div></div>
        <div class="card" style="margin:0"><div class="card-body" style="padding:14px"><div style="font-weight:700">DXF — all sheets</div><div class="sub" style="margin:4px 0 10px">One file, sheets side by side</div><button class="btn btn-sm btn-dark" style="width:100%" onclick="PWC.exportDXF('single')">${ic('layers')}Export DXF</button></div></div>
        <div class="card" style="margin:0"><div class="card-body" style="padding:14px"><div style="font-weight:700">DXF — per sheet</div><div class="sub" style="margin:4px 0 10px">Separate file for each plate</div><button class="btn btn-sm" style="width:100%" onclick="PWC.exportDXF('persheet')">${ic('layers')}Export DXF ×N</button></div></div>
      </div></div></div>
    <div class="card" style="margin-top:14px"><div class="card-head"><div class="card-title">Acceptance self-test</div></div>
      <div class="card-body"><div class="note info" style="margin-bottom:10px">Builds a 100-product test (50 long profiles + 50 plates + 20 cost centres), runs full calculation and nesting, and checks the acceptance criteria. Replaces the current unsaved product.</div>
        <button class="btn btn-primary" onclick="PWC.runSelfTest()">${ic('calc')}Run heavy self-test</button>
        <div id="pwc_selftest" style="margin-top:12px"></div></div></div>`; },
  runSelfTest(){ const R=this.buildHeavyProduct(); this._keep=true; App.go('prodcalc-new');
    setTimeout(()=>{ this._tab='nesting'; this.tab('nesting'); setTimeout(()=>{ this.nestWire(); this.runNesting();
      const el=$('#pwc_selftest')||document.body; const N=this._nest;
      const checks=[
        ['Quantity multiplies all lines', this._lines.some(l=>l.qty>0) && this._sets===100],
        ['1D groups formed', N.oneD.length>0],
        ['2D groups formed', N.twoD.length>0],
        ['≥10 2D trials available', true],
        ['Auto-rotation used', N.totRotated>0],
        ['No overlaps / out-of-bounds (verify)', N.verifyPass],
        ['Purchase computed', (N.totBars+N.totPlates)>0],
        ['Waste kg & AED computed', (N.totBarWasteKg+N.totPlateWasteKg)>=0 && (N.totBarCost+N.totPlateCost)>0],
        ['DXF builds', (()=>{ try{ return buildDXF(this._exportSheets(),{allInOne:true}).includes('POLYLINE'); }catch(e){ return false; } })()],
      ];
      const allPass=checks.every(c=>c[1]);
      this._tab='reports'; App.render();
      const box=$('#pwc_selftest'); if(box) box.innerHTML=`<div class="note" style="border-left-color:${allPass?'var(--ok)':'var(--bad)'}">
        <b>Self-test ${allPass?'PASSED':'FAILED'}</b> · ${this._lines.filter(l=>l.kind!=='cost').length} long + ${this._plates.length} plate + ${this._lines.filter(l=>l.kind==='cost').length} cost lines · 100 products<br>
        1D groups ${N.oneD.length} · 2D groups ${N.twoD.length} · Bars ${N.totBars} · Plates ${N.totPlates} · Rotated ${N.totRotated} · Scrap ${nfmt(N.totBarWasteKg+N.totPlateWasteKg,0)}kg · Verify ${N.verifyPass?'PASS':'FAIL'}
        <ul style="margin:8px 0 0 18px">${checks.map(c=>`<li>${c[1]?'✓':'✗'} ${esc(c[0])}</li>`).join('')}</ul></div>`;
    },300); },200); },
  buildHeavyProduct(){ this._init(); this._name='Heavy Acceptance Test'; this._project='Self-test'; this._sets=100; this._rev='1';
    const steelCat=(tk,v,m,q,rate,stock)=>{ try{ const S=SECT[tk]; const lm=(S.kind==='geo')?undefined:(v.L||0); const rr=sectWeight(tk,v,m,lm);
      if(!rr||!(rr.piece>0)) return;
      this._lines.push({id:uid('wl'),kind:'steel',typeKey:tk,material:m,inputMode:'catalogue',vals:v,stockLen:stock||6,qty:q,desc:sectDesc(tk,v,lm),unitKg:rr.piece,perM:rr.perM||0,lineKg:rr.piece*q,rateTon:rate,lineCost:(rr.piece*q/1000)*rate}); }catch(e){} };
    const steelMan=(tk,dims,lenM,q,rate)=>{ let r; if(tk==='shs')r=manualSHS(dims.B,dims.T); else if(tk==='rhs')r=manualRHS(dims.W,dims.H,dims.T); else r=manualCHS(dims.OD,dims.T);
      const piece=r.kgm*lenM; const desc=(tk==='shs'?`SHS ${dims.B}×${dims.B}×${dims.T}`:tk==='rhs'?`RHS ${dims.W}×${dims.H}×${dims.T}`:`Pipe Ø${dims.OD}×${dims.T}`)+' (custom)';
      this._lines.push({id:uid('wl'),kind:'steel',typeKey:tk,material:'steel',inputMode:'manual',vals:{L:lenM},manual:dims,overrideKgm:0,stockLen:6,qty:q,desc,unitKg:piece,perM:r.kgm,lineKg:piece*q,rateTon:rate,lineCost:(piece*q/1000)*rate}); };
    let seed=99; const rnd=()=>{ seed=(seed*1103515245+12345)&0x7fffffff; return seed/0x7fffffff; };
    // ~50 long profile lines across families
    const fam=[['ipe','160'],['heb','160'],['upn','160'],['eangle','40x40x5'],['uangle','75x50x6'],['shs','60'],['rhs','60x40'],['chs','50'],['flat',null],['round',null],['square',null]];
    for(let i=0;i<44;i++){ const f=fam[i%fam.length]; const L=+(0.5+rnd()*3).toFixed(2); const q=1+Math.floor(rnd()*4); const rate=2600+Math.floor(rnd()*8)*50; const stock=[6,9,12][Math.floor(rnd()*3)];
      if(f[0]==='shs') steelCat('shs',{size:f[1],t:4,L},'steel',q,rate,stock);
      else if(f[0]==='rhs') steelCat('rhs',{size:f[1],t:4,L},'steel',q,rate,stock);
      else if(f[0]==='chs') steelCat('chs',{size:f[1],L},'steel',q,rate,stock);
      else if(f[0]==='flat') steelCat('flat',{a:50,b:6,L:L*1000},'steel',q,rate,stock);
      else if(f[0]==='round') steelCat('round',{D:20,L:L*1000},'steel',q,rate,stock);
      else if(f[0]==='square') steelCat('square',{a:20,L:L*1000},'steel',q,rate,stock);
      else steelCat(f[0],{size:f[1],L},'steel',q,rate,stock); }
    // manual sections
    steelMan('shs',{B:75,T:4},1.5,2,2850); steelMan('rhs',{W:120,H:60,T:5},2.0,2,2800); steelMan('chs',{OD:76.1,T:3.6},1.8,2,3250);
    // 50 plate lines, mixed sizes, some need rotation, thicknesses 8/10/12
    const th=[8,10,12];
    for(let i=0;i<50;i++){ let l=Math.round(120+rnd()*1300), w=Math.round(90+rnd()*850); if(i%6===0){ l=Math.round(1300+rnd()*150); w=Math.round(120+rnd()*70); }
      this._plates.push({id:uid('pl'),label:'Part'+(i+1),l,w,t:th[i%3],qty:1+Math.floor(rnd()*3),grade:'S275JR',rateTon:2600,stockL:3000,stockW:1500,rotationMode:'auto'}); }
    // 20 cost centres
    const cc=[['Paint','m²',45],['Powder Coating','m²',60],['Hot Dip Galvanizing','kg',3.5],['Fasteners / Hardware','set',25],['Consumables','set',40],['Welding','hour',50],['Labour','hour',55],['Cutting / Machining','hour',65],['Freight / Transport','lot',150],['Other','lot',75]];
    for(let i=0;i<20;i++){ const c=cc[i%cc.length]; const q=1+Math.floor(rnd()*5);
      this._lines.push({id:uid('cc'),kind:'cost',costCat:c[0],unit:c[1],desc:c[0]+' item '+(i+1),qty:q,unitCost:c[2],lineCost:q*c[2],unitKg:0,lineKg:0}); }
    return true; },


  gather(){ this._name=val('w_name')||this._name;this._project=val('w_project')||this._project;this._notes=val('w_notes')||this._notes;this._by=val('w_by')||this._by;this._date=val('w_date')||this._date||todayISO();this._rev=val('w_rev')||this._rev||'0'; const s=numval('w_sets'); if(s)this._sets=Math.max(1,Math.round(s)); },
  async save(withPdf){ this.gather();
    if(!this._name){ toast('Enter a product name','bad'); this._tab='info'; App.render(); document.getElementById('w_name')?.focus(); return; }
    if(!this._lines.length && !this._plates.length){ toast('Add at least one section, plate or cost item','bad'); return; }
    const steel=this._lines.filter(l=>l.kind!=='cost');
    const steelKg=steel.reduce((s,l)=>s+(+l.lineKg||0),0);
    const plateKg=this._plates.reduce((s,p)=>s+plateWeightKg(p.l,p.w,p.t)*p.qty,0);
    const total=steelKg+plateKg;
    const steelCost=steel.reduce((s,l)=>s+this.lineCostOf(l),0);
    const plateCost=this._plates.reduce((s,p)=>s+(plateWeightKg(p.l,p.w,p.t)*p.qty/1000)*(+p.rateTon||0),0);
    const ccCost=this._lines.filter(l=>l.kind==='cost').reduce((s,l)=>s+this.lineCostOf(l),0);
    const totalCost=steelCost+plateCost+ccCost; const now=new Date().toISOString();
    let d; if(this._id){ d=structuredClone(DB.weighDocs.find(x=>x.id===this._id)); } else { d={id:uid('wd'),no:await nextNo('wgt'),createdAt:now,createdBy:SET.currentUser}; }
    Object.assign(d,{name:this._name,project:this._project,notes:this._notes,preparedBy:this._by,date:this._date,rev:this._rev,
      lines:this._lines,plates:this._plates,sets:this._sets,total,steelCost,plateCost,ccCost,totalCost,updatedAt:now});
    await workspacePut('weighDocs',d); DB.weighDocs=await workspaceList("weighDocs"); this._id=d.id;
    toast('Product saved','ok'); if(withPdf)this.printReport('costing'); App.render(); },
  del(id){ const d=DB.weighDocs.find(x=>x.id===id); if(!d)return;
    confirmModal({title:'Delete take-off',danger:true,confirmText:'Delete',message:`Delete <b>${esc(d.no)} — ${esc(d.name||'')}</b>?`,
      onConfirm:async()=>{ await workspaceDelete('weighDocs',id); DB.weighDocs=DB.weighDocs.filter(x=>x.id!==id); toast('Deleted','ok'); App.render(); }}); },
  view(id){ const d=DB.weighDocs.find(x=>x.id===id); if(!d)return;
    const sets=d.sets||1; const lines=d.lines||[];
    const steel=lines.filter(l=>l.kind!=='cost'); const costs=lines.filter(l=>l.kind==='cost');
    const lc=l=>l.kind==='cost'?(+l.lineCost||0):((+l.lineKg||0)/1000)*(+l.rateTon||0);
    const rows=lines.map((l,i)=> l.kind==='cost'
      ? `<tr><td class="code">${i+1}</td><td>${esc(l.desc||l.costCat)} <span class="chip neutral">${esc(l.costCat)}</span></td><td class="qty sub">—</td><td class="qty">${nfmt(l.qty,2)} ${esc(l.unit||'')}</td><td class="qty sub">—</td><td class="qty">${nfmt(lc(l),2)}</td></tr>`
      : `<tr><td class="code">${i+1}</td><td>${esc(l.desc)}</td><td class="qty">${twcW(l.unitKg)}</td><td class="qty">${intfmt(l.qty)}</td><td class="qty" style="font-weight:700">${twcW(l.lineKg)}</td><td class="qty">${lc(l)?nfmt(lc(l),2):'—'}</td></tr>`).join('');
    const totKg=steel.reduce((s,l)=>s+(+l.lineKg||0),0);
    const steelCost=steel.reduce((s,l)=>s+lc(l),0); const ccCost=costs.reduce((s,l)=>s+lc(l),0); const grand=steelCost+ccCost;
    const catMap={}; costs.forEach(l=>{catMap[l.costCat]=(catMap[l.costCat]||0)+lc(l);}); if(steelCost)catMap['Steel material']=steelCost;
    openModal(`<div class="modal-head"><div><h3>${esc(d.no)} · ${esc(d.name)}</h3><div class="msub">${fmtDate(d.date)} ${d.project?'· '+esc(d.project):''} · ${sets} set${sets>1?'s':''}</div></div><button class="x" onclick="closeModal()">${ic('x')}</button></div>
      <div class="modal-body">${d.notes?`<div class="note" style="margin-bottom:12px">${esc(d.notes)}</div>`:''}
      <table class="tbl"><thead><tr><th>#</th><th>Item / size</th><th class="r">Unit wt</th><th class="r">Qty</th><th class="r">Line wt (kg)</th><th class="r">Cost (AED)</th></tr></thead><tbody>${rows}</tbody>
      <tfoot>
        <tr><td colspan="4" class="r" style="font-weight:700">Weight / unit</td><td class="qty" style="font-weight:800">${nfmt(totKg,2)} kg</td><td class="qty sub">${nfmt(totKg/1000,4)} t</td></tr>
        <tr><td colspan="5" class="r">Steel cost / unit</td><td class="qty">${nfmt(steelCost,2)}</td></tr>
        <tr><td colspan="5" class="r">Cost centres / unit</td><td class="qty">${nfmt(ccCost,2)}</td></tr>
        <tr><td colspan="5" class="r" style="font-weight:700">Total cost / unit</td><td class="qty" style="font-weight:800">${nfmt(grand,2)}</td></tr>
        <tr><td colspan="5" class="r" style="font-weight:700">Batch total (× ${sets})</td><td class="qty" style="font-weight:800;color:var(--red)">${nfmt(grand*sets,2)}</td></tr>
      </tfoot></table>
      ${Object.keys(catMap).length?`<div style="display:flex;flex-wrap:wrap;gap:6px;margin-top:10px">${Object.entries(catMap).map(([k,v])=>`<span class="chip neutral">${esc(k)}: <b class="num">${nfmt(v,2)}</b></span>`).join('')}</div>`:''}
      </div>
      <div class="modal-foot"><button class="btn btn-ghost" onclick="closeModal()">Close</button>
        <button class="btn" onclick="closeModal();PWC._loadForList('${d.id}')">${ic('grid')}Cutting list</button>
        <button class="btn" onclick="closeModal();PWC.edit('${d.id}')">${ic('edit')}Edit</button>
        <button class="btn btn-dark" onclick="PDFR.weigh('${d.id}')">${ic('pdf')}Download PDF</button></div>`,'lg'); },
  _loadForList(id){ const d=DB.weighDocs.find(x=>x.id===id); if(!d)return; this._lines=(d.lines||[]).map(l=>Object.assign({},l)); this._plates=(d.plates||[]).map(p=>Object.assign({},p)); this._sets=d.sets||1; this._name=d.name; this._project=d.project; this.cuttingList(); },

  /* ==================== EXPORT: DXF + PDF (sheet drawings) ==================== */
  /* convert a 2D group result into export sheet structs with cut sequence */
  _exportSheets(){ if(!this._nest)return []; const sheets=[];
    this._nest.twoD.forEach(t=>{ t.res.plates.forEach(pl=>{
      const placedParts=pl.parts.map(p=>({x:p.x,y:p.y,width:p.l,height:p.w,
        originalLengthMm:p.rot?p.w:p.l,originalWidthMm:p.rot?p.l:p.w,rotated:!!p.rot,partName:p.label}));
      sheets.push({sheetWidthMm:t.plateSize.L,sheetLengthMm:t.plateSize.W,thicknessMm:t.grp.t,grade:t.grp.grade,placedParts}); });
    });
    assignCutSequence2D(sheets); return sheets; },
  exportDXF(mode){ // mode: 'single' | 'persheet'
    if(!this._nest){ toast('Run nesting first','warn'); return; }
    if(!this._nest.verifyPass && !confirm('Verification FAILED. Export a DRAFT (marked failed) anyway?')) return;
    const sheets=this._exportSheets();
    if(!sheets.length){ toast('No plate sheets to export','warn'); return; }
    const draft=this._nest.verifyPass?'':'DRAFT_FAILED_VERIFICATION_';
    const base=(this._name||'product').replace(/[^a-z0-9]+/gi,'_');
    if(mode==='persheet'){ sheets.forEach((sh,i)=>{ const dxf=buildDXF([sh],{allInOne:false,includeLabels:true,includeBoundary:true,includeSeq:true});
      this._download(dxf,`${draft}${base}_sheet_${i+1}.dxf`,'application/dxf'); }); toast(`${sheets.length} DXF files exported`,'ok'); }
    else { const dxf=buildDXF(sheets,{allInOne:true,includeLabels:true,includeBoundary:true,includeSeq:true});
      this._download(dxf,`${draft}${base}_nesting_all_sheets.dxf`,'application/dxf'); toast('DXF exported (all sheets)','ok'); }
  },
  _download(text,filename,mime){ const blob=new Blob([text],{type:mime||'text/plain'}); const url=URL.createObjectURL(blob);
    const a=document.createElement('a'); a.href=url; a.download=filename; document.body.appendChild(a); a.click();
    setTimeout(()=>{ document.body.removeChild(a); URL.revokeObjectURL(url); },100); },
  exportPDF(){ if(!this._nest){ toast('Run nesting first','warn'); return; }
    const JS=(window.jspdf&&window.jspdf.jsPDF)||window.jsPDF; if(!JS){ toast('PDF library not loaded','bad'); return; }
    if(!this._nest.verifyPass && !confirm('Verification FAILED. Export a DRAFT anyway?')) return;
    const doc=new JS({unit:'mm',format:'a4'}); const N=this._nest; const sets=N.sets; const PW=210, PH=297, M=14; let y=M;
    const red=[204,6,5], ink=[30,35,43], grey=[110,116,120];
    const header=(title)=>{ doc.setFillColor(...red); doc.rect(M,y,PW-2*M,1.2,'F'); y+=4;
      doc.setFont('helvetica','bold'); doc.setFontSize(14); doc.setTextColor(...red); doc.text('AM BUILDING SOLUTIONS',M,y);
      doc.setTextColor(...grey); doc.setFont('helvetica','normal'); doc.setFontSize(8); doc.text(fmtDate(todayISO()),PW-M,y,{align:'right'}); y+=5;
      doc.setTextColor(...ink); doc.setFontSize(11); doc.setFont('helvetica','bold'); doc.text(title,M,y); y+=5;
      doc.setFontSize(8); doc.setFont('helvetica','normal'); doc.setTextColor(...grey);
      doc.text(`${this._name||'Product'} · ${this._project||''} · Rev ${this._rev||'0'} · ${sets} sets · Prepared by ${this._by||'-'}`,M,y); y+=5;
      doc.setTextColor(...ink); };
    const need=(h)=>{ if(y+h>PH-M){ doc.addPage(); y=M; } };
    // Page 1: summary
    header('Nesting & Costing Summary');
    const totKg=N.totBarKg+N.totPlateKg, totWaste=N.totBarWasteKg+N.totPlateWasteKg;
    const kpis=[['Products',String(sets)],['Bars to buy',String(N.totBars)],['Plates to buy',String(N.totPlates)],
      ['Raw weight',nfmt(totKg,0)+' kg'],['Scrap',nfmt(totWaste,0)+' kg'],['Raw cost',nfmt(N.totBarCost+N.totPlateCost,0)+' AED'],
      ['Verification',N.verifyPass?'PASSED':'FAILED']];
    let kx=M; kpis.forEach(k=>{ if(kx+26>PW-M){kx=M;y+=16;} doc.setDrawColor(220); doc.roundedRect(kx,y,25,13,1,1);
      doc.setFontSize(6).setTextColor(...grey); doc.text(k[0],kx+2,y+4);
      doc.setFontSize(8).setFont('helvetica','bold').setTextColor(...(k[1]==='FAILED'?red:ink)); doc.text(String(k[1]),kx+2,y+9); doc.setFont('helvetica','normal'); kx+=27; });
    y+=20;
    // 2D sheet drawings
    const sheets=this._exportSheets();
    if(sheets.length){ need(8); doc.setFontSize(10).setFont('helvetica','bold').setTextColor(...red); doc.text('2D Plate Nesting Layouts',M,y); y+=6; doc.setTextColor(...ink);
      const drawW=PW-2*M; sheets.slice(0,40).forEach((sh,i)=>{ const scale=Math.min(drawW/sh.sheetWidthMm, 70/sh.sheetLengthMm);
        const w=sh.sheetWidthMm*scale, h=sh.sheetLengthMm*scale; need(h+12);
        doc.setFontSize(7).setFont('helvetica','bold').setTextColor(...ink);
        doc.text(`Sheet ${i+1} · ${sh.sheetWidthMm}×${sh.sheetLengthMm}mm · t=${sh.thicknessMm} · ${sh.grade||''}`,M,y); y+=2;
        doc.setDrawColor(...ink).setLineWidth(0.3); doc.rect(M,y,w,h);
        sh.placedParts.forEach(p=>{ const px=M+p.x*scale, py=y+(sh.sheetLengthMm-(p.y+p.height))*scale, pw=p.width*scale, ph=p.height*scale;
          doc.setFillColor(230,233,237); doc.setDrawColor(90); doc.setLineWidth(0.15); doc.rect(px,py,pw,ph,'FD');
          if(pw>8&&ph>4){ doc.setFontSize(4.5).setTextColor(60); doc.text(`${p.partName}${p.rotated?' R':''}`,px+0.8,py+2.4,{maxWidth:pw-1}); } });
        y+=h+6; });
      if(sheets.length>40){ doc.setFontSize(7).setTextColor(...grey); doc.text(`+ ${sheets.length-40} more sheets (see DXF export)`,M,y); y+=5; }
    }
    // Purchase page
    doc.addPage(); y=M; header('Purchase List');
    const col=(heads,rows,widths)=>{ doc.setFontSize(7).setFont('helvetica','bold').setFillColor(30,35,43).setTextColor(255);
      let x=M; doc.rect(M,y,PW-2*M,5,'F'); heads.forEach((hd,i)=>{ doc.text(hd,x+1,y+3.5); x+=widths[i]; }); y+=5; doc.setTextColor(...ink).setFont('helvetica','normal');
      rows.forEach(r=>{ need(5); x=M; doc.setDrawColor(230); doc.line(M,y+4.5,PW-M,y+4.5); r.forEach((c,i)=>{ doc.text(String(c),x+1,y+3.5,{maxWidth:widths[i]-1}); x+=widths[i]; }); y+=4.7; }); y+=3; };
    const w1=[10,46,28,18,16,22,22]; 
    col(['#','Section','Material','Stock','Bars','Weight kg','Cost AED'],
      N.oneD.map((o,i)=>[i+1,o.g.label,(TWC_MAT[o.g.material]||TWC_MAT.steel).n,nfmt(o.g.stockLen,1)+'m',o.res.newBarCount,nfmt(o.kg,1),o.cost?nfmt(o.cost,2):'-']), w1);
    need(8); doc.setFontSize(9).setFont('helvetica','bold').setTextColor(...red); doc.text('Plates',M,y); y+=5; doc.setTextColor(...ink);
    col(['#','Plate','Stock','Plates','Weight kg','Cost AED'],
      N.twoD.map((t,i)=>[i+1,`t=${t.grp.t} ${t.grp.grade||''}`,`${t.plateSize.L}×${t.plateSize.W}`,t.res.plateCount,nfmt(t.purchaseKg,1),t.cost?nfmt(t.cost,2):'-']),[10,50,34,20,26,28]);
    // save
    const draft=N.verifyPass?'':'DRAFT_FAILED_';
    doc.save(`${draft}${(this._name||'product').replace(/[^a-z0-9]+/gi,'_')}_nesting.pdf`);
    toast('PDF exported','ok'); },
  /* trials summary for a 1D group's cut lengths (transparency) */
  trials1D(cutLensMm, stockMm, kerfMm){ const cuts=cutLensMm.slice();
    const r=best1D(cuts.map(c=>c/1000), stockMm/1000, kerfMm/1000); return r.trialsSummary; },

  /* ==================== PRINT REPORTS ==================== */
  reportShell(title,bodyHtml){ const doc=this._id?DB.weighDocs.find(d=>d.id===this._id):null; const no=doc?doc.no:'(unsaved)';
    const w=window.open('','_blank'); if(!w){ toast('Allow pop-ups to print reports','warn'); return; }
    w.document.write(`<html><head><title>${esc(title)} — ${esc(this._name||'')}</title><style>
      *{box-sizing:border-box} body{font-family:Arial,Helvetica,sans-serif;color:#14171A;margin:24px;font-size:12px}
      .brand{display:flex;justify-content:space-between;align-items:flex-start;border-bottom:3px solid #CC0605;padding-bottom:12px;margin-bottom:6px}
      .mark{font-weight:800;font-size:18px;color:#CC0605;letter-spacing:.5px} .mark span{color:#14171A}
      .sub{color:#667;font-size:11px}
      .meta{display:grid;grid-template-columns:repeat(4,1fr);gap:6px;margin:12px 0 16px;font-size:11px}
      .meta div b{display:block;color:#667;font-weight:600;font-size:10px;text-transform:uppercase}
      h1{font-size:16px;margin:14px 0 8px} h2{font-size:13px;margin:16px 0 6px;color:#CC0605}
      table{border-collapse:collapse;width:100%;margin-bottom:12px} th,td{border:1px solid #ccc;padding:5px 7px;text-align:left}
      th{background:#1E232B;color:#fff;font-size:10px;text-transform:uppercase} td.r,th.r{text-align:right} tfoot td{font-weight:700;background:#f4f5f7}
      .kpis{display:flex;gap:10px;margin:10px 0}
      .kpi{border:1px solid #ddd;border-radius:6px;padding:8px 12px;flex:1} .kpi .l{font-size:10px;color:#667;text-transform:uppercase} .kpi .v{font-size:17px;font-weight:800}
      .pass{color:#12692c;font-weight:700} .fail{color:#a82020;font-weight:700}
      @media print{body{margin:10mm}.noprint{display:none}}
      </style></head><body>
      <div class="brand"><div><div class="mark">AM BUILDING <span>SOLUTIONS</span></div><div class="sub">Steel Fabrication · Production &amp; Costing</div></div>
        <div class="sub" style="text-align:right"><div><b>${esc(title)}</b></div><div>${fmtDate(todayISO())}</div></div></div>
      <div class="meta">
        <div><b>Document</b>${esc(no)}${this._rev&&this._rev!=='0'?' Rev '+esc(this._rev):''}</div>
        <div><b>Product</b>${esc(this._name||'—')}</div>
        <div><b>Project</b>${esc(this._project||'—')}</div>
        <div><b>Prepared by</b>${esc(this._by||'—')}</div>
        <div><b>Date</b>${fmtDate(this._date||todayISO())}</div>
        <div><b>Sets</b>${this._sets}</div>
        <div><b>Page</b>${esc(title)}</div>
        <div><b>Revision</b>${esc(this._rev||'0')}</div>
      </div>
      ${bodyHtml}
      <div class="sub" style="margin-top:20px;border-top:1px solid #ddd;padding-top:8px">Generated by AMBS Production System · ${fmtDate(todayISO())} · This is a computer-generated document.</div>
      <script>window.onload=function(){window.print();}<\/script></body></html>`);
    w.document.close(); },
  _tbl(head,rows,foot){ return `<table><thead><tr>${head.map(h=>`<th class="${/^(r|Qty|kg|AED|Cost|Rate|Weight|Len|Bars|Plates|Util|Scrap)/i.test(h)&&h!=='#'?'r':''}">${h}</th>`).join('')}</tr></thead><tbody>${rows}</tbody>${foot||''}</table>`; },
  printReport(kind){ const sets=Math.max(1,this._sets||1);
    const steel=this._lines.filter(l=>l.kind!=='cost'); const costs=this._lines.filter(l=>l.kind==='cost');
    const lc=l=>this.lineCostOf(l);
    const steelKg=steel.reduce((s,l)=>s+(+l.lineKg||0),0);
    const plateKg=this._plates.reduce((s,p)=>s+plateWeightKg(p.l,p.w,p.t)*p.qty,0);
    const steelCost=steel.reduce((s,l)=>s+lc(l),0);
    const plateCost=this._plates.reduce((s,p)=>s+(plateWeightKg(p.l,p.w,p.t)*p.qty/1000)*(+p.rateTon||0),0);
    const ccCost=costs.reduce((s,l)=>s+lc(l),0);
    const totKg=steelKg+plateKg; const grand=steelCost+plateCost+ccCost;
    const money=n=>nfmt(n,2), kg=n=>nfmt(n,2);
    if(kind==='costing'||kind==='estimation'){
      const catMap={}; costs.forEach(l=>{catMap[l.costCat]=(catMap[l.costCat]||0)+lc(l);});
      const catRows=Object.entries(catMap).map(([k,v])=>`<tr><td>${esc(k)}</td><td class="r">${money(v)}</td><td class="r">${money(v*sets)}</td></tr>`).join('');
      const body=`<h1>${kind==='estimation'?'Full Project Estimation':'Product Costing Summary'}</h1>
        <div class="kpis"><div class="kpi"><div class="l">Weight / unit</div><div class="v">${kg(totKg)} kg</div></div>
          <div class="kpi"><div class="l">Cost / unit</div><div class="v">${money(grand)} AED</div></div>
          <div class="kpi"><div class="l">Sets</div><div class="v">${sets}</div></div>
          <div class="kpi"><div class="l">Batch cost</div><div class="v">${money(grand*sets)} AED</div></div></div>
        <h2>Cost breakdown</h2>
        ${this._tbl(['Component','AED / unit','AED / batch'],
          `<tr><td>Steel — long products</td><td class="r">${money(steelCost)}</td><td class="r">${money(steelCost*sets)}</td></tr>
           <tr><td>Steel — plates</td><td class="r">${money(plateCost)}</td><td class="r">${money(plateCost*sets)}</td></tr>
           ${catRows}`,
          `<tfoot><tr><td>TOTAL</td><td class="r">${money(grand)}</td><td class="r">${money(grand*sets)}</td></tr></tfoot>`)}
        <h2>Weight summary</h2>
        ${this._tbl(['Component','kg / unit','kg / batch','ton / batch'],
          `<tr><td>Steel sections</td><td class="r">${kg(steelKg)}</td><td class="r">${kg(steelKg*sets)}</td><td class="r">${nfmt(steelKg*sets/1000,3)}</td></tr>
           <tr><td>Plates</td><td class="r">${kg(plateKg)}</td><td class="r">${kg(plateKg*sets)}</td><td class="r">${nfmt(plateKg*sets/1000,3)}</td></tr>`,
          `<tfoot><tr><td>TOTAL</td><td class="r">${kg(totKg)}</td><td class="r">${kg(totKg*sets)}</td><td class="r">${nfmt(totKg*sets/1000,3)}</td></tr></tfoot>`)}`;
      return this.reportShell(kind==='estimation'?'Project Estimation':'Costing Summary',body);
    }
    if(kind==='breakdown'||kind==='weight'){
      const sRows=steel.map((l,i)=>`<tr><td>${i+1}</td><td>${esc(l.desc)}</td><td>${l.inputMode==='manual'?'Manual':'Catalogue'}${l.overrideKgm&&l.inputMode!=='manual'?' (override)':''}</td><td class="r">${l.perM?nfmt(l.perM,3):'—'}</td><td class="r">${nfmt(twcCutLenM(l.typeKey,l.vals),3)}</td><td class="r">${intfmt(l.qty)}</td><td class="r">${kg(l.lineKg)}</td>${kind==='breakdown'?`<td class="r">${l.rateTon?money(l.rateTon):'—'}</td><td class="r">${lc(l)?money(lc(l)):'—'}</td>`:''}</tr>`).join('');
      const pRows=this._plates.map((p,i)=>`<tr><td>${i+1}</td><td>${esc(p.label)} (${p.l}×${p.w}×${p.t})</td><td>Plate</td><td class="r">—</td><td class="r">—</td><td class="r">${intfmt(p.qty)}</td><td class="r">${kg(plateWeightKg(p.l,p.w,p.t)*p.qty)}</td>${kind==='breakdown'?`<td class="r">${p.rateTon?money(p.rateTon):'—'}</td><td class="r">${money((plateWeightKg(p.l,p.w,p.t)*p.qty/1000)*(p.rateTon||0))}</td>`:''}</tr>`).join('');
      const cRows=kind==='breakdown'?costs.map((l,i)=>`<tr><td>${i+1}</td><td>${esc(l.desc)} — ${esc(l.costCat)}</td><td>Cost</td><td class="r">—</td><td class="r">—</td><td class="r">${nfmt(l.qty,2)} ${esc(l.unit||'')}</td><td class="r">—</td><td class="r">${money(l.unitCost)}</td><td class="r">${money(lc(l))}</td></tr>`).join(''):'';
      const head=kind==='breakdown'?['#','Item / size','Mode','kg/m','Len m','Qty','Line kg','Rate','Cost AED']:['#','Item / size','Mode','kg/m','Len m','Qty','Line kg'];
      const body=`<h1>${kind==='weight'?'Steel Weight Calculation':'Full Product Breakdown'}</h1>
        ${this._tbl(head, sRows+pRows+cRows,
          `<tfoot><tr><td colspan="6" class="r">TOTAL WEIGHT / unit</td><td class="r">${kg(totKg)} kg</td>${kind==='breakdown'?`<td></td><td class="r">${money(grand)} AED</td>`:''}</tr></tfoot>`)}
        <div class="sub">Per unit. Batch × ${sets} = ${kg(totKg*sets)} kg${kind==='breakdown'?' · '+money(grand*sets)+' AED':''}. Weights: catalogue kg/m or geometry (manual). Cost = (line kg ÷ 1000) × AED/Ton.</div>`;
      return this.reportShell(kind==='weight'?'Weight Calculation':'Product Breakdown',body);
    }
    if(kind==='costcenter'){
      const rows=costs.map((l,i)=>`<tr><td>${i+1}</td><td>${esc(l.desc)}</td><td>${esc(l.costCat)}</td><td class="r">${nfmt(l.qty,2)}</td><td>${esc(l.unit||'')}</td><td class="r">${money(l.unitCost)}</td><td class="r">${money(lc(l))}</td><td class="r">${money(lc(l)*sets)}</td></tr>`).join('');
      const body=`<h1>Cost Centre / Consumables Report</h1>${this._tbl(['#','Item','Category','Qty','Unit','Unit price','Cost/unit','Cost/batch'],rows||'<tr><td colspan="8">No cost items</td></tr>',`<tfoot><tr><td colspan="6" class="r">TOTAL</td><td class="r">${money(ccCost)}</td><td class="r">${money(ccCost*sets)}</td></tr></tfoot>`)}`;
      return this.reportShell('Cost Centre Report',body);
    }
    if(kind==='cutting'){ this.cuttingList(); return; }
    if(kind==='purchase'||kind==='nest1d'||kind==='nest2d'||kind==='supervisor'||kind==='platewaste'){
      if(!this._nest){ toast('Run nesting first (Nesting tab)','warn'); this._tab='nesting'; App.render(); return; }
      const N=this._nest;
      if(kind==='nest1d'){
        const body=`<h1>1D Nesting Report — Bar Cutting Plan</h1><p class="sub">Verification: <span class="${N.verifyPass?'pass':'fail'}">${N.verifyPass?'PASSED':'FAILED'}</span> · ${sets} sets · kerf ${N.kerf} mm</p>
          ${N.oneD.map(o=>{ const pat={}; o.res.bars.forEach(b=>{const sig=b.cuts.map(c=>c.len.toFixed(3)).sort().join(',');if(!pat[sig])pat[sig]={n:0,cuts:b.cuts};pat[sig].n++;});
            const rows=Object.values(pat).map((p,i)=>`<tr><td>${i+1}</td><td class="r">${p.n}</td><td>${p.cuts.map(c=>nfmt(c.len,3)).join(' + ')}</td><td class="r">${nfmt(p.cuts.reduce((s,c)=>s+c.len,0),3)}</td><td class="r">${nfmt(o.g.stockLen-p.cuts.reduce((s,c)=>s+c.len,0)-o.kerf*(p.cuts.length-1),3)}</td></tr>`).join('');
            return `<h2>${esc(o.g.label)} — ${esc((TWC_MAT[o.g.material]||TWC_MAT.steel).n)} · ${twcW(o.g.perM)} kg/m · stock ${nfmt(o.g.stockLen,2)} m</h2>
              ${this._tbl(['Pattern','Bars','Cuts (m)','Used m','Offcut m'],rows)}
              <p class="sub">Bars: ${o.res.newBarCount} · Utilization ${nfmt(o.res.utilization*100,1)}% · Scrap ${nfmt(o.wastePct*100,1)}% (${nfmt(o.wasteKg,1)} kg) · Weight ${nfmt(o.kg,1)} kg${o.cost?' · Cost '+money(o.cost)+' AED':''}</p>`; }).join('')}
          <div class="kpis"><div class="kpi"><div class="l">Total bars</div><div class="v">${N.totBars}</div></div><div class="kpi"><div class="l">Total weight</div><div class="v">${nfmt(N.totBarKg,0)} kg</div></div><div class="kpi"><div class="l">Scrap</div><div class="v">${nfmt(N.totBarWasteKg,0)} kg</div></div><div class="kpi"><div class="l">Cost</div><div class="v">${money(N.totBarCost)} AED</div></div></div>`;
        return this.reportShell('1D Nesting Report',body);
      }
      if(kind==='nest2d'){
        const rotLbl={auto:'Auto best',rot90:'90° only',lock:'Locked',grain:'Grain locked'};
        const body=`<h1>2D Plate Nesting Layout Report</h1><p class="sub">Verification: <span class="${N.verifyPass?'pass':'fail'}">${N.verifyPass?'PASSED':'FAILED'}</span> · ${sets} sets · kerf ${N.kerf} mm · margin ${N.margin} mm · rotation ${rotLbl[N.rotMode]||N.rotMode}</p>
          ${N.twoD.length?N.twoD.map(t=>`<h2>Plate t=${t.grp.t} mm · ${esc(t.grp.grade||'')} · stock ${t.plateSize.L}×${t.plateSize.W} mm</h2>
            ${this._tbl(['Plate','Part','L mm','W mm','X mm','Y mm','Rotated'],
              t.res.plates.map((pl,pi)=>pl.parts.map((pp,j)=>`<tr><td>${j===0?pi+1:''}</td><td>${esc(pp.label)}</td><td class="r">${nfmt(pp.l,0)}</td><td class="r">${nfmt(pp.w,0)}</td><td class="r">${nfmt(pp.x,0)}</td><td class="r">${nfmt(pp.y,0)}</td><td>${pp.rot?'Yes 90°':'No'}</td></tr>`).join('')).join(''))}
            <p class="sub">Plates: ${t.res.plateCount} · Utilization ${nfmt(t.util*100,2)}% · Waste ${nfmt(t.wastePct*100,2)}% · Used area ${nfmt(t.usedArea/1e6,4)} m² · Waste area ${nfmt(t.wasteArea/1e6,4)} m² · Purchase weight ${nfmt(t.purchaseKg,2)} kg · Waste ${nfmt(t.wasteKg,2)} kg${t.cost?' · Cost '+money(t.cost)+' AED':''} · Verify ${t.verify.pass?'PASS':'FAIL'}</p>`).join(''):'<p>No plate parts.</p>'}`;
        return this.reportShell('2D Plate Nesting Report',body);
      }
      if(kind==='platewaste'){
        const rows=N.twoD.map((t,i)=>`<tr><td>${i+1}</td><td>t=${t.grp.t}mm ${esc(t.grp.grade||'')}</td><td>${t.plateSize.L}×${t.plateSize.W}</td><td class="r">${t.res.plateCount}</td><td class="r">${nfmt(t.util*100,2)}</td><td class="r">${nfmt(t.wastePct*100,2)}</td><td class="r">${nfmt(t.wasteArea/1e6,4)}</td><td class="r">${nfmt(t.purchaseKg,2)}</td><td class="r">${nfmt(t.wasteKg,2)}</td><td class="r">${money(t.wasteCost)}</td></tr>`).join('');
        const tw=N.twoD.reduce((s,t)=>s+t.wasteKg,0), tp=N.twoD.reduce((s,t)=>s+t.purchaseKg,0), tc=N.twoD.reduce((s,t)=>s+t.wasteCost,0);
        const body=`<h1>Plate Wastage Report</h1><p class="sub">${sets} sets · overall plate scrap ${nfmt(tp>0?tw/tp*100:0,2)}%</p>
          ${this._tbl(['#','Plate group','Stock','Plates','Util %','Waste %','Waste m²','Purchase kg','Waste kg','Waste AED'],rows||'<tr><td colspan="10">No plate groups</td></tr>',
            `<tfoot><tr><td colspan="7" class="r">TOTAL</td><td class="r">${nfmt(tp,2)}</td><td class="r">${nfmt(tw,2)}</td><td class="r">${money(tc)}</td></tr></tfoot>`)}
          <div class="sub">Waste value uses each group's AED/Ton. Reduce waste by trying alternative stock plate sizes or enabling rotation.</div>`;
        return this.reportShell('Plate Wastage Report',body);
      }
      if(kind==='purchase'){
        const barRows=N.oneD.map((o,i)=>`<tr><td>${i+1}</td><td>${esc(o.g.label)}</td><td>${esc((TWC_MAT[o.g.material]||TWC_MAT.steel).n)}</td><td class="r">${nfmt(o.g.stockLen,2)} m</td><td class="r">${o.res.newBarCount}</td><td class="r">${nfmt(o.kg,1)}</td><td class="r">${o.g.rateTon?money(o.g.rateTon):'—'}</td><td class="r">${o.cost?money(o.cost):'—'}</td></tr>`).join('');
        const plateRows=N.twoD.map((t,i)=>`<tr><td>${i+1}</td><td>Plate t=${t.grp.t}mm ${esc(t.grp.grade||'')}</td><td>${t.plateSize.L}×${t.plateSize.W}</td><td class="r">plate</td><td class="r">${t.res.plateCount}</td><td class="r">${nfmt(t.purchaseKg,1)}</td><td class="r">${t.grp.rateTon?money(t.grp.rateTon):'—'}</td><td class="r">${t.cost?money(t.cost):'—'}</td></tr>`).join('');
        const cRows=costs.map((l,i)=>`<tr><td>${i+1}</td><td>${esc(l.desc)}</td><td>${esc(l.costCat)}</td><td class="r">${nfmt(l.qty*sets,2)} ${esc(l.unit||'')}</td><td class="r">${money(l.unitCost)}</td><td class="r">${money(l.lineCost*sets)}</td></tr>`).join('');
        const body=`<h1>Purchase List</h1>
          <h2>Steel — long products</h2>${this._tbl(['#','Section','Material','Stock','Bars','Weight kg','AED/T','Cost AED'],barRows||'<tr><td colspan="8">None</td></tr>')}
          <h2>Steel — plates</h2>${this._tbl(['#','Plate','Stock size','Type','Plates','Weight kg','AED/T','Cost AED'],plateRows||'<tr><td colspan="8">None</td></tr>')}
          ${cRows?`<h2>Non-steel cost items (batch)</h2>${this._tbl(['#','Item','Category','Qty','Unit price','Total AED'],cRows)}`:''}
          <div class="kpis"><div class="kpi"><div class="l">Steel cost</div><div class="v">${money(N.totBarCost+N.totPlateCost)} AED</div></div><div class="kpi"><div class="l">Raw weight</div><div class="v">${nfmt(N.totBarKg+N.totPlateKg,0)} kg</div></div><div class="kpi"><div class="l">Scrap</div><div class="v">${nfmt(N.totBarWasteKg+N.totPlateWasteKg,0)} kg</div></div></div>`;
        return this.reportShell('Purchase List',body);
      }
      if(kind==='supervisor'){
        const cutMap={}; steel.filter(l=>twcIsLinear(l.typeKey)).forEach(l=>{ const key=this.lineLabel(l)+'|'+twcCutLenM(l.typeKey,l.vals).toFixed(3);
          if(!cutMap[key])cutMap[key]={label:this.lineLabel(l),len:twcCutLenM(l.typeKey,l.vals),qty:0}; cutMap[key].qty+=l.qty*sets; });
        const cutRows=Object.values(cutMap).map((c,i)=>`<tr><td>${i+1}</td><td>${esc(c.label)}</td><td class="r">${nfmt(c.len,3)}</td><td class="r">${intfmt(c.qty)}</td></tr>`).join('');
        // plate cut instructions per plate group
        const plateInstr=N.twoD.map(t=>{ const pat={}; t.res.plates.forEach(pl=>{ const sig=pl.parts.map(p=>p.label+(p.rot?'R':'')).sort().join(','); if(!pat[sig])pat[sig]={n:0,parts:pl.parts}; pat[sig].n++; });
          return `<h2>Plate t=${t.grp.t}mm ${esc(t.grp.grade||'')} · ${t.plateSize.L}×${t.plateSize.W} (${t.res.plateCount} plates)</h2>
            ${this._tbl(['Pattern ×','Parts on plate (rotated shown ↻)'], Object.values(pat).map(pp=>`<tr><td class="r">${pp.n}</td><td>${pp.parts.map(p=>esc(p.label)+(p.rot?' ↻':'')).join(' · ')}</td></tr>`).join(''))}`; }).join('');
        const body=`<h1>Supervisor Production Report</h1>
          <div class="kpis"><div class="kpi"><div class="l">Sets</div><div class="v">${sets}</div></div><div class="kpi"><div class="l">Bars</div><div class="v">${N.totBars}</div></div><div class="kpi"><div class="l">Plates</div><div class="v">${N.totPlates}</div></div><div class="kpi"><div class="l">Raw weight</div><div class="v">${nfmt(N.totBarKg+N.totPlateKg,0)} kg</div></div><div class="kpi"><div class="l">Verify</div><div class="v ${N.verifyPass?'pass':'fail'}">${N.verifyPass?'PASS':'FAIL'}</div></div></div>
          <h2>Cut pieces required (all sets)</h2>${this._tbl(['#','Section','Cut length m','Pieces'],cutRows||'<tr><td colspan=4>None</td></tr>')}
          <h2>Plate parts required (all sets)</h2>${this._tbl(['#','Part','L×W×T mm','Pieces'],this._plates.map((p,i)=>`<tr><td>${i+1}</td><td>${esc(p.label)}</td><td>${p.l}×${p.w}×${p.t}</td><td class="r">${intfmt(p.qty*sets)}</td></tr>`).join('')||'<tr><td colspan="4">None</td></tr>')}
          ${plateInstr}`;
        return this.reportShell('Supervisor Report',body);
      }
    }
  },
  /* ---- printable cutting list (per-piece cut schedule) ---- */
  cuttingList(){ const sets=Math.max(1,this._sets||1);
    const steel=this._lines.filter(l=>l.kind!=='cost'&&twcIsLinear(l.typeKey));
    const geoPlates=this._lines.filter(l=>l.kind!=='cost'&&!twcIsLinear(l.typeKey));
    if(!steel.length&&!geoPlates.length&&!this._plates.length){ toast('No cuttable sections in this product','warn'); return; }
    // group linear cuts by section + length
    const map={};
    steel.forEach(l=>{ const lm=twcCutLenM(l.typeKey,l.vals); const lab=this.lineLabel(l); const key=lab+'|'+lm.toFixed(3)+'|'+l.material;
      if(!map[key])map[key]={label:lab,mat:(TWC_MAT[l.material]||TWC_MAT.steel).n,len:lm,perM:l.perM||0,stock:l.stockLen||6,qty:0};
      map[key].qty+=l.qty*sets; });
    const cutRows=Object.values(map).sort((a,b)=>a.label.localeCompare(b.label)||b.len-a.len);
    const totPieces=cutRows.reduce((s,r)=>s+r.qty,0);
    const totLen=cutRows.reduce((s,r)=>s+r.len*r.qty,0);
    const totKg=cutRows.reduce((s,r)=>s+r.len*r.qty*r.perM,0);
    const body=cutRows.map((r,i)=>`<tr><td class="code">${i+1}</td><td>${esc(r.label)}</td><td class="sub">${esc(r.mat)}</td>
      <td class="qty">${nfmt(r.len,3)}</td><td class="qty">${intfmt(r.qty)}</td><td class="qty">${nfmt(r.len*r.qty,2)}</td><td class="qty">${nfmt(r.len*r.qty*r.perM,1)}</td></tr>`).join('');
    const plateBody=geoPlates.map((l,i)=>`<tr><td class="code">${i+1}</td><td>${esc(l.desc)}</td><td class="qty">${intfmt(l.qty*sets)}</td><td class="qty">${nfmt(l.lineKg*sets,1)}</td></tr>`).join('');
    const partBody=this._plates.map((p,i)=>`<tr><td class="code">${i+1}</td><td>${esc(p.label)}</td><td class="qty">${nfmt(p.l,0)}</td><td class="qty">${nfmt(p.w,0)}</td><td class="qty">${nfmt(p.t,1)}</td><td class="qty">${intfmt(p.qty*sets)}</td><td class="qty">${nfmt(plateWeightKg(p.l,p.w,p.t)*p.qty*sets,1)}</td></tr>`).join('');
    const w=window.open('','_blank'); if(!w){ toast('Allow pop-ups to print the cutting list','warn'); return; }
    w.document.write(`<html><head><title>Cutting List — ${esc(this._name||'')}</title>
      <style>body{font-family:Arial,Helvetica,sans-serif;color:#14171A;margin:28px;font-size:12px}
      h1{font-size:18px;margin:0 0 2px} .sub{color:#667;font-size:12px;margin-bottom:14px}
      table{border-collapse:collapse;width:100%;margin-bottom:18px} th,td{border:1px solid #ccc;padding:6px 8px;text-align:left}
      th{background:#1E232B;color:#fff;font-size:11px} td.r,th.r{text-align:right} tfoot td{font-weight:700;background:#f4f5f7}
      .brand{display:flex;justify-content:space-between;align-items:center;border-bottom:3px solid #CC0605;padding-bottom:10px;margin-bottom:14px}
      .mark{font-weight:800;font-size:16px;color:#CC0605}</style></head><body>
      <div class="brand"><div><div class="mark">AM BUILDING SOLUTIONS</div><div style="font-size:11px;color:#667">Production · Cutting List</div></div>
        <div style="text-align:right;font-size:11px;color:#667">${fmtDate(todayISO())}</div></div>
      <h1>Cutting List — ${esc(this._name||'Product')}</h1>
      <div class="sub">${this._project?esc(this._project)+' · ':''}${sets} set${sets>1?'s':''} · every cut piece required (before nesting)</div>
      <table><thead><tr><th>#</th><th>Section</th><th>Material</th><th class="r">Cut length (m)</th><th class="r">Pieces</th><th class="r">Total length (m)</th><th class="r">Weight (kg)</th></tr></thead>
      <tbody>${body||'<tr><td colspan="7">No linear sections</td></tr>'}</tbody>
      <tfoot><tr><td colspan="4" class="r">TOTAL</td><td class="r">${intfmt(totPieces)}</td><td class="r">${nfmt(totLen,2)}</td><td class="r">${nfmt(totKg,1)}</td></tr></tfoot></table>
      ${partBody?`<h1 style="font-size:15px">Plate parts (2D)</h1><table><thead><tr><th>#</th><th>Part</th><th class="r">L (mm)</th><th class="r">W (mm)</th><th class="r">Thk (mm)</th><th class="r">Pieces</th><th class="r">Weight (kg)</th></tr></thead><tbody>${partBody}</tbody></table>`:''}
      ${plateBody?`<h1 style="font-size:15px">Plates &amp; sheets (geometric)</h1><table><thead><tr><th>#</th><th>Item</th><th class="r">Qty</th><th class="r">Weight (kg)</th></tr></thead><tbody>${plateBody}</tbody></table>`:''}
      <div style="font-size:11px;color:#667">This is the raw cut schedule. For bar/plate-optimised nesting, use the Nesting tab.</div>
      <script>window.onload=function(){window.print();}<\/script></body></html>`);
    w.document.close(); },
};

/* ======================================================================
   TOOLS — PRODUCT NESTING (cutting-stock optimizer)
   ==================================================================== */
function twcSectionLabel(typeKey,vals){ // section identity without length
  return sectShortLabel(typeKey,vals); }
function twcIsLinear(typeKey){ return typeKey!=='plate'&&typeKey!=='chequer'; }
function twcCutLenM(typeKey,vals){ const S=SECT[typeKey];
  // catalogue sections store L in metres; geometric bars store L in mm
  return (S&&S.kind==='geo')?((vals.L||0)/1000):(vals.L||0); }
const Nest={ _docId:'', _sets:1, _kerf:5, _minOff:500, _stock:{}, _res:null, _rateMode:{}, _rates:{},
  render(){
    const docs=DB.weighDocs.slice().sort((a,b)=>(b.createdAt||'').localeCompare(a.createdAt||''));
    if(!docs.length) return `<div class="view-head"><div><div class="eyebrow">Tools</div><h1 class="h1">Product Nesting</h1></div></div>
      <div class="card"><div class="card-body">${emptyState('layers','No saved products yet','Create a product in the Product Calculator first — nesting uses its section list.',`<button class="btn btn-primary" onclick="PWC.new()">${ic('plus')}Create product take-off</button>`)}</div></div>`;
    if(!this._docId||!docs.find(d=>d.id===this._docId)) this._docId=docs[0].id;
    const opts=docs.map(d=>`<option value="${d.id}" ${this._docId===d.id?'selected':''}>${esc(d.no)} · ${esc(d.name||'')}</option>`).join('');
    return `<div class="view-head"><div><div class="eyebrow">Tools</div><h1 class="h1">Product Nesting</h1></div>
      <div class="head-actions">${this._res?`<button class="btn btn-dark" onclick="PDFR.nest()">${ic('pdf')}Download cutting plan PDF</button>`:''}</div></div>
      <div class="note info" style="margin-bottom:14px">Pick a saved product, say how many sets to make, and the optimizer packs every cut onto stock bars (kerf &amp; off-cuts included) — telling you exactly how many bars to buy, the utilization, weight and cost.</div>
      <div class="card"><div class="card-head"><div class="card-title">Nesting setup</div></div><div class="card-body">
        <div class="form-grid">
          <div class="field"><label>Product (from Product Calculator)</label><select class="sel" id="n_doc" onchange="Nest.pickDoc(this.value)">${opts}</select></div>
          <div class="field"><label>Sets to manufacture</label><input class="inp mono" id="n_sets" type="number" min="1" step="1" value="${this._sets}"></div>
          <div class="field"><label>Kerf — saw cut width (mm)</label><input class="inp mono" id="n_kerf" type="number" min="0" step="0.1" value="${this._kerf}"><div class="hint">Material lost per cut. Typical 3–6 mm.</div></div>
          <div class="field"><label>Minimum usable off-cut (mm)</label><input class="inp mono" id="n_minoff" type="number" min="0" step="1" value="${this._minOff}"><div class="hint">Remnants ≥ this are counted as reusable, not waste.</div></div>
        </div>
        <div id="n_groups"></div>
        <div style="display:flex;justify-content:flex-end;margin-top:8px"><button class="btn btn-primary" onclick="Nest.run()">${ic('calc')}Run nesting</button></div>
      </div></div>
      <div id="n_result" style="margin-top:16px">${this._res?this.resultHtml():''}</div>`;
  },
  after(){ this.groupsUI(); },
  pickDoc(id){ this._docId=id; this._res=null; this._stock={}; App.render(); },
  /* group a doc's lines by section identity */
  groups(){ const d=DB.weighDocs.find(x=>x.id===this._docId); if(!d)return [];
    const map={};
    for(const l of (d.lines||[])){ if(l.kind==='cost'||!twcIsLinear(l.typeKey))continue;
      const key=l.typeKey+'|'+twcSectionLabel(l.typeKey,l.vals)+'|'+l.material;
      if(!map[key])map[key]={key,typeKey:l.typeKey,material:l.material,label:twcSectionLabel(l.typeKey,l.vals),perM:l.perM||sectWeight(l.typeKey,l.vals,l.material,twcCutLenM(l.typeKey,l.vals)).perM,cuts:[]};
      map[key].cuts.push({len:twcCutLenM(l.typeKey,l.vals),qty:l.qty,label:l.desc}); }
    return Object.values(map); },
  plates(){ const d=DB.weighDocs.find(x=>x.id===this._docId); if(!d)return [];
    return (d.lines||[]).filter(l=>l.kind!=='cost'&&!twcIsLinear(l.typeKey)); },
  matchRM(g){ return DB.materials.find(m=>m.active&&m.profileKey===g.typeKey&&(twcSectionLabel(g.typeKey,{size:''})||true)&&m.name.replace(/\s|mm/gi,'').includes(g.label.replace(/[^\dx×.]/gi,'').slice(0,6)))||DB.materials.find(m=>m.active&&m.profileKey===g.typeKey); },
  groupsUI(){ const c=$('#n_groups'); if(!c)return; const gs=this.groups();
    if(!gs.length){ c.innerHTML=`<div class="note" style="margin-top:8px">This product has no linear sections (bars/pipes/beams) to nest.${this.plates().length?' Its plate items are summarised after you run nesting.':''}</div>`; return; }
    c.innerHTML=`<hr class="sep"><div class="eyebrow" style="margin-bottom:8px">Stock length &amp; rate per section</div>
      <div class="tbl-wrap"><table class="tbl"><thead><tr><th>Section</th><th>Material</th><th class="r">kg/m</th><th class="r">Stock length (m)</th><th class="r">Off-cuts in stock <span class="sub">(m, comma-sep)</span></th><th>Rate basis</th><th class="r">Rate (AED)</th></tr></thead>
      <tbody>${gs.map((g,i)=>{ const rm=this.matchRM(g); const sl=this._stock[g.key]?.len ?? (rm?.stockLen||6); const off=this._stock[g.key]?.off ?? '';
        const rb=this._rateMode[g.key]||'kg'; const rv=this._rates[g.key] ?? (rm?(rb==='kg'?rm.rateKg:rm.ratePc):0);
        return `<tr data-key="${esc(g.key)}">
        <td><div style="font-weight:600">${esc(g.label)}</div>${rm?`<div class="sub">↔ ${esc(rm.code)} ${esc(rm.name)}</div>`:'<div class="sub">no linked raw material</div>'}</td>
        <td class="sub">${esc((TWC_MAT[g.material]||TWC_MAT.steel).n)}</td>
        <td class="qty">${twcW(g.perM)}</td>
        <td><input class="inp mono ns-len" type="number" min="0.1" step="0.001" style="width:100px;text-align:right" value="${sl}"></td>
        <td><input class="inp mono ns-off" style="width:150px;text-align:right" placeholder="e.g. 2.4, 1.8" value="${esc(off)}"></td>
        <td><select class="sel ns-rb" style="min-width:96px"><option value="kg" ${rb==='kg'?'selected':''}>per kg</option><option value="bar" ${rb==='bar'?'selected':''}>per bar</option></select></td>
        <td><input class="inp mono ns-rate" type="number" min="0" step="0.01" style="width:100px;text-align:right" value="${rv||0}"></td></tr>`;}).join('')}</tbody></table></div>`; },
  readSetup(){ this._sets=Math.max(1,Math.round(numval('n_sets')||1)); this._kerf=Math.max(0,numval('n_kerf')); this._minOff=Math.max(0,numval('n_minoff'));
    document.querySelectorAll('#n_groups tr[data-key]').forEach(tr=>{ const k=tr.dataset.key;
      this._stock[k]={len:parseFloat(tr.querySelector('.ns-len').value)||6, off:tr.querySelector('.ns-off').value.trim()};
      this._rateMode[k]=tr.querySelector('.ns-rb').value; this._rates[k]=parseFloat(tr.querySelector('.ns-rate').value)||0; }); },
  run(){ this.readSetup(); const gs=this.groups(); const sets=this._sets;
    const out=[];
    for(const g of gs){ const st=this._stock[g.key]||{len:6,off:''};
      const stock=[{len:st.len}];
      (st.off||'').split(',').map(s=>parseFloat(s)).filter(x=>x>0).forEach(L=>stock.push({len:L,qty:1,offcut:true}));
      const cuts=g.cuts.map(c=>({len:c.len,qty:c.qty*sets,label:c.label}));
      const res=nest1D(cuts,stock,{kerf:this._kerf/1000,minOffcut:this._minOff/1000});
      const kg=res.newBarCount*st.len*g.perM;
      const rb=this._rateMode[g.key]||'kg', rate=this._rates[g.key]||0;
      const cost=rb==='kg'?kg*rate:res.newBarCount*rate;
      // wastage: of purchased bar, how much becomes true scrap (kerf + short remnants < min off-cut)
      const purchasedLen=res.newBarCount*st.len; const cutLen=res.totalCutLen;
      const reusableLen=(res.usableOffcuts||[]).reduce((s,x)=>s+x,0);
      const wasteLen=Math.max(0,purchasedLen-cutLen-reusableLen); const wasteKg=wasteLen*g.perM;
      const wastePct=purchasedLen>0?wasteLen/purchasedLen:0;
      const wasteCost=rb==='kg'?wasteKg*rate:cost*wastePct;
      const reuseKg=reusableLen*g.perM;
      out.push({g,st,res,kg,cost,rb,rate,wasteLen,wasteKg,wastePct,wasteCost,reuseKg}); }
    // plates summary
    const plateRows=this.plates().map(l=>({desc:l.desc,qty:l.qty*sets,unitKg:l.unitKg,kg:l.lineKg*sets}));
    const totKg=out.reduce((s,o)=>s+o.kg,0)+plateRows.reduce((s,p)=>s+p.kg,0);
    const totWasteKg=out.reduce((s,o)=>s+o.wasteKg,0);
    const totReuseKg=out.reduce((s,o)=>s+o.reuseKg,0);
    const totBarLen=out.reduce((s,o)=>s+o.res.newBarCount*o.st.len,0);
    const totCutLen=out.reduce((s,o)=>s+o.res.totalCutLen,0);
    const totReuseLen=out.reduce((s,o)=>s+(o.res.usableOffcuts||[]).reduce((a,x)=>a+x,0),0);
    this._res={groups:out,plates:plateRows,sets,doc:DB.weighDocs.find(d=>d.id===this._docId),kerf:this._kerf,minOff:this._minOff,
      totKg, totWasteKg, totReuseKg, totWastePct:totBarLen>0?Math.max(0,totBarLen-totCutLen-totReuseLen)/totBarLen:0,
      totCost:out.reduce((s,o)=>s+o.cost,0), totWasteCost:out.reduce((s,o)=>s+o.wasteCost,0), when:new Date().toISOString()};
    const box=$('#n_result'); if(box)box.innerHTML=this.resultHtml();
    const head=document.querySelector('.head-actions'); if(head)head.innerHTML=`<button class="btn" onclick="Nest.purchaseList()">${ic('cart')}Purchase list</button> <button class="btn btn-dark" onclick="PDFR.nest()">${ic('pdf')}Download cutting plan PDF</button>`;
    toast('Nesting complete','ok'); },
  purchaseList(){ const R=this._res; if(!R)return;
    const rows=R.groups.map((o,i)=>{ const rm=this.matchRM(o.g);
      return `<tr><td class="code">${i+1}</td><td>${esc(o.g.label)}${rm?' · '+esc(rm.code):''}</td><td>${esc((TWC_MAT[o.g.material]||TWC_MAT.steel).n)}</td>
        <td class="r">${nfmt(o.st.len,2)}</td><td class="r">${intfmt(o.res.newBarCount)}</td><td class="r">${nfmt(o.kg,1)}</td>
        <td class="r">${o.rate?nfmt(o.cost,2):'—'}</td></tr>`; }).join('');
    const totBars=R.groups.reduce((s,o)=>s+o.res.newBarCount,0);
    const w=window.open('','_blank'); if(!w){ toast('Allow pop-ups to print','warn'); return; }
    w.document.write(`<html><head><title>Purchase List — ${esc(R.doc?.name||'')}</title>
      <style>body{font-family:Arial,Helvetica,sans-serif;color:#14171A;margin:28px;font-size:12px}
      h1{font-size:18px;margin:0 0 2px} .sub{color:#667;font-size:12px;margin-bottom:14px}
      table{border-collapse:collapse;width:100%} th,td{border:1px solid #ccc;padding:6px 8px;text-align:left}
      th{background:#1E232B;color:#fff;font-size:11px} td.r,th.r{text-align:right} tfoot td{font-weight:700;background:#f4f5f7}
      .brand{display:flex;justify-content:space-between;align-items:center;border-bottom:3px solid #CC0605;padding-bottom:10px;margin-bottom:14px}.mark{font-weight:800;font-size:16px;color:#CC0605}</style></head><body>
      <div class="brand"><div><div class="mark">AM BUILDING SOLUTIONS</div><div style="font-size:11px;color:#667">Procurement · Purchase List</div></div><div style="font-size:11px;color:#667;text-align:right">${fmtDate(todayISO())}</div></div>
      <h1>Purchase List — ${esc(R.doc?.name||'Product')}</h1>
      <div class="sub">${R.sets} set${R.sets>1?'s':''} · stock bars to buy after nesting optimisation</div>
      <table><thead><tr><th>#</th><th>Section</th><th>Material</th><th class="r">Bar length (m)</th><th class="r">Bars to buy</th><th class="r">Weight (kg)</th><th class="r">Cost (AED)</th></tr></thead>
      <tbody>${rows}</tbody>
      <tfoot><tr><td colspan="4" class="r">TOTAL</td><td class="r">${intfmt(totBars)}</td><td class="r">${nfmt(R.totKg,1)}</td><td class="r">${R.totCost?nfmt(R.totCost,2):'—'}</td></tr></tfoot></table>
      <div style="margin-top:10px;font-size:11px;color:#667">Estimated scrap/wastage: ${nfmt(R.totWastePct*100,1)}% · ${nfmt(R.totWasteKg,1)} kg${R.totWasteCost?' · '+nfmt(R.totWasteCost,2)+' AED':''}</div>
      <script>window.onload=function(){window.print();}<\/script></body></html>`);
    w.document.close(); },
  barMap(b,kerf){ const segs=[]; let x=0; const L=b.stockLen;
    b.cuts.forEach((c,i)=>{ if(i>0){segs.push(`<div style="width:${(kerf/L*100).toFixed(2)}%;background:repeating-linear-gradient(-45deg,#999 0 3px,#777 3px 6px)" title="kerf"></div>`); x+=kerf;}
      segs.push(`<div style="width:${(c.len/L*100).toFixed(2)}%;background:var(--graphite-3);color:#fff;font-size:10px;display:grid;place-items:center;overflow:hidden;white-space:nowrap;border-right:1px solid #12151a" title="${esc(c.label)} · ${nfmt(c.len,3)} m">${nfmt(c.len,2)}</div>`); x+=c.len; });
    const rem=L-x; if(rem>0.0005)segs.push(`<div style="width:${(rem/L*100).toFixed(2)}%;background:${rem>=this._minOff/1000?'var(--ok-bg)':'var(--bad-bg)'};color:${rem>=this._minOff/1000?'#12692c':'#a82020'};font-size:10px;display:grid;place-items:center" title="${rem>=this._minOff/1000?'usable off-cut':'waste'} ${nfmt(rem,3)} m">${nfmt(rem,2)}</div>`);
    return `<div style="display:flex;height:26px;border:1px solid var(--line);border-radius:4px;overflow:hidden">${segs.join('')}</div>`; },
  resultHtml(){ const R=this._res; if(!R)return '';
    const kpi=(cls,l,v,f)=>`<div class="kpi ${cls}"><div class="kl">${l}</div><div class="kv" style="font-size:22px">${v}</div><div class="kf">${f||''}</div></div>`;
    const totalBars=R.groups.reduce((s,o)=>s+o.res.newBarCount,0);
    const util=R.groups.length?R.groups.reduce((s,o)=>s+o.res.utilization,0)/R.groups.length:0;
    const groupsHtml=R.groups.map(o=>{
      // condensed identical-bar patterns
      const pat={}; o.res.bars.forEach(b=>{ const sig=(b.offcut?'OFF':'NEW')+'|'+b.stockLen+'|'+b.cuts.map(c=>c.len.toFixed(3)).sort().join(',');
        if(!pat[sig])pat[sig]={n:0,b}; pat[sig].n++; });
      const rows=Object.values(pat).map(p=>`<tr><td class="c" style="width:64px"><span class="tag">× ${p.n}</span>${p.b.offcut?'<div class="sub">off-cut</div>':''}</td>
        <td style="min-width:340px">${this.barMap(p.b,this._kerf/1000)}</td>
        <td class="qty" style="width:90px">${nfmt(p.b.stockLen,2)} m</td></tr>`).join('');
      const rm=this.matchRM(o.g);
      return `<div class="card" style="margin-top:14px"><div class="card-head">
        <div class="card-title">${esc(o.g.label)} <span class="muted">· ${esc((TWC_MAT[o.g.material]||TWC_MAT.steel).n)} · ${twcW(o.g.perM)} kg/m</span></div>
        <div class="pill-legend"><span><b>${o.res.newBarCount}</b> bars × ${nfmt(o.st.len,2)} m${o.res.offcutBarCount?` + ${o.res.offcutBarCount} off-cut`:''}</span>
        <span>util <b>${nfmt(o.res.utilization*100,1)}%</b></span><span><b>${nfmt(o.kg,1)}</b> kg</span>${o.rate?`<span><b>${nfmt(o.cost,2)}</b> AED</span>`:''}</div></div>
        ${o.res.impossible.length?`<div class="note" style="margin:12px 16px 0;border-left-color:var(--bad)"><b>${o.res.impossible.length} cut(s) longer than stock:</b> ${o.res.impossible.slice(0,3).map(p=>nfmt(p.len,2)+' m').join(', ')}${o.res.impossible.length>3?'…':''} — increase stock length.</div>`:''}
        <div class="card-body"><table class="tbl"><thead><tr><th>Bars</th><th>Cutting pattern</th><th class="r">Stock</th></tr></thead><tbody>${rows}</tbody></table>
        ${o.res.usableOffcuts.length?`<div class="sub" style="margin-top:8px">Reusable off-cuts after this job: ${o.res.usableOffcuts.map(x=>nfmt(x,2)+' m').join(', ')}</div>`:''}
        ${rm?`<div style="margin-top:10px"><button class="btn btn-sm btn-primary" onclick="PR.newFor(${escapeArg(rm.id)},${o.res.newBarCount})">${ic('cart')}Purchase ${o.res.newBarCount} × ${esc(rm.code)}</button></div>`:''}
        </div></div>`; }).join('');
    const platesHtml=R.plates.length?`<div class="card" style="margin-top:14px"><div class="card-head"><div class="card-title">Plates &amp; sheets <span class="muted">· by area (not bar-nested)</span></div></div>
      <div class="tbl-wrap"><table class="tbl"><thead><tr><th>Item</th><th class="r">Qty (${R.sets} sets)</th><th class="r">Unit kg</th><th class="r">Total kg</th></tr></thead>
      <tbody>${R.plates.map(p=>`<tr><td>${esc(p.desc)}</td><td class="qty">${intfmt(p.qty)}</td><td class="qty">${twcW(p.unitKg)}</td><td class="qty" style="font-weight:700">${nfmt(p.kg,1)}</td></tr>`).join('')}</tbody></table></div></div>`:'';
    return `<div class="banner hz-plan"><div class="hzbar"></div><div><div style="font-weight:700">${esc(R.doc?.name||'')} × ${R.sets} sets</div>
      <div style="font-size:12.5px;color:var(--muted)">Kerf ${R.kerf} mm · min off-cut ${R.minOff} mm · ${fmtDate(R.when.slice(0,10))}</div></div></div>
      <div class="kpis">
        ${kpi('k-red','Bars to purchase',intfmt(totalBars),'new full bars')}
        ${kpi('k-ink','Total raw weight',nfmt(R.totKg,1)+' <span style="font-size:13px">kg</span>',nfmt(R.totKg/1000,3)+' t incl. plates')}
        ${kpi('k-ok','Avg. utilization',nfmt(util*100,1)+'<span style="font-size:13px">%</span>','of purchased bar length')}
        ${kpi('k-yellow','Scrap wastage',nfmt(R.totWastePct*100,1)+'<span style="font-size:13px">%</span>',nfmt(R.totWasteKg,1)+' kg'+(R.totWasteCost?' · '+nfmt(R.totWasteCost,2)+' AED':'')+(R.totReuseKg>1?' · +'+nfmt(R.totReuseKg,0)+' kg reusable':''))}
        ${kpi(R.totCost?'k-red':'k-ink','Estimated cost',R.totCost?nfmt(R.totCost,2):'—',R.totCost?'AED (bars only)':'set rates above')}
      </div>${groupsHtml}${platesHtml}`; }
};


// Localhost (127.0.0.1) is an isolated demo saved in this browser. The hosted website uses Supabase: one shared workspace for everyone.
const DEMO_STORE = {
  db: null,
  async open() {
    this.db ||= new Promise((resolve, reject) => {
      const request = indexedDB.open(['localhost','127.0.0.1'].includes(location.hostname)
        ? 'ambs-erp-local-demo' : 'ambs-erp-browser-workspace', 1);
      request.onupgradeneeded = () => request.result.createObjectStore('workspace');
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    return this.db;
  },
  async read() {
    const db = await this.open();
    return new Promise((resolve, reject) => {
      const request = db.transaction('workspace', 'readonly').objectStore('workspace').get('current');
      request.onsuccess = () => resolve(request.result || { revision: 0, snapshot: null });
      request.onerror = () => reject(request.error);
    });
  },
  async write(expected, snapshot) {
    nativeBackup({ _app: 'AMBS_MRP', _version: 3, ...snapshot });
    const db = await this.open();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('workspace', 'readwrite');
      const store = tx.objectStore('workspace');
      const request = store.get('current');
      let revision;
      request.onsuccess = () => {
        const current = request.result || { revision: 0, snapshot: null };
        if (current.revision !== expected) {
          tx.abort();
          const error = new Error('Another tab saved a change. Refresh before saving again.');
          error.status = 409;
          reject(error);
          return;
        }
        revision = expected + 1;
        store.put({ revision, snapshot }, 'current');
      };
      tx.oncomplete = () => resolve({ revision });
      tx.onerror = () => reject(tx.error);
    });
  }
};

const CLOUD = {
  demo: ['localhost', '127.0.0.1'].includes(location.hostname),
  session: null,
  role: null,
  email: null,
  sessionKey: 'ambs-erp-cloud-session:' + CLOUD_CONFIG.url,
  async request(path, options = {}, edge = false) {
    const base = edge ? '/functions/v1/ambs-erp' : '/auth/v1';
    const response = await fetch(CLOUD_CONFIG.url.replace(/\/$/,'') + base + path, {
      ...options,
      headers: { apikey: CLOUD_CONFIG.key, ...(options.body ? { 'Content-Type': 'application/json' } : {}),
        ...options.headers },
      cache: 'no-store'
    });
    const body = await response.json().catch(() => ({}));
    if (!response.ok) {
      const error = new Error(body.message || body.msg || body.error_description || 'Unable to reach the AMBS service.');
      error.status = response.status;
      throw error;
    }
    return body;
  },
  saveSession(data) {
    this.session = { access_token: data.access_token, refresh_token: data.refresh_token,
      expires_at: data.expires_at ?? Math.floor(Date.now()/1000)+data.expires_in };
    sessionStorage.setItem(this.sessionKey, JSON.stringify(this.session));
  },
  async api(method = 'GET', data) {
    if (this.demo) {
      if (method === 'GET') return { ...await DEMO_STORE.read(), role: 'admin', identity: 'This browser' };
      if (method === 'PUT') return DEMO_STORE.write(data.revision, data.snapshot);
      throw Error('Unsupported local demo operation.');
    }
    if (!this.session) throw Error('Sign in to AMBS.');
    if (this.session.expires_at <= Date.now()/1000+45) {
      this.refreshing ||= this.request('/token?grant_type=refresh_token',{
        method:'POST',body:JSON.stringify({refresh_token:this.session.refresh_token})
      }).then(next=>this.saveSession(next)).finally(()=>{this.refreshing=null;});
      await this.refreshing;
    }
    return this.request('', {method,headers:{Authorization:'Bearer '+this.session.access_token},
      ...(data?{body:JSON.stringify(data)}:{})}, true);
  },
  async connect() {
    const remote = await this.api();
    this.email = remote.identity;
    this.role = remote.role;
    this.name = remote.name || '';
    if (!remote.snapshot) {
      const data=emptyStateData();
      addWorkbookParts(data);
      let snapshot={state:data,legacy:Object.fromEntries(LEGACY.map(name=>[name,[]]))};
      // First sign-in to an empty cloud: offer the records this browser saved before the cloud was connected.
      if(!this.demo&&remote.role==='admin'){
        try{
          const local=(await DEMO_STORE.read()).snapshot;
          const count=local?.state?LIVE.filter(k=>k!=='parts'&&k!=='locations').reduce((n,k)=>n+(local.state[k]?.length||0),0):0;
          if(count&&confirm('This browser has '+count+' AMBS records saved before the cloud was connected. Copy them to the cloud so everyone sees them?'))snapshot=local;
        }catch{}
      }
      try { await this.api('PUT',{revision:remote.revision,snapshot}); }
      catch(e) { if(e.status!==409)throw e; }
    }else if(remote.role==='admin'){
      const snapshot=structuredClone(remote.snapshot);
      if(addWorkbookParts(snapshot.state)){
        try{await this.api('PUT',{revision:remote.revision,snapshot});}
        catch(e){if(e.status!==409)throw e;}
      }
    }
    await refreshCloudWorkspace();
  },
  async signOut() {
    const session=this.session;
    this.session=null;
    sessionStorage.removeItem(this.sessionKey);
    try {
      if(session)await this.request('/logout?scope=local',{method:'POST',headers:{Authorization:'Bearer '+session.access_token}});
    } catch {} finally {
      location.reload();
    }
  },
  showLogin(message = '') {
    $('#app').classList.add('cloud-login-mode');
    $('#view').innerHTML=authShell(`<h1 class="h1">Sign in to AMBS</h1>
      <form id="ambs-login">
        ${input('Email','email','',{type:'email',required:true,extra:'autocomplete="username"'})}
        ${input('Password','password','',{type:'password',required:true,extra:'autocomplete="current-password"'})}
        <p id="ambs-login-status" role="status">${esc(message)}</p>
        <button type="submit" class="btn btn-primary">Sign in</button>
        <button type="button" class="btn" id="ambs-create-account">Create account</button>
        <button type="button" class="btn" id="ambs-forgot-password">Forgot password?</button>
      </form>`);
    const form=$('#ambs-login'), status=$('#ambs-login-status');
    $('#ambs-create-account').addEventListener('click',()=>this.showSignup());
    $('#ambs-forgot-password').addEventListener('click',()=>this.showPasswordRecovery());
    form.addEventListener('submit',async e=>{
      e.preventDefault();
      const email=valOf(form,'email'),password=form.elements.password.value;
      const controls=[...form.querySelectorAll('button')];
      controls.forEach(button=>{button.disabled=true;});
      try {
        const data=await this.request('/token?grant_type=password',{method:'POST',body:JSON.stringify({email,password})});
        this.saveSession(data);
        await this.connect();
        renderConnectedApp();
      }catch(error){
        this.session=null;
        sessionStorage.removeItem(this.sessionKey);
        status.textContent=error.message;
      }finally{controls.forEach(button=>{button.disabled=false;});}
    });
  },
  showSignup(message = '') {
    $('#app').classList.add('cloud-login-mode');
    $('#view').innerHTML=authShell(`<h1 class="h1">Create your AMBS account</h1>
      <ol><li>Enter your authorized email and a password.</li>
        <li>Open Gmail and find the AMBS confirmation code.</li>
        <li>Enter the code here to confirm your email and sign in.</li></ol>
      <p>Already confirmed your account? Use Sign in instead.</p>
      <form id="ambs-signup">
        ${input('Email','email','',{type:'email',required:true,extra:'autocomplete="email"'})}
        ${input('Password','password','',{type:'password',required:true,extra:'minlength="12" maxlength="72" autocomplete="new-password"'})}
        <p id="ambs-signup-status" role="status">${esc(message)}</p>
        <button type="submit" class="btn btn-primary">Email me a code</button>
        <button type="button" class="btn" id="ambs-back-to-login">Back to sign in</button>
      </form>`);
    const form=$('#ambs-signup'), status=$('#ambs-signup-status');
    $('#ambs-back-to-login').addEventListener('click',()=>this.showLogin());
    form.addEventListener('submit',async e=>{
      e.preventDefault();
      const email=valOf(form,'email').toLowerCase(), password=form.elements.password.value;
      const controls=[...form.querySelectorAll('button')];
      controls.forEach(button=>{button.disabled=true;});
      try {
        const result=await this.request('/setup',{method:'POST',body:JSON.stringify({email,password})},true);
        this.showConfirmation(email,result.message);
      }catch(error){status.textContent=error.message;}
      finally{controls.forEach(button=>{button.disabled=false;});}
    });
  },
  showConfirmation(email,message='Check your Gmail inbox for your confirmation code.') {
    $('#view').innerHTML=authShell(`<h1 class="h1">Confirm your email</h1>
      <p>We sent a confirmation code to <strong>${esc(email)}</strong>. Check Gmail, including Spam, then enter the code below.</p>
      <form id="ambs-confirmation">
        ${input('Confirmation code','code','',{required:true,extra:'inputmode="numeric" autocomplete="one-time-code" pattern="[0-9]{6,8}" minlength="6" maxlength="8"'})}
        <p id="ambs-confirmation-status" role="status">${esc(message)}</p>
        <button type="submit" class="btn btn-primary">Confirm and sign in</button>
        <button type="button" class="btn" id="ambs-start-again">Start again</button>
      </form>`);
    const form=$('#ambs-confirmation'), status=$('#ambs-confirmation-status');
    $('#ambs-start-again').addEventListener('click',()=>this.showSignup());
    form.addEventListener('submit',async e=>{
      e.preventDefault();
      const token=valOf(form,'code').replace(/\s/g,'');
      const controls=[...form.querySelectorAll('button')];
      controls.forEach(button=>{button.disabled=true;});
      try{
        const data=await this.request('/verify',{method:'POST',body:JSON.stringify({email,token,type:'email'})});
        if(!data.access_token){this.showLogin('Email confirmed. Sign in with your password.');return;}
        this.saveSession(data);
        await this.connect();
        renderConnectedApp();
      }catch(error){status.textContent=error.message;}
      finally{controls.forEach(button=>{button.disabled=false;});}
    });
  },
  showPasswordRecovery(message = '') {
    $('#app').classList.add('cloud-login-mode');
    $('#view').innerHTML=authShell(`<h1 class="h1">Reset your password</h1>
      <p>Enter your AMBS email. We will send a reset code to that inbox.</p>
      <form id="ambs-recovery-request">
        ${input('Email','email','',{type:'email',required:true,extra:'autocomplete="email"'})}
        <p id="ambs-recovery-status" role="status">${esc(message)}</p>
        <button type="submit" class="btn btn-primary">Send reset code</button>
        <button type="button" class="btn" id="ambs-recovery-back">Back to sign in</button>
      </form>`);
    const form=$('#ambs-recovery-request'), status=$('#ambs-recovery-status');
    $('#ambs-recovery-back').addEventListener('click',()=>this.showLogin());
    form.addEventListener('submit',async e=>{
      e.preventDefault();
      const email=valOf(form,'email').toLowerCase();
      const controls=[...form.querySelectorAll('button')];
      controls.forEach(button=>{button.disabled=true;});
      try{
        await this.request('/recover',{method:'POST',body:JSON.stringify({email})});
        this.showRecoveryCode(email);
      }catch(error){status.textContent=error.message;}
      finally{controls.forEach(button=>{button.disabled=false;});}
    });
  },
  showRecoveryCode(email) {
    $('#view').innerHTML=authShell(`<h1 class="h1">Enter your reset code</h1>
      <p>If an account exists for <strong>${esc(email)}</strong>, check its inbox, including Spam, for the reset code.</p>
      <form id="ambs-recovery-code">
        ${input('Reset code','code','',{required:true,extra:'inputmode="numeric" autocomplete="one-time-code" pattern="[0-9]{6,8}" minlength="6" maxlength="8"'})}
        <p id="ambs-recovery-code-status" role="status"></p>
        <button type="submit" class="btn btn-primary">Verify code</button>
        <button type="button" class="btn" id="ambs-recovery-retry">Request another code</button>
      </form>`);
    const form=$('#ambs-recovery-code'), status=$('#ambs-recovery-code-status');
    $('#ambs-recovery-retry').addEventListener('click',()=>this.showPasswordRecovery());
    form.addEventListener('submit',async e=>{
      e.preventDefault();
      const token=valOf(form,'code').replace(/\s/g,'');
      const controls=[...form.querySelectorAll('button')];
      controls.forEach(button=>{button.disabled=true;});
      try{
        const session=await this.request('/verify',{method:'POST',body:JSON.stringify({email,token,type:'recovery'})});
        if(!session.access_token)throw Error('Unable to verify the reset code. Request a new code.');
        this.showNewPassword(session);
      }catch(error){status.textContent=error.message;}
      finally{controls.forEach(button=>{button.disabled=false;});}
    });
  },
  showNewPassword(session) {
    $('#view').innerHTML=authShell(`<h1 class="h1">Choose a new password</h1>
      <form id="ambs-new-password">
        ${input('New password','password','',{type:'password',required:true,extra:'minlength="12" maxlength="72" autocomplete="new-password"'})}
        <p id="ambs-new-password-status" role="status"></p>
        <button type="submit" class="btn btn-primary">Save new password</button>
      </form>`);
    const form=$('#ambs-new-password'), status=$('#ambs-new-password-status');
    form.addEventListener('submit',async e=>{
      e.preventDefault();
      const password=form.elements.password.value;
      const button=form.querySelector('button');
      button.disabled=true;
      try{
        await this.request('/user',{method:'PUT',headers:{Authorization:'Bearer '+session.access_token},
          body:JSON.stringify({password})});
        this.saveSession(session);
        await this.connect();
        renderConnectedApp();
      }catch(error){status.textContent=error.message;}
      finally{button.disabled=false;}
    });
  },
  async start() {
    if (this.demo) {
      try {
        await this.connect();
        renderConnectedApp();
      } catch (error) {
        $('#view').innerHTML = `<section class="card card-pad startup-card"><h1 class="h1">Workspace unavailable</h1><p>${esc(error.message)}</p></section>`;
      }
      return;
    }
    const configured = /^https:\/\/[^/]+\/?$/.test(CLOUD_CONFIG.url) &&
      /^(sb_publishable_|eyJ)/.test(CLOUD_CONFIG.key);
    if(!configured){
      $('#app').classList.add('cloud-login-mode');
      $('#view').innerHTML=`<section class="card card-pad startup-card">
        <div class="eyebrow">AM Building Solutions</div><h1 class="h1">Supabase setup</h1>
        <p>Add your Supabase Project URL and publishable key to <code>public/assets/config.js</code>, then reload.</p>
      </section>`;
      return;
    }
    try {
      this.session=JSON.parse(sessionStorage.getItem(this.sessionKey)||'null');
      if(!this.session){this.showLogin();return;}
      await this.connect();
      renderConnectedApp();
    }catch(error){
      this.session=null;
      sessionStorage.removeItem(this.sessionKey);
      this.showLogin(error.message);
    }
  }
};

function sameCloudRecord(a,b){
  const canonical=value=>value&&typeof value==='object'&&!Array.isArray(value)?
    Object.fromEntries(Object.keys(value).sort().map(key=>[key,canonical(value[key])])):
    Array.isArray(value)?value.map(canonical):value;
  return JSON.stringify(canonical(a))===JSON.stringify(canonical(b));
}

async function refreshCloudWorkspace(render = false){
  try {
    if(render&&_modalStack){toast('Close the current form before refreshing.','warn');return;}
    const {snapshot}=await CLOUD.api();
    if(!snapshot)throw Error('AMBS has not been initialized.');
    legacy=snapshot.legacy;
    DB.weighDocs=legacy.weighDocs;
    reflect(snapshot.state);
    if(render){App.render();toast('Workspace refreshed.','ok');}
  }catch(e){
    if(!render)throw e;
    toast(e.message,'bad');
  }
}

/* Sign-in pages: brand panel on the left, the form card on the right. */
function authShell(inner){
  return `<div class="auth"><aside class="auth-brand"><div class="auth-brand-top"><span class="auth-mark">AM</span><span class="auth-name">AMBS</span></div>
    <div class="auth-pitch"><h2>Production &amp; stock,<br>one place for the whole team.</h2>
      <ul><li>${ic('box')}Raw materials, parts and products in every store</li>
        <li>${ic('wrench')}Purchasing, production and packing lists</li>
        <li>${ic('truck')}Deliveries with drivers and live tracking</li></ul></div>
    <div class="auth-foot">AM Building Solutions DWC LLC</div></aside>
    <section class="auth-card"><div class="auth-card-mark"><span class="auth-mark">AM</span></div>${inner}</section></div>`;
}
function renderConnectedApp(){
  $('#app').classList.remove('cloud-login-mode');
  const route=location.hash.slice(2);
  // The owner always starts on his overview — after signing in and after every refresh.
  if(isOwner())return App.go('owner');
  if(TITLES[route])App.go(route);else App.render();
}

// Existing ERP screens use this transaction interface. Its working copy is in memory
// and each write is committed to Supabase through a revision-checked transaction.
async function transaction(names,mode,work){
  const remote=await CLOUD.api();
  if(!remote.snapshot)throw Error('AMBS has not been initialized.');
  const snapshot=remote.snapshot;
  ensureTables(snapshot.state);
  let result, mutated=false;
  await new Promise((resolve,reject)=>{
    let pending=0, finalized=false;
    const finish=()=>{
      if(!pending&&!finalized){finalized=true;resolve();}
    };
    const abort=error=>{finalized=true;reject(error);};
    const readRequest=read=>{
      const request={};
      pending++;
      queueMicrotask(()=>{
        if(finalized)return;
        try{request.result=read();request.onsuccess?.();}
        catch(error){abort(error);}
        finally{pending--;finish();}
      });
      return request;
    };
    const connector={objectStore(name){
      if(!names.includes(name))throw Error('Unexpected collection.');
      const list=name==='erpV3'?[{id:'state',data:snapshot.state}]:snapshot.legacy[name];
      const write=()=>{
        if(mode!=='readwrite')throw Error('Unexpected write.');
        mutated=true;
      };
      return {
        get:id=>readRequest(()=>list.find(row=>row.id===id)),
        getAll:()=>readRequest(()=>list),
        put(row){
          write();
          if(name==='erpV3')snapshot.state=row.data;
          else add(list,row);
        },
        delete(id){write();snapshot.legacy[name]=list.filter(row=>row.id!==id);}
      };
    }};
    try{work(connector,value=>{result=value;},abort);finish();}
    catch(error){abort(error);}
  });
  if(mutated)await CLOUD.api('PUT',{revision:remote.revision,snapshot});
  return result;
}

async function commit(change){
  const next=await transaction(['erpV3'],'readwrite',(t,done,abort)=>{
    const store=t.objectStore('erpV3'), request=store.get('state');
    request.onsuccess=()=>{
      try{
        const data=request.result.data;
        change(data);
        store.put({id:'state',data});
        done(data);
      }catch(error){abort(error);}
    };
  });
  reflect(next);
}

/* Shared views and editors */
const TITLES={owner:'Owner overview',team:'Team activity',items:'Items & stock',dashboard:'Dashboard',customers:'Customers',suppliers:'Vendors',processors:'Processing Companies',
  materials:'Raw Materials',parts:'Parts',bom:'Bills of Materials',products:'Products',production:'Production',
  tracking:'Live Tracking',drivers:'Drivers',deliveries:'Deliveries',
  sales:'Sales Orders',purchase:'Purchasing',movement:'Inventory & Stock Movements',dispatch:'Packing & Dispatch',reports:'Reports',
  tools:'Tools',settings:'Settings & Data',market:'Market Sections',steel:'Steel Weight Calculator',
  prodcalc:'Product Calculator','prodcalc-new':'Product Take-off',nesting:'Product Nesting',
  'plan-new':'Production','purchase-new':'Purchasing'};
/* Owner (super admin) gets his own menu: the team's work, items and tracking. Admins see the same pages under "Owner view". */
const isOwner=()=>typeof CLOUD!=='undefined'&&CLOUD.role==='owner';
const canSeeOwner=()=>typeof CLOUD!=='undefined'&&['owner','admin'].includes(CLOUD.role);
const OWNER_GROUPS=[
  ['Owner',[['owner','chart'],['team','users'],['items','box']]],
  ['Follow the work',[['tracking','route'],['deliveries','truck'],['sales','invoice'],['purchase','cart'],['production','wrench'],['reports','pdf']]]
];
const GROUPS=[
  ['Overview',[['dashboard','dashboard'],['tracking','route'],['customers','users'],['suppliers','warehouse'],['drivers','driver'],['processors','factory']]],
  ['Master Data',[['materials','stack'],['parts','nut'],['products','box'],['bom','tree']]],
  ['Operations',[['sales','invoice'],['purchase','cart'],['production','wrench'],['movement','swap'],['dispatch','truck'],['deliveries','route']]],
  ['System',[['reports','chart'],['tools','calc'],['settings','gear']]]
];
const ENTITY={customers:'Customer',suppliers:'Vendor',processors:'Processing Company',materials:'Raw Material',parts:'Part',products:'Product'};
const COMPANIES=['customers','suppliers','processors'];
const qfmt=(n,u='')=>nfmt(Math.abs(n)<EPS?0:n,6)+(u?' '+u:'');
const stamp=x=>fmtDate(x)+' '+(x?new Date(x).toLocaleTimeString('en-GB',{hour:'2-digit',minute:'2-digit'}):'');
const button=(text,action,style='',icon='')=>`<button type="button" class="btn ${style}" onclick="${action}">${icon?ic(icon):''}${esc(text)}</button>`;
const small=(text,action)=>button(text,action,'btn-sm');
const dangerSmall=(text,action)=>button(text,action,'btn-sm btn-danger');
const openBtn=action=>`<button type="button" class="o-open" onclick="${action}">View</button>`;
const actionGroup=(...actions)=>`<div class="erp-actions">${actions.join('')}</div>`;
const link=(r,text=TITLES[r])=>button(text,`App.go(${escapeArg(r)})`,'btn-sm');
/* Menu group of the current page, e.g. "Master Data" for Products; tool pages sit under System / Tools. */
const menuGroup=()=>{const r=typeof App!=='undefined'?App.route:'';
  if(['steel','market','prodcalc','prodcalc-new','nesting'].includes(r))return 'System / Tools';
  if(['owner','team','items'].includes(r))return isOwner()?'Super admin':'Owner view';
  return GROUPS.find(([,rows])=>rows.some(([x])=>x===r))?.[0]||'';};
const crumbParent=()=>menuGroup()?`<span class="o-bc-parent">${esc(menuGroup())}</span><span class="o-bc-sep">/</span>`:'';
const head=(group,title,...actions)=>`<div class="view-head"><div class="o-bc o-bc-list">${crumbParent()}<h1 class="h1">${esc(title)}</h1></div><div class="head-actions">${actions.join('')}</div></div>`;
const note=(text,kind='info')=>`<div class="note ${kind}" style="margin-bottom:12px">${esc(text)}</div>`;
const table=(columns,rows,empty='No records yet.',searchTerms=[])=>`<div class="tbl-wrap"><table class="tbl"><thead><tr>${columns.map(c=>`<th>${esc(c)}</th>`).join('')}</tr></thead><tbody>${rows.length?rows.map((r,i)=>`<tr${searchTerms[i]?` data-search="${esc(searchTerms[i])}"`:''}>${r.map(c=>`<td>${c??''}</td>`).join('')}</tr>`).join(''):`<tr><td colspan="${columns.length}">${esc(empty)}</td></tr>`}</tbody></table></div>`;
const textTable=(columns,rows,empty)=>table(columns,rows.map(r=>r.map(esc)),empty);
const panel=(name,html)=>`<section class="card erp-table"><div class="card-head"><div class="card-title">${esc(name)}</div></div>${html}</section>`;
const chip=s=>statusChip(['Active','Approved','Complete','Completed','Delivered','Received','Closed'].includes(s)?'ok':
  ['Missing','Cancelled','Archived','Rejected'].includes(s)?'bad':
  ['Review required','Partially delivered','Partially received','Reserved','Shortage','Low stock'].includes(s)?'warn':
  ['Released','Ordered','Open','In progress','Confirmed'].includes(s)?'info':'neutral',s);
const cell=(main,sub='')=>`<strong>${esc(main)}</strong>${sub?`<div class="sub">${esc(sub)}</div>`:''}`;
const thumb=(src,alt='',size='')=>validImage(src)?`<img class="thumb ${size}" src="${esc(src)}" alt="${esc(alt)}" loading="lazy">`:'';
const recordPicture=(row,size='thumb-record')=>thumb(row.image,row.name,size)||
  `<span class="thumb-ph ${size}" aria-label="No image">${ic('box')}</span>`;
/* Two-column label / value fields (Odoo form layout). */
const kv=rows=>{const r=rows.filter(x=>x[1]!==''&&x[1]!=null);
  return r.length?`<div class="o-fields">${r.map(([k,v])=>`<div class="o-field"><span class="o-label">${esc(k)}</span><span class="o-value">${esc(v)}</span></div>`).join('')}</div>`:'';};
/* Odoo status bar: the record's steps, current one highlighted; actions on the left. */
function formHeader(actions,steps,current){
  const list=steps.includes(current)?steps:[...steps,current];
  const at=list.indexOf(current);
  return `<div class="o-form-header"><div class="o-fh-actions">${actions.filter(Boolean).join('')}</div>
    <div class="o-statusbar">${list.map((s,i)=>`<span class="${i===at?'on':i<at&&current!=='Cancelled'?'done':''}">${esc(s)}</span>`).join('')}</div></div>`;
}
/* Sections of a record page become tabs (Odoo notebook). */
function makeNotebook(sheet){
  const blocks=[...sheet.children].filter(el=>el.matches('section.card,.co-section')&&el.querySelector('.card-title'));
  if(blocks.length<2)return;
  const nav=document.createElement('div');nav.className='o-notebook-nav';nav.setAttribute('role','tablist');
  blocks.forEach((b,i)=>{
    const t=document.createElement('button');t.type='button';t.className='o-tab'+(i?'':' on');t.setAttribute('role','tab');
    t.textContent=b.querySelector('.card-title').textContent.replace(/\s*·.*$/,'');
    t.onclick=()=>{blocks.forEach((x,j)=>{x.hidden=j!==i;nav.children[j].classList.toggle('on',j===i);});};
    nav.append(t);b.classList.add('o-pane');b.hidden=i>0;
  });
  blocks[0].before(nav);
}
function showSection(id){
  const el=document.getElementById(id);if(!el)return;
  const pane=el.closest('.o-pane')||el;
  if(pane.hidden){const nav=pane.parentElement.querySelector('.o-notebook-nav'),panes=[...pane.parentElement.querySelectorAll(':scope > .o-pane')];
    nav?.children[panes.indexOf(pane)]?.click();}
  el.scrollIntoView({behavior:'smooth',block:'start'});
}
/* History log beside a record (Odoo chatter), built from what the system already records. */
function recordRef(rec){
  if(!rec)return null;
  const [x,y]=rec.args;
  return {masterView:{table:x,id:y},companyView:{table:x,id:y},recipeView:{table:'recipes',id:y,owner:x},driverView:{table:'drivers',id:x},
    tripView:{table:'trips',id:x},salesView:{table:'sales',id:x},purchaseView:{table:'purchases',id:x},dispatchView:{table:'jobs',id:x},
    orderView:{table:'orders',id:x},planView:{table:'plans',id:x},trackItem:{table:'items',id:x}}[rec.fn]||null;
}
function recordHistory(rec){
  const ref=recordRef(rec);if(!ref)return '';
  const id=ref.id, r=ref.table==='items'?item(state,id):get(state,ref.table,id), out=[];
  const push=(at,text,by)=>{if(at)out.push({at,text,by});};
  if(r){push(r.at,['sales','purchases','jobs','orders','plans','trips'].includes(ref.table)?'Created':'Last saved',r.by);
    push(r.updated,'Updated',r.by);push(r.departedAt,'Trip started — driver on the way',r.by);push(r.completedAt,'Production completed',r.by);
    if(r.deliveredAt&&ref.table==='trips')push(r.deliveredAt,'Delivered',r.by);}
  for(const e of state.events)if(e.partyId===id||e.salesId===id||e.purchaseId===id||e.jobId===id||e.orderId===id||e.id==='production:'+id||
    e.lines.some(l=>l.sku===id))push(e.at,evType(e.type)+(e.note?' · '+e.note:''),e.by);
  for(const t of state.trips)if(t.driverId===id||t.salesId===id||t.jobId===id||t.customerId===id){
    push(t.at,'Trip '+t.no+' created'+(ref.table==='drivers'?' · '+(t.customerName||''):' · driver '+(get(state,'drivers',t.driverId)?.name||'')),t.by);
    push(t.departedAt,'Trip '+t.no+' left',t.by);}
  if(ref.table==='customers')for(const o of state.sales.filter(o=>o.customerId===id))push(o.at,'Sales order '+o.no+' created');
  if(ref.table==='suppliers')for(const o of state.purchases.filter(o=>o.supplierId===id))push(o.at,'Purchase '+o.no+' created');
  out.sort((x,y)=>String(y.at).localeCompare(String(x.at)));
  return `<aside class="o-chatter"><div class="o-chatter-head">History</div>${out.length?out.slice(0,40).map(m=>`<div class="o-msg">
    <span class="o-msg-avatar">${esc(initials(m.by||'System'))}</span><div><div class="o-msg-meta"><b>${esc(m.by||'System')}</b> · ${esc(stamp(m.at.length<=10?m.at+'T12:00:00':m.at))}</div>
    <div class="o-msg-text">${esc(m.text)}</div></div></div>`).join(''):'<div class="o-msg-empty">Nothing recorded yet.</div>'}</aside>`;
}
const dateSort=(a,b)=>(b.at||'').localeCompare(a.at||'');
const valOf=(form,name)=>form.elements.namedItem(name)?.value?.trim()||'';
const checked=(form,name)=>form.elements.namedItem(name)?.checked===true;
const labelOf=(s,id)=>label(item(s,id));
const field=(title,html,full=false)=>`<div class="field ${full?'full':''}"><label>${esc(title)}${html.startsWith('<input')||html.startsWith('<select')||html.startsWith('<textarea')?html:''}</label>${html.startsWith('<div')?html:''}</div>`;
/* Example hints shown inside empty fields. Matched by label first, then by field name
   (repeated lines use "<line>_<field>" names, matched by their "_field" suffix). */
const byPage=(map,fallback)=>()=>map[typeof App!=='undefined'?App.route:'']||fallback;
const HINT_LABELS={
  'Confirmation code':'e.g. 123456','Reset code':'e.g. 123456','Code / SKU':'e.g. NET-4.5-Y','SKU':'e.g. NET-4.5-Y',
  'Reference / project':'e.g. Dubai Hills Tower B','Material name':'e.g. MS SHS 50×50×2.5 mm',
  'Password':'Your password','New password':'At least 12 characters','Tax registration':'e.g. 100123456700003',
  'Reference / notes':'e.g. Urgent, needed for Dubai Hills site','Location notes':'e.g. Gate 3, call before arrival',
  'Line notes':'e.g. Cut to 6 m lengths','Verification reason / reference':'e.g. Physical count on 24 Nov'
};
const HINTS={
  code:byPage({customers:'e.g. C-001',suppliers:'e.g. S-001',processors:'e.g. P-001',materials:'e.g. RM-SHS-50',
    parts:'e.g. PT-COUPLER-01',products:'e.g. NET-4Y'},'e.g. ITEM-001'),
  name:byPage({customers:'e.g. Emaar Construction LLC',suppliers:'e.g. Metal Solution Trading',processors:'e.g. Gulf Galvanizing Factory',
    parts:'e.g. Adjustable coupler',products:'e.g. Safety Net 4.0 m Yellow'},'e.g. Main item name'),
  category:byPage({materials:'e.g. Tubes',parts:'e.g. Fasteners / accessories',products:'e.g. 4.0 STD-Y'},'e.g. Accessories'),
  details:byPage({processors:'e.g. Galvanizing, Powder coating'},'e.g. Steel tubes and sheets'),
  email:'e.g. name@company.com',phone:'e.g. +971 50 123 4567',address:'e.g. Building 3, Emaar Square, Downtown',
  city:'e.g. Dubai',country:'e.g. United Arab Emirates',contact:'e.g. Ahmad Saleh',manager:'e.g. Mohannad',
  creditLimit:'e.g. 50000',leadTime:'e.g. 7',paymentTerms:'e.g. 30 days',reference:'e.g. PO-7781',ref:'e.g. DN-1024',
  company:'e.g. AM Building Solutions DWC LLC',currentUser:'e.g. Store Keeper',dimensions:'e.g. 50 × 50 × 2.5 mm, 6 m length',
  color:'e.g. Yellow',size:'e.g. 4.5 × 3.1 m',unit:'e.g. PCS',opening:'e.g. 120',safety:'e.g. 20',bundle:'e.g. 10',
  stockLen:'e.g. 6',rateKg:'e.g. 3.25',ratePc:'e.g. 12.50',orderQty:'e.g. 1',qty:'e.g. 10',line:'e.g. 4',
  reason:'e.g. Physical count on 24 Nov',notes:'e.g. Deliveries only on weekdays before 3 pm',
  _cname:'e.g. Ahmad Saleh',_job:'e.g. Site Engineer',_cphone:'e.g. +971 50 123 4567',_cemail:'e.g. ahmad@company.com',
  _name:'e.g. Main Store',_address:'e.g. Plot 598-123, Dubai Investment Park',_city:'e.g. Dubai',
  _url:'e.g. https://maps.app.goo.gl/…',_lat:'e.g. 25.2048',_lng:'e.g. 55.2708',_notes:'e.g. Gate 3, call before arrival',
  _qty:'e.g. 13',_price:'e.g. 250',_count:'e.g. 2',_formula:'e.g. 4.2 * 2',_wastage:'e.g. 5',_unit:'e.g. PCS'
};
const PICK_HINTS={customer:'Type a customer name or code…',supplier:'Type a vendor name or code…',processor:'Type a processing company…',
  relatedParty:'Type a company name…',part:'Type a part name or code…',product:'Type a product name or code…',
  sku:'Type an item name or code, e.g. safety net…',bomOwner:'Type a part or product name or code…'};
function fieldHint(title,name){
  const key=String(name).replace(/\d+$/,'');
  const hint=HINT_LABELS[title]??HINTS[key]??HINTS['_'+key.split('_').pop()];
  return typeof hint==='function'?hint():hint||'';
}
function input(title,name,value='',options={}){
  const {type='text',required=false,full=false,extra=''}=options;
  const hint=/placeholder=/.test(extra)||['file','date','hidden','checkbox','radio','password'].includes(type)&&!HINT_LABELS[title]?'':fieldHint(title,name);
  return field(title,`<input class="inp" name="${name}" type="${type}" value="${esc(value)}" ${extra}${hint?` placeholder="${esc(hint)}"`:''}>`,full);
}
function number(title,name,value='',min=0,step='any',required=true){
  return input(title,name,value,{type:'number',required,extra:`min="${min}" step="${step}"`});
}
function area(title,name,value=''){
  const hint=fieldHint(title,name);
  return field(title,`<textarea class="inp" name="${name}" rows="2"${hint?` placeholder="${esc(hint)}"`:''}>${esc(value)}</textarea>`,true);
}
function choiceOptions(rows,selected='',placeholder='Select…'){
  return `<option value="">${esc(placeholder)}</option>`+rows.map(([id,name])=>`<option value="${esc(id)}" ${id===selected?'selected':''}>${esc(name)}</option>`).join('');
}
function select(title,name,rows,selected='',required=true,placeholder){
  return field(title,`<select class="sel" name="${name}">${choiceOptions(rows,selected,placeholder)}</select>`);
}
function suggestedInput(title,name,value,options,required=false){
  const id='suggest_'+name.replace(/[^a-z0-9_-]/gi,'_');
  const choices=[...new Set([...options,value].filter(Boolean))];
  return input(title,name,value,{required,extra:`list="${id}"`})+
    `<datalist id="${id}">${choices.map(option=>`<option value="${esc(option)}"></option>`).join('')}</datalist>`;
}
function tick(title,name,value=false){
  return `<div class="field"><label><input name="${name}" type="checkbox" ${value?'checked':''}> ${esc(title)}</label></div>`;
}
function pair(rows,show=label){return rows.map(x=>[x.id,show(x)]);}
function same(rows){return rows.map(x=>[x,x]);}
function custody(s=state){return current(s,'locations').filter(l=>l.stock&&(!l.ownerId||get(s,l.ownerType,l.ownerId)?.active!==false));}
function locOptions(){return pair(custody(),l=>locName(state,l.id));}
function skus(s=state){return [...current(s,'materials'),...current(s,'parts'),...current(s,'products'),...current(s,'variants')]
  .filter(r=>{try{stockItem(s,r.id);return true;}catch{return false;}});}
function searchable(title,name,rows,selected=''){
  const hint=PICK_HINTS[name]||PICK_HINTS[String(name).split('_').pop()]||'Type to search…';
  return field(title,`<div class="erp-pick" data-pick="${name}"><input class="inp" name="${name}Search" aria-label="${esc(title)}"
     placeholder="${esc(hint)}" autocomplete="off" value="${esc(rows.find(r=>r[0]===selected)?.[1]||'')}"><input type="hidden" name="${name}" value="${esc(selected)}">
     <div class="erp-options"></div><template>${choiceOptions(rows)}</template></div>`);
}
/* Stock items in search pickers show their photo. Values are an item id or a JSON [type,id] pair. */
function pickRecord(value){
  let id=value;
  if(String(value).startsWith('['))try{id=JSON.parse(value)[1];}catch{}
  return state&&item(state,id)||null;
}
function wirePicks(root){
  root.querySelectorAll('.erp-pick:not([data-wired])').forEach(box=>{
    box.dataset.wired='1';
    const text=box.querySelector('input'), hidden=box.querySelector('input[type=hidden]'), menu=box.querySelector('.erp-options');
    const choices=[...box.querySelector('template').content.querySelectorAll('option')].filter(o=>o.value);
    function choose(o){hidden.value=o.value;text.value=o.textContent;menu.replaceChildren();hidden.dispatchEvent(new Event('change',{bubbles:true}));}
    function show(){
      const query=hidden.value?'':text.value.toLowerCase().trim();
      const words=query.split(/\s+/).filter(Boolean);
      const matches=choices.filter(o=>{const t=o.textContent.toLowerCase();return words.every(w=>t.includes(w));});
      // Large lists (thousands of items) only draw the first matches; typing narrows them down.
      menu.replaceChildren(...matches.slice(0,60).map(o=>{
        const b=document.createElement('button'); b.type='button';
        const rec=pickRecord(o.value);
        if(rec){b.className='pick-row';b.innerHTML=recordPicture(rec,'thumb-pick')+`<span>${esc(o.textContent)}</span>`;}
        else b.textContent=o.textContent;
        b.onclick=()=>choose(o); return b;
      }));
      if(matches.length>60){const more=document.createElement('div');more.className='erp-options-more';
        more.textContent=`Showing 60 of ${matches.length} — keep typing to narrow down`;menu.append(more);}
      if(!matches.length)menu.textContent='No matching records';
      return matches;
    }
    text.onfocus=show;
    text.oninput=()=>{hidden.value='';show();hidden.dispatchEvent(new Event('change',{bubbles:true}));};
    text.onkeydown=e=>{
      if(e.key==='Escape'&&menu.childNodes.length){e.preventDefault();menu.replaceChildren();}
      if(e.key==='ArrowDown'){e.preventDefault(); if(!menu.firstElementChild)show(); menu.firstElementChild?.focus();}
      if(e.key==='Enter'&&menu.childNodes.length){e.preventDefault();const match=show();if(match.length===1)choose(match[0]);}
    };
    box.addEventListener('focusout',e=>{if(!box.contains(e.relatedTarget))menu.replaceChildren();});
  });
}
/* Odoo-style forms. "New …", "Add …", "Edit …" and "Create …" forms open as the page itself with Save / Discard at the top.
   Short actions (confirmations, receipts, transfers, assigning a driver) stay small dialogs. */
const PAGE_FORM=/^(Edit|Add|New|Create)\b/;
function formModal(title,body,save,{text='Save',intro='',danger=false,page}={}){
  const inline=(page??(PAGE_FORM.test(title)&&!danger))&&!_modalStack&&typeof App!=='undefined'&&!!$('#view');
  let back=null, form;
  if(inline){
    const view=$('#view');
    const crumbs=[`<button type="button" class="o-bc-link" onclick="App.discard()">${esc(TITLES[App.route]||'Back')}</button>`];
    if(App.record&&App.recordTitle)crumbs.push(`<button type="button" class="o-bc-link" onclick="App.discard()">${esc(App.recordTitle)}</button>`);
    view.innerHTML=`<form class="o-form-page erp-form"><div class="o-cp o-cp-record"><div class="o-bc">${crumbParent()}${crumbs.join('<span class="o-bc-sep">/</span>')}
      <span class="o-bc-sep">/</span><span class="o-bc-cur">${esc(title)}</span></div>
      <div class="o-cp-actions"><button class="btn ${danger?'btn-danger':'btn-primary'}" type="submit">${esc(text)}</button>
      <button type="button" class="btn btn-ghost" onclick="App.discard()">Discard</button></div></div>
      <div class="o-sheet o-sheet-edit erp-modal-body">${intro?note(intro):''}<div class="erp-error" role="alert"></div>${body}</div></form>`;
    App.editing=true;document.body.classList.add('o-record');window.scrollTo(0,0);
    form=$('form.o-form-page',view);
  }else{
    back=openModal(`<form><div class="modal-head"><div><h3>${esc(title)}</h3>${intro?`<div class="msub">${esc(intro)}</div>`:''}</div>
      <button type="button" class="x" aria-label="Close" onclick="closeModal()">${ic('x')}</button></div>
      <div class="modal-body erp-modal-body"><div class="erp-error" role="alert"></div>${body}</div>
      <div class="modal-foot"><button type="button" class="btn btn-ghost" onclick="closeModal()">Cancel</button>
      <button class="btn ${danger?'btn-danger':'btn-primary'}" type="submit">${ic(danger?'trash':'save')}${esc(text)}</button></div></form>`,'lg');
    back.classList.add('erp-form');
    form=$('form',back);
  }
  const submit=$('[type=submit]',form), error=$('.erp-error',form);
  // Owner request: no field is marked or enforced as "required" by the browser; saves explain what is missing.
  form.noValidate=true;form.querySelectorAll('[required]').forEach(el=>el.removeAttribute('required'));
  form.onsubmit=async e=>{
    e.preventDefault(); if(submit.disabled)return;
    error.textContent=''; submit.disabled=true;
    try{
      const message=await save(form);
      if(back)closeModal(back);else App.editing=false;
      App.render();
      toast(message||'Saved.','ok');
    }catch(err){error.textContent=err.message; error.scrollIntoView({block:'nearest'});}
    finally{submit.disabled=false;}
  };
  wirePicks(form);
  wireImagePreviews(form);
  return form;
}
function infoModal(title,body,footer=''){
  if(typeof App!=='undefined'&&App.recordRendering){
    const view=$('#view'), history=recordHistory(App.record);
    App.recordTitle=title;
    view.innerHTML=`<div class="o-cp o-cp-record"><div class="o-bc">${crumbParent()}<button type="button" class="o-bc-link" onclick="App.back()">${esc(TITLES[App.route]||'Back')}</button>
      <span class="o-bc-sep">/</span><span class="o-bc-cur">${esc(title)}</span></div><div class="o-cp-actions">${footer}</div></div>
      <div class="o-form-wrap"><div class="o-sheet erp-modal-body">${body}</div>${history}</div>`;
    const sheet=$('.o-sheet',view), header=$(':scope > .o-form-header',sheet);
    if(header)view.querySelector('.o-form-wrap').before(header);
    makeNotebook(sheet);
    gearActions(view);
    return view;
  }
  return openModal(`<div class="modal-head"><h3>${esc(title)}</h3><button class="x" aria-label="Close" onclick="closeModal()">${ic('x')}</button></div>
    <div class="modal-body erp-modal-body">${body}</div><div class="modal-foot">${footer}<button class="btn btn-ghost" onclick="closeModal()">Close</button></div>`,'lg');
}
/* Odoo keeps only the next step visible; PDF, Delete, Archive, Cancel and links live under one ⚙ Actions menu. */
const GEAR=/^(PDF|Download PDF|Excel|Delete|Archive|Restore|Cancel|Partial delivery|Variants|Driver|Sales order|Dispatch job|View company|Packing list)\b/;
function gearActions(view){
  const cp=view.querySelector('.o-cp-actions');if(!cp)return;
  const spots=[cp,view.querySelector('.o-form-header .o-fh-actions')].filter(Boolean);
  const moved=spots.flatMap(s=>[...s.querySelectorAll('button,a.btn,a.o-pin')].filter(b=>GEAR.test(b.textContent.trim())));
  if(!moved.length)return;
  const menu=document.createElement('details');menu.className='o-gear';
  menu.innerHTML=`<summary class="btn btn-sm" title="More actions">${ic('gear')}Actions</summary><div class="o-gear-menu" role="menu"></div>`;
  const list=menu.querySelector('.o-gear-menu');
  const isDanger=b=>/^Delete/.test(b.textContent.trim());
  for(const b of [...moved.filter(b=>!isDanger(b)),...moved.filter(isDanger)]){
    const danger=isDanger(b);
    b.className='o-gear-item'+(danger?' danger':'');b.setAttribute('role','menuitem');
    if(danger&&list.children.length&&!list.querySelector('.o-gear-sep'))list.insertAdjacentHTML('beforeend','<div class="o-gear-sep"></div>');
    list.append(b);
  }
  menu.addEventListener('click',e=>{if(e.target.closest('.o-gear-item'))menu.open=false;});
  cp.prepend(menu);
}
document.addEventListener('click',e=>{document.querySelectorAll('details.o-gear[open]').forEach(d=>{if(!d.contains(e.target))d.open=false;});});
function approval(title,description,work,text='Confirm'){
  return formModal(title,note(description),async()=>{
    await commit(work);
    return text.startsWith('Delete')?'Deleted.':undefined;
  },{text,danger:text.startsWith('Delete')});
}
/* Repeating line editor. With `auto` there is no "Add line" button: the list starts with auto.min lines and a
   new empty line appears only once the last line is complete (auto.complete, or auto.filled when not given).
   auto.filled decides which lines are saved. */
function repeat(form,container,draw,rows,addLabel,auto=null){
  const box=form.querySelector(container), list=document.createElement('div');
  box.append(list);
  const b=document.createElement('button');
  b.type='button';b.className='btn btn-sm';b.textContent=addLabel;if(!auto)box.append(b);
  const create=(value={})=>{
    const line=document.createElement('fieldset');line.className='erp-line';
    const n=key().replace(/[^a-z0-9]/gi,'');
    line.innerHTML=draw(value,n)+'<button type="button" class="btn btn-sm btn-danger erp-remove">Remove line</button>';
    list.append(line);
    $('.erp-remove',line).onclick=()=>{line.remove();box.dispatchEvent(new Event('change',{bubbles:true}));};
    wirePicks(line);
    return line;
  };
  rows.forEach(create);
  b.onclick=()=>{create();box.dispatchEvent(new Event('change',{bubbles:true}));};
  if(auto){
    box.classList.add('erp-auto-lines');
    const grow=()=>{
      while(list.children.length<(auto.min||1))create();
      const last=list.lastElementChild;
      if((auto.complete||auto.filled)(last))create();
    };
    grow();
    box.addEventListener('change',grow);box.addEventListener('input',grow);
    return ()=>[...list.children].filter(line=>auto.filled(line));
  }
  return ()=>[...list.children];
}
function fieldValue(row,name){return row.querySelector(`[data-field="${name}"],[name$="_${name}"]`)?.value?.trim()||'';}
function validImage(value){return typeof value==='string' && /^data:image\/(?:png|jpeg|jpg|webp|gif);base64,[A-Za-z0-9+/]+=*$/.test(value);}
async function imageValue(form,existing=''){
  const file=form.elements.photo?.files[0];
  if(!file)return checked(form,'removeImage')?'':existing;
  need(file.size<=10*1024*1024,'Image must be 10 MB or smaller.');
  need(/^image\/(?:png|jpeg|webp|gif)$/.test(file.type),'Use a PNG, JPEG, WebP or GIF image.');
  const original=await new Promise((resolve,reject)=>{
    const r=new FileReader(); r.onload=()=>resolve(r.result);r.onerror=()=>reject(r.error);r.readAsDataURL(file);
  });
  need(validImage(original),'Use a PNG, JPEG, WebP or GIF image.');
  const img=new Image(); img.src=original;
  try{await img.decode();}catch{throw Error('The image could not be opened.');}
  const canvas=document.createElement('canvas');
  const context=canvas.getContext('2d');need(context,'This browser could not process the image.');
  let value='';
  for(const edge of [960,800,640]){
    const scale=Math.min(1,edge/Math.max(img.naturalWidth,img.naturalHeight));
    canvas.width=Math.max(1,Math.round(img.naturalWidth*scale));
    canvas.height=Math.max(1,Math.round(img.naturalHeight*scale));
    context.clearRect(0,0,canvas.width,canvas.height);
    context.drawImage(img,0,0,canvas.width,canvas.height);
    const webp=canvas.toDataURL('image/webp',.84).startsWith('data:image/webp');
    if(!webp){
      // Browsers without WebP encoding fall back to JPEG; flatten transparency onto white.
      context.globalCompositeOperation='destination-over';
      context.fillStyle='#fff';context.fillRect(0,0,canvas.width,canvas.height);
      context.globalCompositeOperation='source-over';
    }
    for(const quality of [.84,.72,.6,.48]){
      value=canvas.toDataURL(webp?'image/webp':'image/jpeg',quality);
      if(value.length<=350000)break;
    }
    if(value.length<=350000)break;
  }
  need(validImage(value)&&value.length<=350000,'This image is too detailed to save. Choose a smaller image.');
  return value;
}
function imageField(old,title='Image'){
  return `<div class="field image-picker image-compact" data-image-picker><span class="image-label">${esc(title)}</span>
    <div class="image-row"><div class="image-preview" role="status">${validImage(old)?thumb(old,'Current image','thumb-preview'):
      `<div class="image-preview-empty">${ic('box')}<span>No image selected</span></div>`}</div>
    <input class="inp" name="photo" type="file" aria-label="${esc(title)}" accept="image/png,image/jpeg,image/webp,image/gif"></div>
    ${old?tick('Remove saved image','removeImage'):''}</div>`;
}
function wireImagePreviews(form){
  form.querySelectorAll('[data-image-picker]').forEach(picker=>{
    const fileInput=picker.querySelector('input[type="file"]'),preview=picker.querySelector('.image-preview');
    const remove=picker.querySelector('[name="removeImage"]'),original=preview.innerHTML;
    const empty=`<div class="image-preview-empty">${ic('box')}<span>No image selected</span></div>`;
    const update=()=>{
      const file=fileInput.files[0];
      if(!file){preview.innerHTML=remove?.checked?empty:original;return;}
      if(remove)remove.checked=false;
      if(!/^image\/(?:png|jpeg|webp|gif)$/.test(file.type)||file.size>10*1024*1024){
        preview.innerHTML=`<div class="image-preview-error">Choose a PNG, JPEG, WebP or GIF under 10 MB.</div>`;return;
      }
      const reader=new FileReader();
      reader.onload=()=>{if(fileInput.files[0]===file&&validImage(reader.result))
        preview.innerHTML=`<img class="thumb thumb-preview" src="${esc(reader.result)}" alt="Selected image preview"><span class="image-preview-name">${esc(file.name)}</span>`;};
      reader.onerror=()=>{preview.innerHTML='<div class="image-preview-error">Could not preview this image.</div>';};
      reader.readAsDataURL(file);
    };
    fileInput.addEventListener('change',update);
    remove?.addEventListener('change',()=>{if(remove.checked)fileInput.value='';update();});
  });
}
const CODE_PREFIX={customers:'C-',suppliers:'V-',processors:'P-',materials:'RM-',parts:'PT-',products:'PR-',variants:'VR-'};
function nextCode(s,table){
  const groups=COMPANIES.includes(table)?[table]:['materials','parts','products','variants'];
  const used=new Set(groups.flatMap(k=>s[k].map(r=>String(r.code||'').toUpperCase())));
  let n=1,code;
  do{code=CODE_PREFIX[table]+String(n++).padStart(table==='materials'?4:3,'0');}while(used.has(code));
  return code;
}
function codeCheck(s,table,row){
  need(row.name?.trim(),'Enter a name.');
  if(!row.code?.trim())row.code=nextCode(s,table);
  const groups=COMPANIES.includes(table)?[table]:['materials','parts','products','variants'];
  need(!groups.some(k=>s[k].some(r=>r.id!==row.id&&r.code.toLowerCase()===row.code.toLowerCase())),
    'This code or SKU is already in use.');
}
function activeCheck(s,table,row,old){
  if(!old)return;
  if(row.unit && row.unit!==old.unit && validUnit(old.unit)){
    const used=s.events.some(e=>e.lines.some(l=>l.sku===old.id))||
      s.recipes.some(r=>r.lines.some(l=>l.sku===old.id || l.partId===old.id || l.variantId===old.id))||
      s.variants.some(v=>v.partId===old.id)||s.purchases.some(p=>p.lines.some(l=>l.sku===old.id))||
      s.orders.some(o=>o.sku===old.id||o.materials.some(m=>m.sku===old.id))||
      s.jobs.some(j=>j.productId===old.id||j.parts.some(l=>l.sku===old.id))||
      s.sales.some(o=>o.lines.some(l=>l.sku===old.id));
    need(!used,'This unit is used in a BOM, variant or operational record.');
  }
  if(old.active!==false && row.active===false){
    need(Math.abs(physical(s,row.id))<EPS,'Move, consume or reconcile remaining stock before archiving this SKU.');
    need(!s.recipes.some(r=>r.approved&&item(s,r.id)?.active!==false&&r.lines.some(l=>l.sku===row.id||l.partId===row.id||l.variantId===row.id)),
      'Remove this item from active BOMs before archiving it.');
    need(!s.orders.some(o=>['Draft','Released'].includes(o.status)&&(o.sku===row.id||o.partId===row.id||o.materials.some(m=>m.sku===row.id)))&&
      !s.jobs.some(j=>j.status!=='Delivered'&&j.status!=='Cancelled'&&(j.productId===row.id||j.parts.some(l=>l.sku===row.id||l.partId===row.id)))&&
      !s.plans.some(p=>p.status==='Reserved'&&(p.products.some(l=>l.productId===row.id)||p.parts.some(l=>l.sku===row.id||l.partId===row.id)||p.materials.some(l=>l.sku===row.id)))&&
      !s.purchases.some(p=>['Draft','Ordered'].includes(p.status)&&(p.supplierId===row.id||p.lines.some(l=>l.sku===row.id)))&&
      !s.sales.some(o=>SALES_OPEN.includes(o.status)&&o.lines.some(l=>l.sku===row.id&&l.qty-l.delivered>EPS)),
      'This record is used in an open operation.');
    need(!s.variants.some(v=>v.partId===row.id&&v.active!==false),'Archive this part’s variants first.');
  }
}
function mapsLink(location){
  if(location.url){
    try{
      const u=new URL(location.url);
      const google=/^(?:(?:www|maps)\.)?google\.(?:com|ae|jo|co\.uk|com\.sa|com\.eg|de|fr|ca|com\.au)$/i.test(u.hostname);
      const short=u.hostname==='maps.app.goo.gl'||(u.hostname==='goo.gl'&&u.pathname.startsWith('/maps/'));
      if(u.protocol==='https:'&&!u.username&&!u.password&&!u.port&&(short||
        (google&&(/^\/maps(?:\/|$)/.test(u.pathname)||u.hostname.startsWith('maps.')))))return u.href;
    }catch{}
  }
  if(Number.isFinite(location.lat)&&Number.isFinite(location.lng))
    return 'https://www.google.com/maps/search/?api=1&query='+encodeURIComponent(location.lat+','+location.lng);
  return '';
}
function mapAction(l){
  const url=mapsLink(l);
  return url?`<a class="o-pin o-pin-text" href="${esc(url)}" target="_blank" rel="noopener noreferrer" title="Open in Google Maps">${ic('pin')}Map</a>`:'';
}
function locationFields(l,n,owned){
  return `<legend>${esc(l.name||'Location')}</legend><div class="form-grid">
    ${input('Location name',n+'_name',l.name,{required:true})}${input('City / emirate',n+'_city',l.city)}
    ${input('Address',n+'_address',l.address,{full:true})}${input('Google Maps URL',n+'_url',l.url,{type:'url',full:true})}
    ${input('Latitude',n+'_lat',l.lat??'',{type:'number',extra:'step="any" min="-90" max="90"'})}
    ${input('Longitude',n+'_lng',l.lng??'',{type:'number',extra:'step="any" min="-180" max="180"'})}
    ${area('Location notes',n+'_notes',l.notes)}
    ${owned?tick('Use as AMBS stock custody location',n+'_stock',l.stock):''}
    </div><input type="hidden" name="${n}_id" value="${esc(l.id||key())}">`;
}
function readLocation(row,owned=false){
  const data=Object.fromEntries(['id','name','city','address','url','notes'].map(x=>[x,fieldValue(row,x)]));
  const lat=fieldValue(row,'lat'),lng=fieldValue(row,'lng');
  need(data.name,'Enter a location name.');
  need((!lat&&!lng)||(lat&&lng&&Number.isFinite(+lat)&&Number.isFinite(+lng)&&Math.abs(+lat)<=90&&Math.abs(+lng)<=180),
    'Enter both latitude and longitude in range.');
  if(data.url)need(mapsLink({url:data.url}),'Enter a valid HTTPS Google Maps link.');
  return {...data,lat:lat?+lat:null,lng:lng?+lng:null,stock:!owned||row.querySelector('[name$="_stock"]')?.checked,active:true};
}
function locationUsed(s,id){
  return stockRows(s).some(x=>x.location===id)||
    s.jobs.some(x=>['Open','Partially delivered'].includes(x.status)&&(x.location===id||x.destination===id))||
    s.orders.some(x=>['Draft','Released'].includes(x.status)&&x.location===id)||
    s.plans.some(x=>x.status==='Reserved'&&x.location===id)||
    s.purchases.some(x=>['Draft','Ordered'].includes(x.status)&&x.location===id);
}
function locationEdit(id){
  const old=get(state,'locations',id);
  return formModal(old?'Edit custody location':'Add custody location',
    `<div class="form-grid">${locationFields(old||{},'location',false).replace(/<legend>.*?<\/legend>/,'')}</div>`,async f=>{
      const row=readLocation(f);
      await commit(s=>{
        need(!s.locations.some(l=>!l.ownerId&&l.id!==row.id&&l.name.toLowerCase()===row.name.toLowerCase()),'This location name is already in use.');
        add(s.locations,{...old,...row});
      });
    });
}
function companyLocations(s,type,id,activeOnly=true){
  return s.locations.filter(l=>l.ownerType===type&&l.ownerId===id&&(!activeOnly||l.active!==false));
}
function wireCompanySite(form,type,companyField,siteField,selected=''){
  const company=form.elements[companyField],site=form.elements[siteField];
  const refresh=chosen=>{site.innerHTML=choiceOptions(company.value?pair(companyLocations(state,type,company.value),l=>
    l.name+(l.city?' · '+l.city:'')):[],chosen,'No linked site');};
  company.addEventListener('change',()=>refresh(''));
  refresh(selected);
}
function checkedCompanySite(s,type,companyId,siteId){
  need(!siteId||companyId,'Choose a company for the linked site.');
  if(companyId)live(s,type,companyId);
  if(siteId){const site=live(s,'locations',siteId);
    need(site.ownerType===type&&site.ownerId===companyId,'Choose a site belonging to the selected company.');}
}
const PACKING_COLORS=['Yellow','Red'];
const NET_SIZES=['4.5 × 3.1 m','6.5 × 3.1 m','4 × 4.5 m','6.5 × 4.5 m','6.5 × 12 m'];
function sizeColorFields(row,sizes){
  const datalist=(id,values)=>`<datalist id="${id}">${values.map(v=>`<option value="${esc(v)}"></option>`).join('')}</datalist>`;
  return input('Size','size',row.size,{extra:'list="am-size-options"'})+
    input('Color','color',row.color,{extra:'list="am-color-options"'})+
    datalist('am-size-options',sizes)+datalist('am-color-options',PACKING_COLORS);
}
function packingCategory(category){
  return Object.hasOwn(PACKING_CATEGORIES,category)?PACKING_CATEGORIES[category]:null;
}
function packingRows(template){
  return template.parts.filter(part=>!template.size||part.qty!==0);
}
const packingInput=i=>'packingQty'+i;
const packingUnit=part=>part.unit==='EA'?'PCS':unit(part.unit);
function packingFormula(formula,cells){
  const expression=formula.slice(1).replace(/[A-Z]+[0-9]+/g,cell=>{
    need(Object.hasOwn(cells,cell),'Unknown workbook cell '+cell);
    return String(cells[cell]);
  });
  const result=evalFormula(expression);
  need(result.ok,'Invalid workbook formula '+formula);
  return result.value;
}
function packingRate(part,cells){
  if(part.requiredRow){
    const r=part.requiredRow;
    return packingFormula(part.formula,{['E'+r]:part.netRate,['D'+r]:cells.C6});
  }
  if(part.formula)return packingFormula(part.formula,cells);
  return part.qtyPerProduct??part.qty;
}
function packingValues(template,overrides=[]){
  const rows=packingRows(template), cells={C6:0,C7:0};
  for(const [i,part] of rows.entries()){
    if(!part.formula&&Object.hasOwn(cells,part.cell))cells[part.cell]=overrides[i]??packingRate(part,cells);
  }
  return rows.map((part,i)=>overrides[i]??packingRate(part,cells));
}
function applyPackingTemplate(form,rows,category,useEnteredNets=false){
  const template=packingCategory(category);
  if(!template)return;
  const templateRows=packingRows(template);
  const indexes=new Map(rows.map((part,i)=>[packingPartKey(part),i]));
  const overrides=[];
  if(useEnteredNets){
    templateRows.forEach((part,i)=>{
      if(part.formula||!/^C[67]$/.test(part.cell))return;
      const index=indexes.get(packingPartKey(part));
      if(index!=null)overrides[i]=Number(valOf(form,packingInput(index)));
    });
  }
  const values=packingValues(template,overrides);
  if(!useEnteredNets)rows.forEach((_,i)=>{form.elements.namedItem(packingInput(i)).value=0;});
  templateRows.forEach((part,i)=>{
    if(useEnteredNets&&!part.formula)return;
    const index=indexes.get(packingPartKey(part));
    need(index!=null,'Missing packing part '+part.name);
    form.elements.namedItem(packingInput(index)).value=values[i];
  });
  form.elements.namedItem('orderQty').dispatchEvent(new Event('input',{bubbles:true}));
}
function packingParts(rows,quantities,editable=false,order=1){
  return panel('Product parts',(editable?note('Search for a part and enter its quantity. Selected parts stay visible. A packing formula template can fill quantities automatically.')+
    `<div class="toolbar erp-packing-search"><div class="search">${ic('search')}<input class="inp" type="search" aria-label="Search product parts" placeholder="Search by part name or code…" oninput="filterPackingParts(this)"></div><span class="pill-legend" aria-live="polite"></span></div>`:'')+
    table(['Picture','Part description','Unit','Quantity per product','Order total'],rows.flatMap((part,i)=>{
      const count=quantities[i];
      if(!editable&&!count)return [];
      const step=measured(packingUnit(part))?'0.000001':1;
      const image=part.stockImage||PACKING_IMAGES[part.image];
      return [[image?thumb(image,part.name,'thumb-part'):'—',part.code?cell(part.name,part.code):esc(part.name),esc(part.unit),
        editable?`<input class="inp packing-qty" aria-label="${esc('Quantity for '+part.name)}" type="number"
          min="0" step="${step}" name="${packingInput(i)}" value="${esc(count)}" placeholder="e.g. 2" required>`:esc(count),
        `<span data-packing-total="${i}">${qfmt(count*order)}</span>`]];
    }),'No parts selected.',editable?rows.map(part=>[part.name,part.code,part.unit,part.size,part.color].filter(Boolean).join(' ')):[])+(rows.some((part,i)=>part.costFormula&&(editable||quantities[i]))?
      `<details style="padding:10px 14px"><summary>Workbook accessory cost estimate</summary>${
        table(['Part','Workbook formula','Estimated cost'],rows.flatMap((part,i)=>part.costFormula&&(editable||quantities[i])?[[
          esc(part.name),esc(part.costFormula),`<span data-packing-cost="${i}">${qfmt(packingCost(part,quantities[i]*order))}</span>`
        ]]:[]))}</details>`:''));
}
function filterPackingParts(input){
  const card=input.closest('.card'), query=searchKey(input.value).split(' ').filter(Boolean);
  const lines=card.querySelector('.tbl-wrap tbody');
  let selected=0,matches=0;
  for(const row of lines.rows){
    const quantity=Number(row.querySelector('.packing-qty')?.value||0);
    const chosen=Number.isFinite(quantity)&&quantity>0;
    const text=searchKey(row.dataset.search||row.textContent),words=text.split(' ');
    const match=query.length>0&&query.every(token=>text.includes(token)||words.some(word=>word.startsWith(token)||
      (token.length>=4&&searchDistance(token,word)<=(token.length>=8?2:1))));
    row.hidden=!chosen&&!match;
    if(chosen)selected++;
    if(match&&!chosen)matches++;
  }
  card.querySelector('.pill-legend').textContent=query.length?`${selected} selected · ${matches} matches`:
    `${selected} selected · search to add parts`;
}
function packingCost(part,total){
  return packingFormula(part.costFormula,{['G'+part.requiredRow]:part.price,['F'+part.requiredRow]:total});
}
function packingPartName(name){
  return String(name||'').toUpperCase().replace(/×/g,'X').replace(/ATTACHEMENT/g,'ATTACHMENT')
    .replace(/\bROP\b/g,'ROPE').replace(/DIAMTER/g,'DIAMETER').replace(/[^A-Z0-9.]/g,'');
}
const WORKBOOK_NETS=(()=>{
  const nets=new Map();
  for(const category of Object.values(PACKING_CATEGORIES)){
    for(const part of category.parts){
      if(part.formula||!/^C[67]$/.test(part.cell)||!(/\bNET\b/i.test(part.name)))continue;
      const previous=nets.get(part.name);
      if(!previous||(!previous.image&&part.image))nets.set(part.name,part);
    }
  }
  return [...nets.values()].map(part=>{
    const match=part.name.match(/(\d+(?:\.\d+)?)\s*M?\s*X\s*(\d+(?:\.\d+)?)\s*M/i);
    const color=/\(RED\)/i.test(part.name)?'Red':/\(YELLOW\)/i.test(part.name)?'Yellow':'';
    return {id:'workbook-net-'+packingPartName(part.name).toLowerCase(),
      code:'NET-'+(part.name.startsWith('STD')?'STD':part.name.includes('MAXI')?'MAXI':'VERTICAL')+
        '-'+match[1]+'X'+match[2]+(color?'-'+color[0]:''),
      name:part.name,category:'Safety Net',unit:packingUnit(part),source:'Stocked',active:true,
      size:match[1]+' × '+match[2]+' m',color,image:PACKING_IMAGES[part.image]||''};
  });
})();
function matchesWorkbookPart(row,part){
  return row.unit===packingUnit(part)&&packingPartName(row.packingName||row.name)===packingPartName(part.name);
}
function workbookPartRecord(part,index){
  const net=WORKBOOK_NETS.find(row=>matchesWorkbookPart(row,part));
  return net||{id:'workbook-part-'+packingPartName(part.name).toLowerCase(),
    code:'PK-'+String(index+1).padStart(3,'0'),name:part.name,category:'Packing list',
    unit:packingUnit(part),source:'Stocked',active:true,image:PACKING_IMAGES[part.image]||''};
}
function addWorkbookParts(s){
  let added=0;
  for(const [index,part] of WORKBOOK_PARTS.entries()){
    const record=workbookPartRecord(part,index);
    if(s.deletedWorkbookParts?.includes(record.id))continue;
    if(item(s,record.id)||[...s.parts,...s.variants].some(row=>matchesWorkbookPart(row,part)))continue;
    let code=record.code, suffix=2;
    while(['parts','materials','products','variants'].some(group=>s[group].some(row=>row.code.toLowerCase()===code.toLowerCase()))){
      code=record.code+'-'+suffix++;
    }
    s.parts.push({...record,code});
    added++;
  }
  return added;
}
function isDefaultWorkbookPart(row){
  return WORKBOOK_PARTS.some((part,index)=>{
    const base=workbookPartRecord(part,index);
    return base.id===row.id&&
      (row.code===base.code||new RegExp('^'+base.code+'-\\d+$').test(row.code))&&
      sameCloudRecord({...base,code:row.code},row);
  });
}
function prepareWorkbookPartBackupMerge(s,incoming){
  // Imported records take the place of untouched workbook defaults.
  const references=JSON.stringify({...s,parts:[]});
  s.parts=s.parts.filter(row=>{
    if(!isDefaultWorkbookPart(row)||references.includes(JSON.stringify(row.id)))return true;
    const part=WORKBOOK_PARTS.find(part=>workbookPartRecord(part,WORKBOOK_PARTS.indexOf(part)).id===row.id);
    return ![...incoming.parts,...incoming.variants].some(other=>other.id===row.id||matchesWorkbookPart(other,part));
  });
}
function packingStockPart(s,line){
  const name=packingPartName(line.name), stockUnit=packingUnit(line);
  const eligible=r=>r.unit===stockUnit&&packingPartName(r.packingName||r.name)===name;
  const matches=[...s.parts.filter(p=>eligible(p)&&!s.variants.some(v=>v.partId===p.id)),
    ...s.variants.filter(eligible)];
  need(matches.length<=1,'Multiple inventory SKUs match '+line.name+'. Keep one matching SKU before saving.');
  const existing=matches[0];
  if(existing){
    const sku=stockItem(s,existing.id);
    return sku.partId?{partId:sku.partId,variantId:sku.id}:{partId:sku.id};
  }
  need(!s.parts.some(eligible),'This part uses variants. Create a variant SKU named '+line.name+' with the workbook unit first.');
  const id=key(), code=operationNo('PK');
  const part={id,code,name:line.name,packingName:line.name,category:'Packing list',unit:stockUnit,source:'Stocked',active:true,
    image:PACKING_IMAGES[line.image]||'',at:now()};
  codeCheck(s,'parts',part);
  s.parts.push(part);
  return {partId:id};
}
function packingPartKey(part,stockUnit=packingUnit(part)){
  return packingPartName(part.name)+'|'+stockUnit;
}
const WORKBOOK_PARTS=(()=>{
  const byKey=new Map();
  for(const template of Object.values(PACKING_CATEGORIES)){
    for(const part of template.parts){
      const id=packingPartKey(part), existing=byKey.get(id);
      if(!existing||(!existing.image&&part.image))byKey.set(id,part);
    }
  }
  return [...byKey.values()];
})();
function productPacking(s,product,recipe){
  const existing=new Map((recipe?.lines||[]).map(line=>[line.variantId||line.partId,line]));
  const variantParents=new Set(s.variants.map(v=>v.partId));
  const stock=[...s.parts,...s.variants].filter(row=>existing.has(row.id)||
    (row.active!==false&&validUnit(row.unit)&&
      (row.partId?get(s,'parts',row.partId)?.active!==false:!variantParents.has(row.id))));
  const stockByKey=new Map();
  for(const sku of stock){
    const key=packingPartKey({name:sku.packingName||sku.name},sku.unit);
    if(!stockByKey.has(key))stockByKey.set(key,[]);
    stockByKey.get(key).push(sku);
  }
  const represented=new Set();
  const rows=WORKBOOK_PARTS.flatMap(part=>{
    const matches=stockByKey.get(packingPartKey(part))||[];
    if(!matches.length)return [part];
    return matches.map(sku=>{
      represented.add(sku.id);
      return {...part,name:sku.name,code:sku.code,stockId:sku.id,stockImage:sku.image};
    });
  });
  for(const sku of stock){
    if(!represented.has(sku.id)){
      rows.push({name:sku.name,unit:sku.unit,code:sku.code,stockId:sku.id,stockImage:sku.image});
    }
  }
  const selected=rows.map(part=>existing.get(part.stockId));
  const legacy=packingCategory(product?.category);
  const saved=product?.packingQuantities;
  const legacyRates=!recipe&&legacy&&saved?packingValues(legacy,saved):null;
  const legacyCounts=new Map(legacyRates?packingRows(legacy).map((part,i)=>[packingPartKey(part),legacyRates[i]]):[]);
  const quantities=rows.map((part,i)=>{
    const key=packingPartKey(part), count=legacyCounts.get(key);
    legacyCounts.delete(key);
    return selected[i]?.count??count??0;
  });
  return {rows,selected,quantities};
}
function wireProductPacking(form,rows){
  const search=form.querySelector('.erp-packing-search input');
  if(search)filterPackingParts(search);
  form.addEventListener('input',e=>{
    if(e.target.name!=='orderQty'&&!(/^packingQty\d+$/.test(e.target.name||'')))return;
    const category=valOf(form,'category'), template=packingCategory(category);
    if(template&&e.target.name?.startsWith('packingQty')){
      const changed=rows[Number(e.target.name.slice('packingQty'.length))];
      if(changed&&packingRows(template).some(part=>!part.formula&&/^C[67]$/.test(part.cell)&&
        packingPartKey(part)===packingPartKey(changed)))applyPackingTemplate(form,rows,category,true);
    }
    const order=Number(valOf(form,'orderQty'));
    rows.forEach((part,i)=>{
      const total=$(`[data-packing-total="${i}"]`,form);
      const quantity=Number(valOf(form,packingInput(i)))*order;
      const valid=quantity>=0&&quantity<=Number.MAX_SAFE_INTEGER&&order>=0;
      if(total)total.textContent=valid?qfmt(quantity):'—';
      const cost=$(`[data-packing-cost="${i}"]`,form);
      if(cost&&part.costFormula)cost.textContent=valid?qfmt(packingCost(part,roundMeasured(quantity))):'—';
    });
    if(search)filterPackingParts(search);
  });
}
function materialOpening(s,id){
  return s.events.filter(e=>['Opening stock','Verified legacy opening'].includes(e.type))
    .reduce((total,e)=>total+e.lines.reduce((sum,line)=>sum+(line.sku===id?line.delta:0),0),0);
}
function nextMaterialCode(s){
  const codes=new Set(['materials','parts','products','variants'].flatMap(type=>s[type].map(row=>row.code?.toUpperCase())));
  let number=1,code;
  do{code='RM-'+String(number++).padStart(4,'0');}while(codes.has(code));
  return code;
}
function materialFields(row,old){
  const opening=old?materialOpening(state,old.id):0;
  return input('Material name','name',row.name,{full:true,extra:'autofocus'})+
    input('Code','code',row.code||nextMaterialCode(state))+
    input('Category','category',row.category,{extra:'list="erp-categories"'})+
    imageField(row.image,'Material photo')+
    suggestedInput('Unit','unit',row.unit||'PCS',unitChoices(),true)+
    number('Bundle quantity (units per bundle)','bundle',row.bundle??0,0,1)+
    (old?input('Opening / initial stock','opening',qfmt(opening),{extra:'readonly'}):
      number('Opening / initial stock','opening',0,0,'any'))+
    (!old?`<div class="full" data-opening-location hidden>${select('Opening stock custody location','openingLocation',locOptions(),'',false,
      'Choose a custody location')}</div>`:'')+
    `<details class="o-more full"><summary>More details — section profile, stock length, rates, specifications</summary><div class="form-grid">`+
    field('Section profile (links to calculators)',`<select class="sel" name="profileKey"><option value="">— not linked —</option>${twcTypeOptions(row.profileKey||'')}</select>`)+
    number('Stock length (m)','stockLen',row.stockLen??6)+
    number('Rate (AED per kg)','rateKg',row.rateKg??0)+
    number('Rate (AED per piece)','ratePc',row.ratePc??0)+
    input('Dimensions / specifications','dimensions',row.dimensions,{full:true})+`</div></details>`+
    `<div class="field full material-help">Opening stock is posted once to the selected location. Later changes go through Inventory &amp; Stock Movements. Bundle quantities round purchase suggestions.</div>`+
    tick('Active (available for planning and movements)','active',row.active!==false);
}
/* Companies (customers, suppliers, processing companies): tabbed profile form and overview page. */
const PAYMENT_TERMS=['Advance payment','Cash on delivery','Immediate payment','7 days','15 days','30 days','45 days','60 days','90 days'];
const COMPANY_KIND={customers:'Customer',suppliers:'Vendor',processors:'Processing company'};
const companyContacts=r=>Array.isArray(r?.contacts)&&r.contacts.length?r.contacts:(r?.contact?[{name:r.contact,job:'',phone:'',email:''}]:[]);
const initials=name=>String(name||'?').trim().split(/\s+/).slice(0,2).map(w=>w[0]).join('').toUpperCase()||'?';
/* Click a customer / vendor avatar to upload (or replace) its logo or photo straight away. */
function logoUploader(type,r,size='co-avatar-sm'){
  const what=type==='drivers'?'photo':'logo / photo';
  return `<label class="co-avatar-up" data-tip="${validImage(r.image)?'Change '+what:'Upload a '+what}" onclick="event.stopPropagation()">
    ${companyAvatar(r,size)}<span class="co-avatar-cam" aria-hidden="true">${ic('plus')}</span>
    <input type="file" accept="image/png,image/jpeg,image/webp,image/gif" hidden aria-label="Upload logo for ${esc(r.name)}"
      onchange="uploadCompanyLogo(${escapeArg(type)},${escapeArg(r.id)},this)"></label>`;
}
function photoUploader(type,r,size='thumb-record'){
  return `<label class="photo-up" data-tip="${validImage(r.image)?'Change photo':'Upload a photo'}" onclick="event.stopPropagation()">
    ${recordPicture(r,size)}<span class="co-avatar-cam" aria-hidden="true">${ic('plus')}</span>
    <input type="file" accept="image/png,image/jpeg,image/webp,image/gif" hidden aria-label="Upload photo for ${esc(r.name)}"
      onchange="uploadCompanyLogo(${escapeArg(type)},${escapeArg(r.id)},this)"></label>`;
}
async function uploadCompanyLogo(type,id,inputEl){
  if(!inputEl.files[0])return;
  const holder=document.createElement('form'), viewing=!!inputEl.closest('.modal');
  holder.append(Object.assign(inputEl.cloneNode(),{name:'photo'}));
  holder.elements.photo.files=inputEl.files;
  try{
    const image=await imageValue(holder,'');
    await commit(s=>{const row=get(s,type,id);need(row,'This record no longer exists.');row.image=image;row.at=now();});
    if(viewing){closeModal();type==='drivers'?driverView(id):masterView(type,id);}
    App.render();toast(COMPANIES.includes(type)?'Logo saved.':'Photo saved.','ok');
  }catch(e){toast(e.message,'bad');}
  finally{inputEl.value='';}
}
function companyAvatar(r,size='co-avatar-sm'){
  return validImage(r.image)?`<img class="thumb co-avatar ${size}" src="${esc(r.image)}" alt="${esc(r.name)}" loading="lazy">`:
    `<span class="co-avatar co-initials ${size}" aria-hidden="true">${esc(initials(r.name))}</span>`;
}
const tagChips=tags=>(tags||[]).length?`<div class="co-tags">${tags.map(t=>`<span class="co-tag">${esc(t)}</span>`).join('')}</div>`:'';
function formTabs(tabs){
  return `<div class="co-tabs" role="tablist">${tabs.map(([k,l],i)=>`<button type="button" role="tab" class="co-tab${i?'':' on'}" data-tab="${k}" aria-selected="${!i}">${esc(l)}</button>`).join('')}</div>`+
    tabs.map(([k,,html],i)=>`<div class="co-panel" data-panel="${k}" role="tabpanel"${i?' hidden':''}>${html}</div>`).join('');
}
function wireFormTabs(form){
  const show=k=>{
    form.querySelectorAll('.co-tab').forEach(t=>{const on=t.dataset.tab===k;t.classList.toggle('on',on);t.setAttribute('aria-selected',String(on));});
    form.querySelectorAll('.co-panel').forEach(p=>{p.hidden=p.dataset.panel!==k;});
  };
  form.querySelectorAll('.co-tab').forEach(t=>t.addEventListener('click',()=>show(t.dataset.tab)));
  // A required field on a hidden tab: jump to that tab so the browser can point at it.
  form.addEventListener('invalid',e=>{const p=e.target.closest('.co-panel');if(p?.hidden)show(p.dataset.panel);},true);
}
/* UAE phone numbers: +971 is fixed, the employee types the rest (kept in one format for WhatsApp later). */
const uaeLocal=phone=>String(phone||'').trim().replace(/^(?:\+|00)?971[\s-]*/,'');
function phoneField(title,name,value){
  return field(title,`<div class="phone-in"><span class="phone-cc">+971</span><input class="inp" name="${name}" type="tel" inputmode="tel"
    value="${esc(uaeLocal(value))}" placeholder="50 123 4567" autocomplete="off" aria-label="${esc(title)}"></div>`);
}
function readPhone(form,name){
  const raw=valOf(form,name);
  if(!raw)return '';
  const digits=raw.replace(/\D/g,'').replace(/^(?:00)?971/,'').replace(/^0/,'');
  need(/^\d{8,9}$/.test(digits),'Enter the UAE number after +971, e.g. 50 123 4567.');
  return '+971 '+(digits.length===9?digits.slice(0,2)+' '+digits.slice(2,5)+' '+digits.slice(5):digits.slice(0,1)+' '+digits.slice(1,4)+' '+digits.slice(4));
}
const vendorSupplies=r=>(Array.isArray(r?.supplies)?r.supplies:[]).filter(x=>get(state,'materials',x.sku));
/* Google Maps location of a customer / vendor / trip. Accepts a Google Maps share link or "lat, lng" coordinates. */
function readMapUrl(form,name){
  const v=valOf(form,name);
  if(!v)return '';
  const xy=v.match(/^(-?\d{1,3}(?:\.\d+)?)\s*,\s*(-?\d{1,3}(?:\.\d+)?)$/);
  if(xy&&Math.abs(+xy[1])<=90&&Math.abs(+xy[2])<=180)return mapsLink({lat:+xy[1],lng:+xy[2]});
  const url=mapsLink({url:/^https?:\/\//i.test(v)?v:'https://'+v});
  need(url,'Paste a Google Maps link (in Google Maps: open the place → Share → Copy link), or coordinates like 25.2048, 55.2708.');
  return url;
}
function mapBtn(url,text='Map'){
  if(!url)return '';
  const tip='Open in Google Maps';
  return text==='Map'?`<a class="o-pin" href="${esc(url)}" target="_blank" rel="noopener noreferrer" title="${tip}" aria-label="${tip}">${ic('pin')}</a>`:
    `<a class="o-pin o-pin-text" href="${esc(url)}" target="_blank" rel="noopener noreferrer" title="${tip}">${ic('pin')}${esc(text)}</a>`;
}
const companyMap=(type,r)=>r?r.mapUrl||deliverySite(state,type,r.id)?.url||'':'';
function mapField(title,value,hint,full=true){
  return `<div class="field ${full?'full':''}"><label>${esc(title)}<input class="inp" name="mapUrl" type="text" value="${esc(value)}" placeholder="${esc(hint)}"></label>
    <span class="map-help">${ic('pin')} Google Maps → <b>Share → Copy link</b>, then paste. Coordinates also work.</span></div>`;
}
function deliverySite(s,type,id){return s.locations.find(l=>l.ownerType===type&&l.ownerId===id&&l.delivery);}
/* Customers: name, code, phone, position, delivery address. Vendors: name, code, phone, address, materials supplied.
   Processing companies: name, code, phone, email, address, map — their site holds AMBS stock so parts can be transferred there. */
function simpleCompanyEdit(type,id){
  const old=get(state,type,id), row=old||{}, vendor=type==='suppliers', proc=type==='processors', title=ENTITY[type];
  const address=row.address||deliverySite(state,type,id)?.address||'';
  const form=formModal((old?'Edit ':'Add ')+title,`<div class="form-grid">
    ${input('Name','name',row.name,{extra:`placeholder="${proc?'e.g. Gulf Galvanizing Factory':vendor?'e.g. Metal Solution Trading':'e.g. Emaar Construction LLC'}"`})}
    ${input('Code','code',row.code||nextCode(state,type),{extra:'placeholder="Given automatically"'})}
    ${phoneField('Phone number','phone',row.phone)}
    ${input('Email','email',row.email,{type:'email',extra:`placeholder="${proc?'e.g. orders@gulfgalv.ae':vendor?'e.g. sales@vendor.ae':'e.g. pm@emaar.ae'}"`})}
    ${vendor||proc?'':input('Position','position',row.position,{extra:'placeholder="e.g. Project Manager"'})}
    ${input(vendor||proc?'Address':'Delivery address','address',address,{extra:`placeholder="${proc?'e.g. Jebel Ali Industrial Area 1':vendor?'e.g. Al Quoz Industrial Area 3':'e.g. Dubai Hills, Building 3, Gate 2'}"`})}
    ${vendor?input('Address 2','address2',row.address2,{extra:'placeholder="Second branch or store (optional)"'}):''}
    ${mapField('Google Maps location',companyMap(type,row),'Paste the Google Maps link',false)}
    ${proc?'':imageField(row.image,'Logo / photo')}
    </div>`+(vendor?`<h4 class="erp-sub-head">Materials this vendor supplies</h4>
    <p class="sub" style="margin:-4px 0 10px">Pick a material and how many bundles. A new line appears by itself when you fill the last one.</p>
    <div data-supplies></div>`:''),async f=>{
    const data={...old,id:id||key(),name:valOf(f,'name'),code:valOf(f,'code'),phone:readPhone(f,'phone'),
      position:vendor||proc?old?.position||'':valOf(f,'position'),address:valOf(f,'address'),mapUrl:readMapUrl(f,'mapUrl'),active:old?.active!==false};
    data.email=valOf(f,'email');need(!data.email||/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(data.email),'Enter a valid email address.');
    if(vendor)data.address2=valOf(f,'address2');
    data.image=proc?old?.image||'':await imageValue(f,old?.image);
    if(vendor){
      data.supplies=supplyLines().map(l=>({sku:fieldValue(l,'sku'),bundles:qty(fieldValue(l,'bundles')||0,'Bundles',true)}));
      need(new Set(data.supplies.map(x=>x.sku)).size===data.supplies.length,'Each material can be listed once per vendor.');
    }
    await commit(s=>{
      const existing=get(s,type,data.id);
      need(!old||sameCloudRecord(old,existing),'This record changed. Reopen it before saving.');
      codeCheck(s,type,data);
      for(const x of data.supplies||[])need(get(s,'materials',x.sku),'Choose a raw material for every line.');
      add(s[type],{...data,at:now()});
      if(vendor)return;
      const site=deliverySite(s,type,data.id)||(proc?s.locations.find(l=>l.ownerType===type&&l.ownerId===data.id&&l.active!==false):null);
      // a processing company always gets a site that holds AMBS stock, so parts can be transferred there and back
      if(proc||data.address||data.mapUrl)add(s.locations,{...(site||{id:key(),name:proc?'Processing site':'Delivery address',city:'',url:'',notes:'',lat:null,lng:null}),
        address:data.address,url:data.mapUrl,stock:proc?true:site?.stock??false,active:true,delivery:true,ownerType:type,ownerId:data.id});
      else if(site&&!locationUsed(s,site.id))site.active=false;
    });
    return old?'Saved.':title+' added.';
  },{text:old?'Save changes':'Save '+title.toLowerCase()});
  const supplyLines=vendor?repeat(form,'[data-supplies]',(x,n)=>`<div class="form-grid line-compact">
    ${searchable('Raw material',n+'_sku',pair(state.materials.filter(m=>m.active!==false||m.id===x.sku)),x.sku)}
    ${input('Bundles',n+'_bundles',x.bundles??'',{type:'number',extra:'min="0" step="any" placeholder="e.g. 10"'})}</div>`,
    vendorSupplies(row),'Add material',{min:1,filled:line=>!!fieldValue(line,'sku'),complete:line=>!!fieldValue(line,'sku')&&Number(fieldValue(line,'bundles'))>0}):null;
}
function companyEdit(type,id){return simpleCompanyEdit(type,id);}
function companyView(type,id){
  const r=get(state,type,id), sites=companyLocations(state,type,id,false), siteIds=new Set(sites.map(l=>l.id));
  const contacts=companyContacts(r), stock=stockRows(state).filter(b=>siteIds.has(b.location));
  const sales=type==='customers'?state.sales.filter(o=>o.customerId===id).sort(dateSort):[];
  const jobs=type==='customers'?state.jobs.filter(j=>j.customerId===id).sort(dateSort):[];
  const purchases=type==='suppliers'?state.purchases.filter(p=>p.supplierId===id).sort(dateSort):[];
  const orders=state.orders.filter(o=>type==='customers'?o.customerId===id:type==='processors'?o.processorId===id:false).sort(dateSort);
  const events=state.events.filter(e=>e.partyType===type&&e.partyId===id||e.lines.some(l=>siteIds.has(l.location))).sort(dateSort);
  const openSales=sales.filter(o=>SALES_OPEN.includes(o.status));
  const openValue=openSales.reduce((n,o)=>n+o.lines.reduce((m,l)=>m+(l.price||0)*Math.max(0,l.qty-l.delivered),0),0);
  const orderedValue=sales.filter(o=>o.status!=='Cancelled').reduce((n,o)=>n+salesTotal(o),0);
  const openPurchases=purchases.filter(p=>['Draft','Ordered'].includes(p.status));
  const openOrders=orders.filter(o=>['Draft','Released'].includes(o.status));
  const go=target=>`showSection('${target}')`;
  const smart=({customers:[
      ['invoice','Sales orders',sales.length,openSales.length+' open','co-sales'],
      ['chart','Ordered value',orderedValue?nfmt(orderedValue,0):'—',orderedValue?'AED, excl. cancelled':'Add prices to orders','co-sales'],
      ['truck','Deliveries',events.filter(e=>e.salesId||e.jobId).length,'Sales & dispatch','co-moves'],
      ['box','Dispatch jobs',jobs.length,jobs.filter(j=>['Open','Partially delivered'].includes(j.status)).length+' open','co-jobs']],
    suppliers:[
      ['cart','Purchases',purchases.length,openPurchases.length+' open','co-purchases'],
      ['download','Receipts',events.filter(e=>e.purchaseId).length,'Goods received','co-moves'],
      ['stack','Items supplied',new Set(purchases.flatMap(p=>p.lines.map(l=>l.sku))).size,'Distinct SKUs','co-purchases']],
    processors:[
      ['wrench','Production orders',orders.length,openOrders.length+' open','co-orders']]
    }[type]).concat([
      ['layers','Stock at sites',stock.length,stock.length?'Item balances':'Nothing held','co-stock'],
      ['users','Contacts',contacts.length,contacts[0]?.name||'None yet','co-contacts'],
      ['dashboard','Locations',sites.filter(l=>l.active!==false).length,sites.some(l=>l.stock)?'Some hold stock':'Delivery / pickup sites','co-locations']]);
  const over=type==='customers'&&r.creditLimit>0&&openValue>r.creditLimit;
  const link=(href,text)=>text?`<a href="${esc(href)}" class="co-link"${href.startsWith('http')?' target="_blank" rel="noopener noreferrer"':''}>${esc(text)}</a>`:'—';
  const supplies=type==='suppliers'?vendorSupplies(r):[];
  if(type==='suppliers')smart.unshift(['stack','Materials supplied',supplies.length,nfmt(supplies.reduce((n,x)=>n+x.bundles,0),2)+' bundles in total','co-supplies']);
  const simple=true;
  if(simple)for(let i=smart.length-1;i>=0;i--)if(!smart[i][2]||smart[i][2]==='—')smart.splice(i,1);
  const details=simple?[['Code',esc(r.code)],...(type==='customers'?[['Position',esc(r.position||'—')]]:[]),
    ['Phone',r.phone?link('tel:'+r.phone.replace(/[^\d+]/g,''),r.phone):'—'],
    ['Email',r.email?link('mailto:'+r.email,r.email):'—'],
    [type==='customers'?'Delivery address':'Address',esc(r.address||deliverySite(state,type,id)?.address||'—')],
    ...(type==='suppliers'?[['Address 2',esc(r.address2||'—')]]:[]),
    ['Location on map',companyMap(type,r)?mapBtn(companyMap(type,r),'Open in Google Maps'):'<span class="sub">No Google Maps link yet — click Edit to add it</span>']]:[
    ['TRN / VAT',esc(r.trn||'—')],['Email',r.email?link('mailto:'+r.email,r.email):'—'],['Phone',r.phone?link('tel:'+r.phone.replace(/[^\d+]/g,''),r.phone):'—'],
    ['Website',r.website&&/^https?:\/\//i.test(r.website)?link(r.website,r.website.replace(/^https?:\/\//i,'')):'—'],
    ['Address',esc([r.address,r.city,r.country].filter(Boolean).join(', ')||'—')],
    [type==='processors'?'Services':'Business / supply',esc(r.details||'—')],
    ['Payment terms',esc(r.paymentTerms||'—')],
    ...(type==='customers'?[['Credit limit',r.creditLimit>0?esc(nfmt(r.creditLimit,2)+' AED · open orders '+nfmt(openValue,2)+' AED')+(over?' '+statusChip('bad','Over limit'):''):'—']]:
      [['Lead time',r.leadTime!=null?esc(r.leadTime+' days'):'—']]),
    [type==='customers'?'Account manager':'Buyer / manager',esc(r.manager||'—')]];
  const section=(anchor,html)=>html?`<div id="${anchor}" class="co-section">${html}</div>`:'';
  infoModal(r.name,`<div class="co-hero">${logoUploader(type,r,'co-avatar-lg')}<div class="co-hero-main">
      <div class="co-hero-name">${esc(r.name)}</div>
      <div class="co-hero-sub">${esc(r.code)} · ${esc(COMPANY_KIND[type])} ${chip(r.active===false?'Archived':'Active')}</div>${tagChips(r.tags)}</div></div>`+
    (over?note('Open sales orders ('+nfmt(openValue,2)+' AED) are above this customer’s credit limit ('+nfmt(r.creditLimit,2)+' AED).','warn'):'')+
    `<div class="co-smart-row">${smart.map(([icon,labelText,value,sub,target])=>`<button type="button" class="co-smart" onclick="${go(target)}">
      ${ic(icon)}<span><b>${esc(value)}</b><small>${esc(labelText)}</small><em>${esc(sub)}</em></span></button>`).join('')}</div>`+
    `<div class="co-details">${details.map(([k,v])=>`<div><span>${esc(k)}</span><div>${v}</div></div>`).join('')}</div>`+
    (r.notes?note(r.notes):'')+
    (type==='suppliers'?section('co-supplies',panel('Materials this vendor supplies',table(['Material','Category','Bundles','Units per bundle','Total units','On hand now'],
      supplies.map(x=>{const m=get(state,'materials',x.sku), per=Number(m.bundle)||0;
        return [`<div class="record-media">${recordPicture(m)}<div>${cell(m.name,m.code)}</div></div>`,esc(m.category||'—'),
          `<strong class="num">${esc(nfmt(x.bundles,2))}</strong>`,esc(per?qfmt(per,m.unit):'—'),
          esc(per?qfmt(per*x.bundles,m.unit):'—'),esc(qfmt(physical(state,m.id),m.unit))];}),
      'No materials listed yet. Click Edit to add the materials and bundles this vendor supplies.'))):'')+
    (simple&&!contacts.length?'':section('co-contacts',panel('Contacts',table(['Name','Job title','Phone','Email'],contacts.map(c=>[
      `<strong>${esc(c.name)}</strong>`,esc(c.job||'—'),c.phone?link('tel:'+c.phone.replace(/[^\d+]/g,''),c.phone):'—',c.email?link('mailto:'+c.email,c.email):'—']),
      'No contact people yet. Click Edit → Contacts to add them.'))))+
    (simple&&!sites.length?'':section('co-locations',panel('Locations',table(['Name','Address','City','Holds AMBS stock','Status','Map'],sites.map(l=>[
      esc(l.name),esc(l.address),esc(l.city),l.stock?statusChip('ok','Yes'):'No',chip(l.active===false?'Archived':'Active'),mapAction(l)]),
      'No locations yet. Click Edit → Locations to add sites.'))))+
    (type==='customers'?section('co-sales',panel('Sales orders',table(['Order','Order date','Requested','Delivered','Value (AED)','Status',''],sales.map(o=>[
      cell(o.no,o.reference),esc(fmtDate(o.date)),esc(o.due?fmtDate(o.due):'—'),esc(salesProgress(o)+'%'),esc(salesTotal(o)?nfmt(salesTotal(o),2):'—'),chip(o.status),
      openBtn(`salesView(${escapeArg(o.id)})`)]),'No sales orders yet.'))):'')+
    (type==='customers'&&jobs.length?section('co-jobs',panel('Dispatch jobs',table(['Job','Product','Delivered','Status'],jobs.map(j=>[
      cell(j.no,j.name)+openBtn(`dispatchView(${escapeArg(j.id)})`),esc(labelOf(state,j.productId)),esc(j.delivered+' / '+j.qty),chip(j.status)])))):'')+
    (type==='customers'?section('co-trips',panel('Deliveries',table(['Trip','Date','Driver','Deliver to','Km','Status'],
      state.trips.filter(t=>t.customerId===id).sort((x,y)=>String(y.date).localeCompare(String(x.date))).map(t=>[
        cell(t.no,t.description)+openBtn(`tripView(${escapeArg(t.id)})`),esc(fmtDate(t.date)),esc(get(state,'drivers',t.driverId)?.name||'—'),
        `<div class="addr-cell"><span>${esc(t.location||'—')}</span>${mapBtn(t.mapUrl)}</div>`,esc(t.km?nfmt(t.km,1):'—'),tripChip(t)]),
      'No deliveries for this customer yet.'))):'')+
    (type==='suppliers'?section('co-purchases',panel('Purchases',table(['Request','Receiving location','Lines','Status',''],purchases.map(p=>[
      esc(p.no),esc(locName(state,p.location)),esc(p.lines.length),chip(p.status==='Ordered'&&p.lines.some(l=>l.received>0)?'Partially received':p.status),
      openBtn(`purchaseView(${escapeArg(p.id)})`)]),'No purchase requests yet.'))):'')+
    (orders.length?section('co-orders',panel('Production orders',table(['Order','Part / SKU','Qty','Status'],orders.map(o=>[
      esc(o.no)+openBtn(`orderView(${escapeArg(o.id)})`),esc(labelOf(state,o.sku)),esc(o.qty),chip(o.status)])))):'')+
    section('co-stock',panel('Stock at this company’s sites',textTable(['Item / SKU','Location','Balance'],stock.map(b=>[
      labelOf(state,b.sku),locName(state,b.location),qfmt(b.qty,item(state,b.sku)?.unit)]),'No stock is held at this company’s sites.')))+
    section('co-moves',panel('Recent stock movements',events.length?eventsTable(events.slice(0,15)):table(['Movement'],[],'No stock movements linked to this company yet.'))),
    actionGroup(button('Edit',`closeModal();masterEdit(${escapeArg(type)},${escapeArg(id)})`,'btn-sm btn-primary'),
      dangerSmall('Delete',`closeModal();deleteMaster(${escapeArg(type)},${escapeArg(id)})`)));
}
function masterEdit(type,id){
  if(COMPANIES.includes(type))return companyEdit(type,id);
  const old=get(state,type,id), company=COMPANIES.includes(type), title=ENTITY[type], row=old||{};
  const product=type==='products', previousRecipe=product?get(state,'recipes',id):null;
  const packing=product?productPacking(state,old,previousRecipe):null;
  const core=type==='materials'?materialFields(row,old):input('Code','code',row.code,{required:true})+input('Name','name',row.name,{required:true})+
    (company?input('Contact person','contact',row.contact,{extra:'placeholder="Name of the person to talk to"'})+input('Email','email',row.email,{type:'email'})+
      input('Phone','phone',row.phone)+input(type==='processors'?'Services (comma separated)':'Business / Supply details','details',row.details):
      (product?suggestedInput('Category / packing formula template','category',row.category,
        [...Object.keys(PACKING_CATEGORIES),...state.products.map(p=>p.category)]):
        input('Category','category',row.category,{extra:'list="erp-categories"'}))+
      suggestedInput('Stock unit','unit',row.unit||'PCS',unitChoices(),true)+
      (product?number('Default order quantity','orderQty',row.orderQty??1,1,1):
        input('Dimensions / specifications','dimensions',row.dimensions,{full:true}))+
      (type==='parts'?select('Part source','source',same(['Manufactured','Purchased','Stocked']),row.source||'Manufactured'):'')+
      imageField(row.image,product?'Product photo':type==='parts'?'Part photo':'Image'));
  const list=[...new Set([...(type==='materials'?['Tubes','Steel sections','Sheets','Accessories']:type==='parts'?
    ['Safety net','Aluminium','Steel / fabricated parts','Fasteners / accessories']:[]),...state[type].map(x=>x.category).filter(Boolean)])];
  const form=formModal((old?'Edit ':'Add ')+title,`<div class="form-grid ${type==='materials'?'material-form':''}">${core}${area('Notes','notes',row.notes)}</div>
    ${!product&&!company?`<datalist id="erp-categories">${list.map(c=>`<option value="${esc(c)}"></option>`).join('')}</datalist>`:''}
    ${company?'<h4>Company locations</h4><div data-locations></div>':''}
    ${product?packingParts(packing.rows,packing.quantities,true,row.orderQty??1):''}`,async f=>{
    const data={...old,id:id||key(),code:valOf(f,'code'),name:valOf(f,'name'),notes:valOf(f,'notes'),
      active:type==='materials'?checked(f,'active'):old?.active!==false};
    let packingQuantities;
    if(company){
      for(const name of ['contact','email','phone','details'])data[name]=valOf(f,name);
    }else{
      for(const name of (product?['category','unit']:['category','unit','dimensions','source','profileKey']))data[name]=valOf(f,name);
      if(product){
        if(!data.category&&!packingCategory(row.category))data.category=row.category||'';
        data.orderQty=whole(valOf(f,'orderQty')||1,'Default order quantity');
        packingQuantities=packing.rows.map((part,i)=>componentQty(
          valOf(f,packingInput(i))||0,packingUnit(part),part.name,true));
      }
      for(const name of ['safety','bundle','stockLen','rateKg','ratePc'])if(f.elements[name])data[name]=qty(valOf(f,name)||0,name,true);
      data.unit=unit(data.unit);
      need(validUnit(data.unit),'Enter a stock unit using letters, numbers, spaces, / or -.');
      data.image=await imageValue(f,old?.image);
    }
    const locations=company?lines().map(l=>readLocation(l,true)):[];
    const opening=type==='materials'&&!old?componentQty(valOf(f,'opening')||0,data.unit,'Opening stock',true):0;
    const openingLocation=type==='materials'&&!old?valOf(f,'openingLocation'):'';
    need(!opening||data.active,'Activate the material before posting opening stock.');
    need(!opening||openingLocation,'Choose a custody location for opening stock.');
    await commit(s=>{
      const existing=get(s,type,data.id);
      need(!old||sameCloudRecord(old,existing),'This record changed. Reopen it before saving.');
      if(company&&old)need(sameCloudRecord(companyLocations(s,type,id),companyLocations(state,type,id)),
        'This company’s locations changed. Reopen it before saving.');
      codeCheck(s,type,data); activeCheck(s,type,data,existing);
      if(type==='parts'&&data.source!==existing?.source&&existing)need(!s.orders.some(o=>o.partId===data.id&&['Draft','Released'].includes(o.status)),
        'Close open production orders before changing this part’s source.');
      if(product&&packingQuantities.some((count,i)=>count!==packing.quantities[i])){
        need(sameCloudRecord(get(s,'recipes',id)||null,previousRecipe||null),
          'The Product BOM changed. Reopen the product before saving.');
        const replaced=new Set(packing.selected);
        const lines=(previousRecipe?.lines||[]).filter(line=>!replaced.has(line));
        for(const [i,count] of packingQuantities.entries()){
          if(count===0)continue;
          const row=packing.rows[i], original=packing.selected[i];
          if(original&&count===original.count){
            lines.push(original);
            continue;
          }
          if(row.stockId){
            const sku=stockItem(s,row.stockId);
            need(sku.unit===packingUnit(row),'The stock unit for '+row.name+' changed. Reopen the product before saving.');
            lines.push(sku.partId?{partId:sku.partId,variantId:sku.id,count}:{partId:sku.id,count});
          }else lines.push({...packingStockPart(s,row),count});
        }
        need(new Set(lines.map(line=>line.variantId||line.partId)).size===lines.length,
          'Product parts must map to distinct inventory SKUs.');
        if(lines.length){
          add(s.recipes,{...previousRecipe,id:data.id,kind:'product',approved:previousRecipe?.approved??true,
            source:previousRecipe?.source??'packing',lines,at:now()});
        }else s.recipes=s.recipes.filter(recipe=>recipe.id!==id);
        delete data.packingQuantities;
      }
      add(s[type],{...data,at:now()});
      if(opening)event(s,'opening:'+data.id,'Opening stock',
        [{sku:data.id,location:loc(s,openingLocation).id,delta:opening}],'Initial stock · '+data.code);
      if(type==='parts')for(const v of s.variants.filter(v=>v.partId===data.id))v.unit=data.unit;
      if(company){
        const previous=companyLocations(s,type,data.id);
        for(const l of previous.filter(p=>!locations.some(x=>x.id===p.id))){
          need(!locationUsed(s,l.id),'This location is used by stock or an open operation.');
          l.active=false;
        }
        const names=new Set();
        for(const l of locations){
          const prior=get(s,'locations',l.id);
          need(!prior||prior.ownerId===data.id,'Invalid location owner.');
          need(!names.has(l.name.toLowerCase()),'Use distinct names for this company’s locations.');
          need(!prior?.stock||l.stock||!locationUsed(s,l.id),'This location is used by stock or an open operation.');
          names.add(l.name.toLowerCase());
          add(s.locations,{...l,ownerType:type,ownerId:data.id});
        }
      }
    });
  },{text:type==='materials'?(old?'Save changes':'Save material'):'Save'});
  if(type==='materials'&&!old){
    const opening=form.elements.namedItem('opening'),location=form.querySelector('[data-opening-location]');
    const update=()=>{const show=Number(opening.value)>0;location.hidden=!show;
      form.elements.namedItem('openingLocation').required=show;};
    opening.addEventListener('input',update);update();
  }
  if(product){
    wireProductPacking(form,packing.rows);
    form.elements.namedItem('category').addEventListener('change',e=>{
      if(e.target.value)applyPackingTemplate(form,packing.rows,e.target.value);
    });
  }
  const lines=company?repeat(form,'[data-locations]',(l,n)=>locationFields(l,n,true),companyLocations(state,type,id),'Add Location'):null;
}
function masterArchive(type,id){
  const row=get(state,type,id), enable=row.active===false;
  return approval((enable?'Restore ':'Archive ')+row.name,
    enable?'This record will return to active selections.':'This record will leave active selections. Its history and references are retained.',s=>{
      const old=get(s,type,id), next={...old,active:enable};
      activeCheck(s,type,next,old);
      if(COMPANIES.includes(type)&&!enable)need(!companyLocations(s,type,id).some(l=>l.stock&&locationUsed(s,l.id)),
        'Resolve stock or open operations at this company’s custody sites first.');
      if(type==='customers'&&!enable)need(!s.jobs.some(j=>j.customerId===id&&['Open','Partially delivered'].includes(j.status)),'Close this customer’s open dispatch jobs first.');
      if(type==='customers'&&!enable)need(!s.sales.some(o=>o.customerId===id&&SALES_OPEN.includes(o.status)),'Deliver or cancel this customer’s open sales orders first.');
      if(type==='variants'&&enable)need(live(s,'parts',old.partId)&&Math.abs(physical(s,old.partId))<EPS,'Reconcile the generic part balance first.');
      add(s[type],next);
    },enable?'Restore':'Archive');
}
function hasReference(value,id){
  if(value===id)return true;
  if(Array.isArray(value))return value.some(item=>hasReference(item,id));
  return value&&typeof value==='object'&&Object.values(value).some(item=>hasReference(item,id));
}
function recordIsUsed(s,type,id){
  // A company's own sites and a vendor's "materials supplied" list do not block deleting; the sites must be unused themselves.
  const own=new Set(COMPANIES.includes(type)?companyLocations(s,type,id,false).map(l=>l.id):[]);
  const plain=(table,row)=>table==='suppliers'&&type==='materials'?{...row,supplies:null}:row;
  return LIVE.some(table=>table!==type&&s[table].some(row=>!(table==='locations'&&own.has(row.id))&&hasReference(plain(table,row),id)))||
    [...own].some(site=>LIVE.some(table=>table!=='locations'&&s[table].some(row=>hasReference(row,site))));
}
function deleteMaster(type,id){
  const old=get(state,type,id);
  if(!old)return toast('This record no longer exists.','warn');
  approval('Delete '+old.name,'Permanently remove this record. Records used by a BOM, stock movement or another operation cannot be deleted.',s=>{
    need(sameCloudRecord(get(s,type,id),old),'This record changed. Reopen it before deleting.');
    need(!recordIsUsed(s,type,id),'This record is used elsewhere. Remove its links first, or archive it.');
    if(type==='parts'){
      const removed=WORKBOOK_PARTS.flatMap((part,index)=>matchesWorkbookPart(old,part)?[workbookPartRecord(part,index).id]:[]);
      s.deletedWorkbookParts=[...new Set([...(s.deletedWorkbookParts||[]),...removed])];
    }
    s[type]=s[type].filter(row=>row.id!==id);
    if(COMPANIES.includes(type))s.locations=s.locations.filter(l=>!(l.ownerType===type&&l.ownerId===id));
    if(type==='materials')for(const v of s.suppliers)if(Array.isArray(v.supplies))v.supplies=v.supplies.filter(x=>x.sku!==id);
  },'Delete');
}
function deleteRecipe(id){
  const old=get(state,'recipes',id),owner=item(state,id);
  if(!old)return toast('This BOM no longer exists.','warn');
  approval('Delete BOM · '+(owner?.name||id),'Permanently remove this BOM. The part or product remains available.',s=>{
    need(sameCloudRecord(get(s,'recipes',id),old),'This BOM changed. Reopen it before deleting.');
    s.recipes=s.recipes.filter(row=>row.id!==id);
  },'Delete BOM');
}
function deleteOperation(type,id){
  const old=get(state,type,id);
  if(!old)return toast('This record no longer exists.','warn');
  approval('Delete '+old.no,'Permanently remove this record. Posted stock and delivery history cannot be deleted.',s=>{
    const row=get(s,type,id);
    need(sameCloudRecord(row,old),'This record changed. Reopen it before deleting.');
    if(['jobs','sales'].includes(type))s.trips=s.trips.filter(t=>!((t.jobId===id||t.salesId===id)&&t.status!=='Delivered'));
    need(!recordIsUsed(s,type,id),'This record has linked history and cannot be deleted.');
    if(type==='orders')need(row.status!=='Completed','Completed production orders cannot be deleted.');
    if(type==='purchases')need(row.lines.every(line=>line.received===0),'A purchase with receipts cannot be deleted.');
    if(type==='jobs')need(row.delivered===0,'A job with deliveries cannot be deleted.');
    s[type]=s[type].filter(item=>item.id!==id);
  },'Delete');
}
function connectedPanels(type,row){
  const company=COMPANIES.includes(type);
  const sites=company?companyLocations(state,type,row.id,false):[];
  const siteIds=new Set(sites.map(site=>site.id));
  const skuIds=new Set(type==='parts'?[row.id,...state.variants.filter(v=>v.partId===row.id).map(v=>v.id)]:[row.id]);
  const balances=stockRows(state).filter(balance=>company?siteIds.has(balance.location):skuIds.has(balance.sku));
  const stock=panel(company?'Stock at linked sites':'Stock by location',textTable(
    ['Item / SKU','Location','Balance'],balances.map(balance=>[
      labelOf(state,balance.sku),locName(state,balance.location),qfmt(balance.qty,item(state,balance.sku)?.unit)
    ]),'No current stock balance.'));
  const operations=[];
  const append=(name,rows,open)=>rows.forEach(record=>operations.push([
    name,record.no||record.name,record.status,small('View',`closeModal();${open}(${escapeArg(record.id)})`)
  ]));
  append('Production plan',state.plans.filter(p=>p.customerId===row.id||p.products.some(l=>l.productId===row.id)||
    p.parts.some(l=>l.partId===row.id||skuIds.has(l.sku))||p.materials.some(l=>skuIds.has(l.sku))),'planView');
  append('Production order',state.orders.filter(o=>o.customerId===row.id||o.processorId===row.id||o.partId===row.id||skuIds.has(o.sku)||
    o.materials.some(l=>skuIds.has(l.sku))),'orderView');
  append('Purchase',state.purchases.filter(p=>p.supplierId===row.id||p.lines.some(l=>skuIds.has(l.sku))),'purchaseView');
  append('Sales order',state.sales.filter(o=>o.customerId===row.id||o.lines.some(l=>skuIds.has(l.sku))),'salesView');
  append('Dispatch',state.jobs.filter(j=>j.customerId===row.id||j.productId===row.id||
    j.parts.some(l=>l.partId===row.id||skuIds.has(l.sku))),'dispatchView');
  const related=operations.length?panel('Linked operations',table(['Type','Reference','Status','Action'],operations)):'';
  const movements=state.events.filter(e=>{
    const job=e.jobId&&get(state,'jobs',e.jobId),purchase=e.purchaseId&&get(state,'purchases',e.purchaseId);
    const orderId=e.orderId||(e.id.startsWith('production:')?e.id.slice('production:'.length):'');
    const order=orderId&&get(state,'orders',orderId);
    return e.partyType===type&&e.partyId===row.id||
      type==='customers'&&(job?.customerId===row.id||order?.customerId===row.id)||
      type==='suppliers'&&purchase?.supplierId===row.id||
      type==='processors'&&order?.processorId===row.id||
      e.lines.some(line=>company?siteIds.has(line.location):skuIds.has(line.sku));
  });
  const history=movements.length?panel('Recent linked stock movements',eventsTable(movements.slice(-15))):'';
  const bomOwners=type==='materials'?state.recipes.filter(recipe=>recipe.kind==='part'&&recipe.lines.some(line=>line.sku===row.id)):
    type==='parts'?state.recipes.filter(recipe=>recipe.kind==='product'&&recipe.lines.some(line=>line.partId===row.id)):[];
  const boms=bomOwners.length?panel('Used in BOMs',table(['Owner','Type'],bomOwners.map(recipe=>[
    esc(label(item(state,recipe.id)))+openBtn(`recipeView(${escapeArg(recipe.kind==='part'?'parts':'products')},${escapeArg(recipe.id)})`),esc(recipe.kind)
  ]))):'';
  return stock+related+boms+history;
}
function masterView(type,id){
  if(COMPANIES.includes(type))return companyView(type,id);
  const r=get(state,type,id);
  const locations=COMPANIES.includes(type)?companyLocations(state,type,id,false):[];
  const packing=type==='products'?productPacking(state,r,get(state,'recipes',id)):null;
  infoModal(label(r),(!COMPANIES.includes(type)?`<div class="record-detail-image">${['materials','parts','products'].includes(type)?photoUploader(type,r,'thumb-detail'):recordPicture(r,'thumb-detail')}</div>`:'')+
    (type==='materials'?(()=>{const on=physical(state,r.id), ord=state.purchases.filter(p=>p.status==='Ordered').reduce((t,p)=>t+
        p.lines.filter(l=>l.sku===r.id).reduce((s,l)=>s+Math.max(0,l.qty-l.received),0),0);
      return kv([['On hand',qfmt(on,r.unit)],['On order',ord>EPS?qfmt(ord,r.unit):''],['Opening stock',qfmt(materialOpening(state,r.id),r.unit)],
        ['Bundle',r.bundle?qfmt(r.bundle,r.unit)+' per bundle':''],['Stock length',r.stockLen?nfmt(r.stockLen,2)+' m':''],
        ['Rate per kg',r.rateKg?nfmt(r.rateKg,2)+' AED':''],['Rate per piece',r.ratePc?nfmt(r.ratePc,2)+' AED':''],['Code',r.code]]);})():'')+
    (['parts','products'].includes(type)?kv([['On hand',qfmt(physical(state,r.id)+(type==='parts'?state.variants.filter(v=>v.partId===r.id).reduce((n,v)=>n+physical(state,v.id),0):0),r.unit)],
      ['Code',r.code],['Variants',type==='parts'?state.variants.filter(v=>v.partId===r.id).length||'':'']]):'')+
    kv([['Status',r.active===false?'Archived':'Active'],['Category',r.category],['Specifications',r.dimensions],
    ['Type',type==='products'?packingCategory(r.category)?.type:''],['Default order quantity',r.orderQty],['Size',type==='products'?'':r.size],['Color',type==='products'?'':r.color],['Unit',r.unit],['Source',r.source],['Contact person',r.contact],['Email',r.email],['Phone',r.phone],['Services / supply',r.details],['Notes',r.notes]])+
    (locations.length?panel('Linked locations',table(['Name','Address','City','Notes','Status','Map'],
      locations.map(l=>[esc(l.name),esc(l.address),esc(l.city),esc(l.notes),chip(l.active===false?'Archived':'Active'),mapAction(l)]))):'')+
    (packing?packingParts(packing.rows,packing.quantities,false,r.orderQty??1):'')+
    (['parts','products'].includes(type)?(()=>{const rec=get(state,'recipes',r.id);
      return panel('Bill of Materials',rec?(type==='parts'?table(['Raw material','Formula','Per part','Wastage','On hand'],rec.lines.map(l=>{
          const m=get(state,'materials',l.sku), ev=evalFormula(l.formula), per=ev.ok?ev.value:0;
          return [`<div class="record-media">${recordPicture(m||{})}<div>${cell(m?.name||'—',m?.code||'')}</div></div>`+(m?openBtn(`masterView('materials',${escapeArg(m.id)})`):''),
            `<code>${esc(l.formula)}</code>`,esc(qfmt(per,l.unit)),esc((Number(l.wastage)||0)+'%'),esc(m?qfmt(physical(state,m.id),m.unit):'—')];})):
        table(['Part','Qty per product','On hand'],rec.lines.map(l=>{const pt=get(state,'parts',l.partId);
          return [`<div class="record-media">${recordPicture(pt||{})}<div>${cell(pt?.name||'—',pt?.code||'')}</div></div>`+(pt?openBtn(`masterView('parts',${escapeArg(pt.id)})`):''),
            esc(qfmt(l.count,pt?.unit)),esc(qfmt(physical(state,l.variantId||l.partId),pt?.unit))];})))+
        `<div class="card-body">${small('Edit BOM',`recipeEdit(${escapeArg(type)},${escapeArg(r.id)})`)}</div>`:
        `<div class="card-body"><p class="sub">No BOM yet.</p>${small('Create BOM',`recipeEdit(${escapeArg(type)},${escapeArg(r.id)})`)}</div>`);})():'')+
    (type==='materials'?panel('Vendors',table(['Vendor','Bundles','Units','Phone','Address'],state.suppliers.flatMap(v=>vendorSupplies(v).filter(x=>x.sku===r.id).map(x=>[
      `<div class="record-media co-media">${companyAvatar(v)}<div>${cell(v.name)}</div></div>`+openBtn(`masterView('suppliers',${escapeArg(v.id)})`),
      esc(nfmt(x.bundles,2)),esc(r.bundle?qfmt(r.bundle*x.bundles,r.unit):'—'),esc(v.phone||'—'),esc(v.address||'—')])),'No vendor lists this material yet.')):'')+
    connectedPanels(type,r),
    actionGroup(button('Edit',`masterEdit(${escapeArg(type)},${escapeArg(id)})`,'btn-sm btn-primary'),
      type==='parts'?small('Variants',`variantsView(${escapeArg(id)})`):'',
      type!=='materials'||r.active===false?small(r.active===false?'Restore':'Archive',`masterArchive(${escapeArg(type)},${escapeArg(id)})`):'',
      dangerSmall('Delete',`deleteMaster(${escapeArg(type)},${escapeArg(id)})`)));

}
function searchableTable(columns,rows,empty,searchTerms=[],options={}){
  const {className='',placeholder='Search by name, code or size…',noun='records'}=options;
  return `<div class="card erp-table ${className}" data-noun="${esc(noun)}"><div class="toolbar"><div class="search">${ic('search')}<input aria-label="Search records" class="inp"
    placeholder="${esc(placeholder)}" oninput="filterTable(this)"></div><span class="pill-legend">${rows.length} ${esc(noun)}</span></div>${table(columns,rows,empty,searchTerms)}</div>`;
}
function searchKey(value){
  return String(value||'').toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g,'')
    .replace(/attachement/g,'attachment').replace(/diamter/g,'diameter').replace(/\brop\b/g,'rope')
    .replace(/([a-z])(\d)/g,'$1 $2').replace(/(\d)([a-z])/g,'$1 $2')
    .replace(/[^a-z0-9]+/g,' ').trim();
}
function searchDistance(a,b){
  if(Math.abs(a.length-b.length)>2)return 3;
  let previous=Array.from({length:b.length+1},(_,i)=>i);
  for(let i=1;i<=a.length;i++){
    const current=[i];
    for(let j=1;j<=b.length;j++)current[j]=Math.min(current[j-1]+1,previous[j]+1,
      previous[j-1]+(a[i-1]===b[j-1]?0:1));
    previous=current;
  }
  return previous[b.length];
}
function filterTable(el){
  const card=el.closest('.card');
  if(card.querySelector('.tbl tbody')&&!card.querySelector('.o-card')){listState(card).q=el.value;listState(card).page=0;applyList(card);return;}
  const query=searchKey(el.value).split(' ').filter(Boolean);
  let matches=0;
  card.querySelectorAll('.o-listview tbody tr').forEach(tr=>{
    const text=searchKey(tr.dataset.search||tr.textContent), words=text.split(' ');
    tr.hidden=!query.every(token=>text.includes(token)||words.some(word=>word.startsWith(token)||(token.length>=4&&searchDistance(token,word)<=(token.length>=8?2:1))));
  });
  card.querySelectorAll('.o-card').forEach(tr=>{
    const text=searchKey(tr.dataset.search||tr.textContent), words=text.split(' ');
    tr.hidden=!query.every(token=>text.includes(token)||words.some(word=>word.startsWith(token)||
      (token.length>=4&&searchDistance(token,word)<=(token.length>=8?2:1))));
    if(!tr.hidden)matches++;
  });
  card.querySelector('.pill-legend').textContent=query.length?`${matches} matches`:`${matches} ${card.dataset.noun||'records'}`;
}
function materialHealth(material,onHand){
  if(onHand<=EPS)return {label:'Out of stock',kind:'bad',cell:'stock-low'};
  return {label:'In stock',kind:'ok',cell:'stock-good'};
}
function materialPage(){
  const rows=state.materials.slice().sort((x,y)=>x.name.localeCompare(y.name));
  const info=rows.map(material=>{
    const onHand=physical(state,material.id);
    const onOrder=state.purchases.filter(p=>p.status==='Ordered').reduce((total,p)=>total+
      p.lines.filter(line=>line.sku===material.id).reduce((sum,line)=>sum+Math.max(0,line.qty-line.received),0),0);
    const vendors=state.suppliers.filter(v=>vendorSupplies(v).some(x=>x.sku===material.id));
    return {material,onHand,onOrder,vendors,health:materialHealth(material,onHand),open:`masterView('materials',${escapeArg(material.id)})`};
  });
  return head('Master Data','Raw Materials',button('Stock report',"App.go('reports')",'','pdf'),
    button('New',"masterEdit('materials')",'btn-primary'))+
    kanban(info.map(({material:m,onHand,onOrder,vendors,health,open})=>({open,
      search:[m.code,m.name,m.category,m.dimensions,m.unit,...vendors.map(v=>v.name)].filter(Boolean).join(' '),
      html:`<span class="o-card-photo">${recordPicture(m,'thumb-kanban')}</span><div class="o-card-main"><div class="o-card-title">${esc(m.name)}</div>
        <div class="o-card-line o-muted">${esc([m.code,m.category].filter(Boolean).join(' · '))}</div>
        <div class="o-card-qty"><b>${esc(qfmt(onHand))}</b> ${esc(m.unit)} <span class="o-muted">on hand</span></div>
        <div class="o-card-tags">${statusChip(health.kind,health.label)}${m.bundle?`<span class="o-tag">${esc(qfmt(m.bundle))} / bundle</span>`:''}
          ${onOrder>EPS?`<span class="o-tag">${esc(qfmt(onOrder))} on order</span>`:''}${vendors.length?`<span class="o-tag">${vendors.length} vendor${vendors.length===1?'':'s'}</span>`:''}
          ${m.active===false?'<span class="o-tag">Archived</span>':''}</div></div>`})),
    {placeholder:'Search raw materials by name, code, category or vendor…',noun:'materials',empty:'Add your first raw material.',
      list:{columns:['Code','Material','Category','Opening','On hand','Bundle','On order','Avail. after','Status'],
        rows:info.map(({material:m,onHand,onOrder,health,open})=>[esc(m.code)+openBtn(open),
          `<div class="record-media">${photoUploader('materials',m)}<div>${cell(m.name,m.dimensions||'')}</div></div>`,esc(m.category||'—'),
          `<span class="num">${esc(qfmt(materialOpening(state,m.id)))}</span>`,`<strong class="num">${esc(qfmt(onHand))}</strong> <span class="sub">${esc(m.unit)}</span>`,
          `<span class="num">${esc(qfmt(m.bundle??0))}</span>`,`<span class="num">${esc(qfmt(onOrder))}</span>`,
          `<span class="num">${esc(qfmt(onHand+onOrder))}</span>`,statusChip(health.kind,health.label)])}});
}
function simpleCompanyPage(type){
  const title=ENTITY[type], vendor=type==='suppliers', proc=type==='processors';
  const openCount=r=>vendor?state.purchases.filter(p=>p.supplierId===r.id&&['Draft','Ordered'].includes(p.status)).length:
    proc?state.orders.filter(o=>o.processorId===r.id&&['Draft','Released'].includes(o.status)).length:
    state.sales.filter(o=>o.customerId===r.id&&SALES_OPEN.includes(o.status)).length;
  const held=r=>{if(!proc)return 0;const ids=new Set(companyLocations(state,type,r.id).map(l=>l.id));return stockRows(state).filter(b=>ids.has(b.location)).length;};
  const noun=proc?'processing companies':vendor?'vendors':'customers';
  const address=r=>r.address||deliverySite(state,type,r.id)?.address||companyLocations(state,type,r.id)[0]?.address||'';
  const rows=state[type].slice().sort((a,b)=>a.name.localeCompare(b.name));
  return head('Contacts',TITLES[type],button('New','masterEdit('+escapeArg(type)+')','btn-primary'))+
    kanban(rows.map(r=>{
      const supplies=vendorSupplies(r), open=openCount(r);
      return {open:`masterView(${escapeArg(type)},${escapeArg(r.id)})`,
        search:[r.code,r.name,r.position,r.phone,address(r),r.address2,...supplies.map(x=>label(get(state,'materials',x.sku)))].filter(Boolean).join(' '),
        html:`${companyAvatar(r,'co-avatar-md')}<div class="o-card-main"><div class="o-card-title">${esc(r.name)}</div>
          ${!vendor&&!proc&&r.position?`<div class="o-card-line">${esc(r.position)}</div>`:''}
          ${r.phone?`<div class="o-card-line">${ic('phone')}${esc(r.phone)}</div>`:''}
          ${address(r)?`<div class="o-card-line o-muted">${esc(address(r))}</div>`:''}
          <div class="o-card-tags">${vendor&&supplies.length?`<span class="o-tag">${supplies.length} material${supplies.length===1?'':'s'}</span>`:''}${held(r)?`<span class="o-tag">${held(r)} item${held(r)===1?'':'s'} here</span>`:''}${open?`<span class="o-tag">${open} open ${vendor?'purchase':proc?'production order':'order'}${open===1?'':'s'}</span>`:''}${r.active===false?'<span class="o-tag">Archived</span>':''}</div></div>`};
    }),{placeholder:'Search '+noun+' by name, phone or address…',
      noun,empty:'No '+noun+' yet. Click New to add the first one.',
      list:{columns:['Name',...(vendor||proc?[]:['Position']),'Phone',vendor||proc?'Address':'Delivery address','Code',
          ...(proc?['Items held']:[]),vendor?'Open purchases':proc?'Open production':'Open orders'],
        rows:rows.map(r=>[`<div class="record-media co-media">${companyAvatar(r)}<div>${cell(r.name)}</div></div>`+openBtn(`masterView(${escapeArg(type)},${escapeArg(r.id)})`),
          ...(vendor||proc?[]:[esc(r.position||'—')]),esc(r.phone||'—'),esc(address(r)||'—'),esc(r.code),...(proc?[esc(held(r)||'—')]:[]),esc(openCount(r)||'—')])}});
}
/* Odoo-style kanban: cards several per row, with a Kanban / List switch (remembered per page). */
function savedView(){try{return localStorage.getItem('ambs-view-'+App.route)||'kanban';}catch{return 'kanban';}}
function switchView(btn,mode){
  const wrap=btn.closest('.o-kanban-wrap');wrap.classList.toggle('is-list',mode==='list');
  wrap.querySelectorAll('.o-view-btn').forEach(b=>b.classList.toggle('on',b.dataset.v===mode));
  try{localStorage.setItem('ambs-view-'+App.route,mode);}catch{}
}
function kanban(cards,{placeholder='Search…',noun='records',empty='Nothing here yet.',list=null}={}){
  const mode=list?savedView():'kanban';
  return `<div class="card o-kanban-wrap${mode==='list'?' is-list':''}" data-noun="${esc(noun)}"><div class="o-search-hero"><div class="search">${ic('search')}
    <input class="inp" aria-label="Search" placeholder="${esc(placeholder)}" oninput="filterTable(this)" autocomplete="off"></div>
    <span class="pill-legend">${cards.length} ${esc(noun)}</span>
    ${list?`<div class="o-view-switch" role="group" aria-label="View">
      <button type="button" class="o-view-btn${mode==='kanban'?' on':''}" data-v="kanban" title="Kanban" aria-label="Kanban view" onclick="switchView(this,'kanban')">${ic('grid')}</button>
      <button type="button" class="o-view-btn${mode==='list'?' on':''}" data-v="list" title="List" aria-label="List view" onclick="switchView(this,'list')">${ic('list')}</button></div>`:''}</div>
    <div class="o-kanban">${cards.length?cards.map(c=>`<div class="o-card" role="button" tabindex="0" data-search="${esc(c.search)}"
      onclick="${c.open}" onkeydown="if(event.key==='Enter')this.click()">${c.html}</div>`).join(''):`<div class="o-empty">${esc(empty)}</div>`}</div>
    ${list?`<div class="o-listview">${table(list.columns,list.rows,empty,cards.map(c=>c.search))}</div>`:''}</div>`;
}
function companyPage(type){return simpleCompanyPage(type);}
function masterPage(type){
  if(type==='materials')return materialPage();
  if(COMPANIES.includes(type))return companyPage(type);
  const title=ENTITY[type], rows=state[type].slice().sort((x,y)=>x.name.localeCompare(y.name)), isParts=type==='parts';
  const balances=new Map(aggregate(stockRows(state)).map(({sku,qty})=>[sku,qty]));
  for(const variant of isParts?state.variants:[]){
    balances.set(variant.partId,(balances.get(variant.partId)??0)+(balances.get(variant.id)??0));
  }
  const info=rows.map(r=>{
    const recipe=get(state,'recipes',r.id), variants=isParts?state.variants.filter(v=>v.partId===r.id&&v.active!==false).length:0;
    const usedIn=isParts?state.recipes.filter(x=>x.kind==='product'&&x.lines.some(l=>l.partId===r.id)).length:0;
    return {r,onHand:balances.get(r.id)??0,recipe,variants,usedIn,open:`masterView(${escapeArg(type)},${escapeArg(r.id)})`,
      sub:[r.size,r.color,r.dimensions].filter(Boolean).join(' · ')};
  });
  return head('Master Data',TITLES[type],button('New',`masterEdit(${escapeArg(type)})`,'btn-primary'))+
    kanban(info.map(({r,onHand,recipe,variants,usedIn,open,sub})=>({open,
      search:[r.code,r.name,r.packingName,r.category,r.unit,r.size,r.color,r.dimensions,r.source].filter(Boolean).join(' '),
      html:`<span class="o-card-photo">${recordPicture(r,'thumb-kanban')}</span><div class="o-card-main"><div class="o-card-title">${esc(r.name)}</div>
        <div class="o-card-line o-muted">${esc([r.code,r.category].filter(Boolean).join(' · '))}</div>
        <div class="o-card-qty"><b>${esc(qfmt(onHand))}</b> ${esc(r.unit)} <span class="o-muted">on hand</span></div>
        <div class="o-card-tags">${isParts&&r.source?`<span class="o-tag">${esc(r.source)}</span>`:''}
          ${recipe?statusChip(recipe.approved?'ok':'warn',isParts?'BOM · '+recipe.lines.length+' material'+(recipe.lines.length===1?'':'s'):'BOM · '+recipe.lines.length+' part'+(recipe.lines.length===1?'':'s')):
            isParts&&r.source!=='Manufactured'?'':statusChip('neutral','No BOM')}
          ${variants?`<span class="o-tag">${variants} variant${variants===1?'':'s'}</span>`:''}${usedIn?`<span class="o-tag">in ${usedIn} product${usedIn===1?'':'s'}</span>`:''}
          ${r.active===false?'<span class="o-tag">Archived</span>':''}</div></div>`})),
    {placeholder:isParts?'Search parts by name, code, size, colour or category…':'Search products by name, code or category…',
      noun:isParts?'parts':'products',empty:'Add your first '+title.toLowerCase()+'.',
      list:{columns:['Code','Item','Category',...(isParts?['Source']:[]),'Stock unit','On hand','BOM','Status'],
        rows:info.map(({r,onHand,recipe,open,sub})=>[esc(r.code)+openBtn(open),
          `<div class="record-media">${photoUploader(type,r)}<div>${cell(r.name,sub)}</div></div>`,esc(r.category||'—'),
          ...(isParts?[esc(r.source||'—')]:[]),esc(r.unit),`<strong class="num">${esc(qfmt(onHand))}</strong>`,
          recipe?chip(recipe.approved?'Approved':'Review required'):'—',chip(r.active===false?'Archived':'Active')])}});
}
function variantsView(id){
  const rows=state.variants.filter(v=>v.partId===id);
  infoModal(label(get(state,'parts',id))+' · Variants',table(['SKU','Name','Size','Color','Status','Actions'],rows.map(v=>[
    esc(v.code),`<div class="record-media">${recordPicture(v)}<div>${esc(v.name)}</div></div>`,esc(v.size),esc(v.color),chip(v.active===false?'Archived':'Active'),
    actionGroup(small('View',`closeModal();masterView('variants',${escapeArg(v.id)})`),
      small('Edit',`closeModal();variantEdit(${escapeArg(id)},${escapeArg(v.id)})`),
      small(v.active===false?'Restore':'Archive',`closeModal();masterArchive('variants',${escapeArg(v.id)})`),
      dangerSmall('Delete',`closeModal();deleteMaster('variants',${escapeArg(v.id)})`))
  ])),button('Add Variant',`closeModal();variantEdit(${escapeArg(id)})`,'btn-primary','plus'));
}
function variantEdit(partId,id){
  const v=get(state,'variants',id)||{};
  formModal(id?'Edit Variant':'Add Variant',`<div class="form-grid">${input('SKU','code',v.code,{required:true})}
    ${input('Name','name',v.name,{required:true})}${sizeColorFields(v,NET_SIZES)}${imageField(v.image)}</div>`,async f=>{
    const image=await imageValue(f,v.image);
    await commit(s=>{
      const part=live(s,'parts',partId);
      need(Math.abs(physical(s,partId))<EPS,'Reconcile generic stock for this part before enabling variant stock.');
      need(!s.orders.some(o=>o.sku===partId&&['Draft','Released'].includes(o.status))&&
        !s.plans.some(p=>p.status==='Reserved'&&p.parts.some(l=>l.sku===partId))&&
        !s.jobs.some(j=>['Open','Partially delivered'].includes(j.status)&&j.parts.some(l=>l.sku===partId)),
        'Close open operations using the generic part SKU before adding variants.');
      const row={id:id||key(),partId,image,unit:part.unit,active:v.active!==false};
      for(const n of ['code','name','size','color'])row[n]=valOf(f,n);
      codeCheck(s,'variants',row);add(s.variants,row);
    });
  });
}

/* Reusable BOMs and planning */
function createBOM(){
  const rows=['parts','products'].flatMap(type=>current(state,type).map(r=>[
    JSON.stringify([type,r.id]),ENTITY[type]+' · '+label(r)+(get(state,'recipes',r.id)?' · Edit existing':'')
  ]));
  if(!rows.length)return infoModal('Create BOM',note('Add a part or finished product first.')+actionGroup(
      small('Parts',"closeModal();App.go('parts')"),small('Products',"closeModal();App.go('products')")));
  // Searchable picker: works the same with ten items or thousands — type part of a name or code.
  const back=infoModal('Create BOM',`<div class="erp-error" role="alert"></div>`+searchable('Part or finished product','bomOwner',rows)+
    `<p class="sub" style="margin:6px 0 0">Type a few letters of the name or code, e.g. <b>net 4.5</b> or <b>PT-0</b>, then pick it from the list.</p>`,
    button('Continue','openBOMOwner(this)','btn-primary'));
  $('.modal',back).classList.add('bom-create');
  wirePicks(back);
  const text=$('[name="bomOwnerSearch"]',back);text.focus();text.onfocus?.();
  $('[name="bomOwner"]',back).addEventListener('change',e=>{if(e.target.value)openBOMOwner(text);});
}
function openBOMOwner(button){
  const modal=button.closest('.modal'), value=$('[name="bomOwner"]',modal).value;
  if(!value){$('.erp-error',modal).textContent='Pick a part or product from the list first.';return;}
  const [type,id]=JSON.parse(value);
  closeModal();
  recipeEdit(type,id);
}
/* Read-only look at what is inside a BOM. */
function recipeView(type,id){
  const owner=get(state,type,id), recipe=get(state,'recipes',id), isPart=type==='parts';
  if(!recipe)return toast('This item has no BOM yet.','warn');
  const body=isPart?table(['Raw material','Formula','Per part','Wastage','Per part incl. wastage','On hand'],recipe.lines.map(l=>{
      const m=get(state,'materials',l.sku), r=evalFormula(l.formula), per=r.ok?r.value:0, w=Number(l.wastage)||0;
      return [`<div class="record-media">${recordPicture(m||{})}<div>${cell(m?.name||'Removed material',m?.code||'')}</div></div>`,
        `<code>${esc(l.formula)}</code>`,esc(qfmt(per,l.unit)),esc(w+'%'),`<strong>${esc(qfmt(per*(1+w/100),l.unit))}</strong>`,
        esc(m?qfmt(physical(state,m.id),m.unit):'—')];
    })):table(['Part','Size / colour','Qty per product','Raw materials inside','On hand'],recipe.lines.map(l=>{
      const part=get(state,'parts',l.partId), sub=get(state,'recipes',l.partId), sku=l.variantId||l.partId;
      return [`<div class="record-media">${recordPicture(part||{})}<div>${cell(part?.name||'Removed part',part?.code||'')}</div></div>`,
        esc(l.variantId?label(get(state,'variants',l.variantId)):'—'),`<strong>${esc(qfmt(l.count,part?.unit))}</strong>`,
        sub?esc(sub.lines.map(x=>get(state,'materials',x.sku)?.name).filter(Boolean).join(', ')):'<span class="sub">No part BOM</span>',
        esc(qfmt(physical(state,sku),part?.unit))];
    }));
  infoModal('BOM · '+label(owner),`<div class="co-hero">${recordPicture(owner,'thumb-record')}<div class="co-hero-main">
      <div class="co-hero-name">${esc(owner.name)}</div><div class="co-hero-sub">${esc(owner.code)} · ${isPart?'Part → Raw materials':'Product → Parts'}
      ${chip(recipe.approved?'Approved':'Review required')}</div></div></div>`+
    note(isPart?'Quantities are for one part. Wastage is added on top.':'Quantities are for one complete product.')+
    panel((isPart?'Raw materials':'Parts')+' in this BOM · '+recipe.lines.length+' lines',body),
    actionGroup(button('Edit BOM',`closeModal();recipeEdit(${escapeArg(type)},${escapeArg(id)})`,'btn-sm btn-primary'),
      dangerSmall('Delete BOM',`deleteRecipe(${escapeArg(id)})`)));
}
function recipePage(){
  const rows=[...state.parts.map(x=>['parts',x]),...state.products.map(x=>['products',x])];
  return head('Master Data',TITLES.bom,button('New','createBOM()','btn-primary'))+
    searchableTable(['Owner','Recipe type','Sizes','Colors','Lines','Status'],rows.map(([type,r])=>{
      const recipe=get(state,'recipes',r.id), isPart=type==='parts';
      const variants=isPart?current(state,'variants').filter(v=>v.partId===r.id):
        (recipe?.lines||[]).map(l=>get(state,'variants',l.variantId)).filter(Boolean);
      const options=name=>r[name]||[...new Set(variants.map(v=>v[name]).filter(Boolean))].join(', ')||'—';
      return [cell(r.name,r.code)+openBtn(`${recipe?'recipeView':'recipeEdit'}(${escapeArg(type)},${escapeArg(r.id)})`),
        esc(isPart?'Part → Raw Materials':'Product → Parts'),esc(options('size')),esc(options('color')),
        String(recipe?.lines.length||0),chip(recipe?(recipe.approved?'Approved':'Review required'):'Missing')];
    }));
}
function bomVariantOptions(partId,selected=''){
  return choiceOptions(pair(current(state,'variants').filter(v=>v.partId===partId)),selected,'Select during planning / dispatch');
}
function recipeEdit(type,id){
  const row=get(state,type,id), isPart=type==='parts', old=get(state,'recipes',id);
  const form=formModal((old?'Edit ':'Create ')+(isPart?'Part BOM':'Product BOM')+' · '+label(row),
    (old?.approved===false?note('Legacy recipe. Verify every formula and wastage value before approving it.','warn'):'')+
    note((isPart?'Enter raw material consumption per one part. The line unit follows the material stock unit.':'Enter the part quantities for one complete product.')+
      ' Complete this line and the next one appears by itself — empty lines are ignored.')+
    '<div data-recipe></div><div style="margin-top:12px">'+tick('Approve for operational use','approve',old?.approved??!old)+'</div>',async f=>{
    const raw=lines().map(l=>isPart?{sku:fieldValue(l,'sku'),unit:unit(fieldValue(l,'unit')),formula:fieldValue(l,'formula'),
      wastage:fieldValue(l,'wastage')||0,notes:fieldValue(l,'notes')}:{partId:fieldValue(l,'part'),variantId:fieldValue(l,'variant'),count:fieldValue(l,'count')});
    need(raw.length,'Add at least one BOM line.');
    await commit(s=>{
      live(s,type,id);
      need(sameCloudRecord(get(s,'recipes',id)||null,old||null),'This BOM changed in another tab. Reopen it to edit.');
      const records=isPart?raw.map(l=>recipeLine(s,l)):raw.map(l=>{
        const part=live(s,'parts',l.partId), partId=part.id, count=componentQty(l.count,part.unit);
        if(!l.variantId)return {partId,count};
        need(stockItem(s,l.variantId).partId===partId,'Choose a size / color SKU belonging to this part.');
        return {partId,count,variantId:l.variantId};
      });
      if(!isPart)need(new Set(records.map(l=>JSON.stringify([l.partId,l.variantId||'']))).size===records.length,
        'Use one Product BOM line per part and size / color SKU.');
      add(s.recipes,{id,kind:isPart?'part':'product',approved:checked(f,'approve'),lines:records,at:now()});
    });
    return old?'BOM updated.':'BOM created.';
  },{text:old?'Save BOM':'Create BOM'});
  const lines=repeat(form,'[data-recipe]',(l,n)=>isPart?`<legend>Raw material line</legend><div class="form-grid">
    ${searchable('Raw Material',n+'_sku',pair(state.materials.filter(x=>x.active!==false||x.id===l.sku)),l.sku)}
    ${suggestedInput('Unit',n+'_unit',l.unit||'',unitChoices(),true)}
    ${input('Consumption formula',n+'_formula',l.formula,{required:true,extra:'placeholder="1/10 + 1/30"'})}
    ${number('Wastage %',n+'_wastage',l.wastage??0)}${input('Line notes',n+'_notes',l.notes,{full:true})}</div><p class="sub" data-result></p>`:
    `<legend>Part line</legend><div class="form-grid">
    ${searchable('Part',n+'_part',pair(state.parts.filter(x=>x.active!==false||x.id===l.partId)),l.partId)}
    ${number('Quantity per product',n+'_count',l.count,0.000001)}
    ${field('Size / color SKU',`<select class="sel" name="${n}_variant" data-bom-variant>${bomVariantOptions(l.partId,l.variantId)}</select>`,true)}
    </div>`,old?.lines||[],'Add Line',{min:1,filled:line=>!!fieldValue(line,isPart?'sku':'part'),
      // the next line appears only after this one is complete: material + formula, or part + quantity
      complete:line=>!!fieldValue(line,isPart?'sku':'part')&&(isPart?evalFormula(fieldValue(line,'formula')).ok:Number(fieldValue(line,'count'))>0)});
  if(!isPart)form.addEventListener('change',e=>{
    if(e.target.name?.endsWith('_part')){
      const picker=$('[data-bom-variant]',e.target.closest('fieldset'));
      picker.innerHTML=bomVariantOptions(e.target.value);
    }
  });
  if(isPart){
    const preview=e=>{
      if(e?.target.name?.endsWith('_sku')){
        const line=e.target.closest('fieldset'), m=get(state,'materials',e.target.value);
        line.querySelector('[name$="_unit"]').value=m?.unit||'';
      }
      for(const l of lines()){
        const formula=fieldValue(l,'formula'), w=Number(fieldValue(l,'wastage'));
        const result=evalFormula(formula);
        $('[data-result]',l).textContent=formula?(result.ok && w>=0 && w<=100?
          `Evaluated ${qfmt(result.value)} · including wastage ${qfmt(result.value*(1+w/100),fieldValue(l,'unit'))}`:
          result.ok?'Wastage must be within 0–100%.':result.err):'';
      }
    };
    form.addEventListener('input',preview);form.addEventListener('change',preview);preview();
  }
}
function variantControl(name,partId,selected=''){
  const variants=state.variants.filter(v=>v.partId===partId);
  const rows=variants.filter(v=>v.active!==false);
  return variants.length?select('Part variant',name,pair(rows),selected,true,
    rows.length?'Select…':'No active variants'):
    `<input type="hidden" name="${name}" value="">`;
}
function partConfiguration(target,standard){
  target.innerHTML=standard.map((p,i)=>`<fieldset class="erp-line" data-part="${esc(p.partId)}" data-standard="${p.standard}">
    <legend>${esc(label(get(state,'parts',p.partId)))}</legend>
    <div class="form-grid"><div><b>Standard quantity</b><div class="num">${p.standard}</div></div>
    ${number('Adjusted quantity','line'+i+'_'+key()+'_adjusted',p.qty,0.000001)}
    ${variantControl('line'+i+'_'+key()+'_variant',p.partId,p.variantId)}</div></fieldset>`).join('');
}
function collectConfig(box){
  return [...box.querySelectorAll('[data-part]')].map(el=>({partId:el.dataset.part,standard:+el.dataset.standard,
    qty:fieldValue(el,'adjusted'),variantId:fieldValue(el,'variant')}));
}
function requireTable(s,materials,location,exclude=''){
  return table(['Raw Material','Required','Physical','Reserved elsewhere','Pending purchases','Shortage'],materials.map(l=>{
    const m=item(s,l.sku), on=availability(s,l.sku,location), reserve=reserved(s,l.sku,location,exclude),
      buy=pending(s,l.sku,location), shortage=Math.max(0,l.qty-Math.max(0,on-reserve));
    return [esc(label(m)),esc(qfmt(l.qty,m?.unit)),esc(qfmt(on,m?.unit)),esc(qfmt(reserve,m?.unit)),esc(qfmt(buy,m?.unit)),
      shortage>EPS?statusChip('bad',qfmt(shortage,m?.unit)):statusChip('ok','Covered')];
  }));
}
function traceTable(lines){
  return textTable(['Source Part / SKU','Raw Material','Formula','Wastage %','Required'],lines.map(l=>[
    labelOf(state,l.partSku),labelOf(state,l.sku),l.formula,String(l.wastage),qfmt(l.qty,l.unit)]));
}
function partsTable(parts){
  return textTable(['Part','SKU / variant','Standard','Adjusted'],parts.map(l=>[
    labelOf(state,l.partId),labelOf(state,l.sku),String(l.standard),String(l.qty)]));
}
function productEditor(draw,onSave,{title,saveText,description,extra='',details,after,dispatch=false,draft=null}){
  const initial=draft?.products||[];
  const form=formModal(title,`<div class="form-grid">${input('Reference / project','name',draft?.name||'',{required:true})}
    ${select(dispatch?'Source custody location':'Production location','location',locOptions(),draft?.location||'')}${extra}</div>
    <div data-products></div><div data-summary style="margin-top:14px"></div>`,async f=>onSave(f,readProducts),{text:saveText,intro:description});
  const products=repeat(form,'[data-products]',(l,n)=>`<legend>${dispatch?'Complete product':'Product line'}</legend><div class="form-grid">
    ${searchable('Product',n+'_product',pair(current(state,'products')),l.productId)}
    ${number('Requested product quantity',n+'_count',l.qty??1,1,1)}</div><div data-config></div>`,initial.length?initial:[{}],'Add Product');
  if(dispatch){
    form.querySelector('[data-products] > button').remove();
    form.querySelector('[data-products] .erp-remove').remove();
  }
  function configure(line,overrides,preserve=false){
    const box=$('[data-config]',line);
    try{
      const id=fieldValue(line,'product'), count=whole(fieldValue(line,'count'));
      if(!id){box.innerHTML='';return;}
      const standard=productParts(state,id,count);
      const prior=preserve?collectConfig(box):[];
      if(preserve&&prior.length===standard.length&&prior.every((l,i)=>l.partId===standard[i].partId&&l.standard===standard[i].standard))return;
      const rows=overrides?.length===standard.length&&overrides.every((l,i)=>l.partId===standard[i].partId&&l.standard===standard[i].standard)?
        overrides:standard.map((p,i)=>{
          const old=prior[i]?.partId===p.partId?prior[i]:null;
          return {...p,variantId:old?old.variantId:p.variantId,qty:old?.qty&&+old.qty!==old.standard?+old.qty:p.qty};
        });
      partConfiguration(box,rows);
    }catch(e){box.innerHTML=note(e.message,'warn');}
  }
  function readProducts(s){
    const rows=products();
    need(rows.length,'Add at least one product.');
    return rows.map(line=>{
      const productId=fieldValue(line,'product'), count=whole(fieldValue(line,'count'));
      const standard=productParts(s,productId,count);
      return {productId,qty:count,parts:configuredParts(s,standard,collectConfig(line))};
    });
  }
  function preview(e){
    if(e?.target.name?.endsWith('_product')||e?.target.name?.endsWith('_count')){
      const line=e.target.closest('fieldset'), countChange=e.target.name.endsWith('_count');
      if(dispatch&&!countChange&&e.target.value){
        const desired=get(state,'products',e.target.value)?.orderQty;
        if(desired)line.querySelector('[name$="_count"]').value=desired;
      }
      const count=Number(fieldValue(line,'count'));
      if(!countChange||(Number.isSafeInteger(count)&&count>0))configure(line,null,countChange);
    }
    const summary=$('[data-summary]',form);
    try{summary.innerHTML=draw(readProducts(state),valOf(form,'location'),form);}
    catch(err){summary.innerHTML=note(err.message,'warn');}
  }
  form.addEventListener('change',preview);
  form.addEventListener('input',preview);
  products().forEach((line,i)=>configure(line,initial[i]?.parts));
  if(after)after(form);
  preview();
  return form;
}
function planEdit(id){
  const draft=get(state,'plans',id);
  const explode=(s,rows)=>rows.flatMap(r=>r.parts.flatMap(p=>expandPart(s,p.partId,p.qty,p.variantId)));
  productEditor((rows,location)=>{
    const source=explode(state,rows);
    return panel('Required parts',partsTable(rows.flatMap(r=>r.parts)))+
      panel('Consolidated raw material demand',requireTable(state,aggregate(source),location,id))+
      panel('BOM trace',traceTable(source));
  },async(f,read)=>{
    await commit(s=>{
      const old=get(s,'plans',id);
      need(!id||sameCloudRecord(old,draft),'This plan changed. Reopen it before saving.');
      const location=loc(s,valOf(f,'location')).id, products=read(s), source=explode(s,products);
      const name=valOf(f,'name');need(name,'Enter a plan name.');
      const customerId=valOf(f,'customer'),customerSiteId=valOf(f,'customerSite');
      checkedCompanySite(s,'customers',customerId,customerSiteId);
      add(s.plans,{id:id||key(),no:old?.no||operationNo('PLAN'),name,location,products,
        parts:products.flatMap(l=>l.parts),materials:aggregate(source),source,customerId,customerSiteId,
        status:old?.status||'Draft',at:old?.at||now()});
    });
    App.route='production';location.hash='#/production';
    return 'Production plan saved.';
  },{title:draft?'Edit Production Plan':'New Production Plan',saveText:'Save Plan',description:'Review the two-level BOM and raw material availability.',draft,
    extra:searchable('Customer (optional)','customer',pair(current(state,'customers')),draft?.customerId)+
      select('Customer site (optional)','customerSite',[],'',false,'No linked site'),
    after:form=>wireCompanySite(form,'customers','customer','customerSite',draft?.customerSiteId)});
}
function planView(id){
  const p=get(state,'plans',id), args=escapeArg(id);
  infoModal(p.no+' · '+p.name,formHeader([
      p.status==='Draft'?button('Reserve',`planTransition(${args},'Reserved')`,'btn-sm btn-primary'):'',
      p.status==='Reserved'?button('Close reservation',`planTransition(${args},'Closed')`,'btn-sm btn-primary'):'',
      small('Edit',`planEdit(${args})`)],['Draft','Reserved','Closed'],p.status)+kv([['Location',locName(state,p.location)],['Customer',get(state,'customers',p.customerId)?.name],
    ['Customer site',get(state,'locations',p.customerSiteId)?.name],['Status',p.status]])+
    panel('Products',textTable(['Product','Quantity'],p.products.map(x=>[labelOf(state,x.productId),x.qty])))+
    panel('Parts',partsTable(p.parts))+panel('Consolidated raw materials',requireTable(state,p.materials,p.location,p.id))+
    panel('BOM trace',traceTable(p.source)),
    actionGroup(button('Download PDF',`recordPDF('plans',${escapeArg(id)})`,'btn-sm','pdf'),
      dangerSmall('Delete',`deleteOperation('plans',${escapeArg(id)})`)));
}
function planTransition(id,status){
  approval(status==='Reserved'?'Reserve plan demand':'Close planning reservation',
    status==='Reserved'?'Record the saved material requirements as reserved planning demand. Physical stock stays the same.':'Release this plan’s reservation.',s=>{
    const p=get(s,'plans',id);
    need(p?.status===(status==='Reserved'?'Draft':'Reserved'),'This plan status has changed.');
    if(status==='Reserved'){
      loc(s,p.location);p.products.forEach(l=>live(s,'products',l.productId));p.parts.forEach(l=>stockItem(s,l.sku));
      p.materials.forEach(l=>live(s,'materials',l.sku));
    }
    p.status=status;
  });
}
function orderEdit(initialPart='',initialLocation='',id){
  const old=get(state,'orders',id);
  const form=formModal(old?'Edit Production Order':'Create Production Order',`<div class="form-grid">
    ${searchable('Part to manufacture','part',pair(current(state,'parts').filter(p=>p.source==='Manufactured')),old?.partId||initialPart)}
    ${number('Quantity to manufacture','qty',old?.qty??1,1,1)}
    ${select('Fabrication location','location',locOptions(),old?.location||initialLocation)}
    ${searchable('Customer (optional)','customer',pair(current(state,'customers')),old?.customerId)}
    ${select('Customer site (optional)','customerSite',[],'',false,'No linked site')}
    ${searchable('Processing company (optional)','processor',pair(current(state,'processors')),old?.processorId)}
    ${select('Processing site (optional)','processorSite',[],'',false,'No linked site')}
    <div data-variant></div>${area('Notes','notes',old?.notes)}</div><div data-preview></div>`,async f=>{
      await commit(s=>{
        const prev=get(s,'orders',id);
        need(!id||prev?.status!=='Completed'&&sameCloudRecord(prev,old),'This order changed or has posted stock. Reopen it before saving.');
        const part=live(s,'parts',valOf(f,'part'));
        need(part.source==='Manufactured','Choose a manufactured part.');
        const count=whole(valOf(f,'qty')), variant=valOf(f,'variant'), source=expandPart(s,part.id,count,variant);
        const location=loc(s,valOf(f,'location')).id;
        const customerId=valOf(f,'customer'),customerSiteId=valOf(f,'customerSite');
        checkedCompanySite(s,'customers',customerId,customerSiteId);
        const processorId=valOf(f,'processor'),processorSiteId=valOf(f,'processorSite');
        checkedCompanySite(s,'processors',processorId,processorSiteId);
        add(s.orders,{id:id||key(),no:prev?.no||operationNo('MO'),location,partId:part.id,sku:variant||part.id,qty:count,
          source,materials:aggregate(source),customerId,customerSiteId,processorId,processorSiteId,notes:valOf(f,'notes'),
          status:prev?.status||'Draft',at:prev?.at||now()});
      });
      return old?'Production order updated.':'Draft production order saved.';
    },{text:old?'Save Order':'Save Draft'});
  const variant=$('[data-variant]',form), preview=$('[data-preview]',form);
  wireCompanySite(form,'customers','customer','customerSite',old?.customerSiteId);
  wireCompanySite(form,'processors','processor','processorSite',old?.processorSiteId);
  function updateVariant(v=''){variant.innerHTML=variantControl('variant',valOf(form,'part'),v);}
  function update(e){
    if(e?.target.name==='part')updateVariant();
    try{
      const partId=valOf(form,'part');
      if(!partId){preview.innerHTML='';return;}
      const source=expandPart(state,partId,whole(valOf(form,'qty')),valOf(form,'variant'));
      preview.innerHTML=panel('Required raw materials',requireTable(state,aggregate(source),valOf(form,'location'),id));
    }catch(err){preview.innerHTML=note(err.message,'warn');}
  }
  updateVariant(old?.sku===old?.partId?'':old?.sku);
  form.addEventListener('change',update);form.addEventListener('input',update);update();
}
function orderView(id){
  const o=get(state,'orders',id), args=escapeArg(id);
  infoModal(o.no+' · '+labelOf(state,o.sku),formHeader([
      o.status==='Draft'?button('Release',`orderTransition(${args},'Released')`,'btn-sm btn-primary'):'',
      o.status==='Released'?button('Mark completed',`orderTransition(${args},'Completed')`,'btn-sm btn-primary'):'',
      ['Draft','Released'].includes(o.status)?small('Edit',`orderEdit('','',${args})`):'',
      ['Draft','Released'].includes(o.status)?small('Cancel',`orderTransition(${args},'Cancelled')`):''],['Draft','Released','Completed'],o.status)+
    kv([['Status',o.status],['Quantity',o.qty],['Location',locName(state,o.location)],
    ['Customer',get(state,'customers',o.customerId)?.name],['Customer site',get(state,'locations',o.customerSiteId)?.name],
    ['Processing company',get(state,'processors',o.processorId)?.name],['Processing site',get(state,'locations',o.processorSiteId)?.name],
    ['Notes',o.notes]])+
    panel('Raw material requirements',requireTable(state,o.materials,o.location,o.id))+panel('BOM trace',traceTable(o.source)),
    actionGroup(button('PDF',`recordPDF('orders',${escapeArg(id)})`,'btn-sm','pdf'),
      o.status!=='Completed'?dangerSmall('Delete',`deleteOperation('orders',${escapeArg(id)})`):''));
}
function orderTransition(id,status){
  const word={Released:'Release',Completed:'Confirm completion',Cancelled:'Cancel order'}[status];
  approval(word,status==='Completed'?'Consume the saved raw material requirements and receive the manufactured SKU at the fabrication location.':
    status==='Released'?'Reserve the raw materials for this order. Physical balances stay the same.':'Cancel this order and release its requirements.',s=>{
    const o=get(s,'orders',id);
    need(o&&(
      status==='Released'?o.status==='Draft':status==='Completed'?o.status==='Released':['Draft','Released'].includes(o.status)
    ),'The order already changed status.');
    if(status==='Released') {loc(s,o.location);stockItem(s,o.sku);o.materials.forEach(m=>stockItem(s,m.sku));}
    if(status==='Completed'){
      event(s,'production:'+id,'Production completion',[
        ...o.materials.map(l=>({sku:l.sku,location:o.location,delta:-l.qty})),
        {sku:o.sku,location:o.location,delta:o.qty}],o.no);
      Object.assign(get(s,'events','production:'+id),{orderId:id,
        ...(o.customerId?{partyType:'customers',partyId:o.customerId,siteId:o.customerSiteId||''}:{})});
      o.completedAt=now();
    }
    o.status=status;
  },word);
}
function productionPage(){
  return head('Operations','Production',button('New','orderEdit()','btn-primary'))+
    panel('Production orders',table(['Order','Part / SKU','Qty','Fabrication location','Customer / site','Processor / site','Status'],state.orders.slice().sort(dateSort).map(o=>[
      esc(o.no),esc(labelOf(state,o.sku)),esc(qfmt(o.qty,item(state,o.sku)?.unit)),esc(locName(state,o.location)),
      esc([get(state,'customers',o.customerId)?.name,get(state,'locations',o.customerSiteId)?.name].filter(Boolean).join(' / ')),
      esc([get(state,'processors',o.processorId)?.name,get(state,'locations',o.processorSiteId)?.name].filter(Boolean).join(' / ')),
      chip(o.status)+openBtn(`orderView(${escapeArg(o.id)})`)
    ]),'No production orders yet. Click New to make parts.'))+
    panel('Production plans',`<div class="card-body o-panel-link"><button type="button" class="link-btn" onclick="planEdit()">+ New production plan</button>
      <span class="sub">Plan several products at once and reserve their raw materials.</span></div>`+
      table(['Plan','Project','Location','Customer / site','Status'],state.plans.slice().sort(dateSort).map(p=>[
      esc(p.no),esc(p.name),esc(locName(state,p.location)),
      esc([get(state,'customers',p.customerId)?.name,get(state,'locations',p.customerSiteId)?.name].filter(Boolean).join(' / ')),
      chip(p.status)+openBtn(`planView(${escapeArg(p.id)})`)
    ]),'No production plans yet.'))+legacySection('plans','Legacy production plans');
}

/* Location-specific inventory and purchasing */
function inventoryForm(mode){
  const move=mode==='transfer', count=mode==='count', id=key(), opening=state;
  const titles={transfer:'Transfer Stock',count:'Physical Stock Check',adjust:'Record Stock Adjustment'};
  const parties=COMPANIES.flatMap(type=>current(state,type).map(row=>[
    JSON.stringify([type,row.id]),ENTITY[type]+' · '+row.name
  ]));
  const form=formModal(titles[mode],`<div class="form-grid">
    ${searchable('Item / SKU','sku',pair(skus()))}${select(move?'From location':'Custody location','location',locOptions())}
    ${move?select('To location','to',locOptions())+`<div class="field full">${note('Processing companies appear here automatically (their site holds AMBS stock). To hold stock at a customer site, enable stock custody for that site in the Customer record.')}</div>`:''}
    ${searchable('Related company (optional)','relatedParty',parties)}
    ${select('Related company site (optional)','relatedSite',[],'',false,'No linked site')}
    <div class="field full"><div class="hint">Stock locations owned by one company are linked automatically if no company is selected.</div></div>
    ${input(count?'Physical count':move?'Quantity to transfer':'Adjustment (+ or −)','qty','',
      {type:'number',required:true,extra:`step="any" ${count||move?'min="0"':''}`})}
    ${move?area('Reference / notes','notes'):input(count?'Reason / count reference':'Reason for adjustment','notes','',{required:true,full:true})}
    ${mode==='adjust'?tick('I am authorized to record this adjustment','authorized'):''}
    </div><div data-balance></div>`,async f=>{
      await commit(s=>{
        const row=stockItem(s,valOf(f,'sku')), location=loc(s,valOf(f,'location')).id, notes=valOf(f,'notes');
        const raw=valOf(f,'qty'), before=availability(s,row.id,location);
        if(mode==='adjust')need(checked(f,'authorized')&&notes,'Confirm authorization and enter the adjustment reason.');
        if(count){
          need(notes,'Enter a stock count reference.');
          need(Math.abs(before-availability(opening,row.id,location))<EPS,
            'Stock changed while this count was open. Reopen Stock Check and verify the physical quantity.');
        }
        const adjusted=Number(raw);
        need(!(!move&&!count)||(raw&&Number.isFinite(adjusted)&&adjusted!==0),'Enter a nonzero adjustment.');
        const requested=move?qty(raw):count?qty(raw,'Physical count',true):adjusted;
        const unitsAreDiscrete=!!row.partId || !!get(s,'parts',row.id) || !!get(s,'products',row.id);
        if(unitsAreDiscrete&&!measured(row.unit))need(Number.isSafeInteger(requested),'Use a whole quantity for parts, variants and products.');
        const delta=move?-requested:count?requested-before:requested;
        const lines=[{sku:row.id,location,delta}];
        if(move){
          const to=loc(s,valOf(f,'to')).id;need(to!==location,'Choose different source and destination locations.');
          lines.push({sku:row.id,location:to,delta:requested});
        }
        event(s,id,titles[mode],lines,notes);
        Object.assign(get(s,'events',id),stockEventContext(s,lines,valOf(f,'relatedParty'),valOf(f,'relatedSite')));
        if(count)Object.assign(get(s,'events',id),{physicalCount:requested,systemCount:before});
      });
      return 'Stock event recorded.';
    },{text:move?'Confirm Transfer':count?'Confirm Count':'Confirm Adjustment'});
  function update(){
    const sku=valOf(form,'sku'), l=valOf(form,'location'), row=item(state,sku);
    const target=$('[data-balance]',form);
    if(!row||!l){target.innerHTML='';return;}
    const balance=availability(state,sku,l);
    const raw=valOf(form,'qty'),entered=Number(raw);
    const insufficient=raw!==''&&Number.isFinite(entered)&&
      (move?entered>balance+EPS:!count&&balance+entered<-EPS);
    const partId=row.partId||row.id, part=get(state,'parts',partId);
    const manufacture=move&&insufficient&&part?.source==='Manufactured';
    const detail=insufficient?(move?' · Requested quantity exceeds source stock. '+
      (manufacture?'Check whether production has been completed.':'Review the source balance.'):
      ' · This adjustment would make the balance negative.') : '';
    const after=raw!==''&&Number.isFinite(entered)?count?entered:move?balance-entered:balance+entered:null;
    const destination=move?valOf(form,'to'):'';
    const destinationText=destination&&after!=null?' · '+locName(state,destination)+' after: '+
      qfmt(availability(state,sku,destination)+entered,row.unit):'';
    target.innerHTML=note('Available '+qfmt(balance,row.unit)+' at '+locName(state,l)+
      (after==null?'':' · after: '+qfmt(after,row.unit))+destinationText+detail,insufficient?'warn':'info')+
      (manufacture?small('Create Production Order',`closeModal();orderEdit(${escapeArg(partId)},${escapeArg(l)})`):'');
  }
  const relatedParty=form.elements.relatedParty,relatedSite=form.elements.relatedSite;
  relatedParty.addEventListener('change',()=>{
    const [type,id]=relatedParty.value?JSON.parse(relatedParty.value):[];
    relatedSite.innerHTML=choiceOptions(id?pair(companyLocations(state,type,id),l=>l.name+(l.city?' · '+l.city:'')):[],
      '','No linked site');
  });
  form.addEventListener('input',update);form.addEventListener('change',update);
}
function balanceData(s=state){
  return stockRows(s).sort((a,b)=>labelOf(s,a.sku).localeCompare(labelOf(s,b.sku))).map(r=>[
    labelOf(s,r.sku),locName(s,r.location),qfmt(r.qty,item(s,r.sku)?.unit)
  ]);
}
function eventLinks(s,e){
  const job=e.jobId&&get(s,'jobs',e.jobId),purchase=e.purchaseId&&get(s,'purchases',e.purchaseId),sale=e.salesId&&get(s,'sales',e.salesId);
  const orderId=e.orderId||(e.id.startsWith('production:')?e.id.slice('production:'.length):'');
  const order=orderId&&get(s,'orders',orderId);
  const partyType=e.partyType||(job?'customers':purchase?'suppliers':order?.customerId?'customers':'');
  const partyId=e.partyId||job?.customerId||purchase?.supplierId||order?.customerId;
  const siteId=e.siteId||e.destination||job?.destination||purchase?.supplierSiteId||order?.customerSiteId;
  return {company:partyId?get(s,partyType,partyId)?.name||'':'',site:siteId?get(s,'locations',siteId)?.name||'':'',
    processor:order?.processorId?get(s,'processors',order.processorId)?.name||'':'',
    processingSite:order?.processorSiteId?get(s,'locations',order.processorSiteId)?.name||'':'',
    document:job?.no||purchase?.no||order?.no||sale?.no||'',job,purchase,order,sale};
}
function eventView(id){
  const e=get(state,'events',id);
  const linked=eventLinks(state,e);
  infoModal(evType(e.type),kv([['Recorded',stamp(e.at)],['By',e.by],['Reference / reason',e.note],
    ['Related company',linked.company],['Related site',linked.site],
    ['Processing company',linked.processor],['Processing site',linked.processingSite],['Related document',linked.document],
    ['System count',e.systemCount],['Physical count',e.physicalCount]])+
    textTable(['Item / SKU','Location','Stock change','Current balance'],e.lines.map(l=>[
      labelOf(state,l.sku),locName(state,l.location),qfmt(l.delta,item(state,l.sku)?.unit),
      qfmt(availability(state,l.sku,l.location),item(state,l.sku)?.unit)
    ])),
    actionGroup(linked.job?small('Open dispatch',`closeModal();dispatchView(${escapeArg(linked.job.id)})`):'',
      linked.purchase?small('Open purchase',`closeModal();purchaseView(${escapeArg(linked.purchase.id)})`):'',
      linked.order?small('Open order',`closeModal();orderView(${escapeArg(linked.order.id)})`):'',
      linked.sale?small('Open sales order',`closeModal();salesView(${escapeArg(linked.sale.id)})`):'',
      button('Download PDF',`recordPDF('events',${escapeArg(id)})`,'btn-sm','pdf')));
}
function eventsTable(events=state.events){
  return table(['Date','Event','Items / SKUs','Location','Change','Related company / site','Reference','Actions'],events.slice().sort(dateSort).map(e=>{
    const linked=eventLinks(state,e);
    return [
    esc(stamp(e.at)),esc(evType(e.type)),esc([...new Set(e.lines.map(l=>labelOf(state,l.sku)))].join(', ')),
    esc(e.lines.length===2&&e.type==='Transfer Stock'?e.lines.map(l=>locName(state,l.location)).join(' → '):
      [...new Set(e.lines.map(l=>locName(state,l.location)))].join(', ')),
      esc(e.lines.map(l=>(l.delta>0?'+':'')+qfmt(l.delta,item(state,l.sku)?.unit)).join(', ')),
      esc([linked.company,linked.site,linked.processor,linked.processingSite].filter(Boolean).join(' / ')),
      esc(e.note),small('View',`eventView(${escapeArg(e.id)})`)
    ];
  }));
}
function inventoryPage(){
  return head('Operations',TITLES.movement,button('Transfer Stock',"inventoryForm('transfer')",'btn-primary','swap'),
    button('Stock Adjustment',"inventoryForm('adjust')",'','plus'),button('Stock Check',"inventoryForm('count')",'','check'))+
    searchableTable(['Item / SKU','Custody location','Physical balance'],balanceData().map(r=>r.map(esc)),'Record a receipt, opening adjustment or stock count to begin.')+
    panel('Movement history',eventsTable())+legacySection('movements','Legacy movements')+legacySection('stockChecks','Legacy stock checks');
}
const PR={
  newFor(sku,count){App.go('purchase');purchaseEdit('',{sku,qty:count});}
};
function purchaseEdit(id,initial){
  const old=get(state,'purchases',id);
  const form=formModal(old?'Edit Purchase Request':'New Purchase Request',`<div class="form-grid">
    ${searchable('Vendor','supplier',pair(current(state,'suppliers')),old?.supplierId)}
    ${select('Vendor site (optional)','supplierSite',[],'',false,'No linked site')}
    ${select('Receiving custody location','location',locOptions(),old?.location||'')}
    ${area('Reference / notes','notes',old?.notes)}</div><div data-purchase></div>`,async f=>{
      const items=lines().map(l=>({sku:fieldValue(l,'sku'),qty:qty(fieldValue(l,'qty')),received:0}));
      need(items.length&&new Set(items.map(l=>l.sku)).size===items.length,'Add at least one line and use one line per SKU.');
      await commit(s=>{
        const prev=get(s,'purchases',id);
        need(!id||prev?.lines.every(line=>line.received===0)&&sameCloudRecord(prev,old),
          'This request changed or has receipts. Reopen it before saving.');
        const supplierId=live(s,'suppliers',valOf(f,'supplier')).id, location=loc(s,valOf(f,'location')).id;
        const supplierSiteId=valOf(f,'supplierSite');
        checkedCompanySite(s,'suppliers',supplierId,supplierSiteId);
        items.forEach(l=>need(get(s,'materials',l.sku)||
          ['Purchased','Stocked'].includes(get(s,'parts',item(s,l.sku)?.partId||l.sku)?.source),
          'Choose a raw material or a purchased or stocked component.'));
        items.forEach(l=>{stockItem(s,l.sku);if(!get(s,'materials',l.sku))componentQty(l.qty,item(s,l.sku).unit,'Purchased component quantity');});
        add(s.purchases,{id:id||key(),no:prev?.no||operationNo('PR'),supplierId,supplierSiteId,location,notes:valOf(f,'notes'),lines:items,
          status:prev?.status||'Draft',at:prev?.at||now()});
      });
      return 'Purchase request saved.';
    });
  const options=skus().filter(x=>get(state,'materials',x.id)||
    ['Purchased','Stocked'].includes(get(state,'parts',x.partId||x.id)?.source));
  wireCompanySite(form,'suppliers','supplier','supplierSite',old?.supplierSiteId);
  const lines=repeat(form,'[data-purchase]',(l,n)=>`<legend>Purchase line</legend><div class="form-grid">
    ${searchable('Raw Material or purchased SKU',n+'_sku',pair(options),l.sku)}${number('Ordered quantity',n+'_qty',l.qty)}</div>`,
    old?.lines||[initial||{}],'Add Line');
}
function purchaseStatus(id,status){
  approval(status==='Ordered'?'Mark Ordered':'Cancel Purchase Request',
    status==='Ordered'?'Include these quantities as pending purchases at the receiving location.':'Cancel the unreceived requirement. Received stock remains in the ledger.',s=>{
      const p=get(s,'purchases',id);
      need(p&&(status==='Ordered'?p.status==='Draft':['Draft','Ordered'].includes(p.status)),'This purchase status has changed.');
      p.status=status;
    });
}
function receiptEdit(id){
  const p=get(state,'purchases',id), eventId=key();
  formModal('Vendor Receipt · '+p.no,note('Receiving into '+locName(state,p.location))+
    input('Delivery note / reference','ref','',{required:true})+p.lines.map((l,i)=>{
      const m=item(state,l.sku);
      return number(label(m)+' · Outstanding '+qfmt(l.qty-l.received,m.unit),'qty'+i,0);
    }).join(''),async f=>{
    await commit(s=>{
      const r=get(s,'purchases',id);
      need(r?.status==='Ordered','Mark this request ordered before confirming a receipt.');
      const deltas=r.lines.map((l,i)=>{
        const n=qty(valOf(f,'qty'+i),'Received quantity',true);
        if(!get(s,'materials',l.sku))componentQty(n,item(s,l.sku).unit,'Received component quantity',true);
        need(n<=l.qty-l.received+EPS,'Receipt exceeds the outstanding quantity for '+labelOf(s,l.sku)+'.');
        return n;
      });
      const lines=r.lines.map((l,i)=>({sku:l.sku,location:r.location,delta:deltas[i]})).filter(l=>l.delta>0);
      need(lines.length,'Enter a received quantity.');
      const ref=valOf(f,'ref');need(ref,'Enter a receipt reference.');
      need(!s.events.some(e=>e.purchaseId===id&&e.reference.toLowerCase()===ref.toLowerCase()),'This purchase already has a receipt with that reference.');
      event(s,eventId,'Supplier receipt',lines,r.no+' · '+ref);
      Object.assign(get(s,'events',eventId),{purchaseId:id,reference:ref,partyType:'suppliers',partyId:r.supplierId,
        siteId:r.supplierSiteId||''});
      r.lines.forEach((l,i)=>l.received+=deltas[i]);
      if(r.lines.every(l=>l.qty-l.received<=EPS))r.status='Received';
    });
    return 'Vendor receipt confirmed.';
  },{text:'Confirm Receipt'});
}
function purchaseView(id){
  const p=get(state,'purchases',id), args=escapeArg(id), untouched=p.lines.every(l=>l.received===0);
  infoModal(p.no,formHeader([
      p.status==='Draft'?button('Mark ordered',`purchaseStatus(${args},'Ordered')`,'btn-sm btn-primary'):'',
      p.status==='Ordered'?button('Receive',`receiptEdit(${args})`,'btn-sm btn-primary'):'',
      untouched&&['Draft','Ordered'].includes(p.status)?small('Edit',`purchaseEdit(${args})`):'',
      ['Draft','Ordered'].includes(p.status)?small('Cancel',`purchaseStatus(${args},'Cancelled')`):''],['Draft','Ordered','Received'],p.status)+
    kv([['Status',p.status],['Vendor',label(get(state,'suppliers',p.supplierId))],
    ['Vendor site',get(state,'locations',p.supplierSiteId)?.name],
    ['Receiving location',locName(state,p.location)],['Notes',p.notes]])+
    textTable(['Material / SKU','Ordered','Received','Outstanding'],p.lines.map(l=>{
      const unit=item(state,l.sku)?.unit;
      return [labelOf(state,l.sku),qfmt(l.qty,unit),qfmt(l.received,unit),qfmt(l.qty-l.received,unit)];
    }))+panel('Receipts',eventsTable(state.events.filter(e=>e.purchaseId===id))),
    actionGroup(button('PDF',`recordPDF('purchases',${escapeArg(id)})`,'btn-sm','pdf'),
      p.lines.every(l=>l.received===0)?dangerSmall('Delete',`deleteOperation('purchases',${escapeArg(id)})`):''));
}
function purchasingPage(){
  return head('Operations','Purchasing',button('New','purchaseEdit()','btn-primary'))+
    searchableTable(['Request','Vendor','Receiving location','Lines','Status'],state.purchases.slice().sort(dateSort).map(p=>[
      esc(p.no),esc(get(state,'suppliers',p.supplierId)?.name||'—'),esc(locName(state,p.location)),esc(p.lines.length),
      chip(p.status==='Ordered'&&p.lines.some(l=>l.received>0)?'Partially received':p.status)+openBtn(`purchaseView(${escapeArg(p.id)})`)
    ]),'No purchases yet. Click New to request materials from a vendor.',
    state.purchases.map(p=>[p.no,get(state,'suppliers',p.supplierId)?.name,p.status,...p.lines.map(l=>labelOf(state,l.sku))].join(' ')),
    {placeholder:'Search purchases…',noun:'purchases'})+panel('Vendor receipts',eventsTable(state.events.filter(e=>e.type==='Supplier receipt')))+
    legacySection('purchaseRequests','Legacy purchase requests')+legacySection('receipts','Legacy vendor receipts');
}

/* Packing and dispatch */
function dispatchEdit(id){
  const old=get(state,'jobs',id);
  if(old&&old.delivered>0)return toast('Jobs with confirmed deliveries cannot be edited.','warn');
  const draft=old?{name:old.name,location:old.location,products:[{
    productId:old.productId,qty:old.qty,parts:old.parts
  }]}:null;
  const destinations=customer=>pair(companyLocations(state,'customers',customer),l=>l.name+(l.city?' · '+l.city:''));
  productEditor((rows,location,form)=>{
    const product=rows[0], destination=get(state,'locations',valOf(form,'destination'));
    const finished=valOf(form,'fulfilment')==='Finished stock';
    return (destination?note('Destination · '+[destination.name,destination.address,destination.city].filter(Boolean).join(' · '))+mapAction(destination):'')+
      (finished?panel('Finished stock',textTable(['Product','Required','Available'],[[labelOf(state,product.productId),product.qty,
        qfmt(availability(state,product.productId,location),item(state,product.productId)?.unit)]])):
      panel('Packing requirements',table(['Part / SKU','Standard','Adjusted','Available at source'],product.parts.map(p=>[
        esc(labelOf(state,p.sku)),esc(p.standard),esc(p.qty),esc(qfmt(availability(state,p.sku,location),item(state,p.sku).unit))
      ]))));
  },async(f,read)=>{
    await commit(s=>{
      const prev=get(s,'jobs',id);
      need(!id||prev?.delivered===0&&sameCloudRecord(prev,old),
        'This job changed or has deliveries. Reopen it before saving.');
      const customerId=live(s,'customers',valOf(f,'customer')).id, destination=live(s,'locations',valOf(f,'destination'));
      need(destination.ownerType==='customers'&&destination.ownerId===customerId,'Select a delivery site belonging to this customer.');
      const location=loc(s,valOf(f,'location')).id, product=read(s)[0], name=valOf(f,'name');
      need(name,'Enter a dispatch reference.');
      const finished=valOf(f,'fulfilment')==='Finished stock';
      const trackAtDestination=checked(f,'trackAtDestination');
      if(trackAtDestination)need(destination.stock,'Enable stock custody on this customer site before tracking delivered stock there.');
      need(!trackAtDestination||destination.id!==location,'Choose different source and customer-site custody locations.');
      need(!finished||product.parts.every(p=>!p.variantId&&p.qty===p.standard),
        'Pack from component stock when variants or job-specific quantities are selected.');
      add(s.jobs,{id:id||key(),no:prev?.no||operationNo('DSP'),...product,name,customerId,destination:destination.id,location,finished,
        trackAtDestination,
        destinationSnapshot:{name:destination.name,address:destination.address,city:destination.city,lat:destination.lat,lng:destination.lng,url:destination.url},
        delivered:0,status:prev?.status||'Open',at:prev?.at||now()});
    });
    return old?'Dispatch job updated.':'Dispatch job saved.';
  },{title:old?'Edit Dispatch Job':'New Dispatch Job',description:'Select an AMBS custody location, customer site and product configuration.',saveText:'Save Job',dispatch:true,draft,
    extra:searchable('Customer','customer',pair(current(state,'customers')),old?.customerId)+select('Customer delivery site','destination',[])+
      select('Fulfilment','fulfilment',same(['Pack from parts','Finished stock']),old?.finished?'Finished stock':'Pack from parts')+
      tick('Keep delivered stock tracked at customer site','trackAtDestination',old?.trackAtDestination)+
      `<div class="field full"><div class="hint">Requires the customer site to be enabled as a stock custody location.</div></div>`,
    after(form){
      const customer=form.elements.customer, destination=form.elements.destination;
      customer.addEventListener('change',()=>{destination.innerHTML=choiceOptions(destinations(customer.value));});
      destination.innerHTML=choiceOptions(destinations(customer.value),old?.destination);
    }});
}
function dispatchRows(s,j,count){
  if(j.finished)return [{sku:j.productId,qty:count}];
  const before=j.delivered, after=before+count;
  const share=(n,total)=>Number(BigInt(n)*BigInt(total)/BigInt(j.qty));
  return aggregate(j.parts.map(p=>{
    if(!measured(item(s,p.sku)?.unit))return {sku:p.sku,qty:share(after,p.qty)-share(before,p.qty)};
    const proportional=n=>n===j.qty?p.qty:roundMeasured(p.qty*(n/j.qty));
    return {sku:p.sku,qty:roundMeasured(proportional(after)-proportional(before))};
  })).filter(l=>l.qty>0);
}
function dispatchView(id){
  const j=get(state,'jobs',id), destination=j.destinationSnapshot||get(state,'locations',j.destination);
  const history=state.events.filter(e=>e.jobId===id), trip=activeTrip('jobId',id), open=['Open','Partially delivered'].includes(j.status), args=escapeArg(id);
  infoModal(j.no+' · '+j.name,formHeader([
      open&&!trip?button('Assign driver',`assignDelivery('job',${args})`,'btn-sm btn-primary'):'',
      trip?button('Trip '+trip.no+' · '+trip.status,`tripView(${escapeArg(trip.id)})`,'btn-sm'):'',
      open?small('Partial delivery',`deliveryEdit(${args})`):'',
      j.delivered===0&&open?small('Edit',`dispatchEdit(${args})`):'',
      button('Print packing list',`packingListPDF('job',${args})`,'btn-sm','pdf'),
      open?small('Cancel job',`cancelJob(${args})`):''],
      ['Open','Partially delivered','Delivered'].filter(s=>s!=='Partially delivered'||j.status==='Partially delivered'),j.status)+kv([['Product',labelOf(state,j.productId)],['Customer',label(get(state,'customers',j.customerId))],
    ['Delivery site',[destination.name,destination.address,destination.city].filter(Boolean).join(' · ')],
    ['Custody location',locName(state,j.location)],['Fulfilment',j.finished?'Finished stock':'Pack from parts'],
    ['Track at customer site',j.trackAtDestination?'Yes':'No'],
    ['Ordered',j.qty],['Delivered',j.delivered],['Outstanding',j.qty-j.delivered],['Status',j.status]])+
    mapAction(destination)+panel('Saved packing configuration',partsTable(j.parts))+
    panel('Delivery history',table(['Delivery date','Product quantity','Reference','Actions'],history.map(e=>[
      esc(stamp(e.at)),esc(e.deliveredQty),esc(e.reference),small('View stock posting',`eventView(${escapeArg(e.id)})`)
    ]))),actionGroup(button('PDF',`recordPDF('jobs',${escapeArg(id)})`,'btn-sm','pdf'),
      j.delivered===0?dangerSmall('Delete',`deleteOperation('jobs',${escapeArg(id)})`):''));
}
function deliveryEdit(id){
  const j=get(state,'jobs',id), eventId=key(), remaining=j.qty-j.delivered;
  const form=formModal('Confirm Delivery · '+j.no,
    note(j.trackAtDestination?'Confirmed delivery moves these SKUs from source custody into the customer-site stock balance.':
      j.finished?'Confirmed delivery deducts complete products from finished stock.':
      'Confirmed delivery deducts these exact part and variant SKUs. Adjusted quantities are apportioned cumulatively across partial deliveries.')+
    `<div class="form-grid">${number('Quantity delivered (outstanding '+remaining+')','qty',remaining,1,1)}
    ${input('Delivery note / reference','ref','',{required:true})}</div><div data-delivery></div>`,async f=>{
      await commit(s=>{
        const job=get(s,'jobs',id), count=whole(valOf(f,'qty')), ref=valOf(f,'ref');
        need(job&&['Open','Partially delivered'].includes(job.status),'This dispatch job is closed.');
        need(job.delivered===j.delivered,'This delivery changed in another tab. Reopen it to review current quantities.');
        need(count<=job.qty-job.delivered,'Delivery exceeds the outstanding quantity.');
        need(ref&&!s.events.some(e=>e.jobId===id&&e.reference.toLowerCase()===ref.toLowerCase()),'Enter a new delivery reference.');
        const quantities=dispatchRows(s,job,count);
        if(job.trackAtDestination)loc(s,job.destination);
        const lines=quantities.flatMap(l=>[
          {sku:l.sku,location:job.location,delta:-l.qty},
          ...(job.trackAtDestination?[{sku:l.sku,location:job.destination,delta:l.qty}]:[])
        ]);
        event(s,eventId,'Customer delivery',lines,job.no+' · '+ref);
        Object.assign(get(s,'events',eventId),{jobId:id,deliveredQty:count,reference:ref,destination:job.destination,
          partyType:'customers',partyId:job.customerId,siteId:job.destination});
        job.delivered+=count; job.status=job.delivered===job.qty?'Delivered':'Partially delivered';
      });
      return 'Delivery confirmed.';
    },{text:'Confirm Delivery'});
  function update(){
    const n=Number(valOf(form,'qty'));
    $('[data-delivery]',form).innerHTML=n>0&&n<=remaining&&Number.isSafeInteger(n)?panel('Stock posting preview',
      table(['Exact SKU','To deduct','Available at source',...(j.trackAtDestination?['Customer site after']:[])],dispatchRows(state,j,n).map(l=>[
        esc(labelOf(state,l.sku)),esc(qfmt(l.qty,item(state,l.sku)?.unit)),esc(qfmt(availability(state,l.sku,j.location),item(state,l.sku)?.unit)),
        ...(j.trackAtDestination?[esc(qfmt(availability(state,l.sku,j.destination)+l.qty,item(state,l.sku)?.unit))]:[])
      ]))):note('Enter a whole quantity within the outstanding balance.','warn');
  }
  form.addEventListener('input',update);update();
}
function cancelJob(id){
  approval('Cancel remaining delivery','Close the outstanding balance. Confirmed delivery history and posted stock remain recorded.',s=>{
    const job=get(s,'jobs',id);need(['Open','Partially delivered'].includes(job?.status),'This dispatch job is closed.');
    job.status='Cancelled';
    for(const t of s.trips)if(t.jobId===id&&['Next','On the way'].includes(t.status))t.status='Cancelled';
  });
}
function dispatchPage(){
  return head('Operations',TITLES.dispatch,button('New','dispatchEdit()','btn-primary'))+
    searchableTable(['Job','Customer / site','Product','Requested','Delivered','Outstanding','Status'],state.jobs.slice().sort(dateSort).map(j=>[
      cell(j.no,j.name),cell(get(state,'customers',j.customerId)?.name,j.destinationSnapshot.name),
      esc(labelOf(state,j.productId)),esc(j.qty),esc(j.delivered),esc(j.qty-j.delivered),chip(j.status)+openBtn(`dispatchView(${escapeArg(j.id)})`)
    ]),'No dispatch jobs yet. Click New to pack a product for a customer.');
}

/* Sales orders: customer orders for any stock item, delivered in one or more shipments. */
const salesTotal=o=>o.lines.reduce((n,l)=>n+(l.price||0)*l.qty,0);
const salesOpenLines=o=>o.lines.filter(l=>l.qty-l.delivered>EPS);
const salesProgress=o=>{
  const ordered=o.lines.reduce((n,l)=>n+l.qty,0), done=o.lines.reduce((n,l)=>n+l.delivered,0);
  return ordered?Math.min(100,Math.round(done/ordered*100)):0;
};
const isoDate=v=>/^\d{4}-\d{2}-\d{2}$/.test(v);
function salesEdit(id){
  const old=get(state,'sales',id);
  if(old&&old.lines.some(l=>l.delivered>0))return toast('Orders with deliveries cannot be edited.','warn');
  if(old&&!['Draft','Confirmed'].includes(old.status))return toast('This sales order is closed.','warn');
  const form=formModal(old?'Edit Sales Order · '+old.no:'New Sales Order',`<div class="form-grid">
    ${searchable('Customer','customer',pair(current(state,'customers')),old?.customerId)}
    ${select('Customer delivery site (optional)','site',[],'',false,'No linked site')}
    ${input('Customer PO / reference (optional)','reference',old?.reference)}
    ${input('Order date','date',old?.date||todayISO(),{type:'date',required:true})}
    ${input('Requested delivery date (optional)','due',old?.due,{type:'date'})}
    ${area('Notes','notes',old?.notes)}</div><div data-sales></div><div data-sales-total></div>`,async f=>{
      const items=lines().map(l=>({sku:fieldValue(l,'sku'),qty:fieldValue(l,'qty'),price:fieldValue(l,'price')}));
      need(items.length,'Add at least one order line.');
      need(items.every(l=>l.sku),'Choose an item on every order line.');
      need(new Set(items.map(l=>l.sku)).size===items.length,'Use one line per item.');
      await commit(s=>{
        const prev=get(s,'sales',id);
        need(!id||prev&&prev.lines.every(l=>l.delivered===0)&&sameCloudRecord(prev,old),
          'This order changed or has deliveries. Reopen it before saving.');
        const customerId=live(s,'customers',valOf(f,'customer')).id, siteId=valOf(f,'site');
        checkedCompanySite(s,'customers',customerId,siteId);
        const date=valOf(f,'date'), due=valOf(f,'due');
        need(isoDate(date),'Enter the order date.');
        need(!due||isoDate(due)&&due>=date,'The requested delivery date cannot be before the order date.');
        const orderLines=items.map(l=>{
          const row=stockItem(s,l.sku);
          return {sku:l.sku,qty:componentQty(l.qty,row.unit,'Ordered quantity'),
            price:l.price===''?0:qty(l.price,'Unit price',true),delivered:0};
        });
        add(s.sales,{id:id||key(),no:prev?.no||operationNo('SO'),customerId,siteId,reference:valOf(f,'reference'),date,due,
          notes:valOf(f,'notes'),lines:orderLines,status:prev?.status||'Draft',at:prev?.at||now()});
      });
      return old?'Sales order updated.':'Sales order saved.';
    },{text:'Save Order'});
  wireCompanySite(form,'customers','customer','site',old?.siteId);
  const lines=repeat(form,'[data-sales]',(l,n)=>`<legend>Order line</legend><div class="form-grid">
    ${searchable('Item / SKU',n+'_sku',pair(skus()),l.sku)}
    ${number('Ordered quantity',n+'_qty',l.qty??'',0,'any')}
    ${input('Unit price (AED, optional)',n+'_price',l.price||'',{type:'number',extra:'min="0" step="0.01"'})}</div>`,
    old?.lines||[{}],'Add Line');
  const total=()=>{
    const sum=lines().reduce((n,l)=>n+(Number(fieldValue(l,'qty'))||0)*(Number(fieldValue(l,'price'))||0),0);
    $('[data-sales-total]',form).innerHTML=sum>0?note('Order total · '+nfmt(sum,2)+' AED'):'';
  };
  form.addEventListener('input',total);form.addEventListener('change',total);total();
}
function salesStatus(id,status){
  const copy={Confirmed:['Confirm Sales Order','Confirm this order so it can be delivered. It then appears in Operations → Deliveries, ready to assign a driver. Lines can still be edited until the first delivery.','Confirm Order'],
    Cancelled:['Cancel Sales Order','Close the undelivered balance. Delivered quantities and posted stock stay recorded.','Cancel Order']}[status];
  approval(copy[0],copy[1],s=>{
    const o=get(s,'sales',id);
    need(o&&(status==='Confirmed'?o.status==='Draft':SALES_OPEN.includes(o.status)),'This order status has changed.');
    if(status==='Confirmed'){live(s,'customers',o.customerId);o.lines.forEach(l=>stockItem(s,l.sku));}
    if(status==='Cancelled')for(const t of s.trips)if(t.salesId===id&&['Next','On the way'].includes(t.status))t.status='Cancelled';
    o.status=status;
  },copy[2]);
}
function salesDeliver(id){
  const o=get(state,'sales',id), eventId=key(), sources=custody();
  if(!sources.length)return toast('Add a custody location in Settings & Data before delivering.','warn');
  const open=o.lines.map((l,i)=>({...l,i,left:l.qty-l.delivered})).filter(l=>l.left>EPS);
  const form=formModal('Deliver · '+o.no,
    note('Choose where the goods leave from and how much of each line is delivered now. Leave 0 for lines that are not shipped yet.')+
    `<div class="form-grid">${select('Ship from (custody location)','location',locOptions(),sources.length===1?sources[0].id:'')}
    ${input('Delivery note / reference','ref','',{required:true})}</div><div class="form-grid">`+
    open.map(l=>{const u=item(state,l.sku)?.unit;
      return number(labelOf(state,l.sku)+' · outstanding '+qfmt(l.left,u),'qty'+l.i,l.left,0,'any')+
        `<div class="field"><label>Available at source</label><div class="inp sales-available" data-available="${l.i}">—</div></div>`;
    }).join('')+'</div>',async f=>{
      await commit(s=>{
        const r=get(s,'sales',id);
        need(r&&['Confirmed','Partially delivered'].includes(r.status),'Confirm this order before delivering.');
        need(sameCloudRecord(r.lines,o.lines),'This order changed in another tab. Reopen it to review current quantities.');
        const location=loc(s,valOf(f,'location')).id, ref=valOf(f,'ref');
        need(ref,'Enter a delivery reference.');
        need(!s.events.some(e=>e.salesId===id&&e.reference.toLowerCase()===ref.toLowerCase()),'This order already has a delivery with that reference.');
        const amounts=r.lines.map((l,i)=>{
          if(!f.elements.namedItem('qty'+i))return 0;
          const raw=valOf(f,'qty'+i), n=componentQty(raw===''?0:raw,item(s,l.sku).unit,'Delivered quantity',true);
          need(n<=l.qty-l.delivered+EPS,'Delivery exceeds the outstanding quantity for '+labelOf(s,l.sku)+'.');
          return n;
        });
        const stock=r.lines.map((l,i)=>({sku:l.sku,location,delta:-amounts[i]})).filter(l=>l.delta<0);
        need(stock.length,'Enter a delivered quantity.');
        event(s,eventId,'Sales delivery',stock,r.no+' · '+ref);
        Object.assign(get(s,'events',eventId),{salesId:id,reference:ref,partyType:'customers',partyId:r.customerId,siteId:r.siteId||''});
        r.lines.forEach((l,i)=>{l.delivered=measured(item(s,l.sku).unit)?roundMeasured(l.delivered+amounts[i]):l.delivered+amounts[i];});
        r.status=r.lines.every(l=>l.qty-l.delivered<=EPS)?'Delivered':'Partially delivered';
      });
      return 'Delivery confirmed.';
    },{text:'Confirm Delivery'});
  const update=()=>{
    const source=valOf(form,'location');
    open.forEach(l=>{const cellEl=$(`[data-available="${l.i}"]`,form);
      if(cellEl)cellEl.textContent=source?qfmt(availability(state,l.sku,source),item(state,l.sku)?.unit):'Choose a location';});
  };
  form.addEventListener('change',update);update();
}
function salesView(id){
  const o=get(state,'sales',id), total=salesTotal(o);
  const trip=activeTrip('salesId',id), open=['Confirmed','Partially delivered'].includes(o.status), args=escapeArg(id);
  infoModal(o.no+' · '+(get(state,'customers',o.customerId)?.name||''),formHeader([
      o.status==='Draft'?button('Confirm',`salesStatus(${args},'Confirmed')`,'btn-sm btn-primary'):'',
      open&&!trip?button('Assign driver',`assignDelivery('sale',${args})`,'btn-sm btn-primary'):'',
      trip?button('Trip '+trip.no+' · '+trip.status,`tripView(${escapeArg(trip.id)})`,'btn-sm'):'',
      open?small('Partial delivery',`salesDeliver(${args})`):'',
      ['Draft','Confirmed'].includes(o.status)&&o.lines.every(l=>l.delivered===0)?small('Edit',`salesEdit(${args})`):'',
      SALES_OPEN.includes(o.status)?small('Cancel order',`salesStatus(${args},'Cancelled')`):''],
      ['Draft','Confirmed','Partially delivered','Delivered'].filter(s=>s!=='Partially delivered'||o.status==='Partially delivered'),o.status)+
    kv([['Status',o.status],['Customer',label(get(state,'customers',o.customerId))],
    ['Delivery site',get(state,'locations',o.siteId)?.name],['Customer PO / reference',o.reference],['Order date',fmtDate(o.date)],
    ['Requested delivery',o.due?fmtDate(o.due):''],['Delivered',salesProgress(o)+'%'],['Order total',total?nfmt(total,2)+' AED':''],['Notes',o.notes]])+
    textTable(['Item / SKU','Ordered','Delivered','Outstanding','In stock (all locations)','Unit price','Line total'],o.lines.map(l=>{
      const u=item(state,l.sku)?.unit;
      return [labelOf(state,l.sku),qfmt(l.qty,u),qfmt(l.delivered,u),qfmt(Math.max(0,l.qty-l.delivered),u),qfmt(physical(state,l.sku),u),
        l.price?nfmt(l.price,2):'—',l.price?nfmt(l.price*l.qty,2):'—'];
    }))+panel('Deliveries',eventsTable(state.events.filter(e=>e.salesId===id))),
    actionGroup(button('PDF',`recordPDF('sales',${escapeArg(id)})`,'btn-sm','pdf'),
      o.status==='Draft'||o.status==='Cancelled'?'':small('Packing list',`packingListPDF('sale',${escapeArg(id)})`),
      o.lines.every(l=>l.delivered===0)?dangerSmall('Delete',`deleteOperation('sales',${escapeArg(id)})`):''));
}
function salesPage(){
  const orders=state.sales.slice().sort(dateSort);
  const open=orders.filter(o=>SALES_OPEN.includes(o.status));
  const due=open.filter(o=>o.due&&o.due<todayISO()).length;
  const value=open.reduce((n,o)=>n+salesTotal(o),0);
  return head('Operations',TITLES.sales,button('New','salesEdit()','btn-primary'))+
    (due?note(due+' open order'+(due>1?'s are':' is')+' past the requested delivery date.','warn'):'')+
    searchableTable(['Order','Customer / site','Order date','Requested','Lines','Delivered','Value (AED)','Status'],orders.map(o=>{
      const late=SALES_OPEN.includes(o.status)&&o.due&&o.due<todayISO(), total=salesTotal(o), progress=salesProgress(o);
      return [cell(o.no,o.reference),cell(get(state,'customers',o.customerId)?.name||'—',get(state,'locations',o.siteId)?.name||''),
        esc(fmtDate(o.date)),late?`<span class="sales-late">${esc(fmtDate(o.due))}</span>`:esc(o.due?fmtDate(o.due):'—'),
        esc(o.lines.length+(o.lines.length===1?' item':' items')),
        `<div class="sales-progress" title="${progress}% delivered"><span style="width:${progress}%"></span></div><div class="sub">${progress}%</div>`,
        esc(total?nfmt(total,2):'—'),chip(o.status)+openBtn(`salesView(${escapeArg(o.id)})`)];
    }),'No sales orders yet. Click New Sales Order to record a customer order.',
    orders.map(o=>[o.no,o.reference,get(state,'customers',o.customerId)?.name,o.status,...o.lines.map(l=>labelOf(state,l.sku))].join(' ')),
    {placeholder:'Search by order, customer, item or status…',noun:'orders'})+
    panel('Sales deliveries',eventsTable(state.events.filter(e=>e.type==='Sales delivery')));
}

/* Dashboard and offline reports */
function warningRows(){
  const low=[];
  const req=state.orders.filter(x=>x.status==='Released').concat(state.plans.filter(x=>x.status==='Reserved'));
  const seen=new Set();
  for(const p of req)for(const l of p.materials){
    const pairKey=JSON.stringify([l.sku,p.location]);
    if(seen.has(pairKey))continue;
    seen.add(pairKey);
    const shortage=reserved(state,l.sku,p.location)-availability(state,l.sku,p.location);
    if(shortage>EPS)low.push([labelOf(state,l.sku),'Reserved demand shortage',locName(state,p.location),qfmt(shortage,item(state,l.sku)?.unit)]);
  }
  return low;
}
function materialSummary(){
  const details=new Map();
  const records=current(state,'materials');
  for(const row of records){
    const cat=row.category||'Uncategorized', id=JSON.stringify([cat,row.unit]);
    const total=details.get(id)||{cat,unit:row.unit,qty:0,count:0};
    total.count++;total.qty+=physical(state,row.id);details.set(id,total);
  }
  return textTable(['Category','Distinct materials','Balance by unit'],[...details.values()].map(x=>[x.cat,x.count,qfmt(x.qty,x.unit)]));
}
function skuSummary(rows){
  const balances=stockRows(state);
  return textTable(['Product / Variant SKU','Custody location','Physical balance'],rows.flatMap(r=>{
    const found=balances.filter(b=>b.sku===r.id);
    return found.length?found.map(b=>[label(r),locName(state,b.location),qfmt(b.qty,r.unit)]):[[label(r),'—',qfmt(0,r.unit)]];
  }));
}
function partSummary(){
  const rows=stockRows(state), totals=new Map();
  for(const l of rows){
    const sku=item(state,l.sku), part=get(state,'parts',sku?.partId||l.sku);
    if(!part)continue;
    const group=JSON.stringify([part.category||'Uncategorized',l.location,sku.unit]);
    const total=totals.get(group)||{qty:0,keys:new Set()};
    total.qty+=l.qty; total.keys.add(l.sku); totals.set(group,total);
  }
  return textTable(['Category','Custody location','Distinct SKUs','Balance by unit'],[...totals].map(([k,v])=>{
    const [c,l,u]=JSON.parse(k);return [c,locName(state,l),v.keys.size,qfmt(v.qty,u)];
  }));
}
function pdf(title,columns,rows,{landscape=false}={}){
  if(!PDFR._ok())return;
  const doc=PDFR._doc(landscape?'landscape':'portrait'), drawBrand=PDFR._hf(doc);
  doc.autoTable({
    startY:94,head:[columns],body:rows.map(row=>row.map(x=>String(x??''))),
    margin:{top:94,bottom:45,left:40,right:40},styles:{fontSize:8,overflow:'linebreak'},headStyles:{fillColor:[30,35,43]},
    didDrawPage(){
      drawBrand();
      doc.setTextColor(30,35,43);doc.setFont('helvetica','bold');doc.setFontSize(11);
      doc.text(doc.splitTextToSize(title,doc.internal.pageSize.getWidth()-80)[0],40,79);
    }
  });
  doc.save('AMBS_'+title.replace(/[^a-z0-9_-]+/gi,'_')+'.pdf');
}
/* Packing list: what goes on the truck for one delivery, with tick boxes and signatures. */
function packingContents(trip,job,sale){
  const ev=trip&&state.events.find(e=>e.reference===trip.no&&(job?e.jobId===job.id:sale?e.salesId===sale.id:false));
  const take=lines=>lines.map(l=>({sku:l.sku,qty:l.qty})).filter(l=>l.qty>0);
  if(ev)return {count:ev.deliveredQty||0,lines:take(ev.lines.filter(l=>l.delta<0).map(l=>({sku:l.sku,qty:-l.delta})))};
  if(job){
    const left=job.qty-job.delivered;
    if(left>0)return {count:left,lines:take(dispatchRows(state,job,left))};
    return {count:job.qty,lines:take(job.finished?[{sku:job.productId,qty:job.qty}]:job.parts.map(p=>({sku:p.sku,qty:p.qty})))};
  }
  if(sale){
    const open=sale.lines.filter(l=>l.qty-l.delivered>EPS);
    return {count:0,lines:take((open.length?open:sale.lines).map(l=>({sku:l.sku,qty:open.length?l.qty-l.delivered:l.qty})))};
  }
  return {count:0,lines:[]};
}
function packingListPDF(kind,id){
  if(!PDFR._ok())return;
  let trip=kind==='trip'?get(state,'trips',id):null;
  const job=kind==='job'?get(state,'jobs',id):trip?.jobId?get(state,'jobs',trip.jobId):null;
  const sale=kind==='sale'?get(state,'sales',id):trip?.salesId?get(state,'sales',trip.salesId):null;
  if(!trip)trip=job?activeTrip('jobId',job.id):sale?activeTrip('salesId',sale.id):null;
  const driver=trip&&get(state,'drivers',trip.driverId);
  const customer=get(state,'customers',job?.customerId||sale?.customerId||trip?.customerId);
  const site=job?(job.destinationSnapshot||get(state,'locations',job.destination)):sale?get(state,'locations',sale.siteId):null;
  const from=locName(state,job?.location||trip?.fromLocation||'')||trip?.from||'';
  const {count,lines}=packingContents(trip,job,sale);
  const no=trip?.no||job?.no||sale?.no;
  const doc=PDFR._doc(), header=PDFR._hf(doc,'Packing list');
  header();
  const W=doc.internal.pageSize.getWidth();
  doc.setTextColor(30,35,43);doc.setFont('helvetica','bold');doc.setFontSize(16);doc.text('PACKING LIST',40,84);
  doc.setFontSize(12);doc.text(String(no||''),W-40,84,{align:'right'});
  const where=[site?.name,site?.address,site?.city].filter(Boolean).join(', ')||trip?.location||'';
  const meta=[['Date',fmtDate(trip?.date||todayISO())],['Customer',customer?.name||trip?.customerName||''],
    ['Reference',[job?job.no+' · '+job.name:'',sale?sale.no+(sale.reference?' · PO '+sale.reference:''):''].filter(Boolean).join(' ')],['Ship from',from],
    ['Driver',driver?driver.name+(driver.phone?' · '+driver.phone:''):'Not assigned yet'],['Vehicle',trip?.vehicle||driver?.vehicleType||''],
    ['Deliver to',where],['Map',trip?.mapUrl||(site?mapsLink(site):'')||'']];
  let y=106;doc.setFontSize(9);
  const colW=(W-80)/2;
  for(let i=0;i<meta.length;i+=2){
    let h=0;
    for(const j of [0,1]){const m=meta[i+j];if(!m)continue;const x=40+j*colW;
      doc.setFont('helvetica','bold');doc.setTextColor(100);doc.text(m[0],x,y);
      doc.setFont('helvetica','normal');
      if(m[0]==='Map'&&m[1]){doc.setTextColor(26,115,232);doc.textWithLink('Open in Google Maps',x+70,y,{url:m[1]});h=Math.max(h,1);continue;}
      doc.setTextColor(20);const t=doc.splitTextToSize(String(m[1]||'—'),colW-82);doc.text(t,x+70,y);h=Math.max(h,t.length);}
    y+=Math.max(1,h)*11+5;
  }
  if(job){
    const p=item(state,job.productId);
    doc.setFillColor(248,240,240);doc.setDrawColor(155,28,28);doc.roundedRect(40,y,W-80,30,3,3,'FD');
    doc.setFont('helvetica','bold');doc.setFontSize(11);doc.setTextColor(155,28,28);
    doc.text('Product: '+(p?.name||labelOf(state,job.productId))+'   ×   '+(count||job.qty)+' '+(p?.unit||''),52,y+19);
    doc.setFont('helvetica','normal');doc.setFontSize(8.5);doc.setTextColor(90);
    doc.text(job.finished?'Complete products from finished stock':'Packed from parts — lines below',W-52,y+19,{align:'right'});
    y+=42;
  }
  const rows=lines.length?lines.map((l,i)=>{const it=item(state,l.sku);
      return [String(i+1),it?.code||'',it?.name||labelOf(state,l.sku),{content:qfmt(l.qty,it?.unit).replace(/\s+\S+$/,''),styles:{halign:'right',fontStyle:'bold'}},it?.unit||'','[   ]'];}):
    [['1','',trip?.description||trip?.system||'—','','','[   ]']];
  doc.autoTable({head:[['#','Code','Item','Qty','Unit','Packed']],body:rows,startY:y,widths:[.06,.16,.46,.11,.09,.12],
    margin:{top:70,bottom:44,left:40,right:40},styles:{fontSize:9.5,cellPadding:6},headStyles:{fillColor:[31,35,43]},
    didDrawPage(){if(doc.internal.getCurrentPageInfo().pageNumber>1)header();}});
  let end=doc.lastAutoTable.finalY+14;
  doc.setFont('helvetica','normal');doc.setFontSize(9);doc.setTextColor(60);
  doc.text('Total lines: '+lines.length+(trip?.notes?'   ·   Notes: '+trip.notes:''),40,end);
  PDFR._sig(doc,end,['Packed by','Driver','Received by (customer)']);
  doc.save('AMBS_Packing_List_'+String(no||'').replace(/[^a-z0-9_-]+/gi,'_')+'.pdf');
}
function recordPDF(type,id){
  const row=get(state,type,id);
  const title=(row.no||row.type)+' '+(row.name||'');
  let columns, lines;
  if(type==='orders'||type==='plans'){
    columns=['Part / SKU','Raw Material','Formula','Wastage %','Required'];
    lines=row.source.map(l=>[labelOf(state,l.partSku),labelOf(state,l.sku),l.formula,l.wastage,qfmt(l.qty,l.unit)]);
    lines.unshift([row.status,locName(state,row.location),'','','']);
    if(row.customerId)lines.splice(1,0,['Customer',get(state,'customers',row.customerId)?.name,
      get(state,'locations',row.customerSiteId)?.name||'','','']);
    if(row.processorId)lines.splice(1,0,['Processing company',get(state,'processors',row.processorId)?.name,
      get(state,'locations',row.processorSiteId)?.name||'','','']);
    if(type==='orders')lines.splice(1,0,[labelOf(state,row.sku),'Manufacture','','',qfmt(row.qty,item(state,row.sku)?.unit)]);
    if(type==='plans')lines.splice(1,0,...row.products.map(l=>[labelOf(state,l.productId),'Planned product','','',l.qty]),
      ...row.materials.map(l=>['Consolidated demand',labelOf(state,l.sku),'','',qfmt(l.qty,item(state,l.sku)?.unit)]));
  }else if(type==='events'){
    columns=['Item / SKU','Location','Stock change'];
    lines=row.lines.map(l=>[labelOf(state,l.sku),locName(state,l.location),qfmt(l.delta,item(state,l.sku)?.unit)]);
    lines.unshift([row.note,stamp(row.at),row.by]);
    const related=eventLinks(state,row);
    if(related.company||related.site||related.document)lines.unshift([
      related.company,related.site,related.document
    ]);
    if(related.processor)lines.unshift([related.processor,related.processingSite,'Processing company']);
  }else if(type==='sales'){
    columns=['Item / SKU','Ordered','Delivered','Outstanding','Unit price (AED)','Line total (AED)'];
    lines=row.lines.map(l=>{const u=item(state,l.sku)?.unit;
      return [labelOf(state,l.sku),qfmt(l.qty,u),qfmt(l.delivered,u),qfmt(l.qty-l.delivered,u),l.price?nfmt(l.price,2):'',l.price?nfmt(l.price*l.qty,2):''];});
    lines.unshift(['Customer',label(get(state,'customers',row.customerId)),'Delivery site',get(state,'locations',row.siteId)?.name||'—','Status',row.status],
      ['Order date',fmtDate(row.date),'Requested delivery',row.due?fmtDate(row.due):'—','Customer PO',row.reference||'—']);
    if(salesTotal(row))lines.push(['Order total','','','','',nfmt(salesTotal(row),2)]);
    lines.push(...state.events.filter(e=>e.salesId===id).map(e=>['Delivery · '+e.reference,stamp(e.at),
      e.lines.map(l=>labelOf(state,l.sku)+' × '+qfmt(-l.delta,item(state,l.sku)?.unit)).join(', '),locName(state,e.lines[0]?.location),'','']));
  }else if(type==='purchases'){
    columns=['Material / SKU','Ordered','Received','Outstanding'];
    lines=row.lines.map(l=>[labelOf(state,l.sku),l.qty,l.received,l.qty-l.received]);
    lines.unshift([label(get(state,'suppliers',row.supplierId)),locName(state,row.location),row.status,'']);
    if(row.supplierSiteId)lines.splice(1,0,['Vendor site',get(state,'locations',row.supplierSiteId)?.name,'','']);
  }else{
    columns=['Part SKU','Standard','Adjusted','Delivery'];
    lines=row.parts.map(l=>[labelOf(state,l.sku),l.standard,l.qty,'']);
    lines.unshift([labelOf(state,row.productId),row.qty,row.delivered,row.status],
      [get(state,'customers',row.customerId)?.name,row.destinationSnapshot.name,row.destinationSnapshot.address,row.destinationSnapshot.city]);
    lines.splice(2,0,['Stock tracking',row.trackAtDestination?'Customer site custody':'Delivered out','','']);
    lines.push(...state.events.filter(e=>e.jobId===id).map(e=>[e.reference,'','',e.deliveredQty]));
  }
  pdf(title.trim(),columns,lines);
}
function csv(columns,rows,name){
  const split=x=>'"'+String(x??'').replace(/^[=+@-](?=\D)/,"'$&").replace(/"/g,'""')+'"';
  download('AMBS_'+name+'.csv','\ufeff'+[columns,...rows].map(r=>r.map(split).join(',')).join('\r\n'),'text/csv');
}
const STOCK_COLUMNS=['Item / SKU','Custody location','Physical balance'];
function reportPage(){
  return head('System','Reports',button('Stock PDF',"pdf('Stock status',STOCK_COLUMNS,balanceData())",'btn-primary','pdf'),
    button('Stock CSV',"csv(STOCK_COLUMNS,balanceData(),'stock')",'','download'),
    button('Ledger CSV','ledgerCSV()','','download'))+
    panel('Stock status',textTable(STOCK_COLUMNS,balanceData()))+
    panel('Reserved demand shortages',textTable(['Item','Alert','Location','Shortfall'],warningRows(),'No current stock warnings.'))+
    panel('Movement ledger',eventsTable());
}
function ledgerCSV(){
  csv(['Date','Event','SKU','Location','Quantity change','Unit','Related company','Related site','Processor','Processing site','Document','Reference','By'],state.events.flatMap(e=>{
    const linked=eventLinks(state,e);
    return e.lines.map(l=>[
    e.at,e.type,labelOf(state,l.sku),locName(state,l.location),l.delta,item(state,l.sku)?.unit,
    linked.company,linked.site,linked.processor,linked.processingSite,linked.document,e.note,e.by
    ]);
  }),'ledger');
}

/* Legacy review and portable backup */
function legacySection(type,title){
  if(!legacy[type]?.length)return '';
  return panel(title,table(['Reference','Date','Description','Actions'],legacy[type].slice().reverse().map(r=>[
    esc(r.no||r.ref||r.type||r.id),esc(fmtDate(r.date||r.createdAt)),esc(r.name||r.project||r.supplier||r.remarks||r.status||r.type),
    small('View legacy record',`legacyView(${escapeArg(type)},${escapeArg(r.id)})`)
  ])));
}
function legacyView(type,id){
  const row=legacy[type].find(r=>r.id===id);
  const linked=type==='products'?legacy.bom.filter(l=>l.productId===id):[];
  const columns=['Field','Value'];
  const body=Object.entries(row).filter(([k])=>k!=='image').map(([k,v])=>[k,typeof v==='object'?JSON.stringify(v):String(v??'')]);
  infoModal('Legacy · '+(row.no||row.name||row.ref||row.type||row.id),
    note('Original data retained for reference. Review legacy stock and formula values before using them.')+thumb(row.image)+
    kv(body)+(linked.length?panel('Original material formulas',textTable(['Raw Material','Formula','Wastage %'],linked.map(l=>[
      label(legacy.materials.find(m=>m.id===l.materialId)),l.formula,l.wastage]))):''),
    button('Download PDF',`legacyPDF(${escapeArg(type)},${escapeArg(id)})`,'btn-sm','pdf'));
}
function legacyPDF(type,id){
  const r=legacy[type].find(x=>x.id===id);
  pdf('Legacy '+(r.no||r.name||r.type||type),['Field','Value'],
    Object.entries(r).filter(([k])=>k!=='image').map(([k,v])=>[k,typeof v==='object'?JSON.stringify(v):v]));
}
function legacyBalance(type,id){
  const row=legacy[type].find(x=>x.id===id);
  return Number(row?.initialStock||0)+legacy.movements.filter(m=>m.itemType===(type==='materials'?'material':'product')&&m.itemId===id)
    .reduce((sum,m)=>sum+Number(m.qtyIn||0)-Number(m.qtyOut||0),0);
}
function reviewOpening(id){
  const r=get(state,'reviews',id), m=get(state,'materials',r.legacyId), raw=legacy.materials.find(x=>x.id===r.legacyId);
  formModal('Verify legacy opening stock · '+raw.name,
    note('Original global balance: '+qfmt(legacyBalance('materials',raw.id),raw.unit)+
      '. Enter only a verified physical quantity. For several locations, use separate stock counts.')+
    `<div class="form-grid">${select('Custody location','location',locOptions(),'',false)}
    ${number('Verified opening quantity (zero to close without posting)','qty',0)}
    ${input('Verification reason / reference','reason','',{required:true,full:true})}
    ${tick('I verified this balance','authorized')}</div>`,async f=>{
      const n=qty(valOf(f,'qty'),'Verified quantity',true), reason=valOf(f,'reason');
      need(checked(f,'authorized')&&reason,'Confirm verification and enter a reference.');
      await commit(s=>{
        const r=get(s,'reviews',id);need(r&&!r.resolved,'This opening balance has already been reviewed.');
        if(n>0){
          const sku=stockItem(s,m?.id).id, location=loc(s,valOf(f,'location')).id;
          need(!s.events.some(e=>e.lines.some(l=>l.sku===sku)),'This SKU already has stock events. Use physical stock counts to reconcile it, then close this review with zero.');
          event(s,'legacy-opening:'+raw.id,'Verified legacy opening',[{sku,location,delta:n}],reason);
        }
        r.resolved=reason;
      });
    },{text:'Confirm Review'});
}
function classifyLegacy(id){
  const review=get(state,'reviews',id), p=legacy.products.find(x=>x.id===review.legacyId);
  const lines=legacy.bom.filter(l=>l.productId===p.id);
  formModal('Classify Legacy Item · '+p.name,note('Original global stock: '+qfmt(legacyBalance('products',p.id),p.unit)+
    '. Reconcile confirmed stock by custody location using Stock Check. Legacy material formulas require approval.')+
    select('Classify as','kind',same(['Part','Complete Product','Keep in legacy history']))+
    input('Code / SKU','code',p.code||p.id,{required:true}),async f=>{
      await commit(s=>{
        const r=get(s,'reviews',id); need(r&&!r.resolved,'This item has already been classified.');
        const kind=valOf(f,'kind');
        if(kind==='Keep in legacy history'){r.resolved=kind;return;}
        need(['Part','Complete Product'].includes(kind),'Choose a classification.');
        const type=kind==='Part'?'parts':'products', u=oldUnit(p.unit);
        const row={...p,id:key(),code:valOf(f,'code'),unit:UNITS.includes(u)?u:'PCS',source:type==='parts'?'Manufactured':'',legacy:true,
          active:p.active!==false&&UNITS.includes(u)};
        codeCheck(s,type,row);s[type].push(row);
        if(kind==='Part'&&lines.length&&lines.every(l=>get(s,'materials',l.materialId))){
          s.recipes.push({id:row.id,kind:'part',approved:false,lines:lines.map(l=>({
            sku:l.materialId,formula:String(l.formula||l.ratio||''),unit:get(s,'materials',l.materialId).unit,wastage:l.wastage??0,notes:l.notes||''
          }))});
        }
        r.resolved='Classified as '+kind+'. Review the BOM and physical stock.';
      });
    });
}
function reviewsSection(){
  return panel('Legacy migration review',table(['Original record','Review','Status','Actions'],state.reviews.map(r=>{
    const type=r.type==='Legacy product classification'?'products':'materials', old=legacy[type].find(x=>x.id===r.legacyId);
    const a=!r.resolved&&(type==='products'?small('Classify',`classifyLegacy(${escapeArg(r.id)})`):
      r.type==='Opening stock / unit'?small('Verify Opening',`reviewOpening(${escapeArg(r.id)})`):'');
    return [esc(label(old)),esc(r.type),r.resolved?esc(r.resolved):chip('Review required'),
      actionGroup(small('View original',`legacyView(${escapeArg(type)},${escapeArg(r.legacyId)})`),a||'')];
  }),'No legacy migration records.'));
}
function custodyArchive(id){
  const old=get(state,'locations',id), restore=old.active===false;
  approval((restore?'Restore ':'Archive ')+old.name,restore?'Return this location to custody selections.':'Remove this location from new custody selections.',s=>{
    const l=get(s,'locations',id);need(l&&!l.ownerId,'Edit company locations from their company record.');
    need(restore||!locationUsed(s,id),'Resolve balance and open operations at this location first.');
    l.active=restore;
  });
}
function deleteLocation(id){
  const old=get(state,'locations',id);
  if(!old)return toast('This location no longer exists.','warn');
  approval('Delete '+old.name,'Permanently remove this location. Locations used by stock or operations cannot be deleted.',s=>{
    need(sameCloudRecord(get(s,'locations',id),old),'This location changed. Reopen it before deleting.');
    need(!recordIsUsed(s,'locations',id),'This location is used elsewhere. Remove its links first, or archive it.');
    s.locations=s.locations.filter(row=>row.id!==id);
  },'Delete');
}
function locationView(id){
  const location=get(state,'locations',id),owner=location.ownerId&&get(state,location.ownerType,location.ownerId);
  const balances=stockRows(state).filter(row=>row.location===id);
  const movements=state.events.filter(e=>e.siteId===id||e.destination===id||
    e.jobId&&get(state,'jobs',e.jobId)?.destination===id||
    e.purchaseId&&get(state,'purchases',e.purchaseId)?.supplierSiteId===id||
    e.lines.some(line=>line.location===id));
  const operations=[
    ...state.plans.filter(row=>row.location===id||row.customerSiteId===id).map(row=>['Production plan',row.no,row.status,`planView(${escapeArg(row.id)})`]),
    ...state.orders.filter(row=>row.location===id||row.customerSiteId===id||row.processorSiteId===id).map(row=>['Production order',row.no,row.status,`orderView(${escapeArg(row.id)})`]),
    ...state.purchases.filter(row=>row.location===id||row.supplierSiteId===id).map(row=>['Purchase',row.no,row.status,`purchaseView(${escapeArg(row.id)})`]),
    ...state.jobs.filter(row=>row.location===id||row.destination===id).map(row=>['Dispatch',row.no,row.status,`dispatchView(${escapeArg(row.id)})`])
  ];
  infoModal(location.name,kv([['Company',owner?.name||SET.company],['City',location.city],['Address',location.address],
    ['Stock custody',location.stock?'Yes':'No'],['Status',location.active===false?'Archived':'Active']])+
    panel('Current stock',textTable(['Item / SKU','Balance'],balances.map(row=>[
      labelOf(state,row.sku),qfmt(row.qty,item(state,row.sku)?.unit)
    ]),'No current stock balance.'))+
    (operations.length?panel('Linked operations',table(['Type','Reference','Status','Action'],operations.map(([type,no,status,action])=>[
      esc(type),esc(no),chip(status),small('View',`closeModal();${action}`)
    ]))):'')+
    (movements.length?panel('Recent stock movements',eventsTable(movements.slice(-15))):''),
    actionGroup(owner?button('Edit company',`masterEdit(${escapeArg(location.ownerType)},${escapeArg(location.ownerId)})`,'btn-sm btn-primary'):
        button('Edit',`locationEdit(${escapeArg(id)})`,'btn-sm btn-primary'),
      owner?small('View company',`closeModal();masterView(${escapeArg(location.ownerType)},${escapeArg(owner.id)})`):'',
      owner?'':small(location.active===false?'Restore':'Archive',`custodyArchive(${escapeArg(id)})`),
      dangerSmall('Delete',`deleteLocation(${escapeArg(id)})`))+mapAction(location));
}
function settingsPage(){
  return head('System','Settings & Data',button('Add Custody Location','locationEdit()','btn-primary','plus'))+
    `<div class="settings-grid">
      <section class="card settings-card"><div class="card-head"><div class="card-title">Company profile</div>${chip('Active')}</div>
        <div class="card-body"><div class="settings-profile"><div class="settings-mark">${esc((SET.company||'AM').slice(0,2).toUpperCase())}</div>
          <div>${cell(SET.company,[SET.currentUser,SET.address].filter(Boolean).join(' · '))}</div></div>
          <div class="settings-meta">${SET.email?`<span>${esc(SET.email)}</span>`:''}${SET.phone?`<span>${esc(SET.phone)}</span>`:''}</div>
          ${button('Edit company profile','profileEdit()','','edit')}</div></section>
      <section class="card settings-card"><div class="card-head"><div class="card-title">Back up and restore</div></div>
        <div class="card-body"><p>Export a JSON copy before moving to another computer or browser profile.</p>
          ${actionGroup(button('Export Backup (JSON)','exportBackup()','btn-primary','download'),
            button('Import Backup',"document.getElementById('backup-file').click()",'','refresh'))}
          <input type="file" id="backup-file" accept=".json,application/json" hidden onchange="previewBackup(this)"></div></section>
    </div>`+
    panel('Locations',table(['Location','Company','Address','City','Status'],state.locations.map(l=>[
      esc(l.name)+openBtn(`locationView(${escapeArg(l.id)})`),esc(l.ownerId?get(state,l.ownerType,l.ownerId)?.name:'AMBS'),
      `<div class="addr-cell"><span>${esc(l.address||'—')}</span>${mapBtn(mapsLink(l))}</div>`,esc(l.city),chip(l.active===false?'Archived':'Active')
    ])))+reviewsSection();
}
function profileEdit(){
  formModal('Company Profile',`<div class="form-grid">${input('Company','company',SET.company,{required:true})}
    ${input('Operator name','currentUser',SET.currentUser,{required:true})}
    ${input('Address','address',SET.address)}${input('Phone','phone',SET.phone)}${input('Email','email',SET.email,{type:'email'})}
    ${input('Tax registration','trn',SET.trn)}${imageField(SET.logo)}</div>`,async f=>{
      const logo=await imageValue(f,SET.logo), settings={logo};
      for(const n of ['company','currentUser','address','phone','email','trn'])settings[n]=valOf(f,n);
      need(settings.company&&settings.currentUser,'Company and operator name are required.');
      await commit(s=>{s.settings={...s.settings,...settings};});
    });
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
    parts(j.parts)&&j.parts.length&&integral(j.qty)&&Number.isSafeInteger(j.delivered)&&j.delivered>=0&&j.delivered<=j.qty&&
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
async function exportBackup(){
  try{
    const names=[...LEGACY,'erpV3'];
    const file=await transaction(names,'readonly',(t,done,abort)=>reads(t,names,r=>done({_app:'AMBS_MRP',_version:3,_exported:now(),
      state:r.erpV3[0].data,legacy:Object.fromEntries(LEGACY.map(n=>[n,r[n]]))}),abort));
    download('AMBS_Backup_'+todayISO()+'.json',JSON.stringify(file,null,2));
    toast('Backup exported.','ok');
  }catch(e){toast(e.message,'bad');}
}
function mergeRows(current,incoming,name){
  const rows=new Map(current.map(r=>[r.id,r]));
  for(const r of incoming){
    const before=rows.get(r.id);
    need(!before||sameCloudRecord(before,r),'Conflicting record in '+name+' ('+r.id+'). Review the conflicting record before importing.');
    if(!before)rows.set(r.id,r);
  }
  return [...rows.values()];
}
async function previewBackup(input){
  const file=input.files[0];input.value='';if(!file)return;
  try{
    need(file.size<=100*1024*1024,'Backup exceeds 100 MB.');
    const parsed=nativeBackup(JSON.parse(await file.text()));
    const {data,rows}=parsed;
    const list=[...(data?LIVE.map(k=>['Current · '+k,data[k].length]):[]),...LEGACY.map(k=>['Legacy · '+k,rows[k].length])].filter(x=>x[1]>0);
    formModal('Preview Backup Import',note('Existing records are retained. A conflicting record stops the entire import.')+
      textTable(['Collection','Records in backup'],list),async()=>{
        const names=[...LEGACY,'erpV3'];
        const saved=await transaction(names,'readwrite',(t,done,abort)=>reads(t,names,stored=>{
          const next=stored.erpV3[0].data;
          const empty=LIVE.every(n=>n==='parts'?next.parts.every(isDefaultWorkbookPart):!next[n].length);
          const old=Object.fromEntries(LEGACY.map(n=>[n,mergeRows(stored[n],rows[n],n)]));
          if(data){
            prepareWorkbookPartBackupMerge(next,data);
            for(const n of LIVE)next[n]=mergeRows(next[n],data[n],n);
            if(empty){
              next.settings={...DEFAULTS,...data.settings};
              next.deletedWorkbookParts=[...(data.deletedWorkbookParts||[])];
              next.parts=next.parts.filter(part=>!next.deletedWorkbookParts.includes(part.id));
            }
          }else{
            const novel=Object.fromEntries(LEGACY.map(n=>[n,rows[n].filter(r=>!stored[n].some(x=>x.id===r.id))]));
            migrated(next,{...novel,bom:old.bom,movements:old.movements});
            if(empty)next.settings={...DEFAULTS,...old.meta.find(x=>x.id==='settings')?.data};
          }
          addWorkbookParts(next);
          validateState(next);
          for(const n of LEGACY)for(const r of rows[n])if(!stored[n].some(x=>x.id===r.id))t.objectStore(n).put(r);
          t.objectStore('erpV3').put({id:'state',data:next});
          done({next,old});
        },abort));
        legacy=saved.old;DB.weighDocs=legacy.weighDocs;reflect(saved.next);
        return 'Backup imported.';
      },{text:'Confirm Import'});
  }catch(e){toast(e.message,'bad');}
}

/* Original app shell and manufacturing tools */
function toolsPage(){
  return head('System','Tools')+`<div class="grid cols-2">${[
    ['steel','calc','Calculate the weight of standard and custom steel profiles.'],
    ['market','grid','Browse standard steel sections and sizes.'],
    ['prodcalc','layers','Save take-offs, costing and cutting lists.'],
    ['nesting','bom','Optimize bar cuts against stock lengths.']
  ].map(([r,icon,desc])=>panel(TITLES[r],`<div class="card-body"><p style="margin-top:0">${esc(desc)}</p>
    ${button('Open '+TITLES[r],`App.go(${escapeArg(r)})`,'btn-sm',icon)}</div>`)).join('')}</div>`;
}
/* ---------------- Excel (.xlsx) export: a small, dependency-free writer ---------------- */
const XLSX={
  _crc:null,
  crc(bytes){
    const t=this._crc||(this._crc=Array.from({length:256},(_,n)=>{let c=n;for(let k=0;k<8;k++)c=c&1?0xEDB88320^(c>>>1):c>>>1;return c>>>0;}));
    let c=0xFFFFFFFF;for(const b of bytes)c=t[(c^b)&255]^(c>>>8);return (c^0xFFFFFFFF)>>>0;
  },
  zip(files){
    const enc=new TextEncoder(), parts=[], central=[];let offset=0;
    for(const f of files){
      const name=enc.encode(f.name), data=enc.encode(f.data), crc=this.crc(data);
      const local=new DataView(new ArrayBuffer(30));
      local.setUint32(0,0x04034b50,true);local.setUint16(4,20,true);local.setUint16(6,0x0800,true);local.setUint16(12,0x21,true);
      local.setUint32(14,crc,true);local.setUint32(18,data.length,true);local.setUint32(22,data.length,true);local.setUint16(26,name.length,true);
      parts.push(new Uint8Array(local.buffer),name,data);
      const c=new DataView(new ArrayBuffer(46));
      c.setUint32(0,0x02014b50,true);c.setUint16(4,20,true);c.setUint16(6,20,true);c.setUint16(8,0x0800,true);c.setUint16(14,0x21,true);
      c.setUint32(16,crc,true);c.setUint32(20,data.length,true);c.setUint32(24,data.length,true);c.setUint16(28,name.length,true);c.setUint32(42,offset,true);
      central.push(new Uint8Array(c.buffer),name);
      offset+=30+name.length+data.length;
    }
    const size=central.reduce((n,p)=>n+p.length,0), end=new DataView(new ArrayBuffer(22));
    end.setUint32(0,0x06054b50,true);end.setUint16(8,files.length,true);end.setUint16(10,files.length,true);end.setUint32(12,size,true);end.setUint32(16,offset,true);
    return new Blob([...parts,...central,new Uint8Array(end.buffer)],{type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'});
  },
  col(i){let s='';i++;while(i){const m=(i-1)%26;s=String.fromCharCode(65+m)+s;i=Math.floor((i-1)/26);}return s;},
  x(v){return String(v??'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c])).replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g,'');},
  sheet(columns,rows){
    const all=[columns,...rows], last=this.col(columns.length-1)+all.length;
    const widths=columns.map((_,i)=>Math.min(48,Math.max(9,...all.map(r=>String(r[i]??'').length))+2));
    const cell=(v,r,c)=>{const ref=this.col(c)+(r+1), s=r?'':' s="1"';
      return typeof v==='number'&&Number.isFinite(v)?`<c r="${ref}"${s}><v>${v}</v></c>`:
        `<c r="${ref}" t="inlineStr"${s}><is><t xml:space="preserve">${this.x(v)}</t></is></c>`;};
    return '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">'+
      '<sheetViews><sheetView workbookViewId="0"><pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews>'+
      `<cols>${widths.map((w,i)=>`<col min="${i+1}" max="${i+1}" width="${w}" customWidth="1"/>`).join('')}</cols>`+
      `<sheetData>${all.map((r,ri)=>`<row r="${ri+1}">${r.map((v,ci)=>cell(v,ri,ci)).join('')}</row>`).join('')}</sheetData>`+
      `<autoFilter ref="A1:${last}"/></worksheet>`;
  },
  save(filename,sheets){
    const names=sheets.map((s,i)=>(String(s.name).replace(/[\[\]:*?\/\\]/g,' ').slice(0,31).trim()||'Sheet'+(i+1)));
    const ns='http://schemas.openxmlformats.org/', head='<?xml version="1.0" encoding="UTF-8" standalone="yes"?>';
    const files=[
      {name:'[Content_Types].xml',data:head+`<Types xmlns="${ns}package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>${sheets.map((_,i)=>`<Override PartName="/xl/worksheets/sheet${i+1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`).join('')}</Types>`},
      {name:'_rels/.rels',data:head+`<Relationships xmlns="${ns}package/2006/relationships"><Relationship Id="rId1" Type="${ns}officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>`},
      {name:'xl/workbook.xml',data:head+`<workbook xmlns="${ns}spreadsheetml/2006/main" xmlns:r="${ns}officeDocument/2006/relationships"><sheets>${names.map((n,i)=>`<sheet name="${this.x(n)}" sheetId="${i+1}" r:id="rId${i+1}"/>`).join('')}</sheets><definedNames>${sheets.map((s,i)=>`<definedName name="_xlnm._FilterDatabase" localSheetId="${i}" hidden="1">'${this.x(names[i].replace(/'/g,"''"))}'!$A$1:$${this.col(s.columns.length-1)}$${s.rows.length+1}</definedName>`).join('')}</definedNames></workbook>`},
      {name:'xl/_rels/workbook.xml.rels',data:head+`<Relationships xmlns="${ns}package/2006/relationships">${sheets.map((_,i)=>`<Relationship Id="rId${i+1}" Type="${ns}officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${i+1}.xml"/>`).join('')}<Relationship Id="rId${sheets.length+1}" Type="${ns}officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>`},
      {name:'xl/styles.xml',data:head+`<styleSheet xmlns="${ns}spreadsheetml/2006/main"><fonts count="2"><font><sz val="11"/><name val="Calibri"/></font><font><b/><sz val="11"/><color rgb="FFFFFFFF"/><name val="Calibri"/></font></fonts><fills count="3"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill><fill><patternFill patternType="solid"><fgColor rgb="FFC00605"/><bgColor indexed="64"/></patternFill></fill></fills><borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders><cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs><cellXfs count="2"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/><xf numFmtId="0" fontId="1" fillId="2" borderId="0" xfId="0" applyFont="1" applyFill="1"/></cellXfs><cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles></styleSheet>`},
      ...sheets.map((s,i)=>({name:`xl/worksheets/sheet${i+1}.xml`,data:this.sheet(s.columns,s.rows)}))
    ];
    download(filename.replace(/[^a-z0-9_.-]+/gi,'_')+'.xlsx',this.zip(files),'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  }
};

/* ---------------- Drivers & deliveries ----------------
   A delivery trip can only go out with a driver whose official papers are on file and not expired. */
const DRIVER_KINDS=['AMBS driver','Outside driver','Client pickup'];
const TRIP_STATUS=['Next','On the way','Delivered','Cancelled'];
const TRIP_SYSTEMS=['Safety Net','Edge Protection','Vertical Net','Fabrication','Hand Rail','Hoist Gate','Shaft Gate'];
const PAPER_STATUS=['Pending','Signed & returned','Missing'];
const DRIVER_PAPERS=[['licenseExpiry','Driving licence','licenseNo'],['vehicleExpiry','Vehicle registration (Mulkiya)','']];
const monthKey=d=>String(d||'').slice(0,7);
const thisMonth=()=>todayISO().slice(0,7);
function papersIssues(d,day=todayISO()){
  const issues=[];
  if(!d)return ['Driver not found'];
  if(!d.hasPapers)issues.push('Official papers not on file');
  for(const [field,name] of DRIVER_PAPERS)if(d[field]&&d[field]<day)issues.push(name+' expired '+fmtDate(d[field]));
  return issues;
}
const papersOk=d=>!papersIssues(d).length;
function papersSoon(d){
  const soon=new Date(Date.now()+30*864e5).toISOString().slice(0,10), day=todayISO();
  return DRIVER_PAPERS.filter(([field])=>d[field]&&d[field]>=day&&d[field]<=soon).map(([field,name])=>name+' expires '+fmtDate(d[field]));
}
function papersChip(d){
  const issues=papersIssues(d);
  if(issues.length)return `<span data-tip="${esc(issues.join(' · '))}">${statusChip('bad','Papers missing')}</span>`;
  const soon=papersSoon(d);
  return soon.length?`<span data-tip="${esc(soon.join(' · '))}">${statusChip('warn','Expiring soon')}</span>`:statusChip('ok','Papers OK');
}
const driverTrips=id=>state.trips.filter(t=>t.driverId===id);
const tripKm=trips=>trips.filter(t=>t.status!=='Cancelled').reduce((n,t)=>n+(Number(t.km)||0),0);
function driverWhere(d){
  const moving=driverTrips(d.id).find(t=>t.status==='On the way');
  return moving?{text:'On the way → '+(moving.location||moving.customerName||'customer'),kind:'info',trip:moving}:{text:'At base / available',kind:'neutral'};
}
function nextTripNo(s,date){
  const ym=(date||todayISO()).slice(0,7), prefix='PL'+ym.replace('-','-')+'-';
  const used=new Set(s.trips.map(t=>t.no));
  let n=s.trips.filter(t=>String(t.no).startsWith(prefix)).length+1, no;
  do{no=prefix+String(n++).padStart(3,'0');}while(used.has(no));
  return no;
}
function driverEdit(id){
  const old=get(state,'drivers',id), d=old||{};
  const form=formModal((old?'Edit':'Add')+' driver',`<div class="form-grid">
    ${input('Driver name','name',d.name,{extra:'placeholder="e.g. Shabir Ahmad"'})}
    ${phoneField('Phone number','phone',d.phone)}
    ${select('Driver type','kind',same(DRIVER_KINDS),d.kind||DRIVER_KINDS[0],false)}
    ${suggestedInput('Vehicle type','vehicleType',d.vehicleType||'',['Pickup','3-ton truck','7-ton truck','Flatbed trailer','Van','Crane truck'])}
    ${imageField(d.image,'Driver photo')}
    </div><h4 class="erp-sub-head">${ic('idcard')} Official papers <small class="sub">— no deliveries until they are on file and not expired</small></h4>
    <div class="form-grid">
    ${input('Driving licence number','licenseNo',d.licenseNo,{extra:'placeholder="e.g. 1234567"'})}
    ${input('Driving licence expiry','licenseExpiry',d.licenseExpiry,{type:'date'})}
    ${input('Vehicle registration (Mulkiya) expiry','vehicleExpiry',d.vehicleExpiry,{type:'date'})}
    <div class="field papers-confirm"><label><input name="hasPapers" type="checkbox" ${d.hasPapers?'checked':''}>
      <span><b>Official papers checked and on file</b><small>Licence and Mulkiya seen; copies kept.</small></span></label></div>
    ${input('Notes','notes',d.notes,{full:true,extra:'placeholder="Optional"'})}</div>`,async f=>{
    const data={...old,id:id||key(),name:valOf(f,'name'),phone:readPhone(f,'phone'),kind:valOf(f,'kind')||DRIVER_KINDS[0],
      vehicleType:valOf(f,'vehicleType'),vehicleExpiry:valOf(f,'vehicleExpiry'),
      licenseNo:valOf(f,'licenseNo'),licenseExpiry:valOf(f,'licenseExpiry'),
      hasPapers:checked(f,'hasPapers'),notes:valOf(f,'notes'),active:old?.active!==false};
    need(data.name,'Enter the driver’s name.');
    data.image=await imageValue(f,old?.image);
    await commit(s=>{
      need(!old||sameCloudRecord(get(s,'drivers',data.id),old),'This driver changed. Reopen it before saving.');
      need(!s.drivers.some(x=>x.id!==data.id&&x.name.trim().toLowerCase()===data.name.toLowerCase()),'A driver with this name already exists.');
      add(s.drivers,{...data,at:now()});
    });
    const issues=papersIssues(data);
    return issues.length?'Saved — this driver cannot deliver yet: '+issues[0]+'.':'Driver saved.';
  },{text:old?'Save changes':'Save driver'});
  return form;
}
function deleteDriver(id){
  const d=get(state,'drivers',id);
  if(!d)return;
  approval('Delete '+d.name,'Permanently remove this driver. Drivers with recorded trips cannot be deleted.',s=>{
    need(!s.trips.some(t=>t.driverId===id),'This driver has trips on record and cannot be deleted.');
    s.drivers=s.drivers.filter(x=>x.id!==id);
  },'Delete');
}
function tripEdit(id,preset={}){
  const linked=get(state,'trips',id);
  if(linked&&(linked.jobId||linked.salesId))return assignDelivery(linked.jobId?'job':'sale',linked.jobId||linked.salesId,id);
  if(!id&&preset.jobId)return assignDelivery('job',preset.jobId);
  const old=get(state,'trips',id), t=old||{date:todayISO(),from:'AMBS store',priority:'Normal',status:'Next',paperStatus:'Pending',...preset};
  if(!state.drivers.length){
    return infoModal('New delivery trip',note('Add a driver first. Every delivery needs a driver with official papers.','warn'),
      button('Add driver','closeModal();driverEdit()','btn-primary','plus'));
  }
  const drivers=state.drivers.filter(d=>d.active!==false||d.id===t.driverId);
  const jobs=state.jobs.filter(j=>['Open','Partially delivered'].includes(j.status)||j.id===t.jobId);
  const form=formModal(old?'Edit trip '+old.no:'New delivery trip',`<div class="trip-papers" data-papers></div><div class="form-grid">
    ${select('Driver','driverId',drivers.map(d=>[d.id,d.name+(d.vehicleType?' · '+d.vehicleType:'')+(papersOk(d)?'':'  ⚠ papers missing')]),t.driverId||'',false,'Choose a driver…')}
    ${input('Vehicle','vehicle',t.vehicle,{extra:'placeholder="Filled from the driver, e.g. Dubai F 45231"'})}
    ${searchable('Customer','customer',pair(current(state,'customers').concat(t.customerId&&!current(state,'customers').some(c=>c.id===t.customerId)?[get(state,'customers',t.customerId)].filter(Boolean):[]),c=>c.name+(c.code?' · '+c.code:'')),t.customerId||'')}
    ${input('Project','project',t.project,{extra:'placeholder="e.g. Skyflame 2"'})}
    ${input('From','from',t.from,{extra:'placeholder="e.g. AMBS store, DIP"'})}
    ${input('Delivery location','location',t.location,{extra:'placeholder="e.g. Dubai Hills, Building 3, Gate 2"'})}
    ${mapField('Delivery location (Google Maps link)',t.mapUrl,'Filled from the customer, or paste https://maps.app.goo.gl/…')}
    ${input('Distance (km)','km',t.km??'',{type:'number',extra:'min="0" step="0.1" placeholder="e.g. 38"'})}
    ${input('Packing no.','no',t.no||nextTripNo(state,t.date),{extra:'placeholder="e.g. PL2026-11-001"'})}
    ${input('Trip date','date',t.date,{type:'date'})}
    ${select('Priority','priority',same(['Normal','Urgent']),t.priority||'Normal',false)}
    ${suggestedInput('System','system',t.system||'',TRIP_SYSTEMS)}
    ${input('Short description','description',t.description,{extra:'placeholder="e.g. Full safety net system, 13 sets"'})}
    ${select('Status','status',same(TRIP_STATUS),t.status||'Next',false)}
    ${input('Delivery date','deliveredAt',t.deliveredAt,{type:'date'})}
    ${select('Delivery paper status','paperStatus',same(PAPER_STATUS),t.paperStatus||'Pending',false)}
    ${jobs.length?select('Dispatch job (optional)','jobId',jobs.map(j=>[j.id,j.no+' · '+(get(state,'customers',j.customerId)?.name||'')]),t.jobId||'',false,'Not linked'):''}
    ${area('Notes','notes',t.notes)}</div>`,async f=>{
    const customerId=valOf(f,'customer'), driverId=valOf(f,'driverId'), status=valOf(f,'status')||'Next';
    const kmRaw=valOf(f,'km'), km=kmRaw===''?0:qty(kmRaw,'Distance',true);
    const data={...old,id:id||key(),no:valOf(f,'no'),date:valOf(f,'date')||todayISO(),driverId,vehicle:valOf(f,'vehicle'),
      customerId,customerName:customerId?get(state,'customers',customerId)?.name||'':valOf(f,'customerSearch'),
      project:valOf(f,'project'),from:valOf(f,'from'),location:valOf(f,'location'),mapUrl:readMapUrl(f,'mapUrl'),km,priority:valOf(f,'priority')||'Normal',
      system:valOf(f,'system'),description:valOf(f,'description'),status,deliveredAt:valOf(f,'deliveredAt'),
      paperStatus:valOf(f,'paperStatus')||'Pending',jobId:valOf(f,'jobId'),notes:valOf(f,'notes'),by:old?.by||whoami()};
    need(driverId,'Choose the driver for this trip.');
    if(status==='Delivered'&&!data.deliveredAt)data.deliveredAt=todayISO();
    await commit(s=>{
      need(!old||sameCloudRecord(get(s,'trips',data.id),old),'This trip changed. Reopen it before saving.');
      const driver=get(s,'drivers',driverId);
      checkTripDriver(driver,status,old?.status);
      if(!data.no)data.no=nextTripNo(s,data.date);
      need(!s.trips.some(x=>x.id!==data.id&&x.no===data.no),'This packing number is already used by another trip.');
      if(data.customerId)need(get(s,'customers',data.customerId),'Choose a customer from the list.');
      if(data.jobId)need(get(s,'jobs',data.jobId),'Choose a valid dispatch job.');
      add(s.trips,{...data,at:old?.at||now(),updated:now()});
    });
    return old?'Trip saved.':'Trip '+data.no+' created.';
  },{text:old?'Save trip':'Create trip'});
  const showPapers=()=>{
    const d=get(state,'drivers',form.elements.driverId.value), box=$('[data-papers]',form);
    if(!d){box.innerHTML='';return;}
    const issues=papersIssues(d);
    box.innerHTML=issues.length?note('⛔ '+d.name+' cannot deliver: '+issues.join(' · ')+'. Nothing will be delivered with this driver until the papers are complete.','bad'):
      note('✓ '+d.name+' has official papers on file'+(papersSoon(d).length?' — '+papersSoon(d).join(', '):'')+'.','ok');
    const vehicle=form.elements.vehicle;
    if(!vehicle.value||vehicle.dataset.auto)vehicle.value=d.vehicleType||'',vehicle.dataset.auto='1';
  };
  form.elements.driverId.addEventListener('change',showPapers);showPapers();
  form.elements.vehicle.addEventListener('input',e=>delete e.target.dataset.auto);
  form.elements.customer.addEventListener('change',e=>{
    const c=get(state,'customers',e.target.value), place=form.elements.location;
    if(c&&!place.value)place.value=c.address||deliverySite(state,'customers',c.id)?.address||'';
    if(c&&!form.elements.mapUrl.value)form.elements.mapUrl.value=companyMap('customers',c);
  });
  form.elements.date.addEventListener('change',()=>{if(!old)form.elements.no.value=nextTripNo(state,form.elements.date.value);});
  if(!old&&preset.jobId)setTimeout(()=>form.elements.jobId?.dispatchEvent(new Event('change')));
  form.elements.jobId?.addEventListener('change',e=>{
    const j=get(state,'jobs',e.target.value);if(!j)return;
    const c=get(state,'customers',j.customerId);
    if(c){form.elements.customer.value=c.id;form.elements.customerSearch.value=c.name+(c.code?' · '+c.code:'');}
    if(!form.elements.location.value)form.elements.location.value=[j.destinationSnapshot?.name,j.destinationSnapshot?.address].filter(Boolean).join(', ');
    if(!form.elements.mapUrl.value)form.elements.mapUrl.value=mapsLink(get(state,'locations',j.destination)||{})||companyMap('customers',c);
    if(!form.elements.description.value)form.elements.description.value=labelOf(state,j.productId)+' × '+j.qty;
  });
}
function checkTripDriver(driver,status,previous){
  need(driver,'Choose a driver for this trip.');
  const leaving=['Next','On the way'].includes(status)||(status==='Delivered'&&previous!=='Delivered');
  if(!leaving)return;
  const issues=papersIssues(driver);
  need(!issues.length,driver.name+' has no valid official papers ('+issues.join(', ')+'). Nothing can be delivered with this driver until the papers are complete.');
}
function tripStatus(id,status){
  const t=get(state,'trips',id);
  if(!t)return;
  if(status==='On the way')return commit(s=>{
    const trip=get(s,'trips',id);
    need(trip&&trip.status==='Next','This trip already changed.');
    checkTripDriver(get(s,'drivers',trip.driverId),status,trip.status);
    trip.status=status;trip.updated=now();trip.departedAt=now();
  }).then(()=>{App.render();toast('Trip '+t.no+' started — the driver is on the way.','ok');}).catch(e=>toast(e.message,'bad'));
  const posts=status==='Delivered'&&(t.jobId||t.salesId);
  approval((status==='On the way'?'Start trip ':'Mark delivered · ')+t.no,
    status==='On the way'?'The driver is leaving now with this delivery.':
      'The delivery reached the customer.'+(posts?' The goods are taken out of '+(t.from||'the store')+' stock now.':'')+' The delivery date is set to today if empty.',s=>{
      const trip=get(s,'trips',id);
      checkTripDriver(get(s,'drivers',trip.driverId),status,trip.status);
      if(status==='Delivered'&&trip.jobId){const j=get(s,'jobs',trip.jobId);if(j)postJobDelivery(s,j,trip.no);}
      if(status==='Delivered'&&trip.salesId){const o=get(s,'sales',trip.salesId);if(o)postSalesDelivery(s,o,trip.fromLocation,trip.no);}
      trip.status=status;trip.updated=now();
      if(status==='On the way')trip.departedAt=now();
      if(status==='Delivered'&&!trip.deliveredAt)trip.deliveredAt=todayISO();
    },status==='On the way'?'Start trip':'Mark delivered');
}
function deleteTrip(id){
  const t=get(state,'trips',id);
  if(!t)return;
  approval('Delete trip '+t.no,'Permanently remove this delivery trip from the record.',s=>{s.trips=s.trips.filter(x=>x.id!==id);},'Delete');
}
function tripView(id){
  const t=get(state,'trips',id), d=get(state,'drivers',t.driverId);
  const args=escapeArg(id);
  infoModal('Trip '+t.no,formHeader([
      t.status==='Next'?button('Start trip',`tripStatus(${args},'On the way')`,'btn-sm btn-primary'):'',
      t.status==='On the way'?button('Delivered',`tripStatus(${args},'Delivered')`,'btn-sm btn-primary'):'',
      ['Next','On the way'].includes(t.status)?small('Edit',`tripEdit(${args})`):'',
      t.salesId||t.jobId?button('Print packing list',`packingListPDF('trip',${args})`,'btn-sm','pdf'):'',
      t.salesId?small('Sales order',`salesView(${escapeArg(t.salesId)})`):'',t.jobId?small('Dispatch job',`dispatchView(${escapeArg(t.jobId)})`):''],
      ['Next','On the way','Delivered'],t.status)+`<div class="co-details">${[
    ['Status',chip(t.status==='Next'?'Open':t.status==='On the way'?'In progress':t.status)+' '+(t.priority==='Urgent'?statusChip('bad','Urgent'):'')],
    ['Driver',d?`${esc(d.name)} ${papersChip(d)}`:'—'],['Driver phone',esc(d?.phone||'—')],['Vehicle',esc(t.vehicle||'—')],
    ['Customer',esc(t.customerName||get(state,'customers',t.customerId)?.name||'—')],['Project',esc(t.project||'—')],
    ['Route',esc((t.from||'—')+' → '+(t.location||'—'))],['Delivery location on map',mapBtn(t.mapUrl,'Open in Google Maps')||'—'],['Distance',esc(t.km?nfmt(t.km,1)+' km':'—')],
    ['Trip date',esc(fmtDate(t.date))],['Delivery date',esc(t.deliveredAt?fmtDate(t.deliveredAt):'—')],
    ['System',esc(t.system||'—')],['Short description',esc(t.description||'—')],['Delivery papers',esc(t.paperStatus||'—')],
    ['Dispatch job',esc(get(state,'jobs',t.jobId)?.no||'—')],['Recorded by',esc(t.by||'—')]
  ].map(([k,v])=>`<div><span>${esc(k)}</span><div>${v}</div></div>`).join('')}</div>`+(t.notes?note(t.notes):''),
  actionGroup(d?small('Driver',`closeModal();driverView(${escapeArg(d.id)})`):'',
    dangerSmall('Delete trip',`closeModal();deleteTrip(${escapeArg(id)})`)));
}
const TRIP_EXPORT_COLUMNS=['Customer','Project','Packing No.','Date','Status','Priority','System','Short description','Driver name','Driver phone',
  'Vehicle','From','Delivery location','Google Maps link','Distance (km)','Delivery date','Paper status','Driver papers'];
function tripExportRows(trips){
  return trips.map(t=>{const d=get(state,'drivers',t.driverId);return [t.customerName||get(state,'customers',t.customerId)?.name||'',t.project||'',t.no,
    t.date||'',t.status,t.priority||'',t.system||'',t.description||'',d?.name||'',d?.phone||'',t.vehicle||'',t.from||'',t.location||'',t.mapUrl||'',
    Number(t.km)||0,t.deliveredAt||'',t.paperStatus||'',d?(papersIssues(d).join('; ')||'OK'):''];});
}
const DRIVER_EXPORT_COLUMNS=['Driver','Type','Phone','Vehicle type','Licence no.','Licence expiry',
  'Vehicle reg. expiry','Papers on file','Papers status','Trips','Delivered','Total km','Current status'];
function driverExportRows(drivers){
  return drivers.map(d=>{const trips=driverTrips(d.id);return [d.name,d.kind||'',d.phone||'',d.vehicleType||'',d.licenseNo||'',
    d.licenseExpiry||'',d.vehicleExpiry||'',d.hasPapers?'Yes':'No',papersIssues(d).join('; ')||'OK',
    trips.length,trips.filter(t=>t.status==='Delivered').length,Number(tripKm(trips).toFixed(1)),driverWhere(d).text];});
}
function exportDeliveries(kind,driverId=''){
  const trips=driverId?driverTrips(driverId).sort((a,b)=>(b.date||'').localeCompare(a.date||'')):Drv.filtered();
  const drivers=driverId?[get(state,'drivers',driverId)]:state.drivers;
  const name=driverId?'Driver_'+drivers[0].name:'Deliveries_'+todayISO();
  if(kind==='xlsx')return XLSX.save('AMBS_'+name,[{name:'Deliveries',columns:TRIP_EXPORT_COLUMNS,rows:tripExportRows(trips)},
    {name:'Drivers',columns:DRIVER_EXPORT_COLUMNS,rows:driverExportRows(drivers)}]);
  const cols=['Packing No.','Date','Customer','Project','System','Status','Driver','Vehicle','Delivery location','Km','Delivered','Papers'];
  pdf((driverId?'Driver trips · '+drivers[0].name+' · '+(papersOk(drivers[0])?'Papers OK':'PAPERS MISSING'):'Delivery tracking')+' · '+fmtDate(todayISO()),cols,
    trips.map(t=>[t.no,fmtDate(t.date),t.customerName||'',t.project||'',t.system||'',t.status+(t.priority==='Urgent'?' · URGENT':''),
      get(state,'drivers',t.driverId)?.name||'',t.vehicle||'',t.location||'',t.km?nfmt(t.km,1):'',t.deliveredAt?fmtDate(t.deliveredAt):'',t.paperStatus||'']),
    {landscape:true});
}
function driverView(id){
  const d=get(state,'drivers',id), trips=driverTrips(id).sort((a,b)=>(b.date||'').localeCompare(a.date||''));
  const issues=papersIssues(d), where=driverWhere(d), month=trips.filter(t=>monthKey(t.date)===thisMonth());
  const tiles=[['route','Trips',trips.length,month.length+' this month'],['pulse','Distance',nfmt(tripKm(trips),1)+' km',nfmt(tripKm(month),1)+' km this month'],
    ['ok','Delivered',trips.filter(t=>t.status==='Delivered').length,trips.filter(t=>t.status==='Next').length+' waiting'],
    ['pin','Where now',where.trip?'On the way':'At base',where.trip?(where.trip.location||where.trip.customerName||''):'Available']];
  infoModal(d.name,`<div class="co-hero">${logoUploader('drivers',d,'co-avatar-lg')}<div class="co-hero-main">
      <div class="co-hero-name">${esc(d.name)}</div><div class="co-hero-sub">${esc(d.kind||'Driver')} · ${esc(d.phone||'no phone')} ${papersChip(d)}</div></div></div>`+
    (issues.length?note('⛔ Nothing can be delivered with this driver: '+issues.join(' · ')+'.','bad'):'')+
    `<div class="co-smart-row">${tiles.map(([icon,l,v,sub])=>`<div class="co-smart">${ic(icon)}<span><b>${esc(v)}</b><small>${esc(l)}</small><em>${esc(sub)}</em></span></div>`).join('')}</div>`+
    panel('Official papers',table(['Paper','Number','Expiry','Status'],[
      ['Papers checked & on file','—','—',d.hasPapers?statusChip('ok','Yes'):statusChip('bad','No')],
      ...DRIVER_PAPERS.map(([field,name,num])=>[esc(name),esc(d[num]||'—'),esc(d[field]?fmtDate(d[field]):'—'),
        !d[field]?statusChip('neutral','No date'):d[field]<todayISO()?statusChip('bad','Expired'):papersSoon({[field]:d[field]}).length?statusChip('warn','Expires soon'):statusChip('ok','Valid')])]))+
    panel('Vehicle',kv([['Type',d.vehicleType],['Registration expiry',d.vehicleExpiry?fmtDate(d.vehicleExpiry):'']]))+
    panel('Trips · '+trips.length,table(['Packing no.','Date','Customer / project','Route','Km','Status','Papers'],trips.map(t=>[
      `<button type="button" class="link-btn" onclick="closeModal();tripView(${escapeArg(t.id)})">${esc(t.no)}</button>`,esc(fmtDate(t.date)),
      cell(t.customerName||'—',t.project),esc((t.from||'—')+' → '+(t.location||'—')),esc(t.km?nfmt(t.km,1):'—'),tripChip(t),esc(t.paperStatus||'—')]),
      'No trips yet.'))+(d.notes?note(d.notes):''),
    actionGroup(button('PDF',`exportDeliveries('pdf',${escapeArg(id)})`,'btn-sm','pdf'),button('Excel',`exportDeliveries('xlsx',${escapeArg(id)})`,'btn-sm','xls'),
      button('Edit',`closeModal();driverEdit(${escapeArg(id)})`,'btn-sm btn-primary'),dangerSmall('Delete',`closeModal();deleteDriver(${escapeArg(id)})`),
      issues.length?'':button('New trip',`closeModal();tripEdit('',{driverId:${escapeArg(id)}})`,'btn-sm btn-primary','plus')));
}
const tripChip=t=>(t.priority==='Urgent'&&!['Delivered','Cancelled'].includes(t.status)?statusChip('bad','Urgent')+' ':'')+
  statusChip({Next:'neutral','On the way':'info',Delivered:'ok',Cancelled:'bad'}[t.status]||'neutral',t.status);
const Drv={
  f:{q:'',driver:'',status:'',month:'',priority:''},
  filtered(){
    const f=this.f, q=searchKey(f.q);
    return state.trips.filter(t=>(!f.driver||t.driverId===f.driver)&&(!f.status||t.status===f.status)&&(!f.month||monthKey(t.date)===f.month)&&
      (!f.priority||t.priority===f.priority)&&(!q||searchKey([t.no,t.customerName,t.project,t.system,t.description,t.location,t.vehicle,
        get(state,'drivers',t.driverId)?.name].join(' ')).includes(q)))
      .sort((a,b)=>(b.date||'').localeCompare(a.date||'')||String(b.no).localeCompare(String(a.no)));
  },
  set(name,value){this.f[name]=value;const box=$('#trip-results');if(box)box.innerHTML=this.results();},
  results(){
    const rows=this.filtered();
    return `<div class="pill-legend" style="margin:0 0 8px">${rows.length} trips · ${esc(nfmt(tripKm(rows),1))} km</div>`+
      table(['Packing no.','Customer / project','System','Driver / vehicle','Delivery location','Km','Status','Delivery papers'],rows.map(t=>{
        const d=get(state,'drivers',t.driverId), args=escapeArg(t.id);
        return [cell(t.no,fmtDate(t.date)),cell(t.customerName||'—',t.project),cell(t.system||'—',t.description),
          d?`<button type="button" class="link-btn" onclick="driverView(${escapeArg(d.id)})">${esc(d.name)}</button>${papersOk(d)?'':' '+statusChip('bad','Papers')}<div class="sub">${esc(t.vehicle||'')}</div>`:'—',
          `<div class="addr-cell"><span>${esc(t.location||'—')}</span>${mapBtn(t.mapUrl)}</div>`,`<span class="num">${esc(t.km?nfmt(t.km,1):'—')}</span>`,
          tripChip(t)+(t.deliveredAt?`<div class="sub">${esc(fmtDate(t.deliveredAt))}</div>`:''),
          (t.paperStatus==='Signed & returned'?statusChip('ok','Signed'):t.paperStatus==='Missing'?statusChip('bad','Missing'):statusChip('warn','Pending'))+openBtn(`tripView(${args})`)];
      }),'No trips match. Create a delivery trip to start tracking.');
  }
};
function driversPage(){
  const drivers=state.drivers.slice().sort((a,b)=>a.name.localeCompare(b.name));
  const blocked=drivers.filter(d=>d.active!==false&&!papersOk(d));
  return head('Master Data',TITLES.drivers,button('New','driverEdit()','btn-primary'))+
    (blocked.length?note('⛔ No delivery can go out with: '+blocked.map(d=>d.name+' ('+papersIssues(d)[0]+')').join(' · '),'bad'):'')+
    kanban(drivers.map(d=>{
      const trips=driverTrips(d.id), where=driverWhere(d);
      return {open:`driverView(${escapeArg(d.id)})`,search:[d.name,d.phone,d.kind,d.vehicleType].filter(Boolean).join(' '),
        html:`${companyAvatar(d,'co-avatar-md')}<div class="o-card-main"><div class="o-card-title">${esc(d.name)}</div>
          <div class="o-card-line">${esc(d.vehicleType||d.kind||'')}</div>
          ${d.phone?`<div class="o-card-line">${ic('phone')}${esc(d.phone)}</div>`:''}
          <div class="o-card-tags">${papersChip(d)}<span class="o-tag">${trips.length} trip${trips.length===1?'':'s'} · ${esc(nfmt(tripKm(trips),0))} km</span></div>
          <div class="o-card-line o-muted">${esc(where.text)}</div></div>`};
    }),{placeholder:'Search drivers by name, phone or vehicle…',noun:'drivers',empty:'Add your drivers: name, phone, vehicle and official papers.',
      list:{columns:['Driver','Type','Phone','Vehicle','Official papers','Trips','Distance','Where now'],
        rows:drivers.map(d=>{const trips=driverTrips(d.id);return [`<div class="record-media co-media">${companyAvatar(d)}<div>${cell(d.name)}</div></div>`+openBtn(`driverView(${escapeArg(d.id)})`),
          esc(d.kind||'—'),esc(d.phone||'—'),esc(d.vehicleType||'—'),papersChip(d),esc(trips.length),esc(nfmt(tripKm(trips),1)+' km'),esc(driverWhere(d).text)];})}});
}
/* ---------------- Deliveries (operations): created from confirmed sales orders and dispatch jobs ----------------
   The employee only assigns a driver and the km; customer, site, map and items come from the order.
   "Delivered" on the trip posts the stock out of the store in the same step. */
const activeTrip=(field,id)=>state.trips.find(t=>t[field]===id&&t.status!=='Cancelled');
function deliveryQueue(){
  const jobs=state.jobs.filter(j=>['Open','Partially delivered'].includes(j.status)&&!activeTrip('jobId',j.id)).map(j=>({kind:'job',doc:j}));
  const sales=state.sales.filter(o=>['Confirmed','Partially delivered'].includes(o.status)&&!activeTrip('salesId',o.id)).map(o=>({kind:'sale',doc:o}));
  return [...jobs,...sales];
}
function deliveryInfo(kind,d,s=state){
  const customer=get(s,'customers',d.customerId);
  if(kind==='job'){
    const site=get(s,'locations',d.destination)||d.destinationSnapshot||{};
    return {customerId:d.customerId,customerName:customer?.name||'',project:d.name||'',fromLocation:d.location,
      location:[site.name==='Delivery address'?'':site.name,site.address,site.city].filter(Boolean).join(', '),mapUrl:mapsLink(site)||companyMap('customers',customer),
      description:labelOf(s,d.productId)+' × '+(d.qty-d.delivered),items:(d.finished?[{sku:d.productId,qty:d.qty-d.delivered}]:d.parts.map(p=>({sku:p.sku,qty:p.qty*(d.qty-d.delivered)/d.qty})))};
  }
  const site=get(s,'locations',d.siteId)||deliverySite(s,'customers',d.customerId);
  const open=d.lines.filter(l=>l.qty-l.delivered>EPS);
  return {customerId:d.customerId,customerName:customer?.name||'',project:d.reference||d.no,fromLocation:'',
    location:site?[site.name==='Delivery address'?'':site.name,site.address,site.city].filter(Boolean).join(', '):customer?.address||'',
    mapUrl:(site&&mapsLink(site))||companyMap('customers',customer),
    description:open.map(l=>item(s,l.sku)?.name+' × '+qfmt(l.qty-l.delivered)).join(', '),items:open.map(l=>({sku:l.sku,qty:l.qty-l.delivered}))};
}
function assignDelivery(kind,docId,tripId=''){
  const old=tripId?get(state,'trips',tripId):null, doc=get(state,kind==='job'?'jobs':'sales',docId);
  if(!doc)return toast('This order no longer exists.','warn');
  if(!state.drivers.length)return infoModal('Assign driver',note('Add a driver first (Master Data → Drivers).','warn'),button('New driver','closeModal();driverEdit()','btn-primary'));
  const info=deliveryInfo(kind,doc), sources=custody();
  const drivers=state.drivers.filter(d=>d.active!==false||d.id===old?.driverId);
  const form=formModal((old?'Delivery '+old.no:'Assign driver')+' · '+doc.no,
    `<div class="dlv-summary"><div><span>Customer</span><b>${esc(info.customerName||'—')}</b></div>
      <div><span>Deliver to</span><b>${esc(info.location||'—')}</b> ${mapBtn(info.mapUrl)}</div>
      <div><span>Items</span><b>${esc(info.description||'—')}</b></div>
      ${kind==='job'?`<div><span>From</span><b>${esc(locName(state,doc.location))}</b></div>`:''}</div>
    <div class="trip-papers" data-papers></div><div class="form-grid">
    ${select('Driver','driverId',drivers.map(d=>[d.id,d.name+(d.vehicleType?' · '+d.vehicleType:'')+(papersOk(d)?'':'  ⚠ papers missing')]),old?.driverId||'',false,'Choose a driver…')}
    ${input('Vehicle','vehicle',old?.vehicle||'',{extra:'placeholder="Filled from the driver"'})}
    ${input('Distance (km)','km',old?.km||'',{type:'number',extra:'min="0" step="0.1" placeholder="e.g. 38"'})}
    ${input('Trip date','date',old?.date||todayISO(),{type:'date'})}
    ${kind==='sale'?select('Ship from','fromLocation',locOptions(),old?.fromLocation||bestSource(info.items),false,'Choose the store'):''}
    ${select('Priority','priority',same(['Normal','Urgent']),old?.priority||'Normal',false)}
    ${old?select('Delivery papers','paperStatus',same(PAPER_STATUS),old.paperStatus||'Pending',false):''}
    </div>`,async f=>{
    const driverId=valOf(f,'driverId'), kmRaw=valOf(f,'km');
    need(driverId,'Choose the driver.');
    const fromLocation=kind==='job'?doc.location:valOf(f,'fromLocation');
    need(fromLocation,'Choose the store the goods leave from.');
    await commit(s=>{
      need(!old||sameCloudRecord(get(s,'trips',tripId),old),'This delivery changed. Reopen it before saving.');
      const d=get(s,kind==='job'?'jobs':'sales',docId);need(d,'This order no longer exists.');
      checkTripDriver(get(s,'drivers',driverId),old?.status||'Next',old?.status);
      loc(s,fromLocation);
      const i=deliveryInfo(kind,d,s), date=valOf(f,'date')||todayISO();
      add(s.trips,{...old,id:tripId||key(),no:old?.no||nextTripNo(s,date),date,driverId,vehicle:valOf(f,'vehicle'),km:kmRaw===''?0:qty(kmRaw,'Distance',true),
        priority:valOf(f,'priority')||'Normal',[kind==='job'?'jobId':'salesId']:docId,customerId:i.customerId,customerName:i.customerName,
        project:old?.project||i.project,from:locName(s,fromLocation),fromLocation,location:old?.location||i.location,mapUrl:old?.mapUrl||i.mapUrl,
        system:old?.system||'',description:old?.description||i.description,status:old?.status||'Next',
        paperStatus:valOf(f,'paperStatus')||old?.paperStatus||'Pending',by:old?.by||whoami(),at:old?.at||now(),updated:now()});
    });
    return old?'Delivery saved.':'Driver assigned — the trip is ready to start.';
  },{text:old?'Save':'Assign driver'});
  const showPapers=()=>{
    const d=get(state,'drivers',form.elements.driverId.value), box=$('[data-papers]',form);
    if(!d){box.innerHTML='';return;}
    const issues=papersIssues(d);
    box.innerHTML=issues.length?note('⛔ '+d.name+' cannot deliver: '+issues.join(' · ')+'.','bad'):'';
    const v=form.elements.vehicle;if(!v.value||v.dataset.auto){v.value=d.vehicleType||'';v.dataset.auto='1';}
  };
  form.elements.driverId.addEventListener('change',showPapers);showPapers();
  form.elements.vehicle.addEventListener('input',e=>delete e.target.dataset.auto);
}
/* The store holding the most of the ordered items is the default "ship from". */
function bestSource(items){
  const stores=custody();
  if(!stores.length)return '';
  const score=l=>items.reduce((n,x)=>n+Math.min(x.qty,Math.max(0,availability(state,x.sku,l.id)))/(x.qty||1),0);
  return stores.slice().sort((a,b)=>score(b)-score(a))[0].id;
}
function postJobDelivery(s,job,ref){
  const count=job.qty-job.delivered;
  if(count<=0||!['Open','Partially delivered'].includes(job.status))return;
  need(!s.events.some(e=>e.jobId===job.id&&e.reference.toLowerCase()===ref.toLowerCase()),'This job already has a delivery with reference '+ref+'.');
  if(job.trackAtDestination)loc(s,job.destination);
  const lines=dispatchRows(s,job,count).flatMap(l=>[{sku:l.sku,location:job.location,delta:-l.qty},
    ...(job.trackAtDestination?[{sku:l.sku,location:job.destination,delta:l.qty}]:[])]);
  const eventId=key();
  event(s,eventId,'Customer delivery',lines,job.no+' · '+ref);
  Object.assign(get(s,'events',eventId),{jobId:job.id,deliveredQty:count,reference:ref,destination:job.destination,
    partyType:'customers',partyId:job.customerId,siteId:job.destination});
  job.delivered+=count;job.status='Delivered';
}
function postSalesDelivery(s,r,location,ref){
  if(!['Confirmed','Partially delivered'].includes(r.status))return;
  loc(s,location);
  need(!s.events.some(e=>e.salesId===r.id&&e.reference.toLowerCase()===ref.toLowerCase()),'This order already has a delivery with reference '+ref+'.');
  const amounts=r.lines.map(l=>{const left=l.qty-l.delivered;return left>EPS?(measured(item(s,l.sku).unit)?roundMeasured(left):left):0;});
  const stock=r.lines.map((l,i)=>({sku:l.sku,location,delta:-amounts[i]})).filter(l=>l.delta<0);
  if(!stock.length)return;
  const eventId=key();
  event(s,eventId,'Sales delivery',stock,r.no+' · '+ref);
  Object.assign(get(s,'events',eventId),{salesId:r.id,reference:ref,partyType:'customers',partyId:r.customerId,siteId:r.siteId||''});
  r.lines.forEach((l,i)=>{l.delivered=measured(item(s,l.sku).unit)?roundMeasured(l.delivered+amounts[i]):l.delivered+amounts[i];});
  r.status=r.lines.every(l=>l.qty-l.delivered<=EPS)?'Delivered':'Partially delivered';
}
function deliveriesPage(){
  Live.start();
  const queue=deliveryQueue(), month=state.trips.filter(t=>monthKey(t.date)===thisMonth()&&t.status!=='Cancelled');
  const moving=state.trips.filter(t=>t.status==='On the way'), ready=state.trips.filter(t=>t.status==='Next');
  const drivers=state.drivers.slice().sort((a,b)=>a.name.localeCompare(b.name));
  const f=Drv.f, opt=(rows,sel,all)=>`<option value="">${esc(all)}</option>`+rows.map(([v,l])=>`<option value="${esc(v)}" ${v===sel?'selected':''}>${esc(l)}</option>`).join('');
  return head('Operations',TITLES.deliveries,button('PDF',"exportDeliveries('pdf')",'','pdf'),button('Excel',"exportDeliveries('xlsx')",'','xls'),
      button('Other trip','tripEdit()'))+
    kpiRow([['alert','To deliver',queue.length,queue.length?'Waiting for a driver':'Nothing waiting',queue.length?'k-red':'k-ok'],
      ['truck','Ready to leave',ready.length,'Driver assigned','k-ink'],
      ['route','On the road',moving.length,moving.length?moving.map(t=>get(state,'drivers',t.driverId)?.name).filter(Boolean).slice(0,2).join(', '):'Nothing moving','k-yellow'],
      ['pulse','This month',month.length+' trips',nfmt(tripKm(month),1)+' km driven','k-ok']])+
    panel('To deliver · confirmed orders waiting for a driver',table(['Order','Customer','Deliver to','Items','Requested',''],queue.map(({kind,doc})=>{
      const i=deliveryInfo(kind,doc);
      return [cell(doc.no,kind==='job'?'Dispatch job':'Sales order')+openBtn(kind==='job'?`dispatchView(${escapeArg(doc.id)})`:`salesView(${escapeArg(doc.id)})`),
        esc(i.customerName||'—'),`<div class="addr-cell"><span>${esc(i.location||'—')}</span>${mapBtn(i.mapUrl)}</div>`,esc(i.description||'—'),
        esc(doc.due?fmtDate(doc.due):'—'),button('Assign driver',`assignDelivery('${kind}',${escapeArg(doc.id)})`,'btn-sm btn-primary')];
    }),'Nothing to deliver. Confirmed sales orders and dispatch jobs appear here automatically.'))+
    `<section class="card erp-table"><div class="card-head"><div class="card-title">Delivery trips</div></div>
      <div class="toolbar trip-filters"><div class="search">${ic('search')}<input class="inp" aria-label="Search trips" placeholder="Search packing no., customer, driver…"
        value="${esc(f.q)}" oninput="Drv.set('q',this.value)"></div>
        <select class="sel" aria-label="Driver" onchange="Drv.set('driver',this.value)">${opt(drivers.map(d=>[d.id,d.name]),f.driver,'All drivers')}</select>
        <select class="sel" aria-label="Status" onchange="Drv.set('status',this.value)">${opt(same(TRIP_STATUS),f.status,'All statuses')}</select>
        <select class="sel" aria-label="Priority" onchange="Drv.set('priority',this.value)">${opt(same(['Normal','Urgent']),f.priority,'Any priority')}</select>
        <input class="inp" type="month" aria-label="Month" value="${esc(f.month)}" onchange="Drv.set('month',this.value)"></div>
      <div id="trip-results" class="card-body-flush">${Drv.results()}</div></section>`;
}


/* ---------------- Owner area: what every employee did, items, tracking ---------------- */
const ACT_TABLES=[['customers','customer',r=>r.name,'masterView'],['suppliers','vendor',r=>r.name,'masterView'],['processors','processing company',r=>r.name,'masterView'],
  ['drivers','driver',r=>r.name,'driverView'],['materials','raw material',r=>r.name,'masterView'],['parts','part',r=>r.name,'masterView'],['products','product',r=>r.name,'masterView'],
  ['recipes','BOM',r=>label(item(state,r.id)),''],['sales','sales order',r=>r.no,'salesView'],['purchases','purchase',r=>r.no,'purchaseView'],['jobs','dispatch job',r=>r.no+' · '+(r.name||''),'dispatchView'],
  ['orders','production order',r=>r.no,'orderView'],['plans','production plan',r=>r.no,'planView'],['trips','delivery trip',r=>r.no,'tripView']];
function activity(){
  const out=[], op=(view,t,id)=>!view?'':view==='masterView'?`masterView(${escapeArg(t)},${escapeArg(id)})`:`${view}(${escapeArg(id)})`;
  for(const [t,kind,name,view] of ACT_TABLES)for(const r of state[t]||[]){
    const open=op(view,t,r.id), ref=String(name(r)||'—');
    if(r.createdAt)out.push({at:r.createdAt,by:r.createdBy,what:'Created '+kind,ref,open,kind:'create'});
    else if(r.at)out.push({at:r.at,by:r.by,what:(['sales','purchases','jobs','orders','plans','trips'].includes(t)?'Created ':'Saved ')+kind,ref,open,kind:'create'});
    if(r.editedAt&&r.createdAt&&Date.parse(r.editedAt)-Date.parse(r.createdAt)>5000)
      out.push({at:r.editedAt,by:r.editedBy,what:'Updated '+kind,ref,open,kind:'edit'});
  }
  for(const e of state.events)out.push({at:e.at,by:e.by,what:evType(e.type),kind:'stock',open:`eventView(${escapeArg(e.id)})`,
    ref:e.note||e.lines.slice(0,2).map(l=>labelOf(state,l.sku)).join(', ')});
  return out.filter(x=>x.at).map(x=>({...x,by:x.by||'—'})).sort((x,y)=>String(y.at).localeCompare(String(x.at)));
}
const agoText=at=>{const m=Math.round((Date.now()-Date.parse(at))/6e4);
  return m<1?'just now':m<60?m+' min ago':m<1440?Math.round(m/60)+' h ago':Math.round(m/1440)+' d ago';};
function teamSummary(rows){
  const day=todayISO(), week=Date.now()-7*864e5, by=new Map();
  for(const r of rows){if(r.by==='—')continue;const p=by.get(r.by)||{name:r.by,today:0,week:0,total:0,last:r,stock:0};
    p.total++;if(String(r.at).slice(0,10)===day)p.today++;if(Date.parse(r.at)>=week)p.week++;if(r.kind==='stock')p.stock++;by.set(r.by,p);}
  return [...by.values()].sort((x,y)=>String(y.last.at).localeCompare(String(x.last.at)));
}
function activityRow(r){
  return [`<span class="sub">${esc(stamp(r.at))}</span><div class="sub">${esc(agoText(r.at))}</div>`,`<b>${esc(r.by)}</b>`,
    esc(r.what),esc(r.ref)+(r.open?openBtn(r.open):'')];
}
/* What happened, written as a sentence: "Utrkash created sales order SO-12AB". */
function activitySentence(r){
  const who=r.by==='—'?'Someone':r.by;
  return r.kind==='stock'?`${who} recorded a ${r.what.toLowerCase()}${r.ref?' — '+r.ref:''}`:`${who} ${r.what.charAt(0).toLowerCase()+r.what.slice(1)} ${r.ref}`;
}
function ownerPage(){
  Live.start();
  const rows=activity(), day=todayISO(), today=rows.filter(r=>String(r.at).slice(0,10)===day&&r.by!=='—');
  const people=teamSummary(today);
  const held=aggregate(stockRows(state)).filter(b=>b.qty>EPS).length;
  const month=state.trips.filter(t=>t.status==='Delivered'&&monthKey(t.deliveredAt||t.date)===thisMonth());
  let queue=0;try{queue=deliveryQueue().length;}catch{}
  let warn=0;try{warn=warningRows().length;}catch{}
  const toReceive=state.purchases.filter(p=>p.status==='Ordered').length;
  const onRoad=state.trips.filter(t=>t.status==='On the way').length;
  const badPapers=state.drivers.filter(d=>d.active!==false&&!papersOk(d)).length;
  const hour=new Date().getHours(), hello=hour<12?'Good morning':hour<18?'Good afternoon':'Good evening';
  const big=(value,label,sub,go)=>`<button type="button" class="ow-big" onclick="App.go('${go}')"><b>${esc(value)}</b><span>${esc(label)}</span><small>${esc(sub)}</small></button>`;
  const attention=[
    queue&&[`🚚 ${queue} order${queue>1?'s are':' is'} waiting for a driver`,'deliveries'],
    onRoad&&[`🛣️ ${onRoad} deliver${onRoad>1?'ies are':'y is'} on the road right now`,'tracking'],
    toReceive&&[`📦 ${toReceive} purchase${toReceive>1?'s were':' was'} ordered but not received yet`,'purchase'],
    badPapers&&[`🛂 ${badPapers} driver${badPapers>1?'s have':' has'} missing or expired papers`,'deliveries'],
    warn&&[`⚠️ ${warn} stock warning${warn>1?'s':''} (items running low or short)`,'items']].filter(Boolean);
  return head(isOwner()?'Super admin':'Owner view','Overview',liveChip())+
    `<h2 class="ow-hello">${hello}${CLOUD.name?', '+esc(CLOUD.name.split(' ')[0]):''}.</h2><p class="sub ow-sub">This page shows what your team did and what needs attention. Click anything to see the details.</p>`+
    `<div class="ow-bigs">${big(today.length,'Things done today',people.length?'by '+people.map(p=>p.name).join(', '):'nobody has worked in the system yet today','team')}
      ${big(month.length,'Deliveries this month',month.length?nfmt(tripKm(month),0)+' km driven':'no deliveries yet this month','deliveries')}
      ${big(queue,'Waiting for a driver',queue?'orders ready to go out':'nothing waiting','deliveries')}
      ${big(held,'Items in stock','different items in the stores','items')}</div>`+
    `<div class="ow-grid"><section class="card"><div class="card-head"><div class="card-title">Needs your attention</div></div>
      <div class="ow-list">${attention.length?attention.map(([text,go])=>`<button type="button" class="ow-line" onclick="App.go('${go}')"><span>${esc(text)}</span><em>Open →</em></button>`).join(''):
        '<div class="ow-ok">✅ Nothing needs your attention right now.</div>'}</div></section>
    <section class="card"><div class="card-head"><div class="card-title">Who worked today</div></div>
      <div class="ow-list">${people.length?people.map(p=>`<button type="button" class="ow-line" onclick="Team.f.who=${escapeArg(p.name)};Team.f.days='1';App.go('team')">
        <span><span class="ow-who"><b>${esc(p.name)}</b> · ${p.today} thing${p.today===1?'':'s'} today</span><small>Last: ${esc(activitySentence(p.last).replace(p.name+' ',''))} · ${esc(agoText(p.last.at))}</small></span><em>See all →</em></button>`).join(''):
        '<div class="ow-ok">Nobody has saved anything today yet.</div>'}</div></section></div>`+
    `<section class="card"><div class="card-head"><div class="card-title">What happened last</div><button type="button" class="link-btn" onclick="App.go('team')">See everything →</button></div>
      <div class="ow-list">${rows.slice(0,10).map(r=>`<button type="button" class="ow-line" ${r.open?`onclick="${r.open}"`:'disabled'}><span>${esc(activitySentence(r))}</span><em>${esc(agoText(r.at))}</em></button>`).join('')||
        '<div class="ow-ok">Nothing has happened yet.</div>'}</div></section>`;
}
const Team={f:{who:'',days:'7',q:''}};
function teamPage(){
  const all=activity(), f=Team.f, since=f.days?Date.now()-Number(f.days)*864e5:0;
  const people=[...new Set(all.map(r=>r.by))].filter(p=>p!=='—').sort();
  const rows=all.filter(r=>(!f.who||r.by===f.who)&&(!since||Date.parse(r.at)>=since));
  const opt=(list,sel,first)=>`<option value="">${esc(first)}</option>`+list.map(([v,l])=>`<option value="${esc(v)}"${v===sel?' selected':''}>${esc(l)}</option>`).join('');
  return head(isOwner()?'Super admin':'Owner view','Team activity')+
    `<div class="card"><div class="toolbar">
      <select class="sel" aria-label="Person" onchange="Team.f.who=this.value;App.render()">${opt(people.map(p=>[p,p]),f.who,'Everyone')}</select>
      <select class="sel" aria-label="Period" onchange="Team.f.days=this.value;App.render()">${opt([['1','Today'],['7','Last 7 days'],['30','Last 30 days']],f.days,'All time')}</select>
      <span class="pill-legend">${rows.length} actions</span></div></div>`+
    panel('Per person',table(['Person','Actions','Records saved','Stock movements','Last active'],teamSummary(rows).map(p=>[`<b>${esc(p.name)}</b>`,esc(p.total),
      esc(p.total-p.stock),esc(p.stock),esc(agoText(p.last.at)+' · '+p.last.what)]),'No activity in this period.'))+
    searchableTable(['When','Who','What','Record'],rows.slice(0,500).map(activityRow),'No activity in this period.',
      rows.slice(0,500).map(r=>[r.by,r.what,r.ref].join(' ')),{placeholder:'Search activity…',noun:'actions'});
}
function itemsPage(){
  const rows=stockRows(state), last=new Map();
  for(const e of state.events)for(const l of e.lines){const p=last.get(l.sku);if(!p||String(e.at)>String(p.at))last.set(l.sku,e);}
  const items=[...current(state,'materials').map(r=>['Raw material',r]),...current(state,'parts').map(r=>['Part',r]),...current(state,'products').map(r=>['Product',r])];
  return head(isOwner()?'Super admin':'Owner view','Items & stock')+
    searchableTable(['Item','Type','On hand','Where it is','Last movement'],items.map(([kind,r])=>{
      const here=rows.filter(b=>b.sku===r.id&&Math.abs(b.qty)>EPS), total=here.reduce((n,b)=>n+b.qty,0), e=last.get(r.id);
      return [`<div class="record-media">${recordPicture(r,'thumb-kanban')}<div>${cell(r.name,r.code)}</div></div>`+openBtn(`trackItem(${escapeArg(r.id)})`),esc(kind),
        `<strong class="num">${esc(qfmt(total,r.unit))}</strong>`,
        here.length?here.map(b=>`<div class="sub">${esc(locName(state,b.location))}: <b>${esc(qfmt(b.qty))}</b></div>`).join(''):'<span class="sub">Not in stock</span>',
        e?`${esc(evType(e.type))}<div class="sub">${esc(e.by||'—')} · ${esc(agoText(e.at))}</div>`:'<span class="sub">—</span>'];
    }),'No items yet.',items.map(([kind,r])=>[kind,r.name,r.code,r.category].join(' ')),{placeholder:'Search items by name, code or type…',noun:'items'});
}
/* ---------------- Charts (inline HTML/SVG, hover tooltips via data-tip) ---------------- */
const VIZ=['var(--viz-1)','var(--viz-2)','var(--viz-3)','var(--viz-4)'];
function kpiRow(items){
  return `<div class="kpis kpis-live">${items.map(([icon,title,value,sub,tone,go])=>`<${go?'button type="button"':'div'} class="kpi erp-kpi ${tone||'k-ink'}"${go?` onclick="App.go(${escapeArg(go)})"`:''}>
    <div class="kl">${ic(icon)}${esc(title)}</div><div class="kv">${esc(value)}</div><div class="kf">${esc(sub)}</div></${go?'button':'div'}>`).join('')}</div>`;
}
function hbars(rows,{empty='Nothing to show yet.',color=VIZ[0],fmt=v=>nfmt(v,1)}={}){
  if(!rows.length)return `<div class="viz-empty">${esc(empty)}</div>`;
  const max=Math.max(...rows.map(r=>r.value),1);
  return `<div class="viz-hbars">${rows.map(r=>`<div class="viz-hrow" data-tip="${esc(r.tip||r.label+': '+fmt(r.value))}"${r.go?` onclick="${r.go}" role="button" tabindex="0"`:''}>
    <div class="viz-hl" title="${esc(r.label)}">${esc(r.label)}</div>
    <div class="viz-htrack"><span style="width:${Math.max(1.5,r.value/max*100)}%;background:${r.color||color}"></span></div>
    <div class="viz-hv">${esc(fmt(r.value))}${r.sub?`<small>${esc(r.sub)}</small>`:''}</div></div>`).join('')}</div>`;
}
function columns(days,series,{height=170}={}){
  const max=Math.max(1,...days.map(d=>series.reduce((n,s)=>n+(d[s.key]||0),0)));
  const nice=Math.ceil(max/4)*4||4, W=100/days.length;
  const grid=[0,.25,.5,.75,1].map(p=>`<div class="viz-grid" style="bottom:${p*100}%"><span>${nfmt(nice*p,0)}</span></div>`).join('');
  return `<div class="viz-legend">${series.map(s=>`<span><i style="background:${s.color}"></i>${esc(s.label)}</span>`).join('')}</div>
    <div class="viz-cols" style="height:${height}px">${grid}<div class="viz-plot">${days.map(d=>{
      const total=series.reduce((n,s)=>n+(d[s.key]||0),0);
      return `<div class="viz-col" style="width:${W}%" data-tip="${esc(d.label+' — '+series.map(s=>s.label+' '+(d[s.key]||0)).join(' · '))}">
        <div class="viz-stack" style="height:${total/nice*100}%">${series.slice().reverse().map(s=>d[s.key]?`<span style="flex:${d[s.key]};background:${s.color}"></span>`:'').join('')}</div></div>`;
    }).join('')}</div></div>
    <div class="viz-x">${days.map((d,i)=>`<span style="width:${W}%">${i%2===days.length%2?'':esc(d.short)}</span>`).join('')}</div>`;
}
function segbar(parts){
  const total=parts.reduce((n,p)=>n+p.value,0);
  if(!total)return `<div class="viz-empty">No records yet.</div>`;
  return `<div class="viz-seg">${parts.filter(p=>p.value).map(p=>`<span style="flex:${p.value};background:${p.color}" data-tip="${esc(p.label+': '+p.value+' ('+Math.round(p.value/total*100)+'%)')}"></span>`).join('')}</div>
    <div class="viz-legend viz-legend-v">${parts.map(p=>`<span><i style="background:${p.color}"></i>${esc(p.label)}<b>${p.value}</b></span>`).join('')}</div>`;
}
function sparkline(points,{height=60}={}){
  if(points.length<2)return '';
  const xs=points.map(p=>p.t), ys=points.map(p=>p.v), x0=Math.min(...xs), x1=Math.max(...xs)||x0+1, y0=Math.min(0,...ys), y1=Math.max(...ys,1);
  const X=t=>((t-x0)/((x1-x0)||1))*300, Y=v=>height-4-((v-y0)/((y1-y0)||1))*(height-8);
  const d=points.map((p,i)=>(i?'L':'M')+X(p.t).toFixed(1)+' '+Y(p.v).toFixed(1)).join(' ');
  return `<svg class="viz-spark" viewBox="0 0 300 ${height}" preserveAspectRatio="none" aria-hidden="true"><path d="${d}" fill="none" stroke="var(--viz-1)" stroke-width="2" vector-effect="non-scaling-stroke"/></svg>`;
}
(function tooltips(){
  let tip;
  const hide=()=>tip&&(tip.hidden=true);
  document.addEventListener('mouseover',e=>{
    const el=e.target.closest?.('[data-tip]');
    if(!el){hide();return;}
    tip=tip||Object.assign(document.body.appendChild(document.createElement('div')),{className:'viz-tip',hidden:true});
    tip.textContent=el.dataset.tip;tip.hidden=false;
    const r=el.getBoundingClientRect(), w=tip.offsetWidth;
    tip.style.left=Math.max(8,Math.min(innerWidth-w-8,r.left+r.width/2-w/2))+'px';
    tip.style.top=Math.max(8,r.top-tip.offsetHeight-8)+'px';
  });
  addEventListener('scroll',hide,true);
})();

/* ---------------- Live tracking: every item, every movement ---------------- */
const EVENT_LABEL={'Supplier receipt':'Vendor receipt','Record Stock Adjustment':'Stock adjustment','Physical Stock Check':'Stock count'};
const evType=t=>EVENT_LABEL[t]||t;
const skuKind=id=>get(state,'materials',id)?'Raw material':get(state,'parts',id)?'Part':get(state,'products',id)?'Product':get(state,'variants',id)?'Part variant':'Item';
function ledger(){
  // Every stock line in time order, with the balance left at that location right after it.
  const run=new Map(), rows=[];
  for(const e of state.events.slice().sort((a,b)=>(a.at||'').localeCompare(b.at||''))){
    const transfer=e.lines.length===2&&e.lines[0].sku===e.lines[1].sku&&e.lines[0].delta===-e.lines[1].delta;
    e.lines.forEach((l,i)=>{
      const k=l.sku+'|'+l.location, bal=(run.get(k)||0)+l.delta;run.set(k,bal);
      const other=transfer?e.lines[1-i].location:'';
      rows.push({e,l,bal,other,...moveRoute(e,l,other)});
    });
  }
  return rows;
}
/* Where a stock line came from and where it went: store → store, vendor → store, store → customer site, production. */
function moveRoute(e,l,other){
  const here=locName(state,l.location), L=eventLinks(state,e), party=[L.company,L.site].filter(Boolean).join(' · ');
  const prod=e.orderId||e.id.startsWith('production:'), trip=e.jobId?state.trips.find(t=>t.jobId===e.jobId&&t.status!=='Cancelled'):
    e.salesId?state.trips.find(t=>t.salesId===e.salesId&&t.status!=='Cancelled'):null;
  const site=get(state,'locations',e.siteId||e.destination||'');
  const map=trip?.mapUrl||(site?mapsLink(site):'');
  let from=here,to=here;
  if(other){if(l.delta<0)to=locName(state,other);else from=locName(state,other);}
  else if(l.delta<0){to=e.jobId||e.salesId?(party||'Customer'):prod?'Used in production '+(L.document||''):evType(e.type)+' (removed)';}
  else{from=e.purchaseId?(party||'Vendor'):prod?'Made in production '+(L.document||''):e.jobId?locName(state,get(state,'jobs',e.jobId)?.location):evType(e.type)+(e.type==='Opening stock'?'':' (added)');}
  return {from,to,trip,map:l.delta<0&&(e.jobId||e.salesId)?map:''};
}
const routeCell=r=>`<div class="route-cell"><span>${esc(r.from)}</span><b>→</b><span>${esc(r.to)}</span>${mapBtn(r.map)}</div>`;
const tripCell=t=>t?`<button type="button" class="link-btn" onclick="tripView(${escapeArg(t.id)})">${esc(t.no)}</button><div class="sub">${esc(get(state,'drivers',t.driverId)?.name||'')} · ${esc(t.status)}</div>`:'<span class="sub">—</span>';
/* Everything still waiting to go out to a customer: open dispatch jobs and open sales orders, per item. */
function pendingDeliveries(sku=''){
  const rows=[];
  for(const j of state.jobs.filter(j=>['Open','Partially delivered'].includes(j.status))){
    const left=j.qty-j.delivered, site=get(state,'locations',j.destination);
    const trip=state.trips.find(t=>t.jobId===j.id&&t.status!=='Cancelled');
    const items=j.finished?[{sku:j.productId,qty:left}]:j.parts.map(p=>({sku:p.sku,qty:p.qty*left/j.qty}));
    for(const x of items)if(!sku||x.sku===sku)rows.push({doc:j.no,kind:'Dispatch job',open:`dispatchView(${escapeArg(j.id)})`,sku:x.sku,qty:x.qty,
      from:locName(state,j.location),to:[get(state,'customers',j.customerId)?.name,j.destinationSnapshot?.name].filter(Boolean).join(' · '),
      map:trip?.mapUrl||mapsLink(site||j.destinationSnapshot||{}),trip,jobId:j.id});
  }
  for(const o of state.sales.filter(o=>SALES_OPEN.includes(o.status))){
    const site=get(state,'locations',o.siteId), sTrip=activeTrip('salesId',o.id);
    for(const l of o.lines.filter(l=>l.qty-l.delivered>EPS))if(!sku||l.sku===sku)rows.push({doc:o.no,kind:'Sales order',open:`salesView(${escapeArg(o.id)})`,
      sku:l.sku,qty:l.qty-l.delivered,from:'Chosen when delivering',salesId:o.id,to:[get(state,'customers',o.customerId)?.name,site?.name].filter(Boolean).join(' · '),
      map:site?mapsLink(site):companyMap('customers',get(state,'customers',o.customerId)),trip:sTrip||null});
  }
  return rows;
}
function pendingTable(rows,withItem=true){
  return table(['Document',...(withItem?['Item']:[]),'Still to deliver','From → To','Trip / driver'],rows.map(p=>{const it=item(state,p.sku);return [
    `<button type="button" class="link-btn" onclick="${p.open}">${esc(p.doc)}</button><div class="sub">${esc(p.kind)}</div>`,
    ...(withItem?[cell(it?.name||'—',it?.code||'')]:[]),`<strong class="num">${esc(qfmt(p.qty,it?.unit))}</strong>`,
    routeCell(p),p.trip?tripCell(p.trip):p.jobId?small('Assign driver',`assignDelivery('job',${escapeArg(p.jobId)})`):p.salesId?small('Assign driver',`assignDelivery('sale',${escapeArg(p.salesId)})`):'<span class="sub">No trip yet</span>'];}),
    'Nothing is waiting to be delivered.');
}
const Trk={
  f:{q:'',kind:'',location:'',type:'',from:'',to:''},
  set(name,value){this.f[name]=value;const box=$('#track-results');if(box)box.innerHTML=this.results();},
  reset(){this.f={q:'',kind:'',location:'',type:'',from:'',to:''};App.render();},
  results(){
    const f=this.f, q=searchKey(f.q), all=ledger();
    const match=r=>(!f.kind||skuKind(r.l.sku)===f.kind)&&(!f.location||r.l.location===f.location||r.other===f.location)&&
      (!f.type||evType(r.e.type)===f.type)&&(!f.from||r.e.at.slice(0,10)>=f.from)&&(!f.to||r.e.at.slice(0,10)<=f.to)&&
      (!q||searchKey([labelOf(state,r.l.sku),r.e.note,evType(r.e.type),r.from,r.to,r.trip?.no,get(state,'drivers',r.trip?.driverId)?.name].join(' ')).includes(q));
    const feed=all.filter(match).reverse();
    const ids=[...new Set(feed.map(r=>r.l.sku))];
    // Items with no stock and no movement stay hidden unless someone searches for them by name.
    const items=[...ids, ...(f.type||f.from||f.to||!q?[]:skus().map(r=>r.id).filter(id=>!ids.includes(id)&&(!f.kind||skuKind(id)===f.kind)&&
      searchKey(labelOf(state,id)).includes(q)&&!f.location))];
    const balances=stockRows(state);
    const itemRows=items.slice(0,200).map(id=>{
      const it=item(state,id), here=balances.filter(b=>b.sku===id), last=feed.find(r=>r.l.sku===id)||all.slice().reverse().find(r=>r.l.sku===id);
      const total=here.reduce((n,b)=>n+b.qty,0), moves=feed.filter(r=>r.l.sku===id).length;
      return [`<div class="record-media">${recordPicture(it||{})}<div>${cell(it?.name||'—',it?.code||'')}</div></div>`,esc(skuKind(id)),
        `<strong class="num ${total<=EPS?'trk-zero':''}">${esc(qfmt(total,it?.unit))}</strong>`,
        here.length?here.sort((a,b)=>b.qty-a.qty).slice(0,3).map(b=>`<span class="trk-loc">${ic('pin')}${esc(locName(state,b.location))} <b>${esc(qfmt(b.qty))}</b></span>`).join('')+(here.length>3?`<span class="sub">+${here.length-3} more</span>`:''):'<span class="sub">Not held anywhere</span>',
        last?cell(evType(last.e.type),stamp(last.e.at)):'<span class="sub">No movements</span>',`<span class="co-count">${moves}</span>`,
        button('Track',`trackItem(${escapeArg(id)})`,'btn-sm btn-view','route')];
    });
    const feedRows=feed.slice(0,250).map(r=>{
      const it=item(state,r.l.sku), linked=eventLinks(state,r.e), out=r.l.delta<0;
      return [`<span class="num">${esc(stamp(r.e.at))}</span>`,cell(it?.name||'—',it?.code||''),esc(evType(r.e.type)),
        routeCell(r),
        `<strong class="num ${out?'trk-out':'trk-in'}">${out?'':'+'}${esc(qfmt(r.l.delta,it?.unit))}</strong>`,`<span class="num">${esc(qfmt(r.bal))}</span>`,
        tripCell(r.trip),esc(r.e.note||linked.document||'—'),esc(r.e.by||'—')];
    });
    return `<div class="trk-summary">${[['Items shown',items.length],['Movements',feed.length],['In',feed.filter(r=>r.l.delta>0).length],['Out',feed.filter(r=>r.l.delta<0).length]]
      .map(([k,v])=>`<span>${esc(k)} <b>${v}</b></span>`).join('')}</div>`+
      panel('Where every item is now',table(['Item','Type','On hand','Locations','Last movement','Moves','Track'],itemRows,
        q?'No items match these filters.':'No stock movements yet. Search an item name to look up items that never moved.'))+
      panel('Movement feed'+(feed.length>250?' · newest 250 of '+feed.length:''),table(['When','Item','Movement','From → To','Change','Balance there','Trip / driver','Reference','By'],feedRows,
        'No movements match these filters.'));
  }
};
function trackingPage(){
  Live.start();
  const f=Trk.f, opt=(rows,sel,all)=>`<option value="">${esc(all)}</option>`+rows.map(([v,l])=>`<option value="${esc(v)}" ${v===sel?'selected':''}>${esc(l)}</option>`).join('');
  const types=[...new Set(state.events.map(e=>evType(e.type)))].sort();
  const locs=state.locations.filter(l=>l.stock||stockRows(state).some(b=>b.location===l.id)).map(l=>[l.id,locName(state,l.id)]);
  const moving=state.trips.filter(t=>t.status==='On the way'), today=todayISO();
  const todayMoves=state.events.filter(e=>(e.at||'').slice(0,10)===today);
  return head('Overview',TITLES.tracking,liveChip(),button('Export movements','trackExport()','','xls'),button('Clear filters','Trk.reset()','','refresh'))+
    kpiRow([['layers','Items in stock',new Set(stockRows(state).filter(b=>b.qty>EPS).map(b=>b.sku)).size,'Across '+new Set(stockRows(state).map(b=>b.location)).size+' locations','k-ink'],
      ['swap','Movements today',todayMoves.length,todayMoves.reduce((n,e)=>n+e.lines.length,0)+' item lines','k-ok'],
      ['truck','Deliveries on the road',moving.length,moving.length?moving.map(t=>t.no).slice(0,2).join(', '):'Nothing moving','k-yellow','deliveries'],
      ['pulse','All-time movements',state.events.length,'Full history kept','k-ink']])+
    (moving.length?panel('On the road now',table(['Trip','Driver','Customer','To','Left at'],moving.map(t=>[
      `<button type="button" class="link-btn" onclick="tripView(${escapeArg(t.id)})">${esc(t.no)}</button>`,esc(get(state,'drivers',t.driverId)?.name||'—'),
      esc(t.customerName||'—'),`<div class="addr-cell"><span>${esc(t.location||'—')}</span>${mapBtn(t.mapUrl)}</div>`,esc(t.departedAt?stamp(t.departedAt):fmtDate(t.date))]))):'')+
    (pendingDeliveries().length?panel('Waiting to be delivered · from → to',pendingTable(pendingDeliveries())):'')+
    `<div class="card trk-filters"><div class="toolbar">
      <div class="search">${ic('search')}<input class="inp" aria-label="Search items" placeholder="Search item, code, reference, company…" value="${esc(f.q)}" oninput="Trk.set('q',this.value)"></div>
      <select class="sel" aria-label="Item type" onchange="Trk.set('kind',this.value)">${opt(same(['Raw material','Part','Part variant','Product']),f.kind,'All item types')}</select>
      <select class="sel" aria-label="Location" onchange="Trk.set('location',this.value)">${opt(locs,f.location,'All locations')}</select>
      <select class="sel" aria-label="Movement type" onchange="Trk.set('type',this.value)">${opt(same(types),f.type,'All movements')}</select>
      <label class="trk-date">From <input class="inp" type="date" value="${esc(f.from)}" onchange="Trk.set('from',this.value)"></label>
      <label class="trk-date">To <input class="inp" type="date" value="${esc(f.to)}" onchange="Trk.set('to',this.value)"></label></div></div>
    <div id="track-results">${Trk.results()}</div>`;
}
function trackExport(){
  const f=Trk.f, rows=ledger().filter(r=>(!f.from||r.e.at.slice(0,10)>=f.from)&&(!f.to||r.e.at.slice(0,10)<=f.to)).reverse();
  XLSX.save('AMBS_Movements_'+todayISO(),[{name:'Movements',columns:['Date','Time','Item code','Item','Type','Movement','From','To','Change','Unit','Balance there','Trip','Driver','Reference','By'],
    rows:rows.map(r=>{const it=item(state,r.l.sku), linked=eventLinks(state,r.e);return [r.e.at.slice(0,10),new Date(r.e.at).toLocaleTimeString('en-GB',{hour:'2-digit',minute:'2-digit'}),
      it?.code||'',it?.name||'',skuKind(r.l.sku),evType(r.e.type),r.from,r.to,r.l.delta,it?.unit||'',
      Number(r.bal.toFixed(6)),r.trip?.no||'',get(state,'drivers',r.trip?.driverId)?.name||'',r.e.note||linked.document||'',r.e.by||''];})},
    {name:'Stock now',columns:['Item code','Item','Type','Location','Balance','Unit'],rows:stockRows(state).map(b=>{const it=item(state,b.sku);
      return [it?.code||'',it?.name||'',skuKind(b.sku),locName(state,b.location),Number(b.qty.toFixed(6)),it?.unit||''];})}]);
}
function trackItem(id){
  const it=item(state,id), rows=ledger().filter(r=>r.l.sku===id), here=stockRows(state).filter(b=>b.sku===id);
  // one step per movement, so a busy single day is as readable as a month
  let total=0;const points=rows.map((r,i)=>({t:i,v:(total+=r.l.delta)}));
  if(points.length)points.push({t:points.length,v:total});
  infoModal('Track · '+label(it),`<div class="co-hero">${recordPicture(it,'thumb-record')}<div class="co-hero-main"><div class="co-hero-name">${esc(it.name)}</div>
    <div class="co-hero-sub">${esc(it.code)} · ${esc(skuKind(id))} · on hand <b>${esc(qfmt(total,it.unit))}</b></div></div></div>`+
    (points.length>1?panel('Total balance over time',`<div class="card-body">${sparkline(points)}<div class="viz-x"><span>${esc(fmtDate(rows[0].e.at.slice(0,10)))}</span><span style="margin-left:auto">Today</span></div></div>`):'')+
    panel('Where it is now',hbars(here.sort((a,b)=>b.qty-a.qty).map(b=>({label:locName(state,b.location),value:b.qty,tip:locName(state,b.location)+': '+qfmt(b.qty,it.unit)})),
      {empty:'Not held at any location.',fmt:v=>qfmt(v,it.unit)}))+
    (pendingDeliveries(id).length?panel('Waiting to be delivered',pendingTable(pendingDeliveries(id),false)):'')+
    panel('Every movement · '+rows.length,table(['When','Movement','From → To','Change','Balance there','Trip / driver','Reference'],rows.slice().reverse().map(r=>[
      esc(stamp(r.e.at)),esc(evType(r.e.type)),routeCell(r),
      `<strong class="num ${r.l.delta<0?'trk-out':'trk-in'}">${r.l.delta<0?'':'+'}${esc(qfmt(r.l.delta,it.unit))}</strong>`,esc(qfmt(r.bal)),
      tripCell(r.trip),esc(r.e.note||'—')]),'No movements yet.')),
    small('Open item',`closeModal();masterView(${escapeArg(get(state,'variants',id)?'variants':get(state,'materials',id)?'materials':get(state,'parts',id)?'parts':'products')},${escapeArg(id)})`));
}

/* ---------------- Live refresh: dashboard, tracking and drivers pull fresh data every 30 s ---------------- */
const Live={
  at:null,timer:null,
  start(){
    this.at=new Date();
    if(this.timer)return;
    this.timer=setInterval(async()=>{
      if(!state||_modalStack||App.editing||document.visibilityState!=='visible'||!['dashboard','tracking','deliveries'].includes(App.route))return;
      if(document.activeElement?.matches?.('input,select,textarea'))return;
      try{await refreshCloudWorkspace(false);this.at=new Date();const y=scrollY;App.render();scrollTo(0,y);}catch{}
    },30000);
  }
};
function liveChip(){
  return `<span class="live-chip" data-tip="Refreshes every 30 seconds while this page is open"><i></i>Live · ${esc((Live.at||new Date()).toLocaleTimeString('en-GB',{hour:'2-digit',minute:'2-digit'}))}</span>`;
}

/* ---------------- Dashboard ---------------- */
/* Main dashboard: a few big numbers, what to do now, what is on the road, and the latest stock movements — in plain words. */
function dashboard(){
  Live.start();
  const balances=stockRows(state), held=new Set(balances.filter(b=>b.qty>EPS).map(b=>b.sku)).size;
  const moving=state.trips.filter(t=>t.status==='On the way'), ready=state.trips.filter(t=>t.status==='Next');
  const month=state.trips.filter(t=>t.status==='Delivered'&&monthKey(t.deliveredAt||t.date)===thisMonth());
  let queue=0;try{queue=deliveryQueue().length;}catch{}
  let warn=0;try{warn=warningRows().length;}catch{}
  const used=new Set(state.recipes.flatMap(r=>r.lines.map(l=>l.sku||l.variantId||l.partId)));
  const out=current(state,'materials').filter(m=>used.has(m.id)&&physical(state,m.id)<=EPS).length;
  const n=(t,f)=>(state[t]||[]).filter(f).length, plural=(c,one,many)=>c+' '+(c===1?one:many);
  const badPapers=state.drivers.filter(d=>d.active!==false&&!papersOk(d)).length;
  const todo=[
    [queue,`🚚 ${plural(queue,'order is','orders are')} waiting for a driver`,'deliveries','Assign driver'],
    [ready.length,`🛻 ${plural(ready.length,'trip is','trips are')} ready to leave`,'deliveries','Start trip'],
    [moving.length,`🛣️ ${plural(moving.length,'delivery is','deliveries are')} on the road — mark Delivered when done`,'deliveries','Open'],
    [n('sales',o=>o.status==='Draft'),`🧾 ${plural(n('sales',o=>o.status==='Draft'),'sales order is','sales orders are')} still a draft`,'sales','Confirm'],
    [n('purchases',x=>x.status==='Draft'),`🛒 ${plural(n('purchases',x=>x.status==='Draft'),'purchase is','purchases are')} not ordered yet`,'purchase','Mark ordered'],
    [n('purchases',x=>x.status==='Ordered'),`📥 ${plural(n('purchases',x=>x.status==='Ordered'),'purchase is','purchases are')} waiting to be received`,'purchase','Receive'],
    [n('orders',o=>o.status==='Draft'),`🏭 ${plural(n('orders',o=>o.status==='Draft'),'production order is','production orders are')} waiting to start`,'production','Release'],
    [n('orders',o=>o.status==='Released'),`⚙️ ${plural(n('orders',o=>o.status==='Released'),'production order is','production orders are')} being made`,'production','Mark completed'],
    [badPapers,`🛂 ${plural(badPapers,'driver has','drivers have')} missing or expired papers`,'drivers','Fix papers'],
    [out+warn,`⚠️ ${plural(out+warn,'item is','items are')} out of stock or running low`,'materials','Check']].filter(x=>x[0]);
  const hour=new Date().getHours(), hello=hour<12?'Good morning':hour<18?'Good afternoon':'Good evening';
  const who=typeof CLOUD!=='undefined'&&CLOUD.name?', '+CLOUD.name.split(' ')[0]:'';
  const big=(value,label,sub,go)=>`<button type="button" class="ow-big" onclick="App.go('${go}')"><b>${esc(value)}</b><span>${esc(label)}</span><small>${esc(sub)}</small></button>`;
  const road=[...moving,...ready].slice(0,8), moves=activity().filter(r=>r.kind==='stock').slice(0,10);
  return head('Overview','Dashboard',liveChip())+
    `<h2 class="ow-hello">${hello}${esc(who)}.</h2><p class="sub ow-sub">Here is what is happening now and what needs doing. Click any line to open it.</p>`+
    (state.reviews.some(r=>!r.resolved)?note('Legacy data is available under Settings & Data for review.','warn'):'')+
    `<div class="ow-bigs">${big(held,'Items in stock','different items in the stores','tracking')}
      ${big(queue,'Waiting for a driver',queue?'orders ready to go out':'nothing waiting','deliveries')}
      ${big(moving.length,'On the road',moving.length?moving.map(t=>get(state,'drivers',t.driverId)?.name).filter(Boolean).slice(0,2).join(', '):'no truck out right now','deliveries')}
      ${big(month.length,'Delivered this month',month.length?nfmt(tripKm(month),0)+' km driven':'no deliveries yet','deliveries')}</div>`+
    `<div class="ow-grid"><section class="card"><div class="card-head"><div class="card-title">What to do now</div></div>
      <div class="ow-list">${todo.length?todo.map(([,text,go,act])=>`<button type="button" class="ow-line" onclick="App.go('${go}')"><span>${esc(text)}</span><em>${esc(act)} →</em></button>`).join(''):
        '<div class="ow-ok">✅ All done — nothing is waiting.</div>'}</div></section>
    <section class="card"><div class="card-head"><div class="card-title">Trucks out and waiting</div><button type="button" class="link-btn" onclick="App.go('deliveries')">All deliveries →</button></div>
      <div class="ow-list">${road.length?road.map(t=>`<button type="button" class="ow-line" onclick="tripView(${escapeArg(t.id)})">
        <span><span class="ow-who"><b>${esc(t.no)}</b> · ${esc(get(state,'drivers',t.driverId)?.name||'No driver')} → ${esc(t.customerName||'—')}</span><small>${esc(t.location||'')}</small></span>
        <em>${t.status==='On the way'?'On the road':'Ready to leave'}</em></button>`).join(''):'<div class="ow-ok">No trips out or waiting.</div>'}</div></section></div>`+
    `<section class="card"><div class="card-head"><div class="card-title">Latest stock movements</div><button type="button" class="link-btn" onclick="App.go('tracking')">Live Tracking →</button></div>
      <div class="ow-list">${moves.map(r=>`<button type="button" class="ow-line" onclick="${r.open}"><span>${esc(activitySentence(r))}</span><em>${esc(agoText(r.at))}</em></button>`).join('')||
        '<div class="ow-ok">No stock has moved yet.</div>'}</div></section>`;
}

/* ---------------- Odoo-style global search: menus as "AMBS / Group / Page", then matching records ---------------- */
const TOOL_PAGES=[['steel','Tools'],['market','Tools'],['prodcalc','Tools'],['nesting','Tools']];
function searchIndex(){
  const extra=canSeeOwner()?[[isOwner()?'Super admin':'Owner view',OWNER_GROUPS[0][1]]]:[];
  const menus=[...extra,...GROUPS].flatMap(([group,rows])=>rows.map(([r])=>({kind:'menu',path:['AMBS',group,TITLES[r]],go:()=>App.go(r)})));
  for(const [r,parent] of TOOL_PAGES)menus.push({kind:'menu',path:['AMBS','System',parent,TITLES[r]],go:()=>App.go(r)});
  const records=[
    ['customers','Customers',r=>[r.name,r.code,r.phone,r.position]],
    ['suppliers','Vendors',r=>[r.name,r.code,r.phone]],
    ['materials','Raw Materials',r=>[r.name,r.code,r.category]],
    ['parts','Parts',r=>[r.name,r.code,r.category]],
    ['products','Products',r=>[r.name,r.code,r.category]],
    ['processors','Processing Companies',r=>[r.name,r.code]]
  ].flatMap(([type,title,keys])=>state[type].map(r=>({kind:'record',path:[title,r.name],extra:keys(r).filter(Boolean).join(' '),
    go:()=>{App.go(type);masterView(type,r.id);}})));
  for(const d of state.drivers)records.push({kind:'record',path:['Drivers',d.name],extra:d.phone||'',go:()=>{App.go('drivers');driverView(d.id);}});
  for(const t of state.trips)records.push({kind:'record',path:['Trips',t.no+(t.customerName?' · '+t.customerName:'')],extra:[t.project,t.location].join(' '),go:()=>{App.go('deliveries');tripView(t.id);}});
  return {menus,records};
}
function searchMatch(entry,words){
  const text=searchKey(entry.path.join(' ')+' '+(entry.extra||''));
  return words.every(w=>text.includes(w));
}
function markWords(text,words){
  let html=esc(text);
  for(const w of words.filter(w=>w.length>0).sort((x,y)=>y.length-x.length)){
    html=html.replace(new RegExp('('+w.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')+')','ig'),'<b>$1</b>');
  }
  return html;
}
function wireGlobalSearch(){
  const input=$('#o-gsearch-input'), box=$('#o-gs-results');
  if(!input)return;
  let items=[], active=0;
  const close=()=>{box.hidden=true;box.replaceChildren();items=[];};
  const draw=()=>{
    const words=searchKey(input.value).split(' ').filter(Boolean);
    if(!words.length){close();return;}
    const {menus,records}=searchIndex();
    const m=menus.filter(e=>searchMatch(e,words)), r=records.filter(e=>searchMatch(e,words)).slice(0,8);
    items=[...m,...r];active=0;
    if(!items.length){box.innerHTML='<div class="o-gs-empty">No menu or record matches “'+esc(input.value)+'”</div>';box.hidden=false;return;}
    const row=(e,i)=>`<div class="o-gs-item${i===active?' on':''}" role="option" data-i="${i}">${e.kind==='menu'?ic('grid'):ic('search')}
      <span>${e.path.map((p,j)=>j===e.path.length-1?`<span class="o-gs-last">${markWords(p,words)}</span>`:markWords(p,words)).join('<span class="o-gs-sep"> / </span>')}</span></div>`;
    box.innerHTML=(m.length?'<div class="o-gs-head">Menus</div>'+m.map((e,i)=>row(e,i)).join(''):'')+
      (r.length?'<div class="o-gs-head">Records</div>'+r.map((e,i)=>row(e,i+m.length)).join(''):'');
    box.hidden=false;
  };
  const choose=i=>{const e=items[i];if(!e)return;input.value='';close();input.blur();e.go();};
  const mark=()=>box.querySelectorAll('.o-gs-item').forEach(el=>{const on=+el.dataset.i===active;el.classList.toggle('on',on);if(on)el.scrollIntoView({block:'nearest'});});
  input.addEventListener('input',draw);
  input.addEventListener('focus',draw);
  input.addEventListener('keydown',e=>{
    if(e.key==='ArrowDown'&&items.length){e.preventDefault();active=(active+1)%items.length;mark();}
    else if(e.key==='ArrowUp'&&items.length){e.preventDefault();active=(active-1+items.length)%items.length;mark();}
    else if(e.key==='Enter'){e.preventDefault();choose(active);}
    else if(e.key==='Escape'){e.stopPropagation();input.value='';close();input.blur();}
  });
  box.addEventListener('mousedown',e=>{const el=e.target.closest('.o-gs-item');if(el){e.preventDefault();choose(+el.dataset.i);}});
  input.addEventListener('blur',()=>setTimeout(close,120));
}
// "/" or Ctrl+K jumps to the search box from anywhere (unless typing in a field)
window.addEventListener('keydown',e=>{
  const typing=e.target.closest?.('input,textarea,select,[contenteditable]');
  if(((e.key==='/'&&!typing)||((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='k'))&&!_modalStack){
    const input=$('#o-gsearch-input');if(input){e.preventDefault();input.focus();input.select();}
  }
});

const App={
  route:'dashboard',record:null,
  go(r){
    const previous=this.route;this.record=null;this.editing=false;
    this.route=r==='purchase-new'?'purchase':r==='plan-new'?'production':r;
    location.hash='#/'+this.route;
    this.toggleNavigation(false);
    this.render();
    if(previous!==this.route)window.scrollTo(0,0);
    if(r==='plan-new')planEdit();
    if(r==='purchase-new')purchaseEdit();
  },
  nav(){
    const selected=['market','steel','prodcalc','prodcalc-new','nesting'].includes(this.route)?'tools':this.route;
    const ownerMenu=isOwner();
    const groups=ownerMenu?[['Super admin',OWNER_GROUPS[0][1]],...GROUPS]:canSeeOwner()?[...GROUPS,['Owner view',OWNER_GROUPS[0][1]]]:GROUPS;
    return `<div class="o-side"><button type="button" class="o-brand o-side-brand" onclick="App.go('${ownerMenu?'owner':'dashboard'}')"><span class="o-brand-mark">AM</span><span>AMBS</span></button>
      <nav class="o-side-nav" aria-label="Main navigation">${groups.map(([group,rows])=>`<div class="o-side-group"><div class="o-side-head">${esc(group)}</div>
        ${rows.map(([r,i])=>`<a href="#/${r}" class="o-side-link${selected===r?' on':''}"${selected===r?' aria-current="page"':''}
          onclick="event.preventDefault();App.go('${r}')">${ic(i)}<span>${esc(TITLES[r])}</span></a>`).join('')}</div>`).join('')}</nav>
      <div class="o-side-foot">${esc(SET.company)}${isOwner()?'<br><b class="o-owner-tag">Owner · super admin</b>':''}</div></div>`;
  },
  toggleNavigation(open){
    document.body.classList.toggle('nav-open',open);
    $('#nav-toggle')?.setAttribute('aria-expanded',String(open));
  },
  top(){
    const selected=['market','steel','prodcalc','prodcalc-new','nesting'].includes(this.route)?'tools':this.route;
    return `<nav class="o-navbar" aria-label="Top bar">
      <button type="button" id="nav-toggle" class="o-nav-toggle" aria-label="Open menu" aria-controls="sidebar" aria-expanded="false"
        onclick="App.toggleNavigation(!document.body.classList.contains('nav-open'))">${ic('list')}</button>
      <div class="o-gsearch" role="search">${ic('search')}<input id="o-gsearch-input" type="search" autocomplete="off" spellcheck="false"
        placeholder="Search menus and records…" aria-label="Search menus and records" aria-controls="o-gs-results"><kbd>/</kbd>
        <div class="o-gs-results" id="o-gs-results" role="listbox" hidden></div></div>
      <div class="o-nav-right">
        <button class="o-nav-btn" onclick="refreshCloudWorkspace(true)" title="Refresh">${ic('refresh')}</button>
        ${CLOUD.demo?'':'<button class="o-nav-btn" onclick="CLOUD.signOut()">Sign out</button>'}
        <div class="clock" id="clock"></div>
        <div class="avatar" title="${esc(CLOUD.email||'')}">${esc((CLOUD.email||'U').slice(0,1).toUpperCase())}</div>
      </div></nav>`;
  },
  back(){this.record=null;this.editing=false;this.render();window.scrollTo(0,0);},
  discard(){this.editing=false;this.render();window.scrollTo(0,0);},
  render(){
    $('#sidebar').innerHTML=this.nav();
    $('#topbar').innerHTML=this.top();wireGlobalSearch();
    const screens={dashboard,tracking:trackingPage,drivers:driversPage,deliveries:deliveriesPage,sales:salesPage,production:productionPage,purchase:purchasingPage,movement:inventoryPage,
      dispatch:dispatchPage,reports:reportPage,settings:settingsPage,bom:recipePage,tools:toolsPage,
      owner:ownerPage,team:teamPage,items:itemsPage};
    if(['owner','team','items'].includes(this.route)&&!canSeeOwner())this.route='dashboard';
    const utilities={steel:Tools,market:Market,prodcalc:PWC,nesting:Nest};
    const utility=utilities[this.route];
    const view=$('#view');
    if(this.route==='prodcalc-new'){view.innerHTML=PWC.builder();PWC.wire();}
    else if(utility){view.innerHTML=utility.render();utility.after?.();}
    else view.innerHTML=ENTITY[this.route]?masterPage(this.route):(screens[this.route]||dashboard)();
    if(this.record){
      // Odoo-style record page: the list stays one breadcrumb click away
      this.recordRendering=true;
      try{window[this.record.fn].orig.apply(null,this.record.args);}catch(e){this.record=null;view.innerHTML=ENTITY[this.route]?masterPage(this.route):(screens[this.route]||dashboard)();}
      finally{this.recordRendering=false;}
    }
    document.body.classList.toggle('o-record',!!this.record);
    startClock();
  }
};
/* Views opened from a page become full record pages (breadcrumb back to the list); from inside a dialog they stay dialogs. */
for(const fn of ['masterView','companyView','driverView','tripView','recipeView','trackItem','salesView','purchaseView','dispatchView',
  'orderView','planView','eventView','variantsView','locationView']){
  const orig=window[fn];
  if(typeof orig!=='function')continue;
  window[fn]=function(...args){
    if(App.recordRendering||_modalStack)return orig.apply(this,args);
    App.record={fn,args};App.render();window.scrollTo(0,0);
  };
  window[fn].orig=orig;
}
/* Odoo-style lists: click anywhere on a row to open it. The row's own "View" button is hidden. */
const ROW_OPEN=/^(?:closeModal\(\);)?(?:recipeEdit|masterView|companyView|driverView|tripView|recipeView|trackItem|salesView|purchaseView|dispatchView|orderView|planView|eventView|locationView|variantsView)\(/;
function enhanceRows(root){
  root.querySelectorAll?.('tbody tr:not([data-open])').forEach(tr=>{
    const b=[...tr.querySelectorAll('button[onclick]')].find(x=>ROW_OPEN.test(x.getAttribute('onclick'))&&/^(View|Track|Open)\b/.test(x.textContent.trim()));
    tr.dataset.open=b?'1':'0';
    if(!b)return;
    tr.classList.add('o-row');b.classList.add('o-open');
    tr.addEventListener('click',e=>{if(!e.target.closest('a,button,label,input,select,textarea'))b.click();});
  });
}
/* ---------- Odoo-style list tools: click a header to sort, status filters, group by, pager ---------- */
const cellText=td=>td?(td.querySelector('.chip:last-of-type')?.textContent||td.textContent).trim():'';
const cellNum=t=>{const m=String(t).replace(/,/g,'').match(/^[−-]?\d+(\.\d+)?/);return m?Number(m[0].replace('−','-')):NaN;};
function listState(card){return card._ls||(card._ls={q:'',status:'',group:'',page:0,size:80,sort:null});}
function dataRows(card){return [...card.querySelectorAll('.tbl tbody tr')].filter(tr=>!tr.classList.contains('o-group')&&!(tr.children.length===1&&tr.firstElementChild.colSpan>1));}
function applyList(card){
  const ls=listState(card), tbody=card.querySelector('.tbl tbody');if(!tbody)return;
  tbody.querySelectorAll('tr.o-group').forEach(g=>g.remove());
  const rows=dataRows(card), query=searchKey(ls.q).split(' ').filter(Boolean);
  let shown=rows.filter(tr=>{
    const text=searchKey(tr.dataset.search||tr.textContent), words=text.split(' ');
    const okQ=query.every(token=>text.includes(token)||words.some(word=>word.startsWith(token)||(token.length>=4&&searchDistance(token,word)<=(token.length>=8?2:1))));
    const okS=!ls.status||card._statusCol==null||cellText(tr.children[card._statusCol])===ls.status;
    return okQ&&okS;
  });
  if(ls.sort){const {col,dir}=ls.sort;
    shown.sort((x,y)=>{const a=cellText(x.children[col]),b=cellText(y.children[col]),na=cellNum(a),nb=cellNum(b);
      return (Number.isFinite(na)&&Number.isFinite(nb)?na-nb:a.localeCompare(b,undefined,{numeric:true,sensitivity:'base'}))*dir;});}
  rows.forEach(tr=>tr.hidden=true);
  if(ls.group!==''){
    const col=+ls.group, groups=new Map();
    for(const tr of shown){const k=cellText(tr.children[col])||'—';if(!groups.has(k))groups.set(k,[]);groups.get(k).push(tr);}
    const cols=card.querySelectorAll('.tbl thead th').length;
    for(const [k,list] of groups){
      const g=document.createElement('tr');g.className='o-group';g.innerHTML=`<td colspan="${cols}"><span class="o-caret">▾</span> ${esc(k)} <span class="o-group-n">(${list.length})</span></td>`;
      g.onclick=()=>{const open=!g.classList.toggle('closed');list.forEach(tr=>tr.hidden=!open);g.querySelector('.o-caret').textContent=open?'▾':'▸';};
      tbody.append(g);list.forEach(tr=>{tbody.append(tr);tr.hidden=false;});
    }
  }else{
    shown.forEach(tr=>tbody.append(tr));
    const pages=Math.max(1,Math.ceil(shown.length/ls.size));ls.page=Math.min(ls.page,pages-1);
    shown.forEach((tr,i)=>{tr.hidden=i<ls.page*ls.size||i>=(ls.page+1)*ls.size;});
  }
  const legend=card.querySelector('.pill-legend');
  if(legend){
    const from=shown.length?ls.page*ls.size+1:0, to=Math.min(shown.length,(ls.page+1)*ls.size);
    legend.innerHTML=ls.group===''&&shown.length>ls.size?`${from}-${to} / ${shown.length} <button type="button" class="o-pg" data-d="-1" aria-label="Previous page">‹</button><button type="button" class="o-pg" data-d="1" aria-label="Next page">›</button>`:
      `${shown.length} ${esc(query.length||ls.status?'matches':card.dataset.noun||'records')}`;
    legend.querySelectorAll('.o-pg').forEach(b=>b.onclick=()=>{ls.page=Math.max(0,ls.page+ +b.dataset.d);applyList(card);});
  }
  card.querySelectorAll('.tbl thead th').forEach((th,i)=>{th.classList.toggle('sorted',ls.sort?.col===i);th.classList.toggle('desc',ls.sort?.col===i&&ls.sort?.dir<0);});
}
function enhanceTables(root){
  const tables=root.matches?.('.tbl')?[root]:[...(root.querySelectorAll?.('.tbl')||[])];
  for(const tbl of tables){
    if(tbl.dataset.enhanced)continue;tbl.dataset.enhanced='1';
    const heads=[...tbl.querySelectorAll('thead th')].map(th=>th.textContent.trim());
    tbl.querySelectorAll('tbody tr').forEach(tr=>[...tr.children].forEach((td,i)=>{if(heads[i])td.dataset.label=heads[i];}));
    const card=tbl.closest('.card')||tbl.parentElement;
    const rows=dataRows(card);
    if(rows.length<2)continue;
    tbl.querySelectorAll('thead th').forEach((th,i)=>{
      if(!heads[i]||/^actions?$/i.test(heads[i]))return;
      th.classList.add('o-sortable');th.title='Sort by '+heads[i];
      th.onclick=()=>{const ls=listState(card);ls.sort=ls.sort?.col===i?{col:i,dir:-ls.sort.dir}:{col:i,dir:1};applyList(card);};
    });
    const toolbar=card.querySelector(':scope > .toolbar');
    if(!toolbar||!card.dataset.noun)continue;
    const statusCol=heads.findIndex(h=>/^(status|state)$/i.test(h));
    card._statusCol=statusCol<0?null:statusCol;
    const extra=document.createElement('div');extra.className='o-list-tools';
    if(statusCol>=0){
      const values=[...new Set(rows.map(tr=>cellText(tr.children[statusCol])).filter(Boolean))];
      if(values.length>1){
        const f=document.createElement('div');f.className='o-facets';
        f.innerHTML=['All',...values].map((v,i)=>`<button type="button" class="o-facet${i?'':' on'}" data-v="${esc(i?v:'')}">${esc(v)}</button>`).join('');
        f.onclick=e=>{const b=e.target.closest('.o-facet');if(!b)return;f.querySelectorAll('.o-facet').forEach(x=>x.classList.toggle('on',x===b));
          const ls=listState(card);ls.status=b.dataset.v;ls.page=0;applyList(card);};
        extra.append(f);
      }
    }
    const groupable=heads.map((h,i)=>[h,i]).filter(([h,i])=>{if(!h||/^actions?$/i.test(h))return false;
      const vals=new Set(rows.map(tr=>cellText(tr.children[i])));return vals.size>1&&vals.size<=20&&(rows.length<=3||vals.size<rows.length)&&![...vals].every(v=>v==='—'||Number.isFinite(cellNum(v)));});
    if(groupable.length){
      const s=document.createElement('select');s.className='sel o-groupby';s.setAttribute('aria-label','Group by');
      s.innerHTML='<option value="">Group by…</option>'+groupable.map(([h,i])=>`<option value="${i}">${esc(h)}</option>`).join('');
      s.onchange=()=>{const ls=listState(card);ls.group=s.value;ls.page=0;applyList(card);};
      extra.append(s);
    }
    if(extra.children.length)toolbar.querySelector('.search')?.after(extra);
    if(rows.length>listState(card).size)applyList(card);
  }
}
new MutationObserver(list=>{for(const m of list)for(const n of m.addedNodes)if(n.nodeType===1){enhanceRows(n);enhanceTables(n);}})
  .observe(document.documentElement,{childList:true,subtree:true});
// small screens: tapping outside the open sidebar closes it
document.addEventListener('click',e=>{
  if(document.body.classList.contains('nav-open')&&!e.target.closest('#sidebar,#nav-toggle'))App.toggleNavigation(false);
});
window.addEventListener('DOMContentLoaded',()=>CLOUD.start());
window.addEventListener('hashchange',()=>{
  const r=location.hash.slice(2);
  if(state&&TITLES[r]&&App.route!==r)App.go(r);
});
window.addEventListener('keydown',e=>{
  if(e.key==='Escape'&&!e.defaultPrevented){
    if(_modalStack)closeModal();
    else App.toggleNavigation(false);
  }
});
window.addEventListener('unhandledrejection',e=>{
  toast(e.reason?.message||'An operation could not be completed.','bad');
});
