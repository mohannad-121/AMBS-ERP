# AMBS Internal ERP

Internal ERP foundation, security administration, master data, transactional inventory, purchasing and outsourced production for AM Building Solutions, UAE.

## Start locally

Install and start Docker Desktop with Linux containers. Copy `.env.example` to `.env` for a fresh checkout and replace the example password with a unique random value. This workspace already has a configured local `.env`.

```powershell
docker compose config --quiet
docker compose up -d --build --wait
docker compose exec backend alembic upgrade head
# Run manually in an interactive terminal, once per fresh database.
docker compose exec backend python -m app.cli provision-admin
```

Open http://127.0.0.1:3000 to sign in. The authenticated workspace contains system status, business master data, user administration and audit history according to backend permissions. Development API documentation is at http://127.0.0.1:8000/docs. PostgreSQL listens on 127.0.0.1:5433.

```powershell
docker compose stop
docker compose start --wait
```

`docker compose down` removes the project's containers and network while retaining named volumes. Never add `--volumes` when preserving local data.

## Documentation

- [Local setup and troubleshooting](docs/LOCAL_SETUP.md)
- [Architecture](docs/ARCHITECTURE.md)
- [DBeaver connection guide](docs/DBEAVER_SETUP.md)
- [Delivery roadmap](docs/PHASES.md)
- [Authentication and administrator provisioning](docs/AUTHENTICATION.md)
- [Roles and permission matrix](docs/PERMISSIONS.md)
- [Security configuration and testing](docs/SECURITY.md)
- [Phase 2 acceptance report](docs/PHASE_2_REPORT.md)
- [React runtime investigation and compatibility patch](docs/REACT_RUNTIME_REPORT.md)
- [Master-data design and API contract](docs/MASTER_DATA_DESIGN.md)
- [Data import strategy](docs/DATA_IMPORT_STRATEGY.md)
- [Phase 3 acceptance report](docs/PHASE_3_REPORT.md)
- [Inventory architecture and API](docs/INVENTORY_ARCHITECTURE.md)
- [Stock movement rules](docs/STOCK_MOVEMENT_RULES.md)
- [Inventory permissions](docs/INVENTORY_PERMISSIONS.md)
- [Inventory regression scenarios](docs/INVENTORY_TEST_SCENARIOS.md)
- [Phase 4 acceptance report](docs/PHASE_4_REPORT.md)
- [Supplier management and price comparison](docs/SUPPLIER_MANAGEMENT.md)
- [Purchasing architecture and API](docs/PURCHASING_ARCHITECTURE.md)
- [Outsourced production workflow](docs/PRODUCTION_WORKFLOW.md)
- [External custody rules](docs/EXTERNAL_CUSTODY_RULES.md)
- [Purchasing/inventory integration](docs/PURCHASING_INVENTORY_INTEGRATION.md)
- [Phase 5 regression scenarios](docs/PHASE_5_TEST_SCENARIOS.md)
- [Phase 5 acceptance report](docs/PHASE_5_REPORT.md)

## Validation

```powershell
docker compose exec backend pytest -q
docker compose exec backend alembic current
docker compose exec backend alembic check
docker compose exec frontend npm run lint
docker compose exec frontend npm run typecheck
powershell -NoProfile -File scripts/Verify-AuthIntegration.ps1
powershell -NoProfile -File scripts/Verify-AuthIntegration.ps1 -Browser
powershell -NoProfile -File scripts/Verify-AuthIntegration.ps1 -Browser -Production
powershell -NoProfile -File scripts/Verify-AuthIntegration.ps1 -MasterData
powershell -NoProfile -File scripts/Verify-AuthIntegration.ps1 -MasterData -Production
powershell -NoProfile -File scripts/Verify-AuthIntegration.ps1 -Inventory
powershell -NoProfile -File scripts/Verify-AuthIntegration.ps1 -Inventory -Production
powershell -NoProfile -File scripts/Verify-AuthIntegration.ps1 -Purchasing
powershell -NoProfile -File scripts/Verify-AuthIntegration.ps1 -Purchasing -Production
powershell -NoProfile -File scripts/Verify-AuthIntegration.ps1 -Sales
powershell -NoProfile -File scripts/Verify-AuthIntegration.ps1 -Sales -Production
```

Use an isolated frontend container for production-build validation so the running development server keeps its own `.next` files.

The browser runs use generated administrators in temporary databases. They include the installed Next router Suspense regression and never require the real administrator's credentials. `npm ci` applies the version-guarded Next 16.4.6 compatibility patch; review that patch when changing Next versions.

```powershell
docker compose run --rm --no-deps --volume /app/.next --volume /app/node_modules frontend sh -c "npm ci --no-audit --no-fund && npm run build && npm run typecheck"
```

## Scope

Implemented scope includes infrastructure, PostgreSQL sessions, Argon2id authentication, RBAC, security/business auditing, master data/private images, immutable inventory, explicit holds/counts/traceability, suppliers/quotes/comparison, purchase requests/orders/receiving and outsourced production/custody. Business navigation follows backend permissions. Customer sales orders, reservations, picking/loading, partial deliveries, derived backorders and compensating dispatch reversals are available at `/sales`. See `docs/PHASE_6A_REPORT.md`. Packing PDFs, live driver tracking and accounting journals remain outside scope. Existing administrators must not be reprovisioned. Published ports remain loopback-only. Live deployment still requires HTTPS and the operational work described in the security guide/roadmap.

The Phase 6A migration head was `0007_sales_ops`, after `0006_workflow_guards`, `0005_purchasing` and all preserved earlier revisions. Review migrations and back up the database before upgrades. Preserve and back up `ambs-erp_ambs_item_images` with PostgreSQL. Tests create synthetic records only in isolated databases/storage. No Excel/Odoo import or external supplier message runs automatically.


## Phase 6B routing and drivers

Delivery panels at `/sales` now support verified endpoint pins, driver assignment/reassignment, backend ORS driving estimates and warnings, immutable confirmed route revisions, restricted driver assignments/arrival recording and a read-only item journey. No GPS, live traffic, Google billing or Phase 6C redesign is included. Routing is NOT_CONFIGURED until the optional backend `ORS_API_KEY` is privately entered in ignored `.env`; no key is required for other operations. See [local ORS setup](docs/ORS_LOCAL_SETUP.md) and [Phase 6B report](docs/PHASE_6B_REPORT.md).

Current migration head: `0008_delivery_routes`, after the preserved `0007_sales_ops`. Use reviewed backups before upgrades.

```powershell
powershell -NoProfile -File scripts/Verify-AuthIntegration.ps1 -Routing
powershell -NoProfile -File scripts/Verify-AuthIntegration.ps1 -Routing -Production
```

The harness uses mocked routing HTTP responses in private temporary databases, never live ORS or real administrator credentials. `-RoutingOnly` selects the focused routing/restart checks.


## Private source and verified recovery

The source repository is `mohannad-121/AMBS-ERP`, PRIVATE. Source control excludes real configuration, databases, uploads, backups and runtime artifacts. [Backup and recovery](docs/BACKUP_AND_RECOVERY.md) covers encrypted local configuration and the verified database restore rehearsal. The execution evidence and repository verification are recorded in [GitHub backup setup report](docs/GITHUB_BACKUP_SETUP_REPORT.md). GitHub is source storage, not a replacement for database/private-file backups.
