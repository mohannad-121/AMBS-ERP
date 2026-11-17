# Phase 2 login failure investigation

Verified on 16 November 2026, Asia/Dubai.

## Confirmed root cause

The failing browser submissions never reached FastAPI authentication. Safe inspection of recent request metadata found six GET requests to `/login` with `identifier` and `password` query keys, returning HTTP 200. Values were excluded from diagnostic output. PostgreSQL had no failed-login audit events or authenticated sessions from those attempts.

Next.js was started inside Docker with hostname `0.0.0.0`. Its development resource policy automatically allowed localhost and the initialized hostname, but 127.0.0.1 had no explicit allowance. The browser's HMR WebSocket was rejected with an Unauthorized response, producing an invalid WebSocket handshake. React hydration stalled, so the rendered login form's submit handler and password visibility control were inactive.

A fresh Chromium context reproduced the failure on the actual development frontend without entering any credentials. The page and JavaScript assets returned HTTP 200, HMR repeatedly failed, and clicking Show did not change the password field type. The form had no explicit method and therefore fell back to native GET submission when its JavaScript handler was absent.

After adding the explicit development hostnames, the same read-only browser probe connected HMR and the Show control worked. Actual form-login tests subsequently succeeded through Next.js, FastAPI and PostgreSQL.

The configured development-origin option matches hostname-only entries. The authentication API continues to enforce exact scheme/host/port origins independently. [Next.js allowedDevOrigins documentation](https://nextjs.org/docs/app/api-reference/config/next-config-js/allowedDevOrigins).

## Existing administrator and configuration

- The existing administrator username is `admin`.
- The account is active and has SUPER_ADMIN assigned.
- An email is configured. Both stored identifiers are normalized, and normalized username/email database lookups resolve the existing account.
- The stored password hash has valid Argon2id structure. Its value was never displayed.
- Development cookies use host-only scope, path `/`, HttpOnly for the session, SameSite=Lax, and Secure=false for local HTTP. Production HTTPS requirements remain enforced.
- Authentication origins include http://127.0.0.1:3000 and http://localhost:3000.
- No active rate-limit bucket was found during the initial inspection.
- Alembic is at 0002_security. Database connectivity and all three service health checks pass.

Valid Argon2id structure does not establish that the user's entered password matches. No real password was requested, read from historical URLs, guessed, verified or reset by the agent. The existing account, roles and credentials were preserved. Automated credential tests used temporary test databases and generated test accounts.

## Changes

| File | Change |
| --- | --- |
| frontend/next.config.ts | Explicit 127.0.0.1/localhost development allowlist, login-URL log suppression and no-referrer policy |
| frontend/app/login/login-form.tsx | Explicit POST, credentials disabled until hydration, no-JavaScript instructions, form data captured before disabling controls |
| frontend/app/login/page.tsx | Legacy credential query URLs redirect to clean /login without using their values |
| backend/app/cli.py | Interactive existing-admin password verification and explicit password recovery |
| backend/tests/test_cli.py | Recovery command terminal, privacy, validation and confirmation tests |
| backend/tests/test_security.py | Existing-admin verification, rate limits, reset revocation and role-scope tests |
| backend/tests/live_fixture.py | Supplies the generated test account's email to browser verification |
| frontend/scripts/verify-login-browser.mjs | Actual Chromium login, session, navigation, logout and hydration-safety regression tests |
| frontend/tests/browser.Dockerfile | Pinned Playwright/Chromium tooling inside Docker |
| scripts/Verify-AuthIntegration.ps1 | Optional -Browser verification against the isolated test stack |
| docs/AUTHENTICATION.md | Verification/recovery commands and browser form safeguards |
| docs/LOCAL_SETUP.md | Browser regression command and development-origin troubleshooting |
| docs/LOGIN_FAILURE_REPORT.md | Investigation, evidence, results and manual follow-up |
| docs/PHASE_2_REPORT.md | Links the historical implementation snapshot to this subsequent verification |

The development allowlist contains only the two supported local hostnames. CSRF, password verification, session handling, persistent login limits, backend permissions and production HTTPS checks remain active. Recovery is a local privileged CLI operation requiring an interactive terminal, an existing active SUPER_ADMIN and explicit new-password confirmation. It does not create a replacement account or clear rate limits.

## HTTP results

| Scenario | Observed result |
| --- | --- |
| Original real-user submission | GET /login returned 200; authentication API was never called |
| Original HMR connection from 127.0.0.1 | Unauthorized WebSocket response and inactive React controls |
| Fixed browser login with valid test username | POST /api/auth/login returned 200 |
| Fixed browser login with valid test email | POST /api/auth/login returned 200 |
| Fixed browser login through localhost | POST /api/auth/login returned 200 |
| Invalid test password | POST /api/auth/login returned 401 with accessible generic error |
| Missing or invalid CSRF / disallowed origin | 403 in regression tests |
| Exceeded persistent login limit | 429 in regression tests |
| Protected API after logout | 401 |
| Protected browser page after logout | Redirect to /login |
| Legacy credential query URL after fix | 307 redirect to clean /login |

## Executed verification

- All backend tests passed, 63 total with zero warnings. This includes existing authentication/session/cookie tests and the original Phase 1 regressions.
- Twenty live HTTP/BFF checks passed against actual Next.js, FastAPI and PostgreSQL services in an isolated test stack.
- Nineteen Chromium browser checks passed. They exercised actual form submission by username and email, invalid-password feedback, both local hostnames, HMR/hydration, the HttpOnly session cookie, protected dashboard, refresh persistence, SUPER_ADMIN controls, audit access, logout, protected-route rejection, URL privacy, no-JavaScript input safety, and legacy query redirection.
- TypeScript, ESLint and an optimized frontend production build passed.
- Alembic current and metadata drift checks passed at 0002_security.
- Docker configuration and service health checks passed.
- Temporary authentication test databases and containers were cleaned up.

The native browser bridge remained unavailable. Chromium ran locally inside Docker and interacted with the real interface against generated test accounts. The user's existing Chrome session and real administrator password were outside those credential tests.

The browser regression initially needed more precise error-element selection and a CSS selector for noscript content, which Playwright's text selector excludes. Those test selectors were corrected, and the full run passed. Raw browser exceptions and traces are suppressed because browser call logs can include filled values.

Reproduce the automated checks with these commands.

```powershell
docker compose exec backend pytest -q
powershell -NoProfile -File scripts/Verify-AuthIntegration.ps1 -Browser
docker compose exec backend alembic check
```

## Real administrator verification and follow-up

Open a trusted interactive terminal in `C:\Projects\AMBS-ERP`.

```powershell
docker compose exec backend python -m app.cli verify-admin-password
```

Enter the existing username or email and current password at the hidden prompt. The command performs one verification under the existing persistent login limits and reports only the outcome. It records a safe audit event and creates no browser session. A successful test-account login does not validate the real administrator's password.

Earlier native GET submissions included password fields in URLs. Those entered values may remain in local browser history and historical development logs. Treat the earlier password as exposed to those locations and choose a fresh password through this explicit, manual recovery command.

```powershell
docker compose exec backend python -m app.cli reset-admin-password
```

Enter the existing administrator identifier, then enter and confirm a new 12–128-character password. The operation updates that account, preserves its identity and roles, revokes its sessions, and records an audit event. No real recovery command was executed during this investigation.

Close old credential-bearing login tabs and use the clean URL http://127.0.0.1:3000. Sign in once with the verified/new password, refresh the dashboard, open Users & access and Audit history, and sign out. If a rate limit is active, wait for its window to expire. Avoid sharing old URLs or unredacted historical logs. Review affected local history/log handling after rotating the password.

The confirmed application defect is fixed and automated browser authentication passes. Real-administrator credential verification and the user's final browser check remain manual. No Phase 3 work, Git commit, push or production deployment was performed.
