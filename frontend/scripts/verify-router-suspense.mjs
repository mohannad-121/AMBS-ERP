// Exercise the installed Next component with its bundled React in real Chromium.
// No application endpoints, credentials or databases are involved.
import { readFileSync } from "node:fs";
import { chromium } from "playwright";

const root = process.env.FRONTEND_SOURCE ?? "/source";
const read = (path) => readFileSync(`${root}/node_modules/next/dist/${path}`, "utf8");
const esm = process.argv.includes("--esm");
const source = read(`${esm ? "esm/" : ""}client/components/layout-router.js`);
if (esm && (!source.includes("export function LoadingBoundaryProvider(") || source.includes("export function DeferredRsc(")))
  throw new Error("The Next ESM layout-router exports changed");
const component = source.slice(source.indexOf("function InnerLayoutRouter("), source.indexOf(`${esm ? "export " : ""}function LoadingBoundaryProvider(`));
const modules = {
  "next/dist/compiled/react": read("compiled/react/cjs/react.development.js"),
  "next/dist/compiled/react/jsx-runtime": read("compiled/react/cjs/react-jsx-runtime.development.js"),
  "next/dist/compiled/react-dom": read("compiled/react-dom/cjs/react-dom.development.js"),
  "next/dist/compiled/react-dom/client": read("compiled/react-dom/cjs/react-dom-client.development.js"),
  "next/dist/compiled/scheduler": read("compiled/scheduler/cjs/scheduler.development.js"),
};
const browser = await chromium.launch({ headless: true });
try {
  const page = await browser.newPage();
  const errors = [];
  page.on("console", (message) => { if (message.type() === "error") errors.push(message.text()); });
  page.on("pageerror", (error) => errors.push(error.stack));
  await page.setContent('<div id="root"></div>');
  await page.evaluate(({ modules, component }) => {
    const cache = {};
    const process = { env: { NODE_ENV: "development" } };
    function require(id) {
      if (!cache[id]) {
        const module = { exports: {} };
        cache[id] = module;
        new Function("module", "exports", "require", "process", modules[id])(module, module.exports, require, process);
      }
      return cache[id].exports;
    }
    const React = require("next/dist/compiled/react");
    const client = require("next/dist/compiled/react-dom/client");
    const contexts = { GlobalLayoutRouterContext: React.createContext({}), LayoutRouterContext: React.createContext(null) };
    const nav = { NavigationPromisesContext: React.createContext(null) };
    const missing = { unresolvedThenable: new Promise(() => {}) };
    const isDeferredRsc = (value) => value?.tag === "deferred";
    const aliases = `const {useContext, useDeferredValue, use} = _react;
      const _jsx = _jsxruntime.jsx;
      const {GlobalLayoutRouterContext, LayoutRouterContext} = _approutercontextsharedruntime;
      const {NavigationPromisesContext} = _hooksclientcontextsharedruntime;
      const {isDeferredRsc} = _rendertree;
      const {unresolvedThenable} = _unresolvedthenable;`;
    const Inner = new Function("_react", "_jsxruntime", "_approutercontextsharedruntime", "_hooksclientcontextsharedruntime", "_rendertree", "_unresolvedthenable", "require", "process", `${aliases}\n${component}; return InnerLayoutRouter;`)(React, require("next/dist/compiled/react/jsx-runtime"), contexts, nav, { isDeferredRsc }, missing, () => ({ createNestedLayoutNavigationPromises: () => null }), process);
    let root;
    window.resetScenario = (missingData = false) => {
      root?.unmount();
      root = client.createRoot(document.getElementById("root"));
      let resolve;
      const promise = new Promise((done) => { resolve = done; });
      promise.tag = "deferred";
      const render = (rsc) => React.startTransition(() => root.render(React.createElement(React.Suspense, { fallback: "pending" }, React.createElement(Inner, { tree: ["", {}], renderTree: { data: { rsc, prefetchRsc: null } } }))));
      function Counter({ suffix = "" }) {
        const [count, setCount] = React.useState(0);
        return React.createElement("button", { onClick: () => setCount(count + 1) }, `count ${count}${suffix}`);
      }
      window.scenario = { render, promise, resolve, counter: React.createElement(Counter), refreshedCounter: React.createElement(Counter, { suffix: " refreshed" }) };
      render(missingData ? null : promise);
    };
    window.resetScenario();
  }, { modules, component });
  await page.getByText("pending", { exact: true }).waitFor();
  // A superseding refresh provides a ready node before the original promise
  // resolves. The router must abandon the old read without skipping use().
  await page.evaluate(() => window.scenario.render("replacement"));
  await page.getByText("replacement", { exact: true }).waitFor();
  await page.evaluate(() => window.scenario.resolve("obsolete"));
  await page.waitForTimeout(350);
  if ((await page.locator("#root").textContent()) !== "replacement")
    throw new Error("Superseded RSC data replaced the current route");

  await page.evaluate(() => window.resetScenario());
  await page.getByText("pending", { exact: true }).waitFor();
  await page.evaluate(() => window.scenario.resolve("fulfilled"));
  await page.getByText("fulfilled", { exact: true }).waitFor();

  await page.evaluate(() => window.resetScenario(true));
  await page.getByText("pending", { exact: true }).waitFor();
  await page.evaluate(() => window.scenario.render("missing-replaced"));
  await page.getByText("missing-replaced", { exact: true }).waitFor();

  await page.evaluate(() => window.resetScenario());
  await page.getByText("pending", { exact: true }).waitFor();
  await page.evaluate(() => window.scenario.resolve(null));
  await page.waitForTimeout(350);
  if ((await page.locator("#root").textContent()) !== "pending")
    throw new Error("Missing RSC data did not remain suspended");
  await page.evaluate(() => window.scenario.render("null-result-replaced"));
  await page.getByText("null-result-replaced", { exact: true }).waitFor();

  // Refreshing ready RSC through a deferred response must also retain mounted
  // client state, just like a direct ready-to-ready update.
  await page.evaluate(() => {
    window.resetScenario();
    window.scenario.render(window.scenario.counter);
  });
  await page.getByRole("button", { name: "count 0", exact: true }).click();
  await page.getByRole("button", { name: "count 1", exact: true }).waitFor();
  await page.evaluate(() => window.scenario.render(window.scenario.promise));
  await page.waitForTimeout(100);
  await page.evaluate(() => window.scenario.resolve(window.scenario.refreshedCounter));
  await page.getByRole("button", { name: "count 1 refreshed", exact: true }).waitFor();
  await page.waitForTimeout(350);
  for (const error of errors) console.error(error);
  if (errors.length) throw new Error("Next router Suspense regression reproduced");
  console.log(`PASS Next router (${esm ? "ESM" : "CommonJS"}): superseded pending RSC, fulfilled RSC, missing data, null-result replacement and client state preservation without React diagnostics`);
} finally {
  await browser.close();
}
