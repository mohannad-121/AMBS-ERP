# Local development

## Prerequisites

Use Docker Desktop in Linux-container mode with Compose v2, Git, and an editor. DBeaver Community is optional. No host Python or Node installation is required. On Linux use Docker Engine and Compose v2. Run all commands from the repository root.

The original Windows inspection found Python 3.14 and 3.11 registered with `py`, and a Miniconda Python on PATH. Python 3.13 was absent from launcher registrations. Containers provide the required Python 3.13 runtime without changing the Windows installations.

## Environment

For a fresh checkout copy `.env.example` to `.env` and replace `POSTGRES_PASSWORD` with a unique random password. `.env` is excluded from Git. In the initial workspace this file was generated during setup and the existing database role synchronized with its generated password.

| Variable | Purpose |
| --- | --- |
| POSTGRES_DB | Local database name, `ambs_erp` |
| POSTGRES_USER | Local development database owner, `ambs_dev` |
| POSTGRES_PASSWORD | Local secret, stored only in `.env` |
| APP_ENV | `development`, `test`, or `production` |
| LOG_LEVEL | Standard uppercase logging level |

Compose supplies `POSTGRES_HOST=db` and `POSTGRES_PORT=5432` to FastAPI and `INTERNAL_API_URL=http://backend:8000` to Next.js. Host applications use port 5433. Keep the internal API variable server-only.

## Lifecycle

```powershell
docker compose config --quiet
docker compose up -d --build --wait
docker compose exec backend alembic upgrade head
docker compose ps
docker compose logs --tail 100 backend frontend
```

Use `docker compose config --quiet` to validate without printing resolved credentials. Startup waits for database health and then backend availability. Migrations are explicit so failures remain visible and concurrent reload workers cannot run schema changes.

```powershell
docker compose stop
docker compose start --wait
docker compose down
```

All three commands preserve the PostgreSQL volume. Avoid volume pruning and `down --volumes`. Named frontend volumes hold Linux dependencies and the development build cache. Frontend startup runs `npm ci` to reconcile the mounted dependency volume with the lockfile. Backend dependency changes require rebuilding its image.

## Endpoints and tests

```powershell
Invoke-RestMethod http://127.0.0.1:8000/api/health
Invoke-RestMethod http://127.0.0.1:8000/api/health/db
Invoke-RestMethod http://127.0.0.1:3000/api/health
Test-NetConnection 127.0.0.1 -Port 5433
docker compose exec backend pytest -q
docker compose exec backend pytest -q -m "not integration"
docker compose exec frontend npm run lint
docker compose exec frontend npm run typecheck
docker compose run --rm --no-deps --volume /app/.next --volume /app/node_modules frontend sh -c "npm ci --no-audit --no-fund && npm run build && npm run typecheck"
```

The Phase 1 integration test executes an actual `SELECT 1` against the configured PostgreSQL instance. Security integration tests create uniquely named temporary databases, apply the migration chain, exercise authentication/authorization and remove only those temporary databases. The configured development role needs database-creation privileges for this test suite. Run tests against the development stack. Public health endpoints remain available, while `/api/status` requires a signed-in session.

## Migrations

```powershell
docker compose exec backend alembic current
docker compose exec backend alembic history
docker compose exec backend alembic upgrade head
docker compose exec backend alembic check
# After implementing and importing real model modules in alembic/env.py
docker compose exec backend alembic revision --autogenerate -m "describe schema change"
```

Review generated operations before applying them. Use Alembic for all schema changes. Back up real data and assess rollback safety before downgrades. Baseline `0001_foundation` creates no business tables.

## Dependency updates

After reviewing `requirements.in`, regenerate the lock inside Python 3.13 with `uv pip compile requirements.in --generate-hashes -o requirements.lock` using an ephemeral container, then rebuild the backend and run tests. For JavaScript, update dependencies inside the frontend container with exact versions and regenerate `package-lock.json`, then run lint, types, build, and connectivity checks. Review security advisories as part of updates.

## Troubleshooting

- If Docker is unreachable, start Docker Desktop and verify `docker version` and `docker context show`. The project expects Linux containers.
- If a port is occupied, inspect `Get-NetTCPConnection -State Listen` on Windows and `docker ps`. The existing AMBS PostgreSQL service legitimately owns 5433. Resolve unrelated conflicts before starting.
- If PostgreSQL rejects credentials after changing `.env`, the initialized volume retains its previous role password. Restore the matching `.env` or deliberately rotate the role password through a local authenticated administrator connection. Never reset the volume to fix credentials.
- If the frontend reports unavailable services, check `docker compose ps` and backend logs, then call both health endpoints. A healthy API with an unavailable database indicates a persistence connectivity problem.
- If Windows file changes are missed, polling is enabled for both backend and frontend. The frontend uses webpack for predictable bind-mount watching.
- If Docker cannot write a bind mount, enable project drive access in Docker Desktop and confirm the project is accessible. Linux hosts may need project ownership aligned with container users.
- If build and development caches conflict, use the isolated production-build command above. Stop the development frontend before running a production server on its published port.

## Future on-premise deployment

Use the Phase 11 hardening checklist in `PHASES.md` and the production requirements in `SECURITY.md`. Development Compose binds only to loopback and uses reload servers. A production release requires immutable built images, trusted TLS ingress, restricted database roles, backups, monitoring and restore drills.

## Phase 2 setup and administration

The current local `.env` was extended with authentication settings and a generated BFF secret. Existing database credentials were preserved. For a fresh checkout, configure every field in `.env.example`, including a unique random BFF secret and exact allowed origins.

```powershell
docker compose config --quiet
docker compose up -d --build --wait
docker compose exec backend alembic upgrade head
docker compose exec backend python -m app.cli provision-admin
```

Run provisioning yourself in an interactive terminal. It hides password entry and refuses a second initial administrator. Sign in at http://127.0.0.1:3000. Additional accounts are managed through Users & access. The SUPER_ADMIN role is required for the initial security administration workflow.

Use the same hostname consistently in the browser. Both `127.0.0.1:3000` and `localhost:3000` are allowed by default, but host-only cookies are separate. A CSRF error can be resolved by refreshing the page and retrying. A session ends after idle/absolute expiration, deactivation, role changes or a password reset.

The HTTP integration verifier requires Docker CLI and PowerShell on the Windows host, with the development backend and database running.

```powershell
powershell -NoProfile -File scripts/Verify-AuthIntegration.ps1
```

It starts isolated test services without publishing test ports and creates randomly generated test credentials only in a temporary database. The script cleans up its own test services and database. It does not provision an administrator in the development database.

If TypeScript reports a missing old route after moving a page, use the documented isolated production-build command. Development route types regenerate when the frontend dev server starts. Keep production-build output separate from the running development cache.

Run the actual Chromium form/session regression checks with the optional browser flag. The script builds a pinned Playwright/Chromium tooling image inside Docker, then runs both HTTP and browser checks against its temporary test database. Host browser automation and local Node.js are unnecessary.

```powershell
powershell -NoProfile -File scripts/Verify-AuthIntegration.ps1 -Browser
```

If a development page renders but its controls do not respond, inspect the HMR connection and Next.js development origin policy. `allowedDevOrigins` contains hostname-only entries for 127.0.0.1 and localhost because the container server is initialized with 0.0.0.0. FastAPI's authentication origins independently include scheme and port. The login form stays disabled until its handler is ready and has an explicit POST fallback.

For an existing administrator, use the hidden-password `verify-admin-password` CLI command described in `AUTHENTICATION.md`. An explicit `reset-admin-password` command is available for authorized local recovery. Neither command provisions a replacement user.

Session/rate-record cleanup is available through `docker compose exec backend python -m app.cli cleanup-security`. Audit history is retained. See `AUTHENTICATION.md` for endpoint details, session settings and production HTTPS requirements.

## Phase 3 master data

Rebuild the backend to install the hash-locked Pillow decoder and initialize the dedicated image volume, then apply the reviewed additive migration:

```powershell
docker compose up -d --build --wait
docker compose exec backend alembic upgrade head
docker compose exec backend alembic current
docker compose exec backend alembic check
docker compose exec backend pytest -q
docker compose exec frontend npm run test:compat
powershell -NoProfile -File scripts/Verify-AuthIntegration.ps1 -MasterData
powershell -NoProfile -File scripts/Verify-AuthIntegration.ps1 -MasterData -Production
```

Do not reprovision an existing administrator. Master-data menu entries appear when the migration grants the relevant permissions. The verifier uses temporary databases, unpublished scratch services, synthetic test accounts, and a separate image volume. It restarts its own scratch services to verify persistence and removes its generated database/containers. Screenshots contain synthetic data only and reside in gitignored `artifacts/phase3`. `-MasterOnly` runs the focused master-data/browser/restart checks without repeating the existing auth integration suite.

Preserve `ambs-erp_ambs_item_images` alongside `ambs-erp_ambs_pg_data`. Back up both stores together. Superseded immutable image files are deliberately retained; no automatic deletion/retention job is installed. Database downgrade is blocked to preserve master records. Correct schema issues through reviewed forward migrations.

The Next 16.4.6 patch remains required and is installed by `npm ci`; incompatible versions fail installation. Its runtime, state-preservation and guard tests must pass before any Next update. Do not run production build output in the running development `.next` volume.

## Phase 4 inventory setup and validation

Before any significant schema upgrade, create a uniquely named custom-format PostgreSQL backup and verify it with pg_restore. The pre-Phase-4 backup and recovery procedure are recorded in PHASE_4_REPORT.md. Preserve the image volume separately alongside the database backup.

```powershell
docker compose exec -T backend alembic upgrade head
docker compose exec -T backend alembic current
docker compose exec -T backend alembic check
docker compose exec -T backend pytest -q
powershell -NoProfile -File scripts/Verify-AuthIntegration.ps1 -Inventory
powershell -NoProfile -File scripts/Verify-AuthIntegration.ps1 -Inventory -Production
```

The Phase 4 revision is 0004_inventory; current head is 0006_workflow_guards. No actual warehouses/opening quantities are seeded. Authorized Operations users configure verified locations and post genuine receipts. Never reprovision administrators or insert balances manually. `-InventoryOnly` focuses inventory/browser/restart checks; all test data lives in disposable databases. Do not build into the running development .next volume.

## Phase 5 purchasing and production

Back up the database with a fresh unique filename and verify the archive before `alembic upgrade head`. Phase 5 adds 0005_purchasing and 0006_workflow_guards without rewriting earlier migrations. The existing administrator automatically retains authority through its existing role; do not provision/reset it again.

```powershell
docker compose exec -T backend alembic upgrade head
docker compose exec -T backend alembic check
docker compose exec -T backend pytest -q
powershell -NoProfile -File scripts/Verify-AuthIntegration.ps1 -Purchasing
powershell -NoProfile -File scripts/Verify-AuthIntegration.ps1 -Purchasing -Production
```

`-PurchasingOnly` runs the focused new browser/restart suite. `-Purchasing` also runs existing authentication, master and inventory suites. Both use private synthetic suppliers/accounts/stock and clean only their own generated fixtures. No real supplier is contacted. Main named volumes/private images and credentials remain intact. Configure genuine suppliers and actual custody locations through the authorized UI. Read the costing/correction limitations before live procurement. Restore instructions and verified backup hashes are in PHASE_5_REPORT.md.

## Toolchain notes

TypeScript 6.0 is pinned because the current TypeScript ESLint peer range is below 6.1. ESLint 10 uses the official Next.js core-web-vitals plugin, TypeScript ESLint and React Hooks rules directly. A scoped minimatch 11.0.1 override addresses a transitive lint-tool advisory. Recheck its necessity during dependency updates.


## Phase 6B optional routing

Read ORS_LOCAL_SETUP.md. Add an optional backend ORS_API_KEY privately to existing ignored `.env`, then `docker compose up -d --no-deps --wait backend`. Keep all existing credentials unchanged. Never print resolved Compose configuration/environment; `docker compose config --quiet` validates without displaying secrets. Route calculations show NOT_CONFIGURED until configured. There is no frontend key or required public map service.

The current forward migration head is `0008_delivery_routes`. Back up PostgreSQL before upgrading, preserve volumes, and run `docker compose exec -T backend alembic check` afterward. No downgrade/reset is needed.

`powershell -NoProfile -File scripts/Verify-AuthIntegration.ps1 -Routing` runs complete prior-phase and routing browser checks with synthetic HTTP results. Add `-Production` for an isolated build/start comparison. `-RoutingOnly` is focused. All create private generated test databases/accounts and restart only their own scratch services. No provider request uses the real key.

## Phase 7 local verification

Rebuild the backend image for the new hash-pinned PDF packages before running Phase 7. Preserve `.env` and both existing PostgreSQL/image volumes. After a verified backup, apply `docker compose exec backend alembic upgrade head`; expected head is `0009_packing_bom`. `alembic check` must report no drift. This migration adds schema and permission grants only. It does not create business users, BOM recipes, documents or stock. Existing accounts resolve updated permissions without credential changes.

Run `docker compose exec -T -e ORS_API_KEY= backend pytest -q --tb=short`, frontend typecheck/lint/test:compat, and the isolated `Verify-AuthIntegration.ps1 -Packing` chain (`-Production` for built UI). `-PackingOnly` verifies Phase 7 in a fresh isolated database. Browser screenshots, fixture credentials/IDs and PDF samples are private ignored artifacts, never source-control inputs. Tests mock routing and do not use the owner's API key or real administrator.
