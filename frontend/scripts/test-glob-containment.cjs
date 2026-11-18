const assert = require("node:assert/strict");
const { readFileSync, existsSync } = require("node:fs");
const { createHash } = require("node:crypto");
const test = require("node:test");
const marker = "__AMBS_UNTRUSTED_GLOB__*?[qa]";
const base = process.env.FRONTEND_SOURCE || "/app";
const requireApp = require("node:module").createRequire(base + "/package.json");
const { hasLocalMatch } = requireApp("next/dist/shared/lib/match-local-pattern");
const { hasRemoteMatch } = requireApp("next/dist/shared/lib/match-remote-pattern");
test("bounded untrusted URLs never become image glob patterns", () => {
  const path = process.env.AMBS_GLOB_TRACE;
  assert.ok(path, "observer output required");
  // Positive control proves that the observer detects the actual vendored API.
  requireApp("next/dist/compiled/picomatch").makeRe("trusted/**");
  const before = readFileSync(path, "utf8");
  assert.ok(before.includes("trusted/**"));
  for (const value of [marker, "plain-item", "invoice[1].pdf", "../picture.png"]) {
    const url = new URL("https://example.invalid/" + encodeURIComponent(value));
    assert.equal(hasLocalMatch([], url.pathname), false);
    assert.equal(hasRemoteMatch([], [], url), false);
  }
  assert.equal(readFileSync(path, "utf8"), before);
});
test("production artifact closes image optimizer and excludes development tools", () => {
  const config = JSON.parse(readFileSync(base + "/.next/required-server-files.json")).config;
  assert.equal(config.images.unoptimized, true);
  // Next injects its two fixed static-media patterns during normalization.
  assert.deepEqual(config.images.localPatterns, [
    { pathname: "/_next/static/media/**", search: "" },
    { pathname: "/_next/static/immutable/media/**", search: "" },
  ]);
  assert.deepEqual(config.images.remotePatterns, []);
  assert.equal(config.productionBrowserSourceMaps, false);
  for (const pkg of ["typescript", "eslint", "typescript-eslint", "tinyglobby", "fast-glob", "micromatch", "picomatch"]) {
    assert.equal(existsSync(base + "/node_modules/" + pkg), false, pkg + " must not ship");
  }
  const vendor = requireApp.resolve("next/dist/compiled/picomatch");
  console.log("Vendored matcher SHA256 " + createHash("sha256").update(readFileSync(vendor)).digest("hex"));
  // Presence is deliberately reported, not concealed or described as patched.
});
