# Item journey design

`GET /api/routing/deliveries/{delivery_id}/journey/{item_id}?lot_id={optional}&page=1` is a read-only, paginated projection of authoritative existing records. It writes no events, quantities or audit ledger and exposes no cost fields. The selected item must be on the selected delivery; a supplied lot/serial must belong to that item and its allocated source history.

Sources:

| Source | Displayed evidence |
| --- | --- |
| stock_ledger_effects + movement/line/balance | Posted receipts, issues/dispatches, transfers, owned custody/production, returns, count adjustments and compensating reversals |
| purchasing receipts / production events and stages | Linked PO/receipt, production and supplier references; nonphysical supplier-owned stage events are labelled as not owned stock |
| stock_reservations + sales reservation ancestry | Created holds and actual release/cancellation timestamps, including split history |
| sales delivery lines/header | Actual picked/loaded quantities, actors and times |
| posted inventory count lines | Actual recorded counted quantity, actor/time and count reference |

Stock movements carry signed location deltas; a transfer appears at its actual source and destination. Posted movement originals and reversals remain historical evidence. Historical unit/item identity is protected by existing confirmed inventory/sales rules. Provider route estimates and trip statuses are not inventory events.

SUPER_ADMIN, Operations and Management have company-scope item tracing. Packing and Sales can trace only the selected delivery's own holds, picked/loaded quantities and stock issues; they do not receive unrelated receipt/customer/company histories. Drivers have no journey endpoint permission and see only items on their assigned delivery. Permission checks occur on FastAPI, not just hidden controls.

Each result shows event kind, timestamp, actual actor where recorded, exact quantity/unit, location, reference, source table, lot/serial ID and supported document links. If a reservation closing actor is not stored in the source record, it is shown as not recorded rather than attributing the action to its creator. Existing audits remain the authority for action actors where needed.

A serial-filtered journey can represent an individual tracked piece. Bulk and lot histories explicitly state that individual-piece identity is not established. Nothing infers a unit-by-unit journey from aggregate quantities.

The projection currently collects and sorts matching source events before returning pages of 100. It is appropriate for the existing small-team system; measured large-volume use needs SQL-side union/pagination optimization. This phase adds no analytics event warehouse or second stock ledger. The read path shares the existing conservative transaction gate for consistent snapshots.
