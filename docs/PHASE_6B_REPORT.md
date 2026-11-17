# Phase 6B implementation and verification report

Date: 17 November 2026, Asia/Dubai. Workspace: C:\Projects\AMBS-ERP.

## Outcome and live-provider boundary

Implemented driver assignment/reassignment, verified routing endpoints, backend openrouteservice road estimates, warning-preserving route previews, immutable route revisions/confirmations, restricted driver trip evidence and a read-only item journey at `/sales`. Existing stock, order fulfillment, partial deliveries and reversal logic are retained. No Phase 6C design work, Google billing, GPS, customer notification, commit, push or deployment was performed.

**Live ORS smoke test: NOT RUN.** The main backend reports no configured ORS_API_KEY. No actual provider call was made. Automated routing-success/failure checks use isolated mocked HTTP responses. The normal application records NOT_CONFIGURED when the key is missing. Technical test results do not establish real account credentials, current road coverage, free-account quota availability or a live-provider success.

## Preflight and preservation

Reviewed Phase 4, Phase 5, Phase 6A, inventory architecture, stock movement rules, permissions, React runtime report and actual master/sales/stock/custody/authentication/frontend/Compose configuration. Existing head was `0007_sales_ops`; the pre-implementation backend run passed all 171 cases in 364.72 seconds. No AGENTS.md was found. The existing repository was already untracked/uncommitted.

Unique pre-upgrade custom PostgreSQL archive:

`backups/ambs-before-phase6b-20261117-140019-648b030690ae4a18839dac7b63874954.dump`

SHA256: `CFFABE927E3AAB4CF1DDA957628A16F97BADFB492A4C0AE7F2604D1DB507D2EE`.

`pg_restore --file=/dev/null` decoded the full archive successfully before schema changes. The archive contains private data and remains ignored. No restore over the existing database occurred.

`backend/tests/migrate_phase6b.py` applied the additive upgrade inside one transaction under the existing security/inventory gates. Before/after fingerprints preserved every pre-existing row across 56 tables, including credential hashes, session identity, historical stock and old grants. Normal session last-seen fields were excluded. New reviewed grants are additive. All previous migration files are retained unchanged. Current head is `0008_delivery_routes`; Alembic check reports no drift.

Only the main backend was recreated to load the new optional Compose configuration. Final main counts are users 1, orders 0, deliveries 0, stock movements 0, verified route sites 0, assignments 0 and calculations 0; permission catalog 108. Database-backed sessions and credentials were retained. Test accounts, verified synthetic coordinates, example distances and stock were never seeded into the main database. No PostgreSQL reset, volume deletion or real administrator use/reset occurred.

## Implemented flow

1. Open an existing delivery's **Driver, route & item journey** panel within `/sales`.
2. Assign an existing eligible DRIVER identity, optional planned departure and business reason. Reassignment creates a separate numbered event with the previous driver and acting employee.
3. Choose saved verified origin/destination pins. Missing pins require an existing source record, checked address, explicit named latitude/longitude fields and employee confirmation. No address is silently geocoded.
4. Click Calculate Route. FastAPI validates access, lifecycle, endpoint ownership, quota and idempotency, then calls the provider adapter if configured.
5. Review server-calculated kilometers, Estimated Driving Time, provider warnings and returned-road-geometry preview. The display states that driving-car is not necessarily truck compliant or traffic-aware.
6. Confirm the exact successful route revision and current driver-assignment revision after warning review. Driver reassignment or later calculation makes earlier confirmation historical; destination correction uses a new verified pin/calculation.
7. Continue the existing actual pick/load/dispatch workflow. Route and assignment operations never post stock.
8. An assigned driver can view only current assigned deliveries and explicitly record actual arrival followed by trip completion after physical dispatch. These server-timestamped human events remain separate from dispatch-based original-order fulfillment.
9. Item links open a derived, read-only journey showing recorded quantities, sources, employees and references. Bulk quantities are not presented as individual-piece identity.

No route value is an editable kilometer field. No timer establishes arrival, actual traveled distance, customer receipt or electronic proof of delivery. Optional transport pricing uses only a separately approved server configuration; both rates are blank by default and no charge/accounting document is created.

## Files and schema

New source:

- `backend/app/models/routing.py`
- `backend/app/schemas/routing.py`
- `backend/app/services/route_provider.py`
- `backend/app/services/routing.py`
- `backend/app/services/item_journey.py`
- `backend/app/api/routing.py`
- `backend/alembic/versions/0008_delivery_routes_delivery_routes.py`
- `backend/tests/test_routing.py`, `tests/routing_server.py`, `tests/migrate_phase6b.py`
- `frontend/components/routing-panel.tsx`
- `frontend/scripts/verify-routing-browser.mjs`

Integration changes: backend settings/body limit/main/router imports/Alembic metadata; the existing sales dispatch adds active DRIVER eligibility validation when a driver is assigned. Frontend sales screen/page/navigation and restricted BFF paths integrate the routing panel and driver-only view. Scoped preview CSS reuses the existing style. Compose and `.env.example` add backend-only optional settings. The security test's expected head and private browser harness are updated. No runtime dependency or package lock change was required. The Next compatibility patch, authentication, CSRF, RBAC primitives and all earlier migration files remain intact.

| New table | Purpose |
| --- | --- |
| routing_sites | Immutable verified source reference, address, coordinates, verifier/time |
| delivery_driver_assignments | Driver/previous driver, sequential revision, planned departure, actor/reason |
| delivery_route_calculations | Sequential normalized results including failed attempts, endpoints, metrics, warnings, geometry, provider time and quota attempt/cooldown |
| delivery_route_confirmations | Exact calculation-to-assignment snapshot and reviewing employee |
| delivery_trip_events | Actual human ARRIVED / COMPLETED events with server timestamp and assignment link |

Stable UUIDs, foreign keys, useful indexes, status/coordinate/quantity constraints and append-only triggers protect history. A narrowly validated insertion into the existing delivery guard permits a driver-only change backed by the latest assignment event. Every original Phase 6A physical transition check is retained. Confirmations must link the current successful calculation and assignment; trip events require a dispatched delivery and valid arrival-before-completion sequence. Downward destructive migration is blocked; corrections use forward changes.

## API

All paths below use existing session and unsafe Origin/CSRF validation under `/api/routing`.

| Method/path | Behavior |
| --- | --- |
| GET /mine | Paginated deliveries currently assigned to the authenticated driver |
| GET /deliveries/{id} | Permission/ownership-controlled route, trip and assignment detail/history |
| GET /deliveries/{id}/options | Manager-only source sites and eligible driver references |
| POST /sites | Verify a new immutable source pin |
| POST /deliveries/{id}/assign | Assign/reassign eligible driver with revision/reason |
| POST /deliveries/{id}/calculate | Explicit provider calculation or controlled failure result |
| POST /deliveries/{id}/confirm | Confirm exact latest successful route/current assignment and warnings |
| POST /deliveries/{id}/trip | Explicit actual arrival/completion evidence |
| GET /deliveries/{id}/journey/{item_id} | Derived source-event timeline, optional lot/serial and pagination |

Strict mutation schemas reject unknown estimate/distance fields. Request keys bind payloads and actors. Committed same-key retries return prior results rather than reassigning, recalculating or recording trip evidence again. The UI retains an unacknowledged action's key for a retry. Reads never trigger provider calls.

## Provider, configuration, quota and licensing

The initial adapter calls `POST https://api.heigit.org/openrouteservice/v2/directions/driving-car/json` with Authorization header and `[longitude, latitude]` numeric endpoints. Only coordinates, geometry and instruction preferences are sent; company/driver/employee identifiers and address strings remain local. The provider URL is fixed, and redirects are refused. The interface is independent of ORS JSON; a future separately authorized Google adapter could implement it without changing the frontend contract.

The response is shape/type/range-checked before reading summary distance/duration. Nonfinite/negative metrics, malformed warnings/geometry and mismatched echoed coordinate order are rejected. Warnings and available provider timestamps are retained. Encoded geometry is decoded rather than fabricated. Server Decimal conversion produces km/minutes/nearest-second labels consistently. Failed results have no distance/time/geometry.

Backend-only `ORS_API_KEY` is a SecretStr loaded through the established ignored `.env` → Compose backend environment mechanism. No frontend/NEXT_PUBLIC value, raw response, key, Authorization header or exception string is stored in route records, returned to the browser or included in audit metadata. Only a boolean configuration check was printed. See ORS_LOCAL_SETUP.md for private setup; the user need not share the key in chat.

Local configurable safety defaults are 30 calls/minute and 1,000/day UTC. The user's observed 40/minute and 2,000/day remain account observations. Committed external attempts count against the budget; PostgreSQL serialization protects concurrent checks. 429 produces a bounded cooldown; 401/403, invalid endpoints, no route, outage, malformed responses, network/socket timeouts and missing key have distinct safe statuses. There are no background retries or Haversine/manual-distance substitutes.

Current [HeiGIT terms](https://account.heigit.org/info/tos) and provider staff clarification were reviewed before storage. Current ORS results use CC BY-SA 4.0, including normalized retained outputs/geometry; the older staging terms use different wording and were not treated as current. Required provider/OSM attribution, license links and conversion/decoding notice remain visible. No result expiry or separate cache prohibition was found in the reviewed current terms. Source/license references and retention reasoning are in ROUTING_PROVIDER_ARCHITECTURE.md.

The preview draws only returned road geometry and verified endpoint markers. It states that a basemap is not configured. No public OSM tiles, Google key or geocoding service is silently used. OSMF's capacity/attribution/caching/no-SLA policy was reviewed. An operational basemap/vehicle-specific provider requires separate validated setup.

## Inventory, journey and accountability

The five new tables contain planning/evidence only. They never update stock balances, reservations, ledger effects or demand. The only physical issue remains Phase 6A dispatch. Assigned-driver eligibility is checked before that issue. Whole physical return remains the existing exact compensating reversal; routing adds no replacement stock logic.

The journey derives signed ledger effects and linked purchase/production references, reservations/split ancestry, actual picked/loaded fields and posted count evidence. Supplier-owned production events without AMBS stock effects are explicitly labeled non-owned. Event quantities/actors/timestamps come from source rows; missing closing actors are not invented. No second event ledger is introduced. Direct synthetic journey checks exercise receipt → reservation → pick → load → dispatch and compensation. Earlier lot/serial/production/custody regression coverage remains passing; no claim is made that every production journey presentation branch has a separate browser fixture.

## Permission matrix and audit

| Action | SUPER_ADMIN / OPERATIONS | MANAGEMENT | SALES / PACKING | ACCOUNTS | DRIVER |
| --- | --- | --- | --- | --- | --- |
| Route/trip review | Yes | Yes | Relevant delivery records | Read | Current assignments only |
| Assign driver / verify pins / calculate / confirm / revise | Yes | No | No | No | No |
| Human arrival/completion | Yes | No | No | No | Current assigned delivery only |
| Company item journey | Yes | Yes | No | No | No |
| Selected-delivery item journey | Yes | Yes | Yes | No | No |
| Edit authoritative kilometers | No editable field | No | No | No | No |

Codes and inherited cost restrictions are documented in PERMISSIONS.md. `items.trace.company` prevents existing generic inventory-read grants from accidentally giving Packing or Sales company histories. A former driver immediately loses delivery visibility after reassignment. Assignment does not grant master, stock posting or administration rights. Existing cost-read permission is required for optional transport cost/basis in route reads.

Audit events record verified pins, assignment/reassignment, calculation/revision, route confirmation, actual trip status and denials, with stable targets, employee/time and safe fields/reason. No API secret/raw provider response is audit metadata.

## Verification results

- Baseline: all 171 earlier backend tests passed before implementation.
- Final full backend run: **211 passed in 594.21 seconds**, including all 171 old cases and 40 new routing/driver/provider cases.
- New cases cover valid normalized response, exact conversions, warning/geometry/timestamp handling, malformed/oversized/nonfinite/negative/boolean results, reversed echoed coordinates, missing route/key, 401/403/429/5xx/network/timeout, secret redaction, source ownership, coordinate ranges, immutable revisions, invalid/inactive drivers, current-driver access, no manual km fields, CSRF, role restrictions, no stock effects, original partial demand, reversal, real-source journey, database guards, optional tariff and retry/quota safety.
- A real PostgreSQL barrier test sends two independent transactions with one calculation key. Both return the same committed calculation and the mock adapter is invoked once. Existing real concurrent allocation/dispatch tests also pass.
- TypeScript and ESLint passed; npm audit reports zero vulnerabilities and pip-audit reports no known vulnerabilities. Python dependency consistency passes. No dependency upgrade/downgrade was made.
- Focused development Chromium: **30 workflow checks + 9 restart checks passed**, using mocked HTTP provider results in isolated databases. No React runtime errors, hydration warnings, uncaught exceptions or unexpected console warnings/errors were recorded.
- The complete production chain passed: authentication Chromium 22, HTTP/BFF 20, master 30 + 4 restart, inventory 32 + 7 restart, purchasing 37 + 8 restart, sales 37 + 8 restart, routing 30 + 9 restart. Every scratch fixture was safely torn down. The complete development chain also passed: authentication Chromium 24, HTTP/BFF 20, master 30 + 4 restart, inventory 32 + 7 restart, purchasing 37 + 8 restart, sales 37 + 8 restart, routing 30 + 9 restart. Both complete runs exited 0 after safe fixture teardown.

Browser checks exercise actual Operations forms for driver assignment, explicit verified pins, calculation, visible road warnings, attribution/preview, route confirmation, outage without invented metrics, destination revision and driver reassignment. They verify receipt of stock is independent of routing, 15 → dispatch 8 → remaining 7 → dispatch 7 completion, no second issue on retry, read-only real item events, 390px containment, former-driver access rejection, current-driver restrictions and explicit arrival/completion. Refresh, prior modules, logout/relogin and clean contexts are covered. Restarts retain original demand, both assignment/confirmation revisions, successful/failed calculations, actual trip evidence and reconciled inventory.

Earlier exploratory browser attempts required verifier synchronization corrections: the test initially proceeded before the new route revision rendered, and a generated selector had an encoding mismatch. The accepted test waits for the specific revision. These were test waits/selectors, not a suppressed application error or disabled reporting. The final accepted focused run is clean.

Evidence: ignored `artifacts/phase6b-baseline.log`, `phase6b-targeted-final.log`, `phase6b-pytest-final.log`, `phase6b-migration.log`, `phase6b-browser-development-accepted.log`, `phase6b-full-development.log`, `phase6b-full-production.log`, `phase6b-final-production.log`, `phase6b-npm-audit.log`, `phase6b-pip-audit.log`, and `artifacts/phase6b/` screenshots. No test trace/password snapshot is recorded.

## Documentation delivered

ROUTING_PROVIDER_ARCHITECTURE.md, ORS_LOCAL_SETUP.md, DRIVER_ASSIGNMENT_WORKFLOW.md, DELIVERY_ROUTE_RULES.md, ITEM_JOURNEY_DESIGN.md and this report. README, ARCHITECTURE, PHASES, PERMISSIONS, LOCAL_SETUP and DBEAVER_SETUP include the new scope, configuration, inspection queries and repeatable test commands.

## Limitations and business assumptions

- Live ORS is NOT RUN and unavailable until a private key is configured. A separately authorized one-call smoke test remains necessary to accept the real account/provider connection.
- Real warehouse/customer pins, driver accounts, address verification and physical actions remain business responsibilities. No company sites, kilometers or driver accounts were invented.
- Coordinate range/order checks cannot detect every plausible swapped pair or inaccurate real pin; employee verification remains required. No geocoding or basemap provider is configured.
- Driving-car is not validated for trucks or real-time traffic. Estimates do not measure actual distance or prove customer receipt. No GPS, odometer, signature or electronic POD exists.
- Local rate budgets account for committed attempts in this ERP; outside-account usage and a crash before commit can consume additional provider quota. No automatic external retry is attempted.
- Routing currently holds the existing conservative transaction gate during bounded provider I/O. This can briefly serialize other operations. Large-scale throughput and SQL-side timeline pagination need measured tuning before high-volume operation.
- Histories are retained append-only under the reviewed provider result license; recheck terms/account entitlements before future provider changes or redistribution.
- Dispatch-based order fulfillment and whole-delivery physical reversals remain unchanged. Trip completion is separate human evidence; later returns remain historical.
- Optional tariffs default to unconfigured and never generate a customer charge or accounting posting.
- Local Next build/start verification uses private test services over HTTP and development cookies. It is not production HTTPS deployment acceptance or a full backup-restore rehearsal.

## Business acceptance checklist

| Scenario/check | Status |
| --- | --- |
| A: provider-backed automatic road distance | PASS with mocked HTTP; live NOT RUN |
| B: driver cannot manipulate kilometers; auditable revision | PASS |
| C: independent routes/driver data preserve original 15 / 8 / 7 demand | PASS |
| D: outage/missing key produces honest failure and preserves stock | PASS |
| E: real-source read-only item journey | PASS |
| F: unknown/unverified coordinates require verification | PASS |
| G: road restriction warnings remain visible | PASS |
| H: isolated restart preserves routing/driver/trip/delivery/audit linkage | PASS, development and production |
| I: all prior backend regressions | PASS, included in 211 |
| Full development and production browser regressions | PASS |
| Final preview adjustment: fresh production build/browser/restart | PASS, 30 + 9 |
| Next compatibility guards and CJS/ESM runtime regressions | PASS |
| TypeScript / ESLint / dependency audits / schema drift / Docker health | PASS |
| No reset, volume deletion, credentials change, commit/push/deploy | PASS |
| No Google billing, fake GPS/POD, or Phase 6C redesign | PASS |

Phase 6B is technically acceptable within the documented mock/live boundary. The complete prior-phase browser chains passed in both modes. A final SVG label-position correction found during visual inspection was included in the full development run and reverified with a fresh isolated production build and focused 30 + 9 browser/restart checks; the earlier full production chain preceded only that visual correction. All final new-workflow consoles were clean. Earlier authentication/customer-duplicate negative tests retain their expected HTTP 401/409 diagnostics, with no unexpected React runtime or hydration warnings.

All three main Docker services are healthy on the original loopback ports. Main business/stock/routing tables remain unseeded and the original administrator is preserved. Next 16.4.6, React/React DOM 19.3.1, the three compatibility guards and both CJS/ESM router runtime regressions remain passing.

The code is ready for separate Phase 6C planning if requested. Operational acceptance of the real road-distance provider still requires private key configuration and a separately authorized successful live smoke test. No live ORS PASS is claimed. Phase 6C has not started.
