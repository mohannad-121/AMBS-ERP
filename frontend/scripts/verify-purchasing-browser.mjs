import { readFileSync } from "node:fs";
import { chromium } from "playwright";
const credentials = JSON.parse(readFileSync(0, "utf8"));
const base = "http://127.0.0.1:3000",
  prefix = "Phase5 Synthetic";
const persistence = process.argv.includes("--persistence"),
  afterInventory = process.argv.includes("--after-inventory");
let stage = "startup",
  passed = 0,
  page;
const diagnostics = [];
const browser = await chromium.launch({ headless: true });
function check(condition, message) {
  if (!condition) throw new Error(message);
  console.log(`PASS ${message}`);
  passed++;
}
const same = (value, expected) =>
  String(value).replace(/\.0+$/, "") === expected;
try {
  const context = await browser.newContext({
    viewport: { width: 1440, height: 1000 },
    reducedMotion: "reduce",
  });
  page = await context.newPage();
  page.setDefaultTimeout(60000);
  page.on("console", (m) => {
    if (["warning", "error"].includes(m.type()))
      diagnostics.push({ stage, text: m.text() });
  });
  page.on("pageerror", (e) =>
    diagnostics.push({ stage, text: e.message, exception: true }),
  );
  async function login(username, password) {
    await page.goto(`${base}/login`);
    await page.getByLabel("Username or email").fill(username);
    await page.getByLabel("Password", { exact: true }).fill(password);
    await page.getByRole("button", { name: "Sign in", exact: true }).click();
    await page.waitForURL(`${base}/`);
  }
  async function logout() {
    await page.getByRole("button", { name: "Sign out", exact: true }).click();
    await page.waitForURL(`${base}/login`);
  }
  async function request(method, path, data, expected = 200) {
    const token = await (
      await context.request.get(`${base}/api/auth/csrf`)
    ).json();
    const response = await context.request.fetch(`${base}/api${path}`, {
      method,
      data,
      headers: { Origin: base, "X-CSRF-Token": token.csrf_token },
    });
    if (response.status() !== expected)
      throw new Error(
        `API ${path} returned ${response.status()}, expected ${expected}`,
      );
    return response.json();
  }
  const modal = () => page.getByRole("dialog");
  const field = (label) => modal().getByLabel(label, { exact: true });
  async function select(label, optionText) {
    const input = field(label);
    const option = input
      .locator("option")
      .filter({
        hasText: new RegExp(
          `^${optionText.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\s*$`,
        ),
      })
      .first();
    await option.waitFor({ state: "attached" });
    await input.selectOption(await option.getAttribute("value"));
  }
  async function selectId(label, id) {
    const input = field(label);
    await input.locator(`option[value="${id}"]`).waitFor({ state: "attached" });
    await input.selectOption(id);
  }
  async function save(label = "Save record") {
    await modal().getByRole("button", { name: label, exact: true }).click();
    await modal().waitFor({ state: "hidden" });
  }
  async function open(screen, button) {
    await page.goto(`${base}/purchasing/${screen}`);
    await page.getByRole("button", { name: button, exact: true }).click();
  }
  async function action(button) {
    await page
      .getByRole("button", { name: button, exact: true })
      .first()
      .click();
    await field("Business reason *").fill(
      "Synthetic verified business operation",
    );
    await modal()
      .getByLabel(
        "I verified this operation and its actual quantity/reference.",
        { exact: true },
      )
      .check();
    await save("Confirm action");
  }
  async function stock(expected, available = expected) {
    const result = await request(
      "GET",
      `/inventory/balances?search=${encodeURIComponent(`${prefix} Steel`)}`,
    );
    check(
      result.total === 1 &&
        same(result.items[0].on_hand, expected) &&
        same(result.items[0].available, available),
      `Physical stock ${expected}; dispatch availability ${available}`,
    );
    return result.items[0];
  }
  stage = "dedicated test login";
  await login(
    persistence
      ? "phase5.admin"
      : afterInventory
        ? "phase4.admin"
        : credentials.username,
    persistence || afterInventory
      ? credentials.workerPassword
      : credentials.password,
  );
  if (persistence) {
    stage = "restart persistence";
    await stock("145");
    const supplierRows = await request(
      "GET",
      `/purchasing/suppliers?search=${encodeURIComponent(prefix)}`,
    );
    check(
      supplierRows.total === 2,
      "Supplier identities survive service restart",
    );
    check(
      (await request("GET", "/purchasing/quotations")).total === 2,
      "Quotation history survives restart",
    );
    const works = await request("GET", "/purchasing/production");
    check(
      works.items.some((w) => same(w.yard_received, "45")) &&
        works.items.some(
          (w) => w.status === "COMPLETED" && same(w.yard_received, "20"),
        ),
      "Partial supplier-owned work and completed owned-custody timeline survive restart",
    );
    check(
      (await request("GET", "/audit?action=purchasing.receipt_posted")).total >=
        3,
      "Purchase receipt audit history survives restart",
    );
    check(
      (await request("GET", "/inventory/reconciliation")).healthy,
      "Stock and hold reconciliation survives restart",
    );
    await page.goto(`${base}/purchasing/production-dashboard`);
    await page
      .getByRole("heading", {
        name: "Current outsourced production",
        exact: true,
      })
      .waitFor();
  } else {
    stage = "isolated identities";
    for (const [username, role] of [
      ["phase5.admin", "SUPER_ADMIN"],
      ["phase5.operations", "OPERATIONS"],
      ["phase5.sales", "SALES"],
    ])
      await request(
        "POST",
        "/users",
        {
          username,
          display_name: `Synthetic Phase5 ${role}`,
          password: credentials.workerPassword,
          roles: [role],
        },
        201,
      );
    await logout();
    await login("phase5.operations", credentials.workerPassword);
    stage = "foundation fixture";
    const units = await request("GET", "/master/units");
    let unit = units.items.find((u) => u.name === "PCS");
    if (!unit)
      unit = await request(
        "POST",
        "/master/units",
        { name: "PCS", decimal_places: 0 },
        201,
      );
    const category = await request(
      "POST",
      "/master/categories",
      { name: `${prefix} Materials` },
      201,
    );
    const item = await request(
      "POST",
      "/master/items",
      {
        name: `${prefix} Steel`,
        category_id: category.id,
        unit_id: unit.id,
        item_type: "component",
      },
      201,
    );
    const wh = await request(
      "POST",
      "/inventory/warehouses",
      { name: `${prefix} Yard` },
      201,
    );
    const yard = await request(
      "POST",
      "/inventory/locations",
      { name: `${prefix} Storage`, warehouse_id: wh.id, kind: "USABLE" },
      201,
    );
    stage = "supplier forms";
    for (const [suffix, type] of [
      ["A", "FABRICATION"],
      ["B", "MULTI SERVICE"],
    ]) {
      await open("suppliers", "Create supplier");
      await field("Official supplier name *").fill(
        `${prefix} Supplier ${suffix}`,
      );
      await modal().getByLabel(type, { exact: true }).check();
      await field("Payment terms").fill("Synthetic verified terms");
      await save();
    }
    const suppliers = (
      await request(
        "GET",
        `/purchasing/suppliers?search=${encodeURIComponent(prefix)}`,
      )
    ).items;
    const supplierA = suppliers.find((s) => s.name.endsWith(" A")),
      supplierB = suppliers.find((s) => s.name.endsWith(" B"));
    check(
      suppliers.length === 2,
      "Operations creates two verified synthetic suppliers through actual forms",
    );
    await page.goto(`${base}/purchasing/suppliers/${supplierA.id}`);
    await page
      .getByRole("heading", { name: supplierA.name, exact: true })
      .waitFor();
    stage = "supplier catalog";
    await open("catalog", "Create supplier material");
    await select("Supplier *", supplierA.name);
    await select("Material item *", item.name);
    await select("Purchase unit *", "PCS");
    await field("Minimum order quantity (verified)").fill("10");
    await field("Supplier-reported availability").fill("500");
    await save();
    await stock("0");
    check(
      (
        await request("GET", "/purchasing/catalog")
      ).items[0].availability_status.includes("unverified"),
      "Supplier availability is visibly unverified and never becomes owned stock",
    );
    stage = "quotations and comparison";
    for (const [supplier, price] of [
      [supplierA, "2"],
      [supplierB, "3"],
    ]) {
      await open("quotations", "Create quotation");
      await select("Supplier *", supplier.name);
      await field("Supplier quotation reference *").fill(`SYNTHETIC-${price}`);
      await field("Valid until (if confirmed)").fill(
        new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10),
      );
      await field("Currency *").fill("AED");
      for (const label of [
        "Known freight charge",
        "Known tax amount (metadata only)",
        "Known other charges",
      ])
        await field(label).fill("0");
      await select("Purchase item 1 *", item.name);
      await field("Purchase quantity 1 *").fill("100");
      await field("Unit price 1 (if known)").fill(price);
      await save();
      await action("Issue quotation");
    }
    await open("comparison", "Compare quotations");
    await select("Compare item *", item.name);
    await select("Comparison unit *", "PCS");
    await field("Currency *").fill("AED");
    await field("Requested comparison quantity *").fill("100");
    await save("Compare recorded quotations");
    await page
      .getByRole("heading", { name: "Evidence-based comparison", exact: true })
      .waitFor();
    check(
      (await page.locator("main").innerText()).includes("Rank 1"),
      "Price comparison displays transparent ranking for compatible quantity, units, currency and known charges",
    );
    stage = "purchase request";
    await open("requests", "Create purchase request");
    await field("Business reason *").fill("Synthetic procurement requirement");
    await select("Purchase item 1 *", item.name);
    await field("Purchase quantity 1 *").fill("100");
    await field("Unit price 1 (if known)").fill("2");
    await save();
    await action("Submit request");
    await page
      .getByRole("button", { name: "Convert to PO", exact: true })
      .first()
      .click();
    await select("Supplier *", supplierA.name);
    await select("Receiving warehouse *", wh.name);
    await field("Currency *").fill("AED");
    await save();
    let orders = (await request("GET", "/purchasing/orders")).items;
    const first = orders.find((o) => o.request_id);
    await page.goto(`${base}/purchasing/orders/${first.id}`);
    await action("Confirm PO");
    check(
      (await request("GET", `/purchasing/orders/${first.id}`)).status ===
        "CONFIRMED",
      "Submitted request converts once to a separately confirmed supplier PO",
    );
    async function receive(order, quantity) {
      await page.goto(`${base}/purchasing/orders/${order.id}`);
      await page
        .getByRole("button", { name: "Receive goods", exact: true })
        .click();
      await selectId("Purchase line 1 *", order.lines[0].id);
      await field("Received quantity 1 *").fill(quantity);
      await select("Receiving location 1", yard.name);
      await field("Business reason *").fill("Synthetic actual goods received");
      await save();
      const latest = (await request("GET", "/purchasing/receipts")).items.find(
        (r) => r.status === "DRAFT" && r.order_id === order.id,
      );
      await page.goto(`${base}/purchasing/receipts/${latest.id}`);
      await action("Post receipt");
    }
    stage = "partial goods receipts";
    await receive(first, "40");
    await stock("40");
    let updated = await request("GET", `/purchasing/orders/${first.id}`);
    check(
      updated.status === "PARTIALLY_RECEIVED" &&
        same(updated.lines[0].outstanding, "60"),
      "First physical receipt 40 leaves exactly 60 outstanding",
    );
    await receive(first, "60");
    await stock("100");
    updated = await request("GET", `/purchasing/orders/${first.id}`);
    check(
      updated.status === "RECEIVED" && same(updated.lines[0].outstanding, "0"),
      "Second receipt completes 100 without duplicate stock",
    );
    async function createPO() {
      await open("orders", "Create purchase order");
      await select("Supplier *", supplierA.name);
      await select("Receiving warehouse *", wh.name);
      await field("Currency *").fill("AED");
      await select("Purchase item 1 *", item.name);
      await field("Purchase quantity 1 *").fill("100");
      await field("Unit price 1 (if known)").fill("2");
      await save();
      const row = (await request("GET", "/purchasing/orders")).items.find(
        (o) => o.status === "DRAFT",
      );
      await page.goto(`${base}/purchasing/orders/${row.id}`);
      await action("Confirm PO");
      return request("GET", `/purchasing/orders/${row.id}`);
    }
    stage = "outsourced production plan";
    const secondPO = await createPO();
    async function createWork(ownership, quantity, locations) {
      await open("production", "Create production order");
      await select("Output item *", item.name);
      await field("Planned production quantity *").fill(quantity);
      await field("Material ownership *").selectOption(ownership);
      await field("Production instructions *").fill(
        "Synthetic verified optional-stage production route",
      );
      if (ownership === "SUPPLIER") {
        await select("Related purchase order *", secondPO.code);
        await selectId("Purchase output line *", secondPO.lines[0].id);
      }
      await field("Stage name 1 *").fill("FABRICATION");
      await select("Stage supplier 1 *", supplierA.name);
      if (locations)
        await select("External custody location 1 *", locations[0].name);
      await modal()
        .getByRole("button", { name: "Add production stage", exact: true })
        .click();
      await field("Stage name 2 *").fill(
        ownership === "SUPPLIER" ? "POWDER_COATING" : "GALVANIZING",
      );
      await select("Stage supplier 2 *", supplierB.name);
      if (locations)
        await select("External custody location 2 *", locations[1].name);
      await save();
      const row = (await request("GET", "/purchasing/production")).items.find(
        (p) => p.ownership === ownership,
      );
      await page.goto(`${base}/purchasing/production/${row.id}`);
      return row;
    }
    async function progress(index, button, quantity, locationLabel, location) {
      const card = page
        .locator("article.inventory-line")
        .filter({
          has: page.getByRole("heading", { name: new RegExp(`^${index}\\. `) }),
        })
        .first();
      await card.getByRole("button", { name: button, exact: true }).click();
      await field("Actual stage quantity *").fill(quantity);
      await field("Business reason *").fill(
        "Synthetic verified physical stage update",
      );
      if (locationLabel) await select(locationLabel, location.name);
      await modal()
        .getByLabel(
          "I verified this operation and its actual quantity/reference.",
          { exact: true },
        )
        .check();
      await save("Confirm action");
    }
    const work = await createWork("SUPPLIER", "100");
    await progress(1, "Start quantity", "100");
    await stock("100");
    await progress(1, "Record completion", "60");
    await progress(1, "Transfer completed", "60");
    await progress(2, "Record completion", "45");
    await progress(
      2,
      "Receive at yard",
      "45",
      "Actual yard receiving location *",
      yard,
    );
    await stock("145");
    let actual = await request("GET", `/purchasing/production/${work.id}`);
    check(
      same(actual.stages[0].current_custody, "40") &&
        same(actual.stages[1].current_custody, "15") &&
        same(actual.yard_received, "45"),
      "Supplier work shows 40 at fabrication, 15 at coating, 45 physically received with no duplicate quantities",
    );
    check(
      same(
        (await request("GET", `/purchasing/orders/${secondPO.id}`)).lines[0]
          .received,
        "45",
      ),
      "Supplier-owned yard receipt updates the originating purchase line exactly once",
    );
    stage = "owned external custody and galvanizing";
    const custody = [];
    for (const supplier of [supplierA, supplierB]) {
      await open("custody-locations", "Create custody location");
      await field("Verified custody location name *").fill(
        `${prefix} Custody ${supplier === supplierA ? "A" : "B"}`,
      );
      await select("Supplier *", supplier.name);
      await select("Receiving warehouse *", wh.name);
      await save();
      custody.push(
        (await request("GET", "/purchasing/custody-locations")).items.find(
          (l) => l.supplier_id === supplier.id,
        ),
      );
    }
    const owned = await createWork("AMBS", "20", custody);
    await progress(
      1,
      "Start quantity",
      "20",
      "Owned stock source location *",
      yard,
    );
    await stock("145", "125");
    await progress(1, "Record completion", "20");
    await progress(1, "Transfer completed", "20");
    await progress(2, "Record completion", "20");
    await progress(
      2,
      "Receive at yard",
      "20",
      "Actual yard receiving location *",
      yard,
    );
    await stock("145");
    check(
      (await request("GET", `/purchasing/production/${owned.id}`)).status ===
        "COMPLETED",
      "Owned custody transfers and galvanizing return the same goods without a second receipt",
    );
    stage = "supplier delay evidence";
    await page.goto(`${base}/purchasing/orders/${secondPO.id}`);
    await page
      .getByRole("button", { name: "Update schedule", exact: true })
      .click();
    await field("Supplier-confirmed date").fill(
      new Date(Date.now() - 2 * 86400000).toISOString().slice(0, 10),
    );
    await field("Business reason *").fill(
      "Synthetic supplier-confirmed missed date",
    );
    await field("Supplier evidence / update reference *").fill(
      "SYNTHETIC supplier schedule confirmation",
    );
    await save();
    check(
      (await request("GET", `/purchasing/orders/${secondPO.id}`))
        .delivery_status === "Delayed",
      "Missed confirmed date produces an Operations delay alert with retained evidence",
    );
    stage = "dashboard and responsive verification";
    await page.goto(`${base}/purchasing/purchasing-dashboard`);
    await page
      .getByRole("heading", {
        name: "Overdue supplier deliveries",
        exact: true,
      })
      .waitFor();
    await page.screenshot({
      path: "/artifacts/purchasing-desktop.png",
      fullPage: true,
    });
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.screenshot({
      path: "/artifacts/purchasing-tablet.png",
      fullPage: true,
    });
    check(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
      "Purchasing dashboard fits tablet width without page overflow",
    );
    await page.setViewportSize({ width: 1440, height: 1000 });
    await page.goto(`${base}/purchasing/production/${work.id}`);
    await page
      .getByRole("heading", {
        name: "Production route and custody",
        exact: true,
      })
      .waitFor();
    await page.screenshot({
      path: "/artifacts/production-timeline.png",
      fullPage: true,
    });
    await page.reload();
    await stock("145");
    check(
      (await request("GET", "/inventory/reconciliation")).healthy,
      "Browser refresh preserves quantities and ledger reconciliation",
    );
    stage = "sales restrictions";
    await logout();
    await login("phase5.sales", credentials.workerPassword);
    await page.goto(`${base}/purchasing/orders`);
    check(
      (await page
        .getByRole("button", { name: "Create purchase order", exact: true })
        .count()) === 0,
      "Sales cannot create or confirm purchasing obligations",
    );
    const sale = await request("GET", `/purchasing/orders/${first.id}`);
    check(
      !("unit_price" in sale.lines[0]),
      "Purchase prices are redacted for Sales",
    );
    await request(
      "POST",
      "/purchasing/suppliers",
      { name: "Forbidden synthetic supplier", types: ["FABRICATION"] },
      403,
    );
    check(
      true,
      "Backend rejects unauthorized supplier writes independently of the UI",
    );
    stage = "prior pages and audit";
    await logout();
    await login("phase5.admin", credentials.workerPassword);
    for (const path of [
      "/master/customers",
      "/master/projects",
      "/master/lpos",
      "/master/items",
      "/inventory/balances",
      "/inventory/reservations",
      "/inventory/counts",
      "/inventory/traceability",
      "/users",
      "/audit",
    ]) {
      await page.goto(`${base}${path}`);
      await page.locator("h1").waitFor();
      check(
        !(await page.getByRole("alert").allTextContents()).some((t) =>
          t.trim(),
        ),
        `Existing ${path} interface remains accessible`,
      );
    }
    check(
      (await request("GET", "/audit?action=purchasing.receipt_posted")).total >=
        3,
      "Purchasing stock changes appear in the existing audit trail",
    );
    await logout();
    await page.goto(`${base}/purchasing/orders`);
    await page.waitForURL(`${base}/login`);
    await login("phase5.admin", credentials.workerPassword);
    check(
      true,
      "Logout blocks protected purchasing routes and subsequent login works",
    );
  }
  check(
    !diagnostics.some(
      (d) =>
        d.exception ||
        /called use\(|hydration|uncached promise|invalid hook/i.test(d.text),
    ),
    "No React runtime errors or hydration warnings",
  );
  if (diagnostics.length) console.error(JSON.stringify(diagnostics));
  check(
    diagnostics.length === 0,
    "No unexpected browser console warnings or errors",
  );
  console.log(
    `${passed} Phase 5 Chromium checks passed${persistence ? " after service restart" : ""}.`,
  );
  await context.close();
} catch (error) {
  let message = String(error.message).split("\n")[0];
  for (const secret of [credentials.password, credentials.workerPassword])
    if (secret) message = message.replaceAll(secret, "[redacted]");
  console.error(`Phase 5 browser failed during ${stage}: ${message}`);
  if (page && !stage.includes("login") && stage !== "isolated identities") {
    console.error(
      JSON.stringify({
        alerts: await page.getByRole("alert").allTextContents(),
      }),
    );
    await page
      .screenshot({ path: "/artifacts/purchasing-failure.png", fullPage: true })
      .catch(() => {});
  }
  process.exitCode = 1;
} finally {
  await browser.close();
}
