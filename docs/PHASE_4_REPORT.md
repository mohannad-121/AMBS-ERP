# AMBS ERP — Phase 4 implementation and acceptance report

Verification date: 16 November 2026 (local UAE session; some checks may finish after midnight). Workspace: C:\Projects\AMBS-ERP. Phase 5 has not started. No commit, push, public deployment, administrator reset, real inventory import or destructive database operation was performed.

## 1. Executive summary

Implemented transactional inventory with an append-only stock ledger, exact quantities, explicit holds, safe receipts/issues/transfers/reversals, warehouse/location management, physical counts and adjustments, low-stock thresholds, quality locations, LOT/SERIAL traceability, indicative costing, authorization and audit integration. Existing item/variant identities and security architecture are reused. Real development inventory remains empty pending authorized business configuration and genuine opening transactions.

Acceptance status: **PASS for Phase 4 technical acceptance**, subject to the business assumptions and operational limitations below. All critical stock integrity and concurrent allocation tests pass. Actual locations, opening balances and indicative costing still require company approval before live inventory use.

## 2. Files created and modified

Created:

- backend/app/models/inventory.py; backend/app/schemas/inventory.py.
- backend/app/services/inventory.py; backend/app/services/inventory_queries.py.
- backend/app/api/inventory.py; backend/tests/test_inventory.py.
- backend/alembic/versions/0004_inventory_inventory_ledger.py.
- frontend/lib/inventory.ts; frontend/components/inventory-screen.tsx; frontend/app/(erp)/inventory/[screen]/page.tsx.
- frontend/scripts/verify-inventory-browser.mjs.
- docs/INVENTORY_ARCHITECTURE.md, STOCK_MOVEMENT_RULES.md, INVENTORY_PERMISSIONS.md, INVENTORY_TEST_SCENARIOS.md and this report.

Modified: backend/alembic/env.py, app/main.py, core/body_limit.py, services/master.py, api/master.py, tests/test_security.py; frontend/lib/proxy.ts, components/app-shell.tsx, app/globals.css, scripts/verify-login-browser.mjs; scripts/Verify-AuthIntegration.ps1; README and ARCHITECTURE, PHASES, PERMISSIONS, LOCAL_SETUP, DBEAVER_SETUP documentation. Existing untracked workspace files were retained. No runtime dependency or lockfile change was needed in Phase 4. Earlier phase source and migrations were preserved except the explicit integration changes listed above.

## 3. Schema and relationships

Twelve new tables: warehouses, storage_locations, inventory_item_policies, stock_lots, stock_movements, stock_movement_lines, stock_balances, stock_ledger_effects, stock_reservations, inventory_counts, inventory_count_lines and stock_thresholds. Item/unit/user foreign keys retain Phase 3 and Phase 2 identities. Location ownership and lot/item composite FKs, scoped unique indexes, nonnegative checks and immutable-history triggers protect relationships. A goods receipt is a RECEIPT movement with lines, not a second duplicate entity. See INVENTORY_ARCHITECTURE.md for each table's role.

## 4. Migration, backup and recovery

Revision path: 0001_foundation → 0002_security → 0003_master_data → **0004_inventory**. Original revisions remain intact. Applied migration adds inventory tables, indexes, functions/triggers and reviewed grants; it does not update existing business or credential rows. Downgrade is explicitly blocked; corrections require reviewed forward migrations.

Before the upgrade, created a unique custom-format database backup:

`backups/ambs-before-phase4-20261116-214606-cf6fcd86bb364052b66e2e595127d37d.dump`

SHA256: `EB2A21419FF181A51CC64B25CB2926779FD1F8674BE2B30F99D567A030CC33A8`.

`pg_restore --list` and full archive decode using `pg_restore --file=/dev/null` succeeded. Backup is gitignored; it contains sensitive database data and must be retained securely. The existing private item-image volume must be backed up separately when populated.

For a recovery rehearsal, create a **new, unused scratch database**, copy this dump into the PostgreSQL container, and restore there. Example for a manually verified unused name (use the configured local database user; do not paste passwords):

```powershell
docker exec ambs-postgres-dev createdb -U ambs_dev ambs_restore_review_phase4
docker cp backups/ambs-before-phase4-20261116-214606-cf6fcd86bb364052b66e2e595127d37d.dump ambs-postgres-dev:/tmp/ambs-before-phase4-review.dump
docker exec ambs-postgres-dev pg_restore -U ambs_dev --no-owner --exit-on-error -d ambs_restore_review_phase4 /tmp/ambs-before-phase4-review.dump
```

Verify the scratch restore, counts, credentials structurally, images and application migrations before any separately authorized recovery. Do not restore over ambs_erp, use --clean, drop existing databases or overwrite backups. A full restore rehearsal was not performed during this phase; archive integrity was verified.

## 5. Ledger architecture

Posted movement lines generate signed source/destination effects. Effects are append-only; posted lines/headers cannot be edited/deleted. Transactional balance caches are derived from those effects and ACTIVE reservations. Transfers have equal negative/positive effects. Reversals create linked compensation; their originals become REVERSED. Multi-line failures roll back all effects, balances and successful mutation audit events.

## 6. Quantity calculation

On-hand = ledger SUM. Reserved = ACTIVE hold SUM. Available = on-hand minus reserved for active/usable/unblocked stock; otherwise zero. Nonusable physical stock remains separately visible. Items with zero availability remain in management but disappear from availability selections. Unit totals remain separated. NUMERIC(20,6), Decimal and unit precision enforce exact quantities; no browser arithmetic. Incoming/production are explicitly unsupported/null until Phase 5. Request 15 against stock 8 returns shortage 7 without creating an order.

## 7. Reservation engine

Identified internal holds record actor, quantity, location/lot, reason/reference and timestamps. ACTIVE closes once to RELEASED/CANCELLED/CONSUMED. Release/cancel changes no physical stock. Full consumption atomically removes the hold and posts one ISSUE; duplicate consumption fails or replays the exact same key safely. Partial consumption and order triggers are deferred. Receipt reversals cannot remove reserved or already-consumed quantities into negative availability.

## 8. PostgreSQL concurrency

The existing security transaction gate remains intact. Inventory uses transaction advisory lock 7140284202, deterministic FOR UPDATE bucket locks, unique NULL-aware bucket indexes and ON CONFLICT creation. Serial ownership and configuration changes share this gate. Unique UUID operation keys plus create-payload hashes prevent duplicate writes; draft versions detect stale edits. This conservative serialization is a deliberate small-team throughput tradeoff, not a claim of unlimited scalability.

## 9. Warehouse/location support

UUID and stable generated codes, active status, address/description, default warehouse and owned parent trees. USABLE/QUARANTINE/DAMAGED/REJECTED kinds support operational areas. Cross-warehouse parents, cycles, inactive ordinary transactions and archiving nonempty locations are rejected. Historical usability cannot be silently reclassified. Actual company locations and addresses were not invented.

## 10. Lot and serial traceability

NONE/LOT/SERIAL configured before activity; registration and quantities enforce item ownership. Serial identifiers are globally unique, require integer units and individual quantity one, with at most one physical unit across all locations. Trace includes movement history/current buckets. Blocked lots cannot be allocated; active holds must be released before blocking. No certification record is fabricated.

## 11. Cost methodology

Receipt quantity × known cost feeds per-bucket weighted average in posting order. Outgoing/transfer costs derive from source stock. Decimal values use 12 fractional places and half-even rounding. Missing/mixed costs remain incomplete, currency totals remain separate, and no historical costs/FX are invented. Compensation uses original effects and rejects negative known valuation. Physical backdating does not recost history. This is operational indicative valuation requiring business approval, not an accounting ledger or approved financial policy.

## 12. Backend endpoints

The API inventory prefix exposes balances, overview, reconciliation, reference options, warehouse/location management, tracking policy, lot registration/status/trace, paginated record histories, movement draft/post/reverse/cancel, hold create/release/cancel/consume, count snapshot/record/recount/post/cancel and threshold upsert. Full path/method contract is in INVENTORY_ARCHITECTURE.md and local OpenAPI. Bodies are limited to 64 KiB, at most 30 movement/count lines. Sensitive internal idempotency metadata is not returned.

## 13. Frontend workflows

Fourteen protected pages: Inventory Overview, Stock Balances, Movement History, Goods Receipts, Stock Issues, Internal Transfers, Reservations, Stock Counts, Stock Adjustments, Low Stock, Warehouses, Storage Locations, Lot/Serial Traceability, Damaged & Quarantined Stock. Existing green/Inter tokens and accessible labeled forms are reused. Forms support server reference search, validation errors, pending state, pagination/sorting, permissions, detail/trace views and explicit confirmed posting/closure. Hydration guards prevent premature form creation/submission. There are no simulated dashboard quantities.

## 14. RBAC changes

Reused inventory.read and added 18 permissions, total catalog 63. SUPER_ADMIN/OPERATIONS receive inventory actions. SALES/PACKING read quantity data; ACCOUNTS/MANAGEMENT additionally read costs. DRIVER has no inventory access. Prior security/business grants remain. inventory.adjust remains a reserved legacy permission. Cost redaction is recursive and server enforced; count posting also requires adjustments.post, consumption requires issues.post, and quality operations require quality.manage. See INVENTORY_PERMISSIONS.md.

## 15. Audit/security integration

Authenticated actor/target/action and relevant field names are committed with each stock mutation. Business reasons persist in records; closure/status reasons are additionally audited where applicable. Existing audit viewer and administration remain separate permissions. No entered passwords, session tokens or CSRF tokens are logged by inventory. Origin, JSON, CSRF, expiry/revocation, Argon2id and last-admin protections remain intact. No real administrator credential was used in automated tests.

## 16. Automated tests

| Check | Result |
| --- | --- |
| Baseline Phase 1–3 backend | 82 passed before implementation |
| Inventory real-PostgreSQL cases in complete suite | **30 passed** |
| Complete backend regression | **112 passed**, 194.73 seconds |
| Final location/warehouse minimum-scope regression | 1 passed against the final implementation |
| TypeScript | Passed |
| ESLint | Passed, zero warnings |
| Next production build | Passed with inventory route |
| npm audit including development dependencies | 0 vulnerabilities |
| pip-audit pinned runtime lock | No known vulnerabilities |
| pip check | No broken requirements |
| Full development browser/integration assertions | 24 authentication + 30 master + 4 master restart + 32 inventory + 7 inventory restart; 20 HTTP checks passed |
| Full production browser/integration assertions | 22 authentication + 30 master + 4 master restart + 32 inventory + 7 inventory restart; 20 HTTP checks passed |
| Production inventory verifier rerun and teardown | 32 + 7 Chromium checks, explicit exit 0 |
| Development inventory verifier rerun and teardown | 32 + 7 Chromium checks, explicit exit 0 |

No runtime dependency was changed in Phase 4. pip-audit/formatter were ephemeral tools, not new application dependencies. Its --disable-pip/--no-deps mode audited the full already-pinned hashed runtime lock; tool notices about dependency resolution are not application findings.

## 17. Real concurrent test results

Two separate users/sessions reach real PostgreSQL behind a Barrier and simultaneously reserve 10 each from 15: exactly **201 and 409**, final reserved **10**, available **5**. Concurrent retries of each RECEIPT, ISSUE and TRANSFER return the original post without a second effect. Independent simultaneous receipts into a missing bucket both succeed once (20 total). Independent issues/transfers of 10 each from 15 permit one and reject one, without partial/negative stock. Reconciliation passes after each race. No mock or sequential substitute was used.

## 18. Chromium verification

Focused development suite: **32 checks**, plus **7 after service restart**, passed in a real headless Chromium clean context. Receipt 50 → hold 20/available30 → reject35 → release → transfer10 → count source40 as37 → company47; threshold60, trace, Sales restrictions, master/security screens, audit, logout/login and fresh reload all verified. Tablet 768px has no document overflow; desktop 1440px and tablet screenshots are under ignored artifacts/phase4 and were visually inspected. Full development/production combined results are recorded below.

An initial full development run encountered a transient pre-mount React state-update warning while source formatting/HMR overlapped verification. The run correctly failed; it was not suppressed or accepted. Browser diagnostic collection now includes the CDP call stack if this warning returns. A repeat ran with application source unchanged; its result is recorded below. No new dependency patch or disabled reporting was used.

The unchanged-source development rerun passed all 97 Chromium assertions, including login, delayed Flight responses, repeated navigation and Fast Refresh. Production passed all 95 assertions. Only deliberate negative-test resource diagnostics occurred: invalid-login HTTP 401 and insufficient-reservation HTTP 409. No final React runtime, hydration or unexpected console warning/error was observed. The isolated pre-mount warning's exact origin was not established; it did not recur on the clean runs, so no speculative framework change was made.

Two verifier infrastructure issues were recorded separately from application assertions: Windows PowerShell retained a failed readiness probe as its implicit exit status after all development assertions passed, and Docker Desktop returned a start transport HTTP 500 during the first production persistence container launch. The persistence assertions themselves completed, and all scratch resources were removed. The script now returns explicit success only after every checked command and teardown complete. A fresh production inventory/build/restart run then passed with exit 0. No application failure was suppressed or converted to success. Container build progress written to stderr can appear as NativeCommandError records under Windows PowerShell output redirection; actual native exit statuses are checked explicitly.

The final fresh development inventory/restart run also passed all 39 checks and explicit exit 0. Final verification leaves only the three main containers running and zero ambs_http_test_* databases. Evidence logs are gitignored: artifacts/phase4-pytest-accepted.log, phase4-threshold-regression.log, phase4-frontend-final.log, phase4-full-dev.log, phase4-full-production.log, phase4-development-final.log, phase4-production-final.log, phase4-npm-audit.log and phase4-pip-audit.log. Screenshots are artifacts/phase4/inventory-desktop.png and inventory-tablet.png.

## 19. Next compatibility patch

Next 16.4.6, React/React DOM 19.3.1 remain pinned. The previous version-guarded CommonJS/ESM layout-router patch is unchanged and installed by npm postinstall. Three guard/idempotence tests pass. Real Chromium tests of both distributions pass: superseded pending RSC, fulfilled RSC, missing/null replacement and client-state preservation without React diagnostics. Development indicator, console errors and overlay remain enabled. Login hydration and loopback HMR configuration remain intact.

## 20. Docker health

All three main services are healthy: ambs-postgres-dev, ambs-erp-backend-1, ambs-erp-frontend-1. Published ports remain loopback-only 5433/8000/3000. Test services have no published host ports. No named volume was deleted. Isolated scratch services restart without resetting their database/image volume. Main services and real user sessions were not restarted for test convenience.

## 21. Migration/drift and preservation

Main upgrade to 0004_inventory succeeded. Alembic check reports no new upgrade operations; current/history show the expected linear head. Existing business/security record fingerprints (including credential hashes) and previous grant IDs were compared before/after the migration and preserved; session identity was retained (routine last_seen excluded). Final main counts: users1, active SUPER_ADMIN1, customers/projects/LPO/items0, warehouses/movements/reservations/counts/balances0. No test stock or users were seeded into ambs_erp.

Original revision SHA256:

- 0001_foundation.py: E05CF1EF2D8918AC627E65D05046CF7787DE4C4315F9CE5E49BD63E071A3BA4D.
- 0002_security_security_foundation.py: 05350DFE10349B889DED1730241F0E282FA77F95D2D1782B1F41F80DAAA89A46.
- 0003_master_data_business_master_data.py: C485A933E3976D04687A505B1121FD8BDDD5A969768C1FC7110E656201832A7A.

## 22. DBeaver

Updated DBEAVER_SETUP.md with loopback connection, environment-sourced credentials, all inventory tables and read-only SQL for balances, ledger, holds, counts, lots, thresholds and reconciliation. No claim of GUI operation is made. Direct stock edits are prohibited; API actions preserve authorization, ledger and audit.

## 23. Persistence and restart

Focused Chromium restarted only its scratch backend/frontend with its private database and storage intact. On-hand47, released reservation history, inventory audit, UI visibility and reconciliation persisted across a fresh context in development and production. Full suites also verified existing customers, variant identities and private images after restart. Real development volumes and credentials were preserved throughout.

## 24. Business assumptions

Warehouse configuration must reflect verified locations. Returns conservatively enter quarantine; inspection release requires explicit quality authority. Operations holds the initial inventory authorities; multi-person approval is not imposed. Thresholds compare allocatable availability and show in-app warnings only. Minimum values and costing policy need company approval. Internal manual references are documented text, not proof of a supplier purchase order/customer fulfillment. Counts operate on explicitly selected scope rather than silently claiming an entire warehouse was counted.

## 25. Limitations

No purchasing, outsourced production, sales order/backorder, packing formula, delivery, rental, accounting/VAT, FX, automatic supplier order or external notification is implemented. Reservation consumption is full quantity only. Large-scale query optimization and removal of the conservative mutation gate require measured load tests before large imports. Exact-effect reversal can require downstream correction when historical known value would become negative. Production deployment, least-privilege DB roles, off-host backups/recovery rehearsal and business acceptance of opening balances/costing remain later operational gates. No true company stock accuracy can be claimed before approved opening transactions.

## 26. Acceptance checklist

| Requirement | Status |
| --- | --- |
| Preserve prior data, administrator and migration history | PASS |
| Real ledger, exact balances, no negative allocation | PASS |
| Atomic posting, safe idempotency and concurrent holds | PASS |
| Warehouses, safe hierarchy, inactive handling | PASS |
| Counts, stale snapshots, positive/negative variance | PASS |
| LOT/SERIAL, returns/quarantine/damage and release | PASS |
| Indicative costing and honest currency/unknown handling | PASS |
| Backend RBAC, CSRF, audit and cost redaction | PASS |
| Functional inventory UI, real low-stock alerts | PASS |
| Threshold scope preserved under location filters and across warehouses | PASS |
| All prior backend regressions | PASS |
| Development and production browser assertions, build, restart and clean reruns | PASS |
| Next patch guards and both framework runtime regressions | PASS |
| Docker health, migration/drift, safe backup | PASS |
| Documentation and deferred integration boundaries | PASS |

## 27. Recommendation for Phase 5

Phase 4 can be accepted technically with the documented operational assumptions. Stock integrity, concurrency, prior-phase regressions, real Chromium workflows in both modes, persistence, security, migration/drift and health checks passed. The business should approve actual location configuration, opening transactions, role policy and indicative costing before live inventory use. No live stock quantities were invented. Phase 5 may be planned after that review, but has not started and still requires a separate user instruction. No public deployment, commit or push was performed.
