# Phase 8A — real data validation and import preview

## Baseline and scope

Local stacked branch: `feature/phase-8a-data-onboarding`, created from exact Phase 7 commit `225c915977a2737c60fb4fd4e568988c05dc666b`. It depends on unmerged [PR #2](https://github.com/mohannad-121/AMBS-ERP/pull/2). Main remains `0264699e1ab11d4c4dc2ac6e243f0faf569bc9ef`. No commit, push, PR edit/merge, deployment or Phase 8B implementation is authorized or performed by this phase.

Publication follow-up: the separately authorized [Phase 8A GitHub checkpoint](PHASE_8A_GITHUB_CHECKPOINT_REPORT.md) records source publication to a private stacked PR. The implementation-stage no-publication statements above describe that earlier handoff; no merge, deployment, real-data import or Phase 8B work is authorized by publication.

**PREVIEW ONLY — NO DATA HAS BEEN IMPORTED.** The Import Center has no final import button or backend import endpoint. It does not create/update customers, items, orders, deliveries, BOMs, stock balances or ledger effects from source rows. Actual company files were inspected offline, not uploaded to the live API. Automated fixtures use isolated scratch databases and generated accounts; the real administrator's credentials are not used/reset.

## Implementation and files

| Files | Change |
| --- | --- |
| `backend/app/services/onboarding_files.py` | New bounded, inert OOXML/CSV parser; memory-only processing, no extraction/network/evaluation. |
| `backend/app/services/onboarding.py` | New header suggestions, source/proposal separation, normalization, duplicate/reference/quantity/status validation, authoritative ERP DTO checks and formula-safe CSV reports. Existing ORM models are read only. |
| `backend/app/api/onboarding.py` | New SUPER_ADMIN/OPERATIONS-only options, inspect, validate and report routes. CSRF/session protection is inherited; content-free audit metadata only. No import, retained-file, job or staging endpoint. |
| `backend/app/main.py`, `backend/app/core/body_limit.py` | Register preview routes and bound their streamed JSON bodies to 7,000,000 bytes before parsing. Existing endpoint limits are preserved. |
| `backend/tests/test_onboarding.py` | Synthetic CSV/OOXML security, normalization, reference, authority, audit, RBAC and mutation regression tests. |
| `frontend/app/(erp)/imports/page.tsx`, `frontend/components/import-center.tsx`, `frontend/components/import-center.css` | Server-side role gate and responsive three-step Import Center using AMBS red/amber/white tokens. Visible labels, error focus, loading/disabled controls and paged results. |
| `frontend/components/app-shell.tsx` | Role-qualified Import Center navigation; existing permission-based links remain supported. |
| `frontend/lib/proxy.ts` | Exact preview route allowlist, bounded upload forwarding and fixed-name CSV attachment headers. No user-controlled glob patterns or external URLs. |
| `frontend/scripts/verify-onboarding-browser.mjs` | Dedicated synthetic browser workflow covering UI, exports, role restrictions, no data changes, responsive layout, refresh/logout/login and restart resubmission. |
| `scripts/Verify-AuthIntegration.ps1` | Optional `-Onboarding` verification in the existing isolated development/production browser harness; normal prior workflows preserved. |
| `scripts/verify_security_containment.py` | Optional `--onboarding` run using the actual hardened HTTPS candidate and its existing glob observer. Default Phase 7 verification remains intact. |
| `docs/PHASE_8_DATA_MAPPING.md`, `docs/PHASE_8_OWNER_APPROVAL_CHECKLIST.md`, `docs/DBEAVER_SETUP.md`, this report | Actual source structure, mapping/quality rules, plain-language approvals, read-only audit inspection and evidence/limitations. |

No package/dependency versions, historical migrations, authoritative business models, Next compatibility patches, ORS client, engineering definitions or original company files were changed. No additional parser dependency or alternative inventory/customer/item registry was introduced. Existing supplier-specific JSON import preview remains separate and unchanged.

## Import Center behavior

1. Authorized staff choose customers, projects, LPO references, items/variants, units, categories, historical packing/deliveries or physical-stock review.
2. Upload `.xlsx` or CSV; inspect detected sheets, physical row numbers, sample cells, formulas and one-/two-row header suggestions. Confirm rather than blindly trust heuristic suggestions.
3. Map stable source column letters to supported ERP fields. Confirm the date convention. Reusing a source column for several fields or mapping unknown fields is rejected.
4. Validate deterministically against existing authoritative entities and their current field rules. Original text and proposed normalized values remain separate. Missing required fields, duplicate identities/SKUs, spelling hints, existing matches, unknown/ambiguous relationships, inactive references, unit mismatches/precision and quantity/order support are reported.
5. Review totals, valid/invalid rows, possible duplicates, missing relationships, existing matches and records requiring review. These categories may overlap. “Valid” means the implemented checks passed, not approval to import. Displayed and returned mutation counts remain zero.
6. Export a CSV report containing source SHA-256, sheet/header/date/mapping selection, summary and row-level original/proposed values/issues. Cells are quoted and formula/control-prefix escaped. File contents remain unchanged; the report is an intentionally safe representation.

Files and preview results are not stored on the server or in browser persistent storage. Request objects are released after processing; the authenticated page holds its own in-memory state. Clear removes that page state; refresh/re-login requires source selection again. A retained source can be revalidated after a backend restart, without a persisted preview batch or cross-user file URL. Garbage collection is not represented as forensic memory erasure. Audit/session records are the only allowed database side effects.

## Original sources and compatibility

Both original workbooks, `AMBS_EdgeOps.html` and `files.zip` were found in Downloads. Both workbooks parsed offline in a network-disabled, read-only container. The 14-sheet packing workbook is a form/print reference containing formulas, images and printer metadata; it is not blindly treated as flat approved records. The four-sheet tracking workbook has a row-2 header candidate and genuine `DELIVERD`/`DELVERD` spelling variations. The mapping document records structural/aggregate findings without customer identities or records. HTML prototypes were read as inert source; scripts were never executed. No prototype balances/BOMs/engineering assumptions were imported.

Supported Excel input is standard transitional OOXML `.xlsx`, with inline/shared strings, numerics and recognized 1900/1904 date styles. Images/printer settings are inert/ignored, not rendered/executed. Legacy `.xls`, `.xlsb`, macro-enabled `.xlsm`, encrypted workbooks, HTML, ZIP data imports, executable/embedded documents, external relationships/connections and XML entity declarations are rejected. Formula/error cells are shown and flagged, never calculated or replaced by cached answers. Strict UTF-8 or BOM-marked UTF-16 CSV is supported; invalid encodings require a corrected source.

Bounds: 4 MiB raw upload; 16 sheets; 2,000 nonempty rows/sheet; 5,000/workbook; 50 nonempty columns; 50,000 populated cells; 2,048 characters/cell and 1,000,000 accumulated cell-text characters. ZIPs are limited to 256 unique safe members, 16 MiB expanded total, 8 MiB/part and a 200:1 part expansion ratio. There is no arbitrary archive extraction or filesystem path. References are budgeted at 10,000 rows/entity; larger catalogs require a scoped future design. Similarity hints use bounded deterministic candidate buckets and do not constitute exhaustive entity resolution.

## Existing operations and tracking review

Inventory remains authoritative in `StockMovement`, `MovementLine`, `LedgerEffect`, `StockBalance` and `Reservation`; purchasing, production/custody, sales/partial deliveries, packing/BOM/planning and routing continue using their existing models/services. No spreadsheet-generated tracking events are added.

| Business action | Existing authoritative evidence / Item Journey behavior |
| --- | --- |
| Purchasing receipt | Posted purchase receipt movement/ledger effects and `PurchaseReceipt` links expose Received events. Supplier/service-only evidence is not invented as owned stock. |
| Warehouse/custody transfer | Paired signed ledger effects share the movement reference; movement kinds map to Moved/Custody transfer. |
| Reservation | `Reservation`/allocation links expose Reserved and existing released/cancelled states. Consumption remains linked to actual sales/ledger evidence. |
| Picking/loading | Actual `SalesDeliveryLine.picked_quantity` / `loaded_quantity` with delivery actor/timestamp; preparation is not treated as stock dispatch. |
| Dispatch/partial/backorder fulfillment | Posted ISSUE/consumption evidence exposes Dispatched; original order lines/consumption derive remaining demand. No second backorder ledger or spreadsheet-created demand. Later partial fulfillment uses its real delivery evidence. |
| Reversal/return/count | Compensating ledger effects, returned-to-quarantine movements and posted physical-count evidence remain visible; history is not rewritten. |
| Production-related movement | Owned-stock input/output/custody ledger effects link to production stages/orders. Supplier-owned non-ledger events are explicitly labeled as not owned stock. |
| Documents/plans | Existing permission-scoped packing-document and material-plan references remain non-stock evidence. |

The UI exposes event, time, employee, signed quantity/unit, location and reference; the selected item and delivery establish item/order context. Source records carry movement/order/receipt/production links. Existing regressions verify received/reserved/picked/loaded/dispatched events, reversal, read-only behavior and role scoping.

**Phase 8B gaps, intentionally not filled with fabricated history:** Item Journey currently requires a delivery/item anchor, so an item without a delivery is reached through existing inventory records/traceability rather than a new standalone global timeline. Transfer FROM/TO is inferred from paired signed location effects and the shared movement; the timeline does not present dedicated origin/destination columns. Reservation closing employee is not always recorded and is honestly shown as “Not recorded.” Backorder completion is derived fulfillment rather than a distinct timeline event. A separate reservation-consumed narrative and stronger explicit business-reference navigation could improve clarity. Review these existing read models later; do not introduce a competing tracker or backfill events from historical Excel.

## Driver/route verification

Existing routing separates assigned driver, verified origin/destination, delivery status/trip events, provider status, planned road distance, estimated driving duration and calculation time/provider/profile. The UI explicitly says an estimate is not live traffic, actual distance travelled or proof of arrival, and warns that driving-car is not necessarily truck-compliant. Existing routes/permissions and provider quotas remain untouched. No GPS collection is added. ORS is cleared/mocked in automated verification; no live ORS request is authorized or made.

## Database, security and preservation

No tables or migration are added; head stays `0009_packing_bom`. Raw workbooks, rows and reports are not staged in PostgreSQL. Existing `AuditEvent` records only actor/category, source digest and aggregate counts; parsed-file validation rejections retain generic reason/category, not filenames or row content. Schema/size rejections use existing request/error handling without retaining source values. Browser/API access is restricted to SUPER_ADMIN/OPERATIONS, including export. Sales, driver, accounts, management-only and anonymous users cannot access source previews. The BFF and backend both bound request bodies; normal CSRF, HTTPS, session, RBAC and audit controls are preserved.

No `eval`, JavaScript/HTML execution, external workbook fetch, user-selected filesystem path, uploaded template rendering or user-controlled glob compiler is introduced. Phase 7 image-optimizer closure, pinned standalone candidate, non-root/private-network/file-secret controls and existing compatibility patches remain intact. The test-only glob observer remains QA instrumentation; it is not a private library patch.

**OPEN:** CVE-2026-112366 / GHSA-fc5q-39xc-vjpf remains a developer/build and vendored-Next residual availability risk. No dependency remediation, report suppression, forced upgrade, risk acceptance or security clearance is claimed. The new parser has bounded conservative format support; unknown formats, very large catalogs, engineering/variant identity decisions, cross-file reconciliation and broader status mappings require explicit review. This phase does not certify a future commit/import workflow or a production deployment.

Checkpoint status update (2026-11-18): GitHub now marks the [publisher advisory withdrawn](https://github.com/advisories/GHSA-fc5q-39xc-vjpf), while the current npm registry bulk response still returns a picomatch finding. The earlier OPEN wording records the implementation review and the **internal exception remains OPEN** pending owner/security reconciliation. Withdrawal is not represented as a patch, proven absence of risky pattern behavior, or owner risk acceptance. Installed dependencies and vendored code were not changed.

## Verification results

| Gate | Final result |
| --- | --- |
| Full backend suite, final implementation | **272 passed**, 0 failures/errors, 736.86 seconds; all 244 existing regressions plus 28 new onboarding tests. Complete JUnit retained. |
| Frontend TypeScript / ESLint | Both passed, exit 0. |
| Next compatibility | All 3 guards passed; CJS and ESM real-runtime checks passed. Existing distribution patch unchanged. |
| Production builds | Pinned frontend standalone/Webpack and backend production images built, exit 0. |
| Fresh development baseline auth | 24 Chromium authentication/hydration checks and 20 live HTTP/BFF checks passed. The baseline deliberately checks an invalid login and records its expected HTTP 401; this is not an unexpected runtime/hydration error. |
| Fresh development onboarding | **44** Chromium checks + **8** after restart passed: inspection/mapping, duplicates/spelling/Unicode/formulas, deterministic reports, authorized/denied source and export access, zero customer/inventory changes, no import/file endpoints, 390/360px overflow checks, clear/refresh/logout/subsequent login and restart resubmission. |
| Hardened production HTTPS onboarding | **44 + 8** Chromium checks passed against actual built images, Secure-cookie production mode, private networks, non-root/read-only containers and a non-owner database role. Dedicated generated test administrator; no real-user credentials. |
| Production Phase 7 workflows | **28 + 12** existing packing/document/BOM/material-plan/RBAC/persistence Chromium checks passed in the same isolated HTTPS candidate. |
| Diagnostics | No unexpected console warnings, React/runtime, Suspense or hydration errors in the final onboarding workflows. |
| Glob containment | QA observer positive control confirmed; no untrusted marker compiled as a glob during new upload/validation/export paths and existing workflows. Production optimizer/debug endpoints remain closed; owner credentials refused. |
| Migrations | `0009_packing_bom (head)`; Alembic reports no new upgrade operations. Fresh test databases migrate successfully. No migration files changed. |
| Live preservation | All **70** table fingerprints unchanged under the existing session last-seen normalization, including user credentials/business records/ledger. Private environment hash unchanged. All 38 sealed PostContainment backup artifacts and its binding rehashed successfully; historical backups preserved. |
| Repository/release boundary | Phase 7 local/remote feature head and PR body/state unchanged; PR #2 OPEN, main unchanged, repository PRIVATE. Local stacked branch still at the verified dependency commit with uncommitted Phase 8A work; no commit/push/merge/deployment. |
| Docker | Original development backend/frontend/PostgreSQL remain healthy. Disposable QA resources removed by guarded harness teardown. |

Final local evidence: `artifacts/phase8a/backend-final-full.log`, `backend-final-results.xml`, `development-browser-pass.log`, `production-https-complete.log`, `final-build-checks.json`, `final-preservation.json`, original-source structural/quality metadata and synthetic screenshots/reports. The final HTTPS trace/result is under `artifacts/ambs-containment-d6f1eb646b204da0ade8e49dd9fff858/`. These ignored files are private verification evidence, not source files to publish.

An earlier full 271-case run passed before the final authoritative-field refinements and is retained as intermediate evidence, not substituted for the final 272-case run. Failed browser attempts are retained: an initial action-row layout issue was corrected, an alert selector was scoped to the Import Center rather than Next's separate accessibility announcer, and a shared synthetic login identity hit the deliberately preserved authentication attempt limit. The final harness uses a separate synthetic onboarding administrator; no login limits or security checks were disabled/reset. Only the complete final runs above count toward acceptance.

## Owner inputs and Phase 8B boundary

Use [PHASE_8_DATA_MAPPING.md](PHASE_8_DATA_MAPPING.md) and [PHASE_8_OWNER_APPROVAL_CHECKLIST.md](PHASE_8_OWNER_APPROVAL_CHECKLIST.md) to confirm source revision/table boundaries, column/date meanings, canonical customers/projects/LPOs, SKUs/units/categories/item types/variant definitions, all unrecognized status labels, driver references, supported quantities and overlap with existing ERP history. A current physical count requires accountable staff verification and separate audited posting approval. Formula-dependent form values need an owner-approved source, never invented/cached answers.

**Phase 8A functional acceptance: PASS for the bounded preview-only scope.** Phase 8B implementation/real data import remains unapproved. Any future import must bind an exact source hash and row scope to explicit owner authorization, define duplicate/legacy-reference/idempotency policies and preserve the immutable ledger. Phase 7's unmerged dependency and unresolved security decision remain separate release gates. Passing these functional checks is not owner security-risk acceptance or permission to publish/deploy.
