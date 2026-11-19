# Phase 8C - Operational Reporting & Finance Readiness

Status: Phase 8C GitHub review checkpoint. Independent owner review is pending.
The separately authorized checkpoint permits one reviewed source commit, a normal
push to the Phase 8C branch and PR #5 targeting Phase 8B only after all gates pass.
No merge, deployment, real-data import or security-risk acceptance is authorized.

## Baseline and existing functionality

Branch `feature/phase-8c-operational-reporting` starts directly at verified
Phase 8B `cc4931a2dfa04d4b9fa41e40ccb4263fb0ed98c5`. The initial working tree was
clean. Existing PRs #2/#3/#4 were open and remain dependencies; no PR is merged.
Docker Desktop was stopped at preflight; its existing development containers
were started without recreating volumes. The incidental Next-generated dev type
path change is excluded from the final source diff.

Reviewed PHASES.md, DASHBOARD_METRICS.md, PHASE_8B_REPORT.md and the concurrency
review, plus sales, purchasing, production, inventory, delivery, packing,
dashboard, permission and snapshot implementations. Existing dashboard metrics
are bounded counters/queues; legacy detail/report services often acquire posting
locks or query per item. Phase 8C adds bounded SQL projections for cross-record
reporting rather than calling those mutable/locking detail views. It reuses the
same models, authoritative relationships, allocation predicate and Phase 8B
snapshot boundary. No tables, migrations, posting service or parallel ledger.

## Functionality and exact definitions

Central `/reports` page and authenticated `/api/reports`, `/api/reports/options`,
`/api/reports/choices`, `/api/reports/export`. The premium shell and existing
controls/tokens are reused. Navigation and an inventory dashboard quick action
lead to reports; Phase 6C counters, animation and backend metrics are retained.

| Category | Source and row grain | Exact quantities/status evidence | Date filter basis |
| --- | --- | --- | --- |
| Sales | SalesOrder + SalesLine; one original line | Consumption joined through allocation/delivery line to currently DISPATCHED delivery; original quantity, actual dispatched, active allocated, outstanding/backorder and separate unallocated outstanding; actual customer/project/LPO, dispatch count/latest dispatch timestamp | Sales order creation |
| Purchasing | PurchaseOrder + OrderLine; one PO line | Received only from currently POSTED PurchaseReceipt/ReceiptLine; open outstanding only in CONFIRMED/PARTIALLY_RECEIVED; supplier, PO currency and latest schedule expected date; commitments are not payments | PO ordered_on calendar date |
| Inventory | Existing StockBalance bucket + grouped LedgerEffect/ACTIVE Reservation | On-hand, reserved, usable available, non-usable excluding EXTERNAL, external custody, signed ledger and active reservation comparison; no repairs | Current snapshot, no historical date filters |
| Low stock | StockThreshold + full configured warehouse/location scope | Existing allocatable availability below configured minimum; no configured minimum means no warning; warehouse-wide thresholds are never reduced to a displayed location subset | Current snapshot |
| Movements | Immutable LedgerEffect + MovementLine + StockMovement | Signed effects and movement kinds; transfers retain both signed sides, reversals offset original effects, RETURN is recorded evidence only; type/unit UUID groups never combine units | Actual posted_at |
| Production | ProductionOrder + recorded ProductionStage; one stage or stage-less draft | Planned repeats per stage, never a production total; entered=START+incoming TRANSFER, completed=COMPLETE, in_process=entered-completed, custody=entered-outgoing TRANSFER-YARD, actual yard receipts; ownership AMBS versus SUPPLIER explicit; latest stage schedule fallback to stage/order expected date | Production order creation |
| Production events | Actual ProductionEvent, stage/order/supplier/item references | START/COMPLETE/TRANSFER/YARD with quantities, source/destination stage and actual movement/receipt IDs where recorded; supplier-owned progress does not become company stock | Recorded event creation |
| Deliveries | SalesDeliveryLine + actual SalesConsumption + SalesOrder | Planned, picked, loaded, currently net dispatched, reversed consumption separate, partial flag, actual dispatch/reversal timestamps, recorded assignment ID and movement reference | Delivery creation |
| Packing | Immutable PackingDocument + DocumentEvent | ISSUED unless recorded VOID/REPLACED event; revision/previous/replacement refs; issuance is not extra stock dispatch, GPS or customer acceptance | Document issuance |
| Exceptions | Authorized projections of sales/purchasing/inventory/low-stock/production/deliveries | Original record ID/reference, category, finding and explanation; real overdue receipts, incomplete overdue stages, outstanding demand, stock/cache mismatches, non-usable stock, configured low stock and pending deliveries | Current exception snapshot; item filter only |

Backorder follows the established Phase 6A definition: remaining original order
demand after net dispatch. It is not reduced by reservations or a new order.
Open sales demand excludes DRAFT/CANCELLED orders. Purchase outstanding excludes
DRAFT/CANCELLED/CLOSED/fully RECEIVED commitments; closed remainders are not open
supplier obligations. Reversed deliveries/receipts never inflate fulfillment.
A completed/dispatched order is not customer-signed proof of receipt. No signed
receipt evidence or actual GPS is invented. Generic returns retain stock movement
references; no customer/order return relationship is inferred when absent.

Status counts are distinct source orders/deliveries/movements/buckets/thresholds,
not repeated lines/stages; packing and production-event counts use document/event
identity. Exception counts are findings. Quantity rows retain unit names and UUIDs.
No summed mixed-unit grand total, monetary KPI, revenue, profit or valuation.
Progress/fulfillment columns are cumulative at the current snapshot even when
creation-date filters select source documents. Use Movements for period stock
effects and Production events for period event evidence. Date basis is explicit
in the UI; creation date must not be interpreted as dispatch date.

## Permissions and information isolation

| Report | Required existing backend grants |
| --- | --- |
| Sales | sales.orders.read |
| Purchasing | purchasing.orders.read |
| Inventory / Low stock / Movements | inventory.read |
| Production / Production events | production.read |
| Deliveries | sales.deliveries.read (own-driver scope does not grant global access) |
| Packing | packing.read AND packing.company (matches existing company document scope) |
| Exceptions | Union of only the viewer's authorized source reports |

Selectors return at most 25 matching IDs/names/codes actually referenced by an
authorized report source; they are not unrestricted master-data catalogs.
Relationship names/IDs are the operational relationships already exposed by the
corresponding source module. No contacts, addresses, tax identifiers, user details,
passwords, costs/prices, PDF bytes or private document snapshots are selected.
Only source links allowed by existing permissions and company Item Journey links
requiring both trace/company grants are returned. Anonymous requests fail 401;
direct unauthorized report/export/selector requests fail 403 with existing denial
audit behavior. No new role grants or financial permissions are seeded.

## Filters, exports and bounds

Server-side filters: status/literal reference search, inclusive Dubai date range,
and supported customer/project/item/warehouse/location/supplier IDs. Unsupported
filters fail explicitly. Sales supports customer/project/item; purchasing supports
supplier/warehouse/item; inventory/low-stock/movements support warehouse/location/
item; production/event reports support supplier/warehouse/location/item; deliveries
support customer/project/warehouse/item; packing supports customer/project/warehouse.
Combined exceptions support item only; use a source report for other filters.

Timezone is Asia/Dubai (UTC+04:00). Timestamp ranges use local midnight converted
to UTC, with the day after the through date exclusive. PO calendar dates retain
their date semantics. Dates are validated, reversed ranges rejected, supported
years 1900-9998. UUIDs, status/search length and unknown query fields are validated.
Search escapes SQL wildcards; no input becomes executable code or glob patterns.

Pages contain at most 50 rows with deterministic date/row ID ordering (exception
category breaks cross-source ties). Status/group aggregates cover the filtered
scope. CSV covers the entire filtered result, up to 1,000 rows, with a fresh
snapshot; page>1 and oversized export requests fail rather than truncating.
Each row retains decimal strings, unit/currency labels and identifiers. CSV
includes generation UTC time, reporting timezone, applied filters and definitions;
rows, not dashboard aggregates, are exported. All cells use standard CSV quoting
and formula protection including whitespace/control/BOM-prefixed operators.
All quantity columns, including positive large decimals, are explicitly spreadsheet text with an apostrophe prefix so Excel does not silently round them. Numeric references/counts are not treated as quantities. Negative quantity strings also remain exact inert text. Exports/previews remain private
request/browser data and generated synthetic QA artifacts are ignored by Git.

Reports and selectors share the existing two-slot-per-worker review semaphore and
existing engine/pool with Phase 8B. Each multi-query report is PostgreSQL READ ONLY,
REPEATABLE READ with a fresh identity map. The short initial authentication commit
releases security gates before queries; final session/role/permission revalidation
occurs before returning data. No inventory posting gate is acquired. Existing
5-second per-statement/10-second idle bounds apply; report SQL adds an 8-second
operation budget, reducing each statement's timeout to the remaining budget.
Results/groups/lookups are bounded, query count does not grow per output row;
correlated due-date/threshold SQL stays within the same bounded statements.
No lock, dependency or Next compatibility patch change is required.

## Changed-file inventory

The initial implementation had 18 reviewed paths. The review checkpoint has 22:
four narrowly related counter-regression paths are added below. Generated Next dev
types and all private evidence remain excluded.

| Path | Purpose |
| --- | --- |
| `backend/app/api/reporting.py` | Authorization, snapshot boundary, options/selectors and inert CSV response |
| `backend/app/main.py` | Register the read-only API router |
| `backend/app/schemas/reporting.py` | Typed bounded filters and fail-closed date/query validation |
| `backend/app/services/reporting.py` | Bounded authoritative projections, exceptions, precision-safe CSV |
| `backend/tests/test_reporting.py` | Synthetic correctness/RBAC/filter/export/concurrency regression cases |
| `docs/DASHBOARD_METRICS.md` | Document reporting navigation and unchanged dashboard semantics |
| `docs/PHASES.md` | Record the separately authorized Phase 8C scope |
| `docs/PHASE_8C_FINANCE_DECISIONS.md` | Required owner/accountant policy decisions, no accounting implementation |
| `docs/PHASE_8C_REPORT.md` | This implementation and verification report |
| `frontend/app/(erp)/reports/page.tsx` | Authenticated server permission gate |
| `frontend/components/app-shell.tsx` | Permission-filtered Reporting Center navigation |
| `frontend/components/dashboard.tsx` | Existing inventory readers get a truthful reporting quick action |
| `frontend/components/count-up.tsx` | Correct the counter frame timeline and signed fixed-point interpolation |
| `frontend/lib/quantity.ts` | Exact BigInt formatting and bounded animation progress helpers |
| `frontend/scripts/test-count-up.mjs` | 14 deterministic clock/sign/precision regression cases over production helpers |
| `frontend/package.json` | Add test:quantities only; dependency versions, overrides and lockfile unchanged |
| `frontend/components/reporting-center.css` | AMBS cards, readable contained tables and responsive controls |
| `frontend/components/reporting-center.tsx` | Reporting and exception UI, filters, references, export, precise strings |
| `frontend/lib/proxy.ts` | Exact BFF allowlist for report/options/choices/export only |
| `frontend/scripts/verify-reporting-browser.mjs` | Dedicated synthetic-account Chromium workflow and restart checks |
| `scripts/Verify-AuthIntegration.ps1` | Optional isolated development reporting checks; private failure-log capture |
| `scripts/verify_security_containment.py` | Optional reporting workflows in the existing hardened HTTPS QA candidate |

## Finance owner decisions

[PHASE_8C_FINANCE_DECISIONS.md](PHASE_8C_FINANCE_DECISIONS.md) records decisions for
entity/books boundaries, roles/approvals, invoice sources/numbering, AR/AP,
payments/settlements, FX, periods, taxes, costing/valuation, recognition, historical
migration and reconciliation/audit. All remain unapproved. No accounting entries,
financial balances, taxes, invoices or inferred historical values are implemented.

## Initial implementation verification (preserved evidence)

**Complete final-source backend regression: 351 passed, zero failures/errors/skips.**
Every case from the unfiltered complete collection is covered exactly once by the
final matrix (144 + 152 + 55); all backend app/test/migration hashes match the final source.
The final 55-case serial group contains **38 reporting cases and all 17 Phase 8B
concurrency cases**. General partitions took 427.09 and 506.50 seconds; final serial
group took 196.90 seconds. This supersedes the disclosed earlier failed attempt;
no deadline, posting lock, constraint or assertion was relaxed.

New reporting tests verify truthful empty states, original-demand/backorder and
partial dispatch/reversal math, receipt reversal/latest schedules, source unit and
20-digit decimal precision, configured threshold scope, supplier-owned production
progress, document void/replacement, all role gates/direct exports, custom minimal
permission isolation, scoped reference choices, Dubai date boundaries, status and
literal search, pagination/unknown-field validation, formula/control-prefix safety,
CSV scope/precision and no stock or credential mutation. Actual PostgreSQL sessions
and separate backend PIDs verify concurrent report/posting, including 1,200 extra
synthetic ledger effects and complete old/new snapshot versions.

| Final verification | Actual result |
| --- | --- |
| TypeScript / ESLint | Passed |
| Next compatibility guards | 3 passed; existing patch unchanged |
| CJS / ESM router runtime regressions | Both passed |
| Backend and Next production images | Built successfully; every backend app file matches the final runtime image |
| Combined development browser | 24 authentication Chromium + 20 HTTP/BFF; Phase 8A 52, Phase 8B 27, Phase 8C **47**, including restart |
| Phase 6C development browser | **86** checks, including exact counters, reduced motion, responsive navigation and clean console |
| Hardened HTTPS browser | Phase 7 **40**, Phase 8A **52**, Phase 8B **27**, Phase 8C **47**, including restart; secure-session/CSRF/transport checks passed |
| Candidate isolation/security | Actual non-root/read-only roots/private ports/capability drops; owner-role startup rejection and closed debug/image endpoints passed |
| Actual downloaded CSV artifacts | Both development/HTTPS filtered to one authorized row; formulas neutralized and all quantity cells prefixed as exact spreadsheet text |
| Final report UI console | No warnings, React runtime errors or hydration warnings |
| Visual inspection | Final desktop cards/table screenshot inspected; wide columns remain in focusable horizontal-scroll regions; 375/812/1440px overflow checks passed |
| Full / runtime-only npm audit | Both executed, exit 0, zero current findings; internal exception still OPEN |
| Source/Git secret scans | Configured-secret scan passed (274 source files, 820 Git objects, 10 configured variants); Gitleaks history passed; final-source recheck is a sealing gate |
| Private source reference scan | 85 selected company identity literals checked privately; zero new changed-file matches; one inherited synthetic-fixture overlap remains explicitly reviewed |

Final controlled posting observations while reports remained paused:

| Report | Writer commits before reader releases |
| --- | ---: |
| Inventory | **106.29 ms** |
| Combined exceptions | **94.12 ms** |
| Movements with 1,200 additional ledger effects | **109.42 ms** |

The unchanged 3-second assertion passed; separate PostgreSQL observation confirmed
no reader advisory lock. Existing Phase 8B positive controls still reproduce the
old gate timeout (157.10 ms under a test-only 150 ms limit) and READ COMMITTED torn
versions. Its snapshot/cleanup/access-revocation/pool/admission cases all pass.
These are local synthetic overlap measurements, not production SLOs; the earlier
3,530.8 ms outlier below remains material capacity evidence and is not erased.

Raw JUnit/log/exit/source-hash/preservation evidence remains private in
`artifacts/phase8c/`. Tests used generated databases and dedicated synthetic
administrators only. No real administrator credential was used/reset. Initial
fixture attempts correctly exercised existing return confirmation, immutable
order identity, required schedule evidence and movement-size guards; fixtures were
corrected to authoritative workflows, never by weakening application guards.

## Initial verification failures and final acceptance gates

The first complete 351-case run had **350 passes and one failure**: the large-history
reporting writer exceeded the unchanged 3-second test deadline while builds and
multiple browser QA stacks were also running. It completed successfully (HTTP 200)
in **3,530.8 ms**, after the test had released the reader; the report took 3,701.2 ms.
The observer had confirmed no advisory lock on the read snapshot. This is a real
measured deadline violation, not a passed test or a proven lock regression. Exact
causation was not captured for that first outlier; shared-resource contention is
plausible, not established. The 38-case final reporting run passed the same bounded
case at 261.83 ms. Failure-only PostgreSQL wait/blocker diagnostics were added
without relaxing the deadline or releasing the reader before diagnosis.

The successful complete **final-source** rerun used: every existing test file is
covered by two independent synthetic-database regression partitions, followed by
the reporting/concurrency partition serially after builds/browsers finished. The
original failure is not hidden and does not establish any production latency SLO.
The CSV precision formatting change also receives fresh final-source verification.

The initial isolated development baseline also failed during synthetic Fast Refresh
with unexpected 500 responses while sources/builds were changing; exact cause was
not established. The final combined development run passed baseline
HMR/navigation/authentication plus all Phase 8A/8B/8C workflows. The new harness
captures private QA service logs on subsequent failures; it never suppresses errors
or changes framework patches. Earlier production reporting attempts correctly
rejected a 60-line fixture (limit 30) and timed out on an incorrectly named test
locator. Two valid 30-line receipts and the actual accessible Customer label fixed
the fixtures. Visual inspection separately found and corrected page/table overflow.

## Initial preservation and recovery (historical)

All 70 live-table fingerprints and configuration digest were captured before
implementation and matched the Phase 8B checkpoint. Routine session last-seen is
normalized by the existing fingerprint tool. Current comparisons match all 70 tables and the unchanged private configuration.
Existing posting/security/snapshot services, dashboard API, migrations, lockfiles,
Next patch and development/production Docker configurations are byte-identical to
the baseline. At that initial local checkpoint, the index was empty and HEAD was the verified
Phase 8B commit; no Phase 8C remote branch existed. The later review-publication
checkpoint below supersedes that local-only state. PRs #2/#3/#4 must remain OPEN
at unchanged heads; main and PUBLIC visibility remain preserved.

New restricted recovery directory: `C:\AMBS-Backups\AMBS-ERP\AMBS-ERP-PostPhase8C-20261119-121813`.
Fresh PostgreSQL custom dump catalog/full decode and private storage archive pass.
An isolated non-root/network-none PostgreSQL 17 scratch restore matched all 70
fingerprints, Alembic `0009_packing_bom` and no drift; only its newly labelled
scratch resources were removed. Historical backups remain unchanged. Source ZIP,
member hashes and final artifact manifest/binding are verified by the external
local checkpoint binding before delivery of this report. Final backend/source/data
gates must pass before that binding is marked verified.

Environment ciphertext is inherited byte-identically from the verified Phase 8B
concurrency recovery checkpoint after checking unchanged live configuration.
**No fresh decryption** occurred; the existing separately held passphrase is
required. Backup ACLs restrict access to the Windows owner and SYSTEM. Database,
storage and private-original archives are not individually passphrase-encrypted;
approved encrypted off-host storage/transport remains required.

## Security and limitations

Internal picomatch exception remains OPEN. Publisher withdrawal/zero current npm
findings are not a verified library remediation, proof of zero risk or owner
acceptance. Production candidate isolation and compatible Next patches remain.
Repository visibility is owner-managed and must remain unchanged; this checkpoint authorizes only normal publication to the Phase 8C branch and
a review PR stacked on Phase 8B, with auto-merge disabled. Actual full/runtime audits both executed with zero current findings; the exception remains open because withdrawal/feed state is not a code remediation.

Snapshots are per request, not cross-page/export frozen jobs. Concurrent changes
can alter later requests. MVCC retains old versions and ordinary SELECT can block
incompatible DDL; CPU/I/O/load and other legacy report locks remain relevant.
The concurrency experiments are bounded synthetic overlap tests, not production
throughput certification. Snapshots do not prove physical stock counts, customer
acceptance, signed delivery, engineering approval or accounting readiness. Larger
exports require narrower filters, not silently partial output. Global company
reports are deliberately unavailable to own-driver-only roles; financial scope
and any real-data changes require separate owner approval.

## Initial local implementation acceptance (historical)

- [x] Approved read-only operational reports and exception view implemented.
- [x] Existing source definitions, permissions and Phase 8B snapshot architecture reused.
- [x] Complete 351-case final-source backend matrix passed; concurrency deadline retained.
- [x] Frontend/build/compatibility, development, hardened HTTPS and Phase 6C/7/8A/8B regressions passed.
- [x] All 70 live fingerprints, configuration, posting/security/snapshot logic and migrations preserved.
- [x] New isolated database restore verified; final source/artifact sealing is externally bound.
- [x] Source/privacy scans executed; final source scan/archive hash checks are delivery gates.
- [x] No staging, commit, push, merge, deployment, real import, stock adjustment or credential reset.
- [x] PRs #2/#3/#4 remain open; repository visibility left unchanged (PUBLIC).
- [ ] Independent owner review/acceptance of this local implementation.
- [ ] Separate financial policy approvals and production capacity/security acceptance.

That local-only checkpoint is historical. The later owner instruction authorizes
review publication of the 22 reviewed paths after fresh checks and audits. Exact
source commit/PR head and sealed backup manifest are recorded in the PR and the
external recovery binding, avoiding a self-referential commit hash in this file.
PRs #2/#3/#4/#5 must stay OPEN. No Phase 9 has started.

## Review checkpoint: targeted counter blocker and preservation

Fresh development verification stopped publication after recording **Cannot convert
- to a BigInt** from dashboard counter animation. The application counter used a
performance.now() start sample with RAF frame timestamps and only an upper progress
bound. A deterministic reproduction with positive synthetic 67.407360 and an early
-1 ms frame produces a negative scaled fraction whose old sign/padding split makes
`-.xxxxxx`; BigInt('-') throws. The original failing frame's timestamp was not
captured, so its precise clock sample is not claimed as observed. The failure path
itself is reproduced automatically. Legitimate negative sub-unit quantities also
lost their sign in the old formatter.

The targeted fix uses the first RAF timestamp for its own time origin, bounds
progress to [0,1], pads absolute scaled digits before restoring the sign and
preserves the sign of negative fractions. Existing 1,400 ms easing, reduced-motion,
viewport-once behavior and exact large-decimal final values remain. Malformed source
quantities still throw; there is no console suppression or development-indicator
change. [MDN animation timing](https://developer.mozilla.org/en-US/docs/Web/API/Window/requestAnimationFrame)
distinguishes frame timestamps from performance.now() and recommends initializing
from the first callback for an independent animation. Four frontend paths implement
this fix and its 14 deterministic tests; the existing verification harness runs
them automatically. Private diagnostic collection now preserves the original
verification failure if Docker diagnostic stderr also reports an error.

This is a necessary dashboard-integration regression fix, not new business logic.
No backend/report query, snapshot, posting lock, authentication/CSRF/RBAC rule,
migration or financial calculation was changed for the checkpoint. All approved
financial decisions remain explicitly unapproved in PHASE_8C_FINANCE_DECISIONS.md.
The prior 351-case backend source/hash/JUnit evidence remains applicable; fresh
reporting/security and browser results are distinguished in the completed checkpoint
section below. The earlier failed browser result is retained
privately and is not counted as a pass. No failure deadline/assertion was relaxed.

## Verified GitHub review checkpoint - 2026-11-19 (Asia/Dubai)

Scope: all **22** changed/untracked source/documentation paths above were reviewed.
All original 18 implementation paths matched the sealed initial source before the
counter blocker was found. The four additional counter paths and harness changes
are limited to correcting/verifying that actual dashboard regression. No financial
transactions, accounting balances, new stock posting, import behavior or real
business-data change was introduced. Backend implementation/tests/migrations remain
byte-identical to the source used by the complete 351-case matrix.

| Evidence class | Actual result |
| --- | --- |
| **Fresh backend** | **113 passed**: 58 security/inventory-review cases and 55 reporting/Phase 8B concurrency cases; zero failures/errors/skips |
| **Preserved complete backend** | **351 passed** from the original complete matrix; all three source manifests and JUnit case coverage verified against the exact current backend. The full suite was not rerun wholesale at this publication checkpoint |
| Fresh quantity regression | **14 passed**, including deterministic old failure, early/backward clock bounds, signed fractions, 20-digit values, ordinary/final frames and rejection of malformed quantities |
| Fresh static/build checks | TypeScript, ESLint, three Next compatibility guards and both production builds passed; no dependency/override/lockfile or Next patch change (package.json adds a test script only) |
| Fresh development browser | 24 authentication Chromium +20 HTTP/BFF, Phase 8A **52**, Phase 8B **27**, Phase 8C **47**, including restart; CJS/ESM runtime guards passed |
| Fresh Phase 6C browser | **86** passed after the counter fix, including animation/exact values, responsive/role navigation and clean console |
| Fresh hardened HTTPS | Phase 7 **40**, Phase 8A **52**, Phase 8B **27**, Phase 8C **47**, including restart, actual runtime isolation and closed endpoints |
| Actual exported CSV | Both final browser environments produced one authorized filtered row; quantity text prefixes and formula protection verified from the downloaded artifacts |
| Fresh npm audits | Full and runtime-only audits both exited 0 with zero current findings; internal picomatch exception remains OPEN |

Fresh backend partition durations: security/inventory review 171.63 seconds;
reporting/concurrency 211.31 seconds. Raw fresh evidence is
private in `artifacts/phase8c-checkpoint/`; earlier full-suite and initial-failure
evidence remains in `artifacts/phase8c/` and the immutable prior recovery backup.
Final post-fix browsers reported no console warnings, React errors or hydration
warnings. The failed pre-fix development check is retained privately and is not a
pass. No runtime console filtering, authentication-rate-limit change, password
reset or test-deadline relaxation was used.

Fresh paused-reader posting measurements: inventory **109.00 ms**, exception center
**151.16 ms**, and movements with 1,200 additional synthetic effects **111.58 ms**.
Writers committed before each reader was released, no reader advisory lock was
present, and complete old/fresh snapshots were checked. Phase 8B's existing lock,
cleanup, access-revocation, pool and admission regressions also passed. These are
bounded local observations; the earlier load/HMR outliers and production-capacity
limitations remain disclosed rather than being silently accepted.

All 70 fingerprints again match the original business database, including users,
credentials, balances, ledger, reservations and other business records (routine
session last-seen normalization only). Configuration/storage and historical backups
are preserved; `0009_packing_bom`, no drift, original services healthy. No migration,
posting/security/snapshot or Docker configuration change occurred.

The original Phase 8C backup was independently rehashed, including all 60 artifacts,
its binding and every original source member. A separate final-source recovery
backup was created at:

`C:\AMBS-Backups\AMBS-ERP\AMBS-ERP-PostPhase8CCheckpoint-20261119-130849`

Its fresh custom dump catalog/full decode and isolated non-root/network-none
PostgreSQL restore matched all 70 fingerprints, head and no drift. The live database
was never restored over. Final source ZIP/member hashes, exact staged normalized
Git-tree inventory and SHA-256 manifest must pass before the commit/push gate.
The external checkpoint binding records the actual commit, PR #5 base/head and
sealed manifest hash without a self-referential tracked commit hash. The previous
backup remains immutable. Environment uses unchanged previously decrypt/hash-verified
ciphertext; no fresh decryption occurred, and the separately held passphrase is
required. ACL-restricted dump/storage/original archives still require approved
encrypted off-host storage/transport.

Source, untracked candidates, exact staged files, all Git objects and the final
committed tree/history are secret/private-data audit gates. No private workbooks,
customer/employee records, environment files, dumps, archives, raw browser evidence
or private generated reports may be included. Final gate results and source/backup
binding are recorded externally and in the PR evidence. The reviewed inherited
synthetic identity-literal overlap remains disclosed; no new company identity is
allowed. No risk acceptance or claim of full security remediation is made.

Review destination: **PR #5**, `feature/phase-8c-operational-reporting` targeting
`feature/phase-8b-inventory-reconciliation` at
`cc4931a2dfa04d4b9fa41e40ccb4263fb0ed98c5`, stacked on PR #4 (and #3/#2).
Repository visibility remains **PUBLIC**, unchanged as instructed. All PRs stay
OPEN, auto-merge disabled; main is preserved. No merge, deployment, real import,
stock adjustment, credential reset or Phase 9. All financial owner decisions and
the picomatch exception remain unapproved/open. The checkpoint is for independent
code review only; publication is not financial, security or production acceptance.
