# Purchasing and Phase 4 inventory integration

The stock ledger, balance cache, holds, Decimal precision, serial/lot enforcement, row locks, weighted-average methodology and reconciliation service remain authoritative. Phase 5 adds commercial receipt links and progress events, not another balance system.

## Atomic receipt boundary

1. Authenticate with the existing session/Origin/CSRF/JSON controls and require purchasing.receipts.post.
2. Acquire the shared inventory transaction lock and lock the receipt/order/line identities.
3. Reject closed orders, wrong receiving warehouse/item/lot/unit, future actual dates, invalid precision and cumulative over-receipt, including duplicate lines in one body.
4. Stock lines require inventory.receipts.post and generate one private PURCHASE_RECEIPT movement with exact line links. Existing posting creates all signed effects and cached quantity/value updates atomically.
5. Service lines accept quantities without creating a stock movement or item.
6. Mark the commercial receipt posted, derive PO progress and append audit in the same transaction. Commit once. Any failure rolls back every business/stock/audit mutation.

Create keys compare canonical request hashes. Reposting the same receipt with the same post key returns its original result; a different key cannot repost it. A repeated reversal with its original reverse key is also safe. No automatic retry may replace its key to bypass the business boundary. The database additionally protects posted receipt/line history and requires complete stock linkage.

When 10 units remain and two employees simultaneously post 8 each, authoritative locks permit one 8 and reject the other; exactly 2 remain. Concurrent retries of one posting return one physical effect, and concurrent production completion cannot exceed entered quantities. These are verified against real PostgreSQL, not mocks.

## Reversals and quality

Whole purchase-receipt reversal compensates the original ledger and restores purchase outstanding atomically. It cannot create negative available stock, consume active holds or remove external stock claimed by production. Generic inventory reversal rejects purchasing/production-linked movements, so it cannot leave PO totals stale. Closed PO reversal retains the closed remainder rather than silently reopening a commercial obligation. Production-linked yard receipts are protected from standalone reversal because their stage history must also be reconciled. Partial returns/financial credits and arbitrary stage undo are not silently simulated.

Actual acquired goods may be recorded to USABLE, QUARANTINE, DAMAGED or REJECTED disposition. Goods not acquired/accepted as AMBS-owned must not be posted as owned stock. Service charges themselves have no item or on-hand quantity. Quarantine inspection rules remain Phase 4 authority.

## Costs and visibility

Confirmed PO unit prices are the receiving cost basis. Costs move through the same Phase 4 weighted-average buckets, including external transfers, without recosting history or adding a second acquisition. Missing/unallocated costs remain explicit. Freight, taxes and processing costs are shown separately and not automatically capitalized. Known quoted-versus-confirmed unit differences are displayed only for a uniquely matching quantity/unit/currency line. No FX, invoice reconciliation, accounting journal or supplier payment is claimed.

`/inventory/overview` now returns real confirmed incoming quantities and actual entered external work, grouped by unit and ownership. A location filter excludes PO obligations whose future bin is not yet recorded. In-production uses current stage custody, not the sum of repeated stage completions. Neither metric adds physical availability; a single good may appear in both commercial incoming and production progress. `/inventory/balances?view=available` remains the allocation boundary, and `/inventory/reconciliation` independently verifies ledger and active holds without repairing discrepancies.

Future Phase 6 order allocation must reuse the existing hold/availability service. This phase does not create customer orders, sales backorders, dispatch completion or packing documents.
