# Driver assignment workflow

Open `/sales`, then a delivery's **Driver, route & item journey** panel. Operations can assign an existing active user with DRIVER role, optionally record planned departure, and enter a reason. Reassignment records the prior driver, new driver, revision, actor and timestamp. Existing Phase 6A optional driver references are preserved; use an explicit assignment event before route confirmation or arrival recording.

Select saved verified origin/destination pins. For missing coordinates, select **Verify new origin pin** or **Verify new destination pin**, choose the existing source record, enter the independently checked address and named latitude/longitude fields, and confirm the real position. Pin revisions are new immutable records. Matching numeric ranges cannot automatically detect two valid but reversed coordinates; the final position/order must be verified by the employee.

Click Calculate Route, review warnings and estimated distance/time, then Confirm route assignment. Confirmation binds the route revision and driver assignment. Reassignment makes the earlier confirmation require review. A destination correction requires a new pin/calculation, preserving prior snapshots. The operator must confirm the latest successful calculation and current assignment; an estimate older than 24 hours requires recalculation before confirmation.

Dispatch still uses Phase 6A's verified pick → load → dispatch actions. A route, assignment or planned departure does not dispatch stock. Routing failures do not prevent the existing dispatch workflow. An assigned driver's account must remain active and eligible when dispatch is posted.

Drivers open the same `/sales` path and see **My delivery assignments**, limited by FastAPI to currently assigned deliveries. A former driver loses access after reassignment. Drivers can read their delivery/route/items and explicitly confirm actual arrival followed by trip completion after dispatch. Current server timestamps record these human actions. Drivers cannot calculate routes, change endpoints/assignments, edit metrics, post stock, browse customer administration or see company item history.

ARRIVED and COMPLETED are separate trip evidence; original orders still fulfill at DISPATCHED. No timer establishes arrival. No live GPS, odometer distance, customer signature, electronic proof of delivery, traffic prediction or customer notification is implemented.

Packing can read relevant delivery routing and its delivery-scoped item journey. Sales can read delivery routing without managing physical actions. Management can review company item history. Actual stock returns always use Phase 6A's controlled compensating reversal. Arrival evidence remains historical if a later physical return occurs.
