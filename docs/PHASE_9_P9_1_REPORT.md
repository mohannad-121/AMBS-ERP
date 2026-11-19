# Phase 9 / P9-1 implementation and verification

19 November 2026. **Local implementation for independent owner review only.**
No source is staged or committed. No push, merge, deployment, company migration,
company import, stock adjustment, financial transaction or credential reset occurred.
P9-2 has not started. This report does not accept an outstanding security exception.

## Starting point and isolation

Exact base: `d0e2e64cc9523a2277673b3f73879d85ceb30c2b`, reviewed PR #6.
Local branch: `feature/phase-9a-durable-import-review` in a separate local worktree,
`C:\Projects\AMBS-ERP-P9-1`. The company workspace remains on its original branch
and commit. Its existing untracked readiness plan is preserved byte-for-byte.
The updated active plan lives in the new worktree. Historical reports are unchanged.

Application edits cannot hot-reload the company services because those bind the
original workspace. Independent synthetic PostgreSQL, backend, frontend and browser
containers use an isolated network and new private scratch directories. No company
container was recreated, restarted or stopped. Existing dependency storage was
mounted **read-only** for synthetic frontend checks; its volume identity is unchanged.
The initial Windows-backed scratch PostgreSQL was retained stopped after slow DDL;
bounded disposable PostgreSQL uses a 1 GiB tmpfs instead. No original volume was
removed or altered. Images use new unique review tags, preserving every original ID.

Owner architecture decision is reflected in PHASES.md and PHASE_9_READINESS_PLAN.md:
AMBS-ERP is independent, using company-owned on-premise PostgreSQL infrastructure.
Odoo is permanently out of scope, with no discovery, connector, adapter, API,
synchronization, credential configuration or dependency. Supabase migration/hosting
is excluded. No such service was used or implemented.

## Exact implementation inventory

| Path | Change |
| --- | --- |
| `backend/alembic/env.py` | Register review metadata for migration drift checks |
| `backend/alembic/versions/0010_durable_review.py` | Four additive tables, indexes, immutable-history triggers and isolated downgrade |
| `backend/app/models/import_review.py` | Source, selection revision, validation and decision models |
| `backend/app/schemas/import_review.py` | Bounded, extra-field-forbidden upload/selection/action contracts |
| `backend/app/services/import_review.py` | Private synthetic source retention, validation binding, lifecycle, version checks and decisions |
| `backend/app/api/import_review.py` | Gated durable review metadata API |
| `backend/app/api/onboarding.py` | Advertise synthetic review availability; preserve existing preview endpoints |
| `backend/app/core/body_limit.py` | Bound new upload and metadata request bodies |
| `backend/app/core/config.py` | Default-disabled review flag and private synthetic storage directory |
| `backend/app/main.py` | Register the review router |
| `backend/tests/test_import_review.py` | 29 persistence, lifecycle, security, concurrency and integrity cases |
| `backend/tests/test_security.py` | Update isolated migration-head expectation to 0010 |
| `backend/tests/verify_review_migration.py` | Standalone generated-database additive/downgrade/drift proof |
| `frontend/components/durable-import-review.tsx` | Saved manifests, versions, findings, review and approval history |
| `frontend/components/import-center.tsx` | Integrate the new section only when backend explicitly enables it |
| `frontend/components/import-center.css` | Wrap bounded finding/history content and size review textareas |
| `frontend/lib/proxy.ts` | Exact metadata path allowlist and matching streamed body bounds |
| `frontend/lib/api.ts` | Cancel obsolete durable-review reads during/after sign-out; preserve genuine 401 handling |
| `frontend/scripts/test-dashboard-lifecycle.mjs` | Four deterministic durable-review logout race regressions; existing tests unchanged |
| `frontend/scripts/verify-durable-review-browser.mjs` | Synthetic independent-actor browser acceptance and bounded failure capture |
| `docs/PHASES.md` | Current owner architecture and P9-1 authorization boundary |
| `docs/PHASE_9_READINESS_PLAN.md` | Updated active plan and independent future authorization gates |
| `docs/PHASE_9_P9_1_REPORT.md` | This implementation report |

No dependency, lockfile, company Compose/environment configuration, native business
mutation service or original migration is changed. Next.js temporarily regenerated
`next-env.d.ts` during isolated development; that generated change is excluded from
the final inventory and restored to its reviewed base contents after browser checks.
Raw logs, screenshots, traces, synthetic credentials, source files, database evidence,
scratch environment files and source-scan exports remain in ignored private artifacts.

## Schema, persistence and source identity

New migration: `0010_durable_review`, parent `0009_packing_bom`. It was applied only
to generated disposable PostgreSQL databases. **Company migration remains 0009.**

- `import_review_sources`: manifest UUID, namespace, SHA-256, source format,
  parser/policy versions, authorized uploader and timestamp. A distinct parser/policy
  version can receive the same bytes as a distinct immutable manifest revision.
- `import_review_revisions`: immutable revision UUID, ordinal, worksheet/header span,
  mapping/version/date convention, explicit selected rows/source identities and intended
  future action; state and monotonic optimistic version are the only mutable fields.
- `import_review_validations`: immutable run UUID, exact original/proposed findings,
  result digest, reference digest, complete approval-binding digest, actor and timestamp.
- `import_review_decisions`: immutable reviewed/approved/rejected/cancelled/invalidated
  decisions, bound run, reason and actor. Reasons remain restricted review metadata;
  they are never copied into summary audit events.

New foreign keys reference existing users and the new metadata tables. The migration
does not change old columns, indexes, checks or foreign keys, seed users/permissions,
or write business rows. New history triggers prohibit update/delete of immutable
records and alteration of a selection revision's immutable fields. Downgrade removes
only the new schema, and is tested solely in an empty synthetic migration rehearsal.
It is not authorization to delete retained company review history later.

Synthetic bytes are stored under a server-generated SHA-256 filename in private test
storage, with restrictive creation permissions, exclusive creation, symlink checks,
bounded reads and integrity verification. Original filenames are not persisted or
audited. Missing/corrupted bytes block validation and approval. Production storage,
encryption, retention, access, quotas and disposal need separate owner approval.

## API, RBAC, CSRF and lifecycle

All new routes are under `/api/onboarding/review/sources`:

- `GET` paginated manifest list and `GET /{id}` bounded revision/run/decision detail.
- `POST` receive synthetic source; `POST /{id}/revisions` create immutable selection.
- `POST /{id}/validate`, `/review`, `/approve`, `/reject`, `/cancel` record metadata.

There is no import/apply/execute endpoint or execution state. Intended actions are
inert proposals. Historical packing/delivery selections must be reference-only;
physical stock selections must be review-only. No native business mutation operation
is called. No parallel ledger is introduced.

The feature defaults off and additionally requires `APP_ENV=test` and the actual
session's generated synthetic database name, not merely a configured database label.
Company/production access fails closed before querying the new tables. Upload also
requires explicit synthetic-only attestation. This is an access/operational boundary,
not a claim that arbitrary content can be classified automatically as synthetic.

Existing native authentication, session validation, roles, CSRF and denial architecture
apply. Operations/Super Admin may inspect/review shared synthetic manifests; only a
Super Admin may approve. The approver must differ from both uploader and reviewer.
No permission or role grants were added to company users. This is role-scoped internal
review access, not a new tenant/namespace ownership model.

Lifecycle: RECEIVED → VALIDATED or REVIEW_REQUIRED → READY_FOR_APPROVAL → APPROVED,
with explicit REJECTED/CANCELLED decisions. Rejected/cancelled reviews require a new
selection revision before further validation. Approval confers no execution power.

Approval binds source UUID/hash/namespace, parser/policy, immutable selection/mapping
version/selected rows/source keys/intended action, exact run/results and observed
reference versions. New revisions or runs invalidate prior approvals. Current reference
digests are checked before review/approval; changed references reject stale decisions.
An approved run whose references later change is explicitly ineffective on detail
reads, even though immutable historical approval evidence remains retained.

Selection and approval updates serialize on their source row and compare a monotonic
version. A regression initially exposed a counter-reset defect allowing two serialized
revisions to accept version 1; the final code increments versions across revisions,
and independent-session tests now prove exactly one winner. Concurrent approval is
also tested. Stale writers receive a conflict without overwriting another decision.

Long validation/detail reads reuse repeatable-read, PostgreSQL READ ONLY snapshots
and existing completion-time principal/session revalidation. They do not acquire the
inventory posting advisory lock. Approval is metadata only; its bounded reference
checks use the existing short security transaction and source-row lock. Out-of-band
database mutations are not serialized by application security locks; effective approval
is reference-version-bound, and any future executor must revalidate inside its native
write transaction. No execution consistency guarantee is claimed for this stage.

Successful review audits contain action, actor and UUID only. Decision denials record
stable reason codes/UUIDs. No source rows, values, original filename, mappings,
passwords or source contents enter audit details or application error responses.

## Parser and UI behavior

Existing bounded inert XLSX/CSV parsing is reused unchanged: 4 MiB upload, archive/
expansion/ratio and XML/external-content checks, sheet/row/cell/text budgets, no
formula execution and safe existing CSV exports. Mapping/schema limits are checked
server-side. Up to 100 explicitly selected rows are retained per validation result.
Stable inherited findings cover missing fields/columns, duplicate business identities,
unknown/ambiguous references, unit/relationship conflicts, dates and formulas.
Additional stable findings cover missing/duplicate explicit source identities,
missing selected rows and unsafe proposed action categories. Original/proposed values
are separate JSON fields, never silent edits to authoritative records.

Import Center adds saved manifests, exact source/version identities, selected-revision
configuration, validation findings/history and decisions. It displays **NO DATA HAS
BEEN IMPORTED** and distinguishes ineffective/read-only proposals from approved
metadata. No Import Now, Apply or Execute action exists. Existing design tokens,
fieldsets/labels, accessible status/errors and responsive table scrolling are reused.

History responses are bounded: latest 50 revisions, 20 validation runs and 50 decisions
for the current revision; list pages are 20 by default and at most 50. These are review
budgets, not an unlimited archival browser. Older full-history browsing, multi-file
dependency plans, execution receipts and cross-batch execution idempotency are future
scope requiring separate design/approval.

## Fresh verification

The final backend source passed **404 tests** in isolated PostgreSQL:

| Fresh group | Result |
| --- | --- |
| Sales/routing/packing/master/dashboard/archive/health/CLI | 144 passed, 476.30 s |
| Purchasing/inventory/inventory review/security/onboarding | 152 passed, 574.97 s |
| Reporting/review concurrency/dashboard consistency/P9-1 | 108 passed, 553.58 s |
| Included P9-1 cases | 29 passed; real PostgreSQL, independent sessions/actors |
| Standalone additive migration rehearsal | PASS: 70 → 74 → 70 → 74 tables, unchanged original schema/data apart from expected migration bookkeeping; no final drift |
| Fresh isolated final-schema Alembic check | No new upgrade operations detected |

Earlier failed test runs are preserved: invalid synthetic fixture role, route-inspection
API assumptions, incomplete synthetic customer setup, missing JSON logout body and
old expected migration head were corrected. The concurrency-counter failure was an
actual implementation defect fixed as described above. Final passes are fresh, not
inherited Phase 8 evidence.

Frontend final checks, production builds, browser results and final preservation
seal are recorded in the completion section below. No timeout was increased.

## Browser findings and targeted logout correction

The initial new browser flow passed independent review/approval but exposed a viewport
synchronization issue following full-page screenshots. Measured immediate widths
included 524–530 px for a 390 px viewport; the unchanged overflow predicate became
true after approximately 38–54 ms of actual layout. The new test waits for that same
predicate under its existing 60-second limit, then asserts it. No arbitrary sleep,
weaker layout assertion, error suppression or application indicator change was used.
An ambiguous new heading selector was narrowed to the intended level-one heading.

More importantly, the unchanged legacy Phase 8A scenario and a bounded diagnostic
reproduction both timed out at logout. Captured evidence showed logout HTTP 200,
then new manifest-list requests, 401 responses roughly 300 ms later, aborted `/login`
navigation and a final `/unauthorized` URL. This was a real integration race introduced
by adding the manifest list; it is distinct from the historical protected-route issue.

The correction extends the existing dashboard-read cancellation mechanism only to
durable-review GETs. It cancels obsolete reads, blocks new durable reads during and
after successful logout until a subsequent successful login, restores availability
if logout fails, and checks cancellation before processing late response JSON.
Genuine authentication failures still redirect and reject. Four deterministic tests
exercise cancellation, late 401, genuine 401 and failed-logout recovery. Existing
dashboard and unrelated-request behavior remains covered by its original tests.

The final P9-1 Chromium workflow passed **16 checks** after that correction, covering
synthetic upload/selection, durable findings across refresh, separate reviewer and
approver, approved-but-non-executable metadata, desktop/mobile overflow, `/audit`,
`/system`, `/imports`, logout and zero console/React/hydration errors. Database
comparison before/after that flow changed only four review tables plus normal
authentication/audit/rate-limit metadata; no unexpected business table changed.

## Preservation, recovery and security

Company baseline/final comparison verifies all **70 fingerprints unchanged**, including
users, credentials, stock, ledger, reservations and business records. Company head
remains `0009_packing_bom`. Existing 24 container identities/configuration/start times,
19 volumes with full metadata and all 58 original image IDs are retained. Company
PostgreSQL/backend/frontend are healthy. Original private environment, image storage,
original readiness evidence, Git HEAD and PRs #2–#6 remain unchanged. Additional
synthetic containers/images are explicitly separate, not replacement company resources.

Recovery verification: 69 Phase 8C checkpoint artifacts, 6 partial migration artifacts
and 17 non-VHDX cold-backup artifacts were freshly SHA-256 checked. The retained cold
image's sealed size/mtime and prior complete SHA-256 evidence match; that large image
was not fully rehashed again in this stage. Prior isolated restore evidence is verified;
no company restore or fresh company backup/restore is claimed. All historical backups
remain in place. C:/D:/E: are partitions of one physical disk, so these copies do not
protect against physical disk failure.

Source-tree and complete Git-history secret scans passed with redaction enabled.
No credentials, environment files, original workbooks, company rows, database dumps,
backups or raw generated evidence are source candidates. The final report/inventory
and empty staging area receive a final audit before completion.

Fresh `npm audit` returned zero listed advisories. **The picomatch exception remains
OPEN**: registry audit output alone does not establish remediation of bundled/vendored
framework code. No dependency/compatibility patch was removed, version forced,
advisory suppressed or owner risk acceptance inferred.

Historical protected-navigation timeouts remain unresolved. Successful current runs
do not prove their root cause fixed. No company shutdown-timeout activation occurred.

## Completion seal and acceptance assessment

**CONDITIONAL GO for independent local P9-1 review. NO-GO for company schema
application, real imports, deployment or P9-2 without separate authorization.**

- Fresh backend: all 404 cases passed (144 + 152 + 108), including 29 P9-1 cases.
- Fresh TypeScript and ESLint: passed, including the final logout correction.
- Frontend checks: compatibility 3/3, exact quantities 14/14, dashboard/logout lifecycle
  9/9 (five existing plus four new deterministic race cases).
- Final backend and standalone frontend production images built successfully using
  unique review tags; no existing tag/image was replaced. The final frontend build
  took 86.75 s. Build compatibility checks also passed. Production images were built,
  not deployed; no production-environment browser run is claimed for this stage.
- Final P9-1 Chromium workflow: 16/16, 58.12 s; no unexpected business-table change.
- Unchanged complete Phase 8A Chromium scenario, rerun against a fresh synthetic
  database after the correction: 44/44, 51.33 s. Logout, subsequent login, formula-safe
  export, source limits, role isolation and 390/360 px layouts passed with no console,
  React or hydration errors. Initial failures and diagnostic evidence remain private;
  the pass is supported by the deterministic race tests, not a retry alone.
- A restart of only the disposable backend preserved all 74 synthetic database
  fingerprints, three source manifests, three approved revisions, three validation
  runs, six decisions and all retained source hashes. No company container restarted.
- Additive/downgrade migration proof and isolated schema drift checks passed.
- All 70 company fingerprints and original resource/configuration/recovery evidence
  passed preservation checks. No new company migration or restore was performed.
- Generated next-env changes were excluded; exactly 23 reviewed source/documentation
  paths remain local. Staging is empty, and HEAD remains the verified base.
- Source/history secret/privacy scans and the final report/tree audit must remain
  passing evidence for this review checkpoint; raw evidence is outside Git.

The independent migration/code review, synthetic-only boundary, production storage
policy, historical protected-navigation uncertainty and OPEN picomatch exception
prevent unconditional release/production acceptance. Stop for owner review.

## Owner decisions and proposed next scope

Independent code/schema review is required. Production source storage/encryption,
retention/access/quotas/disposal, real reviewer delegation, namespaces/stable keys,
actual mappings/conflicts, physical cutoff/count/lot/serial/custody policy, financial
policies and dataset-specific execution remain unapproved. No new financial policy
or actual company source is inferred from synthetic validation.

Recommended P9-2, **not implemented**: separately authorize design and synthetic
rehearsal of native master-data transaction/idempotency receipts, cross-source keys,
conflict handling, crash/retry recovery and pre-write revalidation. No stock/finance
executor or real-data execution is implied. Stop here for independent owner review.
