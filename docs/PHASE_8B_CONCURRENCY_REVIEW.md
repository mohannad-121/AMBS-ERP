# Phase 8B / PR #4 — targeted concurrency review

## Scope and verified baseline

Follow-up on `feature/phase-8b-inventory-reconciliation`, starting at `fa71556df47060b56f996fea8beb827468fa7de3`. The PR base remains `feature/phase-8a-data-onboarding` (`64215ef41cce1a4b5d3c683e61b9b4aac699bc35`). No new phase, real-data import, inventory adjustment, migration, deployment or merge is part of this work. Experiments use generated scratch PostgreSQL databases and synthetic accounts/stock only. Original company databases, credentials, volumes and backups remain outside the experiments.

## Finding and lock lifecycle

The reported concern is real. `inventory.lock_inventory()` executes exclusive `pg_advisory_xact_lock(7140284202)`. This is the same database-wide transaction key used by stock posting, serial identity, reservations, counts and related inventory mutations, in addition to their row locks. It is held until transaction commit/rollback. The previous read services acquired it before multi-query reports and per-event lookups; they did not release it after the first SELECT. Preview/report handlers committed only after computing the response/audit. Journey GETs released it on request-session teardown/rollback. Long reviews therefore serialized unrelated legitimate movements and other reviews.

There was also a second gate: unsafe `current_context()` requests acquire exclusive security key `7140284201`. POST previews held that transaction through parsing, validation, reconciliation and audit. Merely removing the inventory lock, or moving business queries to another connection while leaving authentication open, would still let the preview block authenticated posting.

`app/db/session.py` configures a five-second PostgreSQL `statement_timeout`. Lock wait is included in statement execution time; an inventory operation can consequently fail with SQLSTATE `57014` and the existing generic 503 `DATABASE_UNAVAILABLE` response. The synthetic positive control reproduced a real posting timeout with a deliberately smaller 150 ms test-only limit; no five-second blocking test or denial-of-service payload ran against the main application. PostgreSQL documents transaction-level lock release and compatible ordinary SELECT/DML locking in its [locking documentation](https://www.postgresql.org/docs/17/explicit-locking.html).

## Affected routes and chosen boundary

| Route | Snapshot/read work | Final short write/ACL work |
| --- | --- | --- |
| `GET /api/inventory/review` | Ledger/cache/active-reservation counts and rows | Session metadata and access recheck |
| `POST /api/inventory/review/physical-preview` | Entire multi-row count comparison | Existing summary-only preview audit |
| `GET /api/inventory/journey/{item_id}` | All selected company history and references | Session metadata and access recheck |
| `POST /api/onboarding/reconcile` | Parse/validate/reconcile the complete bounded source | Existing content-free category/digest/count audit |
| `POST /api/onboarding/reconciliation-report` | Same complete source review | Same audit, then inert CSV formatting |
| `GET /api/routing/deliveries/{identity}/journey/{item_id}` | Existing delivery-scoped history | Recheck current role/session and latest driver/delivery access |
| `GET /api/inventory/reconciliation` | Legacy multi-statement consistency diagnostic | Existing finish/session commit |

The last diagnostic never held the inventory gate itself, but its separate READ COMMITTED queries could report a false ledger/cache/reservation discrepancy under a concurrent commit. It now uses the same consistent read boundary. Existing general routing/packing/sales/purchasing read locks and other unsafe-handler security transactions are not silently removed by this targeted change; they need their own dependency/transaction review. This is not a claim that every ERP read endpoint is contention-free.

`services/review_snapshot.py` establishes the following sequence:

1. Authenticate/authorize using the existing request dependency, transport, origin and CSRF checks. Copy the principal's user/session identity, permissions and role membership. At this boundary, only an authentication session's last-seen update may be pending. Any new/deleted object or other dirty field causes a fail-closed error. These seven audited HTTP entry points perform only authentication/ACL reads before this boundary. The ORM guard is not an arbitrary Core-SQL business-transaction detector; this helper must not be reused after business writes.
2. Commit that short authentication transaction, releasing its security gate and connection before long review work or admission waiting.
3. Admit at most **two** concurrent inventory review snapshots per worker. An extra request fails immediately with `429 REVIEW_BUSY`, after releasing its authentication transaction. The configured per-worker pool has five base plus five overflow connections, leaving capacity for posting/authentication instead of allowing long reviews to fill it. There is no waiting review queue retaining a connection.
4. Open a fresh ORM session/identity map against the **same database engine as the caller**, not a global/default database. Caller-owned connections/transactions are rejected. Set `REPEATABLE READ` and PostgreSQL-enforced `READ ONLY` before any data SELECT. Nested file/row review functions reuse this single session and snapshot. A guarded service rejects calls without that boundary.
5. Retain the five-second SQL statement bound and a transaction-local ten-second idle-in-transaction bound. The caller's posting timeout/isolation/configuration is untouched. A successful or failed snapshot is rolled back/closed, and its admission slot released. SQLAlchemy resets the connection isolation option when it returns to the pool; local PostgreSQL settings end with the transaction.
6. Expire the authentication identity map, briefly acquire the existing security gate and revalidate the request/session/principal. If an account/session is revoked or permissions/roles change while the report runs, discard the result. The delivery journey also rechecks latest object-level assignment access under this short final gate. Complete the existing audit/session commit immediately. Denials are audited through the write session, never through the read-only transaction.

No review data query runs while either mutation advisory lock is held. Ordinary MVCC SELECT table locks remain and are compatible with normal inventory INSERT/UPDATE/DELETE. Writers keep their existing advisory and bucket row locks, atomic posting and idempotency rules. The inventory posting service, core security lock implementation, engine settings, migration files, dependency locks and Next compatibility patch are verified byte-identical to the published baseline.

## Consistency proof and alternatives

Plain READ COMMITTED is not enough: separate queries can observe different commits. A synthetic positive control read a balance of 50, committed a real reservation consumption in another session, then read ledger 45/reserved 0. Removing the old lock alone would permit that mixed report.

PostgreSQL REPEATABLE READ keeps the same committed snapshot for the transaction, including preventing phantoms. All balance, immutable ledger, reservation, reference and event queries therefore observe one committed cut. A concurrent writer's uncommitted work is not visible; after it commits, an already established review still sees the old complete state, and a new review sees the new complete state. Writer serialization and constraints remain responsible for stock integrity. Reports are point-in-time evidence, not a stock-posting approval or a guarantee that they are latest when delivered. See [PostgreSQL 17 isolation](https://www.postgresql.org/docs/17/transaction-iso.html) and [SQLAlchemy transaction/isolation management](https://docs.sqlalchemy.org/en/20/orm/session_transaction.html).

Alternatives considered:

- A shared advisory read lock still conflicts with the exclusive posting gate and does not solve writer blocking.
- Removing the lock while keeping READ COMMITTED permits mixed versions; the positive control demonstrates this.
- Changing the whole request session's isolation after authentication queries is too late for its current transaction and risks stale ORM identities or accidentally committing business changes.
- Raising timeouts only extends the blocking window. Global/autocommit changes would weaken unrelated transactions.
- A separate unbounded reader pool is unnecessary here and adds connections across workers; bounded snapshot admission uses the existing tested engine/pool while reserving capacity for mutations.
- SERIALIZABLE/DEFERRABLE adds behavior unnecessary for a pure point-in-time read over writers that retain their posting serialization. No new materialized ledger or persistent report tables are needed.

## PostgreSQL regression experiments

`tests/test_review_concurrency.py` exercises real separate sessions and database backend PIDs, with bounded threading events. A reader is paused **after executing its first data query**, so its MVCC snapshot already exists. A real reservation-consumption request then performs and commits an inventory ISSUE while the reader remains paused. An observer confirms the paused reader owns no advisory lock. Only after the writer finishes is the reader released. Returned ledger/cache/reservation values and histories must still equal the complete old state; fresh reads see the complete committed change. This proves ordering, not merely a fast uncontended SELECT.

Coverage includes all seven routes, simultaneous global journey/reconciliation readers, immediate rejection of excess admission, exact actor/role/session/driver access rechecks, missing snapshot guards, forbidden writes, query-timeout cleanup, no accidental caller business commit, a fresh identity map despite a stale caller object, and actual reuse of the previously read-only physical connection with original isolation/read-write/timeout settings restored.

The large-history fixture posts **1,200** additional ledger effects using the unchanged authoritative create/post services: forty bounded receipts, thirty lines each. It checks stable page-2 results (100 rows) and the exact old event total, while another posting commits. These records exist only in a newly generated test database. No historical company rows are fabricated or loaded.

## Final measured concurrency behavior

Final-source PostgreSQL regression observations (local synthetic data; not production throughput guarantees):

| Experiment | Posting elapsed | Result |
| --- | ---: | --- |
| Original exclusive review gate, test-only 150 ms statement bound | 159.11 ms | Posting cancelled, SQLSTATE 57014 |
| New repeatable-read snapshot, direct separate sessions | 204.56 ms | Posting commits; old balance/ledger/reservation snapshot remains consistent |
| Seven affected HTTP routes | 145.87–189.20 ms | Each posting finishes while its review remains deliberately paused |
| Global journey with 1,200 extra synthetic ledger effects | 156.97 ms | Posting finishes; page 2 has 100 rows and exact old total 1,202 |
| Simultaneous reconciliation and journey | 94.78 ms | Posting finishes before either reader releases; third review immediately returns 429 |

The READ COMMITTED control returned old balance 50 with new ledger 45/reserved 0; the replacement returned the complete old 50/50/5 state, followed by complete fresh 45/45/0. These quantities are synthetic. Test synchronization proves overlapping transactions and absence of reader advisory locks; it does not model arbitrary CPU/I/O saturation. Maximum writer assertion is a bounded three seconds.

## Verification and preservation

- **173 relevant backend tests passed**, zero failures/errors, 577.62 seconds. Includes inventory posting, security/authentication, inventory review, all onboarding and routing/journey suites, including **17 real-PostgreSQL concurrency cases**. This is the executed relevant suite, not a claim of a fresh complete 313-case run.
- Fresh TypeScript, ESLint, three Next compatibility guards, CJS/ESM runtime checks and backend/frontend production builds passed. No dependencies or compatibility patches changed.
- Final combined isolated development run passed 24 authentication Chromium checks, 20 HTTP/BFF checks, **52 Phase 8A** and **27 Phase 8B** checks including restart. Hardened production HTTPS passed **52 Phase 8A, 40 Phase 7 and 27 Phase 8B** checks, including the actual non-root/read-only production runtime, closed debug/image endpoints and trusted-pattern/untrusted-marker observer. Browser checks reported no console warnings, React runtime errors or hydration warnings.
- The first combined development attempt exhausted the shared bootstrap fixture's login budget after onboarding (bootstrap failed before Phase 8B UI execution; its precise HTTP failure was not captured). A minimal test-harness change uses the already-existing synthetic onboarding administrator for that bootstrap; the final full combination passed. No rate limit, account password or production authentication policy changed. One synthetic driver reassignment test initially tried a direct update and correctly hit the delivery history guard; it was corrected to use the authoritative assignment service.
- Tested backend/application/test/migration source hashes match the final source. The inventory posting service, security core, engine, migrations, lockfiles and Next compatibility patch remain byte-identical to the published baseline.
- All **70 main-table fingerprints** match the pre-review baseline, including business records, stock, ledger, reservations, users and credentials. Routine session last-seen timestamps are normalized by the existing inventory tool. Private environment and storage inventories are unchanged. Alembic remains `0009_packing_bom`, no schema drift; original development backend/frontend/PostgreSQL remain healthy.
- New recovery backup: `C:\AMBS-Backups\AMBS-ERP\AMBS-ERP-PostPhase8BConcurrency-20261118-224155`. Fresh custom dump catalog/full decode, private storage archive and isolated non-root/network-none PostgreSQL restore passed, with all 70 restored fingerprints matching and no schema drift. Source ZIP/member hashes and the sealed SHA-256 manifest are publication gates; the external checkpoint binding records the final source/PR head and manifest hash without rewriting this report or the sealed core.
- The environment archive inherits byte-identical prior decrypt/hash-verified age ciphertext after verifying unchanged current configuration; **no fresh decryption** occurred. Its separately held passphrase remains required. Local backup ACLs restrict access to the owner and SYSTEM; database/storage/private-original archives are not individually passphrase-encrypted and require approved encrypted off-host storage/transport. Historical backups remain unchanged.
- Redacted source/staged/history configured-secret and Gitleaks scans, private-reference scans, source/archive Git-tree binding and final remote-ref checks must pass before publication; their exact results are bound in private checkpoint evidence. No private workbooks, environment files, backups or generated test evidence belong in Git.

Private raw JUnit, log/exit, source-hash and preservation evidence: `artifacts/phase8b-concurrency/`. No actual business-data mutation was authorized or performed. PR #4 remains the review vehicle; PRs #2/#3/#4 remain open with their parent/main refs preserved. No merge, deployment or Phase 8C.

## Limits and remaining risk

- Two review slots are per worker and scoped to these endpoints. Other legacy report handlers, broad system load, database capacity, connection/network failures or existing long writers can still delay requests. The fix removes the demonstrated review-held mutation gate and prevents this review class from consuming the entire configured pool; it is not a zero-contention guarantee.
- MVCC snapshots retain old row versions until they close and ordinary SELECT locks can delay incompatible DDL. Keep schema maintenance separate from traffic and monitor vacuum/long transactions. The [timeout documentation](https://www.postgresql.org/docs/17/runtime-config-client.html) explains why statement and idle bounds are distinct; neither is a promise of whole-request latency.
- Results/pages are new snapshots per request, not a cross-request frozen export job. Concurrent legitimate changes can alter a later page or re-export. A future approved posting must revalidate current versions and approved count scope.
- The unchanged 5,000-event/source budget remains; larger histories require narrower dates/lots. The 1,200-effect experiment is deliberately bounded and does not certify arbitrary production scale.
- The internal picomatch exception stays **OPEN**. Publisher/feed withdrawal and zero current npm audit findings are not a library fix, proof of zero risk or owner acceptance. No dependency or Next patch change is made here.
- Repository visibility remains owner-managed and must not be changed by this work. No merge, deployment, real import, stock correction or Phase 8C is authorized.
