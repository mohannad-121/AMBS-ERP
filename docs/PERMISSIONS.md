# Roles and permissions

Permissions are explicit resource/action records. Users can hold multiple roles, and effective access is the union of their assigned role permissions. Backend dependencies enforce access before executing endpoint operations. SUPER_ADMIN has explicit security grants and additional protections around administration of SUPER_ADMIN accounts.

## Security matrix (preserved from Phase 2)

| Permission | SUPER_ADMIN | OPERATIONS | SALES | ACCOUNTS | PACKING | MANAGEMENT | DRIVER |
| --- | --- | --- | --- | --- | --- | --- | --- |
| system.read | Yes | Yes | Yes | Yes | Yes | Yes | Yes |
| users.read | Yes | — | — | — | — | — | — |
| users.create | Yes | — | — | — | — | — | — |
| users.update | Yes | — | — | — | — | — | — |
| users.roles | Yes | — | — | — | — | — | — |
| users.reset_password | Yes | — | — | — | — | — | — |
| audit.read | Yes | — | — | — | — | — | — |
| Reserved business permissions | — | — | — | — | — | — | — |

All authenticated users can inspect their own account through `/api/auth/me` and sign out. A user without role grants receives no system-status permission. Phase 3 adds the business grants below while retaining all security grants.

## Phase 3 business matrix

| Resource/action | SUPER_ADMIN | OPERATIONS | SALES | ACCOUNTS | PACKING | MANAGEMENT | DRIVER |
| --- | --- | --- | --- | --- | --- | --- | --- |
| customers.read | Yes | Yes | Yes | Yes | No | Yes | No |
| projects.read | Yes | Yes | Yes | Yes | No | Yes | No |
| lpos.read | Yes | Yes | Yes | Yes | No | Yes | No |
| items.read | Yes | Yes | Yes | No | Yes | Yes | No |
| customers.create/update/archive | Yes | Yes | No | No | No | No | No |
| projects.create/update/archive | Yes | Yes | No | No | No | No | No |
| lpos.create/update | Yes | Yes | No | No | No | No | No |
| items.create/update/archive | Yes | Yes | No | No | No | No | No |
| categories.manage | Yes | Yes | No | No | No | No | No |
| units.manage | Yes | Yes | No | No | No | No | No |
| families.manage | Yes | Yes | No | No | No | No | No |
| images.manage | Yes | Yes | No | No | No | No | No |

Categories, units and family definitions can be read with items.read or the corresponding manage permission. Approved image retrieval requires items.read. Variant creation/edit/archive uses item permissions, because every variant is an independent item UUID/SKU. Archive permissions also govern reactivation. LPO closure/cancellation uses lpos.update; no LPO activation route exists.

At the end of Phase 3 the catalog had 45 permissions: 7 existing security permissions, 19 implemented business permissions and 19 still-reserved future permissions. Phase 3 reused 9 pre-existing business permission records and added 10. All earlier permission IDs, role assignments and security grants were preserved. Existing accounts gain only the new grants for roles they already hold; sessions are not revoked during migrations. Effective permissions are loaded from PostgreSQL on each request.

Operations owns business master-data maintenance but gains no users.*, audit.read or other security authority. Sales is read-only for customer/project/LPO/product references. Accounts reads customer/project/LPO references without product administration. Packing reads products and their supporting definitions/images. Management has read-only oversight. Driver receives no business master-data permissions. These are conservative initial policies requiring business sign-off; changing them requires a reviewed policy migration. Multi-role users receive the union.

Phase 4 activates inventory.read and adds 18 explicit inventory permissions, bringing that phase's catalog to 63. SUPER_ADMIN and OPERATIONS receive inventory actions, SALES/PACKING read quantity information, ACCOUNTS/MANAGEMENT read quantity and indicative cost information, and DRIVER receives no inventory access. The earlier inventory.adjust remains reserved. See [the inventory matrix](INVENTORY_PERMISSIONS.md). Phase 5 supplier/purchasing activation is described below; legacy purchase_orders.*, sales_orders.*, packing_lists.*, deliveries.* and reports.* remain reserved for their reviewed integrations.

## Phase 5 purchasing and production

0005_purchasing activates the existing suppliers.read/create/update identities and adds 20 permissions, bringing the catalog to 83. It defines 23 active supplier/purchasing/production codes. Earlier grants/IDs are retained; legacy purchase_orders.* permissions are not silently treated as the new purchasing.orders.* authority. Operations gains no users.* or audit.read authority. Multi-role unions remain unchanged.

| Permission group | SUPER_ADMIN | OPERATIONS | SALES | ACCOUNTS | PACKING | MANAGEMENT | DRIVER |
| --- | --- | --- | --- | --- | --- | --- | --- |
| suppliers.read | Yes | Yes | No | Yes | No | Yes | No |
| suppliers.create / update / archive | Yes | Yes | No | No | No | No | No |
| suppliers.prices.read | Yes | Yes | No | Yes | No | Yes | No |
| suppliers.prices.manage | Yes | Yes | No | No | No | No | No |
| purchasing.requests.read | Yes | Yes | No | Yes | No | Yes | No |
| purchasing.requests.create / manage | Yes | Yes | No | No | No | No | No |
| purchasing.orders.read | Yes | Yes | Yes | Yes | No | Yes | No |
| purchasing.orders.create / confirm / close | Yes | Yes | No | No | No | No | No |
| purchasing.receipts.create / post | Yes | Yes | No | No | No | No | No |
| production.read | Yes | Yes | Yes | Yes | Yes | Yes | No |
| production.create / manage / stages.update / transfers.post | Yes | Yes | No | No | No | No | No |
| production.costs.read | Yes | Yes | No | Yes | No | Yes | No |
| production.costs.manage / convert | Yes | Yes | No | No | No | No | No |

Physical purchase receipt additionally requires inventory.receipts.post. Owned custody posting requires inventory.transfers.post; nonusable dispositions additionally require inventory.quality.manage. Whole stock receipt reversal retains inventory.movements.reverse. Measured conversion requires inventory.adjustments.post. External location registration/edit also requires inventory.locations.manage. Price, production-cost and stock-cost fields remain separate read authorities, enforced recursively in backend responses. Supplier-only reporting does not grant production-cost history, and production readiness does not grant purchasing or security administration. No frontend button authorizes a mutation.

## Existing security administration rules

- Assigning roles requires users.roles, including when creating an account or updating details and roles together.
- Granting SUPER_ADMIN and modifying an existing SUPER_ADMIN account also require the actor to hold SUPER_ADMIN. Delegated permissions alone cannot escalate into that role.
- Deactivation or role removal cannot remove the last active SUPER_ADMIN. A PostgreSQL advisory transaction lock serializes security mutations and first-admin provisioning across API workers.
- Role changes, deactivation and password reset revoke the affected user's sessions in the same transaction as the account change and audit event.
- Duplicate usernames/emails fail with a generic conflict. A failed combined account/role update rolls back the account change, role assignments and session revocations.
- Future business modules must enforce both resource/action access and ownership or scope restrictions on the backend. Navigation visibility provides usability feedback.


## Phase 6A orders and dispatch

| Permission | SUPER_ADMIN | OPERATIONS | SALES | ACCOUNTS | PACKING | MANAGEMENT | DRIVER |
| --- | --- | --- | --- | --- | --- | --- | --- |
| sales.orders.read | Yes | Yes | Yes | Yes | No | Yes | No |
| sales.orders.create / update / confirm / amend | Yes | Yes | Yes | No | No | No | No |
| sales.orders.cancel | Yes | Yes | No | No | No | No | No |
| sales.allocations.manage | Yes | Yes | No | No | No | No | No |
| sales.deliveries.read | Yes | Yes | Yes | Yes | Yes | Yes | No |
| sales.deliveries.prepare | Yes | Yes | No | No | No | No | No |
| sales.deliveries.pick / load | Yes | Yes | No | No | Yes | No | No |
| sales.deliveries.dispatch / reverse | Yes | Yes | No | No | No | No | No |

Allocation also requires inventory.reservations.create; release requires inventory.reservations.release. Dispatch requires inventory.reservations.consume and inventory.issues.post. Splitting a hold additionally requires reservation create/release. Reversal requires inventory.movements.reverse. Existing Operations grants already satisfy these permissions. Packing receives delivery quantities and source/destination information without order/customer administration, stock posting or financial permissions. Assignment to a delivery does not grant a driver access. Existing sessions resolve effective permissions from the database; no credential reset is needed.


## Phase 6B driver, routing and item journey grants

| Capability | SUPER_ADMIN / OPERATIONS | MANAGEMENT | SALES / PACKING | ACCOUNTS | DRIVER |
| --- | --- | --- | --- | --- | --- |
| drivers.read, routes.read, deliveries.trip.read | Yes | Yes | Delivery route/trip read | Delivery route/trip read | Assigned only via deliveries.trip.own |
| drivers.assign, routes.locations.manage | Yes | No | No | No | No |
| routes.calculate / confirm / recalculate | Yes | No | No | No | No |
| deliveries.trip.update | Yes | No | No | No | Own current assignments only |
| items.trace.read | Yes | Yes | Selected delivery only | No | No |
| items.trace.company | Yes | Yes | No | No | No |

`deliveries.trip.own` is granted to DRIVER and SUPER_ADMIN. The normal route-read permission covers delivery route/trip review; drivers instead pass an explicit current-driver ownership check for every detail and trip mutation. The driver list used for assignments is available only to routing managers. Current assignments never authorize customer administration or stock posting. Driver role/active status is revalidated at assignment, route confirmation and physical dispatch. Assigned drivers cannot submit distance/estimate fields: strict input schemas reject them. Existing stock permissions remain independently required for dispatch and reversal.

Transport cost/basis fields in route reads require existing inventory.costs.read; other route readers receive no financial basis. Assignment, reassignment, verified-site creation, calculation/revision, confirmation, trip status and permission denials use the existing audit table. API keys and raw provider responses are excluded.

## Phase 7 document, BOM and planning grants

| Capability | SUPER_ADMIN | OPERATIONS | MANAGEMENT | PACKING | SALES | DRIVER | ACCOUNTS |
| --- | --- | --- | --- | --- | --- | --- | --- |
| packing.read / download | Yes | Yes | Yes | Yes | Yes | Current assigned delivery only | No |
| packing.company | Yes | Yes | Yes | Yes | Yes | No | No |
| packing.prepare | Yes | Yes | No | Yes | No | No | No |
| packing.issue / void | Yes | Yes | No | No | No | No | No |
| bom.read | Yes | Yes | Yes | No | No | No | No |
| bom.create / edit | Yes | Yes | No | No | No | No | No |
| bom.approve | Yes | No | Yes | No | No | No | No |
| bom.archive | Yes | Yes | Yes | No | No | No | No |
| material_plans.read / calculate / review | Yes | Yes | Yes | No | No | No | No |

Calculation independently requires sales.orders.read or production.read for the chosen source. Incoming purchase quantities require purchasing.orders.read and contain no price fields. Driver access is scoped before any document metadata/bytes are returned; a guessed unrelated ID returns generic 404. Existing reserved Phase 2 packing_lists.* permission names are preserved and do not implicitly grant these capabilities. Successful actions and permission/ownership denials use the existing audit table; no credential, CSRF or role administration policy is weakened.
