# Local ORS setup

A HeiGIT API key is optional for the rest of AMBS. Without it, route calculations record NOT_CONFIGURED, with empty metrics; orders, picking/loading and dispatch remain functional. Do not share the key in chat.

1. Open the existing ignored `C:\Projects\AMBS-ERP\.env` in your local editor. Do not replace its existing database or authentication values.
2. Add `ORS_API_KEY=` followed by the actual key copied privately from your HeiGIT account. It is a backend-only setting; never use a NEXT_PUBLIC variable.
3. Optionally set `ROUTING_PROVIDER=ors`, `ROUTING_TIMEOUT_SECONDS=8`, `ROUTING_REQUESTS_PER_MINUTE=30`, `ROUTING_REQUESTS_PER_DAY=1000`. Set budgets below your current available account quota, considering other users of the key. The dashboard observations of 2,000/day and 40/minute are not assumed permanent.
4. Recreate only the backend so Compose reloads the ignored environment:

```powershell
docker compose up -d --no-deps --wait backend
```

Do not run `docker compose config` without `--quiet` or print the environment: resolved output includes secrets. The backend uses `SecretStr` and sends the key only in the server-side Authorization header. It is never stored in business tables, browser JavaScript, returned errors or audit metadata. Proxy forwarding does not accept a browser-supplied routing provider/key/URL.

Configure real drivers through the existing user administration with the DRIVER role. This phase creates none automatically. Verify real warehouse/customer/project coordinates independently; addresses are not geocoded automatically and neither demo coordinates nor test distances populate the main database.

A live smoke test must be separately authorized after configuration. With authorization, an Operations user can prepare a delivery, record an existing driver, verify real pins, and click Calculate Route exactly once. Check result status, warnings, distance/time, attribution and audit without dispatching. This external call shares only coordinates. A route failure must remain a failure, with no manual kilometer fallback. No live call was made during automated testing; all routing-success tests use isolated mocked HTTP responses.

## Approved optional tariff

Leave both `TRANSPORT_RATE_PER_KM` and `TRANSPORT_FIXED_RATE` blank until the company approves an actual tariff. An administrator can then set exactly one in ignored `.env`, plus the actual `TRANSPORT_CURRENCY` (default denomination AED, no default rate). Recreate the backend. New successful calculations snapshot the basis and indicative cost; old results remain unchanged. Rates are not editable by drivers. Cost fields retain inventory-cost read restrictions. This creates no charge, invoice, VAT or journal entry.

## Tests

```powershell
docker compose exec -T backend pytest -q --tb=short
powershell -NoProfile -File scripts/Verify-AuthIntegration.ps1 -RoutingOnly
powershell -NoProfile -File scripts/Verify-AuthIntegration.ps1 -RoutingOnly -Production
```

`-Routing` includes previous phase browser suites. The harness explicitly selects a test-only adapter module guarded by both APP_ENV=test and a generated scratch database name. The normal application has no simulated routing switch. Tests never use the real administrator or live ORS.
