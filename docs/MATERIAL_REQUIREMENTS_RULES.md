# Material requirement rules

## Demand and arithmetic

A plan selects exactly one actual confirmed/open sales order or ACTIVE production order, optionally scoped to one existing warehouse. Sales demand is line quantity minus actually posted dispatch consumption. Production uses its full active target with an explicit basis note; supplier stage progress is not treated as a receipt or inferred raw-material consumption.

Only an effective APPROVED BOM with active, matching item units is eligible. Missing/unapproved/inapplicable specifications produce AWAITING_APPROVED_BOM with an explicit unknown requirement. Known other components may still be shown, but an incomplete plan cannot be reviewed as authoritative.

For each source demand: demand * component quantity / defined BOM output quantity. Multiply by (1 + explicitly configured allowance / 100) only when that allowance exists. Server Decimal arithmetic uses precision 60. Shared materials are summed before rounding upward once to the component unit's decimal_places (0-6). Stored results use Numeric(20,6); overflow fails. No unit conversion is assumed, no floating-point business totals or executable formulas are used. Maximum 50 demand lines and 80 distinct components bound calculation work.

## Availability and procurement

Existing inventory allocatable/available predicates are authoritative. Usable AMBS-owned on-hand, active reserved quantity and available usable quantity are separate. External supplier custody and blocked/inactive/non-usable stock are separate unavailable values. Shortage = max(0, requirement - current available usable quantity). Reservations are never added back to this plan's availability.

Expected incoming is the unreceived balance of confirmed/partially received supplier stock purchase lines. It is independently permissioned and is never included in on-hand or available stock. A posted partial receipt changes stock only through the existing inventory ledger. Supplier-owned production-stage quantities remain outside owned stock. Statuses distinguish available, partially available, shortage and awaiting approved BOM; shortage rows also indicate awaiting receipt or procurement review and expose blocked/external quantities.

## Evidence and boundaries

Each calculation creates an immutable source, approved-BOM and stock snapshot with preparer, timestamp, reason and input signature. Recalculation creates a new linked plan; it cannot rewrite the old result. Detail reads compare current source status/quantities, applicable BOM versions, unit definitions, available/reserved/blocked/external stock and incoming receipts to flag staleness. Review requires a complete, current snapshot and an authorized actor/reason.

Plans do not create purchase orders, reservations, issues, receipts, production completions or delivery events. Staff navigate to the existing separately authorized purchasing/production workflows. Item and source links, plus authorized Item Journey references, connect evidence without duplicating the physical movement history.
