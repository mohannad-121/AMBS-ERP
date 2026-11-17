# DBeaver Community setup

## Connection details

| Field | Local value |
| --- | --- |
| Connection type | PostgreSQL |
| Host | `127.0.0.1` |
| Port | `5433` |
| Database | `ambs_erp` |
| Username | `ambs_dev`, or `POSTGRES_USER` in `.env` |
| Password | `POSTGRES_PASSWORD` from the repository-root `.env` |

Keep the password private. It is intentionally absent from this guide. The database is published only on localhost. The Docker hostname `db` is used by containers, while DBeaver on Windows uses `127.0.0.1`.

## Create the connection

1. Start the stack with `docker compose up -d --build --wait`.
2. In DBeaver choose **Database -> New Database Connection** or the new-connection toolbar button.
3. Select **PostgreSQL**, then **Next**.
4. Enter the values above in the Main tab. Enter the password from `.env` without sharing it in screenshots. Give the connection a clear local-development name.
5. Choose **Test Connection**. If DBeaver requests PostgreSQL JDBC driver files, choose **Download** and wait for installation. Internet access may be needed for this first driver download.
6. Confirm the connection succeeds, then choose **Finish**.

## Inspect the foundation

Expand the connection in Database Navigator, then **Databases -> ambs_erp -> Schemas -> public -> Tables**. Some DBeaver versions show Schemas directly below the connection. Refresh with F5 after applying migrations.

After `docker compose exec backend alembic upgrade head`, `public.alembic_version`, security tables and Phase 3 master tables should be present.

Right-click the connection and choose **SQL Editor -> New SQL Script**. Execute the selected query with Ctrl+Enter.

```sql
SELECT current_database(), current_user, version();
SELECT 1 AS connection_ok;
SELECT version_num FROM public.alembic_version;
```

The database should be `ambs_erp`, the user should match `.env`, `connection_ok` should be 1, and `version_num` should be `0003_master_data`.

Use Alembic migrations for schema changes. DBeaver is suitable for inspection and reviewed read-only queries during this phase.

## Troubleshooting

- Connection refused means the service or published port is unavailable. Check `docker compose ps` and `Test-NetConnection 127.0.0.1 -Port 5433`.
- Authentication failure usually means the password differs from the initialized volume's database role. Confirm the current local `.env` and see the credential guidance in `LOCAL_SETUP.md`.
- Missing tables may mean migrations have not run or the navigator needs refreshing.
- Driver download failures require access to the driver repository or a manually supplied PostgreSQL JDBC driver from an approved source.

Host connectivity is validated separately from DBeaver. No DBeaver GUI connection is claimed to have been created during automated setup.

## Phase 2 security inspection

Refresh the connection with F5, then expand Schemas -> public -> Tables. Inspect users, roles, permissions, user_roles, role_permissions, sessions, audit_events and login_rate_buckets. Double-click a table and choose its Properties tab to inspect columns and foreign keys. Use read-only SQL queries for normal inspection.

```sql
SELECT version_num FROM public.alembic_version;
SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename;
SELECT code, description FROM public.roles ORDER BY code;
SELECT code, description FROM public.permissions ORDER BY code;
SELECT username, display_name, is_active, created_at, updated_at FROM public.users ORDER BY username;
SELECT r.code AS role, p.code AS permission
FROM public.role_permissions rp
JOIN public.roles r ON r.id = rp.role_id
JOIN public.permissions p ON p.id = rp.permission_id
ORDER BY r.code, p.code;
SELECT id, user_id, created_at, last_seen_at, expires_at, revoked_at
FROM public.sessions ORDER BY created_at DESC LIMIT 20;
SELECT actor_username, action, target_type, target_id, occurred_at, details
FROM public.audit_events ORDER BY occurred_at DESC LIMIT 20;
```

The catalog contains seven roles and 45 permissions after Phase 3. The queries deliberately select safe account/session fields. Avoid exporting password hashes or session verifiers. Apply schema changes with Alembic and manage accounts through the API/UI or the initial provisioning CLI.

## Phase 3 read-only inspection

Refresh with F5 and inspect `customers`, `projects`, `customer_lpos`, `product_categories`, `units`, `product_families`, `items`, `item_images` and `legacy_references`. Use the ER diagram to inspect foreign keys, including the composite project/customer LPO constraint. Existing master tables may be empty: synthetic acceptance data is isolated and removed.

```sql
SELECT c.code, c.name, p.code AS project_code, p.name AS project_name,
       l.number AS customer_lpo_number
FROM customers c
LEFT JOIN projects p ON p.customer_id=c.id
LEFT JOIN customer_lpos l ON l.customer_id=c.id AND l.project_id=p.id
ORDER BY c.code,p.code,l.number;
SELECT i.code,i.name,i.item_type,f.name AS family,i.attributes,u.name AS unit,
       i.is_active FROM items i
LEFT JOIN product_families f ON f.id=i.family_id
JOIN units u ON u.id=i.unit_id ORDER BY i.code;
SELECT item_id,mime_type,byte_size,width,height,updated_at FROM item_images;
```

Do not edit business tables through DBeaver. Use the authorized UI/API to preserve validation and audit records. Image bytes reside in the persistent Docker volume, not PostgreSQL.

## Phase 4 inventory inspection

Use the existing connection: host 127.0.0.1, port 5433, database ambs_erp; obtain credentials from the local gitignored environment configuration. Refresh the public schema after migration 0004_inventory. No DBeaver GUI action was performed by the automated verification.

Inspect warehouses, storage_locations, stock_balances, stock_movements, stock_movement_lines, stock_ledger_effects, stock_reservations, inventory_counts, inventory_count_lines, stock_lots, inventory_item_policies and stock_thresholds. The following examples are read-only:

```sql
BEGIN READ ONLY;
SELECT code,name,is_active,is_default FROM warehouses ORDER BY code;
SELECT l.code,l.name,l.kind,w.name AS warehouse,l.parent_id
FROM storage_locations l JOIN warehouses w ON w.id=l.warehouse_id;
SELECT i.code,i.name,l.name AS location,b.lot_id,b.on_hand,b.reserved,
       b.on_hand-b.reserved AS unreserved_physical
FROM stock_balances b JOIN items i ON i.id=b.item_id
JOIN storage_locations l ON l.id=b.location_id;
-- Unreserved physical is not automatically allocatable: inactive/blocked/
-- nonusable buckets have zero API availability. Use the business API for that.
SELECT code,kind,status,occurred_at,created_by,posted_by,reason,reverses_id
FROM stock_movements ORDER BY created_at DESC LIMIT 100;
SELECT code,balance_id,quantity,status,created_by,created_at,released_at
FROM stock_reservations ORDER BY created_at DESC LIMIT 100;
SELECT code,location_id,status,counted_by,posted_by,movement_id FROM inventory_counts;
SELECT c.code,l.expected_quantity,l.counted_quantity,
       l.counted_quantity-l.expected_quantity AS variance,l.reason
FROM inventory_count_lines l JOIN inventory_counts c ON c.id=l.count_id;
SELECT code,item_id,identifier,is_serial,status FROM stock_lots;
SELECT item_id,warehouse_id,location_id,minimum FROM stock_thresholds;
SELECT b.id,b.on_hand,COALESCE(sum(e.quantity_delta),0) AS ledger_on_hand
FROM stock_balances b LEFT JOIN stock_ledger_effects e ON e.balance_id=b.id
GROUP BY b.id HAVING b.on_hand<>COALESCE(sum(e.quantity_delta),0);
ROLLBACK;
```

An empty reconciliation result means the displayed physical caches agree with the ledger. The authenticated reconciliation API also checks active reservation totals. Do not repair discrepancies with UPDATE/DELETE/INSERT in DBeaver: use a reviewed business correction through the authorized API and retain the audit trail. Cost columns are sensitive; database access bypasses application field redaction and must remain restricted to authorized staff. This phase does not provision separate DBeaver roles.

## Phase 5 purchasing and production inspection

Refresh the same local connection (127.0.0.1:5433, ambs_erp, credentials from ignored .env) after upgrading through 0006_workflow_guards. No GUI actions are claimed. Inspect suppliers/contacts/materials, supplier_quotations/lines, purchase_requests/lines, purchase_orders/lines, purchase_receipts/lines, production_orders/stages/events/costs/conversions, supplier_schedule_updates and purchasing_import_keys. EXTERNAL storage_locations reference their verified supplier.

```sql
BEGIN READ ONLY;
SELECT code,name,types,is_active FROM suppliers ORDER BY code;
SELECT s.name AS supplier,m.item_id,m.unit_id,m.minimum_quantity,
       m.reported_available,m.verified_on
FROM supplier_materials m JOIN suppliers s ON s.id=m.supplier_id;
SELECT q.code,s.name,q.reference,q.quoted_on,q.valid_until,q.currency,q.status,
       l.item_id,l.line_type,l.quantity,l.unit_price
FROM supplier_quotations q JOIN suppliers s ON s.id=q.supplier_id
JOIN supplier_quotation_lines l ON l.quotation_id=q.id;
SELECT o.code,o.status,l.description,l.quantity,
       COALESCE(r.received,0) AS received,
       l.quantity-COALESCE(r.received,0) AS unreceived_physical
FROM purchase_orders o JOIN purchase_order_lines l ON l.order_id=o.id
LEFT JOIN (
  SELECT rl.order_line_id,SUM(rl.quantity) AS received
  FROM purchase_receipt_lines rl JOIN purchase_receipts r ON r.id=rl.receipt_id
  WHERE r.status='POSTED' GROUP BY rl.order_line_id
) r ON r.order_line_id=l.id;
-- Unreceived on CLOSED orders is a closed remainder, not open incoming.
SELECT r.code,r.status,r.order_id,r.movement_id,r.received_at,r.posted_by,
       l.order_line_id,l.quantity,l.location_id,l.lot_id,l.movement_line_id
FROM purchase_receipts r JOIN purchase_receipt_lines l ON l.receipt_id=r.id;
SELECT p.code,p.status,p.ownership,p.item_id,p.quantity,s.sequence,s.name,
       s.supplier_id,s.location_id,s.expected_on
FROM production_orders p JOIN production_stages s ON s.order_id=p.id
ORDER BY p.code,s.sequence;
SELECT stage_id,kind,quantity,destination_stage_id,movement_id,receipt_id,
       lot_id,actor_id,created_at,reason FROM production_events ORDER BY created_at;
SELECT l.name,l.kind,l.supplier_id,b.item_id,b.lot_id,b.on_hand,b.reserved
FROM storage_locations l JOIN stock_balances b ON b.location_id=l.id
WHERE l.kind='EXTERNAL';
SELECT order_id,stage_id,confirmed_on,eta,created_at,evidence,reason
FROM supplier_schedule_updates ORDER BY created_at;
SELECT order_id,amount,currency,reference,reason FROM production_costs;
SELECT approved_reference,input_movement_id,output_movement_id,reason
FROM production_conversions;
ROLLBACK;
```

Progress quantities across repeated stages are not separate owned stock. Use the API stage view for entered/completed/ready/current custody and the inventory reconciliation endpoint for ledger/holds. Never edit confirmed document status back to DRAFT or manually repair stock/custody through SQL. Sensitive prices/costs are visible to a database owner regardless of UI redaction; restrict access accordingly. Source mappings/dry runs do not authorize live Odoo or historical imports.


## Phase 6A read-only fulfillment inspection

Use the existing connection; never edit balances or posted business history in DBeaver.

```sql
SELECT code, customer_id, status, version, requested_date FROM sales_orders ORDER BY created_at DESC;
SELECT order_id, item_id, quantity, unit_id FROM sales_order_lines;
SELECT code, order_id, warehouse_id, destination, driver_id, status, dispatched_at FROM sales_deliveries ORDER BY created_at DESC;
SELECT delivery_line_id, quantity, reservation_id, movement_id FROM sales_consumptions;
SELECT line_id, quantity, current_reservation_id FROM sales_allocations;
SELECT order_id, version, created_by, created_at, reason FROM sales_amendments;
```

Backorders are derived from original ordered quantities minus consumption on deliveries whose current status is DISPATCHED. REVERSED deliveries retain history and their compensating movement references in the existing stock ledger. They do not count as fulfilled demand. No separate backorder demand or stock ledger exists.


## Phase 6B read-only route and trip inspection

```sql
SELECT id, source_kind, source_id, label, latitude, longitude, verified_by, verified_at FROM routing_sites ORDER BY verified_at DESC;
SELECT delivery_id, revision, driver_id, previous_driver_id, planned_departure, actor_id, reason FROM delivery_driver_assignments ORDER BY created_at;
SELECT delivery_id, revision, provider, profile, status, distance_meters, duration_seconds, warnings, provider_timestamp FROM delivery_route_calculations ORDER BY created_at;
SELECT delivery_id, calculation_id, assignment_id, actor_id, created_at FROM delivery_route_confirmations;
SELECT delivery_id, assignment_id, status, occurred_at, actor_id FROM delivery_trip_events ORDER BY occurred_at;
```

These are append-only business histories; do not update rows or stock quantities in DBeaver. Route estimates are not actual kilometers, customer receipt or live traffic. API keys are never database records. Reassignment/recalculation uses reviewed API/UI actions and preserves prior snapshots.
