# Phase 8A verified private GitHub checkpoint

2026-11-18. Repository: `mohannad-121/AMBS-ERP` (PRIVATE).

**DEVELOPMENT CHECKPOINT ONLY. PREVIEW ONLY — NO DATA HAS BEEN IMPORTED.** No merge, production deployment, stock adjustment, credential reset or Phase 8B implementation is authorized by this checkpoint. Security is not classified as fully remediated and no owner risk acceptance is inferred.

## Git identities and dependency

* Source branch: `feature/phase-8a-data-onboarding`.
* Exact dependency commit: `225c915977a2737c60fb4fd4e568988c05dc666b` on `feature/phase-7-packing-bom`.
* Parent [PR #2](https://github.com/mohannad-121/AMBS-ERP/pull/2) remains OPEN and unmerged; its head and description are preserved.
* New PR targets **feature/phase-7-packing-bom**, not main. It is explicitly stacked on PR #2.
* Main is preserved at `0264699e1ab11d4c4dc2ac6e243f0faf569bc9ef` locally and remotely.
* Source commit SHA: recorded in the publication update below after backup and security gates pass.
* New PR URL and source-publication head SHA: recorded in that update after creation. The final report-only commit/head is bound by the restricted backup's `checkpoint-binding.json` and the PR description, avoiding a self-referential commit hash inside its own tracked file.

## Reviewed scope and verification basis

Every implementation, test, package and build-source file matched the final verified 250-file Phase 8A inventory. The only preflight difference was a mapping-document typographical mark; it was corrected. Publication changes are documentation and exclusion safeguards only: this report, an implementation-report publication/status note, removal of operational aggregate counts from the Git-bound mapping document and explicit ignore rules for the two private company HTML prototypes. Original detailed review notes were preserved privately in the restricted backup. No functional change, dependency upgrade, migration or engineering definition was introduced in this checkpoint.

The completed full regression/browser evidence was checked directly against JUnit, logs and unchanged raw source hashes. It was not inferred from a report alone. Fresh focused tests/static checks/builds additionally ran for this checkpoint. No incomplete run is counted as a pass.

| Gate | Actual result and basis |
| --- | --- |
| Full backend regression suite | **272 passed**, 0 failures/errors in the final Phase 8A run; JUnit verified and all corresponding implementation/test sources unchanged. The 272 cases were not rerun wholesale during publication. |
| Fresh preview security/regression suite | **28 passed**, covering file types/limits, XML entities/external relationships, formula handling, Unicode/headers, schema rules, duplicates/references, quantities/order support, RBAC/CSRF, audits and no business/ledger mutation. |
| Import Center behavior | Inspection, explicit header/mapping choices, validation and safe CSV reports only. No final import button, import route or retained-source-file endpoint. |
| Development browser workflow | Verified unchanged-source evidence: **44 + 8** onboarding checks, including restart, logout/relogin and responsive layout; **24** baseline auth browser checks and **20** live HTTP/BFF checks. |
| Production HTTPS workflow | Verified unchanged-source evidence: **44 + 8** onboarding checks against actual hardened images; separate synthetic admin, Secure sessions, CSRF, role/file/report restrictions and no unexpected console/runtime/hydration errors. |
| Phase 7 regressions | Verified unchanged-source evidence: **28 + 12** production document/BOM/material-plan/RBAC/restart checks. |
| Glob containment | Prior complete HTTPS run has an active trusted positive control and no untrusted marker compiled as a glob, including the new preview paths. No denial-of-service payload was used. |
| Fresh TypeScript / ESLint / compatibility | All passed, exit 0; all 3 Next compatibility guards retained. Existing CJS/ESM browser-runtime checks remain supported by unchanged-source evidence. |
| Fresh production image builds | Frontend standalone/Webpack and backend pinned production images built successfully, exit 0. Cache reuse is for unchanged reviewed source and pinned inputs; no forced dependency update. |
| Schema | `0009_packing_bom (head)`; no Alembic drift or new migration. |
| Restore/preservation | Fresh custom dump restored into a separate network-none, non-root scratch PostgreSQL container/new labelled volume. All **70** table fingerprints matched, head correct and no drift. Live database/private configuration preserved. |
| Source publication security | Reviewed source, exact staged set and Git history are scanned for configured-secret variants and credential/key patterns, plus redacted Gitleaks. Only source/documentation may be committed; these gates must pass before push. |

Fresh private evidence: `artifacts/phase8a-checkpoint/20261118-194443/`. Prior completed evidence remains under `artifacts/phase8a/`; the final HTTPS candidate evidence is `artifacts/ambs-containment-d6f1eb646b204da0ade8e49dd9fff858/`. These ignored locations include synthetic reports/screenshots and must not be added to Git.

## New verified backup

`C:\AMBS-Backups\AMBS-ERP\AMBS-ERP-PostPhase8A-20261118-194443`

The backup core contains the reviewed source ZIP/member inventory and Git-blob mapping, a fresh PostgreSQL custom-format dump, private image/storage archive/inventory, encrypted environment configuration, SHA-256 manifest, recovery instructions and verification evidence. ZIP CRC/member hashes, dump catalog/full decode, storage members and all manifest artifact hashes are checked. A final-source supplement preserves any publication-only report update without altering the sealed core.

The isolated restore uses a fresh generated `ambs_restore_phase8a_<uuid>` database in a separate PostgreSQL container with **no network or published port**, not the live cluster. Target readiness is verified against the final server process and database before restore. An initial attempt stopped because PostgreSQL's temporary initialization server was visible before the target database existed; a fresh scratch retry passed. No failed attempt was represented as verified. Only generated, label-checked scratch resources were removed.

All 70 restored table counts/fingerprints matched the original state. The established inventory normalizes routine session last-seen timestamps. User/credential, customer, order, delivery, inventory and ledger fingerprints remain preserved. No restore over the live database, real-data import or existing volume deletion occurred.

The private environment remains byte-identical to the prior verified release. The age-encrypted ciphertext was copied from the previous decrypt/hash-verified backup after checking its sealed manifest, ciphertext and current source hash. **No fresh decryption occurred and no passphrase was printed/requested/stored.** Recovery requires the existing backup passphrase, held separately. This is inherited verified ciphertext provenance, not a new decrypt-test claim.

The directory is restricted to the Windows owner and SYSTEM. Database/storage archives are ACL-protected private recovery data, not independently passphrase-encrypted; use approved encrypted storage/transport off-host. Previous backups remain intact. Original company workbooks/prototypes and private operational notes/reports remain outside Git. Recover only into new controlled directories/databases/volumes.

The immutable core manifest, final-source supplement manifest and `checkpoint-binding.json` record actual hashes and the source/report commit identities. Core/source backup verification passes before the source commit/push. Publication metadata is bound afterward without rewriting the sealed core. No private backup artifact is uploaded to GitHub.

## Actual real-data limitations

* The packing workbook is primarily a **print/form template**, with 14 sheets and formula-dependent cells. It is not an approved flat record import or BOM definition.
* The four-sheet delivery tracker requires owner-confirmed worksheet/header/date/column mapping. Header suggestions do not establish business meaning or complete relationship coverage.
* Historical status labels, including `DELIVERD` and `DELVERD`, need interpretation; proposed canonical labels never change an ERP delivery state.
* Missing LPO, SKU, driver and quantity relationships **cannot be invented**. Unknown or ambiguous links require correction/confirmation against authoritative ERP entities.
* Current physical stock requires a **separate accountable count**, not reconstruction from historical paperwork.
* Historical deliveries must **never generate new stock issues**, consume reservations, rewrite history or change opening balances automatically.
* No engineering BOM, variant definition, pack count or consumption ratio is automatically approved or inferred from spreadsheets/prototypes.
* **No real customer, inventory, order or delivery data import has occurred or been authorized.** Preview audit/session metadata is not an import.

The [mapping document](PHASE_8_DATA_MAPPING.md) and [owner checklist](PHASE_8_OWNER_APPROVAL_CHECKLIST.md) retain format findings, validation rules and required decisions without customer identities, source records or operational aggregate counts. Exact private quality notes remain in restricted local evidence/backup.

## Security status

**Internal picomatch risk exception: OPEN; security fully remediated: NO.** The publisher [GHSA-fc5q-39xc-vjpf / CVE-2026-112366 advisory](https://github.com/advisories/GHSA-fc5q-39xc-vjpf) was withdrawn on 2026-11-18 (`withdrawn_at: 2026-11-18T15:38:56Z`). The fresh npm registry bulk response still returns a HIGH picomatch finding for `<=4.0.7`. This is a documented publisher/registry discrepancy, not a verified library fix or owner acceptance. The earlier 12-HIGH full npm result includes dependent meta-vulnerabilities and remains historical evidence; it is not misrepresented as a fresh full audit count.

Installed versions and Next's unversioned vendored matcher are unchanged. Existing optimizer closure, non-root/private-network/read-only candidate, restricted runtime credentials and file-secret controls remain. No unverified patch, forced upgrade, audit suppression, glob-pattern input path or zero-risk claim is introduced. Owner/security review must reconcile publisher/registry evidence and decide the residual risk before merge/production approval. Neither this stacked PR nor withdrawal of the publisher advisory authorizes acceptance, merge or deployment.

## Acceptance boundary

The source publication and final report update are complete only once the external binding and PR description contain the verified actual source/head identities, PRIVATE visibility, OPEN stacked PR, clean local worktree, unchanged main/parent PR, matching data fingerprints and healthy development services. The final handoff supplies those exact identities. No automatic merge/deployment is enabled. Phase 8B remains unimplemented and unapproved.
