# Frontend UX architecture

## Shared shell and navigation

`AppShell` remains the authenticated user context provider and owns grouped navigation, desktop collapse, mobile drawer, breadcrumb, identity/role and logout. Groups are derived from implemented routes and effective permission strings. Backend authorization remains authoritative. Sales delivery, routing, driver and item-journey controls remain reachable through Orders & dispatch; no parallel route or business workflow is invented.

The root route is now the Operational dashboard. The original connectivity panel remains available at `/system`, guarded by `system.read`. Existing master, inventory, purchasing, production, sales, routing, administration and audit routes retain their forms, fields, API calls and action controls.

Shell buttons that need JavaScript remain disabled in SSR output until the existing `useSyncExternalStore` hydration-ready pattern reports a mounted client. Ordinary links remain usable. This extends the established login-form safeguard to logout, menu and desktop collapse without changing authentication behavior.

## Presentation boundaries

The reusable styling contracts cover all modules: page headers, filter bars, table containers, pagination, details, metrics, line-item editors, form grids, notices and native dialogs. StatusBadge is shared by master data, inventory, purchasing and sales. Routing retains its real provider errors, warning text, route revisions, trip evidence and journey provenance. Estimated routes are not presented as actual travel.

Business forms continue to call the existing CSRF-aware `api` helper. `useResource` fetches in an effect, cancels stale responses and only exposes a matching request revision. Dashboard makes one request per mount or explicit refresh; it does not aggregate SQL per card or poll continuously.

The server awaits Next route parameters and performs permission checks. No new React `use()`, uncached promise, conditional hook or client-side Suspense pattern was introduced. The pinned Next 16.4.6 / React 19.3.1 versions, version-guarded router patch and both distribution runtime regressions are retained.

## Dashboard boundary

`GET /api/dashboard` is an additive read endpoint. The BFF allowlist admits that exact path. The endpoint requires `system.read` and independently gates each section with its existing domain read permission. It never returns costs, password fields, audit details or inaccessible totals. Driver-only accounts receive their own assignments; absent authorization removes whole sections rather than disclosing zero-shaped placeholders.

See [Dashboard metrics](DASHBOARD_METRICS.md) for definitions. No new migrations, permissions or business service mutations were needed.

## Verification and maintenance

Run `npm run typecheck`, `npm run lint`, `npm run test:compat` and an isolated production build. `scripts/Verify-AuthIntegration.ps1 -Premium` runs all existing browser workflow suites, restart checks and the new UI suite; add `-Production` for a production build. `-PremiumOnly` provides an empty-database UI run without seeding the main database. Fixture passwords travel over stdin and are never printed or captured in screenshots.

The UI suite checks live counters, decimal precision, responsive containment, drawer and modal keyboard behavior, reduced motion, role navigation, logout and subsequent login. Existing runtime diagnostics stay enabled and fail tests. Screenshots are ignored local artifacts under `artifacts/phase6c/`. See the phase report for actual completed runs and limitations.
