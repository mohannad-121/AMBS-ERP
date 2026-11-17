import { readFileSync } from "node:fs";
import { chromium } from "playwright";

const credentials = JSON.parse(readFileSync(0, "utf8"));
const base = "http://127.0.0.1:3000";
const persistence = process.argv.includes("--persistence");
const prefix = "Phase3 Synthetic";
let stage = "startup",
  passed = 0;
const browser = await chromium.launch({ headless: true });
let page;
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
  page.setDefaultTimeout(60000);
  const diagnostics = [];
  page.on("console", (message) => {
    if (["warning", "error"].includes(message.type()))
      diagnostics.push({ stage, type: message.type(), text: message.text() });
  });
  page.on("pageerror", (error) =>
    diagnostics.push({ stage, type: "exception", text: error.message }),
  );
  async function login(username, password) {
    await page.goto(`${base}/login`);
    await page.getByRole("button", { name: "Sign in", exact: true }).waitFor();
    await page.getByLabel("Username or email").fill(username);
    await page.getByLabel("Password", { exact: true }).fill(password);
    await page.getByRole("button", { name: "Sign in", exact: true }).click();
    await page.waitForURL(`${base}/`);
    await page.getByRole("link", { name: "Customers", exact: true }).waitFor();
  }
  async function request(method, path, data, expected = 200) {
    const csrf = await context.request.get(`${base}/api/auth/csrf`);
    const response = await context.request.fetch(`${base}/api${path}`, {
      method,
      data,
      headers: { Origin: base, "X-CSRF-Token": (await csrf.json()).csrf_token },
    });
    if (response.status() !== expected)
      throw new Error(
        `API fixture failed at ${path} with ${response.status()}`,
      );
    return response;
  }
  async function create(resource, title, fill) {
    await page.goto(`${base}/master/${resource}`);
    await page
      .getByRole("button", { name: `Create ${title}`, exact: true })
      .click();
    await fill();
    await page
      .getByRole("button", { name: "Save record", exact: true })
      .click();
    await page.getByRole("dialog").waitFor({ state: "hidden" });
    await page
      .getByText("Record saved successfully.", { exact: true })
      .waitFor();
  }
  async function select(label, text) {
    const field = page.getByLabel(label, { exact: true });
    const exactText = new RegExp(
      `^${text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\s*$`,
    );
    await field
      .locator("option")
      .filter({ hasText: exactText })
      .first()
      .waitFor({ state: "attached" });
    const value = await field
      .locator("option")
      .filter({ hasText: exactText })
      .first()
      .getAttribute("value");
    await field.selectOption(value);
    await page.waitForTimeout(150);
    check(
      (await field.inputValue()) === value,
      `Reference selection persists for ${label}`,
    );
  }
  stage = "dedicated test administrator login";
  await login(persistence ? "phase3.audit.admin" : credentials.username, persistence ? credentials.workerPassword : credentials.password);
  if (persistence) {
    stage = "restart persistence";
    const customers = await (
      await request(
        "GET",
        `/master/customers?search=${encodeURIComponent(prefix)}`,
      )
    ).json();
    const items = await (
      await request("GET", `/master/items?search=${encodeURIComponent(prefix)}`)
    ).json();
    check(
      customers.total === 2 && items.total === 2,
      "Customer and independently identified variants survive service restart",
    );
    const imageItem = items.items.find((item) => item.name.endsWith("STD"));
    const image = await request("GET", `/master/items/${imageItem.id}/image`);
    check(
      image.headers()["content-type"] === "image/png",
      "Approved image survives backend and frontend restart on persistent storage",
    );
    await page.goto(`${base}/master/customers`);
    await page
      .getByText(`${prefix} Customer`, { exact: true })
      .first()
      .waitFor();
  } else {
    stage = "operations account fixture";
    await request(
      "POST",
      "/users",
      {
        username: "phase3.operations",
        display_name: "Phase3 Test Operations",
        password: credentials.workerPassword,
        roles: ["OPERATIONS"],
      },
      201,
    );
    await request(
      "POST",
      "/users",
      {
        username: "phase3.sales",
        display_name: "Phase3 Test Sales",
        password: credentials.workerPassword,
        roles: ["SALES"],
      },
      201,
    );
    // Separate this suite's audit/restart identity from the auth suite's
    // intentionally exercised sign-in budget. Never relax application limits.
    await request("POST", "/users", {
      username: "phase3.audit.admin",
      display_name: "Phase3 Audit Test Administrator",
      password: credentials.workerPassword,
      roles: ["SUPER_ADMIN"],
    }, 201);
    await page.getByRole("button", { name: "Sign out", exact: true }).click();
    await page.waitForURL(`${base}/login`);
    await login("phase3.operations", credentials.workerPassword);
    check(
      (await page
        .getByRole("link", { name: "Users & access", exact: true })
        .count()) === 0,
      "Operations receives business access without security administration",
    );
    stage = "customer create";
    await create("customers", "customer", async () => {
      await page
        .getByLabel("Official customer name *", { exact: true })
        .fill(`${prefix} Customer`);
    });
    check(true, "Operations creates a customer through the actual form");
    stage = "duplicate warning";
    await page
      .getByRole("button", { name: "Create customer", exact: true })
      .click();
    await page
      .getByLabel("Official customer name *", { exact: true })
      .fill(` ${prefix.toUpperCase()}   CUSTOMER `);
    await page
      .getByRole("button", { name: "Save record", exact: true })
      .click();
    await page
      .getByText("A customer with this normalized name already exists.", {
        exact: false,
      })
      .first()
      .waitFor();
    check(
      await page
        .getByLabel("I confirm this is a distinct customer", { exact: true })
        .isVisible(),
      "Normalized customer duplicate requires an explicit reviewed override",
    );
    await page
      .getByLabel("I confirm this is a distinct customer", { exact: true })
      .check();
    await page
      .getByLabel("Reason for separate customer", { exact: true })
      .fill("Synthetic distinct legal entity for regression");
    await page
      .getByRole("button", { name: "Save record", exact: true })
      .click();
    await page.getByRole("dialog").waitFor({ state: "hidden" });
    const customers = await (await request("GET", "/master/customers")).json();
    const customerId = customers.items.find(
      (item) => item.name === `${prefix} Customer`,
    ).id;
    for (let index = 1; index <= 3; index++) {
      stage = `project ${index}`;
      await create("projects", "project", async () => {
        await page
          .getByLabel("Project name *", { exact: true })
          .fill(`${prefix} Site ${index}`);
        await select("Customer", `${prefix} Customer`);
      });
      stage = `LPO ${index}`;
      await create("lpos", "LPO reference", async () => {
        await page
          .getByLabel("Reference description *", { exact: true })
          .fill(`${prefix} LPO ${index}`);
        await page
          .getByLabel("Customer-issued LPO number *", { exact: true })
          .fill(`SYN-LPO-${index}`);
        await select("Customer", `${prefix} Customer`);
        await select("Project (optional)", `${prefix} Site ${index}`);
      });
    }
    const projects = await (
      await request("GET", `/master/projects?customer_id=${customerId}`)
    ).json();
    check(
      projects.total === 3,
      "One customer supports three projects and separate LPOs",
    );
    await page.goto(`${base}/master/customers/${customerId}`);
    await page
      .getByRole("heading", { name: "Linked projects", exact: true })
      .waitFor();
    check(
      await page
        .getByRole("heading", { name: "Linked lpo references", exact: true })
        .isVisible(),
      "Customer detail exposes linked projects and LPO references",
    );
    stage = "reference data";
    await create("categories", "category", async () => {
      await page
        .getByLabel("Category name *", { exact: true })
        .fill(`${prefix} Safety`);
    });
    await create("units", "unit", async () => {
      await page
        .getByLabel("Unit name (for example PCS) *", { exact: true })
        .fill("PCS");
    });
    await create("families", "family", async () => {
      await page
        .getByLabel("Family name *", { exact: true })
        .fill(`${prefix} Safety Net`);
      for (const [index, key, values] of [
        [1, "design", "STD, MAXI"],
        [2, "length", "4.0 m, 6.0 m"],
        [3, "colour", "Yellow, Red"],
      ]) {
        await page
          .getByRole("button", { name: "Add attribute", exact: true })
          .click();
        await page
          .getByLabel(`Attribute key ${index}`, { exact: true })
          .fill(key);
        await page
          .getByLabel(`Approved values ${index} (comma separated)`, {
            exact: true,
          })
          .fill(values);
      }
    });
    stage = "approved variant forms";
    for (const [name, design, length, colour] of [
      ["STD", "std", "4.0 m", "yellow"],
      ["MAXI", "maxi", "6.0 m", "red"],
    ]) {
      await create("items", "item", async () => {
        await page
          .getByLabel("Item name *", { exact: true })
          .fill(`${prefix} ${name}`);
        await select("Category", `${prefix} Safety`);
        await select("Unit of measure", "PCS");
        await select("Product family (optional)", `${prefix} Safety Net`);
        await page.getByLabel("design *", { exact: true }).selectOption(design);
        await page.getByLabel("length *", { exact: true }).selectOption(length);
        await page.getByLabel("colour *", { exact: true }).selectOption(colour);
      });
    }
    const items = await (await request("GET", "/master/items")).json();
    check(
      items.total === 2 &&
        items.items[0].id !== items.items[1].id &&
        items.items[0].code !== items.items[1].code,
      "Approved variants have independent item identities and stable codes",
    );
    const imageItem = items.items.find((item) => item.name.endsWith("STD"));
    stage = "item image upload";
    await page.goto(`${base}/master/items/${imageItem.id}`);
    // Small valid synthetic PNG, containing no company material.
    const png = Buffer.from(
      "iVBORw0KGgoAAAANSUhEUgAAAAwAAAAICAIAAABChommAAAAFElEQVR4nGP8/5+BIGAirGS4KwIAVTkCDuMGFAIAAAAASUVORK5CYII=",
      "base64",
    );
    await page
      .getByLabel("Upload or replace image (PNG, JPEG, WebP · max 5 MiB)", {
        exact: true,
      })
      .setInputFiles({
        name: "synthetic.png",
        mimeType: "image/png",
        buffer: png,
      });
    await page.getByRole("button", { name: "Save image", exact: true }).click();
    await page
      .getByText("Approved item image saved.", { exact: true })
      .waitFor();
    await page
      .getByRole("img", { name: imageItem.name, exact: true })
      .waitFor();
    await page.waitForFunction(
      (name) =>
        Array.from(document.images).some(
          (image) =>
            image.alt === name && image.complete && image.naturalWidth > 0,
        ),
      imageItem.name,
    );
    check(
      await page
        .getByRole("img", { name: imageItem.name, exact: true })
        .evaluate((image) => image.complete && image.naturalWidth > 0),
      "Uploaded image renders from the authenticated local endpoint",
    );
    const anonymous = await browser.newContext();
    check(
      (
        await anonymous.request.get(
          `${base}/api/master/items/${imageItem.id}/image`,
        )
      ).status() === 401,
      "Anonymous image retrieval is rejected",
    );
    await anonymous.close();
    stage = "edit archive and refresh";
    await page.goto(`${base}/master/items`);
    const row = page.getByRole("row").filter({ hasText: imageItem.name });
    await row.getByRole("button", { name: "Edit", exact: true }).click();
    await page
      .getByLabel("Description", { exact: true })
      .fill("Reviewed synthetic image item");
    await page
      .getByRole("button", { name: "Save record", exact: true })
      .click();
    await page.getByRole("dialog").waitFor({ state: "hidden" });
    await row.getByRole("button", { name: "Archive", exact: true }).click();
    await page.getByRole("button", { name: "Confirm", exact: true }).click();
    await page.getByRole("dialog").waitFor({ state: "hidden" });
    await page.reload();
    await page
      .getByRole("row")
      .filter({ hasText: imageItem.name })
      .getByText("Archived", { exact: true })
      .waitFor();
    check(true, "Edit and confirmed archive persist across browser refresh");
    stage = "responsive interface";
    await page.screenshot({
      path: "/artifacts/master-desktop.png",
      fullPage: true,
    });
    await page.setViewportSize({ width: 768, height: 1024 });
    check(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
      "Tablet layout has no document-level horizontal overflow",
    );
    await page.screenshot({
      path: "/artifacts/master-tablet.png",
      fullPage: true,
    });
    await page.setViewportSize({ width: 1440, height: 1000 });
    stage = "read-only role";
    await page.getByRole("button", { name: "Sign out", exact: true }).click();
    await page.waitForURL(`${base}/login`);
    await login("phase3.sales", credentials.workerPassword);
    await page.goto(`${base}/master/customers`);
    await page
      .getByText(`${prefix} Customer`, { exact: true })
      .first()
      .waitFor();
    check(
      (await page
        .getByRole("button", { name: "Create customer", exact: true })
        .count()) === 0 &&
        (await page
          .getByRole("button", { name: "Edit", exact: true })
          .count()) === 0,
      "Sales sees read-only business interfaces",
    );
    await request(
      "POST",
      "/master/customers",
      { name: "Forbidden synthetic" },
      403,
    );
    check(
      true,
      "Backend rejects sales master-data writes independently of action visibility",
    );
    stage = "audit verification";
    await page.getByRole("button", { name: "Sign out", exact: true }).click();
    await page.waitForURL(`${base}/login`);
    await login("phase3.audit.admin", credentials.workerPassword);
    const audit = await (
      await request("GET", "/audit?action=images.uploaded")
    ).json();
    check(
      audit.total === 1,
      "Image changes are included in the existing audit trail",
    );
  }
  if (diagnostics.length) {
    let safe = JSON.stringify(diagnostics);
    for (const secret of [credentials.password, credentials.workerPassword])
      if (secret) safe = safe.replaceAll(secret, "[redacted]");
    console.error(safe);
  }
  check(
    !diagnostics.some(
      (item) =>
        item.type === "exception" ||
        /called use\(|hydration|uncached promise|invalid hook/i.test(item.text),
    ),
    "No React runtime, hydration or uncaught browser errors during master-data flows",
  );
  check(
    !diagnostics.some(
      (item) =>
        !(
          item.stage === "duplicate warning" &&
          item.text.includes("409 (Conflict)")
        ),
    ),
    "No unexpected console warnings or errors in master-data browser flows",
  );
  console.log(
    `${passed} Phase 3 Chromium checks passed${persistence ? " after service restart" : ""}.`,
  );
  await context.close();
} catch (error) {
  // Never emit Playwright call logs; they may contain filled credentials.
  console.error(`Phase 3 browser verification failed during ${stage}.`);
  let message = String(error.message).split("\n")[0];
  for (const secret of [credentials.password, credentials.workerPassword])
    if (secret) message = message.replaceAll(secret, "[redacted]");
  console.error(message);
  if (
    page &&
    !stage.includes("login") &&
    stage !== "operations account fixture"
  ) {
    console.error(
      JSON.stringify({
        alerts: await page.locator('[role="alert"]').allTextContents(),
      }),
    );
    console.error(
      JSON.stringify({
        selects: await page.locator("dialog select").evaluateAll((elements) =>
          elements.map((element) => ({
            id: element.id,
            value: element.value,
            options: Array.from(element.options).map((option) => ({
              text: option.text,
              value: option.value,
            })),
          })),
        ),
      }),
    );
    await page
      .screenshot({ path: "/artifacts/master-failure.png", fullPage: true })
      .catch(() => {});
  }
  process.exitCode = 1;
} finally {
  await browser.close();
}
