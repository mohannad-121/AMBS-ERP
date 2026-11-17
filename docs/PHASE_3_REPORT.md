# Phase 3 acceptance report

## Scope and current verification

Customers, projects, customer-issued LPO references, categories, units, product families, independently identified variant items and private item images are implemented with PostgreSQL persistence, backend authorization and transactional auditing. Phase 4 has not started. No inventory quantities, orders, purchasing workflow, dispatch, drivers, numeric packing formulas or historical imports were implemented.

Phase 3 technical acceptance passed in development and optimized production, including combined authentication/business regression and isolated service-restart persistence. No Git commit, push or production deployment was performed.

## Preflight and preservation

All requested preflight documents were present and inspected. No AGENTS.md was found. The Git working tree was already untracked/uncommitted; existing files were preserved and no commit or push was performed. A local Git checkpoint was recommended. The configured `.env` remains ignored, and a repository-visible scan found zero occurrences of the configured database password/BFF secret. Exclusions now cover backups, local storage, data spreadsheets/CSV files and test artifacts.

Before implementation, the existing 63-test backend suite, 20 HTTP/BFF checks, 24 Chromium authentication checks and both installed Next router runtime regressions passed. Existing Docker services were healthy at `0002_security`. The original PostgreSQL volume was retained.

Migration `0003_master_data` was reviewed and applied transactionally. Fingerprints of users (including credential hashes), roles, sessions, audit rows, user-role assignments and login-rate records matched before/after the upgrade, and every pre-existing permission grant remained present. The migration only adds master tables, business permission definitions/grants and the category integrity function/trigger. Original migration file hashes remain:

```text
0001_foundation.py
E05CF1EF2D8918AC627E65D05046CF7787DE4C4315F9CE5E49BD63E071A3BA4D
0002_security_security_foundation.py
05350DFE10349B889DED1730241F0E282FA77F95D2D1782B1F41F80DAAA89A46
```

Real administrator credentials were never used/reset for automated testing. No company business records were seeded or imported. Acceptance uses generated accounts and synthetic business data in uniquely named scratch databases, unpublished test services and isolated image volumes.

## Exact source files

Created:

```text
backend/app/models/master.py
backend/app/schemas/master.py
backend/app/services/master.py
backend/app/api/master.py
backend/app/api/images.py
backend/app/core/body_limit.py
backend/alembic/versions/0003_master_data_business_master_data.py
backend/tests/test_master.py
backend/tests/test_master_archive.py
frontend/lib/master-data.ts
frontend/components/master-screen.tsx
frontend/app/(erp)/master/[resource]/page.tsx
frontend/app/(erp)/master/[resource]/[id]/page.tsx
frontend/scripts/verify-master-browser.mjs
frontend/scripts/test-next-patch.mjs
docs/MASTER_DATA_DESIGN.md
docs/DATA_IMPORT_STRATEGY.md
docs/PHASE_3_REPORT.md
```

Modified:

```text
.gitignore
README.md
compose.yaml
backend/Dockerfile
backend/requirements.in
backend/requirements.lock
backend/alembic/env.py
backend/app/core/config.py
backend/app/main.py
backend/tests/test_security.py
frontend/package.json
frontend/lib/api.ts
frontend/lib/proxy.ts
frontend/lib/server-api.ts
frontend/lib/use-resource.ts
frontend/components/app-shell.tsx
frontend/app/globals.css
scripts/Verify-AuthIntegration.ps1
docs/ARCHITECTURE.md
docs/PHASES.md
docs/LOCAL_SETUP.md
docs/PERMISSIONS.md
docs/DBEAVER_SETUP.md
```

The Next compatibility patch itself, login protection, password handling, session primitives and original migrations remain unchanged. Existing security tests were updated only where Phase 3 intentionally extends the migration head and role permission catalog.

## Database, API and screens

Nine new tables: `customers`, `projects`, `customer_lpos`, `product_categories`, `units`, `product_families`, `items`, `item_images`, `legacy_references`. Revision chain: `0001_foundation → 0002_security → 0003_master_data`. The new migration is forward-only to protect business data.

Customers have multiple projects and LPO references. The composite project/customer FK prevents cross-customer LPO association. LPO numbers are unique per issuer, not globally. Category parent cycles are blocked in the service and PostgreSQL trigger. All master records have UUIDs, stable unique codes, UTC timestamps, creator references and activation. Item family/attribute signatures prevent duplicate combinations; each variant is an item UUID/code suitable for future transaction FKs. Weight is exact decimal storage and serialized as a decimal string.

The 37 business HTTP operations are documented in `MASTER_DATA_DESIGN.md`. All use `/api/master`: list/detail/create/full-update for seven resources, activation for six, customer duplicate lookup, and image PUT/GET. Linked records use paginated, permission-checked filters. No hard-delete operation exists.

Frontend list/detail pages are `/master/customers`, `/master/projects`, `/master/lpos`, `/master/items`, `/master/categories`, `/master/units`, `/master/families` and their `/{uuid}` details. They provide actual API-backed forms, search, filters, sorting/direction, pagination, empty/loading/error states, success feedback and archive confirmation. Customer/project/family details expose linked records. Reference controls have unique accessible IDs and searchable server-backed options. Master create controls wait for hydration. Existing System status remains the dashboard; User Management and Audit Logs remain available to authorized users. No decorative System Settings screen was added.

## Security, audit and images

The role matrix is in `PERMISSIONS.md`. The catalog now contains 45 permissions: 7 security, 19 implemented business and 19 reserved future permissions. Existing business permission IDs were reused; ten permission records were added. SUPER_ADMIN and OPERATIONS can maintain business masters, while only SUPER_ADMIN retains security administration. SALES and MANAGEMENT are read-only; ACCOUNTS reads customer/project/LPO references; PACKING reads items/definitions/images; DRIVER receives no master-data grants. Multi-role union is preserved. Backend checks, not menu visibility, enforce permissions.

Every create/update/archive/reactivation and image upload/replacement records actor, action, target type/UUID, UTC timestamp and safe field names in the existing audit table, in the same transaction. Permission denials are separately audited after rollback. No full notes/contact payload, password, session value or image bytes are logged. LPO status changes use update; project status cannot bypass archive permission.

Pillow 13.0.0 is the only new production dependency and is hash-locked. There are no Next/React version changes or new frontend runtime dependencies. Uploads accept PNG/JPEG/WebP only, verified by signature, decoded format, single-frame validation, pixel limit and safe pixel-only re-encoding. Limits are 5 MiB and 16 million pixels; request streams are bounded at both entry points. Filenames are generated UUIDs and resolved within storage; user filenames are not accepted. Bytes live in `/data/item-images` on `ambs-erp_ambs_item_images`; PostgreSQL holds current metadata. Retrieval requires authentication/items.read and uses no-store/nosniff responses. Replacement writes the immutable file before atomic metadata commit. Old files remain for safe concurrent reads and reviewed retention. Tests use a separate image volume.

## Test results

| Check | Executed result |
| --- | --- |
| Backend Pytest, including Phase 1/2 | 82 passed |
| Migration current/drift | 0003_master_data at head; no new upgrade operations |
| TypeScript | Passed |
| ESLint | Passed with zero warnings |
| Clean npm ci + optimized build + typecheck | Passed; guarded patch applied |
| Next guard/idempotence tests | 3 passed |
| Next installed runtime regression | CommonJS and ESM passed, including mounted client-state preservation |
| npm audit (full dependency tree) | Zero known vulnerabilities |
| Python dependency audit | No known vulnerabilities |
| pip check | No broken requirements |
| Repository-visible configured-secret scan | Zero matches; .env ignored |
| Master-data Chromium checks | 30 passed in development; 30 passed with optimized Next |
| Restart persistence Chromium checks | 4 passed in each mode |
| Phase 2 authentication Chromium regression | 24 passed in development; 22 passed with optimized Next |
| Live HTTP/BFF authentication integration | 20 passed in each mode |
| Screenshot inspection | Desktop 1440×1000 and tablet 768×1024 inspected; tablet has no document overflow |
| Final combined authentication/business regression | PASS in both modes: 58 development / 56 optimized-production browser checks, plus HTTP and compatibility checks |
| Docker build and health | Both images built; PostgreSQL, backend and frontend healthy after local recreation |
| Test cleanup / development data isolation | No scratch HTTP containers or databases remain; development customer/project/LPO/item/image tables contain zero synthetic records |

Backend tests include normalized duplicate acknowledgment, pagination/search/lifecycle, multi-project customers/LPOs, issuer-scoped duplicates, direct database FK/cycle rejection, all role boundaries, forbidden mutations across every master resource, CSRF, safe audit consistency, variant validation and normalization, category/unit/family management, concurrent customer/item code generation through the business service, image validation/oversize/privacy/replacement/persistence, failed-commit file cleanup, metadata stripping and streamed body limits.

Successful browser runs record no React runtime errors, hydration warnings, uncaught exceptions or unexpected console warnings/errors. The deliberate invalid-password test produces one expected resource HTTP 401; the customer-duplicate test produces one expected HTTP 409. Both are explicitly checked in their corresponding negative-test stages. Application error reporting and the development indicator remain enabled. The combined suite uses a separate scratch audit administrator so its successful sign-ins do not consume the authentication suite's deliberately exercised identity limit; no rate-limit setting was weakened.

## Acceptance scenarios

| Scenario | Status |
| --- | --- |
| A — Multi-project customer and LPO references | PASS — backend and Chromium |
| B — Normalized customer duplicate warning/controlled override | PASS — backend and Chromium |
| C — Explicit approved family variants with independent identities | PASS — backend and Chromium |
| D — Operations authority and unauthorized/read-only restrictions | PASS — backend and Chromium |
| E — Authorized image upload/retrieval and anonymous rejection | PASS — backend and Chromium |
| F — Data/image persistence after service restart | PASS — backend/frontend scratch restart in both modes |
| G — Phase 2 auth/users/audit/logout regression | PASS — final integrated runs in both modes |

During implementation Chromium exposed duplicate label/control IDs between filters and modals, pre-hydration create-button interaction, and image success feedback being unmounted by detail reload. Those application issues were corrected and the real-browser flow retained as regression coverage. Early failures are not counted as successful acceptance runs.

## DBeaver and migration instructions

Use the existing connection to `127.0.0.1:5433`, database `ambs_erp`, with local credentials from `.env`. Refresh the public schema and inspect the new tables/foreign keys. Safe join queries and the exact table list are in `DBEAVER_SETUP.md`. No DBeaver GUI inspection or manual table modification is claimed. Apply schema changes only through reviewed Alembic revisions:

```powershell
docker compose up -d --build --wait
docker compose exec backend alembic upgrade head
docker compose exec backend alembic current
docker compose exec backend alembic check
```

Do not reprovision the working administrator. Preserve both database and image volumes. Before company-wide deployment, back up both and rehearse restoration.

## Business assumptions and remaining limits

- Confirm issuer-wide LPO number uniqueness if a customer legitimately reuses a number for different projects.
- Confirm role policy, canonical customer classification, TRN records, approved family attributes/combinations, unit labels/precision and real photographs with business owners. No such company records were invented.
- Name normalization catches case/whitespace/Unicode compatibility differences; spelling variants remain a reviewed import problem. No automatic merges or fuzzy uniqueness.
- Duplicate override requires explicit acknowledgment and reason; the reason is not retained in audit payloads. The audit records the safe business change without contact/notes payloads.
- LPO supporting-document reference is metadata only, not an unverified document storage/import system.
- Superseded image cleanup and coordinated backup/retention are operational responsibilities; no automatic file deletion job is installed.
- Current concurrent master writes use the existing security transaction lock. This is conservative for the current small team; future throughput and optimistic edit-conflict policies should be reviewed with the transaction modules.
- The Next 16.4.6 local patch remains required. Upgrades fail explicitly until it is reviewed. Optimized-production tests run over isolated loopback HTTP with development cookie settings; this does not constitute production TLS deployment acceptance.
- Original Odoo/Excel sources were not available. Historical migration, reconciliation tooling and real-data approval remain Phase 9. BOM/rule-version/override architecture is documented without numeric formulas or seeded relationships.

## Final acceptance and readiness

All seven required acceptance scenarios pass. Phase 3 is technically accepted for continued development. The existing SUPER_ADMIN/security data and original migration files were preserved, no company data was imported, and no application-level React/hydration errors remain in the verified flows.

Phase 4 planning can proceed after review of the documented role policy, approved master records/variants, units and inventory-ledger design. This is not production deployment acceptance: coordinated database/image backups, restore drills, TLS, restricted runtime database permissions and operational controls remain deployment prerequisites. Phase 4 has not started.

Repeat from the repository root:

```powershell
docker compose exec backend pytest -q
docker compose exec backend alembic check
docker compose exec frontend npm run lint
docker compose exec frontend npm run typecheck
docker compose exec frontend npm run test:compat
powershell -NoProfile -File scripts/Verify-AuthIntegration.ps1 -MasterData
powershell -NoProfile -File scripts/Verify-AuthIntegration.ps1 -MasterData -Production
```
