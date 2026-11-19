import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import ts from "typescript";

const source=readFileSync(new URL('../lib/api.ts',import.meta.url),'utf8');
const compiled=ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ES2020,module:ts.ModuleKind.ESNext}}).outputText;
let sequence=0;
async function setup(run){
  const previousFetch=globalThis.fetch,previousWindow=globalThis.window,redirects=[];
  globalThis.window={location:{replace:path=>redirects.push(path)}};
  const api=await import('data:text/javascript;base64,'+Buffer.from(compiled+'\n// isolated module '+sequence++).toString('base64'));
  try{await run(api,redirects);}finally{globalThis.fetch=previousFetch;if(previousWindow===undefined)delete globalThis.window;else globalThis.window=previousWindow;}
}
const json=(value,status=200)=>Response.json(value,{status});
function deferred(){let resolve;const promise=new Promise(r=>{resolve=r;});return {promise,resolve};}

test('sign out aborts pending dashboard reads before logout is sent',()=>setup(async({api},redirects)=>{
  const signals=[];
  globalThis.fetch=async(url,options)=>{
    if(url==='/api/auth/csrf')return json({csrf_token:'synthetic-token'});
    if(url==='/api/auth/logout'){assert.ok(signals.every(s=>s.aborted));return json({ok:true});}
    return new Promise((resolve,reject)=>{signals.push(options.signal);options.signal.addEventListener('abort',()=>reject(options.signal.reason),{once:true});});
  };
  const first=assert.rejects(api('/dashboard'),e=>e.name==='AbortError');
  const second=assert.rejects(api('/dashboard'),e=>e.name==='AbortError');
  await api('/auth/logout',{method:'POST'});
  await Promise.all([first,second]);
  assert.equal(signals.length,2);assert.deepEqual(redirects,[]);
}));

test('new dashboard reads are cancelled while sign out is pending',()=>setup(async({api})=>{
  const started=deferred(),finish=deferred();let dashboardFetches=0;
  globalThis.fetch=async(url)=>{
    if(url==='/api/auth/csrf')return json({csrf_token:'synthetic-token'});
    if(url==='/api/auth/logout'){started.resolve();return finish.promise;}
    dashboardFetches++;return json({cards:[]});
  };
  const logout=api('/auth/logout',{method:'POST'});await started.promise;
  await assert.rejects(api('/dashboard'),e=>e.name==='AbortError');
  assert.equal(dashboardFetches,0);finish.resolve(json({ok:true}));await logout;
  assert.deepEqual(await api('/dashboard'),{cards:[]});assert.equal(dashboardFetches,1);
}));

test('genuine dashboard authentication failures still redirect and reject',()=>setup(async({api,ApiError},redirects)=>{
  globalThis.fetch=async()=>json({error:{code:'AUTHENTICATION_REQUIRED',message:'Please sign in'}},401);
  await assert.rejects(api('/dashboard'),e=>e instanceof ApiError&&e.status===401);
  assert.deepEqual(redirects,['/unauthorized']);
}));

test('failed logout restores dashboard availability and preserves the error',()=>setup(async({api,ApiError},redirects)=>{
  globalThis.fetch=async(url)=>url==='/api/auth/csrf'?json({csrf_token:'synthetic-token'}):url==='/api/auth/logout'?json({error:{code:'CSRF_REJECTED',message:'Refresh and retry'}},403):json({cards:[]});
  await assert.rejects(api('/auth/logout',{method:'POST'}),e=>e instanceof ApiError&&e.code==='CSRF_REJECTED');
  assert.deepEqual(await api('/dashboard'),{cards:[]});assert.deepEqual(redirects,[]);
}));

test('logout does not cancel unrelated requests',()=>setup(async({api})=>{
  const finish=deferred();let signal;
  globalThis.fetch=async(url,options)=>{
    if(url==='/api/reports'){signal=options.signal;return finish.promise;}
    return json(url==='/api/auth/csrf'?{csrf_token:'synthetic-token'}:{ok:true});
  };
  const report=api('/reports');await api('/auth/logout',{method:'POST'});
  assert.equal(signal.aborted,false);finish.resolve(json({items:[]}));assert.deepEqual(await report,{items:[]});
}));

test('durable reviews are cancelled before logout and remain blocked until a new login',()=>setup(async({api},redirects)=>{
  const signals=[];let reads=0;
  globalThis.fetch=async(url,options)=>{
    if(url==='/api/auth/csrf')return json({csrf_token:'synthetic-token'});
    if(url==='/api/auth/logout'){assert.ok(signals.every(s=>s.aborted));return json({ok:true});}
    if(url==='/api/auth/login')return json({ok:true});
    reads++;return new Promise((resolve,reject)=>{signals.push(options.signal);options.signal.addEventListener('abort',()=>reject(options.signal.reason),{once:true});});
  };
  const read=assert.rejects(api('/onboarding/review/sources?offset=0'),e=>e.name==='AbortError');
  await api('/auth/logout',{method:'POST'});await read;
  await assert.rejects(api('/onboarding/review/sources'),e=>e.name==='AbortError');
  assert.equal(reads,1);assert.deepEqual(redirects,[]);
  await api('/auth/login',{method:'POST'});
  globalThis.fetch=async()=>json({sources:[]});
  assert.deepEqual(await api('/onboarding/review/sources'),{sources:[]});
}));

test('late durable-review 401 cannot override successful logout navigation',()=>setup(async({api},redirects)=>{
  const body=deferred();
  globalThis.fetch=async(url)=>url==='/api/auth/csrf'?json({csrf_token:'synthetic-token'}):url==='/api/auth/logout'?json({ok:true}):{ok:false,status:401,json:()=>body.promise};
  const read=assert.rejects(api('/onboarding/review/sources'),e=>e.name==='AbortError');
  await api('/auth/logout',{method:'POST'});body.resolve({error:{code:'AUTHENTICATION_REQUIRED'}});await read;
  assert.deepEqual(redirects,[]);
}));

test('genuine durable-review 401 still rejects and redirects',()=>setup(async({api,ApiError},redirects)=>{
  globalThis.fetch=async()=>json({error:{code:'AUTHENTICATION_REQUIRED',message:'Please sign in'}},401);
  await assert.rejects(api('/onboarding/review/sources'),e=>e instanceof ApiError&&e.status===401);
  assert.deepEqual(redirects,['/unauthorized']);
}));

test('failed logout restores durable-review availability',()=>setup(async({api,ApiError})=>{
  globalThis.fetch=async(url)=>url==='/api/auth/csrf'?json({csrf_token:'synthetic-token'}):url==='/api/auth/logout'?json({error:{code:'CSRF_REJECTED',message:'Refresh and retry'}},403):json({sources:[]});
  await assert.rejects(api('/auth/logout',{method:'POST'}),e=>e instanceof ApiError&&e.status===403);
  assert.deepEqual(await api('/onboarding/review/sources'),{sources:[]});
}));
