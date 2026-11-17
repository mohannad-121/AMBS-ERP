# Delivery route rules

- Existing sales deliveries are reused; routing never creates a delivery or stock movement.
- Origin pins reference the delivery's warehouse or actual source location. Destination pins must reference its customer, project or the delivery itself. Arbitrary other-customer endpoints are rejected.
- Coordinates are numeric, range-checked and named explicitly. Provider requests order coordinates longitude then latitude. No coordinates are inferred from an address.
- Only Operations/SUPER_ADMIN manage assignments, pins, calculations, confirmations and trip evidence. Drivers may record actual trip events only for their current assignments. All unsafe endpoints retain session/CSRF/Origin protection.
- Only active users carrying DRIVER role are eligible. Driver change is allowed only while no arrival evidence exists and the delivery is not cancelled/reversed. It creates a revision and requires a reason; no user is automatically provisioned.
- Verified sites, assignments, calculation results, route confirmations and trip events are append-only in PostgreSQL. Failed calculations remain in history with no distance/time/geometry. Confirmed routes are never overwritten.
- Route confirmation requires the latest successful calculation, current assignment, verified ownership and explicit warning review. Reassignment or later recalculation makes an old confirmation historical. The 24-hour confirmation freshness rule is an AMBS planning safeguard, not a provider cache entitlement.
- Local quota/cooldown, bounded socket timeout, no redirects and no automatic retries bound provider usage. Repeated reads and React renders make no provider calls. Idempotent same-key retries do not consume quota twice after a committed result.
- Calculated distance/duration are authoritative planning estimates from provider results; there are no editable kilometer inputs. Actual distance travelled is unknown without separate evidence.
- Driving-car is not a truck-compliance guarantee or live traffic-aware ETA. Warnings must remain visible. The SVG road line is a preview without a basemap; no public tile dependency is silently added.
- ARRIVED must be explicitly recorded after DISPATCHED. COMPLETED requires ARRIVED. These are human trip timestamps and do not alter stock fulfillment or prove customer acceptance.
- Route/assignment failure never changes stock. Dispatch issues loaded quantities exactly once through the original reservation engine. Physical return uses the existing exact compensating reversal.
- An optional approved tariff can price a new estimate on the backend. No default rate, customer charge, invoice or accounting entry is created.

See ROUTING_PROVIDER_ARCHITECTURE.md for provider license, attribution, retained fields, local quotas and operational limitations. No Google integration, paid maps, GPS or Phase 6C redesign is included.
