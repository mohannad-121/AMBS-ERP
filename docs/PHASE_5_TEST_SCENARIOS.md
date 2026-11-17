# Phase 5 regression and acceptance scenarios

```powershell
docker compose exec -T backend pytest -q
docker compose exec -T backend alembic current
docker compose exec -T backend alembic check
docker compose exec -T frontend npm run typecheck
docker compose exec -T frontend npm run lint
powershell -NoProfile -File scripts/Verify-AuthIntegration.ps1 -Purchasing
powershell -NoProfile -File scripts/Verify-AuthIntegration.ps1 -Purchasing -Production
```

`-Purchasing` includes all authentication, master-data and inventory browser/HTTP regressions before the new suite. `-PurchasingOnly` focuses the new browser/restart checks. Each run owns its uniquely named guarded database, unpublished scratch services and isolated image storage. Passwords are generated in memory and passed via stdin. No real SUPER_ADMIN credential, supplier, Odoo connection or business record is used. Teardown removes only that run's scratch database/services, retaining main named volumes. Error reporting and Next's development indicator remain enabled; credential-bearing traces are never printed.

## PostgreSQL tests

- Supplier duplicate warnings/override, main contacts, catalog associations, archival, unverified availability and write-free import reports.
- Immutable quotation price history, exact quantity/currency/unit comparison, expiry, unknown price/charges, minimum orders and no unsupported price-band extrapolation.
- Request conversion identity/quantity preservation and duplicate conversion prevention; PO confirmation, frozen snapshots/unit identity, controlled remainder amendment and closure.
- 100 ordered →40 received →60 outstanding →60 received →0 outstanding. Draft no-effect, repeated create/post keys, whole compensation, generic inventory correction rejection and closed remainder behavior.
- Two distinct employees behind a Barrier concurrently receive8 against10 outstanding: one200 and one controlled409, owned stock8 and outstanding2. Concurrent identical posting creates one effect. No sequential/mock substitute.
- Atomic mixed stock/service receiving; non-stock-only acceptance creates no movement; wrong lots/units and over-receipt roll back. Lot trace retains purchase linkage.
- Supplier-owned and AMBS-owned100 → fabrication60 → coating45 → yard45, with40/15 remaining and ownership-correct totals. Individual optional galvanizing route, bounded stage completion and immutable started route.
- External claims block duplicate plan allocation, unlinked conversion, receipt reversal and negative count correction; same-key stage retry and simultaneous completion remain bounded.
- Explicit measured conversion preserves input/output traceability and excludes invented BOM/cost allocation.
- Unknown supplier date stays unconfirmed; recorded missed date alerts; changed ETA retains prior evidence; cost records are exact and append-only/pending allocation.
- Seven roles, cost redaction, unauthorized supplier/PO/receipt actions, independent inventory permission, CSRF, unauthenticated rejection and audit consistency.

## Chromium

Real forms create two suppliers and a material association, register/issue two quotations and compare compatible rates, submit/convert a request, confirm a PO and post partial receipts. Production forms record supplier-owned partial fabrication/coating/yard arrival and owned external transfer/galvanizing/yard return. The suite checks actual stock100 then145, off-site availability125 then145 without duplicating owned stock; recorded delays, Sales restrictions, existing master/inventory/security pages, audit, refresh, desktop/tablet and logout/protected-route behavior are verified.

Restart checks use a new browser context after the scratch backend/frontend restart, retaining suppliers, quotations, partial/completed production, quantities and audits. Development and optimized production are tested separately. Screenshots/logs are gitignored under artifacts/phase5 and artifacts/phase5-*. Final executed counts and limitations are in PHASE_5_REPORT.md. No success is inferred from unexecuted scenarios.
