// Test-only observation: delegates unchanged to the installed implementation.
// Never mount this file or set AMBS_GLOB_TRACE in the production deployment.
const Module = require("node:module");
const { appendFileSync } = require("node:fs");
const original = Module._load;
const wrapped = new WeakMap();
function trace(pattern) {
  if (process.env.AMBS_GLOB_TRACE) appendFileSync(process.env.AMBS_GLOB_TRACE, JSON.stringify({pattern}) + "\n");
}
function wrap(fn) {
  if (typeof fn !== "function") return fn;
  if (wrapped.has(fn)) return wrapped.get(fn);
  const proxy = new Proxy(fn, {
    apply(target, self, args) { trace(args[0]); return Reflect.apply(target, self, args); },
    get(target, key, receiver) {
      const value = Reflect.get(target, key, receiver);
      return ["makeRe", "parse", "scan", "compileRe"].includes(key) ? wrap(value) : value;
    },
  });
  wrapped.set(fn, proxy);
  return proxy;
}
Module._load = function (name, ...args) {
  const value = Reflect.apply(original, this, [name, ...args]);
  return /(?:^|\/)picomatch(?:\/|$)/.test(name) ? wrap(value) : value;
};
if (process.env.AMBS_GLOB_POSITIVE_CONTROL === "1") {
  // Bounded positive control in the instrumented server process itself.
  require(process.cwd() + "/node_modules/next/dist/compiled/picomatch").makeRe("trusted-control/**");
}
