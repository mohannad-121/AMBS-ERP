# Routing provider architecture — Phase 6B

The backend owns route calculation. `app/services/route_provider.py` defines a small `RoutingProvider.calculate_route(origin, destination, profile)` boundary and normalized `RouteResult`. Only `ORSProvider` is implemented. A future Google Routes adapter can implement this interface after separate approval; no Google key, billing or SDK is installed.

The browser sends verified site IDs and an idempotency key to FastAPI. The service checks session/CSRF, permissions, delivery lifecycle, endpoint ownership and local request budgets. Only then does the adapter send coordinates to HeiGIT. The browser receives normalized operational fields and never ORS credentials or raw provider JSON.

## HTTP contract

`POST https://api.heigit.org/openrouteservice/v2/directions/driving-car/json`

Headers: `Authorization: <backend secret>`, `Content-Type: application/json`, `Accept: application/json`.

```json
{"coordinates": [["longitude", "latitude"], ["longitude", "latitude"]], "instructions": false, "geometry": true}
```

Actual values are numeric coordinates from verified sites, in longitude/latitude order. The illustrative strings above are field labels, not a request to send. No customer name, driver, employee, address text or AMBS reference is sent.

The adapter validates the response shape, finite nonnegative bounded numeric distance/duration, warning structure, optional echoed coordinate order, optional provider timestamp and optional encoded geometry. It reads `routes[0].summary.distance` in meters and `.duration` in seconds. Geometry is decoded to bounded coordinate pairs; it is not synthesized. Warnings are retained. Unknown error bodies and exception text never cross the boundary. Response size is capped at 2 MB, and socket access has a configurable 1–10 second timeout (default 8). Redirects are refused, preventing credential forwarding to another host. No automatic retries occur.

Distances and duration conversions use backend Decimal rounding: km to 2 decimals, minutes to 2 decimals, and a nearest-second `min sec` label. These are planned road distance and Estimated Driving Time. They are neither live-traffic ETA nor actual travel measurements. `driving-car` is not verified for truck restrictions; vehicle-specific routing needs actual dimensions/weight and a supported profile.

## Failure and quota behavior

Statuses: SUCCESS, NOT_CONFIGURED, AUTH_FAILED, QUOTA_EXCEEDED, INVALID_ENDPOINTS, NO_ROUTE, UNAVAILABLE, INVALID_RESPONSE. Failed results have no distance, duration or geometry. An unset key makes no HTTP request. 401/403 produce a safe configuration error; 429 honors bounded Retry-After/cooldown; network/timeout/5xx errors produce UNAVAILABLE. Invalid or missing routes never produce fallback kilometer estimates.

Local budgets default conservatively to 30 calls/minute and 1,000/day UTC and are configurable. They are not representations of permanent account entitlements. Budget checks and committed provider attempts use the existing PostgreSQL transaction gate, so multiple workers cannot oversubscribe the configured budget through simultaneous calculations. Same-key retries return the existing result. Failed external attempts count toward the local budget. No route request occurs on React render, refresh or history reads. Operators explicitly retry with a new operation after correcting a failure. A process crash after an external call but before transaction commit can consume provider quota without an AMBS snapshot; no stock effect occurs. The provider dashboard is the quota authority, including use outside this ERP.

## Storage, licensing and preview

Five append-only tables store verified endpoints, driver assignments, route calculations, confirmations and trip evidence. Each calculated revision retains source pins, metrics, profile, relevant warnings, response timestamp, actor/time and status. Confirmations bind an exact route revision to an exact driver-assignment revision. No raw provider body, API credential, navigation instructions or separate inventory ledger is stored.

Current terms were reviewed on 17 November 2026 at [HeiGIT terms](https://account.heigit.org/info/tos). The current page is rendered by `chunk-TC2R7MR4.js`; it states that ORS results are CC-BY-SA 4.0. This differs from the older staging site's CC-BY wording. [Provider staff clarification](https://ask.openrouteservice.org/t/free-plan-in-an-app-with-a-paid-tier-license-cc-by-sa-4-0-personal-data-and-attribution-questions/8079/) confirms Standard Plan commercial use and the current result license. Retention of normalized snapshots and geometry uses that copy/adaptation license; no API-result expiry or separate caching ban was found in the reviewed current terms. Preserve attribution, license notice and the indication that geometry was decoded/units converted. Recheck terms before provider/account changes or redistribution; derived provider data remains subject to the license. Only authorized endpoint coordinates should be sent under the account's terms and applicable privacy obligations.

The ERP shows `© openrouteservice by HeiGIT | Data from OpenStreetMap`, links the [CC BY-SA 4.0 license](https://creativecommons.org/licenses/by-sa/4.0/) and OpenStreetMap copyright, and draws returned road geometry with verified endpoint markers in an SVG preview. There is no configured basemap/tiles dependency. The preview explicitly says so and does not pretend to be a navigational map. No public OSM tiles, Nominatim or geocoding service is queried. The [OSMF tile policy](https://operations.osmfoundation.org/policies/tiles/) was reviewed; public tiles are capacity-limited and have no SLA. A future tile service requires separately verified commercial/internal permission, attribution, quotas and operational reliability.

Other primary references: [official directions documentation](https://giscience.github.io/openrouteservice/api-reference/endpoints/directions/). The implemented host/path follows the requested current HeiGIT endpoint. Live verification remains a separate, explicitly authorized action.
