# Outsourced production workflow

A production order records an item/variant, planned quantity, ownership, explicit instructions, optional dates/documents, optional related PO line and an ordered route of supplier stages. Stages have independent suppliers, optional agreed dates and owned-stock custody locations. Names are flexible: fabrication, powder coating, galvanizing or other genuinely recorded processes. No coating/galvanizing sequence is inserted automatically. A single-stage galvanizing route is valid.

Plans are editable with optimistic versions only while DRAFT. Stage routes become immutable on start. States are DRAFT, ACTIVE, COMPLETED, CANCELLED; cancellation is permitted only before work starts. No unrecorded supplier dates are inferred. Actual completion requires all planned quantity to reach the yard through authorized events, not a supplier ETA.

## Quantity model

Each stage has append-only START/COMPLETE/TRANSFER/YARD events, with positive Decimal quantity, actor, reason, lot, timestamp and unique operation key/hash. START applies only to the first planned stage, bounded by unstarted plan quantity. COMPLETE is bounded by quantity actually entered and not yet completed. TRANSFER is bounded by completed quantity not already sent/received and advances only to the next planned stage. YARD applies only to the final stage's ready quantity. Partial operations are permitted. Lot-specific checks prevent using one batch's progress for another; serial operations remain individual one-piece identities.

- Entered = first-stage START + transfers arriving from the prior stage.
- In process = entered − completed.
- Ready = completed − forwarded − received at yard.
- Current stage custody = entered − forwarded − received at yard.
- Order outstanding = planned − actual yard quantity.

These are progress/custody claims over the same goods, not independent physical stock balances. Do not sum completion counts across stages as company stock. Inventory remains authoritative for owned physical quantities.

Every stage's subtotals are calculated in one SQL statement, giving concurrent progress reads a consistent PostgreSQL snapshot. Supplier-owned plans allocate only the unreceived purchase quantity. A line assigned to such a plan receives through its final-stage yard action; ordinary receipt creation/posting, including previously created drafts, is blocked while that plan is open. Use separate PO lines for mixed direct/production receiving. PO details link the production reference. Owned plans may reference historically received/closed purchase lines without creating a new acquisition.

Example: start100 at fabrication; complete60; forward60 to coating; complete45 there; receive45 at yard. Fabrication retains40 in process, coating retains15, yard receives45. There are100 goods, not205. The purchase obligation's unreceived remainder is55 when those goods were supplier-owned before arrival.

## Ownership and receiving

SUPPLIER plans require a real open confirmed PO stock line for the same item; production plans cannot overallocate that line. Planned/supplier-held quantities are not AMBS inventory. Yard arrival creates an actual linked purchase receipt using the existing receiving engine, checks PO outstanding under lock and updates progress/stock once. A direct purchase receipt and production arrival cannot receive the same outstanding quantity twice.

AMBS plans reference actual owned input stock. Every owned stage uses a verified EXTERNAL supplier location. Starting from another location posts a custody transfer; already-owned stock at the same stage location can be claimed only if not allocated to another plan. Supplier-to-supplier and yard transfers preserve company on-hand. Active claims protect external stock from duplicate plan allocation, unlinked conversion, reversal or a negative count correction that would strand production claims. Quality authority is additionally required when a custody transfer touches quarantine/damaged/rejected stock.

## Explicit transformation and corrections

`POST /conversions` consumes explicitly measured, unallocated owned inputs and posts explicitly measured outputs atomically. It requires production.convert, inventory.adjustments.post, reason and an approved reference. All inputs/outputs retain item/unit/lot/location/movement traceability. No BOM, yield, automatic substitution or cost distribution is inferred. Different units are not arithmetically subtracted as a fabricated variance; measured quantities and the approval reference are retained for review. Output valuation remains incomplete pending approved allocation. Active production claims must first be resolved; conversion cannot consume them.

Started route/ownership/plan quantities cannot be silently changed. The system intentionally rejects cancellation of started work and reversal of production-linked movement history. Short receipts remain outstanding; damaged/rejected actual arrivals can be received to their explicit nonusable disposition. Supplier credits, production-loss accounting, arbitrary stage undo, partial returns and financial rework settlement are not invented. A genuine loss/incorrect production event requires reviewed reconciliation rather than bypassing custody protection or directly editing tables. See PHASE_5_REPORT.md for this operational limitation.

Processing charges and corrections retain supplier/currency/reference/actor/reason, remain pending allocation, and do not change inventory value automatically. Completion dates and cost estimates never establish physical stock.
