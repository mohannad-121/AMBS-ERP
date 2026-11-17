# AMBS ERP — Phase 5 implementation and acceptance report

Date: 17 November 2026, Asia/Dubai. Workspace: C:\Projects\AMBS-ERP. Phase 6 has not started. No commit, push, public deployment, real supplier message, Odoo connection, real data import, credential reset, database reset or named-volume deletion was performed.

Status: **PASS for Phase 5 technical acceptance**, subject to the documented operational assumptions and limitations. The final complete backend run passed 148 tests, including all 112 previous cases and 36 purchasing/production cases. No critical stock/custody/concurrency invariant failed. Phase 6 has not started.

## 1. Executive summary

Implemented supplier/contacts/catalog management, historical quotations and explainable comparison, purchase requests and supplier POs, partial receiving, outstanding quantities, outsourced route progress, supplier-to-supplier custody, owned versus supplier-owned material visibility, measured conversions, schedules/delays, dashboards, role enforcement and audit. All stock mutations use the Phase 4 engine. Real development business tables remain unseeded.

## 2. Files created and modified

Created backend/app/models/purchasing.py, schemas/purchasing.py, services/purchasing.py, services/purchasing_queries.py, api/purchasing.py; backend/tests/test_purchasing.py; revisions 0005_purchasing_purchasing_production.py and 0006_workflow_guards.py. Created frontend/lib/purchasing.ts, components/purchasing-screen.tsx, app/(erp)/purchasing/[screen]/page.tsx, app/(erp)/purchasing/[screen]/[id]/page.tsx and scripts/verify-purchasing-browser.mjs. Created the seven requested supplier/purchasing/production/custody/integration/test/report documents.

Modified backend/alembic/env.py, app/main.py, core/body_limit.py, models/inventory.py, services/inventory.py, inventory_queries.py, master.py, tests/test_security.py and test_inventory.py; frontend/lib/proxy.ts, components/app-shell.tsx, inventory-screen.tsx, app/globals.css; scripts/Verify-AuthIntegration.ps1; README, ARCHITECTURE, PHASES, PERMISSIONS, LOCAL_SETUP, DBEAVER_SETUP and INVENTORY_ARCHITECTURE documentation. Existing workspace contents remained untracked/uncommitted and were retained. No runtime dependency/lockfile or Next compatibility patch was changed.

## 3. Database entities and relationships

Eighteen new tables: suppliers, supplier_contacts, supplier_materials, supplier_quotations, supplier_quotation_lines, purchase_requests, purchase_request_lines, purchase_orders, purchase_order_lines, purchase_receipts, purchase_receipt_lines, production_orders, production_stages, production_events, production_costs, supplier_schedule_updates, production_conversions, purchasing_import_keys. UUID FKs link existing users/items/units/warehouses/locations/lots/stock movements. Supplier-item uniqueness, one request conversion, immutable commercial/receipt history, append-only events and exact positive quantities are enforced. Receipt links are business metadata over the existing ledger, not duplicate inventory balances.

## 4. Alembic revisions and backups

Preserved 0001_foundation → 0002_security → 0003_master_data → 0004_inventory. Added **0005_purchasing**, followed by **0006_workflow_guards**. The latter prevents confirmed documents returning to Draft through SQL and permits cancelled quotation draft branches while retaining one published successor. No old migration was rewritten to apply that correction. Upgrades are forward-only; downgrade is blocked to retain history.

Fresh backups were created before both upgrades, fully decoded using pg_restore --file=/dev/null, copied into gitignored backups and hashed:

| Archive | SHA256 |
| --- | --- |
| ambs-before-phase5-20261117-102226-284f3c4a43964f0790ecba70168dc283.dump | 0DF0FF56B3FD105FC67016D30253DD62B4717F7783FC29DE20F12B338CDBE32F |
| ambs-before-phase5-guards-20261117-112456-59f7800e7fdd4b0d8d48481807311b76.dump | 478F24B8AD0D8F44FD7077A29259A8CB4F0FB7A153B27E4F7D0C58CD16B1405D |

These contain sensitive database data; keep them protected and back up the private image volume separately. No full restore rehearsal was performed; archive integrity was verified. A safe rehearsal restores only into a new unique scratch database, never over ambs_erp:

```powershell
$restoreName = 'ambs_restore_phase5_' + [guid]::NewGuid().ToString('N')
docker exec ambs-postgres-dev createdb -U ambs_dev $restoreName
docker cp backups/ambs-before-phase5-20261117-102226-284f3c4a43964f0790ecba70168dc283.dump "ambs-postgres-dev:/tmp/$restoreName.dump"
docker exec ambs-postgres-dev pg_restore -U ambs_dev --no-owner --exit-on-error -d $restoreName "/tmp/$restoreName.dump"
```

Verify scratch counts, migration upgrade, image consistency and application behavior before any separately authorized recovery. Do not use --clean, replace real data, remove named volumes or overwrite older backups.

## 5. Supplier module

Stable supplier codes/UUIDs, normalized search/duplicate warnings with explicit distinct-record override, multi-type classification, address/contact/tax/payment metadata, notes and activation. Multiple contacts and a controlled main contact are supported. Catalog links retain purchase units, supplier references, minimums, verified lead time and availability evidence. Stale/unverified reports never establish AMBS stock. Referenced suppliers cannot be hard-deleted. Private synthetic browser suppliers are not inserted into the main database.

## 6. Quotations and price comparison

Versioned draft/issued/superseded/cancelled quotation history retains lines, effective/valid dates, charges and attachment metadata. Comparison ranks only known compatible currency/unit/exact quoted quantity/validity/minimum/charges; missing or incompatible evidence is explicitly Not Comparable. No unsupported quantity-band extrapolation, FX, shared-charge allocation, reliability score or automatic award occurs. Recorded lead time and availability remain qualified supplier reports. Matching quote versus confirmed unit-price variance is visible without inventing invoice costs.

## 7. Purchase requests

DRAFT → SUBMITTED → CONVERTED, or unconverted cancellation. Employee/date/priority/reason, optional need date/quote and stock/service lines persist. Conversion preserves requested item/type/unit/quantities and creates one linked PO draft under lock. It does not invent a managerial approval hierarchy or silently reopen a cancelled conversion.

## 8. Purchase orders

DRAFT is not a confirmed obligation. Explicit confirmation requires known unit prices and records actor/time. Partial receiving derives status from actual posted quantities. Historical terms cannot be changed; amendment closes the old remainder with reason and creates a linked replacement draft requiring separate confirmation. Closed/cancelled orders reject receiving. Active linked production prevents closure/amendment that would strand it. Customer LPOs remain separate Phase 3 records.

## 9. Partial goods receipts

Actual quantities/time/location/lot/source/actor are recorded in draft receiving links. Posting100 ordered as40 then60 produces PARTIALLY_RECEIVED/outstanding60 then RECEIVED/outstanding0, with no duplicated stock. Service acceptance produces no inventory movement. Wrong units/lots/warehouses, excess quantities and incomplete transactions fail safely. Whole reversal compensates ledger/purchase totals; holds, downstream consumption and active production claims remain protected.

## 10. Phase 4 ledger integration

PURCHASE_RECEIPT, CUSTODY_TRANSFER, PRODUCTION_INPUT and PRODUCTION_OUTPUT are private business integration kinds; public arbitrary movement schemas do not accept them. Existing NUMERIC/Decimal, bucket creation, signed effects, cached balances, holds, serial tracking and reconciliation are reused. Business receipt/stage changes and stock/audit commit atomically. Generic inventory reversal rejects linked business movements to prevent stale PO/progress history.

## 11. External production architecture

Explicit order/route and append-only event records support partial START/COMPLETE/TRANSFER/YARD progression, optional stages and exact measured quantities. Planning and expected dates never complete production. Supplier-owned work requires a real matching purchase line and is not on-hand. Owned work requires actual available unallocated stock. Started route/ownership/quantity changes and arbitrary undo are conservatively rejected.

## 12. Custody model

EXTERNAL locations reference verified suppliers and a warehouse ownership scope; they are distinct from quarantine/damage and have zero dispatch availability. Owned external stock stays in the same stock ledger. Active per-item/location/lot stage claims prevent duplicate allocation or hidden negative corrections. Supplier-owned materials create no AMBS balance before acquisition. Yard return of owned material is a transfer, preserving company stock.

## 13. Coating and galvanizing

Recorded routes can contain fabrication/coating, galvanizing alone or other actual sequences. No compulsory coating-plus-galvanizing route is invented. Completed quantity alone may advance. Tests/browser include supplier-to-supplier partial coating and owned galvanizing/yard return. Explicit measured transformation retains approved input/output identities and quantities; no BOM, yield or cost allocation is fabricated.

## 14. Stage tracking

Entered, completed, in-process, ready, forwarded, current custody and yard quantities derive from immutable events. Lot-specific bounds prevent advancing another lot's progress. Example100 → fabrication complete60 → coating complete45 → yard45 leaves40 at fabrication and15 at coating. Stage completion counts are not summed as additional stock. Completion requires actual yard quantity equal to plan.

## 15. Delays and supplier updates

Unknown timing displays Awaiting Supplier Confirmation. Requested, confirmed and reported ETA dates/evidence/reason/actor are retained as append-only updates using UAE business dates. Missed recorded due dates with outstanding work produce in-app alerts. No ETA is fabricated and no external email/WhatsApp/supplier message is sent.

## 16. Dashboards

Purchasing shows open requests/POs, partial receipts, outstanding unit groups, overdue deliveries, recent receipts, quote validity/history and separate-currency outstanding line commitments. Production shows current routes, ownership, stage custody/readiness, delays, pending collection and latest events. Inventory overview now exposes confirmed incoming and entered external work separately. These can describe the same goods and must not be added; expected stock remains unavailable until physical posting.

## 17. RBAC

23 active Phase 5 codes reuse suppliers.read/create/update and add20, total catalog83. SUPER_ADMIN/OPERATIONS manage daily workflows. SALES reads justified PO/readiness information without prices or writes. ACCOUNTS/MANAGEMENT read relevant supplier/financial/purchasing/production information. PACKING reads production readiness; DRIVER remains deferred. Physical receiving/transfers/conversion/quality retain additional inventory permissions. Supplier prices, processing cost history and inventory values use separate read grants. Full matrix is in PERMISSIONS.md.

## 18. Audit integration

Supplier/catalog/contact changes, quote history, requests/conversion, confirmation/amendment/closure, receiving/reversal, production progress/custody, conversion, cost and schedule events record safe actor/action/target/time metadata. Required successes share the business transaction. Denials retain existing security audit behavior. No credentials, tokens, cookie values or unnecessary private payloads are logged. CSRF, sessions/revocation, rate limits, last-admin protection and real credentials remain unchanged.

## 19. API inventory

See PURCHASING_ARCHITECTURE.md for full method/path inventory under /api/purchasing. Reference/list/detail APIs, protected supplier/contact/catalog writes, quotation/request/PO drafts and actions, amendments, receipts, production plans/stages/costs, custody locations, measured conversions, schedules, comparison and write-free import preview are implemented. BFF allowlists and 64 KiB bodies apply; no arbitrary upstream proxy is introduced.

## 20. Frontend pages

Supplier Directory/Details, Contacts, Catalog, Quotations, Comparison, Purchase Requests, Purchase Orders/Details, Goods Receipts, Outstanding Purchases, Outsourced Production/Details, Stage Timeline, External Transfers, Custody Locations, Schedule, Measured Conversions, Purchasing Dashboard and Production Dashboard. Existing Inter/green design tokens, accessible labels/modals, loading/error states, search/sort/pagination, detail links, confirmation, tablet layouts and permission-aware actions are reused. All actions call real APIs; no placeholder business quantities are shown.

## 21. Backend results

| Executed check | Result |
| --- | --- |
| Preflight prior-phase backend |112 passed,189.43 seconds |
| Initial full integrated backend |135 passed,320.46 seconds |
| Hardened Phase 5 PostgreSQL suite |34 passed,122.08 seconds |
| Final complete regression at 0006_workflow_guards |**148 passed**,262.74 seconds; includes all112 earlier cases and36 new cases |
| Final explicit PO-confirmation/price-write RBAC checks |7 role cases passed |
| Overall production due-date and external-edit integration checks |2 passed |
| Large-total exact Decimal comparison |Passed independently and in the final complete suite |
| Final isolated production build, fresh npm ci and patch guards |Passed; purchasing resource/detail routes built |
| TypeScript / ESLint |Passed; zero lint warnings |
| npm audit |0 vulnerabilities |
| pip-audit runtime lock |No known vulnerabilities |
| pip check |No broken requirements |

A formatter cleanup removed a fixture import, producing34 setup errors while112 previous tests passed. That run was rejected; the fixture import is now separately marked and the34-case purchasing rerun passed. A subsequent full run was intentionally interrupted for the forward workflow-guard revision; it is not counted as a successful final run. Final results are filled only after execution. No stock invariant failure was concealed.

## 22. PostgreSQL concurrency

Two distinct authenticated employees reach real PostgreSQL simultaneously behind a Barrier and each post8 against10 outstanding: exactly one200 and one controlled409, received/on-hand8 and outstanding2. Same-key concurrent posting creates one effect and both return its result. Simultaneous stage completion cannot over-complete entered100: one80 succeeds and the competing80 fails. Active external claims prevent double start, unlinked conversion, reversal and negative count correction. All successful races reconcile to the authoritative ledger/holds.

## 23. Chromium development/production

Focused development:37 workflow checks +8 after scratch service restart passed. Full production chain:22 authentication browser,20 HTTP/BFF,30 master +4 restart,32 inventory +7 restart,37 purchasing +8 restart assertions passed. Full development chain also passed:24 authentication,20 HTTP/BFF,30 master +4 restart,32 inventory +7 restart,37 purchasing +8 restart. After the final guard migration, fresh focused development and optimized production runs each passed all37 purchasing +8 restart assertions with exit0 and successful fixture teardown. Only deliberate HTTP401/409 negative-test diagnostics occurred in their named earlier suites; the new suite recorded zero warnings/errors and no React/hydration exceptions.

Real Chromium used dedicated synthetic administrators/operators/Sales accounts and fresh contexts, without the real administrator's credentials. Desktop1440px, tablet768px and production timeline screenshots were visually inspected under ignored artifacts/phase5; no page-level horizontal overflow was observed.

Final-change coverage note: both browser modes and restarts passed before the last receiving-route safeguard/catalog edit action. That safeguard, existing-draft rejection, owned historical PO references, remaining-unowned allocation, Decimal precision and consistent stage reads passed the final148-case backend run. Final TypeScript/ESLint and production build validate the last UI changes. No later full browser rerun is claimed.

Evidence logs are gitignored under artifacts: phase5-pytest-final.log, phase5-final-browser-development.log, phase5-final-browser-production.log, phase5-full-development.log, phase5-full-production.log, phase5-frontend-final.log, phase5-build-accepted.log, phase5-rbac-final.log and phase5-final-integration-guards.log. Screenshots are artifacts/phase5/purchasing-desktop.png, purchasing-tablet.png and production-timeline.png.

## 24. Migration/drift and preservation

0005 applied transactionally with original-row fingerprints preserved across29 prior tables, including credentials/session identity/grants. 0006 applied with existing rows/grants preserved across47 tables. Routine session last-seen timestamps were excluded from comparison. Alembic current is0006_workflow_guards and check reports no new upgrade operations. Main users1/active SUPER_ADMIN1 remain; customers/items/stock movements/suppliers/quotations/POs/receipts/production orders/events/conversions are all0. Permission catalog83 reflects only reviewed additions/grants. No synthetic main records were inserted.

Original migration SHA256 values remain unchanged:

| File | SHA256 |
| --- | --- |
| 0001_foundation.py | E05CF1EF2D8918AC627E65D05046CF7787DE4C4315F9CE5E49BD63E071A3BA4D |
| 0002_security_security_foundation.py | 05350DFE10349B889DED1730241F0E282FA77F95D2D1782B1F41F80DAAA89A46 |
| 0003_master_data_business_master_data.py | C485A933E3976D04687A505B1121FD8BDDD5A969768C1FC7110E656201832A7A |
| 0004_inventory_inventory_ledger.py | A52ABE9681EAA8011BC881DA0203BA55B849450892EFAE9113CF8CC286E84390 |

## 25. Docker

All three main services retain healthy loopback-only5433/8000/3000 publication. Private item images/named volumes remain intact. Scratch test services have no published host ports. Production verification uses isolated next build/start volumes with local development cookie/HTTP settings; it is not deployment/TLS production acceptance. Main services were not reset for test convenience.

Final isolated npm ci, compatibility guards, optimized production build, TypeScript and ESLint all passed. The final rebuild retained the main development .next volume. Public frontend/backend health endpoints returned status ok.

## 26. Persistence

Fresh contexts after scratch backend/frontend restart retain suppliers, quotation history, purchase/receipt links, supplier-owned partial progress, completed owned custody, on-hand145, audits and ledger reconciliation. Existing master/image/inventory persistence is exercised by the full chains. Teardown removes only each run's generated fixtures.

## 27. Next compatibility patch

Next16.4.6 and React/React DOM19.3.1 remain pinned. The existing CJS/ESM layout-router compatibility patch is unchanged and reproducible through npm postinstall. Three guard/idempotency tests and both Chromium runtime suites cover superseded pending/fulfilled/missing/null RSC and mounted-state preservation. Error overlay/indicator and console reporting remain enabled. No blind upgrade/downgrade or warning suppression was used.

## 28. DBeaver

DBEAVER_SETUP.md includes loopback connection and read-only inspection of supplier/catalog/quotes, PO receipt totals, production routes/events/costs, custody and conversions. No GUI operation is claimed. Stock and commercial history must not be repaired through SQL; use authorized business operations and reviewed reconciliation. Database-owner visibility bypasses UI financial redaction and must be restricted operationally.

## 29. Business assumptions

Operations owns initial purchasing/production authority without a fabricated managerial approval hierarchy. All dates/availability/lead times require recorded evidence. Quotation quantity must match exactly; supplier price bands, FX and unit conversions are not inferred. Service lines create no stock. Supplier-owned production requires a confirmed purchase line; owned work requires measured actual stock. Actual rejected/quarantined goods are not usable. Document attachments are metadata references only.

## 30. Limitations/deferred scope

No customer sales orders/backorders, packing PDFs, driver tracking, rentals, supplier invoices/payments, VAT/journals, external messaging, cloud hosting or live Odoo/import is implemented. Whole receipt reversal is supported subject to downstream/claims guards; partial returns, arbitrary production-stage undo/loss settlement and financial credits require reviewed business rules. Active production cannot be cancelled or silently edited. Measured conversion outputs and processing charges remain cost-incomplete/pending allocation; receipt cost basis is the confirmed PO price, not invoice settlement. Query aggregation and conservative shared locks require load testing/tuning before large imports. Restore archives were decoded but no complete restore rehearsal/deployment was performed.

Routes retain one item identity through their stages; transformations use the separate approved measured-conversion workflow on unallocated owned inputs, followed by an explicit output-item plan where appropriate. Quotation date is the modeled validity start, and differing effective-date agreements must remain unranked until their actual terms are verified. Dashboard recent quotation/receipt panels use bounded recent histories; use the paginated directory/history APIs for complete review.

## 31. Acceptance checklist

| Requirement | Status |
| --- | --- |
| Preserve credentials/users/prior data/migrations/private images |PASS |
| Supplier/catalog/quote history/comparison, no invented company data |PASS |
| Requests/PO lifecycle, snapshots/amendment/closure |PASS |
| Partial/service receiving and idempotent stock integration |PASS |
| Real concurrent receiving; no duplicate/negative stock |PASS |
| Partial production, optional coating/galvanizing, owned/unowned custody |PASS |
| Measured conversion, no fabricated BOM/cost allocation |PASS |
| Dates/delays/real dashboards and financial redaction |PASS |
| Audit/session/CSRF/RBAC and prior-phase compatibility |PASS |
| Final backend, browser verification, drift and health |PASS, with final-change coverage note in section23 |
| Documentation and deferred Phase 6 boundary |PASS |

## 32. Phase 6 readiness

Phase 5 can be technically accepted with the documented operational limitations. Before live use, the business must approve actual supplier/location records, receipt disposition/correction procedures, financial allocation assumptions and access policy. Phase 6 still requires a separate instruction; it has not started. No commit, push or deployment was performed.
