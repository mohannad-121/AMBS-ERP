import { readFileSync } from "node:fs";
import { chromium } from "playwright";

const credentials = JSON.parse(readFileSync(0, "utf8"));
const production = process.argv.includes("--production");
let stage = "browser startup";
let passed = 0;
class CheckFailure extends Error {}
function check(condition, description) {
  if (!condition) throw new CheckFailure(description);
  passed += 1;
  console.log(`PASS ${description}`);
}

async function verify() {
  const browser = await chromium.launch({ headless: true });
  const diagnostics = [];
  try {
    const context = await browser.newContext();
    const page = await context.newPage();
    page.setDefaultTimeout(60000);
    // Preserve browser-provided call stacks for unexpected React diagnostics.
    // This observes console events without replacing or suppressing console APIs.
    const devtools = await context.newCDPSession(page);
    await devtools.send("Runtime.enable");
    devtools.on("Runtime.consoleAPICalled", (event) => {
      if (
        event.args.some(
          (arg) =>
            typeof arg.value === "string" &&
            arg.value.includes("hasn't mounted yet"),
        )
      )
        diagnostics.push({
          type: "console-stack",
          stage,
          text: sanitize(JSON.stringify(event.stackTrace?.callFrames ?? [])),
        });
    });
    // Exercise Suspense retries with cold, delayed Flight responses as well as
    // the normal cached navigations below.
    await page.route("**/*", async (route) => {
      if (route.request().headers().rsc === "1")
        await new Promise((resolve) => setTimeout(resolve, 250));
      await route.continue();
    });
    const statuses = [];
    function sanitize(value) {
      let text = String(value);
      for (const secret of [credentials.password, credentials.workerPassword]) {
        if (secret) text = text.replaceAll(secret, "[redacted]");
      }
      return text.replace(/\?[^\s)]+/g, "?[redacted]");
    }
    page.on("pageerror", (error) => {
      diagnostics.push({
        type: "pageerror",
        stage,
        text: sanitize(error.stack ?? error.message),
      });
    });
    let leakedQuery = false;
    let hmrConnected = false;
    page.on("request", (request) => {
      const url = new URL(request.url());
      if (
        url.searchParams.has("password") ||
        url.searchParams.has("identifier")
      )
        leakedQuery = true;
    });
    page.on("console", (message) => {
      if (message.text().includes("[HMR] connected")) hmrConnected = true;
      if (["error", "warning"].includes(message.type())) {
        diagnostics.push({
          type: message.type(),
          stage,
          text: sanitize(message.text()),
        });
      }
    });
    page.on("response", (response) => {
      if (
        new URL(response.url()).pathname === "/api/auth/login" &&
        response.request().method() === "POST"
      )
        statuses.push(response.status());
    });

    async function login(base, identifier, password, expectedStatus) {
      await page.goto(`${base}/login`);
      const button = page.getByRole("button", { name: "Sign in", exact: true });
      await button.waitFor({ timeout: 30000 });
      await page.getByLabel("Username or email").fill(identifier);
      await page.getByLabel("Password", { exact: true }).fill(password);
      const response = page.waitForResponse(
        (item) =>
          new URL(item.url()).pathname === "/api/auth/login" &&
          item.request().method() === "POST",
      );
      await button.click();
      check(
        (await response).status() === expectedStatus,
        `${stage} returns HTTP ${expectedStatus}`,
      );
      if (expectedStatus === 200)
        await page.waitForURL(`${base}/`, { timeout: 30000 });
    }

    const base = "http://127.0.0.1:3000";
    stage = "invalid-password form submission";
    await login(
      base,
      credentials.username,
      `${credentials.workerPassword}-incorrect`,
      401,
    );
    await page.locator("#login-error").waitFor();
    check(
      await page.locator("#login-error").isVisible(),
      "Invalid password produces an accessible error",
    );

    stage = "username form login";
    await login(base, credentials.username, credentials.password, 200);
    if (!production)
      check(hmrConnected, "127.0.0.1 HMR connects and the login form hydrates");
    await page.getByText("PostgreSQL overview", { exact: true }).waitFor();
    check(
      (await page.locator("h1").textContent()) === "Operational dashboard",
      "Authenticated dashboard renders after form login",
    );
    const cookies = await context.cookies(base);
    check(
      cookies.some(
        (cookie) =>
          cookie.name === "ambs_session" &&
          cookie.httpOnly &&
          cookie.path === "/" &&
          cookie.sameSite === "Lax" &&
          !cookie.secure,
      ),
      "Browser persists the development HttpOnly SameSite session cookie",
    );

    stage = "authenticated refresh";
    await page.reload();
    await page.waitForFunction(
      () => typeof window.next?.router?.push === "function",
    );
    await page.getByText("PostgreSQL overview", { exact: true }).waitFor();
    check(
      (await page.locator("h1").textContent()) === "Operational dashboard",
      "Authentication survives a real page refresh",
    );
    stage = "SUPER_ADMIN navigation";
    await page
      .getByRole("link", { name: "Users & access", exact: true })
      .click();
    await page
      .getByRole("heading", { level: 1, name: "Users & access", exact: true })
      .waitFor();
    await page
      .getByRole("button", { name: "Create user", exact: true })
      .click();
    check(
      await page.getByRole("dialog").isVisible(),
      "SUPER_ADMIN can open User Management and its authorized controls",
    );
    await page
      .getByRole("button", { name: "Close dialog", exact: true })
      .click();
    await page
      .getByRole("link", { name: "Audit history", exact: true })
      .click();
    await page
      .getByRole("heading", { level: 1, name: "Audit history", exact: true })
      .waitFor();
    check(true, "SUPER_ADMIN can open Audit Logs");

    stage = "repeated protected navigation";
    for (let cycle = 0; cycle < 3; cycle += 1) {
      for (const title of [
        "System status",
        "Users & access",
        "Audit history",
      ]) {
        await page.getByRole("link", { name: title, exact: true }).click();
        await page
          .getByRole("heading", { level: 1, name: title, exact: true })
          .waitFor();
      }
      await page.reload();
      await page.waitForFunction(
        () => typeof window.next?.router?.push === "function",
      );
      await page
        .getByRole("heading", { level: 1, name: "Audit history", exact: true })
        .waitFor();
    }
    check(
      true,
      "Repeated navigation and refresh complete in an authenticated browser",
    );

    if (!production) {
      stage = "Fast Refresh during protected navigation";
      async function fastRefresh() {
        await page.waitForFunction(
          () => typeof window.next?.router?.hmrRefresh === "function",
        );
        // Router methods are exposed before AppRouter commits after a full reload.
        // An observed React interaction proves hydration before synthetic HMR.
        await page
          .getByRole("button", { name: "Collapse sidebar", exact: true })
          .click();
        await page.waitForFunction(() =>
          document
            .querySelector(".app-shell")
            ?.classList.contains("sidebar-collapsed"),
        );
        await page
          .getByRole("button", { name: "Expand sidebar", exact: true })
          .click();
        await page.waitForFunction(
          () =>
            !document
              .querySelector(".app-shell")
              ?.classList.contains("sidebar-collapsed"),
        );
        await page.evaluate(() => {
          window.next.router.hmrRefresh();
        });
      }
      for (let cycle = 0; cycle < 3; cycle += 1) {
        // Invoke the same router entry point as Next's Fast Refresh client.
        await fastRefresh();
        await page
          .getByRole("link", { name: "Users & access", exact: true })
          .click();
        await page
          .getByRole("heading", {
            level: 1,
            name: "Users & access",
            exact: true,
          })
          .waitFor();
        await fastRefresh();
        await page
          .getByRole("link", { name: "Audit history", exact: true })
          .click();
        await page
          .getByRole("heading", {
            level: 1,
            name: "Audit history",
            exact: true,
          })
          .waitFor();
      }
      check(
        true,
        "Fast Refresh and navigation settle without losing the authenticated page",
      );
    }

    stage = "logout";
    await page.getByRole("button", { name: "Sign out", exact: true }).click();
    await page.waitForURL(`${base}/login`);
    await page.goto(`${base}/users`);
    await page.waitForURL(`${base}/login`);
    check(true, "Protected browser routes reject access after logout");

    stage = "email form login";
    await login(
      base,
      ` ${credentials.email.toUpperCase()} `,
      credentials.password,
      200,
    );
    await page.getByRole("button", { name: "Sign out", exact: true }).click();
    await page.waitForURL(`${base}/login`);

    stage = "localhost form login";
    await login(
      "http://localhost:3000",
      credentials.username,
      credentials.password,
      200,
    );
    await page.getByText("PostgreSQL overview", { exact: true }).waitFor();
    check(
      true,
      "Both supported local hostnames complete browser authentication",
    );
    check(
      !leakedQuery,
      "Form submissions never put identifier or password fields in URLs",
    );
    check(
      statuses.join(",") === "401,200,200,200",
      "Browser login status sequence includes rejection and three successful logins",
    );
    await page.waitForTimeout(500);
    check(
      !diagnostics.some((item) =>
        /called use\(\)|hydration|hydrating|uncached promise|invalid hook|rendered.*hooks|Minified React error/i.test(
          item.text,
        ),
      ),
      "No React runtime, Suspense or hydration diagnostics",
    );
    check(
      !diagnostics.some((item) => item.type === "pageerror"),
      "No uncaught browser runtime errors",
    );
    check(
      !diagnostics.some(
        (item) =>
          !(
            item.stage === "invalid-password form submission" &&
            item.text ===
              "Failed to load resource: the server responded with a status of 401 (Unauthorized)"
          ),
      ),
      "Console contains only the expected invalid-password HTTP rejection",
    );
    await context.close();

    stage = "JavaScript-disabled form safety";
    const noScript = await browser.newContext({ javaScriptEnabled: false });
    const staticPage = await noScript.newPage();
    await staticPage.goto(`${base}/login`);
    check(
      (await staticPage.locator("form").getAttribute("method")) === "post",
      "Non-hydrated login has an explicit POST fallback",
    );
    check(
      (await staticPage.getByLabel("Username or email").isDisabled()) &&
        (await staticPage.getByLabel("Password", { exact: true }).isDisabled()),
      "Credential inputs remain disabled before hydration",
    );
    check(
      await staticPage.locator("noscript .notice").isVisible(),
      "JavaScript-disabled browsers receive clear instructions",
    );
    const legacy = await noScript.request.get(
      `${base}/login?identifier=redacted&password=redacted`,
      { maxRedirects: 0 },
    );
    check(
      legacy.status() === 307 && legacy.headers().location === "/login",
      "Legacy credential query URLs redirect to a clean login URL",
    );
    await noScript.close();
    console.log(`${passed} Chromium browser checks passed.`);
  } finally {
    for (const diagnostic of diagnostics)
      console.log(JSON.stringify({ browser_diagnostic: diagnostic }));
    await browser.close();
  }
}

verify().catch((error) => {
  // Browser errors can include filled values in their call logs. Never emit
  // raw errors, traces, screenshots, request bodies or credentials.
  console.error(
    error instanceof CheckFailure
      ? error.message
      : `Browser verification stopped during ${stage}.`,
  );
  if (stage === "Fast Refresh during protected navigation") {
    let detail = String(error.message).split("\n")[0];
    for (const secret of [credentials.password, credentials.workerPassword])
      if (secret) detail = detail.replaceAll(secret, "[redacted]");
    console.error(detail);
  }
  process.exitCode = 1;
});
