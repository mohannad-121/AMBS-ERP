# Backup and recovery

The pre-GitHub backup is stored outside the repository under `C:\AMBS-Backups\AMBS-ERP\AMBS-ERP-PreGitHub-20261117-144328-ad33e93d`. Its manifest lists artifact sizes, SHA256 hashes, source/storage inventories, encryption verification and the scratch restore result. Backups contain private company/security data and must not be committed or shared as source releases. NTFS access is limited to the current Windows user and SYSTEM.

## Latest approved backup: post-Phase 6C

`C:\AMBS-Backups\AMBS-ERP\AMBS-ERP-PostPhase6C-20261117-180306` contains the complete approved Phase 6C source snapshot, a fresh custom PostgreSQL dump, private item-image storage, recovery metadata and age-encrypted current configuration including current ORS settings. Source/archive hashes, in-memory configuration decryption and an isolated restore matching all 62 tables/head/schema were verified. No main database overwrite or volume deletion occurred.

Its `manifest.json` SHA256 is `199a9aef7d7f817738317ef11545f5899a9a3c51d59db5bf76269108d712df81`. Complete artifact checksums, source commit, private PR and release checks are in [PHASE_6C_GITHUB_RELEASE_REPORT.md](PHASE_6C_GITHUB_RELEASE_REPORT.md). The recovery procedure below applies; use this newer directory for Phase 6C recovery. Keep the age passphrase separately. Database/image archives are confidential and ACL-restricted; the configuration is independently encrypted. GitHub contains source and reports, never these private archives.

## Earlier pre-GitHub backup: verified components

- `application-source.zip`: reproducible source/configuration templates, manifests/lockfiles, migrations through 0008, tests, documentation and Next compatibility/install scripts. Build caches, private data and real .env are excluded. Every ZIP member was CRC-checked and compared by SHA256.
- A unique `ambs-erp-full-*.dump`: consistent PostgreSQL custom-format dump of all application/security/business tables and Alembic state. Archive listing and complete decode passed. A new unused scratch database was restored, all 62 table counts/row fingerprints matched the source (including Alembic), and `0008_delivery_routes` / no schema drift were verified. Only that generated scratch database was then removed.
- `private-item-images-*.tar.gz`: the inspected `ambs-erp_ambs_item_images` volume at `/data/item-images`. The archive structure and every member were decoded; the current volume is empty. PostgreSQL data is covered by the logical dump, not an unsafe live raw-data-directory copy. node_modules/.next volumes are disposable and excluded.
- `private-environment.env.age`: passphrase-encrypted configuration, created with locally installed age. Encryption/decryption prompts stayed in the local terminal; the passphrase was never placed in scripts, arguments, Git, chat or logs. Decryption was streamed to an in-memory SHA256 comparison against the original .env; no decrypted temporary file was written. Keep the passphrase separately in a password manager. Losing it makes the encrypted configuration unrecoverable.

The database dump contains credential hashes/session verifiers and private business/security data. It is protected by the backup directory ACL but is not independently passphrase-encrypted. Move a backup off this workstation only using approved encrypted storage/transport and preserve its restricted access. The configuration is independently encrypted. Never publish any database or image backup, even in a private source repository.

## Restore safely

1. Read `manifest.json` and recompute every artifact SHA256 before using it. A mismatched artifact is not verified. Preserve the original backup; work from a copy on controlled storage.
2. Extract source into a new empty recovery directory, not over the working tree. Verify required Dockerfiles, lockfiles, migration 0008 and `frontend/scripts/patch-next-router.mjs`. The initial source ZIP is the pre-audit point-in-time snapshot. New backup/Git audit documentation can also be recovered from the reviewed private Git commit after push. Caches and virtual environments are regenerated.
3. Restore configuration into that new directory only. Ensure the output `.env` does not already exist. Run age interactively and enter the backup passphrase locally:

```powershell
age --decrypt --output C:\AMBS-Recovery\AMBS-ERP\.env C:\AMBS-Backups\AMBS-ERP\<backup-directory>\private-environment.env.age
```

Replace the example paths with independently checked new paths. Restrict the recovery .env ACL and do not print its values. Reuse the preserved database/authentication configuration; do not reset administrator credentials. ORS configuration is not changed by this task. If the passphrase is unavailable, stop: recreate missing secrets only through a separately approved credential-recovery process.

4. Start a recovery PostgreSQL instance with the appropriate preserved role/configuration and separate volumes/ports. Do not attach a new recovery application to live volumes accidentally. Create a new unused database name such as `ambs_restore_review_<new-uuid>`; `createdb` must fail rather than overwrite an existing database. Restore the custom dump using the matching PostgreSQL tools:

```powershell
docker exec <recovery-postgres-container> createdb -U <configured-role> <new-unused-database>
docker cp <verified-dump-path> <recovery-postgres-container>:/tmp/recovery.dump
docker exec <recovery-postgres-container> pg_restore -U <configured-role> --no-owner --exit-on-error -d <new-unused-database> /tmp/recovery.dump
```

5. Compare schema/head, table counts and source row fingerprints against the protected inventories. `python -m tests.backup_inventory --database <scratch-name>` emits only table counts/hashes, never row values. Compare decoded JSON with `database-before.json`. Routine session last-seen timestamps are excluded. Verify Alembic current/check against the scratch database before considering cutover. Do not run an upgrade merely to conceal a mismatch.
6. Restore private images only into a new empty recovery volume corresponding to `/data/item-images`. List the tar first, reject absolute/traversal/link entries, and compare member hashes with storage-inventory.json. Never extract over an existing populated business volume without separate review. No image files were present in this backup, but future backups may contain sensitive uploads.
7. Rebuild isolated backend/frontend containers from the preserved lockfiles and private environment, keeping the compatibility patch/postinstall. Verify health, authentication using a separately authorized test identity, private storage access, reconciliation and business counts. Restore sessions/credential hashes as data; never provision a replacement real administrator automatically.
8. Keep the original ERP running until a separately approved recovery cutover. No live database overwrite, `docker compose down -v`, volume prune, reset, force-push or production deployment is part of these instructions.

## Repeatable checks and future backups

`create_source_backup.py` creates a new source ZIP and per-member inventory outside the repository, refusing an existing ZIP. `Backup-PrivateConfiguration.ps1` requires local age passphrase input and verifies decryption in memory. `tests.backup_inventory` supplies read-only fingerprints. Database and storage dumps must use unique names and the inspected current volume mappings. A new manifest and scratch restore are required for each accepted full backup.

Back up PostgreSQL and uploaded storage on a coordinated schedule, retain encrypted off-host copies and test recovery regularly. The current verified local backup is not a substitute for an off-host disaster-recovery policy. Source-only GitHub is not a database/secrets backup.
