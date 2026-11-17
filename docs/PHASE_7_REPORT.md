# Phase 7 implementation and verification report

## Scope and baseline

Baseline main/origin/main: `0264699e1ab11d4c4dc2ac6e243f0faf569bc9ef`. Local working branch: `feature/phase-7-packing-bom`. Repository `mohannad-121/AMBS-ERP` was verified PRIVATE. The implementation run ended without commit, push, PR, merge or deployment. A subsequent user-authorized final security/backup/private-PR review is recorded in PHASE_7_RELEASE_REPORT.md; merge, deployment and Phase 8 remain unauthorized. Previous Next.js/React pins and compatibility patch remain intact.

The four original workbook/HTML/ZIP references were not available in the approved workspace or supplied attachments. Their descriptions in the Phase 7 brief were inspected; no historical catalogs, prices, formulas, customers or delivery data were imported.

## Implemented behavior

- Delivery-linked preparation PDF with distinct planned, verified picked, loaded and dispatched quantities.
- Separate official Packing List and Delivery Order PDFs requiring actual DISPATCHED sales consumption evidence. Partial dispatch 15 -> 8 + 7 is preserved, and picked 8 / loaded 6 documents only 6 after dispatch.
- Immutable JSON/content/PDF/image snapshots with SHA-256, actor-bound request keys, unique revisions, controlled replacements/voids and audited reprints. Reversal preserves original bytes and exposes current source status. Issued master-data and image changes do not rewrite history.
- A4 AMBS red/amber stationery, escaping, protected thumbnail decoding, missing-picture states, repeated multi-page headings, reference/page footer, long-text wrapping and empty signature areas. No prices, taxes or fabricated acceptance evidence.
- Versioned single-level BOM definitions, draft editing, submission and explicit management approval. Database guards protect submitted content, components, approval evidence and lineage. One effective approved version per item; changed definitions create another reviewed version.
- Decimal quantity-per-output calculations from actual outstanding confirmed sales lines or full active production targets. Shared components aggregate before upward unit-precision rounding; optional allowance is applied only when explicitly defined. Missing approval is unknown requirement, never a fabricated zero.
- Availability reuses the current inventory engine. Reserved, usable available, blocked and external stock remain separate; confirmed unreceived purchasing quantities are expected incoming only. Partial receiving changes stock only through the existing ledger.
- Immutable planning snapshots, staleness checks, review and linked recalculation. Documents/BOMs/plans never post inventory, reserve materials, create purchases or imply production completion.
- Permission-aware screens and navigation, sales delivery panels, assigned-driver documents, item/BOM/plan links, production links and separate read-only Item Journey references. Existing authentication, CSRF, Origin, session, RBAC, cost visibility and audit controls remain authoritative.

Architecture and operating rules are detailed in PACKING_DOCUMENT_ARCHITECTURE.md, PACKING_PDF_SPECIFICATION.md, BOM_VERSIONING_AND_APPROVAL.md, MATERIAL_REQUIREMENTS_RULES.md and PHASE_7_OWNER_APPROVAL_REQUIREMENTS.md.

## Database and preservation

Additive migration: `0009_packing_bom`, following unchanged `0008_delivery_routes`. Eight new tables; no new stock balance engine. Alembic current/check passed at the new head.

Fresh pre-Phase-7 backup: `C:\AMBS-Backups\AMBS-ERP\AMBS-ERP-PrePhase7-20261117-203915`.
Manifest SHA-256: `25bba7d09a6d3ee42b1e1ccf1cb6ddd43573d57e7c86f174bd3d2e649b3480cd`.

Source archive CRC/member hashes, PostgreSQL full decode/fresh scratch restore and all 62 preexisting table fingerprints matched. Private image archive and encrypted configuration were verified; configuration decryption/hash verification occurred in memory using a locally entered passphrase. The initial failed encryption attempt is retained in the backup audit; the successful retry was verified before implementation. The manifest and every artifact hash were rechecked before migration.

All 62 main table fingerprints still matched the backup immediately before migration. After migration, all 59 non-policy old tables matched exactly, every existing permission/grant row remained intact, and only 14 new permissions / 45 new role grants were added. All eight Phase 7 tables were empty. No administrator credential/account, business row, stock quantity, historical migration, image volume or private environment value was replaced or seeded.

## Regression evidence

| Gate | Evidence / result |
| --- | --- |
| Baseline | 222 backend tests passed before changes (483.60 seconds) |
| Phase 7 cases | 22 new PostgreSQL/PDF tests; all passed in the latest 41-case packing/master-data regression run (177.93 seconds) |
| Post-implementation suite | PASS across the interrupted/resumed execution: 144 consecutive passes before Docker stopped, then all remaining 99 passed in 303.06 seconds; 243 cases, plus the final added BOM master-identity case passed in the 41-case regression run: 244 distinct backend cases verified, with no test failures |
| Latest targeted changes | 3 cases passed: actual protected image/snapshot reprint, draft/loaded/reversal, procurement/reserved/blocked/external separation |
| Concurrency/idempotency | Simultaneous same-key issue returns one document; replay, conflicting actor, duplicate issue and controlled replacement verified |
| RBAC | Packing, Operations, Management, Sales, Driver and Accounts restrictions; assigned driver positive access and unrelated driver generic 404; approval confirmation required |
| No stock mutation | Balance/reservation rows and ledger-effect count unchanged by document/BOM/plan/review actions |
| Static frontend | TypeScript, ESLint with zero warnings and all 3 compatibility guard tests passed |
| Production build/browser | PASS on the final source: isolated Next production build, CommonJS/ESM runtime checks, 28 Phase 7 workflow checks and 12 restart checks; zero console/React/hydration diagnostics |
| Development browser | PASS: authentication, master data, inventory, purchasing/production, sales/partial dispatch, routing/journey and premium UI workflows verified across the interrupted/resumed chain; final Phase 7 28 workflow + 12 restart checks passed with zero console/React/hydration diagnostics |
| Dependency audits | Runtime frontend audit: zero vulnerabilities. Locked Python audit: zero known vulnerabilities. Full npm audit: 12 high development-tool vulnerability/meta-vulnerability findings, all rooted in one picomatch advisory; no patched picomatch release is available |
| PDF quality | Four synthetic fixture PDFs, 8 rendered pages inspected, plus browser-generated Delivery Order rendered/inspected; extraction validates escaped text, quantities, images, repeated headings and empty signatures |
| Main health | Backend/frontend/PostgreSQL healthy after Docker recovery; final preservation recheck passed with all old data/policies preserved and eight new tables empty |
| Source security | Complete redacted source/configured-secret/history audit passed (222 files, 647 Git objects, zero findings); final evidence in artifacts/phase7-source-audit-final.json |

Private ignored evidence is under `artifacts/phase7*`: browser screenshots/downloads, PDF page PNGs, baseline/full/resumed/targeted pytest logs, preservation and audit results. Tests use isolated generated PostgreSQL databases and synthetic identities; routing is mocked and the real ORS key is cleared in test stacks. No real administrator credentials are used or reset.

During implementation the Docker Desktop engine stopped during a combined verification run. The later release review completed all 244 backend tests uninterrupted (645.61 seconds); see PHASE_7_RELEASE_REPORT.md for fresh gates. Earlier partial executions below remain historical evidence.  It was recovered without volume deletion or database reset. Incomplete executions are not reported as completed passes. An earlier development browser attempt received HTML during an API request; that attempt was excluded and the frozen-source checks were rerun. The known migration and interrupted HTTP scratch databases were removed with name/activity guards. One unattributed inactive test database without an Alembic table was left untouched. Final verification outcomes below supersede intermediate attempts.

## Dependency security limitation

The complete frontend lockfile was checked against the official npm Bulk Advisory endpoint (246 package names / 255 package-version entries), including development dependencies. It returned GHSA-fc5q-39xc-vjpf / CVE-2026-112366 for picomatch 2.3.2 and 4.0.7. Both lock entries are development-only; existing micromatch and tinyglobby bring them in. Neither version was changed by Phase 7. The advisory was updated on 2026-11-17; the official registry latest is 4.0.7 and the advisory lists no patched version. The ordinary full npm audits eventually completed after a long remediation/meta-vulnerability calculation and reported 12 high findings across development tooling (including affected dependent packages). The direct bounded registry result independently confirms one underlying advisory. Neither is reported as a clean audit. No audit fix, unsupported major substitution or private library patch was applied.

This is an unresolved development/build tooling security finding. Runtime dependency audit and the Python locked audit remain clean. The npm proposed automated remedies would change/downgrade the Next ESLint and TypeScript ESLint toolchain; these were not applied blindly. Keep build/glob inputs trusted and require a reviewed upstream remediation and fresh audit before unconditional security acceptance. This finding does not authorize a deployment or hiding the advisory.

The final release review additionally found an unversioned matcher bundled within Next, outside standalone npm dependency counting. Its inspected runtime image-pattern call sites use trusted configuration, with no business-user pattern input found. A clean runtime-package audit does not establish absence of vendored code; see PHASE_7_SECURITY_REVIEW.md for the complete reachability analysis and OPEN owner-review exception.

Sources: [npm audit endpoint specification](https://docs.npmjs.com/cli/v11/commands/npm-audit/#bulk-advisory-endpoint), [reviewed picomatch advisory](https://github.com/advisories/GHSA-fc5q-39xc-vjpf).

## Dependencies and files

New hash-pinned packages: ReportLab 4.5.1, charset-normalizer 3.5.2 and pypdf 7.1.0 (PDF extraction tests). Existing Next 16.4.6 / React and ReactDOM 19.3.1 pins remain unchanged. PDFium/Pillow rendering helpers were installed only in ignored local QA tooling, not the application dependency set.

The final additional identity/selection regression passed (1 case, 7.77 seconds). The original 243-case matrix and this added case total 244 distinct backend cases; the 41-case rerun verifies all packing and master-data cases against the final identity guard.

The existing master identity guard now also protects unit precision and item/variant identity referenced by submitted BOMs; the new regression covers output/component changes and allows ordinary name corrections. Bounded selection lists prioritize the explicitly selected identity so existing source/item links remain usable in a large catalog.

Primary additions: backend packing models/schemas/API, packing/PDF/phase7/material-planning services, migration 0009, test_packing.py; frontend packing/manufacturing screens and three route pages; strict BFF PDF paths/headers and existing workflow links; isolated browser verifier and harness options; six Phase 7 documents and relevant setup/architecture/permission/recovery documentation updates.

## Owner approvals and acceptance

No AMBS engineering BOM has been fabricated, seeded or approved. STD/MAXI/vertical-net and other real product families need approved per-variant definitions, engineering source, allowance, packaging and conversion policies. Current PL-/DO- UUID-derived numbering needs owner confirmation for any legal/sequential rule. Original workbook stationery, Arabic/bilingual shaping/signature capture, recursive BOMs, advanced engineering/nesting and automatic kit consumption remain outside the verified rules.

The implemented generic framework can operate truthfully with no approved BOMs. The functional Phase 7 framework and regression matrix are verified for owner review. Unconditional security acceptance remains blocked by the unpatched development/build-tool advisory (12 npm high findings from one underlying advisory). Operational use of real engineering definitions and stationery still requires the owner decisions listed above, and any deployment/release needs separate authorization. This report does not claim full production readiness. No Phase 8 work was started.
