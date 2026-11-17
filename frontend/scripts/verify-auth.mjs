import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const credentials = JSON.parse(readFileSync(0, "utf8"));
const base = "http://127.0.0.1:3000";
let passed = 0;
function check(condition, description) {
  assert.ok(condition, description);
  passed += 1;
  console.log(`PASS ${description}`);
}

class BrowserSession {
  cookies = new Map();
  async request(path, method = "GET", body, options = {}) {
    const headers = {
      Origin: base,
      Cookie: [...this.cookies]
        .map(([key, value]) => `${key}=${value}`)
        .join("; "),
      ...options.headers,
    };
    if (method !== "GET") headers["Content-Type"] = "application/json";
    const response = await fetch(`${base}${path}`, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
      redirect: "manual",
      signal: AbortSignal.timeout(60000),
    });
    for (const cookie of response.headers.getSetCookie()) {
      const [pair] = cookie.split(";");
      const separator = pair.indexOf("=");
      const name = pair.slice(0, separator);
      const value = pair.slice(separator + 1);
      if (/max-age=0/i.test(cookie)) this.cookies.delete(name);
      else this.cookies.set(name, value);
    }
    return response;
  }
  async mutate(path, method, body) {
    const csrf = await this.request("/api/auth/csrf");
    assert.equal(csrf.status, 200);
    const { csrf_token } = await csrf.json();
    return this.request(path, method, body, {
      headers: { "X-CSRF-Token": csrf_token },
    });
  }
  async login(username, password) {
    return this.mutate("/api/auth/login", "POST", {
      identifier: username,
      password,
    });
  }
}

const admin = new BrowserSession();
const redirect = await admin.request("/");
check(
  [302, 307].includes(redirect.status) &&
    redirect.headers.get("location")?.includes("/login"),
  "Protected homepage redirects to login",
);
const loginPage = await admin.request("/login");
check(
  loginPage.status === 200 &&
    (await loginPage.text()).includes("Sign in to AMBS ERP"),
  "Actual Next.js login page renders",
);
check(
  (await admin.request("/api/users")).status === 401,
  "Anonymous BFF user API rejects access",
);
const bootstrap = await admin.request("/api/auth/csrf");
check(
  bootstrap.status === 200 &&
    bootstrap.headers
      .getSetCookie()
      .some(
        (value) =>
          value.includes("ambs_session=") &&
          /httponly/i.test(value) &&
          /samesite=lax/i.test(value),
      ),
  "BFF forwards HttpOnly SameSite session cookies",
);
const anonymousToken = admin.cookies.get("ambs_session");
check(
  (
    await admin.request("/api/auth/login", "POST", {
      identifier: credentials.username,
      password: credentials.password,
    })
  ).status === 403,
  "Login without CSRF is rejected through BFF",
);
const originToken = await (await admin.request("/api/auth/csrf")).json();
check(
  (
    await admin.request(
      "/api/auth/login",
      "POST",
      { identifier: credentials.username, password: credentials.password },
      {
        headers: {
          Origin: "https://evil.example",
          "X-CSRF-Token": originToken.csrf_token,
        },
      },
    )
  ).status === 403,
  "Cross-origin login is rejected through BFF",
);
const login = await admin.login(credentials.username, credentials.password);
check(
  login.status === 200 && admin.cookies.get("ambs_session") !== anonymousToken,
  "Valid BFF login rotates the anonymous session",
);
const me = await admin.request("/api/auth/me");
check(
  me.status === 200 && (await me.json()).username === credentials.username,
  "Session cookie authenticates the current-user API",
);
const status = await admin.request("/api/status");
const connectivity = await status.json();
check(
  status.status === 200 &&
    connectivity.backend.available &&
    connectivity.database.available,
  "Authenticated status uses actual API and PostgreSQL responses",
);
const usersPage = await admin.request("/users");
check(
  usersPage.status === 200 &&
    (await usersPage.text()).includes("Users &amp; access"),
  "Authenticated Next.js user administration page renders",
);
const create = await admin.mutate("/api/users", "POST", {
  username: "http.test.worker",
  display_name: "HTTP Test Worker",
  password: credentials.workerPassword,
  roles: ["OPERATIONS", "SALES"],
});
const worker = await create.json();
check(
  create.status === 201 && !JSON.stringify(worker).includes("password_hash"),
  "BFF creates a real test account with safe response fields",
);
const operator = new BrowserSession();
check(
  (await operator.login(worker.username, credentials.workerPassword)).status ===
    200 && (await operator.request("/api/users")).status === 403,
  "Operations account signs in and is denied security administration",
);
check(
  (
    await admin.mutate(`/api/users/${worker.id}/roles`, "PUT", {
      roles: ["PACKING", "MANAGEMENT"],
    })
  ).status === 200 && (await operator.request("/api/auth/me")).status === 401,
  "Role changes revoke existing sessions through BFF",
);
await operator.login(worker.username, credentials.workerPassword);
check(
  (
    await admin.mutate(`/api/users/${worker.id}/password`, "POST", {
      password: credentials.password,
    })
  ).status === 200 && (await operator.request("/api/auth/me")).status === 401,
  "Password reset revokes the test account session",
);
check(
  (
    await admin.mutate(`/api/users/${worker.id}/activation`, "PATCH", {
      is_active: false,
    })
  ).status === 200 &&
    (await operator.login(worker.username, credentials.password)).status ===
      401,
  "Deactivated account cannot sign in",
);
check(
  (
    await admin.mutate(`/api/users/${worker.id}/activation`, "PATCH", {
      is_active: true,
    })
  ).status === 200 &&
    (await operator.login(worker.username, credentials.password)).status ===
      200,
  "Reactivated account can sign in with its reset password",
);
const account = await (await admin.request("/api/auth/me")).json();
check(
  (await admin.mutate(`/api/users/${account.id}/roles`, "PUT", { roles: [] }))
    .status === 409,
  "BFF cannot remove the last active SUPER_ADMIN",
);
const audit = await admin.request(
  "/api/audit?action=auth.login_succeeded&actor=http.test.admin",
);
check(
  audit.status === 200 && (await audit.json()).total >= 1,
  "Authorized audit filters return recorded authentication events",
);
const auditPage = await admin.request("/audit");
check(
  auditPage.status === 200 &&
    (await auditPage.text()).includes("Audit history"),
  "Authenticated Next.js audit page renders",
);
const replay = new BrowserSession();
replay.cookies = new Map(admin.cookies);
check(
  (await admin.mutate("/api/auth/logout", "POST", {})).status === 200 &&
    (await replay.request("/api/auth/me")).status === 401,
  "Logout revokes the session and blocks cookie replay",
);
console.log(`${passed} live HTTP/BFF checks passed.`);
