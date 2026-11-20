# Phase 9 active readiness plan

19 November 2026. Updated for the explicit P9-1 authorization. The original plan
is preserved byte-for-byte in private preflight evidence and the original workspace.
Historical verification reports are unchanged.

20 November 2026 update: P9-1's self-review correction was published normally as
`51a705fa2e11a963c35e3b1ef10d0872f9a08ac0` on
`feature/phase-9a-durable-import-review`. PR #7 remains OPEN/DRAFT with auto-merge
disabled. Its original execution evidence in PHASE_9_P9_1_REPORT.md remains a
historical checkpoint, not newly executed evidence for P9-2A.

The owner separately authorized **P9-2A synthetic native customer import only** in
`C:\Projects\AMBS-ERP-P9-2`, branch `feature/phase-9b-synthetic-master-import`,
based exactly on that publication commit. Both existing worktrees remain untouched.
The current slice has no executable HTTP route or UI activation. An internal service
requires explicit synthetic flags, APP_ENV=test, a generated actual test database,
native sessions/permissions and independently approved P9-1 metadata. Its additive
schema and customer writes are rehearsed only in isolated synthetic PostgreSQL.
See PHASE_9_P9_2A_REPORT.md for the transaction contract and actual verification.
This authorization excludes company schema/data changes, deployment, real imports,
stock/finance/LPO execution, publication and P9-2B.

## Authoritative architecture and scope

AMBS-ERP is independent, using its own PostgreSQL and native internal workflows.
Production uses company-owned on-premise infrastructure. Odoo is permanently OUT
OF SCOPE: no investigation, connector, API, adapter, synchronization, credentials
or dependency. Supabase hosting/migration is excluded. Existing ORS route estimation
is a distinct operational service, not an ERP migration dependency.

P9-1 authorizes only synthetic durable review infrastructure, independently migrated
and verified in disposable PostgreSQL. It never authorizes a business-data import,
stock posting, financial policy, company schema migration, release or deployment.

## Foundation and remaining gaps

| Requirement | Existing support | Boundary / remaining work |
| --- | --- | --- |
| Security | Native sessions, RBAC, CSRF, audits | Reuse Operations/Super Admin; independent approver; no real-user grants |
| Parsing | Bounded inert XLSX/CSV and strict archive/content limits | Retain limits; synthetic-only private storage |
| Validation | Required fields, units, dates, duplicates, references and ambiguity | Persist exact findings, original/proposed values and stable codes |
| Review | New immutable manifest/revision/run/decision metadata | Review does not implement execution idempotency |
| Stock | Phase 8B reconciliation/journey | Never adjust balances, ledger or reservations from onboarding |
| Reporting | Phase 8C reports/dashboard | Preserve snapshot consistency and posting-lock isolation |
| Native operations | Master, purchasing, sales, packing, routing/delivery | Review infrastructure never calls business mutation operations |
| Actual imports | Absent | Separate explicit authorization, approved datasets and execution contract required |

## Approval contract

A manifest binds namespace, SHA-256, format, parser/policy versions and uploader.
Immutable selection revisions bind worksheet/header configuration, mapping/version,
selected rows, explicit source keys and proposed future actions. Validation runs
retain exact findings and reference digests. Approval binds all these identities.
New revisions/validation runs supersede approvals; changed references make approval
ineffective. Revalidate and review again. Approved metadata supplies no execution
capability. States are RECEIVED, VALIDATED, REVIEW_REQUIRED, READY_FOR_APPROVAL,
APPROVED, REJECTED and CANCELLED; no execution states or endpoints exist.

## Staged implementation and independent gates

| Stage | Proposed work | Required gate |
| --- | --- | --- |
| P9-1 published review base | Synthetic persistent review/approval, including enforced reviewer separation | PR #7 OPEN/DRAFT, unmerged; publication commit recorded above; historical evidence retained |
| P9-2A current | Customers only: internal synthetic native transaction, durable identities/receipts, reconciliation and recovery | Fresh isolated tests/audits/preservation; no company migration, executable production route, release or publication |
| P9-2B not started | Any later entity/dependency expansion | Separate owner authorization and independent review of P9-2A evidence first |
| Controlled master migration | Owner-approved customers/projects/LPO/items | Approved sources, keys/mappings/conflicts, permissions, signed dry run, recovery drill and explicit execution approval |
| Physical stock opening | Separately approved count/cutoff and lot/serial policy | Reconcile reservations/custody; native posting only; historical deliveries never generate stock issues |
| Operational acceptance | Complete synthetic chain and failure/recovery rehearsal | Stakeholder sign-off; no deployment implied |
| Company execution | NOT authorized | Approved infrastructure, storage/encryption/retention, maintenance and recovery plan, explicit owner authorization |

## Future import correctness requirements

- Approved private source bytes/hash, retention and access; current storage is synthetic only.
- Stable namespace/entity/source key plus content, parser/policy, mapping and reference
  versions. Identical retries return one receipt; changed content requires new approval.
- Duplicate detection within/across sources and against existing identities; explicit
  cross-file dependencies and conflict decisions. Never invent missing relationships.
- Native transaction boundaries, uniqueness and posting locks; demonstrate concurrent
  retries, crashes before/after commit, restart recovery and exact-once business effects.
- Reconcile planned/attempted/persisted counts and values; revalidate references immediately
  before future writes. Review concurrency alone is not execution idempotency.
- Transaction rollback before commit; approved domain reversals/amendments after commit.
  Never delete immutable ledgers to undo an import. Verify isolated recovery first.

## Synthetic end-to-end acceptance design

Use a disposable database and distinct synthetic operator/reviewer/approver/warehouse/
driver identities, preserving security and rate limits. Review Customer ? Project ?
LPO ? Order references with explicit item/unit/location mappings. P9-1 stops at
approved metadata and proves zero business-table writes.

A separately authorized later rehearsal may use native business operations to create
master/order fixtures, receive inventory, reserve/allocate, pick, pack actual dispatches,
assign a synthetic driver and deliver. Reconcile outstanding quantities, available/
reserved stock, immutable ledger, packing revisions and Global Item Journey. Exercise
partial fulfilment, duplicate retry, invalid references, concurrency, cancellation and
dispatch reversal. No invented BOM or historical-to-live stock conversion is allowed.

## Owner decisions

Source extracts/namespaces/keys; header, mapping, date/unit conventions; conflict
resolution; delivery status and LPO/SKU/driver/quantity relationships; physical count,
cutoff and lot/serial/custody policy; historical retention; production storage,
encryption, keys, retention/access/disposal; reviewer/approver delegation; dataset-
specific execution and release recovery objectives. Financial decisions remain
unapproved in PHASE_8C_FINANCE_DECISIONS.md. No tax/profit/revenue/accounting policy
is implemented. Synthetic approval cannot approve a company import.

## Open technical risks and evidence

Picomatch exception remains OPEN: no full remediation or owner acceptance implied.
Protected-navigation timeouts remain unresolved: earlier matched isolated runs passed
without reproducing them; retries are not proof of a fix. Company frontend timeout
activation was rolled back and is not reactivated here. Fresh P9-1 results are distinct
from inherited 375 backend / earlier browser evidence; see PHASE_9_P9_1_REPORT.md.

References: PHASES.md, PHASE_8_DATA_MAPPING.md, PHASE_8_OWNER_APPROVAL_CHECKLIST.md,
PHASE_8C_FINANCE_DECISIONS.md and PHASE_8_POST_INTEGRATION_CHECKPOINT.md.
