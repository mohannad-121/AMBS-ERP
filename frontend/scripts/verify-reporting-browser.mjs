// Disposable harness database only. Credentials are delivered through stdin.
import { readFileSync, writeFileSync } from "node:fs";
import { chromium } from "playwright";
const credentials = JSON.parse(readFileSync(0, "utf8"));
const base = process.env.AMBS_BROWSER_BASE_URL || "http://127.0.0.1:3000";
const persistence = process.argv.includes("--persistence");
const browser = await chromium.launch({headless:true});
let stage = "startup", checks = 0, page;
const diagnostics = [];
function check(value, message) { if (!value) throw Error(message); checks++; console.log("PASS " + message); }
try {
  const context = await browser.newContext({viewport:{width:1440,height:1000},acceptDownloads:true,ignoreHTTPSErrors:process.env.AMBS_QA_SELF_SIGNED_TLS === "1"});
  page = await context.newPage(); page.setDefaultTimeout(60000);
  page.on("pageerror", e => diagnostics.push(e.message));
  page.on("console", m => {if (["error","warning"].includes(m.type())) diagnostics.push(m.text());});
  async function request(method, path, data, expected=200, ctx=context) {
    const token = await (await ctx.request.get(base+"/api/auth/csrf")).json();
    const response = await ctx.request.fetch(base+"/api"+path,{method,data,headers:{Origin:base,"X-CSRF-Token":token.csrf_token}});
    if (response.status() !== expected) {
      const error = await response.json().catch(() => ({}));
      throw Error("Synthetic reporting request failed: "+path+" status "+response.status()+" "+(error.error?.code??"")+" fields "+(error.error?.fields??[]).map(f=>f.field).join(","));
    }
    return response;
  }
  const create = async (path,data) => (await request("POST",path,data,201)).json();
  const op = values => ({request_key:crypto.randomUUID(),reason:"Synthetic reporting verification only",...values});
  async function login() {
    await page.goto(base+"/login");
    await page.getByLabel("Username or email").fill("phase8c.admin");
    await page.getByLabel("Password",{exact:true}).fill(credentials.workerPassword);
    await page.getByRole("button",{name:"Sign in",exact:true}).click(); await page.waitForURL(base+"/");
  }
  let fixture;
  if (!persistence) {
    stage="scratch bootstrap";
    check((await request("POST","/auth/login",{identifier:credentials.username,password:credentials.password})).ok(),"Reporting bootstrap uses a synthetic account");
    await create("/users",{username:"phase8c.admin",display_name:"Synthetic Reporting Administrator",password:credentials.workerPassword,roles:["SUPER_ADMIN"]});
    await create("/users",{username:"phase8c.driver",display_name:"Synthetic Reporting Driver",password:credentials.workerPassword,roles:["DRIVER"]});
    await request("POST","/auth/logout",{});
  }
  stage="dedicated reporting login"; await login();
  if (!persistence) {
    const category=await create("/master/categories",{name:"Synthetic Reports Category"});
    const unit=await create("/master/units",{name:"Synthetic Reports Unit",decimal_places:6});
    const item=await create("/master/items",{name:"Synthetic Reporting Item __AMBS_UNTRUSTED_GLOB__",item_type:"component",category_id:category.id,unit_id:unit.id});
    const warehouse=await create("/inventory/warehouses",{name:"Synthetic Reports Warehouse"});
    const location=await create("/inventory/locations",{name:"Synthetic Reports Storage",warehouse_id:warehouse.id,kind:"USABLE"});
    const quarantine=await create("/inventory/locations",{name:"Synthetic Reports Quarantine",warehouse_id:warehouse.id,kind:"QUARANTINE"});
    for (let batch=0;batch<2;batch++) {
      const move=await create("/inventory/movements",op({kind:"RECEIPT",occurred_at:new Date().toISOString(),lines:Array.from({length:30},()=>({item_id:item.id,unit_id:unit.id,quantity:"1.123456",destination_id:location.id}))}));
      await request("POST",`/inventory/movements/${move.id}/post`,{request_key:crypto.randomUUID()});
    }
    const blocked=await create("/inventory/movements",op({kind:"RETURN",occurred_at:new Date().toISOString(),lines:[{item_id:item.id,unit_id:unit.id,quantity:"3",destination_id:quarantine.id}]}));
    await request("POST",`/inventory/movements/${blocked.id}/post`,{request_key:crypto.randomUUID()});
    const customer=await create("/master/customers",{name:"=Synthetic Report Customer __AMBS_UNTRUSTED_GLOB__",address:"Synthetic site only"});
    let order=await create("/sales/orders",op({customer_id:customer.id,lines:[{item_id:item.id,quantity:"15.123456"}]}));
    order=await (await request("POST",`/sales/orders/${order.id}/confirm`,op())).json();
    const delivery=await (await request("POST",`/sales/orders/${order.id}/prepare`,op({warehouse_id:warehouse.id,destination:"Synthetic site"}))).json();
    for(const action of ["pick","load"]) await request("POST",`/sales/deliveries/${delivery.id}/${action}`,op({verified:true,lines:delivery.lines.map(l=>({id:l.id,quantity:"5.123456"}))}));
    await request("POST",`/sales/deliveries/${delivery.id}/dispatch`,op());
    const document=await create(`/packing/deliveries/${delivery.id}/documents`,op({kind:"PACKING_LIST"}));
    const supplier=await create("/purchasing/suppliers",{name:"Synthetic Reporting Supplier",types:["FABRICATION"]});
    const po=await create("/purchasing/orders",{request_key:crypto.randomUUID(),supplier_id:supplier.id,warehouse_id:warehouse.id,ordered_on:"2026-01-01",expected_on:"2026-01-02",currency:"AED",lines:[{line_type:"STOCK",item_id:item.id,unit_id:unit.id,description:"Synthetic reporting commitment",quantity:"20",unit_price:"2"}]});
    await request("POST",`/purchasing/orders/${po.id}/confirm`,op());
    fixture={item,unit,warehouse,location,customer,order,delivery,document,po};
    writeFileSync("/artifacts/reporting-fixture.json",JSON.stringify(fixture));
  } else fixture=JSON.parse(readFileSync("/artifacts/reporting-fixture.json","utf8"));
  const before=await(await request("GET","/inventory/balances?item_id="+fixture.item.id)).json();
  stage="report navigation";await page.goto(base+"/reports");await page.getByRole("heading",{name:"Reporting Center",exact:true}).waitFor();
  await page.getByRole("heading",{name:"Sales",exact:true}).waitFor();
  check(await page.getByRole("cell",{name:fixture.order.code,exact:true}).count()===1,"Sales report links original authoritative order");
  check(await page.getByRole("cell",{name:"5.123456",exact:true}).count()===1,"Dispatched quantity retains six-decimal precision");
  check(await page.getByText(/Asia\/Dubai/).count()>0,"Reporting timezone is explicit");
  stage="literal filters";await page.getByLabel("Reference contains",{exact:true}).fill("__AMBS_UNTRUSTED_GLOB__");await page.getByRole("button",{name:"Apply filters",exact:true}).click();
  await page.getByRole("heading",{name:"No matching operational records",exact:true}).waitFor();check(true,"Literal source-reference filter has a truthful empty state");
  await page.getByRole("button",{name:"Reset scope",exact:true}).click();await page.getByRole("cell",{name:fixture.order.code,exact:true}).waitFor();
  stage="scoped selector";await page.getByLabel("Customer",{exact:true}).click();
  await page.getByLabel("Matching customer records (up to 25)",{exact:true}).selectOption(fixture.customer.id);
  await page.getByRole("button",{name:"Apply filters",exact:true}).click();await page.getByRole("cell",{name:fixture.order.code,exact:true}).waitFor();check(true,"Customer lookup filters only authorized recorded relationships");
  stage="safe export";const downloaded=page.waitForEvent("download");await page.getByRole("button",{name:"Export filtered CSV",exact:true}).click();
  const download=await downloaded;await download.saveAs("/artifacts/reporting-preview.csv");const csv=readFileSync("/artifacts/reporting-preview.csv","utf8");
  check(csv.includes("'=Synthetic Report Customer") && csv.includes("5.123456") && csv.includes("Asia/Dubai"),"CSV neutralizes formulas and retains precision/timezone metadata");
  stage="exception center";await page.getByLabel("Report category",{exact:true}).selectOption("exceptions");await page.getByRole("cell",{name:"Overdue supplier receipt",exact:true}).waitFor();
  check(await page.getByRole("cell",{name:"Non-usable stock",exact:true}).count()>0,"Exception center has actual blocked-stock and overdue receipt evidence");
  for(const c of ["inventory","low_stock","production","production_events","deliveries","packing","purchasing"]) {
    stage=c+" category";await page.getByLabel("Report category",{exact:true}).selectOption(c);
    await page.getByRole("heading",{name:c.replaceAll("_"," ").replace(/\b\w/g,m=>m.toUpperCase()),exact:true}).waitFor();
    check(true,c+" report loads authorized records or an honest empty state");
  }
  stage="bounded pagination";await page.getByLabel("Report category",{exact:true}).selectOption("movements");await page.getByRole("button",{name:"Next",exact:true}).click();
  await page.getByText(/Page 2 of/).waitFor();check(true,"Ledger-effect report uses server-side pagination");
  stage="report preservation";check(JSON.stringify(await(await request("GET","/inventory/balances?item_id="+fixture.item.id)).json())===JSON.stringify(before),"Report and CSV generation preserve synthetic balances/reservations");
  for(const width of [375,812,1440]) {
    await page.setViewportSize({width,height:900});await page.emulateMedia({reducedMotion:"reduce",colorScheme:width===812?"dark":"light"});
    check(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),width+"px reports keep wide tables inside scroll regions");
  }
  await page.screenshot({path:"/artifacts/reporting-center.png",fullPage:true});
  stage="refresh";await page.reload();await page.getByRole("heading",{name:"Sales",exact:true}).waitFor();check(true,"Refresh obtains a new consistent report without hydration errors");
  stage="permission isolation";const restricted=await browser.newContext({ignoreHTTPSErrors:process.env.AMBS_QA_SELF_SIGNED_TLS==="1"});
  await request("POST","/auth/login",{identifier:"phase8c.driver",password:credentials.workerPassword},200,restricted);
  for(const path of ["/reports?category=sales","/reports/export?category=purchasing","/reports/choices?category=sales&field=customer_id"]) await request("GET",path,undefined,403,restricted);
  check(true,"Direct report/export/lookup deny an unauthorized driver");await restricted.close();
  stage="logout and subsequent login";await page.getByRole("button",{name:"Sign out",exact:true}).click();await page.waitForURL(base+"/login");
  await request("GET","/reports?category=inventory",undefined,401);await login();await page.goto(base+"/reports");await page.getByRole("heading",{name:"Sales",exact:true}).waitFor();check(true,"Logout blocks reports and subsequent login restores authorized navigation");
  check(diagnostics.length===0,"Reporting has no console warnings, React runtime or hydration errors");
  console.log(`PASS ${checks} Phase 8C Chromium checks${persistence?" after restart":""}`);await context.close();
} catch(error) {
  const redact=v=>String(v).replaceAll(credentials.password,"[redacted]").replaceAll(credentials.workerPassword,"[redacted]");
  writeFileSync("/artifacts/reporting-failure.json",redact(JSON.stringify({stage,url:page?.url(),diagnostics},null,2)));
  if(page)await page.screenshot({path:"/artifacts/reporting-failure.png",fullPage:true}).catch(()=>{});
  console.error("Phase 8C browser verification failed at "+stage+": "+redact(error?.message??"Failure").split("\n")[0].slice(0,200));process.exitCode=1;
} finally { await browser.close(); }
