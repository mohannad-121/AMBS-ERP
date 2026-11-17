# Phase 2 React runtime investigation

Date: 2026-11-16. Scope: resolve the development `use()` diagnostic; no Phase 3 work, deployment, Git commit/push, database reset or real-account credential changes.

## Root cause and evidence

The original Chrome console retained the complete error stack even though later Fast Refresh updates had cleared the visible issue badge. The first framework component in that stack was:

```text
trackUsedThenable                         react-dom-client.development.js:6354
useThenable                               react-dom-client.development.js:8249
Object.use                                react-dom-client.development.js:8269
exports.use                               react.development.js:1242
InnerLayoutRouter                         next/dist/client/components/layout-router.js:230
renderWithHooks / updateFunctionComponent / beginWork
workLoopConcurrentByScheduler / renderRootConcurrent
```

The surrounding console entries were Fast Refresh rebuilds. There was no application hook in the failing promise-read stack. Chrome DevTools also reported `Can't add file system: <illegal path>` when DevTools opened; that is a DevTools workspace diagnostic, separate from the application.

Next 16.4.6's `InnerLayoutRouter` reads its deferred RSC value with `use(rsc)`, but returns a ready React node without that read. During a concurrent first render, a pending segment can suspend and then be superseded by a ready segment at the same component identity. The completion render skips the pending-promise read. Next's bundled React detects exactly that transition and emits error 607. Ordinary sequential navigation does not reliably reproduce this timing.

This was reproduced independently in real Chromium using the installed, unmodified Next component function and Next's actual bundled React/React DOM/Scheduler, with inert context providers around the isolated component. A concurrent render with pending RSC was superseded by a ready node before the old promise resolved. The test failed with the same diagnostic and `InnerLayoutRouter` stack. With the compatibility patch applied, the same test passes and resolving the obsolete promise cannot overwrite the replacement page.

Application source has no direct client `use()` calls. The server-only `cache(async getCurrentUser)` memoizes the current-user lookup per server render; it is not a client-created promise. Async server layouts, loading boundaries and login hydration were inspected. The previous `allowedDevOrigins` HMR fix, disabled-until-hydrated login inputs, explicit POST fallback, credential-query redirect and sensitive-login-URL logging protection remain intact.

## Dependency audit

| Package/runtime | Installed version |
| --- | --- |
| Next.js / Webpack | 16.4.6 |
| npm React / React DOM | 19.3.1 / 19.3.1 |
| Next's compiled App Router React / React DOM | 19.3.0-canary-278794d7-20261002 / same |

`npm ls react react-dom next --all` showed one deduplicated npm React/React DOM pair, satisfying Next's React peer range. The compiled App Router runtime is deliberately vendored by Next; its version is read from its source exports. It is not an accidental second npm installation. Changing the top-level React version would not repair the bundled router code.

No dependency version was changed. The lockfile records the new root postinstall lifecycle hook.

## Fix and affected files

- `frontend/scripts/patch-next-router.mjs`: a small local compatibility patch for Next 16.4.6's CommonJS and ESM layout-router modules. It passes a cached derived RSC promise to React's native child reconciliation, instead of conditionally calling `use(rsc)` in the router. A WeakMap preserves promise identity across retries. A null result maps to `MissingRsc`, which suspends on Next's existing unresolved thenable. Ready nodes and resolved promise values reconcile at the same position, preserving mounted client state. Existing Suspense boundaries, context providers, error propagation and missing-data behavior remain in place.
- `frontend/package.json` and `frontend/package-lock.json`: apply the patch through `postinstall` after `npm ci`.
- `frontend/Dockerfile`: copy the patch script before the dependency installation layer, so clean images are patched too.
- `frontend/scripts/verify-router-suspense.mjs`: Chromium regression against the installed framework component and bundled runtime, for both distribution formats. Covers superseded pending data, ordinary promise fulfillment, initially missing data, a promise resolving to missing data before replacement, and preservation of mounted client state across a deferred refresh. It also checks ESM exports remain intact. No credentials or database are involved.
- `frontend/scripts/verify-login-browser.mjs`: record all warning/error console messages and uncaught errors, fail on unexpected diagnostics, delay Flight requests, repeat protected navigation/refresh, wait for hydration, and exercise the Fast Refresh router entry point during navigation. Production skips the development-only Fast Refresh/HMR assertions.
- `scripts/Verify-AuthIntegration.ps1`: optimized production mode, installed-runtime regression, and browser-first testing of cold routes. Existing isolated database/container cleanup remains in place.
- `README.md` and this report: repeatable verification and patch maintenance instructions.

The patch is local, not claimed as an upstream release or backport. Installation fails on a different Next version or an unexpected source context, prompting review. It is idempotent. A future Next upgrade must remove or revise it after running the reproduction against that version. No React diagnostic, console reporting, development indicator or application security control is disabled.

## Verification

| Check | Result |
| --- | --- |
| Backend suite | 63 passed |
| HTTP/BFF authentication integration | 20 passed in development; 20 passed with optimized Next |
| Chromium application integration | 24 passed in development; 22 passed with optimized Next |
| Installed router regression | Five scenarios passed for CommonJS and ESM |
| ESLint | Passed with zero warnings |
| TypeScript | Passed |
| Next production build | Passed |
| Clean npm installation / Docker image build | Passed; lifecycle patch applied |
| Patch idempotence | Reapplication leaves both patched modules unchanged |
| Migration checks | `0002_security (head)`; no new upgrade operations |
| Docker health | PostgreSQL, backend and frontend healthy |
| Temporary resource cleanup | No HTTP test containers or `ambs_http_test_*` databases remain |

The browser flows used fresh Chromium contexts, loaded login, rejected an invalid password, signed in through the actual form, visited the dashboard, opened User Management and its dialog, opened Audit Logs, refreshed, repeated navigation, signed out, checked protected-route rejection, then signed in again by normalized email and by username on localhost. Flight responses were delayed to exercise Suspense. Development also invoked Next's Fast Refresh router entry point while navigating. Tests explicitly waited for hydration after document refresh, so navigation was exercised with a running client router.

Both modes recorded zero React runtime diagnostics, hydration warnings, uncaught browser exceptions or unexpected console warnings/errors. Each recorded one expected browser resource error for the deliberate invalid-password HTTP 401. It is printed in the test results and allowed only in that negative-test stage. Application error reporting and the Next indicator remain enabled.

Browser administrators and sessions belong only to uniquely named temporary databases. Main database records, migrations and real administrator credentials were not modified by the fix or browser tests. Passwords were generated in memory, passed through stdin, and excluded from console diagnostics and error logs.

The original real-account browser was inspected only to read the retained diagnostic. It was not used for automated authentication tests.

Repeat the complete integration runs from the repository root:

```powershell
powershell -NoProfile -File scripts/Verify-AuthIntegration.ps1 -Browser
powershell -NoProfile -File scripts/Verify-AuthIntegration.ps1 -Browser -Production
```

## Acceptance and limitations

The Phase 2 React runtime blocker is resolved and the requested Phase 2 development acceptance checks pass. Phase 3 has not started.

The compatibility patch must be reviewed when upgrading Next. This is a local fix to installed framework code, not an upstream guarantee. The optimized-production comparison uses `next build`/`next start` with isolated services over loopback HTTP and development cookie settings; it is not a deployment or a verification of production HTTPS/Secure-cookie infrastructure. Production operational requirements remain documented in the security guide. A browser tab retaining old development code should reload to load the installed correction; clearing console history is not the fix.

## Primary references

- [React `use` reference](https://react.dev/reference/react/use): promise identity, Suspense retries and cached promises. Conditional use is allowed generally; the evidence here concerns a suspended promise read disappearing on completion, not a generic conditional-hook claim.
- [React error codes](https://github.com/react/react/blob/main/scripts/error-codes/codes.json): diagnostic 607.
- [Next layout router source](https://github.com/vercel/next.js/blob/canary/packages/next/src/client/components/layout-router.tsx): router promise/node branches. The installed 16.4.6 distribution was the definitive source for this investigation.
