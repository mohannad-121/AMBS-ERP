# Phase 8B — Inventory Reconciliation & Global Item Journey

## Scope and release boundary

Local branch: `feature/phase-8b-inventory-reconciliation`, created from the verified Phase 8A checkpoint `64215ef41cce1a4b5d3c683e61b9b4aac699bc35`. Phase 8A remains stacked on Phase 7. Neither parent PR is merged or retargeted. This implementation is **read-only review**, not an adjustment/import workflow. No actual company file is submitted to an application endpoint; all automated fixtures and counts are synthetic, in generated scratch databases.

The owner's clarified scope authorizes physical-count comparisons and safe reports, independent company item history with search/filters/pagination, existing authoritative sources/RBAC and regression verification. It does not authorize a real count, business decision, stock posting, deployment, source commit or push. Existing posting workflows remain intact; this phase neither invokes them against the main database nor adds a posting/import endpoint.

## Changes

| Files | Purpose |
| --- | --- |
| `backend/app/services/inventory_review.py` | Paginated stock/ledger/reservation consistency read model; strict count proposals; reuse of Phase 8A parsing/reference validation; safe reconciliation CSV. |
| `backend/app/schemas/inventory_review.py`, `backend/app/api/inventory_review.py` | Bounded UUID/base-unit/lot count DTOs; inventory read permissions; administrator/operations-only physical previews; global journey permission gate; summary-only preview audit. |
| `backend/app/services/item_journey.py` | Shared authoritative history supports an independent item anchor, exact transfer directions, reservation consumption, actual document issue/change records, unambiguous closing audit actors, stable event identities, literal search, type/location/date/lot filters and pagination. Existing delivery scoping remains enforced. |
| `backend/app/api/onboarding.py`, `backend/app/core/body_limit.py`, `backend/app/main.py` | Register review routes and physical-stock-only reconcile/report routes with existing streamed upload limits, CSRF/session enforcement and content-free audit summaries. |
| `frontend/components/inventory-review.tsx`, `frontend/app/(erp)/inventory-reconciliation/page.tsx`, `frontend/app/(erp)/item-journey/page.tsx` | Independent permission-gated review screens, searchable reference selectors, count proposal, literal event filters, UTC dates, honest empty/error/loading states and direct item links. |
| `frontend/components/import-center.tsx`, `frontend/components/app-shell.tsx`, `frontend/lib/proxy.ts` | Add opt-in reconciliation beside the unchanged normal preview flow, comparison findings and CSV export, permission-qualified navigation and exact BFF allowlists. |
| `backend/tests/test_inventory_review.py` | Synthetic reconciliation/security/history/role/quantity/lot/serial/read-only regression cases. |
| `frontend/scripts/verify-inventory-review-browser.mjs`, `scripts/Verify-AuthIntegration.ps1`, `scripts/verify_security_containment.py` | Optional synthetic Chromium review workflow, restart checks and actual hardened HTTPS candidate coverage. Existing Phase 7/8A harness modes remain supported. |

No package versions, Next compatibility patches, ORS integration, database models or migrations change. No parallel item registry, event store, count table or stock ledger is introduced.

## Physical-stock reconciliation

`GET /api/inventory/review` joins existing stock buckets with the signed ledger sum and active reservation sum. It displays expected ledger quantity, cached quantity, active/cached reservations, allocatable available quantity, location/lot/base unit and consistency findings. Mismatches are reported, never repaired. Availability respects the existing item/location/warehouse/quality/lot eligibility rules. Reservations are holds, not an additional physical stock movement.

`POST /api/inventory/review/physical-preview` accepts at most 100 explicit item/location/lot/base-unit count proposals. Quantities must be finite, nonnegative and respect the unit precision. Tracked stock requires an exact lot/serial; serial counts are zero or one. Wrong units/lots and duplicate stock identities are rejected. A previously absent stock bucket is compared with zero recorded ledger quantity and explicitly flagged; no bucket is created. Counts below active reservations and ERP cache discrepancies require review. Positive difference means surplus, negative means shortage; neither is an instruction to post. Up to 20 supporting movement references are shown per row.

The existing Import Center now offers **Reconcile against ERP (preview only)** for physical-stock sources. `/api/onboarding/reconcile` and `/api/onboarding/reconciliation-report` accept only that category and reuse the inert Excel/CSV parser and authoritative reference/unit/relationship checks. At most 100 selected source rows may be reconciled. Missing/unknown/ambiguous SKUs, missing columns, duplicate identities (including different aliases resolving to one item/location), unit mismatches, invalid quantities, formulas and other source errors remain visible. All duplicates are flagged; rows are never combined. Original/proposed values remain separate. Invalid rows have no invented expected quantity or variance.

The CSV report binds the source SHA-256 and selected mapping/header settings to row findings, expected/count/difference/reservations and movement references. It is UTF-8, quotes every cell and neutralizes formula/control prefixes. Export recomputes a fresh comparison against the same source; the ERP state may have changed since the on-screen preview. CSV contents are private and are not stored in Git or the application database. Only actor/category/source digest/aggregate counts are audited. Manual proposal audits retain aggregate counts only.

## Global Item Journey

`GET /api/inventory/journey/{item_id}` and `/item-journey` work without a sales order or delivery. Both company-history and trace permissions are required. Sales/packing roles retain their existing delivery-scoped history, not global access. The API's item/lot identifiers and filters are typed/bounded; searching uses literal string comparison, not glob compilation.

Events reuse actual ledger effects, reservations, delivery preparation, purchase receipts, production evidence, posted counts and permission-scoped packing documents. They include receipt, signed transfer/custody effects, production input/output, reservation creation/closing/consumption, picked/loaded quantities, dispatch, return/quarantine, count adjustment, reversal and supported supplier-owned production evidence. Issued packing/delivery documents and their void/replacement records are explicitly documentary evidence, not proof of a physical packing event or additional stock dispatch.

Each event exposes recorded time, quantity/base unit, source/type, actual employee when established, recorded location, movement-line origin/destination and references. Dispatch links to the actual consumption/delivery/order relationship. Transfer effects retain both signed locations and the shared movement reference; summing both effects yields the correct company-level net movement. Reference quantities must not be added to ledger totals. For reservation release/cancellation, exactly one matching closing audit can establish the employee; missing/ambiguous evidence remains **Not recorded**. The creator/current viewer is never substituted.

Filters include item search, exact lot/serial, location (including either transfer endpoint), event type, literal employee/reference text and inclusive UTC date bounds. Date filters are applied to source queries and events; timezone-less or reversed ranges are rejected. Results have stable IDs/order and 100 events per page. Reviews fail explicitly beyond the 5,000-source-row/event budget and request a narrower date range or lot; they never silently return truncated history. Document/plan reference lists are capped at 100 and are supporting links, not exhaustive event totals.

## Security and preservation

**Unexpected repository visibility blocker:** final repository checks during this phase report `mohannad-121/AMBS-ERP` as **PUBLIC**, confirmed independently by `gh repo view` and the GitHub REST repository metadata. This differs from the verified Phase 8A private checkpoint. This task did not change the setting or publish any Phase 8B work. The owner explicitly replied **“I will handle visibility separately.”** The setting is therefore left unchanged. Publication/release privacy cannot be marked passed while this discrepancy remains unresolved; this reply is not security-advisory acceptance or permission to publish.

Existing authentication, secure sessions, CSRF, role checks, audit mechanisms, inventory posting lock and immutable ledger remain authoritative. Preview requests are bounded at 100 count rows/64 KiB for manual proposals; existing 4 MiB inert raw-file limits and 7,000,000-byte streamed JSON bounds apply to file previews. No filenames become paths, templates or glob patterns; no macros/formulas/external connections are executed. Results stay in request/browser memory. Inputs are rendered as text. No credential value or private source data is logged/published.

The **internal picomatch security exception remains OPEN**. The [publisher advisory](https://github.com/advisories/GHSA-fc5q-39xc-vjpf) is withdrawn. The implementation-run npm audit recorded **12 HIGH** findings/meta-vulnerabilities; the later checkpoint full and runtime-only audits both report **zero**, following the withdrawal/feed update. This is metadata evidence, not a library fix, and does not prove absence of the unversioned matcher bundled in Next. Dependencies remain unchanged. Existing optimizer closure, compatible Next patches and restricted production candidate remain intact. No risk acceptance, audit suppression, library patch or zero-risk claim is made.

## Verification

The final functional verification below is complete; repository privacy/security acceptance remains a separate unresolved release gate. Private raw evidence is kept under `artifacts/phase8b/` and the generated `artifacts/ambs-containment-*` HTTPS project. Failed/intermediate attempts are retained and are not counted as successful runs.

- Final full backend suite: **296 passed**, zero failures/errors, 1030.01 seconds. JUnit and all final backend application/test/migration source hashes were checked directly. The intermediate full run was intentionally interrupted when the read model was finalized and is not counted as a pass.
- Phase 8B regression/security cases: **24 passed** in the final full suite, covering variances, reservations/cache discrepancies, no business-table writes, absent buckets, duplicate identities, quantity/precision/serial bounds, source references/units, safe CSV/audits/CSRF, exact lots, partial deliveries/documents/reversals, actor evidence, literal filtering and role boundaries. Earlier focused runs also passed (20 cases plus the added document case).
- Final development Chromium: **15 + 12 after restart** passed, plus **24** baseline authentication/browser checks and **20** HTTP/BFF checks; harness exit 0 and isolated teardown complete. Refresh/logout/relogin, 375px phone and 812px landscape, reduced-motion/dark preference and responsive table scrolling checked. No console warnings, React/runtime or hydration errors in the successful final runs. Initial filter assertion raced replacement rendering and was corrected to wait for the row. One subsequent development restart run hit a refresh timeout; a new isolated full rerun passed without an application change. The timeout cause was not established and that failed run remains retained, not counted as a pass.
- Fresh TypeScript, ESLint, all three compatibility guards and both pinned production builds: **passed**, exit 0. Both CJS/ESM runtime compatibility checks passed in development.
- Final hardened HTTPS: **27 Phase 8B** (15 + 12 restart), **52 Phase 8A** (44 + 8) and **40 Phase 7** (28 + 12) Chromium checks passed against the actual final images, exit 0. Runtime non-root/read-only/private-port/owner-role rejection and closed developer/image endpoints passed. The trusted glob positive control fired; no untrusted application marker was compiled as a glob. No console, React/runtime or hydration diagnostics. Final evidence: `artifacts/ambs-containment-80246c06147f4fc6ab08080e4b2968fd/`.
- Main-database comparison: **all 70 table fingerprints unchanged**, under the established normalization of routine session last-seen timestamps. Private environment unchanged; sealed Phase 8A core/supplement/binding and every listed artifact rehashed unchanged. Alembic head `0009_packing_bom`; no schema drift. Original backend/frontend/PostgreSQL healthy. Original image/storage inventory also matches the Phase 8A backup. Post-test preservation and source scan are recorded in the final local evidence.
- Repository preservation: local/remote main and parent heads unchanged; PR #2 and #3 OPEN/unmerged with exact expected heads and no auto-merge. Phase 8B has no remote branch, staged files, new commit or push. **Repository visibility is PUBLIC, an unresolved external security blocker**, rather than the expected PRIVATE state.

## Limitations and owner decisions

- This is an unposted comparison, not a verified physical count, opening balance or adjustment approval. Actual count date/cutoff, accountable counter/reviewer, handling of reservations and permitted posting scope require a separate owner decision.
- A file is a partial scope. Omitted SKUs are **not zero**. Missing identities, descriptions or relationships are not invented. Units are the authoritative base units; no conversion or merging policy is assumed.
- The current physical-stock file format has no approved lot/serial mapping. Tracked source rows are marked **REVIEW_REQUIRED**; exact existing bucket/lot/serial proposals can be reviewed in Stock Reconciliation. Additional source mappings need owner confirmation.
- Historical deliveries/documents never generate a new stock issue. Backorder completion remains derived from real partial dispatch evidence, not a fabricated event. A packing document establishes document issuance, not an unrecorded physical packing action or signed receipt.
- Missing employees/times/locations remain missing. Supplier-owned production is not owned stock. Quantity/lot histories do not establish individual-piece identity without serial evidence.
- Snapshot exports may differ from a previous preview after concurrent legitimate operations. A separately authorized future posting workflow must recheck current versions, approved identity/scope and idempotency; it is not implemented here.
- Large catalogs require a narrower item search; very large histories require a narrower date/lot scope. Reference caps and review budgets are explicit, not an assertion of exhaustive company reconciliation.
- Parent PRs, remaining security acceptance and release approvals are separate gates. No commit/push/merge/deployment, real-data import, credential reset or Phase 8C implementation is performed by this work.

**Owner approval is required before any actual business-data or stock change.**

## Final local acceptance boundary

- [x] Read-only physical reconciliation and independent item journey implemented on the requested branch.
- [x] Final 296-case backend suite, frontend/static/build checks and final development/HTTPS browser regressions passed.
- [x] Existing Phase 7 and Phase 8A workflows retained and tested.
- [x] All 70 main-table fingerprints, private configuration, storage and existing backup hashes preserved; no new migration.
- [x] New work remains unstaged/uncommitted/local; no push, merge, deployment, real-data import or stock posting.
- [ ] Owner to handle repository PUBLIC visibility separately; expected private-release gate is not passed.
- [ ] Internal picomatch exception and any recurring development refresh timeout remain explicit limitations, not accepted/resolved risks.
- [ ] Real count/mapping/cutoff/reservation/posting decisions require separate written approval before any business-data change.

## Authorized GitHub review checkpoint

2026-11-18 (Asia/Dubai). The owner separately authorized committing only these reviewed Phase 8B changes, pushing only `feature/phase-8b-inventory-reconciliation` and opening PR #4 against `feature/phase-8a-data-onboarding`. The implementation-stage no-publication statements above describe the earlier handoff. This checkpoint does not authorize merge, deployment, real data import, stock adjustments, repository visibility changes, another phase or security-risk acceptance.

All **19** changed paths below were individually reviewed and belong to the approved read-only reconciliation/journey, security tests, UI integration and documentation scope. The business read models never call posting/repair/import services or write business tables. Audit/session metadata remains the sole permitted database side effect. No models, migrations, dependency locks or compatibility patches change.

Fresh checkpoint verification: **92 passed** (24 Phase 8B + 28 Phase 8A onboarding + 40 routing/journey), zero failures/errors in 174.78 seconds; TypeScript, ESLint, three Next compatibility guards, actual CJS/ESM router runtime checks and both pinned production image builds passed, exit 0. The earlier complete **296-case** backend run and successful **27 development / 27 HTTPS Phase 8B**, **52 HTTPS Phase 8A**, **40 HTTPS Phase 7**, 24 authentication-browser and 20 HTTP/BFF checks are supported by raw source-hash/JUnit/log/exit verification. Those full/browser suites were not rerun wholesale during publication. Only this documentation checkpoint note changed after the verified implementation inventory. The earlier intermittent development refresh timeout remains disclosed above.

Source, staged content and Git history must pass configured-secret/pattern scans and redacted Gitleaks before commit/push. Private-reference literal scanning found no match in any changed Phase 8B file; only the previously reviewed inherited synthetic master-data fixture overlap remains in baseline/history. Original workbooks/prototypes, environment files, recovery archives, generated reports and private evidence stay excluded. These bounded scans and manual review are not proof that arbitrary unknown private information can never occur in historical source.

Repository visibility is **PUBLIC**. The owner's instruction to leave visibility unchanged is respected; this is a source-review checkpoint at that existing visibility, not a claim of a private PR or resolution of the separately owner-managed privacy/release issue. PR #2 and PR #3 remain OPEN at their exact prior heads. The new PR is stacked on PR #3 and transitively PR #2, never targeted at main. No auto-merge is enabled.

The internal picomatch exception remains **OPEN**. The earlier implementation npm audit recorded 12 HIGH findings/meta-vulnerabilities. Fresh checkpoint full and runtime-only npm audits now both report zero after the publisher/feed withdrawal. Dependency inputs and vendored Next code remain unchanged; this is not a demonstrated library remediation, proof of zero risk or owner security acceptance. The existing internal exception is deliberately retained for owner/security review.

### New recovery backup and preservation

`C:\AMBS-Backups\AMBS-ERP\AMBS-ERP-PostPhase8B-20261118-212537`

A fresh PostgreSQL custom dump passed catalog/full-decode checks and a separate network-none, non-root scratch restore with a new labelled volume and no host ports. **All 70 restored table fingerprints match**; head is `0009_packing_bom` with no schema drift. The live 70-table inventory, users/credentials, business records, balances, ledger, reservations and private configuration remain unchanged under the established session last-seen normalization. Storage archive/member hashes and prior backup core/supplement/binding hashes remain verified. Only generated scratch restore resources were removed.

The reviewed source ZIP/Git-blob inventory, dump, private storage, age-encrypted environment, private original references, evidence, recovery instructions and SHA-256 manifests are preserved locally. Environment ciphertext is a byte-identical copy of prior decrypt/hash-verified ciphertext after confirming the current configuration is unchanged; **no fresh decryption occurred**. Recovery requires the existing separately held passphrase. The backup is owner/SYSTEM ACL-restricted; dump/storage/private originals are not individually passphrase-encrypted and require approved encrypted storage/transport off-host. No private archive or raw company source is published.

The final source commit, exact PR base/head, backup manifest SHA-256 and clean-tree/unchanged-parent/data/health verification are recorded in the external backup `checkpoint-binding.json`, its SHA-256 companion, the PR description and the final checkpoint handoff. This avoids embedding a commit's own hash in its tracked report. The sealed backup and all publication gates must pass before a normal feature-only push. No visibility change, merge or deployment is performed.

### Reviewed 19-file inventory

- `backend/app/api/inventory_review.py`
- `backend/app/api/onboarding.py`
- `backend/app/core/body_limit.py`
- `backend/app/main.py`
- `backend/app/schemas/inventory_review.py`
- `backend/app/services/inventory_review.py`
- `backend/app/services/item_journey.py`
- `backend/tests/test_inventory_review.py`
- `docs/PHASE_8B_REPORT.md`
- `frontend/app/(erp)/inventory-reconciliation/page.tsx`
- `frontend/app/(erp)/item-journey/page.tsx`
- `frontend/components/app-shell.tsx`
- `frontend/components/import-center.tsx`
- `frontend/components/inventory-review.css`
- `frontend/components/inventory-review.tsx`
- `frontend/lib/proxy.ts`
- `frontend/scripts/verify-inventory-review-browser.mjs`
- `scripts/Verify-AuthIntegration.ps1`
- `scripts/verify_security_containment.py`

Checkpoint backup core manifest SHA-256: `db8af1a4e2d01a16f2bfc4b42f6d70197994e5d63504f826669d655e412e7d48` (37 artifacts, 261 source files). The core stays immutable. This documentation-only advisory-feed update is preserved in a separately hashed final-source supplement and staged-content audit; no implementation, dependency, schema or test changes follow the verified runs. The external publication binding links both manifests to the actual source commit and PR head.

## Targeted concurrency follow-up

The original review-held lock lifecycle is superseded by the [PR #4 concurrency review](PHASE_8B_CONCURRENCY_REVIEW.md): guarded read-only repeatable-read snapshots, bounded review admission and short authentication/audit boundaries. Existing posting locks and business records remain unchanged. See that report for final verification evidence and explicit limitations; no merge, deployment or real-data change is authorized.
