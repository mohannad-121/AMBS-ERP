# Phase 6C — verified backup, commit and private GitHub release

Date: 2026-11-17 (Asia/Dubai).

## Result

**PASS: current Phase 6C backup verified, encrypted configuration verified, isolated restore verified, security/regression gates passed, approved source committed and feature branch pushed to the existing PRIVATE repository.**

Pull request: [Phase 6C — Premium AMBS ERP UI/UX and Operational Dashboard](https://github.com/mohannad-121/AMBS-ERP/pull/1).

- Repository and authenticated owner: `mohannad-121/AMBS-ERP`, `mohannad-121`; PRIVATE verified before and after source push.
- Feature branch: `feature/phase-6c-premium-ui`.
- Source commit: `38ffb4d990b283bdfa87e462c19ae8993153ee9b`.
- Exact source message: `feat(ui): complete AMBS premium ERP redesign and operational dashboard`.
- Preserved local/remote main baseline: `82e214e2a1a15834354f5787e27422506658d344`.
- PR base: `main`; PR head: `feature/phase-6c-premium-ui`; OPEN, not merged.

The source commit changes 32 approved source/documentation files. Its committed blobs match the security-reviewed staged-byte hashes, and its complete 200-file tree matches the audited source path inventory. The pushed source branch SHA matched the local commit exactly. This release report and recovery pointer are published afterward in a separate documentation-only commit on the same branch; that commit's remote tip and PR head are verified in the final handoff. No accepted history is rewritten.

## Backup and recovery

Directory: `C:\AMBS-Backups\AMBS-ERP\AMBS-ERP-PostPhase6C-20261117-180306`.

Manifest: `manifest.json`; manifest SHA256: `199a9aef7d7f817738317ef11545f5899a9a3c51d59db5bf76269108d712df81`.

The new directory was created without reusing or overwriting an earlier backup. NTFS inheritance is disabled and access is restricted to the current Windows user and SYSTEM. The complete 200-file source snapshot includes the approved, then-uncommitted Phase 6C work. Every ZIP member passed CRC and SHA256 verification; all required lockfiles, Docker/recovery sources, migrations and Next compatibility scripts are present. No real environment file, runtime upload, database dump or browser artifact is inside the source ZIP.

The PostgreSQL custom-format dump passed archive listing and complete decode. It was restored with `--exit-on-error` into a newly created, uniquely named scratch database. All **62 table counts/fingerprints**, including users, credentials, grants, audit and Alembic state, matched the source. The restored head was `0008_delivery_routes`, with no schema drift. Only that generated scratch database was removed after successful verification; the main database was never restored over. Temporary container archive copies were removed; no Docker volume was deleted.

The actual persistent business-storage mapping is `ambs-erp_ambs_item_images` at `/data/item-images`. Its tar archive was fully decoded and checked for traversal, links and unsupported entries. It contains zero files, matching the current empty storage. PostgreSQL's live data directory is covered by the logical dump rather than an unsafe raw-volume copy. Frontend build/dependency volumes are disposable and are excluded.

`private-environment.env.age` contains the current complete configuration, including current ORS settings, encrypted using the previously approved age passphrase workflow. The user entered the passphrase only in a local interactive terminal. In-memory decryption matched the original configuration SHA256; no decrypted temporary file, passphrase or secret value was recorded in chat, scripts, Git or logs. Keep that passphrase separately in a password manager.

The database and storage archives are confidential and ACL-restricted; they are not individually passphrase-encrypted. Only configuration is independently age-encrypted. Never publish these backups, even in the private source repository. Use approved encrypted off-host storage for disaster recovery. The source ZIP is the pre-commit Phase 6C point-in-time snapshot; later release bookkeeping documentation is recoverable from the separate Git documentation commit. Recovery procedures remain in [BACKUP_AND_RECOVERY.md](BACKUP_AND_RECOVERY.md).

### Verified artifact checksums

| Artifact | Bytes | SHA256 |
| --- | ---: | --- |
| `ambs-erp-full-0e62c83ff61a4887b4f4dd506fd7fcf4.dump` | 282922 | `f1d4b443a8d22d6239a97cf85a5f27d33321f2eabb0bfef53296a165e1332679` |
| `application-source.zip` | 562572 | `78887fe525cee76e15a4d55cce35c6f26270fb9947413e89f1e3edfd2e8a89a0` |
| `database-archive-contents.txt` | 48358 | `1c47267a0f039c53c3009da948739d7fb03695fd7077094bf84c0b40dcf30798` |
| `database-before.json` | 6921 | `a2a3b82f3c3de05a8ed948554ca0642881349f9a45537e774dc9f38aa12e15a8` |
| `database-restored.json` | 6921 | `a2a3b82f3c3de05a8ed948554ca0642881349f9a45537e774dc9f38aa12e15a8` |
| `encryption-verification.json` | 196 | `0da9317c52831117a5ffc00653bf476c05447632b0a2f957f7fe5e8ecf3dc001` |
| `gitleaks-report.json` | 3 | `37517e5f3dc66819f61f5a7bb8ace1921282415f10551d2defa5c3eb0985b570` |
| `private-environment.env.age` | 706 | `b13e2362c0fabefe790ac75cb788f3a2b03ac1c3d2d01e59c436fb957e96d9c2` |
| `private-item-images-0e62c83ff61a4887b4f4dd506fd7fcf4.tar.gz` | 110 | `a806b02037e4172641d2582d2df34cb47c604c3a3c59d791efd1065150ab3a0d` |
| `recovery-metadata.json` | 813 | `c99c6fa04d2bb49700cf676878f13efeef773705fbb21886389cdf4589d4d503` |
| `restore-verification.json` | 291 | `c0930c2a908c09a24b1f6ac627e757056da66d64153f8de6b8bb7d11d6fdb675` |
| `source-inventory.json` | 32008 | `bbab7aeb795f084f27f5855fa4921a6a2ca40332226e4bdc99493045bc718178` |
| `source-security-audit.json` | 34225 | `60082e14bdc03c283b0073f967664a07d5e4d6778862fb88c7a73ab5c41dde38` |
| `storage-inventory.json` | 115 | `1f0aeec16c19739ef2ba6090878bd9df43def88b3ac14d1a66383584a5808559` |
| `manifest.json` | 3791 | `199a9aef7d7f817738317ef11545f5899a9a3c51d59db5bf76269108d712df81` |
| `SHA256SUMS.txt` | 1427 | `4ac6dde5951c4c936d573f2502a06adcc5cbaca78a0a046f8baa0afd6fdaaf64` |

`SHA256SUMS.txt` covers all backup artifacts and the manifest. Its own checksum is listed above separately to avoid recursive self-hashing. Artifact and manifest checksums were recomputed and matched before the source commit. The checksum-list file hash is additionally recorded here.

## Security audit

- The previously accepted project audit inspected every eligible source byte, configured-secret variants (including current ORS configuration), prohibited/generated paths, binary/large files and every stored Git object, including local unreachable objects. It reports rule/path locations without secret text. Working-tree scope: 200 files, 545 Git objects; exact staged scope: 32 changed files, 562 Git objects. Both passed with zero findings.
- Gitleaks v8.30.1, pinned image digest `sha256:c00b6bd0aeb3071cbcb79009cb16a60dd9e0a7c60e2be9ab65d25e6bc8abbb7f`, ran with full redaction and networking disabled. It scanned the source export and 349 stored blob/commit/tag contents, then separately scanned the exact staged export: zero leaks.
- Reviewed Git diff, staged diff, status, new files, `.gitignore`, the placeholder environment template and all selected source paths. The only tracked environment path is `.env.example`. All 1,652 inventoried ignored private/runtime paths were outside the candidate commit set. No actual environment configuration, archive, dump, upload, private image, browser screenshot/trace/log, real credential or business contact data was selected.
- Fresh frontend and backend dependency audits found no known vulnerabilities. No application dependency or migration changed in this release workflow.
- The GitHub connector returned unavailable-tool errors; the already authenticated GitHub CLI was used instead. Only the login/repository metadata were requested, never a token. Origin was checked against the approved credential-free repository URL. Only the named feature branch was pushed; no `--all`, `--mirror` or force option was used.

## Fresh release verification

| Check | Result |
| --- | --- |
| Full backend suite | PASS — **222 tests**, 562.13 seconds |
| TypeScript | PASS |
| ESLint | PASS, zero warnings |
| Optimized Next.js production build | PASS in isolated build/dependency volumes |
| Next compatibility guards | PASS — 3 |
| Actual CommonJS/ESM router runtime regressions | PASS in both fresh browser harnesses |
| Chromium development UI | PASS — **86 checks**, clean console, scratch teardown complete |
| Chromium production UI | PASS — **86 checks**, clean console, scratch teardown complete |
| npm audit / locked Python dependency audit | PASS — no known vulnerabilities |
| Main and scratch Alembic current/check | PASS — `0008_delivery_routes`, no drift |
| Source and exact staged security audits | PASS — zero findings |
| Gitleaks source/history/staged scans | PASS — zero leaks |
| Git diff whitespace checks | PASS |
| Backup/source/archive/member checksums | PASS |
| Encrypted configuration round trip | PASS — in-memory match |
| Scratch restore contents | PASS — all 62 tables match |
| Post-source-push main contents | PASS — all 62 tables unchanged |
| Main services | PASS — PostgreSQL, backend and frontend healthy |

Ignored evidence logs are `artifacts/phase6c-release-backend.log`, `phase6c-release-build.log`, `phase6c-release-browser-development.log`, `phase6c-release-browser-production.log`, and the release security/dependency reports. Browser credentials and business fixtures were confined to unique scratch databases; no real administrator credential was used or reset. Routing configuration is explicitly cleared in scratch browser services, preventing live ORS calls.

This release ran fresh relevant UI checks rather than repeating every unchanged prior domain browser scenario. The previously completed full development/production operational and restart chains, including final routing 30 + 9 checks, remain documented in [PHASE_6C_REPORT.md](PHASE_6C_REPORT.md). The fresh 222-test backend suite preserves the security, ledger, purchasing, sales, dispatch, driver and item-journey regressions. No application code was modified during this release task.

## Limits and final handoff

The local backup is verified and restorable, but is not an off-host disaster-recovery policy. Keep the age passphrase separately. Chromium is the verified engine; no Safari/Firefox certification or full live production routing acceptance is claimed. No deployment, production CI/CD, Phase 7, merge, branch deletion, database reset or credential change is included.

`main` remains at the accepted baseline. The feature branch and PR retain both the source commit and the subsequent documentation-only commit. Final remote-tip equality, PR head update, repository privacy, healthy services and a clean working tree are checked after that documentation push and reported in the handoff.
