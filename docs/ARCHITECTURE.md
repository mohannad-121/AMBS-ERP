# Architecture

## Runtime topology

The browser loads the Next.js App Router application at port 3000. A same-origin Backend-for-Frontend proxy forwards a restricted route set to FastAPI through `http://backend:8000`. Server components use a server-only API client with incoming cookies. The refresh button calls `/api/status`, which forwards to the authenticated FastAPI system-status endpoint. FastAPI connects to PostgreSQL through `db:5432`. Docker service names resolve on the project's bridge network.

Browser -> Next.js -> FastAPI -> PostgreSQL

Phase 3 adds authenticated master-data routes under `/api/master`, a business rules service, Pydantic schemas, relational master tables, and generic resource/detail screens under `/master/{resource}`. See `MASTER_DATA_DESIGN.md` for constraints and endpoint contracts. Approved images are stored in a private persistent backend volume; PostgreSQL stores their metadata. All business writes and audit events share a transaction and retain the existing security lock/CSRF/session rules.

The browser receives authorized data, connectivity results and UTC timestamps. Database credentials, the BFF transport key and the internal API address stay on the server. No CORS allowance is required. Requests use uncached results and bounded timeouts. Public service health endpoints preserve Phase 1 checks. Authenticated status depends on database-backed session verification. A failed refresh preserves the last results with an explicit stale-results message.

## Source boundaries

```text
frontend/
  app/                 App Router page, layout, styles, status component
    api/status/        Same-origin status endpoint
  lib/                 Server-only backend client
backend/
  app/
    api/               HTTP routers
    core/              Settings and structured logging
    db/                Engine and request-scoped sessions
    models/            SQLAlchemy declarative base and future models
    schemas/           Public response models
  alembic/             Versioned schema migrations
  tests/               Unit and database integration tests
docs/                  Setup, architecture, roadmap, validation
imports/               Future migration tooling
compose.yaml           Development orchestration
.env.example           Safe configuration template
```

`app/core/security.py` implements session, CSRF, password and authorization primitives. `app/services/users.py` contains account administration rules. API routers handle authentication, users, audit queries and system status. Each future business module should keep HTTP, business rules, persistence, and schemas clearly separated. Add repositories when persistence complexity warrants them.

## Persistence and transactions

SQLAlchemy 2 uses a bounded synchronous pool with pre-ping, connection recycling, a connection timeout, and a PostgreSQL statement timeout. FastAPI sync endpoints execute blocking database work in its thread pool. Sessions close after each request and roll back outstanding transactions on close. Future write operations must establish explicit transaction boundaries. Alembic is the schema authority. The initial revision creates only Alembic's own version table.

The pre-existing `ambs-erp_ambs_pg_data` volume is retained. The project name and volume key preserve that identity. Changing `.env` credentials alone does not modify credentials in an initialized PostgreSQL volume. The existing role password was rotated through PostgreSQL during setup and synchronized with `.env`.

## Security and operations

The three published ports bind to 127.0.0.1. The frontend and backend images run as unprivileged users. PostgreSQL follows its image's entrypoint privilege handling. Logs use JSON without connection strings, request bodies, query parameters, or raw exception messages. API errors return generic public messages. Settings validate environment and log level values. Database URLs use SQLAlchemy URL objects to safely encode passwords.

The development database role owns the database. Production must separate migration ownership from restricted runtime permissions. Production should use a reverse proxy with TLS, strong authentication, role-based permissions, audit logging, backups with restore testing, secret management, firewall restrictions, resource limits, and monitoring. Disable reload and bind mounts, build immutable images, run migrations once per release, and enable production mode. Production mode disables API docs and the OpenAPI route.

Local fonts are packaged with the frontend, allowing the UI to load without a Google Fonts connection. Inter and a restrained green/neutral palette are provisional branding choices pending company brand assets.

## Dependencies

Python dependencies are fully pinned with SHA-256 hashes in `backend/requirements.lock`. JavaScript dependencies are exact direct versions with a transitive `package-lock.json`. Containers provide Python 3.13 and Node.js 24 LTS. Base images follow maintained minor-family tags for development. Production releases should pin reviewed image digests and maintain a scheduled update process.

The lint configuration combines ESLint 10, TypeScript ESLint, Next.js core web vitals and React Hooks rules. TypeScript 6.0 is pinned within the TypeScript ESLint supported peer range.

## Security schema and consistency

Migration `0002_security` adds users, roles, permissions, user_roles, role_permissions, sessions, audit_events and login_rate_buckets. The baseline migration is preserved. Catalog grants are seeded by a frozen migration. The security migration is forward-only to retain accounts and audit history.

Session IDs and CSRF values are represented by one-way SHA-256 verifiers in PostgreSQL. Passwords use Argon2id. Idle/absolute expiration, activation and permission checks run on the backend. Login rotates the session. Role changes, password resets and deactivation revoke all affected sessions.

Security writes acquire a PostgreSQL advisory transaction lock before authenticating the mutation. This serializes privilege changes, first-admin provisioning and last-admin checks across workers. Account changes, assignments, revocations and success audit events commit atomically. Denials roll back pending changes and record a separate safe audit event. Login rate counters use independent transactions so invalid logins cannot roll back the limit.

See `AUTHENTICATION.md`, `PERMISSIONS.md` and `SECURITY.md` for the endpoint contract, matrix, transport trust boundary and production requirements.

A scoped npm override pins the TypeScript ESLint parser's minimatch dependency to 11.0.1 to address GHSA-g3hv-75wg-m249. Reassess this override when upstream adopts a patched compatible dependency. Lint and production builds validate the combined toolchain.

## Phase 4 inventory

Inventory uses the existing authentication/session/CSRF/RBAC dependencies, same-origin frontend proxy, audit tables and master item/unit identities. An immutable signed ledger and explicit reservations transactionally maintain item/location/lot balance caches. PostgreSQL advisory and row locks protect posting, serial identity, safe new buckets, count snapshots and allocation. Reconciliation independently checks the physical ledger and active holds. Quantities/costs use NUMERIC/Decimal and decimal-string APIs.

Revision `0004_inventory` follows `0003_master_data`, creates only inventory objects and adds reviewed grants without replacing earlier records. Receipts share the movement header/line model. The browser provides fourteen protected inventory views with server-authorized actions, configuration forms and explicit posting confirmations. There are no new runtime dependencies or changes to the Next.js compatibility patch. See [inventory architecture](INVENTORY_ARCHITECTURE.md), [rules](STOCK_MOVEMENT_RULES.md) and [permissions](INVENTORY_PERMISSIONS.md). Phase 5 extends purchasing/production integration below; customer orders and packing remain deferred.

## Phase 5 purchasing and external production

Phase 5 now implements purchasing and outsourced production through app/models, schemas, services and api/purchasing.py, protected Next purchasing pages and the existing BFF. Eighteen commercial/progress tables link to the existing ledger; there is no second stock balance system. Supplier-owned progress remains nonphysical to AMBS; EXTERNAL locations hold owned supplier custody and exclude dispatch allocation. Purchase receiving, progress claims, signed stock effects and audit share the existing transaction/locking boundary. New internal movement kinds are not exposed by the public arbitrary movement DTO.

Revision 0005_purchasing adds schema/grants and custody extensions. Forward revision 0006_workflow_guards prevents confirmed-state downgrade and permits cancelled quote drafts while enforcing one published successor. Original migration files are preserved. No new runtime dependency or Next patch change is needed. Requests, confirmed commercial snapshots, controlled amendments, exact receiving, ownership and indicative cost boundaries are described in PURCHASING_ARCHITECTURE.md and EXTERNAL_CUSTODY_RULES.md. Customer orders, packing, delivery and finance integrations remain future scope.


## Phase 6A customer fulfillment and Phase 6B routing

`0007_sales_ops` adds original customer demand, versioned amendments, linked reservation history, actual picking/loading, partial deliveries and exact consumption-to-issue links. Existing stock balances/ledger remain authoritative. Remaining demand derives from ordered quantity minus current net dispatched consumption.

`0008_delivery_routes` adds five append-only planning/evidence tables: routing_sites, delivery_driver_assignments, delivery_route_calculations, delivery_route_confirmations and delivery_trip_events. They link existing sales_deliveries and DRIVER identities. A narrow, event-validated extension to the existing delivery guard permits driver changes while retaining every prior stock transition check. The provider interface and all HTTP credentials stay in FastAPI. Route calculations share the conservative transaction gate for quota/idempotency checks and never call stock posting. Item journey is a projection over existing authoritative records.

The same `/sales` route gives drivers only current assignments and human arrival/completion controls, enforced again by FastAPI. Stock fulfillment remains dispatch-based. Routing is optional when ORS_API_KEY is absent. No public tile/geocoding dependency or Google integration is introduced. See ROUTING_PROVIDER_ARCHITECTURE.md, DELIVERY_ROUTE_RULES.md and ITEM_JOURNEY_DESIGN.md.


## Phase 6C presentation and operational reads

The shared design system, shell and all existing operational screens use centralized tokens and consistent table/form/dialog patterns. The root dashboard calls a single permission-filtered read endpoint; the original status panel moves to `/system`. The backend adds only `app/api/dashboard.py`: grouped Decimal stock/demand aggregates, bounded operational queues and audit-authorized activity. No migration or stock/business service changed. Driver metrics are scoped to current assignments. See [Frontend UX architecture](FRONTEND_UX_ARCHITECTURE.md), [Dashboard metrics](DASHBOARD_METRICS.md) and [Design system](AMBS_DESIGN_SYSTEM.md).
