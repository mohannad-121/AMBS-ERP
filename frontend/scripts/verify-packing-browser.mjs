import { readFileSync, writeFileSync } from "node:fs";
import { chromium } from "playwright";
const credentials=JSON.parse(readFileSync(0,"utf8"));
const after=process.argv.includes("--after-premium"), persistence=process.argv.includes("--persistence");
const browser=await chromium.launch({headless:true});
const base=process.env.AMBS_BROWSER_BASE_URL || "http://127.0.0.1:3000";
let stage="startup", page, checks=0;
const diagnostics=[];
function check(value,label){if(!value)throw new Error(label);console.log("PASS "+label);checks++;}
try {
  const context=await browser.newContext({viewport:{width:1440,height:1000},acceptDownloads:true,ignoreHTTPSErrors:process.env.AMBS_QA_SELF_SIGNED_TLS === "1"});
  page=await context.newPage();page.setDefaultTimeout(60000);
  page.on("pageerror",e=>diagnostics.push(e.message));
  page.on("console",m=>{if(["warning","error"].includes(m.type()))diagnostics.push(m.text());});
  async function login(username,password){stage="login";await page.goto(base+"/login");await page.getByLabel("Username or email").fill(username);await page.getByLabel("Password",{exact:true}).fill(password);await page.getByRole("button",{name:"Sign in",exact:true}).click();await page.waitForURL(base+"/");await page.locator(".overview-label").waitFor();stage="workspace";}
  async function request(method,path,data,expected=200){const token=await(await context.request.get(base+"/api/auth/csrf")).json();const r=await context.request.fetch(base+"/api"+path,{method,data,headers:{Origin:base,"X-CSRF-Token":token.csrf_token}});if(r.status()!==expected)throw new Error(`Fixture ${method} ${path} status ${r.status()}`);return r.json();}
  const op=(values={})=>({request_key:crypto.randomUUID(),reason:"Synthetic Phase 7 verification only",...values});
  async function download(button,name){const pending=page.waitForEvent("download");await button.click();const d=await pending;check(!await d.failure(),name+" downloaded");await d.saveAs("/artifacts/"+name+".pdf");}
  await login(persistence?"phase7.admin":after?"phase6c.admin":credentials.username,persistence||after?credentials.workerPassword:credentials.password);
  let fixture;
  if(persistence){
    fixture=JSON.parse(readFileSync("/artifacts/fixture.json","utf8"));
    const doc=await request("GET",`/packing/documents/${fixture.doc}`);check(doc.sha256===fixture.sha256,"Issued PDF hash survives service restart");
    const plan=await request("GET",`/material-plans/${fixture.plan}`);check(plan.lines[0].required==="10.000000"&&plan.review,"Approved plan and review survive restart");
  } else {
    stage="synthetic fixtures";
    for(const role of ["SUPER_ADMIN","OPERATIONS","PACKING","MANAGEMENT","SALES","DRIVER","ACCOUNTS"]){await request("POST","/users",{username:role==="SUPER_ADMIN"?"phase7.admin":"phase7."+role.toLowerCase(),display_name:"Synthetic Phase 7 "+role,password:credentials.workerPassword,roles:[role]},201);}
    await page.getByRole("button",{name:"Sign out",exact:true}).click();await page.waitForURL(base+"/login");await login("phase7.admin",credentials.workerPassword);
    const unit=await request("POST","/master/units",{name:"Phase7 PCS",decimal_places:0},201);
    const category=await request("POST","/master/categories",{name:"Phase7 synthetic category"},201);
    const component=await request("POST","/master/items",{name:"Phase7 component",item_type:"component",category_id:category.id,unit_id:unit.id},201);
    const item=await request("POST","/master/items",{name:"Phase7 assembly",item_type:"finished",category_id:category.id,unit_id:unit.id},201);
    const customer=await request("POST","/master/customers",{name:"Phase7 synthetic customer",address:"Synthetic site"},201);
    const warehouse=await request("POST","/inventory/warehouses",{name:"Phase7 synthetic warehouse"},201);
    const location=await request("POST","/inventory/locations",{name:"Phase7 storage",warehouse_id:warehouse.id,kind:"USABLE"},201);
    for(const [id,quantity]of [[component.id,"6"],[item.id,"8"]]){const move=await request("POST","/inventory/movements",op({kind:"RECEIPT",occurred_at:new Date().toISOString(),lines:[{item_id:id,unit_id:unit.id,quantity,destination_id:location.id,unit_cost:"1",currency:"AED"}]}),201);await request("POST",`/inventory/movements/${move.id}/post`,op());}
    const source=await request("POST","/sales/orders",op({customer_id:customer.id,lines:[{item_id:item.id,quantity:"15"}]}),201);await request("POST",`/sales/orders/${source.id}/confirm`,op());
    const delivery=await request("POST",`/sales/orders/${source.id}/prepare`,op({warehouse_id:warehouse.id,destination:"Synthetic Phase 7 site"}));
    for(const action of ["pick","load"]){await request("POST",`/sales/deliveries/${delivery.id}/${action}`,op({verified:true,lines:delivery.lines.map(l=>({id:l.id,quantity:action==="pick"?"8":"6"}))}));}
    stage="draft PDF UI";await page.goto(base+`/packing?delivery=${delivery.id}`);await page.getByRole("heading",{name:"Packing & delivery documents"}).waitFor();
    await download(page.getByRole("button",{name:"Preview draft Packing List",exact:true}),"preparation-ui");
    await request("POST",`/sales/deliveries/${delivery.id}/dispatch`,op());
    await page.getByRole("button",{name:"Refresh documents",exact:true}).click();
    for(const kind of ["Packing List","Delivery Order"]){await page.getByRole("button",{name:"Issue "+kind,exact:true}).click();await page.getByLabel("Reason / authorization reference").fill("Synthetic document issue authorization");await page.getByRole("button",{name:"Confirm document action"}).click();await page.getByRole("dialog").waitFor({state:"hidden"});await download(page.getByRole("button",{name:`Download / reprint ${kind} R1`,exact:true}),kind==="Packing List"?"packing-ui":"delivery-ui");}
    const docs=await request("GET",`/packing/deliveries/${delivery.id}/documents`);check(docs.items.every(d=>d.snapshot.lines[0].dispatched==="6"),"Official PDFs use six loaded and actually dispatched units");
    stage="BOM definition UI";await page.goto(base+"/boms");await page.getByRole("button",{name:"New draft BOM",exact:true}).click();
    await page.getByLabel("Assembly item",{exact:true}).selectOption(item.id);await page.getByLabel("Engineering source / approval reference").fill("Synthetic approved mathematical specification");await page.getByLabel("Component 1",{exact:true}).selectOption(component.id);await page.getByLabel("Quantity (Phase7 PCS)",{exact:true}).fill("2");await page.getByLabel("Revision reason",{exact:true}).fill("Synthetic two per assembly definition");await page.getByRole("button",{name:"Save draft BOM",exact:true}).click();await page.getByRole("dialog").waitFor({state:"hidden"});
    await page.getByRole("button",{name:"Submit for approval",exact:true}).click();await page.getByLabel("Approval / action reason").fill("Synthetic management specification review");await page.getByRole("button",{name:"Confirm BOM action"}).click();await page.getByRole("dialog").waitFor({state:"hidden"});
    await page.getByRole("button",{name:"Approve definition",exact:true}).click();await page.getByRole("checkbox").check();await page.getByLabel("Approval / action reason").fill("Authorized synthetic test specification approval");await page.getByRole("button",{name:"Confirm BOM action"}).click();await page.getByRole("dialog").waitFor({state:"hidden"});
    check((await request("GET",`/boms?item_id=${item.id}`)).items[0].status==="APPROVED","UI approval activates the reviewed BOM only");
    const demand=await request("POST","/sales/orders",op({customer_id:customer.id,lines:[{item_id:item.id,quantity:"5"}]}),201);await request("POST",`/sales/orders/${demand.id}/confirm`,op());
    stage="material planning UI";await page.goto(base+`/material-plans?sales=${demand.id}`);await page.getByRole("button",{name:"Calculate material plan",exact:true}).click();await page.getByLabel("Source order",{exact:true}).selectOption(demand.id);await page.getByLabel("Calculation reason").fill("Synthetic requirement and shortage verification");await page.getByRole("button",{name:"Calculate snapshot",exact:true}).click();await page.getByRole("dialog").waitFor({state:"hidden"});await page.getByRole("heading",{name:/PARTIALLY AVAILABLE/}).waitFor();
    await page.getByRole("button",{name:"Review current plan",exact:true}).click();await page.getByLabel("Review reason").fill("Synthetic reviewed shortage of four components");await page.getByRole("button",{name:"Confirm plan review",exact:true}).click();await page.getByRole("dialog").waitFor({state:"hidden"});
    const plans=await request("GET",`/material-plans?sales_order_id=${demand.id}`);const plan=await request("GET",`/material-plans/${plans.items[0].id}`);check(plan.lines[0].required==="10.000000"&&plan.lines[0].shortage==="4.000000"&&plan.review,"UI plan uses approved demand, stock and review");
    fixture={delivery:delivery.id,doc:docs.items[0].id,sha256:docs.items[0].sha256,plan:plan.id,item:item.id};writeFileSync("/artifacts/fixture.json",JSON.stringify(fixture));
    for(const role of ["packing","operations","management","sales","driver","accounts"]){
      stage="role "+role;const roleContext=await browser.newContext({ignoreHTTPSErrors:process.env.AMBS_QA_SELF_SIGNED_TLS === "1"});const csrf=await(await roleContext.request.get(base+"/api/auth/csrf")).json();const r=await roleContext.request.post(base+"/api/auth/login",{data:{identifier:"phase7."+role,password:credentials.workerPassword},headers:{Origin:base,"X-CSRF-Token":csrf.csrf_token}});check(r.ok(),role+" isolated login");
      const result=await roleContext.request.get(base+`/api/packing/documents/${fixture.doc}`);check(result.status()===(role==="driver"?404:role==="accounts"?403:200),role+" document access bound to permissions and assignment");await roleContext.close();
    }
  }
  stage="navigation and responsive verification";
  for(const width of [1440,390,360]){
    await page.setViewportSize({width,height:1000});
    for(const path of [`/packing?delivery=${fixture.delivery}`,`/boms?item=${fixture.item}`,`/material-plans?id=${fixture.plan}`]){await page.goto(base+path);await page.locator("h1").waitFor();await page.getByRole("status").filter({hasText:/Loading/}).waitFor({state:"hidden"}).catch(()=>{});check(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),width+"px "+path.split("?")[0]+" has no page overflow");await page.screenshot({path:`/artifacts/${path.split("?")[0].slice(1)}-${width}.png`,fullPage:true});}
  }
  await page.reload();await page.getByRole("heading",{name:/PARTIALLY AVAILABLE/}).waitFor();
  await page.getByRole("button",{name:"Sign out",exact:true}).click();await page.waitForURL(base+"/login");await login("phase7.admin",credentials.workerPassword);
  check(diagnostics.length===0,"No console warnings, React errors or hydration errors");
  console.log(`PASS ${checks} Phase 7 Chromium checks${persistence?" after restart":""}`);
  await context.close();
}catch(error){let message=String(error.message).split("\n")[0];for(const secret of [credentials.password,credentials.workerPassword])if(secret)message=message.replaceAll(secret,"[redacted]");console.error(`Phase 7 ${stage}: ${message}`);if(stage!=="login"&&page)await page.screenshot({path:"/artifacts/failure.png",fullPage:true}).catch(()=>{});process.exitCode=1;}finally{await browser.close();}
