# Delivery roadmap

## 1. Environment and infrastructure

Containerized Next.js, FastAPI and PostgreSQL, locked dependencies, health checks, migrations, tests, local status UI, developer setup and database inspection. Acceptance requires real running-service validation and preserved existing storage.

## 2. Authentication, authorization and audit logging

Implement real user identities, secure sessions, password policy, account lifecycle, role and permission enforcement, and audit records for sensitive operations. Verify server-side authorization and session expiry before expanding access.

Phase 2 implements the security schema, authentication, user/role assignment administration, audit viewer and protected shell. The first administrator is provisioned manually. Automated acceptance results and outstanding browser checks are recorded in `PHASE_2_REPORT.md`. Business module development remains Phase 3 onward.

## 3. Customers, projects, LPO and item master

Define customer and project records, local purchase orders, item identifiers, units and validation rules. Establish approved schema, relationships, search, duplicate handling and master-data permissions.

Phase 3 implementation and executed acceptance results are recorded in `PHASE_3_REPORT.md`. Customer LPOs remain distinct from AMBS supplier purchase orders. Family variants are independent items; approved images use private persistent storage. No inventory/order/packing workflow is included. Phase 4 requires a separate instruction and approved stock-ledger design.

## 4. Inventory and stock movement management

Implement warehouses, stock ledgers, receipts, issues, adjustments and transfers. Define transaction boundaries and concurrency controls. Verify reconciliation and historical traceability.

Phase 4 implements the immutable ledger, explicit holds, warehouse/location references, counts, thresholds, quality handling, lot/serial traceability and indicative costing. See `PHASE_4_REPORT.md` for executed acceptance results and `INVENTORY_ARCHITECTURE.md` for integration boundaries. No real opening balances or locations are seeded. Phase 5 extensions are described below.

## 5. Purchasing and outsourced production

Implement suppliers, purchasing workflow, outsourced production orders, material handoff and receipts. Link costs and inventory movements with approval and audit requirements.

Phase 5 implements suppliers/contacts/catalog, immutable quotations and explainable comparison, requests/POs, partial receiving, configurable production routes, external custody, measured conversions and in-app schedule/delay visibility. Executed verification and operational limitations are recorded in PHASE_5_REPORT.md. No suppliers or opening quantities are automatically seeded. Phase 6 has not started and requires a separate instruction.

## 6. Orders, partial delivery and backorder management

Implement order lifecycle, allocations, partial fulfilment, outstanding quantities and backorders. Validate concurrent allocation, cancellation and stock consistency.

## 7. Packing formulas, PDF documents and approvals

Implement approved packing calculations, document numbering, reproducible PDF outputs, approval workflow and controlled document revisions. Verify calculations against business-approved cases.

## 8. Finance, reporting and operational dashboards

Define finance boundaries with stakeholders, operational metrics, reconciliation, reporting and exports. Enforce financial permissions, traceable calculations and report accuracy.

## 9. Data migration, integration and acceptance testing

Prepare repeatable imports, validation, reconciliation and rollback procedures using approved source access. Build integrations only after source-system approval. Run stakeholder acceptance testing, performance checks and migration rehearsals. Access to the current Odoo instance is a future dependency to confirm.

## 10. Drivers and delivery tracking

Implement driver assignment, delivery progress, proof of delivery and mobile browser workflows after operational prerequisites are accepted. Define location-data permissions and retention if tracking is requested. Driver functionality remains deferred until this phase.

## 11. On-premise production deployment and monitoring

Prepare Linux server capacity, internal DNS, TLS reverse proxy, firewall rules, production image builds, digest pinning, least-privilege database roles, secrets and release migrations. Establish backup schedules, off-host backup retention, recovery objectives and restore drills. Configure logs, metrics, alerts, incident response, patching and release rollback. Verify Windows, macOS and mobile browser access over the internal network. Obtain deployment and acceptance sign-off before company-wide use.


## Accepted scope updates: 6A and 6B

The later owner-aligned Phase 6A request implements original customer orders, partial deliveries/backorders and automatic ledger-linked fulfillment. Phase 6B implements verified endpoint/driver assignments, ORS planning estimates, route revision history, restricted driver trip evidence and derived item journey. These replace the earlier assumption that all driver assignments wait until Phase 10. Live GPS, vehicle-specific routing, electronic customer proof of delivery and broader transport/accountability remain deferred. No Phase 6C redesign or deployment has started. Current technical acceptance and live-provider verification status are in PHASE_6B_REPORT.md.


## Phase 6C: unified interface and operational dashboard

The separately requested Phase 6C covers the shared premium AMBS visual system, grouped responsive shell, exact animated live counters and the presentation of all implemented modules. It does not implement finance, PDF documents, GPS tracking, new business workflows or deployment. Existing Phase 6A/6B actions and security rules remain authoritative. See [Phase 6C report](PHASE_6C_REPORT.md) for actual verification and acceptance status.
