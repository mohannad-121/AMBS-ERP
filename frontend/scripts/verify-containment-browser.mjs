import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { chromium } from "playwright";
const credentials = JSON.parse(readFileSync(0, "utf8"));
const base = process.env.AMBS_BROWSER_BASE_URL;
assert.ok(base?.startsWith("https://"));
const marker = "__AMBS_UNTRUSTED_GLOB__*?[qa]";
const browser = await chromium.launch({ headless: true });
try {
  const context = await browser.newContext({ ignoreHTTPSErrors: process.env.AMBS_QA_SELF_SIGNED_TLS === "1" });
  for (const path of ["/_next/image?url=" + encodeURIComponent("/" + marker) + "&w=64&q=75", "/_next/webpack-hmr", "/__nextjs_original-stack-frames", "/docs", "/redoc", "/openapi.json"]) {
    const response = await context.request.get(base + path);
    assert.equal(response.status(), 404, path);
  }
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", error => errors.push(error.message));
  page.on("console", message => { if (["error", "warning"].includes(message.type())) errors.push(message.text()); });
  await page.goto(base + "/login");
  await page.getByLabel("Username or email").fill(credentials.username);
  await page.getByLabel("Password", { exact: true }).fill(credentials.password);
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await page.waitForURL(base + "/");
  const cookies = await context.cookies();
  const session = cookies.find(cookie => cookie.name === "__Host-ambs_session");
  assert.ok(session?.secure && session.httpOnly && session.path === "/");
  async function request(method, path, data) {
    const { csrf_token } = await (await context.request.get(base + "/api/auth/csrf")).json();
    return context.request.fetch(base + "/api" + path, { method, data, headers: { Origin: base, "X-CSRF-Token": csrf_token } });
  }
  const unitResponse = await request("POST", "/master/units", { name: "Containment QA PCS", decimal_places: 0 });
  assert.equal(unitResponse.status(), 201);
  const unit = await unitResponse.json();
  const categoryResponse = await request("POST", "/master/categories", { name: "Containment QA" });
  assert.equal(categoryResponse.status(), 201);
  const category = await categoryResponse.json();
  const itemResponse = await request("POST", "/master/items", { name: marker, item_type: "component", category_id: category.id, unit_id: unit.id });
  assert.equal(itemResponse.status(), 201);
  const item = await itemResponse.json();
  for (const path of ["/master/items?search=" + encodeURIComponent(marker), "/audit?search=" + encodeURIComponent(marker), "/master/items/" + item.id]) {
    const response = await request("GET", path);
    assert.equal(response.status(), 200, path);
  }
  // Filename is not an accepted path input. Bounded invalid upload must fail closed.
  const upload = await request("PUT", `/master/items/${item.id}/image`, { filename: marker + ".pdf", mime_type: "application/pdf", content_base64: "cWE=" });
  assert.equal(upload.status(), 422, "unsupported document and filename fields rejected");
  const content_base64 = await page.evaluate(() => {
    const canvas = document.createElement("canvas"); canvas.width = 1; canvas.height = 1;
    return canvas.toDataURL("image/png").split(",")[1];
  });
  assert.equal((await request("PUT", `/master/items/${item.id}/image`, { filename: marker + ".png", mime_type: "image/png", content_base64 })).status(), 422);
  assert.equal((await request("PUT", `/master/items/${item.id}/image`, { mime_type: "image/png", content_base64 })).status(), 200);
  assert.equal((await request("GET", `/master/items/${item.id}/image`)).status(), 200);
  const csrfFailure = await context.request.post(base + "/api/master/units", { data: { name: marker }, headers: { Origin: base } });
  assert.equal(csrfFailure.status(), 403);
  for (const path of ["/master/items", "/users", "/audit", "/", "/master/items"]) {
    await page.goto(base + path);
    assert.ok((await page.locator("body").innerText()).length > 30);
  }
  await page.reload();
  assert.deepEqual(errors, []);
  await page.getByRole("button", { name: "Sign out", exact: true }).click();
  await page.waitForURL(base + "/login");
  console.log("PASS HTTPS secure sessions, CSRF, bounded request/item/database/upload inputs, navigation, clean console, logout");
  await context.close();
} catch {
  throw new Error("Production containment browser verification failed (credentials redacted)");
} finally {
  await browser.close();
}
