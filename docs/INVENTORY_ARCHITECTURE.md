# Inventory architecture — Phase 4

Inventory extends the existing FastAPI/SQLAlchemy/PostgreSQL security and master-data architecture. Each Phase 3 item UUID is an independently identified variant. No editable quantity is added to `items`. No real stock, warehouses, addresses, suppliers or orders are seeded.

## Tables and relationships

| Table | Purpose |
| --- | --- |
| warehouses | UUID, immutable generated code, name, address, description, activation, default, creator and timestamps |
| storage_locations | Warehouse-owned hierarchical locations; USABLE, QUARANTINE, DAMAGED or REJECTED |
| inventory_item_policies | Item tracking mode NONE, LOT or SERIAL |
| stock_lots | Item-owned registered lot/serial identity and ACTIVE/BLOCKED status |
| stock_movements | Draft/posted/reversed/cancelled headers, actor, reason, physical timestamp, source reference and idempotency metadata |
| stock_movement_lines | Item, unit, quantity, source/destination, lot and optional cost |
| stock_balances | Transactional item/location/lot cache, on-hand, reserved, physical version and operational value |
| stock_ledger_effects | Append-only signed physical and value effects linked to movement lines and balance buckets |
| stock_reservations | Explicit internal holds with identity, actor, reason, reference and closure history |
| inventory_counts | Location-scoped snapshot/count/review/post lifecycle and resulting movement |
| inventory_count_lines | Bucket snapshot quantity/version, measured quantity and explanation |
| stock_thresholds | Item/warehouse or item/warehouse/location minimum stock |

Foreign keys retain historical references. Composite keys enforce lot/item and location/warehouse ownership. NULLS NOT DISTINCT uniqueness permits exactly one untracked bucket per item/location and one warehouse-wide threshold per item/warehouse. Location cycle checks run in the service and database. At most one active warehouse is the configured default. Historical locations cannot change usability; nonempty locations/warehouses and stocked items cannot be archived. Unit and variant identity/precision become fixed after inventory activity.

Manual goods receipts are `stock_movements(kind=RECEIPT)` and their lines, rather than a redundant receipt table. Receipt number is the movement code. The source reference records a known supplier/document reference without inventing a purchase order. Returns use RETURN and quarantine.

## Quantities and availability

On-hand is the sum of signed ledger effects. Reserved is the sum of ACTIVE holds. Cached values are updated in the same transaction as the ledger, reservation and audit events. Ordinary availability is on-hand minus reserved only for active items, active warehouses/locations, USABLE locations and ACTIVE lots. All other buckets have zero allocatable availability. Zero-available items remain in management/reports and appear out of stock, but `/balances?view=available` excludes them. Physical stock held entirely by reservations is distinct from physically empty stock.

All quantities use PostgreSQL NUMERIC(20,6) and Python Decimal; unit precision is enforced. Operational monetary values use NUMERIC(30,12), Decimal and half-even rounding. The browser transports/displays decimal strings without calculating stock. Totals are grouped by unit UUID; currencies are never combined. Phase 5 now supplies incoming quantities from open confirmed POs and current external work from recorded stage custody, grouped by unit/ownership. These supported metrics can overlap and must not be added together; neither establishes physical availability. Unconfirmed future quantities are not invented. Location-filtered incoming is empty when the eventual receiving bin is not known.

`GET /api/inventory/balances` supports view=all/available/low/out_of_stock/nonusable, item/variant UUID, lot, warehouse/location, category, family, type, text search, sort, direction and pagination. `requested_quantity` adds nonnegative shortage against allocatable stock. Example: physical=8, available=8, request=15 produces shortage=7; it creates no sales order/backorder. Future order/packing services must reuse this engine and its transactional reservation operation.

## Transactions, concurrency and retries

All mutations authenticate and validate Origin, JSON and CSRF through the existing dependency. Security lock 7140284201 remains unchanged. Inventory takes PostgreSQL transaction advisory lock 7140284202, then row locks affected buckets in deterministic order. This deliberately conservative cross-worker gate also serializes metadata, serial identity and count/reversal operations. It is appropriate to the current small team; higher throughput needs measured tuning rather than removal of locks. Bucket insert uses ON CONFLICT against its database uniqueness constraint, including null lot identities.

All lines post atomically. Insufficient unreserved stock aborts the whole transaction, including new buckets, ledger and audit. Unique UUID create/post/close keys protect retries. Creates additionally compare a canonical request hash; changed payloads with reused create keys fail. Repeating the same posting key returns the original result; a new posting key on an already posted movement fails. Never generate a fresh key merely because the response was lost. Draft edits use optimistic versions. Database checks disallow negative on-hand/reserved or reserved greater than on-hand. Triggers protect posted headers/lines, append-only effects and closed reservation/count history.

`GET /api/inventory/reconciliation` independently compares cached on-hand with ledger SUM and cached reserved with ACTIVE reservation SUM. It reports discrepancies without repairing or concealing them. Do not edit inventory tables through DBeaver; route mutations through the API. Reconcile before imports and after recovery.

## Reservations and counts

Reservation ACTIVE transitions exactly once to RELEASED, CANCELLED or CONSUMED. Release/cancel restore availability without changing physical stock. Consume requires issue-post and consume permissions, removes the entire hold and posts one genuine ISSUE atomically. Partial consumption and order-specific triggers are deferred. Reversal of a consumed issue restores physical stock without reactivating its closed hold.

Counts snapshot explicitly selected item/lot buckets and physical versions at one location, up to 30 lines. DRAFT → IN_PROGRESS/REVIEW → POSTED; open sessions may be cancelled. Recording requires fresh physical measurements and line reasons. Posting requires both counts.post and adjustments.post, compares current versions and rejects stale snapshots. Recount refreshes snapshots and clears measurements. Nonzero variance creates a signed COUNT_ADJUSTMENT movement; zero variance posts the count without a fictitious zero movement. Reservations are still protected from a negative adjustment. No mandatory second approver is invented.

## Traceability, quality and costing

LOT requires an item-owned lot on every affected line; SERIAL requires an integer-precision unit, quantity one (count zero/one), globally unique serial identifier and no more than one physical unit across locations. Tracking cannot change after activity/registration. Lot trace shows original receipts, movements, quantities and locations. BLOCKED lots stop allocation; blocking a reserved lot requires releasing holds first.

Returns enter quarantine. Damage and quarantine transfers retain company-wide physical quantity but make it unavailable. Explicit authorized inspection release moves it back to USABLE. Rejected stock remains traceable; no replacement order, credit, certificate or supplier action is invented.

Weighted-average cost is per item/location/lot bucket in posting order. Receipts add confirmed quantity × cost; outgoing movements use that bucket's current average; transfers carry source cost. Missing costs or incomparable currencies mark the bucket incomplete instead of inventing a value. Full depletion resets the empty bucket. Dashboard values show known-cost stock separately by currency with incomplete-bucket counts. Backdated physical timestamps do not replay historical costing. Reversals compensate exact original effects; a reversal that would create negative known value fails for operational review. This is indicative operational valuation requiring business approval, not an approved accounting policy, FIFO, FX conversion, journal, VAT or financial statement.

## API surface

All paths below are under `/api/inventory`; the frontend proxy applies the same allowlist and a 64 KiB JSON limit.

- GET balances, overview, reconciliation; GET options/{items,warehouses,locations,lots}.
- GET/POST warehouses and locations; PUT warehouses/{id}, locations/{id}.
- GET/PUT policies/{item_id}; POST lots; PUT lots/{id}/status; GET lots/{id}/trace.
- GET records/{movements,reservations,counts,lots,thresholds}: pagination, search, sorting and applicable status/kind/item/location/warehouse filters.
- POST movements; GET/PUT movements/{id}; POST movements/{id}/{post,reverse,cancel}.
- POST reservations; GET reservations/{id}; POST reservations/{id}/{release,cancel,consume}.
- POST counts; GET counts/{id}; POST counts/{id}/record; POST counts/{id}/{start,recount,post,cancel}.
- PUT thresholds: upsert a minimum for its exact scope. In-app alerts recalculate from real availability without sending external notifications.

Writes commit audit events and mutations together. Audit includes actor, action and target; movement/count/reservation business reasons remain in their records, and closure/lot-status reasons are explicitly audited. Cost fields and internal request hashes/keys are removed from unauthorized API responses recursively. No passwords, session tokens or confidential credential payloads enter inventory logging.

Read queries currently assemble matching rows before server-side pagination. This is a documented scaling boundary; add measured SQL aggregation/index improvements before large-scale imports. No integration may bypass the posting engine.

## Phase 5 custody and business posting extensions

0005_purchasing adds EXTERNAL locations with supplier identity, plus private PURCHASE_RECEIPT, CUSTODY_TRANSFER, PRODUCTION_INPUT and PRODUCTION_OUTPUT movement kinds. Public arbitrary movement DTOs do not accept them. Existing location/movement kinds and all earlier migrations remain intact. Owned external on-hand stays in the same ledger/cache and is exposed as external_on_hand; availability is zero there. Quality/nonusable totals exclude external custody so it is not mislabeled as damage or quarantine.

Purchase/production links prevent generic reversals from leaving their commercial/progress history stale. Active owned stage claims protect exact item/location/lot custody against duplicate starts, unlinked conversion or negative corrections. Authorized production events change claims and physical effects atomically. Supplier-owned work has no AMBS physical balance until actual acquisition. Count/version/reservation/reconciliation behavior remains intact. See PURCHASING_INVENTORY_INTEGRATION.md and EXTERNAL_CUSTODY_RULES.md. 0006_workflow_guards additionally hardens confirmed commercial transitions; it changes no inventory balance or costing methodology.
