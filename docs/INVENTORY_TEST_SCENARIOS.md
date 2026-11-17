# Inventory regression and acceptance

Run from the workspace with Docker Desktop Linux containers:

```powershell
docker compose exec -T backend pytest -q
docker compose exec -T backend alembic current
docker compose exec -T backend alembic check
docker compose exec -T frontend npm run typecheck
docker compose exec -T frontend npm run lint
powershell -NoProfile -File scripts/Verify-AuthIntegration.ps1 -Inventory
powershell -NoProfile -File scripts/Verify-AuthIntegration.ps1 -Inventory -Production
```

`-Inventory` includes authentication, previous master-data tests, compatibility tests and inventory Chromium workflows. `-InventoryOnly` focuses inventory tests. Each invocation creates its own uniquely named guarded test database, dedicated synthetic administrators/operators/Sales account, unpublished scratch backend/frontend services and image volumes. Passwords are generated and sent only through stdin. Teardown stops its own services and removes only its own generated database. Main ERP records, credentials and named volumes are untouched. Browser traces containing entered credentials are never emitted. Screenshots and logs in ignored artifacts/phase4 contain synthetic data.

The backend tests use real PostgreSQL migrations and transactions. Test fixtures own isolated test databases. Test coverage includes:

- Draft no-effect, receipt/issue/transfer, multi-line failure rollback, idempotent create/post and conflicting keys, optimistic draft edits, immutable history and compensating reversals.
- Holds, release/cancel/consumption, reserved-stock protection, fully reserved visibility and exclusion from available picks.
- Two distinct users simultaneously reserving 10 from 15: exactly one 201 and one controlled 409, final reserved=10 and available=5.
- Concurrent receipt/issue/transfer posting retries plus independent simultaneous movements and initially missing destination buckets. No duplicate posting or negative quantity.
- Count zero/positive/negative variance, duplicate posting, stale physical version, fresh recount, generated ledger correction.
- Same-warehouse trees, cross-warehouse rejection, cycles, inactive locations, frozen unit identity/precision.
- LOT/SERIAL identity, serial quantity/uniqueness, quarantine returns, damage, inspection release, blocked lots and trace history.
- Exact Decimal weighted average, unknown cost, separate currencies/incomplete valuation; shortage 8 versus requested 15 gives 7.
- Seven roles, cost redaction, unauthorized writes, unauthenticated/CSRF rejection, atomic audit and independent reconciliation.

Chromium creates an item through the existing master form, warehouse and storage/packing references, LOT tracking and a lot through actual inventory forms. It posts receipt 50, holds 20 (available 30), rejects 35 more without changing stock, releases, transfers 10, counts source 40 as 37 and posts -3 (company 47), sets minimum 60 and inspects lot history. It verifies read-only Sales and backend denial, previous screens, audit, logout/login, refresh, desktop/tablet, clean contexts and console diagnostics. Services are restarted retaining their isolated storage, then quantities, reservation history, audit and reconciliation are verified again in a fresh browser context. Both development and production modes use actual Chromium.

The suite preserves Next's development indicator/error reporting. Existing CJS and ESM browser regressions exercise superseded pending RSC, fulfilled/missing/null replacements and mounted client-state preservation. Dependency and health results are recorded in PHASE_4_REPORT.md.
