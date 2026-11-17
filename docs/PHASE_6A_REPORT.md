# Phase 6A: orders and dispatch

Verification date: 17 November 2026, Asia/Dubai.

## Scope

Phase 6A adds customer sales orders, real availability, linked reservations, measured picking/loading, partial deliveries, derived backorders and controlled physical-return reversals. The operations screen is `/sales`, under **Orders & dispatch**. Authentication, CSRF, session handling, the existing PostgreSQL stock ledger and the Next compatibility patch are retained. No routing/GPS, packing PDFs, invoices, VAT, journals, Phase 6B or Phase 6C implementation is included.

## Existing architecture and preservation

Preflight confirmed `0006_workflow_guards`, healthy development services and 148 passing Phase 1-5 backend tests. Existing reports, master relationships, inventory ledger/holds, purchasing receipts, production custody, authorization, audit and frontend components were reviewed. No existing migration was replaced.

Before the upgrade a custom-format PostgreSQL archive was created and fully decoded using `pg_restore --file=/dev/null`:

`backups/ambs-before-phase6a-20261117-130608-6a66a0fb147449b7840f2de76b00188c.dump`

SHA256: `1C4D659953351A58D9D387CFED6E0C372EEF451D68DA46BFFD9B78223F1CD9B4`.

The additive migration was applied inside one transaction under the existing security and inventory gates. Before/after fingerprints verified that every existing row across 47 tables remained present and unchanged, including password hashes, session identities and old grants. Normal session last-seen activity was excluded. New permission grants are additive. The main database was never seeded with synthetic orders, inventory or test identities. No credentials were used or reset for browser testing. No volume deletion, database reset, commit, push or deployment occurred.

Current head: `0007_sales_ops`. Alembic schema drift check reports no new upgrade operations. The checked migration helper is `backend/tests/migrate_phase6a.py`; it refuses an unexpected starting head and rolls back if old-row preservation fails.

## Common workflow

1. Create a multi-line order for an existing active customer. Select a matching project and customer-issued LPO where applicable. Item selection retrieves usable stock from the server, including shortage. Stock shortage does not reject legitimate demand.
2. Confirm the order. This changes demand status without moving stock.
3. Choose **Prepare delivery**, select the actual origin warehouse and verify the destination. Available usable stock is reserved automatically. The delivery draft contains the reserved item, unit, source location and lot/serial information. The destination can reuse an existing project location or customer address; missing information must be entered. An existing active DRIVER identity can be assigned optionally.
4. Confirm physically picked quantities, then physically loaded quantities. Actual fields start blank; zero records an item not picked/loaded. Loading cannot exceed picking and picking cannot exceed the preparation. Explicit verification is required.
5. **Post dispatch** issues only loaded quantities through the existing inventory engine, records employee/time and updates the original order automatically.
6. Receive additional goods through existing inventory/purchasing workflows. Prepare another delivery on the original order to fulfill the remaining quantity.

Orders, outstanding/backorders, stock lookup and delivery history share one screen. Order detail keeps preparation, confirmations, dispatch, allocations and history together. Loading/error/empty states, pagination, search/customer and status filters, permission-dependent actions and confirmation dialogs are provided. The existing design/components are reused. A narrow-screen document reference wrap prevents long order numbers from being clipped.

## Demand, amendments and status

Orders use UUID identities and stable unique `SO-...` references. Lines reference the existing item/variant and its unit, with name/unit snapshots and exact `Numeric(20,6)` quantities. Order quantity respects unit precision; logical demand for serialized items may exceed one, while each physical serial reservation still uses the existing individual-serial rules.

Customer/project/LPO ownership is checked in the service and protected by composite foreign keys. LPO project changes are blocked after use by an order. Confirming revalidates active references and item/unit identity. Confirmed sales history freezes item unit/variant identity and unit precision through the existing master validation service.

States: DRAFT, CONFIRMED, PARTIALLY_DISPATCHED, COMPLETED, CANCELLED. Draft editing and confirmed amendments use optimistic versions. Quantity, requested date, priority and notes amendments record immutable before/after snapshots, reason, actor and timestamp. Existing confirmed line identities remain fixed; a new item requires a new order. Quantity cannot be reduced below dispatched plus active allocated quantities. Release unused allocations before reducing demand. PostgreSQL guards reject silent confirmed identity/quantity rewrites and returning confirmed records to draft.

**Outstanding = ordered quantity minus consumption on deliveries currently DISPATCHED.** A REVERSED delivery retains its consumption and stock history but no longer fulfills demand. A backorder is this derived remaining balance on the original order, not a second demand document. Orders complete only when every line has zero outstanding.

## Inventory and reservation transactions

There is one stock ledger. New sales tables contain business links, quantities and immutable references, never a second stock balance. Availability reads the existing stock balances and usability rules; inactive, blocked, quarantined, damaged, rejected and external stock is excluded. Own usable allocations contribute to fulfillable quantity. Numeric business calculations remain on the backend; the frontend displays server-calculated shortage and fulfillment values.

Sales mutations reuse `inventory.lock_inventory` and existing bucket/record row locks. Sales reads take the same conservative transaction gate for a consistent fulfillment view. Allocations are capped by unfulfilled/unallocated demand and actual available stock. Multiple allocations and multiple deliveries can belong to one line. Open preparations claim their allocations so another draft cannot promise the same hold.

Manual reservations retain their existing semantics. Linked sales holds cannot be released or consumed through generic inventory routes; use order/delivery actions. Release is refused while a preparation claims the allocation. Cancel the preparation first. Cancelling an unposted preparation records its state without moving stock. Cancelling an order with no net dispatch cancels preparations and releases only that order's holds.

The original reservation quantity is never changed. When dispatch consumes only part of a hold, the transaction releases the original hold, creates linked consumed/remainder children, consumes the consumed child in full through the original inventory service and retains the remainder as active. Parent/child links preserve history. All steps commit together, so no other transaction can acquire temporarily released stock. Full consumption keeps the original full-consumption behavior. Lot/serial restrictions remain enforced by inventory.

Each nonzero loaded delivery line creates one linked stock ISSUE through reservation consumption, with the delivery code as source reference. The movement retains item, unit, exact quantity, source, lot/serial, actor/time and audit. A unique consumption link records the delivery line, reservation and posted movement. PostgreSQL verifies that the consumption matches an exact linked posted issue. Stock is unchanged at order creation, confirmation, preparation, picking and loading; reservations affect availability only. Dispatch is the physical event.

Every mutation has an actor-bound request key and canonical payload fingerprint. Retrying the same request returns its current document without repeating effects; conflicting reuse is rejected. Separate concurrent dispatch attempts serialize under PostgreSQL locks; only one posts. A single transaction includes stock effects, hold changes, delivery state, original-order progress and audit. Failure rolls everything back.

## Correction and reversal

Cancel an unposted draft/picked/loaded preparation to correct its measurements, then prepare again. Verified measurements are not silently overwritten.

A dispatched delivery cannot be cancelled or reversed through the generic inventory endpoint. **Reverse delivery** requires a reason and explicit confirmation that all goods physically returned to their original locations and lot/serial identities. It invokes the existing exact compensating movement service for each issue, preserving the original movement and immutable ledger effects. Existing cost, availability, downstream and serial checks can reject an invalid reversal. Reversal reopens original demand, returns stock and does not reactivate consumed reservations. Reallocation is explicit on the next preparation. Whole-delivery reversal is supported; partial physical returns require a later reviewed workflow.

## Database and files

New migration: `backend/alembic/versions/0007_sales_ops_sales_operations.py`.

Nine new tables:

| Table | Purpose |
| --- | --- |
| sales_orders | Customer/project/LPO demand header and progress |
| sales_order_lines | Item/unit snapshots and ordered quantities |
| sales_amendments | Append-only versioned before/after snapshots |
| sales_allocations | Original allocation quantity and active remainder pointer |
| sales_reservation_links | Append-only allocation and split ancestry |
| sales_deliveries | Origin, destination, driver and verified event identities/times |
| sales_delivery_lines | Planned and separately verified actual quantities |
| sales_consumptions | Append-only exact reservation/posted-issue linkage |
| sales_operations | Append-only actor/payload-bound idempotency records |

The migration adds a unique customer-LPO identity for the composite FK, permission grants and PostgreSQL history/transition/link guards. It is forward-only to retain business history. Previous migrations and existing business tables/data are preserved.

New source: `backend/app/{models,schemas,services,api}/sales.py`, `frontend/components/sales-screen.tsx`, `frontend/app/(erp)/sales/page.tsx`, `backend/tests/test_sales.py`, `backend/tests/migrate_phase6a.py`, `frontend/scripts/verify-sales-browser.mjs`.

Integration changes: `backend/app/services/inventory.py` (linked hold/reversal protection and optional delivery source reference), `backend/app/services/master.py` (confirmed sales identity guard), `backend/app/models/master.py` (LPO composite identity), `backend/app/main.py`, `backend/alembic/env.py`, backend body limits, frontend proxy allowlist/body limit, navigation, scoped reference wrapping, test migration-head assertion and `scripts/Verify-AuthIntegration.ps1`. README, permissions and DBeaver inspection documentation are updated. No runtime dependency or lockfile change was required.

## API

All endpoints are under `/api/sales`, using existing session/CSRF/Origin protection and bounded request bodies.

| Method/path | Behavior |
| --- | --- |
| GET /orders | Paginated search/status/customer/project/outstanding filters |
| GET /orders/{id} | Lines, server availability, fulfillment, allocations, deliveries and amendments |
| POST /orders | Create demand, request key required |
| POST /orders/{id}/edit | Versioned draft quantity/date/priority/notes edit |
| POST /orders/{id}/confirm | Confirm validated original demand |
| POST /orders/{id}/amend | Versioned confirmed changes with snapshots |
| POST /orders/{id}/allocate | Reserve available stock at a selected warehouse |
| POST /orders/{id}/release | Release unused unclaimed allocations |
| POST /orders/{id}/prepare | Automatically allocate and prepare available stock |
| POST /orders/{id}/cancel | Cancel eligible demand and release its holds |
| GET /deliveries and /deliveries/{id} | Paginated history/detail |
| POST /deliveries/{id}/pick and /load | Record explicit physically verified actual quantities |
| POST /deliveries/{id}/dispatch | Atomically issue loaded stock and update progress |
| POST /deliveries/{id}/cancel | Cancel unposted preparation |
| POST /deliveries/{id}/reverse | Confirm physical return and create compensation |
| GET /availability/{item_id} | Usable quantities; optional warehouse/ordered quantity for exact shortage |
| GET /options | Permission-controlled existing customer/project/LPO/item/warehouse/driver references |

## Permissions and audit

| Capability | SUPER_ADMIN / OPERATIONS | SALES | PACKING | ACCOUNTS / MANAGEMENT | DRIVER |
| --- | --- | --- | --- | --- | --- |
| Read orders/availability | Yes | Yes | No | Yes | No |
| Create/edit/confirm/amend orders | Yes | Yes | No | No | No |
| Cancel orders / manage allocations | Yes | No | No | No | No |
| Read delivery records | Yes | Yes | Yes | Yes | No |
| Prepare/cancel preparation | Yes | No | No | No | No |
| Confirm picking/loading | Yes | No | Yes | No | No |
| Dispatch / reverse | Yes | No | No | No | No |

Underlying inventory create/release/consume/issue/reverse permissions are independently required. A driver reference grants no new privileges. Packing sees relevant delivery/source/destination information without order/customer administration. The full codes are documented in `PERMISSIONS.md`.

Every business action records its actor, target, UTC time, safe field names and reason in existing audit events within the transaction. Reservation and stock events retain their existing audit entries too. Commercial amendments retain full versioned snapshots separately. Denials retain existing rollback-and-audit behavior. Passwords, cookies and CSRF/session secrets are never part of business payload logging.

## Verification

The final backend run passed **171 tests** in 558.18 seconds: all 148 previous regressions plus 23 Phase 6A cases. The preflight run independently passed the original 148 tests before implementation. Tests use real, uniquely created PostgreSQL databases.

New cases cover the mandatory 15/8/7 workflow, multiple customers/projects/LPO relationships and invalid ownership, shortages, partial hold splitting with immutable original quantities, manual-hold preservation, release/retry safety, duplicate/conflicting request keys, multiline rollback, controlled amendments and stale versions, no over-reservation, actual-stage validation, cancellation, generic-route bypass rejection, physical reversal, ledger reconciliation, audit events, role boundaries, lot/serial preservation and blocked-lot exclusion.

Real PostgreSQL barrier tests use separate client/database transactions to race both identical-key and distinct-key dispatches. Identical retries both return successfully with one stock effect; independent dispatch attempts return one success and one controlled conflict. A separate simultaneous allocation test gives two orders 8 and 0 from the same available 8, never 16.

| Check | Result |
| --- | --- |
| Backend Phase 1-6A suite | PASS, 171 tests |
| Real PostgreSQL dispatch/allocation concurrency | PASS |
| TypeScript | PASS |
| ESLint | PASS, zero warnings |
| Isolated Next production build and start | PASS |
| Production authentication Chromium / live HTTP | PASS, 22 / 20 checks |
| Production master / inventory / purchasing Chromium | PASS, 30 / 32 / 37 checks |
| Production older-phase restart checks | PASS, 4 / 7 / 8 checks |
| Production Phase 6A / restart | PASS, 37 / 8 checks |
| Focused development Phase 6A / restart | PASS, 37 / 8 checks |
| Final complete development chain | PASS: authentication 24, live HTTP 20, master 30+4 restart, inventory 32+7 restart, purchasing 37+8 restart, sales 37+8 restart |
| Existing Next patch guards | PASS, 3 checks plus CJS and ESM Chromium regressions |
| Migration head / drift | PASS, 0007_sales_ops, no drift |
| Docker health | PASS, all three main services healthy |
| Existing-row preservation / main synthetic-data exclusion | PASS |

The new Chromium suite exercises actual forms for order creation, stock lookup, confirmation, preparation, blank actual inputs, picking/loading and dispatch. It confirms the same original demand progresses from 15 to 7 to 0, over-dispatch retries fail, Packing can measure without posting, Sales cannot dispatch, whole physical reversal reopens demand, allocations release safely, and the compensated demand can be fulfilled again. Refresh, repeated navigation to older modules, logout/login, fresh contexts, 390px mobile containment and service-restart persistence are checked. Desktop/mobile screenshots were visually inspected; tables scroll inside their panels and long document references wrap.

The final production new-workflow run recorded zero unexpected console warnings/errors, uncaught exceptions, React runtime errors or hydration warnings. Earlier authentication and duplicate-customer negative tests deliberately emit HTTP 401 and 409 resource diagnostics; their assertions remain enabled. Error reporting and the Next indicator are intact. Next 16.4.6 and React/React DOM 19.3.1 and the version-guarded CJS/ESM router patch remain unchanged.

The first combined development attempt flagged a React diagnostic in an older master-data assertion while source edits/Fast Refresh were still occurring. That assertion did not print its diagnostic payload. The verifier now emits credential-redacted diagnostics before failing. The complete clean development rerun passed every suite and restart check, including that master-data assertion, with no React runtime errors or hydration warnings. No framework cause is inferred from the initial assertion alone, and no error was suppressed.

Evidence is in ignored `artifacts/phase6a-pytest-final.log`, `phase6a-full-production.log`, `phase6a-full-development-final.log`, `phase6a-browser-development.log`, `phase6a-migration-verification.log` and `artifacts/phase6a/sales-desktop.png` / `sales-mobile.png`. Main counts after migration: users 1, sales orders 0, deliveries 0, stock movements 0, permission catalog 96. Original Phase 1-4 migration hashes match their accepted reports; `0005_purchasing` and `0006_workflow_guards` were not edited.

Reproduction commands from the project root:

```powershell
docker compose exec -T backend pytest -q --tb=short
docker compose exec -T backend alembic current
docker compose exec -T backend alembic check
docker compose exec -T frontend npm run typecheck
docker compose exec -T frontend npm run lint
powershell -NoProfile -File scripts/Verify-AuthIntegration.ps1 -Sales
powershell -NoProfile -File scripts/Verify-AuthIntegration.ps1 -Sales -Production
docker compose ps
```

`-Sales` includes all earlier authentication/master/inventory/purchasing browser suites. `-SalesOnly` is the focused new-workflow run. Both support `-Production`. The production harness builds/starts in separate Next/dependency volumes, preserving the running development cache. Generated credentials pass through stdin only. Every run uses its own scratch database and unpublished services; teardown removes only that run's fixtures. Restart checks retain the test database and use fresh Chromium contexts.

## Business assumptions and limits

Actual locations, units, opening quantities, item identities, destinations and physical verification remain business responsibilities. No company stock, route, distance, shipping charge or actual measurement is invented. Driver assignment prepares data for later work without claiming driver accountability or access.

Confirmed line identities are fixed; amendments change existing quantities/date/priority/notes. Allocation is automatic within a chosen warehouse and favors deterministic bucket order. Multiple lots/serials are shown explicitly; this phase does not implement expiry prioritization or a manual lot preference optimizer. Release operates on all unused allocations for an order, with open preparations protected. Packing/loading can record smaller actual quantities; unused stock remains allocated until reused or released.

Fulfillment is dispatch-based, not proof of customer receipt. Physical-return reversal is whole delivery and requires truthful attestation. Packing PDFs, scanners, routing/GPS, partial-return settlement, financial consequences and external messages are deferred. The conservative inventory gate and per-document queries need measured load testing before high-volume use. Local production-build verification does not constitute HTTPS deployment or disaster-recovery acceptance. The archive was decoded; no restore over the live database was attempted.

## Acceptance checklist

| Requirement | Status |
| --- | --- |
| Existing data, credentials, grants and migrations preserved | PASS |
| Real customer/project/LPO orders and controlled versioned changes | PASS |
| Live usable-stock availability and honest shortage handling | PASS |
| Linked partial allocations, history and safe release | PASS |
| Existing manual reservations and purchasing/production retained | PASS |
| Original-order partial deliveries and derived remaining backorder | PASS |
| Mandatory ordered 15 / dispatch 8 / receive 7 / dispatch 7 / completed | PASS |
| Physically verified picking and loading with blank actuals | PASS |
| Atomic dispatch, no duplicate stock effect or over-delivery | PASS |
| Exact compensating reversal and safe reopened demand | PASS |
| Existing driver reference and verified origin/destination preparation | PASS |
| Server-side roles, CSRF, sessions, audit and immutable references | PASS |
| Real PostgreSQL concurrency, lot/serial and ledger reconciliation | PASS |
| 171 backend tests including all previous regressions | PASS |
| TypeScript, ESLint, production build and Docker health | PASS |
| Development and production Chromium plus restart persistence | PASS |
| No Phase 6B/6C, reset, volume deletion, commit, push or deployment | PASS |

Phase 6A is technically acceptable within the documented business assumptions and limits. The common operations workflow, exact stock effects, original-order remaining demand, security, concurrency, prior-phase compatibility and persistence are verified. Business approval of real locations, opening transactions and physical procedures remains necessary before operational use. Phase 6B and Phase 6C have not started.
