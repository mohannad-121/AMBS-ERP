# Operational dashboard metrics

`GET /api/dashboard` is authenticated, uncached and read-only for business data. Authentication may update session last-seen as before. The endpoint uses grouped SQL aggregates, scalar counts and bounded queues; it does not materialize all item views or perform per-item service queries. Recent queues contain at most five rows, audit activity at most six. Each refresh obtains a new response; `as_of` is the UTC request time, not a claim of a cross-table historical snapshot. Normal transaction isolation applies.

## Visibility and definitions

| Section | Required existing permission | Definition |
| --- | --- | --- |
| Entire endpoint | system.read | Authenticated workspace access |
| Orders to fulfill | sales.orders.read | CONFIRMED or PARTIALLY_DISPATCHED sales orders |
| Outstanding demand | sales.orders.read | Sum of original line quantity minus actual consumption linked to currently DISPATCHED deliveries, for those open orders; grouped by unit UUID |
| Pending deliveries | sales.deliveries.read | DRAFT, PICKED or LOADED deliveries |
| My pending deliveries | deliveries.trip.own without global delivery read | The same pending states restricted to current driver_id |
| Delivery preparation queue | sales.deliveries.read | Up to five pending deliveries |
| My assignments queue | deliveries.trip.own without global delivery read | Up to five assigned deliveries excluding CANCELLED/REVERSED, including dispatched history; not a claim that an already arrived trip is active |
| Open purchase orders | purchasing.orders.read | CONFIRMED or PARTIALLY_RECEIVED purchase orders |
| Overdue supplier receipts | purchasing.orders.read | Those open POs with expected_on earlier than the server date |
| Active production | production.read | Production orders in ACTIVE status |
| Overdue production | production.read | ACTIVE orders with expected_finish earlier than the server date |
| Low-stock items | inventory.read | Distinct items below at least one configured warehouse/location threshold, using allocatable availability over that threshold's complete scope |
| Active customers/projects | corresponding resource.read | is_active business records |
| Recent activity | audit.read | Actual action, actor username and event UTC timestamp; no audit details payload |

There are no revenue, growth, currency, route ETA or travel-distance KPIs. Route estimates, provider failures and actual arrival evidence remain in the authorized delivery panel. No metric is fabricated when unavailable. Authorized empty sections display real zeros or a descriptive empty state; unauthorized sections are omitted.

## Stock quantities

StockBalance is the existing ledger projection, not a new inventory balance. Aggregates group by the item's unit UUID; display uses Unit.decimal_places. Different units are never added into a single quantity.

- **On-hand** sums all stock buckets, including external custody and non-usable stock.
- **Reserved** sums existing reservations in those buckets.
- **Available** sums on_hand minus reserved only for active items, active USABLE locations, active warehouses and absent or active/unblocked lots. This matches the stock engine's allocatable predicate.
- **Non-usable** sums buckets that fail that predicate, excluding EXTERNAL locations. This includes blocked lots and inactive operational entities, not just damaged/quarantined stock.
- **External custody** sums on-hand in EXTERNAL locations. It is excluded from availability and from the non-usable subtotal.

These are overlapping views of stock and must not be added together. A reservation is not a physical movement. No unit cost, stock value or supplier price is returned.

## Precision and motion

Counts are strings of integers; quantities are PostgreSQL Decimal strings. The client uses BigInt fixed-point arithmetic for count-up and exact final formatting. The browser regression creates a real isolated confirmed demand of `99999999999999.123456` in a six-decimal unit, avoiding JavaScript Number conversion. Large values wrap without truncation. Document IDs and timestamps never animate.

KPI animations run once on first viewport entry and settle exactly after 1,400ms. A manual refresh loads a new snapshot and starts its counters once; hover and small scroll changes do not reset them. Reduced motion presents final values directly. Screen readers receive the final truthful number, not every frame.
