# Security configuration and operation

## Current controls

Phase 2 uses Argon2id password hashes, random revocable server-side sessions, one-way token verifiers, HttpOnly host-only session cookies, SameSite protection, synchronizer CSRF checks, exact Origin validation, persistent login rate limits, backend permission checks, safe API errors and restricted audit access.

Username and email normalization occurs before persistence, with unique database indexes and normalization constraints. SQLAlchemy builds parameterized queries. User responses expose a deliberate field list. Audit metadata is assembled from known safe fields, including changed field names and role codes. Public responses exclude exception traces and validation input bodies.

The frontend proxy accepts a fixed set of application paths, forwards selected security headers and authentication cookies, limits mutation bodies to 16 KiB, and uses bounded uncached requests. Response cookies are forwarded individually. Pages use clickjacking, content-type and referrer headers, with CSP restrictions for framing, object embedding, base URLs and form destinations. The current CSP is a partial policy. A full script policy requires a reviewed Next.js nonce strategy.

## Environment

| Variable | Meaning |
| --- | --- |
| APP_ENV | development, test or production |
| AUTH_ALLOWED_ORIGINS | JSON array of exact browser origins |
| AUTH_COOKIE_SECURE | false for local HTTP, true for HTTPS |
| AUTH_BFF_SECRET | Private random transport key shared only by Next.js and FastAPI |
| SESSION_IDLE_SECONDS | 1800 by default |
| SESSION_ABSOLUTE_SECONDS | 28800 by default |
| LOGIN_IDENTITY_LIMIT | 5 by default |
| LOGIN_IDENTITY_WINDOW_SECONDS | 300 by default |
| LOGIN_SOURCE_LIMIT | 60 by default |
| LOGIN_SOURCE_WINDOW_SECONDS | 60 by default |

Production validation fails if HTTP origins or insecure cookies are configured. Use at least 32 random characters for the BFF key. Keep `.env` private and excluded from Git. Internal service addresses and this key must never use NEXT_PUBLIC environment names. Changes to Compose environment values require container recreation.

## Production prerequisites

Before production deployment, configure TLS ingress, trusted forwarding headers, internal-only application services, firewall rules, immutable images, dependency and base-image updates, secret storage, monitoring and backups with tested restore procedures. The TLS proxy must strip caller-supplied forwarding headers and set the verified scheme. Restrict direct access to the Next.js and FastAPI listeners.

Use a separate migration owner and a restricted runtime PostgreSQL role. The development role currently owns the database. Production audit access should permit application inserts and authorized reads while preventing routine updates/deletes. Database administrator access requires operational controls. Decide audit retention and archival with company management, and monitor unusual denial/login failure rates. Set an ingress request limit in addition to the application login limits.

MFA, self-service password recovery, external email delivery, device/session management screens, and full production hardening require separate implementation decisions. Administrative password reset is implemented in this phase.

## Administration

Provision the first administrator manually with the documented interactive CLI. Distribute initial/reset passwords through an approved private company channel. Never place passwords in shell arguments, issue descriptions or screenshots. Deactivation is preferred for removing employee access while retaining audit relationships. Accounts are retained through this phase.

The administrator provisioning command refuses when any SUPER_ADMIN exists. The API protects the last active administrator. Recovery after direct database corruption or unauthorized manual edits requires a reviewed operational recovery procedure and backups.

## Migrations and audit preservation

`0002_security` adds the security schema and frozen initial role/permission catalog. `0001_foundation` is preserved. Re-running upgrade at head is safe. The security migration is forward-only to preserve account and audit data. Correct schema changes through a new reviewed migration. DBeaver is used for inspection.

## Verification

Backend integration tests create uniquely named temporary PostgreSQL databases, apply real migrations, exercise the HTTP API, then remove only those databases. Test credentials are randomly generated. They never create an administrator in `ambs_erp`.

```powershell
docker compose exec backend pytest -q
docker compose exec backend alembic check
powershell -NoProfile -File scripts/Verify-AuthIntegration.ps1
```

The live verification script creates an isolated test database and separate API/Next.js containers on the existing private network, with no published test ports. It exercises real HTTP cookies, login, CSRF, authorization, administrative changes, SSR, audit viewing and logout. It captures random test credentials in memory and sends them over stdin to the verifier. Cleanup stops only its generated test containers and removes only its guarded test database. Docker CLI and PowerShell are the host prerequisites.

Browser automation and physical-browser interaction are separate acceptance checks. Follow the manual checklist in the Phase 2 report when the browser bridge is unavailable.


## Source publication and recovery protection

Keep real .env/configuration, private keys/certificates, database archives, customer documents/uploads, traces and runtime data out of Git even when the repository is private. The initial publication audit uses exact configured-secret matching in memory, prohibited-path/binary/size inspection and a maintained redacted Gitleaks scan of selected source and stored Git objects. The staged snapshot is scanned again before commit. No matching secret text is printed.

The verified local backup is outside the repository with restricted NTFS ACLs. Configuration is age passphrase-encrypted and decrypt-and-hash verified without a plaintext temporary file. Database/storage archives contain confidential data and require approved encrypted off-host storage/transport. Keep the age passphrase separately. See BACKUP_AND_RECOVERY.md and GITHUB_BACKUP_SETUP_REPORT.md. No GitHub Actions deployment, Pages or public release is configured by this workflow.
