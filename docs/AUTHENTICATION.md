# Authentication

## Request flow

The browser uses the Next.js origin for pages and `/api/*` requests. A restricted Backend-for-Frontend proxy forwards allowed routes, session cookies, the request origin and the CSRF header to FastAPI over the private Compose network. Server-rendered pages forward cookies through a server-only API client. The internal API URL and BFF secret stay on the server.

FastAPI enforces authentication and resource/action permissions. The frontend uses effective permissions for navigation and controls. Every administrative API also enforces its own permission and additional SUPER_ADMIN protections.

## Sessions and passwords

Passwords use Argon2id through argon2-cffi with its maintained defaults. Successful authentication rehashes passwords when the library parameters change. Passwords are 12–128 characters when created or reset. Login errors use the same message for unknown identities, wrong passwords and inactive accounts. A dummy Argon2id verification handles unknown identities.

Each session identifier contains 32 cryptographically random bytes. PostgreSQL stores its SHA-256 verifier, a separate CSRF verifier, user ID, timestamps, expiry and revocation state. Passwords and raw session identifiers are never stored in PostgreSQL.

Default idle expiry is 30 minutes and absolute expiry is 8 hours, enforced on the backend with UTC timestamps. Successful authenticated API requests update last activity. Anonymous CSRF bootstrap sessions expire within 15 minutes. Login revokes the previous session and issues fresh session and CSRF values. Logout revokes the current session. Deactivation, role changes and password resets revoke all sessions for the affected user. Effective permissions are read from current database assignments on each request.

The session cookie is host-only, HttpOnly, SameSite=Lax and uses path `/`. HTTPS configuration adds Secure and the `__Host-` cookie prefix. The readable CSRF cookie contains the separate CSRF token. Both cookies expire within the absolute session lifetime. No authentication token is stored in browser localStorage.

## CSRF and login limits

`GET /api/auth/csrf` supplies a synchronizer token and a session cookie. State-changing requests require an allowed exact Origin, JSON content type and an `X-CSRF-Token` whose verifier matches the session record. Cross-site Fetch Metadata is rejected. The token is rotated at login. The browser client obtains a current token before each mutation and sends it as a header.

Login attempts use persistent PostgreSQL rate buckets and advisory transaction locks. Defaults allow 5 attempts per normalized identifier in 300 seconds and 60 attempts per backend peer in 60 seconds. The source limit is shared by users of a BFF instance. Caller-supplied forwarding addresses are ignored. HTTP 429 includes Retry-After. Windows are fixed from the first attempt and expire automatically. Rate records remain effective across API restarts and workers.

Failed authentication and denied security actions are audited with safe reason codes. Attempted identities are represented by a digest. Passwords, session tokens, CSRF values, authorization headers and request bodies are excluded from audit metadata.

## Initial administrator

Apply migrations, then run this command yourself in an interactive terminal.

```powershell
docker compose exec backend python -m app.cli provision-admin
```

Enter a username, optional email, display name, and a password twice. Password entry is hidden. The command refuses noninteractive entry and refuses provisioning when any SUPER_ADMIN already exists. It rechecks under the same transaction lock used by user administration. No administrator is created on startup, and no default administrator credentials exist.

Administrators are provisioned manually. Automated tests provision accounts only inside uniquely named temporary test databases.

## Verify or recover an existing administrator

Use a trusted local interactive terminal with Docker administrative access. These commands accept passwords only through hidden terminal prompts.

```powershell
docker compose exec backend python -m app.cli verify-admin-password
```

Enter the existing administrator username or email and current password. Verification uses the same normalization and Argon2id verification as login, respects persistent login limits, and records a safe audit event. It creates no browser session. Success confirms the password, while browser sign-in must still complete the session/cookie flow.

To explicitly choose a new password for an existing active SUPER_ADMIN, run this separate recovery command.

```powershell
docker compose exec backend python -m app.cli reset-admin-password
```

The recovery command requests the identifier and a new password twice, validates the password, updates the existing account under the security transaction lock, revokes its sessions and records an audit event. It preserves identity, roles and activation. It does not clear rate limits. Wait for an existing rate window to expire before retrying browser login. Never provide passwords in chat, command-line arguments or screenshots.

## Browser form safety

The login form keeps credential inputs disabled until React hydration completes, explicitly uses POST, and sends JSON with CSRF protection through the BFF. JavaScript-disabled browsers receive instructions. Legacy login URLs containing credential query keys redirect to a clean login page. Login-page request URLs are excluded from Next.js incoming-request logs, and responses use a no-referrer policy.

The development server binds to 0.0.0.0 inside Docker. Next.js explicitly allows the browser hostnames 127.0.0.1 and localhost for development resources, including its HMR WebSocket. This development allowlist is separate from FastAPI's exact scheme/host/port authentication origins. See `LOGIN_FAILURE_REPORT.md` for the diagnosed hydration failure and browser verification.

## API endpoints

The browser calls these paths through Next.js on port 3000. FastAPI implements the same `/api` paths internally on port 8000.

| Method and path | Access |
| --- | --- |
| GET /api/auth/csrf | Anonymous bootstrap or current session |
| POST /api/auth/login | Valid bootstrap CSRF and allowed origin |
| POST /api/auth/logout | Authenticated, CSRF |
| GET /api/auth/me | Authenticated, includes roles and effective permissions |
| GET /api/users | users.read, search/page/page_size |
| GET /api/users/{id} | users.read |
| POST /api/users | users.create, plus users.roles when assigning roles |
| PATCH /api/users/{id} | users.update, plus users.roles when roles are supplied |
| PATCH /api/users/{id}/activation | users.update |
| PUT /api/users/{id}/roles | users.roles |
| POST /api/users/{id}/password | users.reset_password |
| GET /api/roles | users.read, includes each role's permissions |
| GET /api/permissions | users.read, complete permission catalog |
| GET /api/audit | audit.read, actor/actor_id/action/start_at/end_at/page/page_size |
| GET /api/system/status | system.read |
| GET /api/status | Next.js alias for authenticated system status |
| GET /api/health | Public service liveness on both services |
| GET /api/health/db | FastAPI development database connectivity |

User updates accept partial account fields and an optional roles array. An empty roles array removes assignments subject to the last-admin guard. Unknown fields are rejected. Activation and password changes have dedicated endpoints. API responses omit password hashes, session records and raw security secrets.

## Production gate

`APP_ENV=production` requires HTTPS-only allowed origins, `AUTH_COOKIE_SECURE=true`, and a private BFF secret of at least 32 characters. Placeholder BFF secrets are rejected. FastAPI requires authenticated-transport requests to carry the BFF key and an HTTPS external-protocol assertion. Next.js rejects production proxy requests whose external protocol is HTTP.

Production requires a TLS reverse proxy as the only ingress to Next.js, with incoming forwarding headers stripped and rebuilt by that trusted proxy. Keep FastAPI and PostgreSQL private, prevent direct access to the Next.js listener, and forward the verified external scheme. The BFF key authenticates the internal transport assertion. A successful optimized build alone does not change APP_ENV or enable production access.

## Maintenance and reference

```powershell
docker compose exec backend python -m app.cli cleanup-security
```

This explicit maintenance command removes expired/revoked sessions and expired rate buckets while retaining audit history. Schedule it on the future on-premise host after choosing operational ownership and retention policies.

Session and CSRF behavior follows the OWASP session and synchronizer-token guidance. Password verification and rehashing use the library API. [OWASP sessions](https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html), [OWASP CSRF](https://cheatsheetseries.owasp.org/cheatsheets/Cross-Site_Request_Forgery_Prevention_Cheat_Sheet.html), [argon2-cffi API](https://argon2-cffi.readthedocs.io/en/stable/api.html).
