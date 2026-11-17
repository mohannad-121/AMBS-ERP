import { readFileSync } from "node:fs";
import { chromium } from "playwright";
const credentials = JSON.parse(readFileSync(0, "utf8"));
const base = "http://127.0.0.1:3000",
  prefix = "Phase6A Synthetic";
const persistence = process.argv.includes("--persistence"),
  after = process.argv.includes("--after-purchasing");
const browser = await chromium.launch({ headless: true });
let stage = "startup",
  passed = 0,
  page;
const diagnostics = [];
const same = (v, n) => Number(v) === n;
function check(condition, message) {
  if (!condition) throw new Error(message);
  console.log(`PASS ${message}`);
  passed++;
}
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
    stage = "login";
    await page.goto(base + "/login");
    await page.getByLabel("Username or email").fill(username);
    await page.getByLabel("Password", { exact: true }).fill(password);
    await page.getByRole("button", { name: "Sign in", exact: true }).click();
    await page.waitForURL(base + "/");
    stage = "authenticated";
  }
  async function logout() {
    await page.getByRole("button", { name: "Sign out", exact: true }).click();
    await page.waitForURL(base + "/login");
  }
  async function request(method, path, data, expected = 200) {
    const token = await (
      await context.request.get(base + "/api/auth/csrf")
    ).json();
    const r = await context.request.fetch(base + "/api" + path, {
      method,
      data,
      headers: { Origin: base, "X-CSRF-Token": token.csrf_token },
    });
    if (r.status() !== expected)
      throw new Error(
        `API ${path} returned ${r.status()}, expected ${expected}`,
      );
    return r.json();
  }
  const op = (extra = {}) => ({
    request_key: crypto.randomUUID(),
    reason: "Synthetic physically verified operation",
    ...extra,
  });
  const modal = () => page.getByRole("dialog");
  async function submit(label = "Confirm action") {
    await modal()
      .getByLabel("Business reason *", { exact: true })
      .fill("Synthetic physically verified operation");
    await modal().getByRole("checkbox").check();
    await modal().getByRole("button", { name: label, exact: true }).click();
    await modal().waitFor({ state: "hidden" });
  }
  async function action(name) {
    await page.getByRole("button", { name, exact: true }).first().click();
    await modal().waitFor();
  }
  await login(
    persistence
      ? "phase6.admin"
      : after
        ? "phase5.admin"
        : credentials.username,
    persistence || after ? credentials.workerPassword : credentials.password,
  );
  if (persistence) {
    stage = "restart persistence";
    const orders = await request("GET", "/sales/orders?search=Phase6A");
    const row = orders.items[0];
    check(
      orders.total === 1 && row.status === "COMPLETED",
      "Original completed order survives service restart",
    );
    check(
      same(row.lines[0].outstanding, 0) && same(row.lines[0].dispatched, 15),
      "Net delivered and outstanding balances survive restart",
    );
    check(
      row.deliveries.length === 3 &&
        row.deliveries.filter((d) => d.status === "REVERSED").length === 1,
      "Dispatch and physical reversal history survive restart",
    );
    check(
      (await request("GET", "/inventory/reconciliation")).healthy,
      "Ledger and active reservation reconciliation survives restart",
    );
    check(
      (await request("GET", "/audit?action=sales.deliveries.dispatch"))
        .total === 3,
      "Dispatch audit history survives restart",
    );
    await page.goto(base + "/sales");
    await page.getByRole("button", { name: "View order", exact: true }).click();
    await page.getByRole("heading", { name: row.code, exact: true }).waitFor();
    check(true, "Persisted fulfillment is visible in a fresh Chromium context");
  } else {
    stage = "isolated identities";
    for (const [name, role] of [
      ["admin", "SUPER_ADMIN"],
      ["operations", "OPERATIONS"],
      ["packing", "PACKING"],
      ["sales", "SALES"],
      ["driver", "DRIVER"],
    ])
      await request(
        "POST",
        "/users",
        {
          username: "phase6." + name,
          display_name: `Synthetic Phase6 ${role}`,
          password: credentials.workerPassword,
          roles: [role],
        },
        201,
      );
    await logout();
    await login("phase6.operations", credentials.workerPassword);
    stage = "synthetic fixture";
    const unit = await request(
      "POST",
      "/master/units",
      { name: prefix + " PCS", decimal_places: 0 },
      201,
    );
    const category = await request(
      "POST",
      "/master/categories",
      { name: prefix + " Materials" },
      201,
    );
    const item = await request(
      "POST",
      "/master/items",
      {
        name: prefix + " Safety Net",
        item_type: "finished",
        category_id: category.id,
        unit_id: unit.id,
      },
      201,
    );
    const wh = await request(
      "POST",
      "/inventory/warehouses",
      { name: prefix + " Yard" },
      201,
    );
    const loc = await request(
      "POST",
      "/inventory/locations",
      { name: prefix + " Storage", warehouse_id: wh.id },
      201,
    );
    const customer = await request(
      "POST",
      "/master/customers",
      {
        name: prefix + " Customer",
        address: "Verified synthetic customer site",
      },
      201,
    );
    const project = await request(
      "POST",
      "/master/projects",
      {
        name: prefix + " Project",
        customer_id: customer.id,
        location: "Verified synthetic project site",
      },
      201,
    );
    const lpo = await request(
      "POST",
      "/master/lpos",
      {
        name: prefix + " LPO",
        number: "SYN-6A-001",
        customer_id: customer.id,
        project_id: project.id,
      },
      201,
    );
    async function receive(q) {
      const m = await request(
        "POST",
        "/inventory/movements",
        op({
          kind: "RECEIPT",
          occurred_at: new Date().toISOString(),
          lines: [
            {
              item_id: item.id,
              unit_id: unit.id,
              quantity: String(q),
              destination_id: loc.id,
              unit_cost: "2",
              currency: "AED",
            },
          ],
        }),
        201,
      );
      await request("POST", `/inventory/movements/${m.id}/post`, op());
    }
    await receive(8);
    stage = "create order UI";
    await page.goto(base + "/sales");
    await page.getByRole("button", { name: "New order", exact: true }).click();
    await modal()
      .getByLabel("Customer *", { exact: true })
      .selectOption(customer.id);
    await modal()
      .getByLabel("Project", { exact: true })
      .selectOption(project.id);
    await modal()
      .getByLabel("Customer LPO", { exact: true })
      .selectOption(lpo.id);
    await modal().getByLabel("Item 1 *", { exact: true }).selectOption(item.id);
    await modal()
      .getByLabel("Ordered quantity 1 *", { exact: true })
      .fill("15");
    await modal()
      .getByText(/On hand 8.*Available 8.*Shortage 7/)
      .waitFor();
    check(
      true,
      "Selecting an item loads real usable availability and shortage",
    );
    await modal()
      .getByLabel("Requested delivery date", { exact: true })
      .fill("2026-12-01");
    await submit("Create order");
    const created = (await request("GET", "/sales/orders?search=Phase6A"))
      .items[0];
    let orderId = created.id;
    const read = () => request("GET", "/sales/orders/" + orderId);
    await page
      .getByRole("heading", { name: created.code, exact: true })
      .waitFor();
    check(
      created.lines.length === 1 &&
        same(created.lines[0].quantity, 15) &&
        created.project_id === project.id &&
        created.lpo_id === lpo.id,
      "UI creates original customer demand with valid project and LPO",
    );
    await action("Confirm order");
    await submit();
    check(
      (await read()).status === "CONFIRMED",
      "Order confirms despite stock shortage",
    );
    async function prepare() {
      await action("Prepare delivery");
      await modal()
        .getByLabel("Origin warehouse *", { exact: true })
        .selectOption(wh.id);
      check(
        (await modal()
          .getByLabel("Verified customer destination / site *", { exact: true })
          .inputValue()) === "Verified synthetic project site",
        "Delivery reuses verified project destination",
      );
      await submit();
      const row = await read();
      return row.deliveries.at(-1);
    }
    let d = await prepare();
    check(
      same((await read()).lines[0].allocated, 8),
      "Delivery preparation automatically reserves available stock only",
    );
    check(
      same((await request("GET", "/sales/availability/" + item.id)).on_hand, 8),
      "Reservation leaves physical on-hand unchanged",
    );
    await logout();
    await login("phase6.packing", credentials.workerPassword);
    await page.goto(base + "/sales");
    check(
      (await page
        .getByRole("button", { name: "New order", exact: true })
        .count()) === 0,
      "Packing has no order creation controls",
    );
    await request("GET", "/sales/orders/" + orderId, undefined, 403);
    async function actual(name, quantity) {
      await action(name);
      const inputs = modal().getByRole("spinbutton");
      check(
        (await inputs.first().inputValue()) === "",
        "Physical actual quantities start blank",
      );
      await inputs.first().fill(String(quantity));
      await submit();
    }
    await actual("Confirm picking", 8);
    await actual("Confirm loading", 8);
    await request("POST", `/sales/deliveries/${d.id}/dispatch`, op(), 403);
    check(
      true,
      "Packing can verify actual quantities but cannot dispatch stock",
    );
    await logout();
    await login("phase6.operations", credentials.workerPassword);
    await page.goto(base + "/sales");
    await page.getByRole("button", { name: "View order", exact: true }).click();
    stage = "partial dispatch";
    await action("Post dispatch");
    await submit();
    let partial = await read();
    check(
      partial.status === "PARTIALLY_DISPATCHED" &&
        same(partial.lines[0].outstanding, 7),
      "Dispatch 8 leaves original order open with 7 outstanding",
    );
    await request("POST", `/sales/deliveries/${d.id}/dispatch`, op(), 409);
    check(
      same((await read()).lines[0].dispatched, 8),
      "Duplicate dispatch cannot issue stock again",
    );
    await page
      .getByRole("button", { name: "Outstanding / backorders", exact: true })
      .click();
    await page.getByRole("cell", { name: created.code, exact: true }).waitFor();
    check(true, "Backorder view retains original order demand");
    await receive(7);
    await page.getByRole("button", { name: "View order", exact: true }).click();
    d = await prepare();
    await actual("Confirm picking", 7);
    await actual("Confirm loading", 7);
    await action("Post dispatch");
    await submit();
    const final = await read();
    check(
      final.status === "COMPLETED" &&
        same(final.lines[0].outstanding, 0) &&
        same(final.lines[0].dispatched, 15),
      "Receiving 7 and dispatching 7 completes the same order",
    );
    check(
      final.deliveries.length === 2,
      "Two partial deliveries link to one original order",
    );
    stage = "physical reversal";
    const card = page.locator(`[data-delivery-id="${d.id}"]`);
    await card
      .getByRole("button", { name: "Reverse delivery", exact: true })
      .click();
    await submit();
    check(
      same((await read()).lines[0].outstanding, 7),
      "Physical return reversal reopens demand using compensation",
    );
    await action("Reserve available stock");
    await modal()
      .getByLabel("Origin warehouse *", { exact: true })
      .selectOption(wh.id);
    await submit();
    await action("Release allocations");
    await submit();
    check(
      same((await read()).lines[0].allocated, 0),
      "Unused sales allocations release safely",
    );
    d = await prepare();
    await actual("Confirm picking", 7);
    await actual("Confirm loading", 7);
    await action("Post dispatch");
    await submit();
    check(
      (await request("GET", "/inventory/reconciliation")).healthy,
      "Existing ledger and reservation reconciliation remains healthy",
    );
    await page.reload();
    await page
      .getByRole("heading", { name: "Orders & dispatch", exact: true })
      .waitFor();
    await page.getByRole("button", { name: "View order", exact: true }).click();
    await page
      .getByRole("heading", { name: created.code, exact: true })
      .waitFor();
    await page.screenshot({
      path: "/artifacts/sales-desktop.png",
      fullPage: true,
    });
    await page.setViewportSize({ width: 390, height: 844 });
    await page.screenshot({
      path: "/artifacts/sales-mobile.png",
      fullPage: true,
    });
    check(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth + 1,
      ),
      "Mobile page fits viewport with contained table scrolling",
    );
    await page.setViewportSize({ width: 1440, height: 1000 });
    await logout();
    await login("phase6.sales", credentials.workerPassword);
    await page.goto(base + "/sales");
    await page.getByRole("button", { name: "View order", exact: true }).click();
    check(
      (await page
        .getByRole("button", { name: "Prepare delivery", exact: true })
        .count()) === 0,
      "Sales reads fulfillment without physical dispatch controls",
    );
    await logout();
    await login("phase6.admin", credentials.workerPassword);
    stage = "prior screens regression";
    for (const path of [
      "/sales",
      "/inventory/overview",
      "/purchasing/orders",
      "/master/customers",
      "/users",
      "/audit",
      "/sales",
    ]) {
      await page.goto(base + path);
      await page.locator("h1").waitFor();
      check(
        !(await page.getByRole("alert").allTextContents()).some((t) =>
          t.trim(),
        ),
        `Existing ${path} page loads without alerts`,
      );
    }
    check(
      (await request("GET", "/audit?action=sales.deliveries.dispatch"))
        .total === 3,
      "Sales dispatches use the existing audit trail",
    );
    await logout();
    await page.goto(base + "/sales");
    await page.waitForURL(base + "/login");
    await login("phase6.admin", credentials.workerPassword);
    check(true, "Logout protects sales and subsequent login succeeds");
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
    `${passed} Phase 6A Chromium checks passed${persistence ? " after service restart" : ""}.`,
  );
  await context.close();
} catch (error) {
  let message = String(error.message).split("\n")[0];
  for (const secret of [credentials.password, credentials.workerPassword])
    if (secret) message = message.replaceAll(secret, "[redacted]");
  console.error(`Phase 6A browser failed during ${stage}: ${message}`);
  process.exitCode = 1;
} finally {
  await browser.close();
}
