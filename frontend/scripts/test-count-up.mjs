import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import ts from "typescript";

// Exercise the actual typed production helpers without adding a test dependency.
const source = readFileSync(new URL("../lib/quantity.ts", import.meta.url), "utf8");
const compiled = ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.ESNext } }).outputText;
const { counterProgress, fixedQuantity, formatQuantity } = await import("data:text/javascript;base64," + Buffer.from(compiled).toString("base64"));

test("original first-frame algorithm reproduces the observed BigInt failure", () => {
  const target = BigInt("67407360"), precision = 6;
  const oldProgress = Math.min(1, -1 / 1400);
  const scaled = target * BigInt(Math.round((1 - Math.pow(1 - oldProgress, 3)) * 1000000)) / BigInt(1000000);
  const digits = scaled.toString().padStart(precision + 1, "0");
  const raw = digits.slice(0, -precision) + "." + digits.slice(-precision);
  assert.equal(raw.split(".")[0], "-");
  assert.throws(() => BigInt(raw.split(".")[0]), SyntaxError);
});

test("frame progress remains within the animation interval", () => {
  for (const elapsed of [-100, -1, 0]) assert.equal(counterProgress(elapsed), 0);
  assert.equal(counterProgress(700), 0.5);
  for (const elapsed of [1400, 1401, 5000]) assert.equal(counterProgress(elapsed), 1);
});

for (const [scaled, precision, raw, formatted] of [
  ["0", 6, "0.000000", "0.000000"],
  ["1", 6, "0.000001", "0.000001"],
  ["-1", 6, "-0.000001", "-0.000001"],
  ["-123456", 6, "-0.123456", "-0.123456"],
  ["123456", 6, "0.123456", "0.123456"],
  ["-1234567", 6, "-1.234567", "-1.234567"],
  ["99999999999999123456", 6, "99999999999999.123456", "99,999,999,999,999.123456"],
  ["-99999999999999123456", 6, "-99999999999999.123456", "-99,999,999,999,999.123456"],
  ["42", 0, "42", "42"], ["-42", 0, "-42", "-42"],
]) test(`exact fixed-point formatting: ${scaled} at ${precision} places`, () => {
  assert.equal(fixedQuantity(BigInt(scaled), precision), raw);
  assert.equal(formatQuantity(raw, precision), formatted);
});

test("early, ordinary and terminal frames retain valid exact decimal strings", () => {
  for (const target of [BigInt("67407360"), BigInt("-67407360"), BigInt("99999999999999123456")]) {
    for (const elapsed of [-20, -1, 0, 1, 16, 700, 1399, 1400, 1500]) {
      const progress = counterProgress(elapsed);
      const scaled = target * BigInt(Math.round((1 - Math.pow(1 - progress, 3)) * 1000000)) / BigInt(1000000);
      const raw = fixedQuantity(scaled, 6);
      assert.match(raw, /^-?\d+\.\d{6}$/);
      assert.doesNotThrow(() => formatQuantity(raw, 6));
      if (target >= BigInt(0)) assert.ok(scaled >= BigInt(0));
      if (progress === 1) assert.equal(scaled, target);
    }
  }
});

test("malformed source quantities are not silently suppressed", () => {
  assert.throws(() => formatQuantity("-", 6), SyntaxError);
});
