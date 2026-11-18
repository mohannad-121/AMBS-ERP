import { readFileSync, writeFileSync } from "node:fs";
import { chromium } from "playwright";
const credentials = JSON.parse(readFileSync(0, "utf8"));
const base = process.env.AMBS_BROWSER_BASE_URL || "http://127.0.0.1:3000";
const persistence = process.argv.includes("--persistence");
const browser = await chromium.launch({ headless: true });
let stage = "startup", checks = 0;
const diagnostics = [];
let username = persistence ? "phase8a.admin" : credentials.username;
let password = persistence ? credentials.workerPassword : credentials.password;
function check(value, name) { if (!value) throw new Error(name); checks++; console.log("PASS " + name); }
try {
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, acceptDownloads: true, ignoreHTTPSErrors: process.env.AMBS_QA_SELF_SIGNED_TLS === "1" });
  const page = await context.newPage(); page.setDefaultTimeout(60000);
  page.on("pageerror", error => diagnostics.push(error.message));
  page.on("console", message => { if (["error", "warning"].includes(message.type())) diagnostics.push(message.text()); });
  async function login() {
    stage = "synthetic administrator login"; await page.goto(base + "/login");
    await page.getByLabel("Username or email").fill(username); await page.getByLabel("Password", { exact: true }).fill(password);
    await page.getByRole("button", { name: "Sign in", exact: true }).click(); await page.waitForURL(base + "/");
  }
  async function request(method, path, data, expected = 200) {
    const token = await (await context.request.get(base + "/api/auth/csrf")).json();
    const response = await context.request.fetch(base + "/api" + path, { method, data, headers: { Origin: base, "X-CSRF-Token": token.csrf_token } });
    if (response.status() !== expected) throw new Error("Synthetic fixture request failed");
    return response;
  }
  await login(); stage = "onboarding preview";
  await page.goto(base + "/imports"); await page.getByRole("heading", { name: "Import Center", exact: true }).waitFor();
  check(await page.getByText("PREVIEW ONLY — NO DATA HAS BEEN IMPORTED", { exact: true }).isVisible(), "Preview-only boundary is prominent");
  check(await page.getByRole("button", { name: /^(import|final import|execute import|commit import)$/i }).count() === 0, "No final-import action exists");
  if (persistence) {
    const fixture = JSON.parse(readFileSync("/artifacts/onboarding-fixture.json", "utf8"));
    const repeated = await (await request("POST", "/onboarding/validate", fixture.payload)).json();
    check(JSON.stringify(repeated) === JSON.stringify(fixture.result), "Identical preview can be resubmitted after service restart");
    check(await page.getByLabel("Excel or CSV source").inputValue() === "", "Fresh browser retains no private source file");
  } else {
    // Baseline auth checks deliberately consume the fixture identity's attempt
    // budget. Use a separate synthetic administrator, preserving real limits.
    await request("POST", "/users", { username: "phase8a.admin", display_name: "Synthetic Onboarding Administrator", password: credentials.workerPassword, roles: ["SUPER_ADMIN"] }, 201);
    await page.getByRole("button", { name: "Sign out", exact: true }).click(); await page.waitForURL(base + "/login");
    username = "phase8a.admin"; password = credentials.workerPassword; await login();
    await page.goto(base + "/imports"); await page.getByRole("heading", { name: "Import Center", exact: true }).waitFor(); stage = "onboarding preview";
    await request("POST", "/master/customers", { name: "Synthetic Existing", email: "existing@example.com" }, 201);
    const countBefore = (await (await request("GET", "/master/customers")).json()).total;
    const inventoryBefore = await (await request("GET", "/inventory/overview")).json();
    const source = "Customer Name,Email\n  Synthetic Existing  ,existing@example.com\nSynthetic Existing,duplicate@example.com\nSynthetic Existingg,spelling@example.com\nشركة تجريبية,arabic@example.com\n=1+1,formula@example.com\n__AMBS_UNTRUSTED_GLOB__*?[qa],glob@example.com\n";
    await page.getByLabel("Excel or CSV source").setInputFiles({ name: "synthetic-customers.csv", mimeType: "text/csv", buffer: Buffer.from(source) });
    await page.getByRole("heading", { name: "2. Confirm headers and map columns" }).waitFor();
    check(await page.getByLabel("Worksheet", { exact: true }).inputValue() === "0", "Sheet detection and source inspection complete");
    check(await page.getByLabel("name (required)", { exact: true }).inputValue() === "A", "Suggested mapping uses explicit source column identity");
    await page.getByRole("button", { name: "Validate preview", exact: true }).click();
    await page.getByRole("heading", { name: "3. Review the dry run" }).waitFor();
    check(await page.getByText("0 records imported. 0 stock ledger changes.", { exact: true }).isVisible(), "Dry run reports zero business and ledger mutations");
    check(await page.getByText(/A formula is present/).count() > 0, "Formula cells require correction instead of evaluation");
    check(await page.getByText(/Possible duplicate of source row/).count() > 0, "Duplicate source records are explained");
    check(await page.getByText(/similar customer spelling/).count() > 0, "Possible spelling variation is flagged for review");
    check(await page.getByText("شركة تجريبية", { exact: true }).count() > 0, "Unicode source and proposed values remain readable");
    const payload = { category: "customers", filename: "synthetic-customers.csv", content_base64: Buffer.from(source).toString("base64"), sheet: 0, header_row: 1, header_span: 1, mapping: { name: "A", email: "B" }, date_format: "iso" };
    const result = await (await request("POST", "/onboarding/validate", payload)).json();
    check(result.summary.total === 6 && result.summary.would_import === 0, "Complete dry-run summary counts every source record");
    check(JSON.stringify(result) === JSON.stringify(await (await request("POST", "/onboarding/validate", payload)).json()), "Repeatable preview results are deterministic");
    const download = page.waitForEvent("download"); await page.getByRole("button", { name: "Export validation report (CSV)", exact: true }).click();
    const saved = await download; await saved.saveAs("/artifacts/onboarding-validation.csv");
    check(!await saved.failure() && readFileSync("/artifacts/onboarding-validation.csv", "utf8").includes("'=1+1"), "Downloaded CSV report neutralizes spreadsheet formulas");
    check((await (await request("GET", "/master/customers")).json()).total === countBefore, "Preview leaves the customer registry unchanged");
    check(JSON.stringify(await (await request("GET", "/inventory/overview")).json()) === JSON.stringify(inventoryBefore), "Preview leaves all inventory overview quantities unchanged");
    await request("POST", "/onboarding/import", payload, 404); check(true, "Final import endpoint is unavailable");
    await request("GET", "/onboarding/files/unknown", undefined, 404); check(true, "No retained-file endpoint exposes sources");
    writeFileSync("/artifacts/onboarding-fixture.json", JSON.stringify({ payload, result }));
    for (const role of ["OPERATIONS", "SALES", "DRIVER", "ACCOUNTS", "MANAGEMENT"]) {
      await request("POST", "/users", { username: "phase8a." + role.toLowerCase(), display_name: "Synthetic Phase8 " + role, password: credentials.workerPassword, roles: [role] }, 201);
      const other = await browser.newContext({ ignoreHTTPSErrors: process.env.AMBS_QA_SELF_SIGNED_TLS === "1" });
      const csrf = await (await other.request.get(base + "/api/auth/csrf")).json();
      const signed = await other.request.post(base + "/api/auth/login", { data: { identifier: "phase8a." + role.toLowerCase(), password: credentials.workerPassword }, headers: { Origin: base, "X-CSRF-Token": csrf.csrf_token } });
      check(signed.ok(), role + " synthetic session established");
      const response = await other.request.get(base + "/api/onboarding/options"); check(response.status() === (role === "OPERATIONS" ? 200 : 403), role + " Import Center RBAC enforced");
      const token = await (await other.request.get(base + "/api/auth/csrf")).json();
      const fileResponse = await other.request.post(base + "/api/onboarding/inspect", { data: { category: payload.category, filename: payload.filename, content_base64: payload.content_base64 }, headers: { Origin: base, "X-CSRF-Token": token.csrf_token } });
      check(fileResponse.status() === (role === "OPERATIONS" ? 200 : 403), role + " source-content authorization enforced");
      const exportResponse = await other.request.post(base + "/api/onboarding/report", { data: payload, headers: { Origin: base, "X-CSRF-Token": token.csrf_token } });
      check(exportResponse.status() === (role === "OPERATIONS" ? 200 : 403), role + " validation-report authorization enforced");
      await other.close();
    }
    await page.screenshot({ path: "/artifacts/onboarding-desktop.png", fullPage: true });
    for (const width of [390, 360]) {
      await page.setViewportSize({ width, height: 900 });
      await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
      const overflow = await page.evaluate(() => [...document.querySelectorAll("body *")].filter(e => e.getBoundingClientRect().right > innerWidth + 2 && getComputedStyle(e).position !== "fixed").slice(0, 8).map(e => ({tag:e.tagName,cls:e.className,width:Math.round(e.getBoundingClientRect().width)})));
      if (await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1)) console.log("Layout diagnostics " + JSON.stringify(overflow));
      check(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), width + "px Import Center has no page overflow");
      await page.evaluate(() => scrollTo(0, 0));
      await page.screenshot({ path: `/artifacts/onboarding-${width}.png` });
    }
    await page.setViewportSize({ width: 1440, height: 1000 });
    await page.getByRole("button", { name: "Clear private preview", exact: true }).click();
    check(await page.getByRole("heading", { name: "3. Review the dry run" }).count() === 0, "Clear preview removes private state from the page");
    await page.getByLabel("Excel or CSV source").setInputFiles({ name: "reference.html", mimeType: "text/html", buffer: Buffer.from("<script>throw Error('must never execute')</script>") });
    await page.locator(".import-center").getByRole("alert").waitFor({ state: "visible" });
    check(await page.locator(".import-center").getByRole("alert").isVisible(), "HTML is rejected by the source selector without execution");
  }
  await page.reload(); await page.getByRole("heading", { name: "Import Center", exact: true }).waitFor();
  check(await page.getByLabel("Excel or CSV source").inputValue() === "", "Refresh discards source selection and private preview");
  await page.getByRole("button", { name: "Sign out", exact: true }).click(); await page.waitForURL(base + "/login");
  check((await context.request.get(base + "/api/onboarding/options")).status() === 401, "Logged-out users cannot access preview metadata");
  await login(); await page.goto(base + "/imports"); await page.getByRole("heading", { name: "Import Center", exact: true }).waitFor();
  check(true, "Subsequent login and Import Center navigation succeed");
  check(diagnostics.length === 0, "No console warnings, React runtime or hydration errors");
  console.log(`PASS ${checks} Phase 8A Chromium checks${persistence ? " after restart" : ""}`);
  await context.close();
} catch (error) {
  const message = String(error?.message ?? "Verification failed").replaceAll(credentials.password, "[redacted]").replaceAll(credentials.workerPassword, "[redacted]").split("\n")[0].slice(0, 180);
  console.error("Phase 8A synthetic browser verification failed at " + stage + ": " + message);
  process.exitCode = 1;
} finally { await browser.close(); }
