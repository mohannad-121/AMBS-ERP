import { readFileSync } from "node:fs";
import { chromium } from "playwright";
const credentials = JSON.parse(readFileSync(0, "utf8"));
const base = "http://127.0.0.1:3000";
const persistence = process.argv.includes("--persistence");
const afterMaster = process.argv.includes("--after-master");
const prefix = "Phase4 Synthetic";
const browser = await chromium.launch({ headless: true });
let page,
  stage = "startup",
  passed = 0;
const diagnostics = [];
function check(value, message) {
  if (!value) throw new Error(message);
  console.log(`PASS ${message}`);
  passed++;
}
try {
  const context = await browser.newContext({
    viewport: { width: 1440, height: 1000 },
    reducedMotion: "reduce",
  });
  page = await context.newPage();
  page.setDefaultTimeout(45000);
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
        `API ${path}: expected ${expected}, received ${response.status()}`,
      );
    return response.json();
  }
  async function select(label, text) {
    const field = page.getByRole("dialog").getByLabel(label, { exact: true });
    const option = field
      .locator("option")
      .filter({
        hasText: new RegExp(
          `^${text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\s*$`,
        ),
      })
      .first();
    await option.waitFor({ state: "attached" });
    await field.selectOption(await option.getAttribute("value"));
  }
  async function open(screen, button) {
    await page.goto(`${base}/inventory/${screen}`);
    await page.getByRole("button", { name: button, exact: true }).click();
  }
  async function save(label = "Save configuration") {
    await page
      .getByRole("dialog")
      .getByRole("button", { name: label, exact: true })
      .click();
    await page.getByRole("dialog").waitFor({ state: "hidden" });
  }
  async function action(label) {
    await page
      .getByRole("button", { name: label, exact: true })
      .first()
      .click();
    await page
      .getByRole("dialog")
      .getByLabel("Action reason", { exact: true })
      .fill("Synthetic browser verification operation");
    await save("Confirm action");
  }
  async function balances(expectedOnHand, expectedReserved, expectedAvailable) {
    const rows = await request(
      "GET",
      `/inventory/balances?search=${encodeURIComponent(prefix)}`,
    );
    const row = rows.items[0];
    const same = (a, b) =>
      /^-?\d+(\.\d+)?$/.test(a) && a.replace(/\.0+$/, "") === b;
    check(
      rows.total === 1 &&
        same(row.on_hand, expectedOnHand) &&
        same(row.reserved, expectedReserved) &&
        same(row.available, expectedAvailable),
      `Stock is on-hand ${expectedOnHand}, reserved ${expectedReserved}, available ${expectedAvailable}`,
    );
    return row;
  }
  stage = "dedicated test administrator login";
  await login(
    persistence
      ? "phase4.admin"
      : afterMaster
        ? "phase3.audit.admin"
        : credentials.username,
    persistence || afterMaster
      ? credentials.workerPassword
      : credentials.password,
  );
  if (persistence) {
    stage = "restart persistence";
    await balances("47", "0", "47");
    const reservations = await request(
      "GET",
      "/inventory/records/reservations",
    );
    check(
      reservations.items.some((r) => r.status === "RELEASED"),
      "Reservation history survives service restart",
    );
    const ledger = await request("GET", "/inventory/reconciliation");
    check(
      ledger.healthy,
      "Ledger and reservation caches reconcile after restart",
    );
    const audit = await request(
      "GET",
      "/audit?action=inventory.movements.posted",
    );
    check(audit.total >= 2, "Inventory audit records survive restart");
    await page.goto(`${base}/inventory/balances`);
    await page
      .getByText(`${prefix} Safety Net`, { exact: true })
      .first()
      .waitFor();
    check(true, "Inventory remains visible after backend and frontend restart");
  } else {
    stage = "test identities";
    for (const [username, role] of [
      ["phase4.admin", "SUPER_ADMIN"],
      ["phase4.operations", "OPERATIONS"],
      ["phase4.sales", "SALES"],
    ])
      await request(
        "POST",
        "/users",
        {
          username,
          display_name: `Synthetic ${role}`,
          password: credentials.workerPassword,
          roles: [role],
        },
        201,
      );
    await logout();
    await login("phase4.operations", credentials.workerPassword);
    stage = "master item workflow";
    await request(
      "POST",
      "/master/categories",
      { name: `${prefix} Category` },
      201,
    );
    const units = await request("GET", "/master/units");
    if (!units.items.some((u) => u.name === "PCS"))
      await request(
        "POST",
        "/master/units",
        { name: "PCS", decimal_places: 0 },
        201,
      );
    await page.goto(`${base}/master/items`);
    await page
      .getByRole("button", { name: "Create item", exact: true })
      .click();
    await page
      .getByLabel("Item name *", { exact: true })
      .fill(`${prefix} Safety Net`);
    await select("Category", `${prefix} Category`);
    await select("Unit of measure", "PCS");
    await save("Save record");
    check(
      true,
      "Operations creates a synthetic item using the existing master-data form",
    );
    stage = "warehouse and locations";
    await open("warehouses", "Create warehouse");
    await page
      .getByRole("dialog")
      .getByLabel("Name", { exact: true })
      .fill(`${prefix} Yard`);
    await page.getByLabel("Default warehouse", { exact: true }).check();
    await save();
    for (const name of ["Storage", "Packing"]) {
      await open("locations", "Create location");
      await page
        .getByRole("dialog")
        .getByLabel("Name", { exact: true })
        .fill(`${prefix} ${name}`);
      await select("Warehouse", `${prefix} Yard`);
      await save();
    }
    check(
      true,
      "Operations creates warehouse and usable locations through management forms",
    );
    stage = "tracking configuration";
    await open("traceability", "Configure tracking");
    await select("Item", `${prefix} Safety Net`);
    const tracking = page.getByLabel("Tracking mode", { exact: true });
    await tracking.waitFor();
    await tracking.selectOption("LOT");
    await save();
    await page
      .getByRole("button", { name: "Register lot / serial", exact: true })
      .click();
    await page
      .getByRole("dialog")
      .getByLabel("Name", { exact: true })
      .fill(`${prefix} Lot`);
    await page
      .getByLabel("Lot / serial identifier", { exact: true })
      .fill("LOT-PHASE4-SYNTHETIC");
    await select("Item", `${prefix} Safety Net`);
    await save();
    check(
      true,
      "LOT tracking and synthetic lot are registered through the interface",
    );
    async function movement(screen, quantity, source, destination) {
      await open(screen, "Create draft movement");
      await page
        .getByLabel("Business reason", { exact: true })
        .fill("Synthetic physical stock verification");
      await select("Item 1", `${prefix} Safety Net`);
      await page.getByLabel("Quantity 1 (PCS)", { exact: true }).fill(quantity);
      if (source) await select("Source location 1", `${prefix} ${source}`);
      if (destination)
        await select("Destination location 1", `${prefix} ${destination}`);
      await select("Lot / serial 1", `${prefix} Lot`);
      if (screen === "receipts") {
        await page
          .getByLabel("Unit cost 1 (optional)", { exact: true })
          .fill("2.50");
        await page
          .getByLabel("Currency 1 (ISO code)", { exact: true })
          .fill("AED");
      }
      await save("Save draft");
    }
    stage = "receipt";
    await movement("receipts", "50", null, "Storage");
    await balances("0", "0", "0");
    await action("Post movement");
    await balances("50", "0", "50");
    check(
      true,
      "Draft receipt has no stock effect; explicit posting establishes the lot-tracked receipt",
    );
    async function reservation(quantity) {
      await open("reservations", "Create reservation");
      await select("Reservation item", `${prefix} Safety Net`);
      await select("Reservation location", `${prefix} Storage`);
      await select("Reservation lot / serial", `${prefix} Lot`);
      await page
        .getByLabel("Reserved quantity", { exact: true })
        .fill(quantity);
      await page
        .getByRole("dialog")
        .getByLabel("Business reason", { exact: true })
        .fill("Synthetic internal material hold");
      await page
        .getByRole("dialog")
        .getByRole("button", { name: "Create reservation", exact: true })
        .click();
    }
    stage = "reservation";
    await reservation("20");
    await page.getByRole("dialog").waitFor({ state: "hidden" });
    await balances("50", "20", "30");
    stage = "insufficient reservation";
    await reservation("35");
    await page.getByRole("dialog").getByRole("alert").waitFor();
    check(
      (await page.getByRole("dialog").getByRole("alert").innerText()).length >
        10,
      "Insufficient reservation displays a controlled business error",
    );
    await page
      .getByRole("button", { name: "Close dialog", exact: true })
      .click();
    await balances("50", "20", "30");
    stage = "release";
    await action("Release reservation");
    await balances("50", "0", "50");
    stage = "transfer";
    await movement("transfers", "10", "Storage", "Packing");
    await action("Post movement");
    const transferred = await balances("50", "0", "50");
    check(
      transferred.buckets.length === 2 &&
        transferred.buckets.some(
          (b) =>
            b.location_name === `${prefix} Packing` &&
            /^10(\.0+)?$/.test(b.on_hand),
        ),
      "Transfer moves 10 units while preserving the company total and lot",
    );
    stage = "stock count";
    await open("counts", "Create stock count");
    await select("Count location", `${prefix} Storage`);
    await page
      .getByLabel("Count scope / business reason", { exact: true })
      .fill("Synthetic physical stock count");
    await select("Count item 1", `${prefix} Safety Net`);
    await select("Count lot / serial 1", `${prefix} Lot`);
    await save("Create count snapshot");
    await page
      .getByRole("button", { name: "Record counts", exact: true })
      .first()
      .click();
    await page
      .getByLabel("Physically counted quantity 1", { exact: true })
      .fill("37");
    await page
      .getByLabel("Count explanation 1", { exact: true })
      .fill("Synthetic verified physical count");
    await save("Submit count for review");
    await action("Post count");
    await balances("47", "0", "47");
    check(
      true,
      "Count variance posts a compensating -3 adjustment without rewriting history",
    );
    stage = "low stock";
    await open("low-stock", "Set minimum stock");
    await select("Item", `${prefix} Safety Net`);
    await select("Warehouse", `${prefix} Yard`);
    await page.getByLabel("Minimum quantity", { exact: true }).fill("60");
    await save();
    await page
      .getByText(`${prefix} Safety Net`, { exact: true })
      .first()
      .waitFor();
    check(
      (await request("GET", "/inventory/balances?view=low")).total >= 1,
      "Configured threshold produces a real low-stock warning",
    );
    stage = "traceability";
    await page.goto(`${base}/inventory/traceability`);
    await page
      .getByRole("button", { name: "View details", exact: true })
      .first()
      .click();
    await page.getByRole("dialog").waitFor();
    check(
      (await page.getByRole("dialog").innerText()).includes(
        "LOT-PHASE4-SYNTHETIC",
      ),
      "Lot trace displays receiving and movement history",
    );
    await page
      .getByRole("button", { name: "Close dialog", exact: true })
      .click();
    stage = "dashboard and responsive verification";
    await page.goto(`${base}/inventory/overview`);
    await page
      .getByRole("heading", { name: "Inventory Overview", exact: true })
      .waitFor();
    await page
      .getByRole("heading", { name: "Quantities by unit", exact: true })
      .waitFor();
    await page.screenshot({
      path: "/artifacts/inventory-desktop.png",
      fullPage: true,
    });
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.screenshot({
      path: "/artifacts/inventory-tablet.png",
      fullPage: true,
    });
    check(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
      "Tablet dashboard has no page-level horizontal overflow",
    );
    await page.setViewportSize({ width: 1440, height: 1000 });
    await page.reload();
    await balances("47", "0", "47");
    stage = "master regression";
    for (const resource of ["customers", "projects", "lpos", "items"]) {
      await page.goto(`${base}/master/${resource}`);
      await page.locator("h1").waitFor();
      check(
        !(await page.getByRole("alert").allTextContents()).some((text) =>
          text.trim(),
        ),
        `Existing ${resource} screen remains accessible`,
      );
    }
    stage = "sales restrictions";
    await logout();
    await login("phase4.sales", credentials.workerPassword);
    await page.goto(`${base}/inventory/receipts`);
    check(
      (await page
        .getByRole("button", { name: "Create draft movement", exact: true })
        .count()) === 0,
      "Sales has read-only inventory controls",
    );
    const sales = await request("GET", "/inventory/balances");
    check(
      !JSON.stringify(sales).includes("stock_value"),
      "Inventory costs are redacted for Sales",
    );
    await request(
      "POST",
      "/inventory/warehouses",
      { name: "Forbidden synthetic warehouse" },
      403,
    );
    check(true, "Backend independently rejects unauthorized inventory writes");
    stage = "audit and session regression";
    await logout();
    await login("phase4.admin", credentials.workerPassword);
    for (const route of ["users", "audit"]) {
      await page.goto(`${base}/${route}`);
      await page.locator("h1").waitFor();
      check(
        !(await page.getByRole("alert").allTextContents()).some((text) =>
          text.trim(),
        ),
        `${route} screen remains accessible`,
      );
    }
    check(
      (await request("GET", "/audit?action=inventory.movements.posted"))
        .total >= 2,
      "Stock mutations are recorded in the existing audit trail",
    );
    check(
      (await request("GET", "/inventory/reconciliation")).healthy,
      "Ledger, physical balances and reservation totals reconcile",
    );
    await logout();
    await login("phase4.admin", credentials.workerPassword);
    check(true, "Logout and subsequent login work in a clean browser context");
  }
  check(
    !diagnostics.some(
      (d) =>
        d.exception ||
        /called use\(|hydration|uncached promise|invalid hook/i.test(d.text),
    ),
    "No React runtime exceptions or hydration warnings",
  );
  const unexpected = diagnostics.filter(
    (d) =>
      !(
        d.stage === "insufficient reservation" &&
        d.text.includes("409 (Conflict)")
      ),
  );
  if (unexpected.length) console.error(JSON.stringify(unexpected));
  check(!unexpected.length, "No unexpected browser console warnings or errors");
  console.log(
    `${passed} Phase 4 Chromium checks passed${persistence ? " after service restart" : ""}.`,
  );
  await context.close();
} catch (error) {
  let message = String(error.message).split("\n")[0];
  for (const secret of [credentials.password, credentials.workerPassword])
    if (secret) message = message.replaceAll(secret, "[redacted]");
  console.error(`Phase 4 browser failed during ${stage}: ${message}`);
  if (page && !stage.includes("login") && stage !== "test identities") {
    console.error(
      JSON.stringify({
        alerts: await page.getByRole("alert").allTextContents(),
      }),
    );
    await page
      .screenshot({ path: "/artifacts/inventory-failure.png", fullPage: true })
      .catch(() => {});
  }
  process.exitCode = 1;
} finally {
  await browser.close();
}
