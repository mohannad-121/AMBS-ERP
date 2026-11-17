# Phase 2 acceptance report

Verified on 16 November 2026, Asia/Dubai.

This report records the initial Phase 2 implementation snapshot. The subsequent login failure fix, existing administrator inspection and successful Chromium browser verification are documented in [LOGIN_FAILURE_REPORT.md](LOGIN_FAILURE_REPORT.md).

The later Next.js runtime investigation, framework compatibility patch, and current development/production browser acceptance are recorded in [REACT_RUNTIME_REPORT.md](REACT_RUNTIME_REPORT.md).

## Outcome

Phase 2 implements PostgreSQL-backed authentication, revocable sessions, role-based authorization, user security administration, audit logging, and the protected Next.js workspace. The development stack is running on localhost. The technical foundation is ready for Phase 3 development. Manual administrator provisioning and browser/DBeaver GUI acceptance remain outstanding.

No real administrator or employee account was created. The development database contains zero users. Test administrators and test staff accounts existed only in uniquely named temporary PostgreSQL databases, which were removed after verification. Existing PostgreSQL volumes and the Phase 1 baseline migration were preserved. No Git commits, pushes or production deployment were performed.

## Files created and modified

A source snapshot of the original uncommitted Phase 1 files was preserved before editing at `C:\Users\mabua\AppData\Local\Temp\ambs-phase1-source-20261116-171806.zip`. It excludes the gitignored environment file and caches.

The existing local `.env` was extended with authentication configuration and a generated private BFF transport key. Its database credentials were preserved. The repository-visible inventory below is compared against that snapshot.

### Created files

- `backend/alembic/versions/0002_security_security_foundation.py`
- `backend/app/api/audit.py`
- `backend/app/api/auth.py`
- `backend/app/api/system.py`
- `backend/app/api/users.py`
- `backend/app/cli.py`
- `backend/app/core/security.py`
- `backend/app/models/security.py`
- `backend/app/schemas/security.py`
- `backend/app/services/__init__.py`
- `backend/app/services/users.py`
- `backend/tests/live_fixture.py`
- `backend/tests/test_security.py`
- `docs/AUTHENTICATION.md`
- `docs/PERMISSIONS.md`
- `docs/PHASE_2_REPORT.md`
- `docs/SECURITY.md`
- `frontend/app/(erp)/audit/audit-screen.tsx`
- `frontend/app/(erp)/audit/page.tsx`
- `frontend/app/(erp)/forbidden/page.tsx`
- `frontend/app/(erp)/layout.tsx`
- `frontend/app/(erp)/loading.tsx`
- `frontend/app/(erp)/page.tsx`
- `frontend/app/(erp)/users/page.tsx`
- `frontend/app/(erp)/users/users-screen.tsx`
- `frontend/app/api/[...path]/route.ts`
- `frontend/app/api/health/route.ts`
- `frontend/app/error.tsx`
- `frontend/app/login/login-form.tsx`
- `frontend/app/login/page.tsx`
- `frontend/app/unauthorized/page.tsx`
- `frontend/components/app-shell.tsx`
- `frontend/components/brand.tsx`
- `frontend/components/forms.tsx`
- `frontend/lib/api.ts`
- `frontend/lib/proxy.ts`
- `frontend/lib/server-api.ts`
- `frontend/lib/types.ts`
- `frontend/lib/use-resource.ts`
- `frontend/scripts/verify-auth.mjs`
- `scripts/Verify-AuthIntegration.ps1`

### Modified files

- `.env.example`
- `README.md`
- `backend/alembic.ini`
- `backend/alembic/env.py`
- `backend/app/core/config.py`
- `backend/app/main.py`
- `backend/requirements.in`
- `backend/requirements.lock`
- `compose.yaml`
- `docs/ARCHITECTURE.md`
- `docs/DBEAVER_SETUP.md`
- `docs/LOCAL_SETUP.md`
- `docs/PHASES.md`
- `frontend/app/api/status/route.ts`
- `frontend/app/globals.css`
- `frontend/app/layout.tsx`
- `frontend/app/status-panel.tsx`
- `frontend/lib/status.ts`
- `frontend/next.config.ts`

The original frontend root page was relocated into the authenticated `(erp)` route group. Its connectivity indicators remain in the existing status component. The historical Phase 1 report is retained.

## Database schema and migrations

| Table | Purpose |
| --- | --- |
| users | UUID identity, normalized unique username/email, activation, password hash and timestamps |
| roles | Seven initial role definitions |
| permissions | Seven security permissions and 28 reserved business permissions |
| user_roles | Multiple role assignments per account |
| role_permissions | Explicit resource/action grants |
| sessions | Random-session and CSRF verifiers, activity, expiry and revocation |
| audit_events | Actor, action, target, UTC timestamp and safe metadata |
| login_rate_buckets | Persistent login limits shared across API workers |

`alembic_version` remains the migration bookkeeping table. Migration `0001_foundation` is byte-for-byte unchanged. The additive `0002_security` migration creates the security tables, indexes, normalization constraints, foreign keys, and frozen role/permission catalog. Repeated upgrade at head succeeds. Schema drift checks pass, and offline SQL generation succeeds. The security migration is forward-only to retain accounts and audit history.

Actual PostgreSQL queries verified the tables, seven roles, 35 permissions, and revision `0002_security`. Windows TCP access to `127.0.0.1:5433` succeeded. An authenticated PostgreSQL query through the published host port returned `ambs_erp`, `ambs_dev` and `0002_security`.

## Authentication and authorization

Login accepts a normalized username or email and password. Argon2id is provided by argon2-cffi, with rehashing when parameters change. Password creation/reset requires 12–128 characters. Generic authentication failures cover unknown, incorrect and inactive accounts.

Sessions use 32 random bytes and store only SHA-256 verifiers in PostgreSQL. Cookies are host-only, HttpOnly and SameSite=Lax. HTTPS settings add Secure and the `__Host-` prefix. Defaults are a 30-minute idle timeout and an 8-hour absolute timeout. Login rotates the session and CSRF values. Logout, deactivation, role changes and password resets revoke sessions as appropriate.

State changes require an exact allowed Origin, JSON and a session-bound synchronizer CSRF header. Login limits persist in PostgreSQL across processes. Defaults are five attempts per normalized identifier per five minutes and 60 attempts per backend peer per minute. Trusted-source handling ignores caller-supplied forwarding addresses.

Next.js proxies an allowlisted API route set on the same browser origin. Internal API addressing and the BFF key remain server-only. Production settings reject HTTP origins, insecure cookies and missing/placeholder BFF keys. The BFF and backend require a verified HTTPS transport assertion, backed by a trusted TLS reverse proxy and private service ingress in production.

Security-sensitive writes are transactional. Advisory locks serialize mutations and first-admin provisioning across workers. Concurrent last-admin removal attempts are covered by integration tests. Failed combined account/role changes roll back assignments and session revocations. Denied actions receive a separate safe audit record.

## Initial role matrix

| Role | Initial implemented grants |
| --- | --- |
| SUPER_ADMIN | system.read, users.read, users.create, users.update, users.roles, users.reset_password, audit.read |
| OPERATIONS | system.read |
| SALES | system.read |
| ACCOUNTS | system.read |
| PACKING | system.read |
| MANAGEMENT | system.read |
| DRIVER | system.read |

All 28 future business permissions remain unassigned. The Operations employee's eventual order creation/management, dispatch quantity and warehouse coordination responsibilities are documented. SUPER_ADMIN security administration is explicit. Driver functionality remains Phase 10 scope. The full matrix and reserved resource/action catalog are in `PERMISSIONS.md`.

## Administrator provisioning

Run this manually in an interactive terminal from `C:\Projects\AMBS-ERP`.

```powershell
docker compose exec backend python -m app.cli provision-admin
```

The command prompts for account details and hidden password entry with confirmation. It refuses noninteractive password input and refuses when any SUPER_ADMIN already exists. A transaction lock makes concurrent provisioning safe. No administrator is created on startup.

## API endpoints

| Method | Path | Required access |
| --- | --- | --- |
| GET | /api/auth/csrf | Anonymous/current-session bootstrap |
| POST | /api/auth/login | Origin and CSRF |
| POST | /api/auth/logout | Authenticated and CSRF |
| GET | /api/auth/me | Authenticated |
| GET | /api/users | users.read, pagination and search |
| GET | /api/users/{id} | users.read |
| POST | /api/users | users.create, users.roles for role assignments |
| PATCH | /api/users/{id} | users.update, users.roles for role changes |
| PATCH | /api/users/{id}/activation | users.update |
| PUT | /api/users/{id}/roles | users.roles |
| POST | /api/users/{id}/password | users.reset_password |
| GET | /api/roles | users.read |
| GET | /api/permissions | users.read |
| GET | /api/audit | audit.read, actor/action/date filters and pagination |
| GET | /api/system/status | system.read |
| GET | /api/status | Next.js alias for authenticated status |

Public health checks remain available on FastAPI `/api/health` and `/api/health/db`, and Next.js `/api/health`. Responses use explicit schemas and exclude password hashes and session secrets. SUPER_ADMIN account administration has an additional SUPER_ADMIN role check.

## Frontend screens

- `/login` includes branded account/password entry, show/hide password, native validation, loading feedback and accessible error messages.
- `/` contains the protected system-status indicators.
- `/users` provides search, pagination, account creation/editing, role assignment, activation confirmation and password reset confirmation.
- `/audit` provides actor/action/date filters, UTC timestamps, pagination and safe event details.
- `/forbidden` and `/unauthorized` provide explicit access/session states.
- The responsive application shell contains permission-aware navigation, current account information and CSRF-protected logout. Dialogs use native modal focus handling and restore prior focus.

The interface follows the Phase 1 Inter typography and green/neutral branding. Business and driver interfaces remain deferred.

## Automated verification

| Executed check | Result |
| --- | --- |
| Original Phase 1 tests before modification | 6 passed |
| Final combined backend suite | 36 passed, zero warnings |
| Live Next.js/FastAPI/PostgreSQL HTTP verification | 20 checks passed |
| Alembic upgrade and repeated upgrade | PASS |
| Alembic current | 0002_security at head |
| Alembic metadata drift check | PASS |
| Offline migration SQL generation | PASS |
| Backend dependency consistency | pip check passed |
| Python dependency advisory check | pip-audit found no known vulnerabilities |
| Frontend TypeScript validation | PASS in build and running dev container |
| ESLint | PASS, zero warnings |
| Frontend optimized production build | PASS |
| npm advisory check | Zero vulnerabilities |
| Compose configuration and service health | PASS |
| Windows PostgreSQL host access and authenticated query | PASS |
| Repository-visible secret scan | PASS |

The 36-test suite includes Argon2id verification, migration/catalog correctness, administrator provisioning safeguards, valid/invalid login, generic errors, persistent rate limiting and expiry, cookie attributes, session rotation/expiry/revocation, logout, disabled accounts, permission denials, multi-role union, delegated privilege-escalation protection, CSRF/origin rejection, concurrent last-admin protection, account normalization/uniqueness, pagination, role/password/activation changes, transactional rollback, and audit filtering/privacy. The six Phase 1 tests remain included.

The 20 live HTTP checks use actual Next.js pages and the BFF, with separate API and frontend containers against a temporary test database. They verify cookie forwarding and rotation, login/CSRF, current user, SSR access, actual status queries, account creation, Operations denial, role/password revocation, activation, last-admin protection, audit filtering and logout replay. They exercise HTTP behavior without claiming interactive browser actions.

During implementation, an outdated generated route-type cache caused one initial build failure. A fresh isolated build volume resolved it, and the normal running-container type check also passes. The live verification script's initial startup poll encountered expected connection-refused stderr under PowerShell's terminating-error mode. Polling now checks exit codes and retries until ready. Both checks subsequently passed.

## Docker status

| Container | Status | Published address |
| --- | --- | --- |
| ambs-postgres-dev | Running, healthy | 127.0.0.1:5433 |
| ambs-erp-backend-1 | Running, healthy | 127.0.0.1:8000 |
| ambs-erp-frontend-1 | Running, healthy | 127.0.0.1:3000 |

The original `ambs-erp_ambs_pg_data` volume remains attached. Live test containers publish no host ports and are removed after verification. Temporary test databases are removed. Source remains uncommitted.

## Remaining manual acceptance

The browser bridge reports that its access host is unavailable. Interactive login, form manipulation, keyboard checks and responsive visual review remain pending. No DBeaver GUI action was performed during this phase. SQL and host connectivity verification were executed separately.

1. Run the interactive administrator provisioning command with your chosen credentials.
2. Open http://127.0.0.1:3000 and sign in. Check loading/error states, password visibility and logout.
3. Inspect desktop and 375px mobile layouts, sidebar navigation, keyboard focus and dialog behavior.
4. Create a company-approved account and exercise editing, role changes, activation and password reset. Confirm session termination using a separate browser profile.
5. Review audit records and actor/action/date filters.
6. In DBeaver, use the existing PostgreSQL connection at 127.0.0.1:5433, select ambs_erp, refresh with F5 and inspect Schemas -> public -> Tables. Execute the read-only queries in `DBEAVER_SETUP.md` and confirm revision 0002_security.

## Acceptance checklist

| Acceptance area | Result |
| --- | --- |
| Phase 1 review, source preservation and regression checks | PASS |
| PostgreSQL security schema, catalog and additive migration | PASS |
| First-party Argon2id login, logout and current user | PASS |
| Revocable sessions, expiry, cookies, rotation and invalidation | PASS |
| Persistent rate limiting, generic errors and CSRF | PASS |
| Backend RBAC, multi-role union and escalation protection | PASS |
| Transactional user administration and concurrent last-admin protection | PASS |
| Safe security auditing and restricted audit queries | PASS |
| Protected shell and real endpoint-backed frontend screens | PASS, compile/HTTP verified |
| Backend tests, dependency checks, frontend checks and build | PASS |
| Actual BFF cookie/API/SSR integration | PASS |
| PostgreSQL Windows access and DBeaver instructions | PASS |
| Required developer/security documentation | PASS |
| Secure interactive first-administrator provisioning command | PASS |
| Interactive browser and responsive visual acceptance | FAIL, browser bridge unavailable |

The technical implementation is ready to begin Phase 3. Full operational/visual sign-off remains pending the manual checks above. Production deployment remains a later phase and requires the HTTPS, trusted ingress and database privilege controls in `SECURITY.md`.
