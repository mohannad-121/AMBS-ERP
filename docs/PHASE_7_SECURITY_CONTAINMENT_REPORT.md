# Phase 7 security containment

Date: 2026-11-18. Branch: `feature/phase-7-packing-bom`. PR #2.

Publication follow-up: [PHASE_7_CONTAINMENT_CHECKPOINT_REPORT.md](PHASE_7_CONTAINMENT_CHECKPOINT_REPORT.md) records the subsequently authorized development checkpoint, fresh verification and new PostContainment backup. The implementation-stage no-publication statements below describe that earlier handoff; owner risk acceptance, merge and deployment remain unauthorized.

## Decision

**Containment implemented; advisory OPEN; owner acceptance NOT granted.** No commit, push, merge, deployment or Phase 8 work was performed. The existing development stack remains a development stack. A separate production candidate was tested using fresh synthetic data, never the real administrator.

The [GitHub advisory](https://github.com/advisories/GHSA-fc5q-39xc-vjpf) still lists picomatch `<=4.0.7` as affected and **no patched version**. A fresh registry lookup still returns `4.0.7`. This work reduces reachable attack paths and confines services; it does not repair the upstream regular-expression implementation or prove zero risk.

## Changes

| Files | Purpose |
| --- | --- |
| `frontend/next.config.ts` | Standalone production output; disable the unused image optimizer; empty application image allowlists; explicitly disable production browser source maps. Existing router patches, security headers, development indicator and credential-URL logging protection remain intact. |
| `frontend/Dockerfile.production`, `frontend/scripts/production-start.cjs` | Build with the existing locked dependencies and compatibility checks; ship traced standalone output and static files only. Run as `node`, load the BFF secret from a file, remove runtime npm/yarn installers. |
| `backend/Dockerfile.production`, `backend/requirements.runtime.lock`, `backend/production_start.py` | Separate non-root production image; exact 40-package runtime subset of the existing 46-package lock, retaining hashes and versions. Exclude pytest, pypdf and their test-only dependencies; verify dependency consistency during build. Load secrets from files; refuse database superusers, database/table owners, owner-role members and public-schema CREATE privilege. No automatic migrations, administrator provisioning or credential changes. |
| `compose.production.yaml`, `deploy/nginx.conf`, `deploy/production.env.example` | Separate opt-in candidate with distinct volumes, TLS-only non-root ingress, no database/backend/frontend host ports, private networks, read-only roots, bounded tmpfs, dropped capabilities, no-new-privileges and CPU/memory/PID limits. PostgreSQL runs as UID 70; backend as 10001; frontend as node; gateway as 101. |
| Docker ignore files | Exclude environment files, keys, certificates and encrypted material from build contexts. |
| `frontend/scripts/glob-observer.cjs`, `test-glob-containment.cjs`, `verify-containment-browser.mjs`, `backend/tests/containment_fixture.py`, `scripts/verify_security_containment.py` | Bounded artifact and live HTTPS regression checks with generated test credentials and a fresh, isolated database cluster. Observer delegates unchanged to the installed matcher; it is mounted only in QA, not shipped as a runtime mitigation. |
| `frontend/scripts/verify-packing-browser.mjs`, `frontend/eslint.config.mjs` | Permit an explicit QA base URL/self-signed test certificate in all test contexts; retain default development behavior. Permit CommonJS imports only for Node `.cjs` scripts. No console/error/advisory reporting is suppressed. |

Production base images are pinned to the exact tested Node 24 bookworm-slim, Python 3.13-slim, PostgreSQL 17-alpine and nginx-unprivileged image digests. Existing development Dockerfiles and `compose.yaml` are unchanged. No Next.js, React, npm dependency, existing Python package version or migration was upgraded/downgraded. The new runtime lock removes only `pytest`, `pypdf`, `iniconfig`, `packaging`, `pluggy`, `pygments`; the existing complete lock remains unchanged.

## Dependency and artifact trace

The complete 15 dependency/optional-peer paths in [PHASE_7_SECURITY_REVIEW.md](PHASE_7_SECURITY_REVIEW.md) were retained and checked against the unchanged package lock and a fresh installed tree. They resolve to:

* Next ESLint plugin -> fast-glob -> micromatch -> **picomatch 2.3.2**.
* TypeScript ESLint parser/plugin/type-utils/utils -> typescript-estree -> tinyglobby -> **picomatch 4.0.7**, including fdir's installed peer.

These packages remain in the development/build installation. They are absent from the actual final standalone runtime, as are ESLint, TypeScript, typescript-eslint, tinyglobby, fast-glob and micromatch. The runtime `/app` tree measured approximately **56 MB**. This is a practical traced runtime, not a claim that every retained framework byte is indispensable.

Actual image filesystem inspection, not just npm audit, found Next **16.4.6**, React/ReactDOM **19.3.1**, and the unversioned `next/dist/compiled/picomatch/index.js` with SHA-256:

`607dc79784c1161c33076903769dba23e63d9d9ccfe3c4695a32ebe3a5ab892d`

Its metadata does not state the upstream picomatch version; fixed status is not inferred. It is conservatively retained as potentially affected. The final traced tree retains references in middleware validation, middleware/trace-entrypoint build plugins and shared local/remote image matchers. It also retains `compiled/@vercel/nft/index.js`: inspection shows that bundle **requires the same external compiled picomatch**, rather than carrying a separate identifiable implementation. Its retained caller is the build trace-entrypoint plugin. The fuller development installation additionally contains build/index and collect-build-traces references described in the earlier review.

A recursive signature/reference scan covered runtime node_modules, generated server artifacts and browser/static chunks. It found one identifiable matcher implementation, the vendor file above; no application/browser chunk containing that implementation was identified. Signature scanning cannot prove absence of all transformed or future embedded copies. No vendor files were deleted, edited or represented as patched. Build/plugin files retained by Next's tracer were left intact for compatibility.

## Application attack paths

| Input/path | Finding and containment |
| --- | --- |
| `/_next/image` URL/hostname/path/query | Actual Next server checks `images.unoptimized` before `ImageOptimizerCache.validateParams`. Direct candidate requests return 404; TLS edge separately blocks this endpoint. Next normalizes the empty local allowlist into its two fixed `/_next/static/{media,immutable/media}/**` patterns. These are framework constants, not user values; unoptimized mode closes the endpoint before they are used. |
| Authenticated item images | Continue through the BFF and Python image API, using UUID-generated storage keys and fixed extension validation. Valid tiny PNG upload/read succeeded. Supplying a filename field or PDF MIME type to the real upload route returns 422. Image decoding/re-encoding and bounds remain intact. Original client filenames are not accepted as storage paths or glob patterns. |
| Item names/database values | A bounded string containing `*`, `?` and brackets was created, queried and read back through the production HTTPS API. It remained data. ORM filtering uses bound SQL expressions; no glob compiler is called. |
| Searches, API parameters, request paths | BFF allowlists are fixed source regular expressions. API names/identities remain validated, parameterized Python/SQL inputs. Bounded marker values in search/request parameters did not become matcher patterns. |
| Packing/BOM/material planning/delivery PDFs | Existing workflows use typed identities, Decimal arithmetic, fixed renderer code, escaped text and protected image identities. They do not compile business values as globs or evaluate uploaded document templates. Official PDF generation/download, approval, shortage calculation, permissions and restart persistence passed in the isolated production candidate. |
| Uploaded documents/filenames | There is no arbitrary uploaded-document/template execution endpoint in Phase 7. Existing image schema forbids extra filename fields and unsupported document MIME types. Generated PDF filenames are server-controlled. Future document-import features require a fresh review. |
| Middleware, build tracing, ESLint and TypeScript patterns | Patterns come from reviewed source/configuration and framework constants. No request, database or upload-to-build/configuration bridge was found. Upload storage is confined to the backend volume, outside frontend build inputs. Building malicious source/configuration remains a possible availability attack on the build environment. |
| Developer/debug endpoints | Production uses the generated standalone server, never `next dev` or reload-enabled Uvicorn. Image optimizer, Next HMR and original-stack debug endpoint return 404 directly from the candidate server. Edge also blocks Next debug paths and API documentation paths; backend production mode disables OpenAPI/docs. Plain HTTP access to the production BFF authentication API is rejected with 426. Development reporting/HMR are preserved. |

The live test-only observer records matcher pattern arguments while preserving original behavior. A bounded `trusted-control/**` compilation in the server process proves the observer is active. No `__AMBS_UNTRUSTED_GLOB__` pattern appeared during exercised HTTP/business flows, including valid upload/read and database-backed item text. No denial-of-service pattern, stress payload or real-user login was used. This is evidence for identified callers and exercised entry points, not proof about all framework internals or untested future code.

## Isolation and deployment boundary

The tested production candidate has three internal networks: gateway/frontend, frontend/backend, and backend/PostgreSQL. Only the TLS gateway publishes a host port, defaulting to loopback. Frontend has no external egress or database network. PostgreSQL has no external network or published port. The backend has an explicit outbound network for ORS routing; **that bridge does not enforce a hostname allowlist**. A host/firewall/proxy egress policy is required before real deployment if company policy requires ORS-only Internet access.

The application startup guard rejects owner/superuser database credentials; the rejection and successful use of a separate non-owner role were tested in the disposable cluster. QA grants are intentionally synthetic fixtures, not an approved production access-provisioning script. Production role/table/sequence grants, backup recovery, certificate trust, internal DNS, monitoring, patch maintenance and host controls remain operator responsibilities. File secrets avoid secret-bearing image layers/Compose values, but a container process that needs a secret can read its own mounted secret. Docker isolation does not remove a Node event-loop denial-of-service defect; limits restrict its container's resources rather than guarantee availability.

To review configuration without deployment, provide an **external private** env file containing paths and explicit HTTPS origins, then run:

```powershell
docker compose --env-file C:\private\ambs-production.env -f compose.production.yaml config --quiet
```

Do not combine this file with development Compose. Do not attach existing development/business volumes to test it. New production volumes are deliberately separate; this candidate does not copy, migrate or replace live business data. Real deployment requires an explicitly planned restore/migration and an operator-provisioned non-owner runtime role. There is no automatic initialization of an administrator or business schema. Missing prerequisites fail closed. No real deployment was attempted.

To repeat the bounded QA, build the two `Dockerfile.production` images tagged `ambs-containment-frontend:qa` and `ambs-containment-backend:qa`, ensure the existing development backend/browser test images are available, and run `python scripts/verify_security_containment.py`. OpenSSL must be on PATH, or set `OPENSSL_EXECUTABLE` to its local executable. It creates only uniquely named `ambs-containment-*` resources and `ambs_http_test_<uuid>` data, seeds generated test credentials, verifies production HTTPS behavior, then removes that run's disposable resources. The self-signed certificate exception is opt-in and confined to the QA browser context; production TLS validation is not disabled.

## Verification results

| Gate | Result |
| --- | --- |
| Backend suite | **244 passed**, 0 failures/errors; 907.99 seconds, JUnit captured. Tests use guarded scratch databases. |
| TypeScript / ESLint | Both passed; no warnings. |
| Existing Next compatibility checks | All 3 guards passed; CJS and ESM installed-runtime browser checks passed during the fresh development run. No router compatibility patch changes. |
| Focused artifact regression | 2 bounded Node tests passed: observer positive control/input boundary and actual production configuration/runtime-package inventory. |
| Production builds | Both pinned multi-stage images built successfully, with explicit subprocess exit code 0. Frontend Webpack build succeeded; backend hashed installation and `pip check` succeeded. |
| Fresh development Chromium | **86** premium UI checks + **28** Phase 7 checks + **12** after restart, including role views, documents, BOM/planning, responsive routes, logout/login. No console warnings, React/runtime or hydration errors. |
| Actual hardened production candidate | Dedicated generated test administrator and synthetic data; real HTTPS/Secure-cookie production mode. Direct Next optimizer/debug closure, HTTP auth rejection, CSRF, private ports, read-only roots/non-root/capabilities and owner-credential refusal passed. Bounded item/database/request/upload checks passed. **28 + 12** packing/BOM/planning/document/RBAC/persistence Chromium checks passed with no console warnings/runtime/hydration errors. |
| Live glob observation | Trusted server-process positive control detected; no untrusted marker compiled as a pattern. Full traces retained privately. |
| npm audit, full development tree | **12 HIGH findings remain**. This is an unresolved advisory/meta-vulnerability result, not a passing security gate. |
| npm audit, production dependency classification | 0 reported findings; does not account for unversioned Next vendor code. Actual artifact inspection is recorded separately above. |
| Python audits | 46-package full lock: 0 known findings; 40-package runtime subset: 0 known findings. |
| Secret/source review | Configured-secret variant scan of 238 candidate files and all 677 stored Git objects: no findings. Redacted Gitleaks v8.30.1 source and all-branch history scans: both exit 0, no findings. |
| Migrations | Live `0009_packing_bom (head)`; `alembic check` reports no new upgrade operations. All migrations also ran on each fresh isolated production-QA database. No migration files changed. |
| Main data and configuration | All **70 table fingerprints unchanged** using the existing backup-inventory method (normalizes session last-seen timestamps). User/credential and business-row fingerprints are preserved. Private `.env` hash matches the prior release; no secret values printed. |
| Existing backup | Core and release-supplement manifest hashes unchanged; all **18** referenced artifacts rehashed successfully. Encrypted environment, database dump, source archives and image archive remain intact. Prior restore/decryption verification is preserved; no new decryption prompt or real-database restore was performed. |
| Running application | Original backend, frontend and PostgreSQL healthy after testing. All temporary containment clusters/volumes removed; no deployment. Generated retired QA secret files removed. |

Ignored verification evidence is under `artifacts/containment-*` and `artifacts/containment-audits/`. The final pinned-image HTTPS run is `artifacts/ambs-containment-f6d1563e32a74d0ca0862b72ace1a534/` with `result.json`, `verification.log` and `runtime-glob-trace.jsonl`. Its console output is `artifacts/containment-qa-verified.log`. The development log is `artifacts/containment-development-browser.log`; backend results are `artifacts/containment-backend-tests.{log,xml}`. Artifact inventories include `containment-production-artifact.json`, `containment-full-artifact-signatures.json`, `containment-nft-callers.json`; preservation evidence is `containment-preservation.json`. These are private local evidence, not repository release artifacts or permission to publish credentials/data.

The preserved pre-containment backup is `C:\AMBS-Backups\AMBS-ERP\AMBS-ERP-PostPhase7-20261117-234909`. Its core manifest SHA-256 remains `3ebd6114e35e7b8fcaa3ff85729ab09d3e44aeeeb13f2469a8ef8ab15580b566`; release supplement remains `0d257f1cef809197eaf8efa281295a87b551ddd250556ec06901b39009633c29`. At the implementation handoff the containment diff was intentionally uncommitted and absent from that older backup/release commit. The separately authorized checkpoint below preserves it in a new backup and feature-branch commit.

## Remaining risk and next release step

**No zero-risk or remediation claim.** The advisory remains open in developer/build tooling and a potentially affected framework vendor implementation remains in the production artifact. Identified user-controlled pattern paths are closed or were ruled out by source/artifact tracing and bounded tests. This does not prove that a future Next feature/configuration change, dependency compromise, malicious developer glob or new application entry point cannot expose it.

The production candidate demonstrates application/network/privilege containment in a disposable environment. The existing running development environment has not become a hardened production deployment. OS/base-image vulnerability scanning and host infrastructure certification are not included in npm/pip results and must be performed before production approval. Image digest pinning gives reproducibility, not permanent security.

Next step: review the containment changes and checkpoint evidence, then obtain an explicit owner/security decision on the OPEN advisory **before merge**. If the company does not accept the bounded residual vendor/build availability risk, hold PR #2 until compatible official picomatch/Next fixes exist and are verified. Otherwise document the exact scoped exception, expiry/review date and production prerequisites before any separately authorized release operation. No acceptance, merge readiness without that decision, or deployment authorization is inferred here.
