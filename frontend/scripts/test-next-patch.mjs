import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import {
  mkdtempSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
  rmSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import test from "node:test";

const script = fileURLToPath(
  new URL("./patch-next-router.mjs", import.meta.url),
);
const require = createRequire(import.meta.url);
function isolated(version, run) {
  const directory = mkdtempSync(join(tmpdir(), "ambs-patch-test-"));
  try {
    const packageDirectory = join(directory, "node_modules/next");
    mkdirSync(packageDirectory, { recursive: true });
    writeFileSync(
      join(packageDirectory, "package.json"),
      JSON.stringify({ name: "next", version }),
    );
    writeFileSync(join(directory, "patch.mjs"), readFileSync(script));
    run(directory, packageDirectory);
  } finally {
    assert.equal(dirname(resolve(directory)), resolve(tmpdir()));
    assert.ok(directory.includes("ambs-patch-test-"));
    rmSync(directory, { recursive: true });
  }
}
test("incompatible Next versions fail explicitly", () => {
  isolated("99.0.0", (directory) => {
    assert.throws(
      () =>
        execFileSync(process.execPath, [join(directory, "patch.mjs")], {
          stdio: "pipe",
        }),
      (failure) =>
        String(failure.stderr).includes(
          "Review the Next router compatibility patch for Next 99.0.0",
        ),
    );
  });
});
test("unexpected distribution source fails without overwriting it", () => {
  isolated("16.4.6", (directory, packageDirectory) => {
    const file = join(
      packageDirectory,
      "dist/client/components/layout-router.js",
    );
    mkdirSync(dirname(file), { recursive: true });
    writeFileSync(file, "// unexpected distribution");
    assert.throws(
      () =>
        execFileSync(process.execPath, [join(directory, "patch.mjs")], {
          stdio: "pipe",
        }),
      (failure) =>
        String(failure.stderr).includes("Next router patch context changed"),
    );
    assert.equal(readFileSync(file, "utf8"), "// unexpected distribution");
  });
});
test("installed compatibility patch is idempotent in both distributions", () => {
  const next = dirname(require.resolve("next/package.json"));
  const files = [
    "dist/client/components/layout-router.js",
    "dist/esm/client/components/layout-router.js",
  ].map((file) => join(next, file));
  const hashes = () =>
    files.map((file) =>
      createHash("sha256").update(readFileSync(file)).digest("hex"),
    );
  const before = hashes();
  execFileSync(process.execPath, [script], { stdio: "pipe" });
  assert.deepEqual(hashes(), before);
  for (const file of files)
    assert.ok(
      readFileSync(file, "utf8").includes(
        "AMBS: reconcile cached RSC promises",
      ),
    );
});
