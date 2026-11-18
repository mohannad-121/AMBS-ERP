# Phase 7 verified private release report

Review completed: 2026-11-18, Asia/Dubai.

## Final verdict

**PRIVATE REVIEW PR PREPARED. SECURITY CONDITIONAL PENDING EXPLICIT OWNER APPROVAL.**

BACKUP: PASS. RESTORE: PASS. Functional TESTS: PASS. SECURITY: CONDITIONAL (OPEN exception, not remediated and not risk-accepted). PRIVATE PUSH: PASS. PR: CREATED. MERGE: NOT PERFORMED. DEPLOYMENT: NOT PERFORMED. Phase 8: NOT STARTED.

The generic Phase 7 implementation is verified for review. This is not unconditional production readiness or permission to activate unapproved AMBS engineering specifications.

## Exact source and GitHub identity

- Repository: [mohannad-121/AMBS-ERP](https://github.com/mohannad-121/AMBS-ERP), **PRIVATE**, verified before and after source push.
- Branch: `feature/phase-7-packing-bom`; target: `main`.
- Approved main baseline: `0264699e1ab11d4c4dc2ac6e243f0faf569bc9ef`; main was neither merged into nor rewritten.
- Verified application/source commit: `985fc9a7183e5adb2da31d08ebd58a6555729db1`.
- Commit message: `feat: implement Phase 7 packing documents and BOM planning`.
- PR: [Phase 7 - Packing Documents, BOM & Material Planning](https://github.com/mohannad-121/AMBS-ERP/pull/2). State OPEN, merged=false, auto-merge unset.

This publication report follows in a separate documentation-only commit, as in the Phase 6C release workflow. Its final PR head is recorded in the protected backup's `release-binding.json`, the PR description and the final handoff. The application commit above identifies the fully tested code. No release tag, public release asset, branch deletion, force-push or deployment is part of this operation.

## Reviewed scope

The 222-file implementation snapshot initially matched the previous frozen source byte-for-byte. Review covered every uncommitted Phase 7 path and the complete dependency/permission/migration boundary. Only release documentation changed during this review; application code, Next/React pins and router protections stayed fixed throughout verification.

The source commit contains 46 reviewed changed files: delivery-linked preparation/issued Packing List and Delivery Order PDFs; immutable content/hash/revision/void/reversal evidence; approved single-level BOM versions; Decimal material snapshots/shortages; protected pictures; RBAC/driver ownership and audit; necessary existing-screen integrations; migration 0009; regression tests; and architecture/security/recovery documentation. It does not add new business features beyond Phase 7.

## Final regression gates

| Gate | Actual final result |
| --- | --- |
| Complete backend pytest | **244 passed in one uninterrupted run**, 645.61 seconds; zero failures, errors or skips. JUnit XML preserved. |
| PostgreSQL/domain coverage | Real isolated databases: concurrency/idempotency, partial dispatch 8+7, pick 8/load 6, immutable/reversed PDFs, image/privacy, BOM approval/revision/master identity, Decimal aggregation/rounding, availability/receipts, RBAC/assigned driver and audit. |
| No physical posting from planning | Existing ledger/balance/reservation checks passed for document, BOM, plan and review actions. |
| TypeScript | PASS, `tsc --noEmit`. |
| ESLint | PASS, zero warnings. |
| Compatibility protections | All 3 strict patch guards passed; CommonJS and ESM runtime regressions passed in both browser modes. |
| Development Chromium | **86** shared premium-UI checks + **28** Phase 7 workflow checks + **12** post-restart checks. |
| Production frontend | Fresh isolated Next production build/start, **28** Phase 7 Chromium checks + **12** post-restart checks. |
| Browser diagnostics | Zero unexpected console warnings/errors, React runtime exceptions or hydration warnings in final workflows. Clean contexts, logout/subsequent login, 1440/390/360px Phase 7 navigation verified. |
| Persistence | Issued PDF SHA-256, approved definitions, calculation/review data and links survived controlled API/frontend restarts. |
| Python audit | 46 locked packages, zero known vulnerabilities. |
| npm runtime audit | Zero standalone runtime-package findings; vendored framework caveat below applies. |
| Full npm audit | **12 HIGH findings**, OPEN exception; not reported as a pass. |
| Source/configured-secret scan | 223 reviewed files and 670 stored Git objects at the staged gate, zero findings; staged set exactly 46 reviewed files. |
| Gitleaks v8.30.1 | Redacted, network-disabled source/history/staged scans: zero leaks. |
| Main health/schema | Backend, frontend and PostgreSQL healthy; current/head `0009_packing_bom`; no drift. |

Final private evidence: `artifacts\phase7-release\20261117-234909` (full/JUnit backend run, both browsers, audits, graph paths, vendor traces, source/staged inventories and preservation checks). Runtime/browser fixtures use synthetic test identities/data in guarded disposable databases and separate image volumes. The real administrator's credentials were not used or reset; ORS is cleared/mocked in automation. A production-mode Next build on localhost is not a production deployment or a TLS cutover test. GitHub has no configured Actions workflows or recorded deployments; local verification is not represented as remote CI.

The interrupted 243-case implementation execution remains documented in PHASE_7_REPORT.md and its original logs. It is not counted as a single pass. This release review resolves that verification gap with the fresh uninterrupted 244-case run. Existing PDF visual/extraction evidence remains applicable because the generator/source bytes did not change; fresh generation/extraction and browser downloads passed again.

## Security finding and actual exposure

[PHASE_7_SECURITY_REVIEW.md](PHASE_7_SECURITY_REVIEW.md) documents GHSA-fc5q-39xc-vjpf / CVE-2026-112366, all **15** dependency/optional/installed-peer paths, official registry/advisory checks and mitigations. The latest official picomatch release checked is 4.0.7 and the advisory lists no patched version. Standalone 2.3.2 / 4.0.7 copies are development-only, behind lint/type-analysis tools. The 12 findings include meta-vulnerable dependents and stem from one advisory.

The review additionally found an unversioned matcher bundled with Next, outside standalone npm audit counting. Inspected runtime image-match callers compile trusted configuration, not incoming URL/business data. A separate-process trace confirmed zero glob compilations with current image defaults and only the trusted configured pattern with a sample allowlist. No untrusted business-user glob-pattern input was found. The vendor version/fixed status is not assumed and the defect is not declared absent or remediated.

Residual developer/build availability risk and the vendor caveat remain OPEN. Keep patterns/source trusted, dev services private, and future untrusted builds isolated and resource-bounded. Reassess configuration changes and adopt a legitimate compatible upstream remedy when available, followed by fresh audits/compatibility/build/browser checks. No homemade patch, audit suppression or blind forced tooling downgrade was applied. **Owner/security risk acceptance has not been granted by this agent or inferred from backup confirmation.** The PR prominently carries this exception for review before merge/production acceptance.

## Database, migration and preserved records

- Additive `0009_packing_bom` is valid; historical migrations are Git-normalized identical to the approved baseline.
- All **59** original non-policy table fingerprints match the verified pre-Phase-7 backup, including administrator/credential and stock-ledger fingerprints. Routine session last-seen fields are excluded by the established inventory helper.
- Existing permissions/grants remain intact; the additive 14 permissions / 45 grants were verified against role policy: SUPER_ADMIN 14, OPERATIONS 13, MANAGEMENT 9, PACKING 4, SALES 3, DRIVER 2, ACCOUNTS 0 for the Phase 7 capability set.
- All Phase 7 constraints are validated. New document/planning relationships use real foreign keys and tested source/lifecycle guards. Positive linked workflows were exercised with synthetic PostgreSQL records.
- All eight new live Phase 7 tables remain empty. **No real BOM, administrator, customer, delivery, stock or production test record was seeded into the company database.**
- No active database restore/reset, credential reset or existing PostgreSQL/image volume deletion occurred.

## New verified recovery backup

Directory: `C:\AMBS-Backups\AMBS-ERP\AMBS-ERP-PostPhase7-20261117-234909`.

Immutable core `manifest.json` SHA-256:

`3ebd6114e35e7b8fcaa3ff85729ab09d3e44aeeeb13f2469a8ef8ab15580b566`

The core includes the complete reviewed 223-file application/security source ZIP and member inventory, consistent PostgreSQL custom dump, private storage archive/inventory, encrypted current environment, recovery instructions, table fingerprints and verification summary. Every artifact size/hash, ZIP CRC/member hash, full dump decode and storage member was verified. ACL access is restricted to the owner and SYSTEM. Configuration decrypt/hash verification ran in memory using local passphrase entry; no passphrase, plaintext configuration, password or API key was printed or committed. Database/storage archives are ACL-protected private data, not independently passphrase-encrypted; approved encrypted storage/transport is required off-host.

Controlled scratch: `ambs_restore_review_1ca5b7fea5bc4951995c9da19fec3c52`. Restore completed with pg_restore --no-owner --exit-on-error; **all 70 restored table counts/fingerprints matched**, `0009_packing_bom` was current/head and Alembic reported no drift. The created scratch was removed afterward. Main fingerprints were checked again unchanged. Existing backup directories were preserved.

An independently verified `release-source/application-source.zip` supplement contains the final source including this publication-only report. Its source inventory, final `release-binding.json` and `release-supplement-manifest.json` preserve the final Git identities without changing the sealed core manifest. The final supplement digest is recorded in the PR/handoff after verification. Recover only into a new controlled directory/database/volume; never overwrite live data. GitHub contains source/reports, not these archives or test evidence.

## Owner approvals, limitations and blockers

- OPEN picomatch security exception: explicit owner/security decision still required; security is conditional, not PASS.
- Approved per-variant engineering definitions for STD, MAXI, vertical-net and other real assemblies; source references, quantities, allowance, unit conversion and kit/packaging policies remain required before activating real BOMs.
- Owner confirmation of PL-/DO- numbering, legal/bilingual stationery and acceptance/signature workflows. Current signatures remain blank and arrival is not signed receipt.
- The original workbooks/HTML/ZIP references were unavailable. No proprietary historical records, prices or sample engineering catalog was imported.
- The sales-order material-plan shortcut currently appears with the populated deliveries section. Standalone Material Requirements supports planning before the first delivery; this shortcut placement is a UI review item.
- Nested BOMs, arbitrary formulas, engineering/nesting tools, automatic purchasing/stock posting and live ORS verification are not claimed.

There is no remaining blocker to the authorized PRIVATE review PR: backup, restore, functional tests and staged secret audits passed. Unconditional security/production acceptance remains blocked by the unresolved exception and the applicable owner approvals. **PR NOT MERGED. NO DEPLOYMENT. FEATURE BRANCH PRESERVED. NO PHASE 8 WORK.**
