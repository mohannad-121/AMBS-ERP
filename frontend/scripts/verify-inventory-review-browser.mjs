import { readFileSync, writeFileSync } from "node:fs";
import { chromium } from "playwright";
const credentials=JSON.parse(readFileSync(0,"utf8"));
const base=process.env.AMBS_BROWSER_BASE_URL || "http://127.0.0.1:3000";
const persistence=process.argv.includes("--persistence");
const browser=await chromium.launch({headless:true});
let stage="startup",checks=0,failurePage;const diagnostics=[],networkFailures=[];
function check(value,name){if(!value)throw Error(name);checks++;console.log("PASS "+name);}
try {
 const context=await browser.newContext({viewport:{width:1440,height:1000},acceptDownloads:true,ignoreHTTPSErrors:process.env.AMBS_QA_SELF_SIGNED_TLS==="1"});
 const page=await context.newPage();page.setDefaultTimeout(60000);
 failurePage=page;
 page.on("pageerror",e=>diagnostics.push(e.message));page.on("console",m=>{if(["error","warning"].includes(m.type()))diagnostics.push(m.text());});
 page.on("requestfailed",r=>networkFailures.push({path:new URL(r.url()).pathname,error:r.failure()?.errorText}));
 page.on("response",r=>{if(r.status()>=500)networkFailures.push({path:new URL(r.url()).pathname,status:r.status()});});
 async function login(){await page.goto(base+"/login");await page.getByLabel("Username or email").fill("phase8b.admin");await page.getByLabel("Password",{exact:true}).fill(credentials.workerPassword);await page.getByRole("button",{name:"Sign in",exact:true}).click();await page.waitForURL(base+"/");}
 async function request(method,path,data,expected=200,ctx=context){const token=await(await ctx.request.get(base+"/api/auth/csrf")).json();const r=await ctx.request.fetch(base+"/api"+path,{method,data,headers:{Origin:base,"X-CSRF-Token":token.csrf_token}});if(r.status()!==expected)throw Error("Synthetic fixture request failed: "+path+" status "+r.status());return r;}
 if(!persistence){
  // Bootstrap a dedicated generated administrator in the harness's scratch DB only.
  const token=await(await context.request.get(base+"/api/auth/csrf")).json();
  check((await context.request.post(base+"/api/auth/login",{data:{identifier:credentials.username,password:credentials.password},headers:{Origin:base,"X-CSRF-Token":token.csrf_token}})).ok(),"Scratch administrator bootstrap session");
  await request("POST","/users",{username:"phase8b.admin",display_name:"Synthetic Phase8B Administrator",password:credentials.workerPassword,roles:["SUPER_ADMIN"]},201);
  await request("POST","/auth/logout",{});
 }
 stage="dedicated synthetic login";await login();
 let fixture;
 if(!persistence){
  stage="synthetic inventory fixtures";
  const create=async(path,body)=>(await request("POST",path,body,201)).json();
  const category=await create("/master/categories",{name:"Synthetic Review Category"});
  const unit=await create("/master/units",{name:"Synthetic Review Units",decimal_places:0});
  const item=await create("/master/items",{name:"Synthetic Review Item __AMBS_UNTRUSTED_GLOB__",item_type:"component",category_id:category.id,unit_id:unit.id});
  const warehouse=await create("/inventory/warehouses",{name:"Synthetic Review Warehouse"});
  const location=await create("/inventory/locations",{name:"Synthetic Review Storage",warehouse_id:warehouse.id,kind:"USABLE"});
  const movement=await create("/inventory/movements",{request_key:crypto.randomUUID(),kind:"RECEIPT",reason:"Synthetic browser stock evidence only",occurred_at:new Date().toISOString(),source_reference:"Synthetic Review Receipt",lines:[{item_id:item.id,unit_id:unit.id,quantity:"50",destination_id:location.id}]});
  await request("POST",`/inventory/movements/${movement.id}/post`,{request_key:crypto.randomUUID()});
  await create("/inventory/reservations",{request_key:crypto.randomUUID(),item_id:item.id,location_id:location.id,quantity:"10",reason:"Synthetic review reservation only"});
  fixture={item,unit,warehouse,location,movement};writeFileSync("/artifacts/review-fixture.json",JSON.stringify(fixture));
 }else fixture=JSON.parse(readFileSync("/artifacts/review-fixture.json","utf8"));
 const before=await(await request("GET","/inventory/balances?item_id="+fixture.item.id)).json();
 stage="reconciliation UI";await page.goto(base+"/inventory-reconciliation");await page.getByRole("heading",{name:"Inventory Reconciliation",exact:true}).waitFor();
 await page.getByLabel("Item",{exact:true}).selectOption(fixture.item.id);
 await page.getByRole("button",{name:"Preview count: "+fixture.item.name,exact:true}).click();
 await page.getByLabel("Counted quantity ("+fixture.unit.name+")",{exact:true}).fill("40");
 await page.getByRole("button",{name:"Compare count preview",exact:true}).click();await page.getByRole("heading",{name:"SHORTAGE",exact:true}).waitFor();
 check(await page.getByText(/Expected 50.*Counted 40.*Difference -10/).count()>0,"Physical proposal compares with signed ledger without posting");
 check(await page.getByText(/Supporting movements/).last().textContent().then(t=>t.includes(fixture.movement.code)),"Reconciliation exposes authoritative supporting reference");
 stage="independent item journey";await page.goto(base+"/item-journey?item="+fixture.item.id);await page.getByRole("cell",{name:"Received",exact:true}).waitFor();
 check(await page.getByRole("cell",{name:"Reserved",exact:true}).count()===1,"Global journey works without a delivery and includes reservations");
 await page.getByLabel("Movement or event type",{exact:true}).selectOption("Received");await page.getByRole("cell",{name:"Reserved",exact:true}).waitFor({state:"detached"});await page.getByRole("cell",{name:"Received",exact:true}).waitFor();
 check(await page.getByRole("cell",{name:"Received",exact:true}).count()===1,"Event type filter narrows authoritative history");
 await page.getByLabel("Search events and references",{exact:true}).fill("does-not-exist");await page.getByText(/No recorded events match/).waitFor();check(true,"Literal event search has an honest empty state");
 await page.getByLabel("Search events and references",{exact:true}).fill("");await page.getByRole("cell",{name:"Received",exact:true}).waitFor();
 check(JSON.stringify(await(await request("GET","/inventory/balances?item_id="+fixture.item.id)).json())===JSON.stringify(before),"Count and global history preserve synthetic balances/reservations");
 if(!persistence){
  stage="file reconciliation and export";await page.goto(base+"/imports");await page.getByLabel("Import category",{exact:true}).selectOption("physical_stock");
  const source=`SKU,Unit,Warehouse,Location,Quantity\n${fixture.item.code},${fixture.unit.name},${fixture.warehouse.name},${fixture.location.name},40\n=__AMBS_UNTRUSTED_GLOB__,${fixture.unit.name},${fixture.warehouse.name},${fixture.location.name},1\n`;
  await page.getByLabel("Excel or CSV source").setInputFiles({name:"synthetic-review.csv",mimeType:"text/csv",buffer:Buffer.from(source)});
  await page.getByRole("button",{name:"Reconcile against ERP (preview only)",exact:true}).click();await page.getByRole("heading",{name:"Physical stock reconciliation — no posting",exact:true}).waitFor();
  check(await page.getByText("SHORTAGE",{exact:true}).count()===1 && await page.getByText("INVALID",{exact:true}).count()===1,"Source SKU failure remains visible beside valid shortage comparison");
  const download=page.waitForEvent("download");await page.getByRole("button",{name:"Export validation report (CSV)",exact:true}).click();const saved=await download;await saved.saveAs("/artifacts/reconciliation-preview.csv");
  check(readFileSync("/artifacts/reconciliation-preview.csv","utf8").includes("Expected (ledger)"),"CSV export contains reconciliation evidence and no posting");
 }
 for(const width of [375,812]){
  await page.goto(base+"/item-journey?item="+fixture.item.id);await page.getByRole("cell",{name:"Received",exact:true}).waitFor();await page.setViewportSize({width,height:width===812?375:900});await page.emulateMedia({reducedMotion:"reduce",colorScheme:"dark"});
  check(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),width+"px review has no page overflow");
 }
 stage="responsive screenshot";await page.screenshot({path:"/artifacts/item-journey.png",fullPage:true});
 stage="page refresh";
 await page.reload();await page.getByRole("cell",{name:"Received",exact:true}).waitFor();check(true,"Direct item link and reload preserve selected item");
 stage="logout";await page.getByRole("button",{name:"Sign out",exact:true}).click();await page.waitForURL(base+"/login");
 check((await context.request.get(base+"/api/inventory/journey/"+fixture.item.id)).status()===401,"Global history requires an authenticated session");
 stage="subsequent login";await login();await page.goto(base+"/inventory-reconciliation");await page.getByRole("heading",{name:"Inventory Reconciliation",exact:true}).waitFor();check(true,"Logout and subsequent login preserve review navigation");
 check(diagnostics.length===0,"No console warnings, React runtime or hydration errors");
 console.log(`PASS ${checks} Phase 8B Chromium checks${persistence?" after restart":""}`);await context.close();
}catch(error){
 const redact=value=>String(value).replaceAll(credentials.password,"[redacted]").replaceAll(credentials.workerPassword,"[redacted]");
 writeFileSync("/artifacts/review-failure.json",redact(JSON.stringify({stage,url:failurePage?.url(),diagnostics,networkFailures},null,2)));
 if(failurePage)await failurePage.screenshot({path:"/artifacts/review-failure.png",fullPage:true}).catch(()=>{});
 console.error("Phase 8B browser verification failed at "+stage+": "+redact(error?.message??"Failure").split("\n")[0].slice(0,200));process.exitCode=1;}
finally{await browser.close();}
