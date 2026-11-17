// Local compatibility fix for Next 16.4.6's conditional RSC promise read.
// See docs/REACT_RUNTIME_REPORT.md. Fail closed when upgrading Next.
import { readFileSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";

const require = createRequire(import.meta.url);
const nextPackage = require.resolve("next/package.json");
const version = JSON.parse(readFileSync(nextPackage, "utf8")).version;
if (version !== "16.4.6")
  throw new Error(`Review the Next router compatibility patch for Next ${version}`);
const marker = "// AMBS: reconcile cached RSC promises without a conditional use() read.";
const writes = [];
for (const esm of [false, true]) {
  const file = join(dirname(nextPackage), "dist", ...(esm ? ["esm"] : []), "client/components/layout-router.js");
  const source = readFileSync(file, "utf8");
  if (source.includes(marker)) {
    if (!source.includes("const deferredRscCache = new WeakMap();") ||
        !source.includes(`${esm ? "export " : ""}function LoadingBoundaryProvider(`))
      throw new Error(`Incomplete Next router compatibility patch: ${file}`);
    continue;
  }
  const use = esm ? "use" : "(0, _react.use)";
  const jsx = esm ? "_jsx" : "(0, _jsxruntime.jsx)";
  const deferred = esm ? "isDeferredRsc" : "(0, _rendertree.isDeferredRsc)";
  const missing = esm ? "unresolvedThenable" : "_unresolvedthenable.unresolvedThenable";
  const start = source.indexOf("    let resolvedRsc;\n");
  const end = source.indexOf("    // In dev, we create a NavigationPromisesContext", start);
  const original = source.slice(start, end);
  if (start < 0 || end < 0 || !original.includes(`const unwrappedRsc = ${use}(rsc);`) || !original.includes("resolvedRsc = rsc;"))
    throw new Error(`Next router patch context changed: ${file}`);
  const replacement = `    ${marker}
    const resolvedRsc = ${deferred}(rsc)
        ? getDeferredRsc(rsc)
        : rsc === null ? ${jsx}(MissingRsc, {}) : rsc;
`;
  const helpers = `const deferredRscCache = new WeakMap();
function getDeferredRsc(rsc) {
    let resolved = deferredRscCache.get(rsc);
    if (resolved === undefined) {
        resolved = rsc.then(value => value === null ? ${jsx}(MissingRsc, {}) : value);
        deferredRscCache.set(rsc, resolved);
    }
    return resolved;
}
function MissingRsc() {
    return ${use}(${missing});
}
`;
  const boundary = `${esm ? "export " : ""}function LoadingBoundaryProvider(`;
  if (!source.includes(boundary)) throw new Error("Next router component boundary changed");
  const patched = (source.slice(0, start) + replacement + source.slice(end)).replace(boundary, helpers + boundary);
  writes.push([file, patched]);
}
for (const [file, patched] of writes) writeFileSync(file, patched);
console.log("Next 16.4.6 router Suspense compatibility patch applied.");
