import { readFileSync } from "node:fs";
import { chromium } from "playwright";
const credentials = JSON.parse(readFileSync(0, "utf8"));
const after = process.argv.includes("--after-routing");
const browser = await chromium.launch({ headless: true });
const base = "http://127.0.0.1:3000";
let page,
  stage = "startup",
  passed = 0;
const diagnostics = [];
function check(value, message) {
  if (!value) throw new Error(message);
  console.log("PASS " + message);
  passed++;
}
try {
  const context = await browser.newContext({
    viewport: { width: 1440, height: 1000 },
  });
  page = await context.newPage();
  page.setDefaultTimeout(60000);
  page.on("console", (m) => {
    if (["warning", "error"].includes(m.type())) diagnostics.push(m.text());
  });
  page.on("pageerror", (e) => diagnostics.push(e.message));
  async function login(username, password) {
    stage = "login";
    await page.goto(base + "/login");
    await page.getByLabel("Username or email").fill(username);
    await page.getByLabel("Password", { exact: true }).fill(password);
    await page.getByRole("button", { name: "Sign in", exact: true }).click();
    await page.waitForURL(base + "/");
    await page.locator(".overview-label").waitFor();
    stage = "workspace";
  }
  async function request(method, path, data, expected = 200) {
    const token = await (
      await context.request.get(base + "/api/auth/csrf")
    ).json();
    const response = await context.request.fetch(base + "/api" + path, {
      method,
      data,
      headers: { Origin: base, "X-CSRF-Token": token.csrf_token },
    });
    if (response.status() !== expected)
      throw new Error(
        `Fixture API ${method} ${path} returned ${response.status()}`,
      );
    return response.json();
  }
  const operation = () => ({
    request_key: crypto.randomUUID(),
    reason: "Phase 6C isolated UI verification",
  });
  async function settleCounters() {
    // Observers intentionally leave off-screen counters untouched until entry.
    for (const counter of await page.locator(".count-up").all())
      await counter.scrollIntoViewIfNeeded();
    await page.waitForFunction(() =>
      [...document.querySelectorAll(".count-up")].every(
        (n) =>
          n.querySelector('[aria-hidden="true"]').textContent ===
          n.dataset.finalValue,
      ),
    );
    await page.evaluate(() => window.scrollTo(0, 0));
  }
  async function noOverflow(label) {
    check(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth + 1,
      ),
      label + " contains page overflow",
    );
  }
  await page.goto(base + "/login");
  await page.getByRole("button", { name: "Sign in", exact: true }).waitFor();
  await page.screenshot({
    path: "/artifacts/login-desktop.png",
    fullPage: true,
  });
  await page.setViewportSize({ width: 360, height: 900 });
  await noOverflow("360px login");
  await page.screenshot({
    path: "/artifacts/login-mobile.png",
    fullPage: true,
  });
  await page.setViewportSize({ width: 1440, height: 1000 });
  await login(
    after ? "phase6b.admin" : credentials.username,
    after ? credentials.workerPassword : credentials.password,
  );
  if (!after) {
    const empty = await request("GET", "/dashboard");
    check(
      empty.cards.every((c) => c.value === "0") &&
        empty.inventory.length === 0 &&
        empty.demand.length === 0,
      "Empty PostgreSQL dashboard reports real zeros",
    );
    await page.screenshot({
      path: "/artifacts/dashboard-empty.png",
      fullPage: true,
    });
  }
  await page.waitForFunction(
    () =>
      document.querySelector("h1").getBoundingClientRect().left >=
      document.querySelector(".sidebar").getBoundingClientRect().right,
  );
  check(true, "Desktop main content clears the sidebar");
  stage = "synthetic identities";
  await request(
    "POST",
    "/users",
    {
      username: "phase6c.admin",
      display_name: "Phase6C Synthetic Administrator",
      password: credentials.workerPassword,
      roles: ["SUPER_ADMIN"],
    },
    201,
  );
  await request(
    "POST",
    "/users",
    {
      username: "phase6c.driver",
      display_name: "Phase6C Synthetic Driver",
      password: credentials.workerPassword,
      roles: ["DRIVER"],
    },
    201,
  );
  await page.getByRole("button", { name: "Sign out", exact: true }).click();
  await page.waitForURL(base + "/login");
  await login("phase6c.admin", credentials.workerPassword);
  stage = "decimal demand fixture";
  const unit = await request(
    "POST",
    "/master/units",
    { name: "Phase6C precision unit", decimal_places: 6 },
    201,
  );
  const category = await request(
    "POST",
    "/master/categories",
    { name: "Phase6C synthetic catalog" },
    201,
  );
  const item = await request(
    "POST",
    "/master/items",
    {
      name: "Phase6C component with a deliberately long operational description for layout verification",
      item_type: "component",
      category_id: category.id,
      unit_id: unit.id,
    },
    201,
  );
  const customer = await request(
    "POST",
    "/master/customers",
    {
      name: "Phase6C synthetic customer",
      address: "Synthetic verification site",
    },
    201,
  );
  const order = await request(
    "POST",
    "/sales/orders",
    {
      ...operation(),
      customer_id: customer.id,
      lines: [{ item_id: item.id, quantity: "99999999999999.123456" }],
    },
    201,
  );
  await request("POST", `/sales/orders/${order.id}/confirm`, operation());
  stage = "live counters";
  await page.reload();
  await page.locator("[data-metric]").first().waitFor();
  await settleCounters();
  const summary = await request("GET", "/dashboard");
  for (const card of summary.cards)
    check(
      (await page
        .locator(`[data-metric="${card.key}"] .count-up`)
        .getAttribute("data-final-value")) ===
        Number(card.value).toLocaleString("en-AE"),
      `Live ${card.key} count equals PostgreSQL summary`,
    );
  check(
    (await page
      .getByText("99,999,999,999,999.123456", { exact: true })
      .count()) >= 1,
    "Count-up preserves all twenty decimal digits",
  );
  await page.screenshot({
    path: "/artifacts/dashboard-desktop.png",
    fullPage: true,
  });
  const finalValues = await page.locator(".count-up").allTextContents();
  await page.mouse.wheel(0, 250);
  await page.mouse.wheel(0, -250);
  await page.waitForTimeout(200);
  check(
    JSON.stringify(finalValues) ===
      JSON.stringify(await page.locator(".count-up").allTextContents()),
    "Settled counters do not restart when scrolling",
  );
  await page
    .getByRole("button", { name: "Collapse sidebar", exact: true })
    .click();
  await page.waitForFunction(
    () =>
      document.querySelector(".sidebar").getBoundingClientRect().width <= 90,
  );
  check(true, "Desktop sidebar collapses");
  await page.screenshot({
    path: "/artifacts/shell-collapsed.png",
    fullPage: true,
  });
  await page
    .getByRole("button", { name: "Expand sidebar", exact: true })
    .click();
  await page.waitForFunction(
    () =>
      document.querySelector(".app-main").getBoundingClientRect().left >= 264,
  );
  const screens = [
    ["/master/customers", "customers"],
    ["/master/projects", "projects"],
    ["/master/lpos", "lpos"],
    ["/master/items", "catalog"],
    ["/inventory/overview", "inventory"],
    ["/inventory/balances", "stock-balances"],
    ["/inventory/receipts", "stock-receipts"],
    ["/purchasing/purchasing-dashboard", "purchasing"],
    ["/purchasing/production-dashboard", "production"],
    ["/sales", "sales"],
    ["/users", "users"],
    ["/audit", "audit"],
    ["/system", "system"],
  ];
  for (const [path, name] of screens) {
    stage = name;
    await page.goto(base + path);
    await page.locator("h1").waitFor();
    await page.waitForFunction(
      () =>
        ![...document.querySelectorAll('[role="status"]')].some((el) =>
          /^Loading/.test(el.textContent.trim()),
        ),
    );
    const moduleMetrics = {
      inventory: [
        "/inventory/overview",
        [
          "total_active_items",
          "low_stock_items",
          "out_of_stock_items",
          "nonusable_items",
          "pending_receipts",
          "pending_counts",
        ],
      ],
      purchasing: [
        "/purchasing/dashboard",
        ["open_requests", "open_orders", "partially_received"],
      ],
      production: ["/purchasing/dashboard", ["active_production"]],
    }[name];
    if (moduleMetrics) {
      await page.locator(".inventory-metrics .count-up").first().waitFor();
      await settleCounters();
      const values = await request("GET", moduleMetrics[0]);
      const counters = page.locator(".inventory-metrics .count-up");
      for (const [index, key] of moduleMetrics[1].entries()) {
        check(
          (await counters.nth(index).getAttribute("data-final-value")) ===
            Number(values[key]).toLocaleString("en-AE"),
          `${name} ${key} counter equals its real API value`,
        );
      }
    }
    await noOverflow("1440px " + name);
    await page.screenshot({
      path: `/artifacts/${name}-desktop.png`,
      fullPage: true,
    });
  }
  stage = "modal keyboard";
  await page.goto(base + "/users");
  await page.getByRole("button", { name: "Create user", exact: true }).click();
  await page.getByRole("dialog").waitFor();
  check(
    await page
      .getByRole("dialog")
      .evaluate((d) => d.contains(document.activeElement)),
    "Dialog receives keyboard focus",
  );
  await page.screenshot({ path: "/artifacts/user-dialog.png", fullPage: true });
  await page.keyboard.press("Escape");
  check(
    await page
      .getByRole("button", { name: "Create user", exact: true })
      .evaluate((el) => el === document.activeElement),
    "Escape closes dialog and restores trigger focus",
  );
  for (const width of [1920, 1440, 1366, 1024, 768, 390, 360]) {
    stage = "responsive " + width;
    await page.setViewportSize({ width, height: 1000 });
    await page.goto(base + "/");
    await page.locator("[data-metric]").first().waitFor();
    await noOverflow(width + "px dashboard");
    await settleCounters();
    await page.screenshot({
      path: `/artifacts/dashboard-${width}.png`,
      fullPage: true,
    });
    if (width === 390 || width === 360) {
      await page.getByRole("button", { name: "Menu", exact: true }).click();
      await page
        .getByRole("link", { name: "Dashboard", exact: true })
        .waitFor();
      check(
        await page
          .locator(".sidebar")
          .evaluate((el) => el.contains(document.activeElement)),
        "Mobile drawer receives focus at " + width,
      );
      await page.screenshot({
        path: `/artifacts/drawer-${width}.png`,
        fullPage: true,
      });
      await page.keyboard.press("Escape");
      check(
        await page
          .getByRole("button", { name: "Menu", exact: true })
          .evaluate((el) => el === document.activeElement),
        "Drawer Escape restores focus at " + width,
      );
      for (const [path, name] of screens) {
        await page.goto(base + path);
        await page.locator("h1").waitFor();
        await noOverflow(width + "px " + name);
      }
      await page.goto(base + "/users");
      await page
        .getByRole("button", { name: "Create user", exact: true })
        .click();
      await page.getByRole("dialog").waitFor();
      check(
        await page
          .getByRole("dialog")
          .evaluate(
            (d) =>
              d.getBoundingClientRect().right <= innerWidth &&
              d.getBoundingClientRect().left >= 0,
          ),
        "Mobile form stays within viewport",
      );
      await noOverflow(width + "px open modal");
      await page.screenshot({
        path: `/artifacts/user-dialog-${width}.png`,
        fullPage: true,
      });
      await page.keyboard.press("Escape");
    }
  }
  stage = "reduced motion";
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto(base + "/");
  await page.locator("[data-metric]").first().waitFor();
  await settleCounters();
  check(
    await page
      .locator(".kpi-card")
      .first()
      .evaluate((el) => getComputedStyle(el).animationName === "none"),
    "Reduced motion disables decorative animations and shows exact values",
  );
  await page.setViewportSize({ width: 720, height: 500 });
  await page.evaluate(() => {
    document.documentElement.style.fontSize = "200%";
  });
  await noOverflow("Text zoom workspace");
  const scaleSession = await context.newCDPSession(page);
  await scaleSession.send("Emulation.setDeviceMetricsOverride", {
    width: 720, height: 500, deviceScaleFactor: 2, mobile: false,
  });
  check(await page.evaluate(() => window.devicePixelRatio === 2), "Chromium renders the 200% desktop-scale simulation");
  await noOverflow("200% desktop-scale simulation");
  await page.screenshot({ path: "/artifacts/dashboard-200-percent-scale.png", fullPage: true });
  await scaleSession.send("Emulation.clearDeviceMetricsOverride");
  await scaleSession.detach();
  await page.getByRole("button", { name: "Sign out", exact: true }).click();
  await page.waitForURL(base + "/login");
  await login("phase6c.driver", credentials.workerPassword);
  stage = "driver permissions";
  check(
    (await page.locator("[data-metric]").count()) === 1 &&
      (await page
        .locator("[data-metric]")
        .innerText()
        .then((t) => t.includes("My pending deliveries"))),
    "Driver receives only own assignment metric",
  );
  await page.getByRole("button", { name: "Menu", exact: true }).click();
  check(
    (await page
      .getByRole("link", { name: "Customers", exact: true })
      .count()) === 0 &&
      (await page
        .getByRole("link", { name: "Users & access", exact: true })
        .count()) === 0,
    "Driver navigation excludes business and security administration",
  );
  await page.keyboard.press("Escape");
  await page.getByRole("button", { name: "Sign out", exact: true }).click();
  await page.waitForURL(base + "/login");
  await login("phase6c.admin", credentials.workerPassword);
  if (diagnostics.length) console.error(JSON.stringify(diagnostics));
  check(
    diagnostics.length === 0,
    "No console warnings, React runtime errors or hydration errors",
  );
  console.log(`${passed} Phase 6C Chromium checks passed in a clean context.`);
  await context.close();
} catch (error) {
  let message = String(error.message).split("\n")[0];
  for (const secret of [credentials.password, credentials.workerPassword])
    if (secret) message = message.replaceAll(secret, "[redacted]");
  console.error(`Phase 6C failed during ${stage}: ${message}`);
  if (stage !== "login" && page)
    await page
      .screenshot({ path: "/artifacts/premium-failure.png", fullPage: true })
      .catch(() => {});
  process.exitCode = 1;
} finally {
  await browser.close();
}
