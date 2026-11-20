# Phase 9 / P9-2A — synthetic native customer import

20 November 2026. Local implementation and isolated verification only. This report
records P9-2A; it does not authorize a company migration, real import, deployment,
commit, push, PR or P9-2B. Final pass claims below come from executed checks; earlier
failed runs are identified separately.

## Approved base and isolation

Repository: `mohannad-121/AMBS-ERP`. Exact approved base and unchanged local HEAD:
`51a705fa2e11a963c35e3b1ef10d0872f9a08ac0`, P9-1's published self-review correction.
PR #7 remains OPEN/DRAFT and unmerged, with auto-merge disabled. Its report and test
execution evidence are preserved as historical records. Publication is recorded
in the active readiness plan and PHASES.md without rewriting that evidence.

New worktree: `C:\Projects\AMBS-ERP-P9-2`.
New branch: `feature/phase-9b-synthetic-master-import`.
The target and branch were absent before creation. The base worktree was clean at
the exact approved commit. Existing `C:\Projects\AMBS-ERP` and
`C:\Projects\AMBS-ERP-P9-1` are preserved separately, including the original
workspace's untracked readiness plan. No source edits occur in either old worktree.

AMBS-ERP remains standalone, using native services and company-owned on-premise
PostgreSQL for production. Odoo is permanently out of scope. Supabase is not the
ERP database or a dependency of this slice.

## Exact source/documentation inventory

| Path | Change |
| --- | --- |
| `backend/alembic/env.py` | Register new receipt metadata for synthetic drift verification |
| `backend/alembic/versions/0011_customer_import.py` | Four additive immutable-history tables, uniqueness/count checks and isolated downgrade |
| `backend/app/core/config.py` | Separate default-disabled synthetic customer execution flag |
| `backend/app/models/customer_import.py` | Receipt, identity, row reconciliation and attempt models |
| `backend/app/schemas/customer_import.py` | Exact revision/run/approval/version request; extra fields forbidden |
| `backend/app/services/customer_import.py` | Internal synthetic-only customer transaction, approval checks, conflicts and receipts |
| `backend/app/services/master.py` | Optional transaction-owner mode; existing default per-call commit retained |
| `backend/tests/test_customer_import.py` | Service, real PostgreSQL concurrency, process crash, authorization, integrity and rollback regressions |
| `backend/tests/test_security.py` | Expected head advances only in generated synthetic databases |
| `backend/tests/verify_customer_import_migration.py` | Independent additive/downgrade/drift rehearsal |
| `backend/tests/customer_import_recovery.py` | Synthetic backend restart and receipt retry rehearsal |
| `docs/PHASES.md` | Record the published P9-1 base and authorized P9-2A boundary |
| `docs/PHASE_9_READINESS_PLAN.md` | Current scope/gates and publication reference |
| `docs/PHASE_9_P9_2A_REPORT.md` | This implementation/verification record |

No original migration, customer schema, dependency, lockfile, frontend source,
company Compose or environment file is changed. Raw logs, fingerprints, generated
credentials, test sources, browser captures and audit exports remain under ignored
`artifacts/p9-2a/`. The frontend check tree is a private copy with dependencies
mounted read-only; generated build/type files cannot alter tracked frontend files.

## Execution boundary and independent approval

There is **no execution HTTP route, production CLI integration or import UI button**.
Only the internal synthetic service is exercised. Its new
`synthetic_customer_import_enabled` setting defaults false. Both this flag and
durable review must be enabled, `APP_ENV` must equal `test`, the Engine URL database
must match the existing generated test-name pattern, and PostgreSQL's actual
`current_database()` must equal that name. A company/production gate failure occurs
before user/review/import table access or denial writes.

The service accepts an Engine, not a caller-owned connection/transaction, and owns
a fresh session. It reloads the native session, expiry/idle/revocation state, active
user, roles and effective permissions under the native security lock. Execution
requires `customers.create` and Operations/Super Admin review access. Cached context
permissions cannot grant authority. No role or permission grants are added.

Before first consumption it independently checks:

- Original bounded source bytes against the manifest SHA-256.
- Exact latest selection UUID, optimistic version, mapping and selected-row digest.
- Customers category and `PROPOSE_CREATE` only; every mapped field must be supported
  by native customer creation. Source-supplied codes are rejected; native CUS UUID
  codes are generated normally. No update, merge, auto-link or duplicate override.
- Current parser and P9-1 policy versions.
- Latest valid validation run, its recomputed result digest and full approval binding.
- Exact approved decision/run, reviewer binding and order, three distinct uploader,
  reviewer and approver identities, and currently active review/approval authority.
- Fresh reference digest and a complete fresh P9-1 validation of the retained bytes
  under the same write transaction before any native customer creation.

P9-1 review rows and state/version remain unchanged by execution. New receipts are
separate history; no queue or execution state is added to the review lifecycle.

## Transaction and idempotency contract

The service explicitly uses READ COMMITTED for its owned connection, so a caller's
repeatable-read Engine cannot pin a snapshot before waiting for locks. The Engine's
original isolation setting is restored on pool return. Lock order is native security
advisory lock → source row → `customers` SHARE ROW EXCLUSIVE. The customer table lock
also blocks out-of-band SQL inserts/updates/deletes during reference verification and
application. Existing native API writers already take the security lock first.

After bounded preflight, all native customer records, native creation audits, source
identities, row outcomes, receipt, initial attempt and import summary audit commit in
**one native PostgreSQL transaction**. `master.save(..., commit_changes=False)` reuses
the same native DTO, normalization, duplicate checks, generated codes, creator identity
and audits, while leaving commit/rollback to the transaction owner. Existing API calls
keep their default commit behavior. No nested per-customer commit or business deletion
is used as compensation. Failure rolls back the complete batch.

Database fences include one receipt per selection revision, unique request digest,
unique `(namespace, normalized-source-key SHA-256)`, unique customer provenance,
one initial attempt per receipt and one reconciliation row per selected source row.
Receipts, identities, rows and attempts reject UPDATE/DELETE through PostgreSQL
triggers. Foreign keys retain their review/customer/user provenance.

An identical request returns the **same committed receipt** and adds an immutable
`DUPLICATE_RETRY` attempt; it creates zero customers. Response and audit distinguish
the original receipt's applied count from this invocation's applied count of zero.
This is a historical receipt lookup, not approval consumption a second time. The
original import necessarily changes the customer reference catalog itself. Therefore
receipt retries do not require the pre-import reference digest to remain current;
they still check bytes, current selection/run/version, binding, policy, independent
approval structure/authority and executor authorization. A new execution always checks
fresh references. Receipt replay never restores stale approval or authorizes new writes.

## Conflicts and reconciliation

Source keys use the existing native NFKC/whitespace/case normalization and are stored
as SHA-256 identities. Raw source keys/content are not copied into summary audits or
the new receipt tables. Content identity binds the entire original file SHA-256,
original selected values and the native customer payload including defaults.

- Same stable key with changed file/content is a conflict, even if a changed file was
  newly approved. Unchanged selected values inside an otherwise changed file still
  conflict: this first slice intentionally has a strict whole-file identity contract.
- A new approved revision of the same bytes/key/payload can recognize the existing
  immutable provenance as a duplicate without creating another customer.
- A pre-existing native normalized customer name is a business identity conflict.
  Changing the source key cannot bypass native duplicate detection.
- Changed/inactive target customers conflict instead of being overwritten or relinked.
- Unicode-equivalent source-key collisions are rejected together, never merged.
- Any conflict/rejection aborts the whole customer batch. Conflict rows receive stable
  codes and other selected rows are rejected as `BATCH_REJECTED`. A terminal immutable
  conflict receipt commits with zero customer changes. Correction needs a new approved
  selection and explicit conflict resolution; no silent retry mutation occurs.

Reconciliation reports selected, validated, applied, duplicate, rejected and conflict
rows, source row numbers, stable outcome codes and resulting customer UUIDs. It also
reports durable duplicate retry attempts and per-invocation applied rows. Counts obey
`selected = applied + duplicate + rejected`; conflicts are a subset of rejected rows.
Validated equals selected for consumed receipts because invalid approval/validation
never enters execution. Invalid/stale/unauthorized requests instead retain a native
security denial audit with a stable reason code/source UUID and no source values.

## Verification — actual results

Only independently generated PostgreSQL databases on `p9-2a-isolated` are used for
tests. Company services are not rebound to this worktree. No test timeout is raised
and no existing assertion is weakened; the migration-head expectation follows the
new additive synthetic head.

| Check | Result |
| --- | --- |
| Initial development execution | 31 passed, 2 fixture retry failures; not counted as a final pass |
| Intermediate focused customer/review/native-master execution | 94 passed, 630.09 s pytest time; before the final connection-isolation correction |
| Targeted READ COMMITTED correction regression | 1 passed, 10.25 s |
| Targeted actual SQL constraint/denial correction regression | 1 passed, 10.47 s |
| Final complete customer import module | **43 passed**, 370.80 s; included once in the full-backend count |
| Complete backend regression after corrections | **453 passed**: 144 + 152 + 114 + 43; all test modules covered |
| Sales/routing/packing/master/dashboard/archive/health/CLI | **144 passed**, 451.87 s |
| Purchasing/inventory/inventory review/security/onboarding | **152 passed**, 561.28 s |
| Reporting/review concurrency/dashboard consistency/P9-1 | **114 passed**, 553.91 s |
| Additive/downgrade/schema drift rehearsal | PASS: 74 → 78 → 74 → 78 tables; old schema/data unchanged except Alembic bookkeeping; no final drift |
| TypeScript | PASS, 11.13 s |
| ESLint | PASS, 12.50 s |
| Compatibility / exact quantities / dashboard-logout | 3 / 14 / 9 passed |
| Native-master Chromium scenario | 30 checks passed, 133.14 s runner wall time |
| Complete Phase 8A Chromium preview scenario | 44 checks passed, 60.62 s runner wall time |
| Final serialized P9-1 Chromium scenario | 18 checks passed, 79.71 s runner wall time; no unrelated business-table changes |
| Backend restart / receipt retry | PASS: all 78 fingerprints unchanged; same receipt, two customers, zero additional applied rows |
| Synthetic logical restore and PostgreSQL restart | PASS: all 78 fingerprints match restored data and survive restart; receipt retry creates zero additional customers |
| Retained synthetic source bytes | PASS: 1 original, 3 HTTP-review and 1 restored manifest reference match SHA-256 |
| Source-tree and complete-history privacy/secret scans | PASS: 299 source-file SHA-256 hashes, 285 unchanged canonical base files, exact 14-path scope, redacted tree/history scans and exact private-secret checks |
| Final company/worktree/resource/PR preservation | PASS: all 70 fingerprints, migration 0009, 67 pre-existing containers, 19 volumes, 64 image IDs and both old worktrees/configurations preserved |

The source/privacy audit inventories all 974 stored Git objects and checks every
blob/commit/tag's contents for exact configured company secret values and encoded
variants. Redacted Gitleaks 8.30.1 scans the complete source tree and reachable Git
history. No credential, original workbook, dump, recovery archive or raw evidence is
a source candidate. Six untouched files have only Windows-checkout CRLF differences
from the old worktree; their canonical Git blob identities match the approved base.
All 285 untouched base files match canonical content. Final raw source/report hashes
and scope are sealed in ignored evidence; staging is empty.

The two initial development failures followed successful rollback assertions but the
test's broad `monkeypatch.undo()` also restored the default source directory before
retry. The tests now restore only injected save/commit functions and retain their
source fixture settings. Failed evidence remains private; it is not reported as a pass.

The first complete backend run exposed an actual implementation defect: chaining an
Engine isolation override retained REPEATABLE READ on an already configured Engine.
That run passed 451 cases and failed the new isolation regression. The correction
sets the actual owned Session connection to READ COMMITTED before its first SQL
statement and rejects an already-open gate transaction. The targeted regression
then passed; final affected/full-suite results below supersede the earlier result.

An additional actual native unique-constraint fault test exposed a denial-audit defect:
ORM attributes expired during the failed flush, so looking up the actor through the
aborted session raised PendingRollbackError. Customer writes still rolled back, but
the denial audit was not recorded. Authenticated actor UUID/username are now captured
as plain values before writes. The targeted test passed, proving complete rollback,
one safe IMPORT_CONFLICT denial audit and successful retry without duplicates.

Two failed durable-browser attempts remain private. The first logged approver activity
at 08:27:40 UTC, then dashboard authentication denials at 09:26:51 UTC, exceeding the
unchanged 30-minute idle limit. This demonstrates expiry in that captured run, not the
cause of the historical navigation findings. A repeat was mistakenly overlapped with
Phase 8A customer/user fixture creation; it correctly received 409 on stale references,
and its shared before/after snapshot cannot establish zero business changes. The
harness now rejects overlapping browser runs. The final P9-1 run used a fresh namespace
and ran after fixture creation completed: all 18 assertions passed, with no console/
React/hydration errors and no unexpected business-table changes. No browser source,
assertion, session lifetime or test timeout was changed to obtain a pass.

The final customer module was rerun after the last denial-audit correction. The three
unchanged module groups retained their fresh executed passes; they do not import or
exercise the internal customer execution service. An earlier 42-case customer run is
retained but is superseded by the final 43-case run, not added to the total. Intermediate
focused runs and individual corrective tests are also not double-counted. No production
image build or production/browser deployment is claimed; frontend application sources
and dependencies are unchanged.

The new regression cases cover initial application, exact retry, simultaneous duplicate
requests, changed bytes/key conflicts, existing customer conflicts, unsupported action/
mapping, changed references/policy/parser/selection, independent approval and digest
checks, native authorization/session changes, SQL uniqueness/immutability, partial
native-row failure and rollback. Separate child processes call `os._exit()` immediately
before commit and immediately after a real commit, exercising interrupted transaction
recovery and lost-response retry. All are included in the final 453-case coverage.

The manual backend restart rehearsal preserved all 78 normalized table fingerprints,
the original source manifest and the committed two-customer receipt. Its retry changed
only audit/attempt fingerprints; ordinary session last-seen updates are excluded by
the established fingerprint utility. A separate logical dump was restored into a new
isolated generated PostgreSQL database, with PGDATA in that new container's private
writable layer. All 78 fingerprints matched the source, survived PostgreSQL container
restart and retained the same receipt. Retry applied zero new customers. This is a
synthetic restore/restart proof, not a company restore or physical disk-loss rehearsal.
An initial restore connected during the image's temporary initialization-server gap;
readiness was corrected to TCP, the target was verified to contain zero public tables,
and restore then completed. No existing dataset was reset or overwritten.

## Company preservation and recovery evidence

Pre-test preservation passed: all 70 company table fingerprints match the prior
P9-1 publication evidence; company migration is `0009_packing_bom`. The fingerprint
helper uses PostgreSQL `default_transaction_read_only=on`. Existing container IDs,
configuration, mounts, networks/start/stop states, full volume metadata, original image
IDs, both old worktrees and source hashes, credentials/configuration, Git refs, PRs
#2–#7 and deployment inventory were sealed before testing. The post-test comparison
passed: all 70 fingerprints match, company migration remains `0009_packing_bom`,
all 67 pre-existing containers retain identities/configuration/mounts/networks and
start/stop states, all 19 volumes retain full metadata, and all 64 original image IDs
are unchanged. Credentials, configuration, original private image storage, both old
worktrees, existing Git refs, PRs and deployment inventory match their baselines.
PR #7 remains OPEN/DRAFT, auto-merge disabled, at the approved P9-1 publication commit.
No new commit, push, PR, merge, company write/migration, deployment or P9-2B work occurred.
Staging remains empty. Only the new test backend/frontend were stopped after tests;
both isolated synthetic PostgreSQL instances and ignored evidence remain retained.

The company PostgreSQL was healthy at preflight. Company backend and frontend were
already stopped and are not activated by this task. New test services use a private
network and scratch storage, with no company container recreation, reset or cleanup.

Recovery artifacts were freshly checked: 69 Phase 8C checkpoint, 6 partial-recovery
and 17 non-VHDX cold-backup files match SHA-256 manifests. The cold VHDX's size/mtime
and retained prior full hash evidence match; no new full VHDX rehash is claimed.
Prior isolated restore proof remains verified. No company backup/restore is performed.
The retained recovery assessment places these copies on partitions of one physical
disk; no off-host or physical disk-failure protection is claimed.

## Risks, next stage and verdict

**CONDITIONAL GO for independent local P9-2A review.** The authorized synthetic
customer implementation and verification passed: 453 backend cases, 92 completed
browser checks, frontend checks, additive migration proof, interruption/retry and
backend/PostgreSQL restore/restart recovery, source integrity, privacy/secret audits
and company/resource preservation. Failed development runs remain recorded above.

**NO-GO for company schema/data application, real imports, production execution,
deployment or P9-2B without separate authorization.** No commit, push, PR or merge
was performed. The new branch remains at the approved P9-1 base with 14 local changed
files and empty staging. Both existing worktrees and all existing PRs are unchanged.

Production execution is not available or accepted. Synthetic attestation and database
gates do not classify arbitrary source contents. Real source storage/encryption,
retention/quotas/disposal, delegation, namespace ownership and identity evolution need
separate decisions. Strict whole-file identity conflicts do not yet support approved
amendments, mapping migrations, customer merges or archival receipt browsing.

The bounded reparse and customer table lock serialize scratch mutations; no production
throughput or lock-latency guarantee is claimed. Direct out-of-band security/role
mutations are outside the native security-lock protocol. Any future execution surface
needs its own authentication/CSRF, capacity, storage, policy-version and release review.
The synthetic database restore reused retained private source files; it does not prove
recovery after loss of the source store or physical disk. Pre-commit process crashes
leave no committed receipt/attempt, as expected for atomic rollback; this is not a
durable in-flight job/lease journal. Production retention and recovery policies remain
unapproved.
No financial policy, stock balance, inventory ledger, reservation, LPO executor or real
dataset migration is implemented here.

Picomatch and historical protected-navigation findings remain **OPEN**. Current passing
checks cannot establish their historical root causes or security remediation.

Recommended next stage is independent review of this customer transaction/identity
contract and evidence, then separately authorized P9-2B design for any next entity or
cross-entity dependencies. P9-2B has not started. Stop after verification for owner review.
