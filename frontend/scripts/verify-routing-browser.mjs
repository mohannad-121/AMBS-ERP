import { readFileSync } from "node:fs";
import { chromium } from "playwright";
const credentials = JSON.parse(readFileSync(0, "utf8")),
  base = "http://127.0.0.1:3000",
  prefix = "Phase6B Synthetic";
const persistence = process.argv.includes("--persistence"),
  after = process.argv.includes("--after-sales");
const browser = await chromium.launch({ headless: true });
let page,
  stage = "startup",
  passed = 0;
const diagnostics = [];
function check(c, m) {
  if (!c) throw new Error(m);
  console.log("PASS " + m);
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
  async function login(u, p) {
    stage = "login";
    await page.goto(base + "/login");
    await page.getByLabel("Username or email").fill(u);
    await page.getByLabel("Password", { exact: true }).fill(p);
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
  const op = (x = {}) => ({
    request_key: crypto.randomUUID(),
    reason: "Synthetic verified route business operation",
    ...x,
  });
  const modal = () => page.getByRole("dialog");
  async function formSubmit(form, button) {
    await form
      .getByLabel("Routing / trip reason *", { exact: true })
      .fill("Synthetic verified route business operation");
    await form.getByRole("checkbox").check();
    await form.getByRole("button", { name: button, exact: true }).click();
  }
  async function openRouting(deliveryId) {
    await page.goto(base + "/sales");
    await page
      .getByRole("button", { name: "Delivery history", exact: true })
      .click();
    stage = "open routing panel";
    const card = page.locator(`[data-delivery-id="${deliveryId}"]`);
    await card
      .getByRole("button", {
        name: "Driver, route & item journey",
        exact: true,
      })
      .click();
    await modal().getByRole("heading", { name: /DLV-/ }).first().waitFor();
  }
  await login(
    persistence
      ? "phase6b.admin"
      : after
        ? "phase6.admin"
        : credentials.username,
    persistence || after ? credentials.workerPassword : credentials.password,
  );
  if (persistence) {
    stage = "restart persistence";
    const orders = await request("GET", "/sales/orders?search=Phase6B");
    check(orders.total === 1, "Original routed sales order survives restart");
    const order = orders.items[0];
    check(
      order.status === "COMPLETED" && Number(order.lines[0].outstanding) === 0,
      "Routed partial delivery demand remains completed after restart",
    );
    const detail = await request(
      "GET",
      `/routing/deliveries/${order.deliveries[0].id}`,
    );
    check(
      detail.assignment_history.length === 2 &&
        detail.confirmations.length === 2,
      "Driver assignment and confirmed route revision histories persist",
    );
    check(
      detail.calculations.length === 3 &&
        detail.calculations.some((c) => c.status === "UNAVAILABLE"),
      "Successful and failed route snapshots survive restart",
    );
    check(
      detail.trip_status === "COMPLETED" && detail.trip_events.length === 2,
      "Human arrival and completion evidence persists separately",
    );
    check(
      (await request("GET", "/inventory/reconciliation")).healthy,
      "Inventory and reservations reconcile after routing-service restart",
    );
    await openRouting(order.deliveries[0].id);
    await modal()
      .getByText(/Actual arrival:/)
      .waitFor();
    check(
      true,
      "Fresh Chromium context displays persistent trip and route history",
    );
  } else {
    stage = "isolated identities";
    const users = {};
    for (const [name, role] of [
      ["admin", "SUPER_ADMIN"],
      ["operations", "OPERATIONS"],
      ["driver", "DRIVER"],
      ["driver2", "DRIVER"],
      ["packing", "PACKING"],
    ])
      users[name] = await request(
        "POST",
        "/users",
        {
          username: "phase6b." + name,
          display_name: prefix + " " + name,
          password: credentials.workerPassword,
          roles: [role],
        },
        201,
      );
    await logout();
    await login("phase6b.operations", credentials.workerPassword);
    stage = "synthetic fixture";
    const unit = await request(
        "POST",
        "/master/units",
        { name: prefix + " PCS", decimal_places: 0 },
        201,
      ),
      category = await request(
        "POST",
        "/master/categories",
        { name: prefix + " Material" },
        201,
      );
    const item = await request(
      "POST",
      "/master/items",
      {
        name: prefix + " Safety Net",
        item_type: "finished",
        unit_id: unit.id,
        category_id: category.id,
      },
      201,
    );
    const wh = await request(
        "POST",
        "/inventory/warehouses",
        { name: prefix + " Yard", address: "Synthetic origin address" },
        201,
      ),
      loc = await request(
        "POST",
        "/inventory/locations",
        { name: prefix + " Storage", warehouse_id: wh.id },
        201,
      );
    const customer = await request(
      "POST",
      "/master/customers",
      { name: prefix + " Customer", address: "Synthetic destination address" },
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
    let order = await request(
      "POST",
      "/sales/orders",
      op({
        customer_id: customer.id,
        lines: [{ item_id: item.id, quantity: "15" }],
      }),
      201,
    );
    order = await request("POST", `/sales/orders/${order.id}/confirm`, op());
    let delivery = await request(
      "POST",
      `/sales/orders/${order.id}/prepare`,
      op({ warehouse_id: wh.id, destination: "Synthetic destination address" }),
    );
    const d = delivery.id,
      read = () => request("GET", `/routing/deliveries/${d}`);
    await openRouting(d);
    await modal()
      .getByText(/NOT_CONFIGURED/)
      .first()
      .waitFor();
    check(
      true,
      "Unconfigured routing is explicit and does not prevent preparation",
    );
    stage = "driver assignment UI";
    {
      const summary = modal().getByText("Assign / reassign driver", {
        exact: true,
      });
      if (!(await summary.locator("..").evaluate((e) => e.open)))
        await summary.click();
    }
    let assignmentForm = modal()
      .locator("form")
      .filter({
        has: page.getByRole("button", {
          name: "Save driver assignment",
          exact: true,
        }),
      });
    await assignmentForm
      .getByLabel("Eligible driver *", { exact: true })
      .selectOption(users.driver.id);
    await formSubmit(assignmentForm, "Save driver assignment");
    await modal()
      .getByText(/Driver: Phase6B Synthetic driver/)
      .waitFor();
    check(
      (await read()).assignment.driver_id === users.driver.id,
      "Operations assigns an existing eligible driver using the form",
    );
    async function pin(endpoint, kind, sourceId, label, latitude, longitude) {
      stage = "verify pin " + label;
      await modal()
        .getByRole("button", {
          name: `Verify new ${endpoint} pin`,
          exact: true,
        })
        .click();
      const f = modal()
        .locator("form")
        .filter({
          has: page.getByRole("button", {
            name: "Save verified pin",
            exact: true,
          }),
        });
      await f
        .getByLabel("Source record *", { exact: true })
        .selectOption(`${kind}:${sourceId}`);
      await f.getByLabel("Site label *", { exact: true }).fill(label);
      await f
        .getByLabel("Verified address *", { exact: true })
        .fill("Independently verified synthetic fixture address");
      await f
        .getByLabel("Latitude (north/south, -90 to 90) *", { exact: true })
        .fill(latitude);
      await f
        .getByLabel("Longitude (east/west, -180 to 180) *", { exact: true })
        .fill(longitude);
      await formSubmit(f, "Save verified pin");
      await f.waitFor({ state: "hidden" });
      const options = await request("GET", `/routing/deliveries/${d}/options`);
      return options.sites.find((s) => s.label === label);
    }
    stage = "verified endpoints UI";
    const origin = await pin(
      "origin",
      "warehouse",
      wh.id,
      "Phase6B verified origin",
      "25.1972",
      "55.2796",
    );
    let dest = await pin(
      "destination",
      "delivery",
      d,
      "Phase6B verified destination",
      "25.118",
      "55.2003",
    );
    check(
      origin.verification_status === "VERIFIED" &&
        dest.verification_status === "VERIFIED",
      "Coordinates are entered explicitly and saved with source and verification evidence",
    );
    async function calculate() {
      stage = "calculate selected pins";
      const nextRevision =
        ((await read()).calculations.at(-1)?.revision ?? 0) + 1;
      const f = modal()
        .locator("form")
        .filter({
          has: page.getByRole("button", {
            name: /^(Calculate route|Recalculate route)$/,
          }),
        });
      await f
        .getByLabel("Verified origin *", { exact: true })
        .selectOption(origin.id);
      await f
        .getByLabel("Verified destination *", { exact: true })
        .selectOption(dest.id);
      await formSubmit(
        f,
        await f
          .getByRole("button", {
            name: /^(Calculate route|Recalculate route)$/,
          })
          .innerText(),
      );
      await modal()
        .getByRole("heading", {
          name: `Route estimate \u00b7 revision ${nextRevision}`,
          exact: true,
        })
        .waitFor();
    }
    await calculate();
    let r = (await read()).calculations.at(-1);
    check(
      r.status === "SUCCESS" &&
        r.distance_km === "12.35" &&
        r.duration_display === "12 min 45 sec",
      "Mocked HTTP response is normalized into exact server-side km and driving time",
    );
    await modal()
      .getByText(/Synthetic road access restriction/)
      .first()
      .waitFor();
    check(true, "Provider warnings are visible for review");
    check(
      (await modal()
        .getByRole("img", {
          name: "Calculated road route with verified origin and destination pins",
        })
        .count()) === 1,
      "Route geometry preview shows origin, destination and provider road line without public tiles",
    );
    await modal()
      .getByText(/CC BY-SA 4.0/)
      .first()
      .waitFor();
    check(true, "Provider attribution and result license remain visible");
    async function confirm() {
      stage = "confirm route snapshot";
      const f = modal()
        .locator("form")
        .filter({
          has: page.getByRole("button", {
            name: "Confirm route assignment",
            exact: true,
          }),
        });
      await formSubmit(f, "Confirm route assignment");
      await modal().getByText("CONFIRMED", { exact: true }).waitFor();
    }
    await confirm();
    check(
      (await read()).confirmations.length === 1,
      "Reviewed route is confirmed for the current driver assignment",
    );
    check(
      Number(
        (await request("GET", "/sales/availability/" + item.id)).on_hand,
      ) === 8,
      "Route calculation and assignment leave physical stock unchanged",
    );
    await modal().locator(".route-preview").first().scrollIntoViewIfNeeded();
    await page.screenshot({
      path: "/artifacts/route-preview-desktop.png",
      fullPage: true,
    });
    stage = "route failure and revision";
    dest = await pin(
      "destination",
      "delivery",
      d,
      "Phase6B outage destination",
      "25.12",
      "55.4",
    );
    await calculate();
    await modal()
      .getByText(/UNAVAILABLE: Routing provider is unavailable/)
      .waitFor();
    check(
      (await read()).calculations.at(-1).distance_meters === null,
      "Provider outage creates a safe failure without fake distance",
    );
    stage = "prepare revised destination";
    dest = await pin(
      "destination",
      "delivery",
      d,
      "Phase6B revised destination",
      "25.125",
      "55.21",
    );
    await calculate();
    {
      const summary = modal().getByText("Assign / reassign driver", {
        exact: true,
      });
      if (!(await summary.locator("..").evaluate((e) => e.open)))
        await summary.click();
    }
    stage = "driver assignment";
    assignmentForm = modal()
      .locator("form")
      .filter({
        has: page.getByRole("button", {
          name: "Save driver assignment",
          exact: true,
        }),
      });
    await assignmentForm
      .getByLabel("Eligible driver *", { exact: true })
      .selectOption(users.driver2.id);
    await formSubmit(assignmentForm, "Save driver assignment");
    await modal()
      .getByText(/Driver: Phase6B Synthetic driver2/)
      .waitFor();
    await confirm();
    const history = await read();
    check(
      history.assignment_history.length === 2 &&
        history.confirmations.length === 2 &&
        history.calculations.length === 3,
      "Reassignment and destination revision retain all earlier snapshots",
    );
    await modal()
      .getByRole("button", { name: "Close dialog", exact: true })
      .click();
    async function dispatch(d) {
      for (const action of ["pick", "load"])
        await request(
          "POST",
          `/sales/deliveries/${d.id}/${action}`,
          op({
            verified: true,
            lines: d.lines.map((l) => ({ id: l.id, quantity: l.quantity })),
          }),
        );
      return request("POST", `/sales/deliveries/${d.id}/dispatch`, op());
    }
    await dispatch(delivery);
    const partial = await request("GET", "/sales/orders/" + order.id);
    check(
      Number(partial.lines[0].outstanding) === 7 &&
        partial.status === "PARTIALLY_DISPATCHED",
      "Routed first dispatch issues 8 once and leaves 7 outstanding",
    );
    await request("POST", `/sales/deliveries/${d}/dispatch`, op(), 409);
    check(true, "Routing does not bypass duplicate-dispatch protection");
    await openRouting(d);
    await modal()
      .getByRole("button", { name: "Item journey: " + item.name, exact: true })
      .click();
    await modal()
      .getByRole("cell", { name: "Received", exact: true })
      .first()
      .waitFor();
    for (const event of ["Reserved", "Picked", "Loaded", "Dispatched"])
      await modal()
        .getByRole("cell", { name: event, exact: true })
        .first()
        .waitFor();
    check(
      true,
      "Read-only item journey derives receive, reserve, pick, load and dispatch events",
    );
    await modal().getByRole("heading", { name: "Item journey", exact: true }).evaluate(el => {
      const dialog = el.closest("dialog");
      dialog.scrollTop += el.getBoundingClientRect().top - dialog.getBoundingClientRect().top - 110;
    });
    await page.screenshot({ path: "/artifacts/journey-desktop.png", fullPage: true });
    await page.setViewportSize({ width: 390, height: 844 });
    await modal().getByRole("heading", { name: "Item journey", exact: true }).evaluate(el => {
      const dialog = el.closest("dialog");
      dialog.scrollTop += el.getBoundingClientRect().top - dialog.getBoundingClientRect().top - 110;
    });
    await page.screenshot({ path: "/artifacts/journey-mobile.png", fullPage: true });
    await modal().locator(".route-preview").first().scrollIntoViewIfNeeded();
    await page.screenshot({
      path: "/artifacts/routing-mobile.png",
      fullPage: true,
    });
    check(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth + 1,
      ),
      "Mobile routing and item tables stay within the viewport",
    );
    await page.setViewportSize({ width: 1440, height: 1000 });
    await modal()
      .getByRole("button", { name: "Close dialog", exact: true })
      .click();
    await logout();
    await login("phase6b.driver", credentials.workerPassword);
    await page.goto(base + "/sales");
    await page
      .getByRole("heading", { name: "My delivery assignments", exact: true })
      .waitFor();
    check(
      (await page
        .getByRole("button", { name: "Open assigned delivery", exact: true })
        .count()) === 0,
      "Previous driver loses visibility after reassignment",
    );
    await request("GET", `/routing/deliveries/${d}`, undefined, 403);
    await logout();
    await login("phase6b.driver2", credentials.workerPassword);
    await page.goto(base + "/sales");
    await page
      .getByRole("button", { name: "Open assigned delivery", exact: true })
      .click();
    check(
      (await page
        .getByRole("button", { name: "Calculate route", exact: true })
        .count()) === 0 &&
        (await page
          .getByRole("button", { name: "Save driver assignment", exact: true })
          .count()) === 0,
      "Assigned driver has no kilometer, routing or reassignment controls",
    );
    await request(
      "POST",
      `/routing/deliveries/${d}/calculate`,
      op({ origin_id: origin.id, destination_id: dest.id }),
      403,
    );
    let f = page
      .locator("form")
      .filter({
        has: page.getByRole("button", {
          name: "Confirm actual arrival",
          exact: true,
        }),
      });
    await formSubmit(f, "Confirm actual arrival");
    await page
      .getByRole("button", { name: "Confirm trip completion", exact: true })
      .waitFor();
    f = page
      .locator("form")
      .filter({
        has: page.getByRole("button", {
          name: "Confirm trip completion",
          exact: true,
        }),
      });
    await formSubmit(f, "Confirm trip completion");
    await page.getByText(/Trip: COMPLETED/).waitFor();
    check(
      true,
      "Driver explicitly records actual arrival then trip completion using server timestamps",
    );
    await logout();
    await login("phase6b.operations", credentials.workerPassword);
    await receive(7);
    delivery = await request(
      "POST",
      `/sales/orders/${order.id}/prepare`,
      op({ warehouse_id: wh.id, destination: "Synthetic destination address" }),
    );
    await dispatch(delivery);
    check(
      (await request("GET", "/sales/orders/" + order.id)).status ===
        "COMPLETED",
      "Separate second delivery fulfills remaining 7 without duplicating demand",
    );
    check(
      (await request("GET", "/inventory/reconciliation")).healthy,
      "Routing, trip events and partial deliveries preserve stock reconciliation",
    );
    await logout();
    await login("phase6b.admin", credentials.workerPassword);
    check(
      (await request("GET", "/audit?action=routes.confirmations.confirmed"))
        .total === 2,
      "Route confirmations are recorded in the existing audit trail",
    );
    for (const path of [
      "/sales",
      "/inventory/overview",
      "/purchasing/orders",
      "/master/items",
      "/users",
      "/audit",
    ]) {
      await page.goto(base + path);
      await page.locator("h1").waitFor();
      check(
        !(await page.getByRole("alert").allTextContents()).some((s) =>
          s.trim(),
        ),
        "Existing " + path + " screen remains accessible",
      );
    }
    await page.reload();
    await page.locator("h1").waitFor();
    await logout();
    await page.goto(base + "/sales");
    await page.waitForURL(base + "/login");
    await login("phase6b.admin", credentials.workerPassword);
    check(
      true,
      "Refresh, logout protection and subsequent login remain intact",
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
    `${passed} Phase 6B mocked-provider Chromium checks passed${persistence ? " after service restart" : ""}. Live ORS NOT RUN.`,
  );
  await context.close();
} catch (e) {
  let message = String(e.message).split("\n")[0];
  for (const s of [credentials.password, credentials.workerPassword])
    if (s) message = message.replaceAll(s, "[redacted]");
  console.error(`Phase 6B browser failed during ${stage}: ${message}`);
  if (page && stage !== "login") {
    console.error(
      JSON.stringify({
        alerts: await page.getByRole("alert").allTextContents(),
      }),
    );
    await page
      .screenshot({ path: "/artifacts/routing-failure.png", fullPage: true })
      .catch(() => {});
  }
  process.exitCode = 1;
} finally {
  await browser.close();
}
