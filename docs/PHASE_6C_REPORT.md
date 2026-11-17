# Phase 6C — premium interface and operational dashboard

Date: 2026-11-17. Local branch: `feature/phase-6c-premium-ui`.

## Baseline and safety

Implementation began from a clean `main` matching `origin/main` at `82e214e2a1a15834354f5787e27422506658d344`. All three main Docker services were healthy. Alembic was at `0008_delivery_routes`, and `alembic check` reported no new upgrade operations. The mandatory baseline suite passed **211 tests in 603.35 seconds** before application changes.

The phase adds no migration, dependency or new application credential. No business service, inventory posting rule, reservation logic, sales fulfillment rule, driver accountability rule, authentication/session/CSRF rule or historical migration was rewritten. The main database was not seeded. Read-only before/after and final fingerprints compared all **62 tables with no changes**, including the existing administrator, business tables, audit and security records. Environment file contents and secret values were not inspected, printed or changed. Synthetic browser credentials existed only in scratch fixtures.

## Implemented interface

The AMBS red `#CC0605`, amber `#F7A600`, white and charcoal `#161B24` palette is centralized in `frontend/app/tokens.css`. The existing locally served Inter font remains. `premium.css` supplies consistent panels, compact tables, filter bars, native dialogs, form sections, notices, status treatments, navigation and responsive rules. Glass is limited to top bars and dialog overlays. There is no new image, icon or animation package.

Shared presentation covers login, customers, projects, LPOs, items/categories/units/families, all inventory screens, purchasing and supplier screens, outsourced production/custody/timelines, sales/partial dispatch/backorders/reversals, driver assignment/routes/item journey, users and audit. Existing secondary actions and fields remain in place. Long references wrap; tables retain their columns with contained scrolling; supported sorting and pagination remain intact. Routing continues to show estimated road metrics separately from actual driver evidence and keeps provider failures, restrictions and history visible.

Navigation is grouped into Overview, Business, Operations, Catalog and Administration. Existing permissions filter each link. Desktop navigation collapses; mobile navigation traps keyboard focus, makes background content inert and closes with Escape while returning focus. The top bar shows current page, identity/role and logout. Mobile drawer footer also shows identity/role. The original connectivity screen moves to `/system`; `/` now opens the Operational dashboard. No settings page, search control, notification badge or business capability is invented.

New primitives are `Icon`, `StatusBadge`, `CountUp` and `Dashboard`. Existing AppShell, shared loading state and domain screen presentation use them. Native modal focus containment and focus restoration remain intact. Required controls retain their labels and native validation; operational controls retain busy states, server error handling and confirmations.

## Real dashboard and backend boundary

The only new backend feature is the additive read-only `GET /api/dashboard`, admitted by the exact BFF allowlist path and guarded by `system.read`. Individual sections require their existing domain permissions. Driver-only responses restrict assignments to the current user; audit activity requires `audit.read`. No costs, secret values or audit details payloads are returned.

Cards report open sales orders, pending deliveries, open purchase orders, active production, low-stock items and active customer/project counts where authorized. SQL aggregates report outstanding demand and inventory quantities by unit. Queues use existing statuses and expected dates, bounded to five records; audit events are bounded to six. No fake growth, revenue, distance or example business records appear in the main dashboard. Empty authorized tables return truthful zero/empty states.

See [Dashboard metrics](DASHBOARD_METRICS.md) for every predicate, precision rule, permission and consistency limit. Existing StockBalance remains the ledger projection. Non-usable, reserved and external quantities are distinct views, never added into a fabricated available balance.

Count-up uses BigInt fixed-point interpolation over Decimal strings, easing for 1,400ms after first viewport entry. It reserves final-value space, announces only the actual number to screen readers, stops exactly and respects reduced motion. An explicit refresh loads a fresh snapshot and animates it once; hovering or scrolling a settled value does not restart it. IDs and timestamps are never animated.

## Verification results

| Check | Result |
| --- | --- |
| Baseline backend | PASS — 211 |
| Final backend regression | PASS — 222 in 731.32 seconds |
| New dashboard tests | PASS — 11, included above |
| TypeScript | PASS |
| ESLint, zero warnings | PASS |
| Isolated production build | PASS |
| Next compatibility patch guards | PASS — 3 |
| CommonJS and ESM router runtime regressions | PASS in browser harness |
| Frontend dependency audit | PASS — zero vulnerabilities |
| Backend locked dependency audit | PASS — no known vulnerabilities |
| Alembic head and drift | PASS — 0008_delivery_routes, no drift |
| Main table fingerprints | PASS — 62 unchanged |
| Final focused development UI | PASS — 84 Chromium checks on initially empty scratch DB, including all module headline counters |
| Complete development workflow/browser chain | PASS — authentication, all prior domain suites and restart checks, plus 73 new UI checks |
| Existing production workflow/browser suites | PASS — all authentication, master, inventory, purchasing, sales and routing suites plus restart checks; new UI dialog check identified the containment fix below |
| Final production UI build and screenshots | PASS — 86 checks after the final table-width refinement |
| Final production routing visual/restart check | PASS — 30 + 9 after the final table-width refinement |
| Final Docker health | PASS — all three main services healthy |

The dashboard tests cover true empty counts, idempotent reads, actual stock versus quarantine, outstanding demand, partial dispatch and reservation quantities, anonymous/no-grant rejection, all six non-admin role section policies and assignment-scoped driver visibility. Browser fixtures use uniquely named scratch databases and dedicated synthetic identities. They never use or reset the real administrator's credentials. Passwords travel over stdin and are excluded from screenshots.

The completed production domain run (`artifacts/phase6c-browser-production.log`) passed 22 authentication browser checks, 20 live HTTP/BFF checks, master data 30 + 4 restart, inventory 32 + 7, purchasing/production 37 + 8, sales 37 + 8 and routing 30 + 9. That run subsequently exposed the new mobile dialog assertion; it is therefore recorded as passing the existing domain suites, not as passing the entire combined command. Final UI/build verification after the containment and shell hydration changes is recorded separately. Compatibility guards and both router distributions were exercised in each harness run.

The frozen development chain (`artifacts/phase6c-browser-development-accepted.log`) completed with 24 authentication browser checks, 20 HTTP/BFF checks, the same domain/restart counts and **73 Phase 6C UI checks**, followed by successful scratch-fixture teardown. The final small presentation extension applies the already verified CountUp component to the six inventory, three purchasing and one production headline counts; no API or operation changed. Its focused development rerun (`artifacts/phase6c-ui-development-final.log`) passed **84 UI checks**, including exact comparisons of those ten additional counters. The initially empty fixture accounts for the extra empty-state check.

The production UI rerun (`artifacts/phase6c-ui-production-accepted.log`) passed **86 checks**, including two additional checks of a 200% desktop-scale simulation (720px CSS viewport, device pixel ratio 2). This is explicitly a Chromium emulation, alongside the root text-size smoke check, not a claim of testing every operating-system/browser accessibility setting. No console warnings, React runtime errors or hydration errors remained. Separate production routing visual verification passed 30 + 9 checks after restart and captured explicit journey views.

After the final visual-only table-width refinement, fresh production builds and targeted runs passed again: **86 UI checks** in `artifacts/phase6c-ui-production-final-tables.log`, and **30 routing + 9 restart checks** in `artifacts/phase6c-routing-final-tables.log`. Both completed scratch-fixture teardown. The full development chain preceded only the small CountUp reuse and table-width refinements; the CountUp extension was rechecked with 84 development UI assertions, and the final CSS was checked against fresh production UI and routing runs. No domain operation or backend logic changed after the 222-test backend pass.

Final successful browser flows reported no unexpected console warnings, hydration errors or uncaught exceptions. Earlier negative authentication, duplicate and insufficient-reservation scenarios retain their expected HTTP 401/409 diagnostics; these are identified by the existing test stage rather than suppressed globally. `git diff --check` found no whitespace errors. Final dependency manifests and all historical migrations match the baseline.

The actual main frontend was also opened anonymously through Chromium at `127.0.0.1:3000/login`: HTTP 200, hydrated form and no console warnings/errors, with no credentials entered (`artifacts/phase6c-main-browser.log`). Main frontend health and backend database health both returned HTTP 200.

The UI suite compares visible card values with the real summary API and verifies the six-decimal value `99999999999999.123456` from an isolated confirmed PostgreSQL order. It checks all seven requested widths, reduced motion, drawer/modal keyboard behavior, page overflow, role navigation, logout and subsequent login. All runtime diagnostics remain enabled; there is no error suppression or hidden development indicator.

## Issues resolved during verification

- Status icons initially changed exact text matching in the existing master-data regression. Badge labels now have their own text span, retaining the readable original status.
- Synthetic Fast Refresh could run before AppRouter committed after a full reload. Its browser regression now proves hydration through an observed sidebar interaction before invoking the same framework HMR entry point. Runtime assertions remain unchanged.
- Counter screenshots initially waited for off-screen counters to finish before entering the viewport. The test now scrolls them into view before asserting exact final values; the component retains the requested first-appearance behavior.
- An inherited routing test assumed no locally configured ORS key. The isolated browser API now explicitly clears ORS_API_KEY, while its test-only provider continues to intercept all routing HTTP calls. Main configuration is unchanged; no live provider call is made.
- Directly assigning a driver in a new test was rejected by the existing database guard. The fixture now uses the authorized assignment API; the guard remains intact.
- Iterative development runs were interrupted while UI modules were being edited. Final runs use frozen application files. Failed intermediate runs are retained in ignored local logs; they are not represented as passes.
- Shell JavaScript buttons now use the same hydration-ready subscription pattern as the existing credential form: they stay disabled until React has attached their handlers. This prevents an early SSR click from being silently lost. No session or logout API behavior changed.
- The strengthened mobile dialog check exposed a real overflow: absolute screen-reader labels in background user-table actions escaped the unpositioned scroll container. Making `.table-scroll` positioned keeps those labels within its existing clip. The focused Chromium reproduction measured document width **559px before / 390px after** at a 390px viewport, with the complete wide table still scrollable. No column, label or data was removed.
- Final journey screenshot review found overly narrow mobile columns. Tables now retain a readable 640px minimum width; routing history uses a 960px minimum with explicit event/time/actor/quantity/location/reference column widths. Horizontal scrolling remains inside the existing table container. Dates no longer break into vertical fragments; no values or columns are removed. The final production UI and routing rechecks cover this visual-only refinement.

## Evidence and visual review

Local screenshots are under `artifacts/phase6c/development/` and `artifacts/phase6c/production/`: login desktop/mobile, dashboard empty/populated at 1920/1440/1366/1024/768/390/360, collapsed sidebar, drawer, customer/project/LPO/catalog, inventory/balances/receipts, purchasing, production, sales, users, audit, system and user dialogs. Existing domain suites additionally capture sales, route and item-journey views under `artifacts/phase6a/` and `artifacts/phase6b/`. These contain synthetic records only and remain ignored by Git.

Rendered login, desktop/mobile dashboard, customer/project/catalog, stock balances, purchasing/production, administration, mobile user dialog, desktop route and mobile route/journey screenshots were inspected. Explicit journey evidence is in `artifacts/phase6b/journey-desktop.png` and `journey-mobile.png`; the mobile view now shows readable events and unbroken UTC timestamps with the remaining columns available through contained horizontal scrolling. The extreme precision fixture wraps complete digits on small screens instead of truncating or rounding them. The routing confirmation form uses separated checkbox and action spacing. No page-level overflow remained in the final responsive checks, including open dialogs at 390 and 360px. The final main database fingerprint comparison again found 62 unchanged tables.

## Boundaries and business acceptance

The dashboard uses existing status semantics and normal transaction isolation; its request timestamp is not a historical cross-table snapshot. Queues show recent matching work, not every record. Stock views are grouped by unit and are overlapping measures. Cost/revenue analytics, live GPS, proof of delivery, finance and additional business workflows are outside this phase. Accessibility checks are an engineering baseline, not a third-party WCAG certification. Chromium is the tested engine; Safari/Firefox and company device/user acceptance remain separate business checks.

The user reports a separately completed direct ORS smoke before Phase 6C. This phase's automated routing is mocked and makes **no full live production routing acceptance claim**.

No commit, push, PR, merge or deployment was performed. `main` remains at the reviewed baseline. The feature working tree is intentionally uncommitted for review. No next development phase was started.

## Final acceptance

**PASS — Phase 6C implementation and local technical verification are complete.** The unified interface, real authorized dashboard, exact counters and existing Phase 6B workflows are ready for owner review. There are no unresolved application runtime warnings from the final checks. Owner acceptance of visual density and everyday workflows, company-device/cross-browser checks and any full live production routing acceptance remain business acceptance activities; none is represented as already performed.

Work remains on `feature/phase-6c-premium-ui`, with HEAD and `main` still at `82e214e2a1a15834354f5787e27422506658d344`. All changes are intentionally uncommitted and unpushed. Nothing was deployed and no later phase was started.
