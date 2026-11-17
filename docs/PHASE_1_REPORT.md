# Phase 1 verification report

Verified on 16 November 2026, Asia/Dubai.

## Delivery

The existing Compose file was extended to three services. The existing PostgreSQL volume `ambs-erp_ambs_pg_data` was preserved. Its development role password was rotated and stored in the gitignored root `.env` file. A Git repository was initialized without commits or pushes.

Created files include the frontend application and dependency lock, backend application and hash-locked dependencies, Dockerfiles, migration infrastructure, six backend tests, environment template, Git exclusions, README, architecture guide, local setup guide, DBeaver guide, roadmap, and this report. Python package markers and the imports directory marker are included.

```text
AMBS-ERP/
  .env                     Local secret, ignored
  .env.example
  .gitignore
  compose.yaml
  README.md
  backend/
    Dockerfile
    requirements.in
    requirements.lock
    pytest.ini
    alembic.ini
    app/
      api/health.py
      core/config.py
      core/logging.py
      db/session.py
      models/base.py
      schemas/health.py
      main.py
    alembic/
      env.py
      script.py.mako
      versions/0001_foundation.py
    tests/test_health.py
  frontend/
    Dockerfile
    package.json
    package-lock.json
    next.config.ts
    tsconfig.json
    eslint.config.mjs
    postcss.config.mjs
    app/
      layout.tsx
      page.tsx
      globals.css
      status-panel.tsx
      api/status/route.ts
    lib/status.ts
  docs/
    ARCHITECTURE.md
    LOCAL_SETUP.md
    DBEAVER_SETUP.md
    PHASES.md
    PHASE_1_REPORT.md
  imports/.gitkeep
```

The compact tree omits package markers, Docker ignore files, Git metadata, and local caches.

## Running services

| Container | State | Host endpoint |
| --- | --- | --- |
| ambs-postgres-dev | Running, healthy | 127.0.0.1:5433 |
| ambs-erp-backend-1 | Running, healthy | 127.0.0.1:8000 |
| ambs-erp-frontend-1 | Running, healthy | 127.0.0.1:3000 |

## Verification results

| Check | Result |
| --- | --- |
| Existing workspace, Git, Docker, ports and project database inspected | PASS |
| Existing PostgreSQL named volume preserved | PASS |
| Compose configuration validation | PASS |
| Three healthy services with loopback-only published ports | PASS |
| Windows TCP connection to 127.0.0.1:5433 | PASS |
| Authenticated PostgreSQL query through published port | PASS |
| GET /api/health | PASS, HTTP 200 |
| GET /api/health/db with actual database query | PASS, HTTP 200 |
| Backend unit and integration tests | PASS, 6 tests, zero warnings |
| Python dependency consistency | PASS, pip check |
| Alembic upgrade and repeat upgrade | PASS |
| Alembic current | PASS, 0001_foundation at head |
| Alembic schema drift check | PASS, no new upgrade operations |
| Next.js startup and server-rendered homepage | PASS, HTTP 200 |
| Frontend TypeScript validation | PASS |
| ESLint | PASS, zero warnings |
| Optimized frontend production build | PASS |
| npm dependency audit | PASS, zero vulnerabilities |
| Actual frontend/backend/database success flow | PASS |
| Actual database outage and automatic recovery flow | PASS |
| Repository-visible credential scan and secret exclusion | PASS |
| DBeaver host connectivity and connection guide | PASS |
| Required documentation and eleven-phase roadmap | PASS |
| Browser visual layout and refresh-button interaction verification | FAIL, manual verification pending |

PostgreSQL reported 17.12. An authenticated query through `host.docker.internal:5433` returned database `ambs_erp` and user `ambs_dev`. Windows `Test-NetConnection` returned True. The database version table contains `0001_foundation`. Initial inspection found no business tables.

Container runtimes reported Python 3.13.18 and Node.js 24.22.3. The locked application dependencies include FastAPI 0.163.1, SQLAlchemy 2.0.57, Next.js 16.4.6, React 19.3.1, TypeScript 6.0.3, and ESLint 10.15.0.

During an actual PostgreSQL stop/start test, application health remained HTTP 200, database health returned a safe HTTP 503, and the frontend reported the unavailable database. The rendered homepage displayed the attention state. Database pooling and frontend connectivity recovered after PostgreSQL restarted.

The production build was verified in an isolated container with its own build and dependency volumes, using the unprivileged application user and the documented commands. Backend hot reload was observed after a source timestamp change.

## DBeaver

Create a PostgreSQL connection with host `127.0.0.1`, port `5433`, database `ambs_erp`, username `ambs_dev`, and the password from root `.env`. Download the JDBC driver if prompted, choose Test Connection, and finish. Inspect the public schema and run `SELECT 1;` and `SELECT version_num FROM alembic_version;`.

See `DBEAVER_SETUP.md` for the full walkthrough. DBeaver GUI actions remain user actions. Schema changes are managed through Alembic.

## Exact lifecycle commands

Run from `C:\Projects\AMBS-ERP`.

```powershell
docker compose config --quiet
docker compose up -d --build --wait
docker compose exec backend alembic upgrade head
```

Stop while retaining containers and volumes.

```powershell
docker compose stop
```

Resume existing containers.

```powershell
docker compose start --wait
```

Remove project containers and network while retaining named volumes.

```powershell
docker compose down
```

Avoid volume deletion and pruning. Testing commands are in `LOCAL_SETUP.md`.

## Decisions and resolved failures

- Docker supplies Python 3.13, which is absent from the Windows Python launcher. Host Python installations were preserved.
- The original development password was replaced with a generated local secret.
- A frontend cache-volume permissions failure was corrected in the Dockerfile and existing local frontend cache volume.
- Home navigation uses Next.js Link after the lint check identified the original anchor.
- TypeScript 6.0.3 fits the current TypeScript ESLint peer range. ESLint 10 uses the official Next.js, TypeScript ESLint, and React Hooks plugins directly.
- A scoped minimatch 11.0.1 override resolves GHSA-g3hv-75wg-m249 in the lint dependency tree. Reassess it when upstream dependencies change.
- The UI uses a provisional AM text monogram, Inter typography, and a green/neutral palette pending company brand assets.
- Business services and repositories will be added with implemented modules.

## Remaining manual checks and Phase 2 readiness

Computer Use browser verification was blocked. The browser access host was unavailable. The native browser fallback then stopped because it could not reliably determine the current browser URL. No DBeaver GUI actions were performed.

Open http://127.0.0.1:3000, confirm both Connected states, select Refresh status, and verify the checked time advances. Check desktop and mobile widths including 375px, keyboard navigation, visible focus, wrapping, and horizontal overflow. macOS and physical mobile browser checks remain manual.

The technical foundation is ready to begin Phase 2 development. Full visual acceptance remains pending the browser checks above. Authentication, authorization, and audit logging are the next implementation scope. The stack remains a loopback-only development environment.
