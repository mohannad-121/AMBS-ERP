# Phase 8 post-integration hardening checkpoint

Date: 19 November 2026. **Verified for owner review, with the recorded limits below; no publication authorization.**
This is development verification, not production acceptance, security-risk
acceptance or permission to begin Phase 9. The internal picomatch exception remains
**OPEN**. No real company records were imported or adjusted.

## Implementation review

The reviewed application changes address two dashboard findings and their logout
lifecycle consequence. Development container changes address signal forwarding
and a newly reproduced Next.js child-shutdown timing gap. No migrations, financial
transactions, stock posting rules, ledger model or unrelated business logic changed.

**Supplier overdue schedule.** Dashboard and reporting now share the existing
supplier due-date expression. The newest revision is selected by `created_at
DESC, id DESC`; within that revision, ETA takes precedence over confirmed date,
then requested date. An absent/undated newest revision falls back to the original
expected date, without searching older revisions. Missing dates do not invent an
overdue finding; due today is not overdue. Existing confirmed/partially-received
restrictions remain. One captured time supplies the response timestamp and Dubai
supplier business date. Reporting semantics and production's separate original
expected-finish definition are unchanged.

**Consistent dashboard reads.** The entire response uses the established fresh
PostgreSQL `REPEATABLE READ / READ ONLY` snapshot, including cards, queues,
inventory, demand and activity. No inventory-posting advisory lock is acquired.
Initial authentication/session metadata commits before admission; the shared
guard rejects pending business writes. The snapshot rolls back and releases its
connection on every exit. Account, session, permissions and roles are reloaded
under the existing short security lock before protected results return.

Admission is bounded to three dashboard snapshots per worker, separately from
two existing long-review slots. Existing pool size and five-second statement /
ten-second idle-transaction limits are unchanged. Tests pause all five readers
and prove a writer commits before they resume; excess readers receive retryable
429 responses. These are bounded local measurements, not a global connection
reservation or production throughput guarantee.

**Logout race.** The client cancels outstanding dashboard reads before logout
revokes the session, and rejects new dashboard reads while logout is pending.
This prevents obsolete read responses from replacing successful logout with a
late unauthorized redirect. Tracking is released in `finally`, including failed
logout. Genuine dashboard 401 responses, CSRF preparation, timeouts, unrelated
requests and server-side revocation remain enforced. No console/error suppression
or permission bypass was introduced.

**Development shutdown.** Compose replaces its setup shell with direct Node/Next
execution; the development Dockerfile uses the equivalent exec-form CMD. Webpack,
polling, non-root execution, existing ports/volumes and compatibility patches remain.

Fresh strengthened verification uncovered another limit: Next 16.4.6's default
**100 ms** child cleanup budget can kill a slow server child while the CLI/container
still exits **0**. The initial observed run failed its second cycle's child-cleanup
assertion; this failure is retained and is not counted as a pass. A bounded
250 ms child signal-handling delay then reproduced a live-child **SIGKILL** with
container exit 0, confirming the fallback mechanism independently of exit 137.

The proposed development settings now give the installed Next CLI
**`NEXT_EXIT_TIMEOUT_MS=5000`**, in Compose and the development image. Five isolated
candidate cycles passed: three with the 250 ms delay and two without it. Each
proved server cleanup/exit **143**, parent exit **0**, no live-child SIGKILL and
no OOM; shutdowns took **0.375–0.767 s** within a ten-second Docker stop budget.
This uses an existing version-specific Next option, without a library patch or
dependency change. Recheck it during future framework upgrades. It cannot prove
that an arbitrarily hung child will never need termination.

**Activation limit:** the existing company frontend was deliberately not recreated
for this review checkpoint. Its configured launch command already includes the
earlier exec correction, but its environment still lacks the new five-second
budget. Owner approval and a controlled frontend-only recreation are needed to
activate that additional setting. The new budget is verified in isolated QA;
it is not claimed as active in the retained company container.

## Exact proposed change inventory

Published base and current unchanged HEAD:
`53235521b834c2dd8649082be6c5ecd19db39d98`.

| Status | Path | Review purpose |
| --- | --- | --- |
| Modified | `backend/app/api/dashboard.py` | Complete read-only snapshot and authoritative supplier date |
| New | `backend/app/services/schedule_dates.py` | Shared existing due-date SQL/timezone |
| Modified | `backend/app/services/reporting.py` | Reuse unchanged shared expression |
| Modified | `backend/app/services/review_snapshot.py` | Optional internal admission semaphore; retain default review behavior |
| New | `backend/tests/test_dashboard_consistency.py` | 24 PostgreSQL schedule, snapshot, capacity and revocation cases |
| Modified | `compose.yaml` | Direct Next launch and verified development child cleanup budget |
| Modified | `frontend/Dockerfile` | Equivalent direct development CMD and cleanup budget |
| Modified | `frontend/lib/api.ts` | Dashboard request cancellation around logout |
| Modified | `frontend/package.json` | Add dashboard lifecycle test command; no dependency changes |
| New | `frontend/scripts/test-dashboard-lifecycle.mjs` | Five tests of actual typed API-helper behavior |
| Modified | `docs/DASHBOARD_METRICS.md` | Exact corrected definition, snapshot limits and link to this checkpoint |
| New | `docs/PHASE_8_POST_INTEGRATION_CHECKPOINT.md` | Sanitized review and verification summary |

The proposed PR contains exactly these **12 paths**. No lockfile, migration,
production Dockerfile or original business file is included.

## Private/local inventory and publication boundary

The initial worktree had eight modified and seven untracked paths. Four existing
untracked reports contain detailed local diagnostics/recovery information:

- `docs/DOCKER_STORAGE_MIGRATION_REPORT.md`
- `docs/FRONTEND_GRACEFUL_SHUTDOWN_REMEDIATION.md`
- `docs/PHASE_8_DASHBOARD_REMEDIATION_REPORT.md`
- `docs/PHASE_8_INTEGRATION_AUDIT.md`

All four remain **in place, byte-for-byte preserved**, with local-only exclusions
in `.git/info/exclude`; that file is not part of the PR. Their required recovery
content was not removed or silently rewritten. This checkpoint provides sanitized
conclusions, and the metrics documentation links here so the proposed tree does
not depend on an excluded report.

Raw logs/XML, failed-run traces, exact source inventories, dependency/build output,
temporary index, machine diagnostics and secret-scan reports stay in ignored
`artifacts/`. Private QA source/caches, recovery archives and encrypted configuration
remain outside the proposed tree. A complete per-file ignored-worktree inventory
was recorded privately; it includes dependency files, generated evidence, private
configuration and local reports. No original workbook, prototype data, validation
export, database dump or environment file is proposed for publication.

The successful host Docker disk relocation was verified separately. It is **host
infrastructure work, not an application feature**; this task did not repeat it.
Its disk paths, backup locations, container diagnostics and raw recovery evidence
are intentionally absent from the proposed public tree.

## Fresh regression evidence

| Verification | Executed result |
| --- | --- |
| Backend group A | 144 passed; 518.50 s pytest time |
| Backend group B, including authentication | 152 passed; 625.91 s |
| Existing reporting/review concurrency | 55 passed; 276.08 s |
| Dashboard PostgreSQL regressions | 24 passed; 144.47 s |
| Complete backend coverage | **375 passed, zero failures/errors/skips**; compared against fresh collection |
| Unmodified independent cross-phase probes | **7 passed**, including both former dashboard failures |
| TypeScript / ESLint | PASS |
| Next compatibility | 3 passed; CommonJS/ESM router checks also passed in browser harness |
| Quantity helpers / dashboard logout lifecycle | 14 passed / 5 passed |
| Backend production build | PASS |
| Frontend production build | PASS; rebuilt after the final development Dockerfile setting |
| Development authentication / HTTP BFF | 24 / 20 checks passed |
| Phase 8A browser / restart | 44 / 8 checks passed |
| Phase 8B browser / restart | 15 / 12 checks passed |
| Phase 8C browser / restart | 24 / 23 checks passed |
| Development browser cohort total | **170 checks passed**; assertions/deadlines unchanged |
| Proposed shutdown budget | Five observed graceful cycles passed; failed baseline and positive control retained separately |

All database mutations used uniquely named disposable synthetic databases. No
real administrator credentials were used. Browser orchestration reused installed
images and read-only dependencies, with private isolated source/cache/storage
binds; it exercised the existing browser assertions without weakening them.
Development functionality was checked against unchanged application code; the
new shutdown budget was checked separately in the instrumented candidate runs.

Dashboard writer completion while readers remained paused, in milliseconds:
dispatch **308.58**, reversal **131.05**, reservation **65.92**, consumption
**104.82**, receipt posting **64.86**, supplier schedule **44.10**, and the
three-dashboard/two-review capacity case **177.81**. All met the unchanged
three-second deadline. Tests also prove before/after snapshot consistency,
ledger effect counts/idempotency and account/session/role revocation rejection.

Earlier full-suite, hardened HTTPS, premium/packing browser and migration evidence
remains preserved privately. Those older runs are not claimed as fresh checks
for this operation. Phase 7 receipt/packing/BOM/production relationships have fresh
coverage in the backend suite and connected cross-phase probes.

## Security and preservation gates

Final exact proposed-tree, preservation and backup results are recorded in the
private verification manifest. No publication occurs in this operation.

The initial source and empty real-index scans passed with no findings. Independent
redacted Git-history scanning and private-history path checks also passed. The
exact 12-path proposed tree passed its separate secret/history audit using an
**alternate index**; the real index remains unchanged and unstaged. Automated
secret scans supplement manual review; they are not proof that arbitrary future
data cannot contain a secret. Final document changes are bound by the final
alternate-index audit and evidence manifest.

All **70 table fingerprints were compared**. **67 match**, including users and
credential hashes, stock ledger, reservations and business records. The initial
strict equality gate failed on `audit_events`, `sessions` and `login_rate_buckets`.
Read-only investigation found one successful non-test-account login during the
verification window, with its anonymous/authenticated session and rate-limit
effects. The owner explicitly confirmed that login. Those legitimate records
were retained; no deletion, credential change or silent baseline replacement was
used to manufacture a match. **All 70 unchanged is not claimed.** Exact counts,
times and identity evidence remain private. The fingerprint method excludes
session-last-seen timestamps only.

The **four existing container IDs and their runtime images/configuration**,
**19 original volumes with complete metadata**, private environment and item
storage passed comparison. The migration head is `0009_packing_bom`, with no
schema drift. Required production builds replaced the two existing QA image IDs
under `ambs-containment-backend:qa` and `ambs-containment-frontend:qa`; 56 other
original image IDs remain, and the total is still 58. Old QA IDs are not claimed
as present in the active store. No image-delete/prune command was run; previous
QA artifacts remain represented in the verified cold recovery image. No company
container was recreated, and no original volume was removed.

Recovery verification passed for **69** existing SQL/source checkpoint artifacts,
**six** earlier partial-checkpoint artifacts and **18** cold-checkpoint artifacts,
including a **fresh full SHA-256 read of the cold data image**. Earlier isolated
SQL restore proof is retained; **no new restore or environment decryption is
claimed here**.
Recovery copies share one physical disk, so they do not protect against physical
disk failure. Additional independent/off-host recovery capacity remains required.

The repository currently reports **PUBLIC**. Visibility is the owner's existing
decision and is unchanged; publication would expose the proposed source publicly.
The picomatch exception remains **OPEN** regardless of audit counts. No dependency
upgrade, warning suppression or security-risk acceptance occurred.

## Proposed PR structure

- Proposed branch: `feature/post-integration-hardening` — **not created**.
- Base branch: `feature/phase-8c-operational-reporting`, exact base commit above.
- Proposed title: **Harden dashboard snapshots and frontend shutdown**.
- One focused follow-up PR containing only the 12 reviewed paths. Explain the
  stale supplier queue, mixed-snapshot dashboard, logout redirect race, direct
  signal path and newly verified child cleanup budget; attach sanitized results.
- PRs #2–#5 remain open at their original bases/heads, auto-merge disabled.
  No retarget, merge, commit, push or repository-setting action is authorized.

The checkpoint permits independent review only. A later publication request must
recheck the base/head, exact staged content, source preservation and visibility.
Applying the additional development timeout to the retained container is a
separate controlled activation step, not an effect of creating this document.

## Phase 9 readiness

Reviewed `PHASES.md`, `PHASE_8_DATA_MAPPING.md`,
`PHASE_8_OWNER_APPROVAL_CHECKLIST.md` and `PHASE_8C_FINANCE_DECISIONS.md`.

| Already established | Still requires approval or separate implementation |
| --- | --- |
| RBAC, sessions/CSRF, audit and controlled operational workflows | Named owners/operators, acceptance criteria and sign-off responsibilities |
| Bounded inert Excel/CSV preview, mapping proposals, validation and safe reports | Authoritative file revision/hash, sheet/header/date meanings and exact permitted row scope |
| Duplicate/reference detection and read-only stock reconciliation | Approved customer/project/LPO identities, SKU/unit mapping and duplicate/overlap policy |
| Independent global item journey and authoritative operational reporting | Current accountable physical count; explicit opening/adjustment authority; missing historical actors/locations must remain missing |
| Synthetic connected acceptance and concurrency checks | Real-source acceptance examples, representative load targets, migration rehearsal and approved rollback/cutover procedure |
| Recovery artifacts and development infrastructure verification | Independent off-host recovery, restore drill/RPO/RTO, production security and release approval |

Phase 8A is **preview-only**, not an implemented write-import pipeline. Persistent
import batches, commit/idempotency/source-ID handling, recovery/replay procedures
and any actual import require a separately approved scope and implementation.
The packing workbook is primarily a print template. Delivery tracker status/date,
LPO/SKU/driver/unit/quantity relationships need owner confirmation. Historical
deliveries must not generate new stock issues; engineering BOMs cannot be inferred.
Odoo/source-system access and integration contracts remain unconfirmed dependencies.

Some Phase 8A checklist wording describes Phase 8B/global-journey gaps as they
stood at that earlier phase. Later approved Phase 8B supplies independent global
journey/reconciliation views; this does not approve spreadsheet identities,
historical events, business data or stock adjustments.

Finance decisions remain unapproved: accounting boundary/COA, segregation of
duties, invoice triggers and numbering, AR/AP/payment rules, currencies/rates,
period cutoffs, taxes, costing/valuation, recognition, historical balances and
financial reconciliation/retention. Owner/accountant evidence is needed before
dependent financial development; operational reporting is not financial approval.
These decisions do not prohibit planning unrelated read-only/synthetic work.

**Assessment:** suitable for owner review and Phase 9 scope planning after review
gates pass. **Not approval to begin Phase 9, import data, implement financial
policy, merge, deploy or accept the security exception.** Resolve the new timeout's
activation step and obtain the specific business/security/source approvals before
any dependent execution. No Phase 9 implementation occurred.
