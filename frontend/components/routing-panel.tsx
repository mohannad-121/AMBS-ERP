"use client";
import { useId, useRef, useState } from "react";
import { useResource } from "@/lib/use-resource";
import { api, errorMessage } from "@/lib/api";
import { useUser } from "./app-shell";
import { Pagination, utcTime } from "./forms";

type Site = {
  id: string;
  source_kind: string;
  source_id: string;
  label: string;
  address: string;
  latitude: string;
  longitude: string;
  verified_at: string;
  verification_status: string;
};
type Assignment = {
  id: string;
  driver_id: string;
  revision: number;
  previous_driver_id: string | null;
  planned_departure: string | null;
  reason: string;
  created_at: string;
  actor_id: string;
};
type Route = {
  id: string;
  revision: number;
  status: string;
  message: string;
  origin: Site;
  destination: Site;
  distance_km: string | null;
  duration_display: string | null;
  duration_minutes: string | null;
  warnings: { code: string | null; message: string }[];
  geometry: number[][] | null;
  created_at: string;
  profile: string;
  provider: string;
  estimated_cost: string | null;
  cost_basis: { currency: string; kind: string; rate: string } | null;
  provider_timestamp: string | null;
};
type Delivery = {
  id: string;
  code: string;
  status: string;
  order_code: string;
  destination: string;
  driver_id: string | null;
  dispatched_at: string | null;
  lines: {
    id: string;
    item_id: string;
    item_name: string;
    unit_name: string;
    quantity: string;
    loaded_quantity: string | null;
    lot_id: string | null;
    location_name: string;
  }[];
};
type Detail = {
  delivery: Delivery;
  driver_name: string | null;
  assignment: Assignment | null;
  assignment_history: Assignment[];
  calculations: Route[];
  confirmations: {
    id: string;
    calculation_id: string;
    assignment_id: string;
    created_at: string;
    actor_id: string;
    reason: string;
  }[];
  route_status: string;
  trip_status: string;
  trip_events: {
    id: string;
    status: string;
    occurred_at: string;
    actor_id: string;
  }[];
  transport_cost_status: string;
};
type Source = {
  kind: string;
  id: string;
  label: string;
  address: string;
  endpoint: string;
};
type Options = {
  sources: Source[];
  sites: Site[];
  drivers: { id: string; name: string }[];
};
type Journey = {
  identity_note: string;
  scope: string;
  items: {
    kind: string;
    timestamp: string;
    actor: string | null;
    quantity: string;
    unit: string;
    location: string | null;
    reference: string;
    source: string;
    lot_id: string | null;
    links: Record<string, string | null>;
  }[];
  total: number;
  page: number;
  page_size: number;
};
function Field({
  label,
  children,
}: {
  label: string;
  children: (id: string) => React.ReactNode;
}) {
  const id = useId();
  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      {children(id)}
    </div>
  );
}
const reasonLabel = "Routing / trip reason *";

function RoutePreview({ route }: { route: Route }) {
  const points = route.geometry;
  if (!points?.length)
    return (
      <p className="field-hint">
        No route geometry returned. The recorded summary remains available.
        Basemap provider is not configured.
      </p>
    );
  const endpoints = [
    [Number(route.origin.longitude), Number(route.origin.latitude)],
    [Number(route.destination.longitude), Number(route.destination.latitude)],
  ];
  const all = [...points, ...endpoints];
  const xs = all.map((p) => p[0]),
    ys = all.map((p) => p[1]),
    minX = Math.min(...xs),
    maxX = Math.max(...xs),
    minY = Math.min(...ys),
    maxY = Math.max(...ys);
  const project = (p: number[]) => [
    30 + ((p[0] - minX) / (maxX - minX || 1)) * 540,
    210 - ((p[1] - minY) / (maxY - minY || 1)) * 180,
  ];
  const [a, b] = endpoints.map(project);
  return (
    <figure className="route-preview">
      <svg
        viewBox="0 0 600 240"
        role="img"
        aria-label="Calculated road route with verified origin and destination pins"
      >
        <polyline
          points={points.map((p) => project(p).join(",")).join(" ")}
          fill="none"
          stroke="currentColor"
          strokeWidth="3"
        />
        <circle cx={a[0]} cy={a[1]} r="6" fill="currentColor" />
        <text
          x={a[0] + (a[0] > 300 ? -9 : 9)}
          y={a[1] > 120 ? a[1] - 12 : a[1] + 24}
          textAnchor={a[0] > 300 ? "end" : "start"}
          fontSize="24"
        >
          Origin
        </text>
        <circle cx={b[0]} cy={b[1]} r="6" fill="currentColor" />
        <text
          x={b[0] + (b[0] > 300 ? -9 : 9)}
          y={b[1] > 120 ? b[1] - 12 : b[1] + 24}
          textAnchor={b[0] > 300 ? "end" : "start"}
          fontSize="24"
        >
          Destination
        </text>
      </svg>
      <figcaption>
        Provider road geometry preview; basemap provider is not configured.
        Coordinate projection is for preview only.
      </figcaption>
    </figure>
  );
}
function Attribution() {
  return (
    <p className="field-hint">
      <a href="https://openrouteservice.org/" target="_blank" rel="noreferrer">
        © openrouteservice by HeiGIT
      </a>{" "}
      | Data from{" "}
      <a
        href="https://www.openstreetmap.org/copyright"
        target="_blank"
        rel="noreferrer"
      >
        OpenStreetMap
      </a>{" "}
      ·{" "}
      <a
        href="https://creativecommons.org/licenses/by-sa/4.0/"
        target="_blank"
        rel="noreferrer"
      >
        CC BY-SA 4.0
      </a>
      . Geometry decoded and units converted for display.
    </p>
  );
}

export function RoutingPanel({ deliveryId }: { deliveryId: string }) {
  const pendingKeys = useRef(new Map<string, string>());
  const user = useUser(),
    can = (p: string) => user.permissions.includes(p);
  const detail = useResource<Detail>(`/routing/deliveries/${deliveryId}`),
    options = useResource<Options>(
      can("routes.calculate")
        ? `/routing/deliveries/${deliveryId}/options`
        : null,
    );
  const [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [notice, setNotice] = useState("");
  const [origin, setOrigin] = useState(""),
    [destination, setDestination] = useState(""),
    [siteMode, setSiteMode] = useState<string | null>(null),
    [sourceKey, setSourceKey] = useState("");
  const [tracking, setTracking] = useState<{
      item_id: string;
      lot_id: string | null;
    } | null>(null),
    [journeyPage, setJourneyPage] = useState(1);
  const journey = useResource<Journey>(
    tracking
      ? `/routing/deliveries/${deliveryId}/journey/${tracking.item_id}?page=${journeyPage}${tracking.lot_id ? `&lot_id=${tracking.lot_id}` : ""}`
      : null,
  );
  const data = detail.data,
    latest = data?.calculations.at(-1),
    source = options.data?.sources.find(
      (s) => `${s.kind}:${s.id}` === sourceKey,
    );
  const open =
    !!data &&
    !["CANCELLED", "REVERSED"].includes(data.delivery.status) &&
    data.trip_events.length === 0;
  async function mutate(
    path: string,
    body: Record<string, unknown>,
    success: string,
  ) {
    if (busy) return;
    const fingerprint = JSON.stringify([path, body]);
    const requestKey =
      pendingKeys.current.get(fingerprint) ?? crypto.randomUUID();
    pendingKeys.current.set(fingerprint, requestKey);
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const row = await api<{ id: string; status?: string; message?: string }>(
        path,
        { method: "POST", body: { request_key: requestKey, ...body } },
      );
      pendingKeys.current.delete(fingerprint);
      setNotice(row.message ?? success);
      detail.reload();
      return row;
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }
  const readReason = (f: FormData) => String(f.get("reason"));
  async function assign(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const departure = String(f.get("departure") || "");
    await mutate(
      `/routing/deliveries/${deliveryId}/assign`,
      {
        driver_id: f.get("driver"),
        planned_departure: departure ? new Date(departure).toISOString() : null,
        reason: readReason(f),
      },
      "Driver assignment recorded. Review route confirmation for this assignment.",
    );
  }
  async function calculate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    await mutate(
      `/routing/deliveries/${deliveryId}/calculate`,
      { origin_id: origin, destination_id: destination, reason: readReason(f) },
      "Route calculation recorded.",
    );
  }
  async function confirm(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    await mutate(
      `/routing/deliveries/${deliveryId}/confirm`,
      {
        calculation_id: latest?.id,
        assignment_id: data?.assignment?.id,
        warnings_reviewed: true,
        reason: readReason(f),
      },
      "Route snapshot confirmed.",
    );
  }
  async function saveSite(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const row = await mutate(
      "/routing/sites",
      {
        source_kind: source?.kind,
        source_id: source?.id,
        label: f.get("label"),
        address: f.get("address"),
        latitude: f.get("latitude"),
        longitude: f.get("longitude"),
        verified: true,
        reason: readReason(f),
      },
      "Verified pin saved.",
    );
    if (row) {
      if (siteMode === "origin") setOrigin(row.id);
      else setDestination(row.id);
      options.reload();
      setSiteMode(null);
    }
  }
  async function trip(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    await mutate(
      `/routing/deliveries/${deliveryId}/trip`,
      {
        status: data?.trip_status === "ARRIVED" ? "COMPLETED" : "ARRIVED",
        verified: true,
        reason: readReason(f),
      },
      "Actual trip event recorded. Inventory is unchanged.",
    );
  }
  function reason() {
    return (
      <Field label={reasonLabel}>
        {(id) => (
          <textarea
            id={id}
            name="reason"
            minLength={10}
            maxLength={1000}
            required
          />
        )}
      </Field>
    );
  }
  function verification(text: string) {
    return (
      <label className="checkbox-field">
        <input type="checkbox" required />
        {text}
      </label>
    );
  }
  function selector(
    label: string,
    value: string,
    change: (v: string) => void,
    kind: string,
  ) {
    const allowed = new Set(
      options.data?.sources
        .filter((s) => s.endpoint === kind)
        .map((s) => `${s.kind}:${s.id}`),
    );
    return (
      <Field label={label}>
        {(id) => (
          <select
            id={id}
            value={value}
            onChange={(e) => change(e.target.value)}
            required
          >
            <option value="">Select verified site...</option>
            {options.data?.sites
              .filter((s) => allowed.has(`${s.source_kind}:${s.source_id}`))
              .map((s) => (
                <option key={s.id} value={s.id}>
                  {s.label} ({s.latitude}, {s.longitude}) -{" "}
                  {utcTime(s.verified_at)}
                </option>
              ))}
          </select>
        )}
      </Field>
    );
  }
  return (
    <section
      className="routing-panel"
      aria-label="Driver route and trip details"
    >
      {detail.loading && <p role="status">Loading route and assignment...</p>}
      {(error || detail.error || options.error) && (
        <p className="notice error" role="alert">
          {error || detail.error || options.error}
        </p>
      )}
      {notice && (
        <p className="notice" role="status">
          {notice}
        </p>
      )}
      {data && (
        <>
          <h3>{data.delivery.code}</h3>
          <p>
            Driver: {data.driver_name ?? "Unassigned"} · Route:{" "}
            <strong>{data.route_status}</strong> · Trip: {data.trip_status}
          </p>
          <p>Destination: {data.delivery.destination}</p>
          <p>
            Planned departure:{" "}
            {data.assignment?.planned_departure
              ? utcTime(data.assignment.planned_departure)
              : "Not recorded"}{" "}
            · Actual dispatch:{" "}
            {data.delivery.dispatched_at
              ? utcTime(data.delivery.dispatched_at)
              : "Not dispatched"}
          </p>
          <p>
            Actual arrival:{" "}
            {data.trip_events.find((e) => e.status === "ARRIVED")
              ? utcTime(
                  data.trip_events.find((e) => e.status === "ARRIVED")!
                    .occurred_at,
                )
              : "Not recorded"}{" "}
            · Actual distance travelled: not tracked
          </p>
          {can("drivers.assign") && open && (
            <details>
              <summary>Assign / reassign driver</summary>
              <form onSubmit={assign}>
                <Field label="Eligible driver *">
                  {(id) => (
                    <select
                      id={id}
                      name="driver"
                      required
                      defaultValue={
                        data.assignment?.driver_id ??
                        data.delivery.driver_id ??
                        ""
                      }
                    >
                      <option value="">Select driver...</option>
                      {options.data?.drivers.map((d) => (
                        <option value={d.id} key={d.id}>
                          {d.name}
                        </option>
                      ))}
                    </select>
                  )}
                </Field>
                <Field label="Planned departure (local time, optional)">
                  {(id) => (
                    <input id={id} name="departure" type="datetime-local" />
                  )}
                </Field>
                {reason()}
                {verification("I verified the driver and assignment details.")}
                <button disabled={busy} className="primary">
                  Save driver assignment
                </button>
              </form>
            </details>
          )}
          {can("routes.calculate") && open && (
            <details open>
              <summary>Verified endpoints and route calculation</summary>
              <p>
                Choose saved verified pins. Address text alone is insufficient.
                Only coordinates are sent to HeiGIT when you calculate.
              </p>
              <form onSubmit={calculate}>
                <div className="form-grid">
                  {selector("Verified origin *", origin, setOrigin, "origin")}
                  {selector(
                    "Verified destination *",
                    destination,
                    setDestination,
                    "destination",
                  )}
                </div>
                <div className="row-actions">
                  {["origin", "destination"].map((kind) => (
                    <button
                      type="button"
                      key={kind}
                      disabled={busy}
                      onClick={() => {
                        setSiteMode(kind);
                        setSourceKey("");
                      }}
                    >
                      Verify new {kind} pin
                    </button>
                  ))}
                </div>
                {reason()}
                {verification(
                  "I confirmed latitude/longitude order and the final origin and destination positions.",
                )}
                <button
                  disabled={busy || !origin || !destination}
                  className="primary"
                >
                  {busy
                    ? "Calculating..."
                    : latest
                      ? "Recalculate route"
                      : "Calculate route"}
                </button>
              </form>
              {siteMode && (
                <form onSubmit={saveSite} className="inventory-detail">
                  <h4>Verify {siteMode} pin</h4>
                  <p>
                    Enter a position you have checked independently. No address
                    search or automatic geocoding is performed.
                  </p>
                  <Field label="Source record *">
                    {(id) => (
                      <select
                        id={id}
                        required
                        value={sourceKey}
                        onChange={(e) => setSourceKey(e.target.value)}
                      >
                        <option value="">Select source...</option>
                        {options.data?.sources
                          .filter((s) => s.endpoint === siteMode)
                          .map((s) => (
                            <option
                              key={s.kind + s.id}
                              value={`${s.kind}:${s.id}`}
                            >
                              {s.kind}: {s.label}
                            </option>
                          ))}
                      </select>
                    )}
                  </Field>
                  <div key={sourceKey}>
                    <Field label="Site label *">
                      {(id) => (
                        <input
                          id={id}
                          name="label"
                          maxLength={200}
                          required
                          defaultValue={source?.label ?? ""}
                        />
                      )}
                    </Field>
                    <Field label="Verified address *">
                      {(id) => (
                        <textarea
                          id={id}
                          name="address"
                          maxLength={2000}
                          required
                          defaultValue={source?.address ?? ""}
                        />
                      )}
                    </Field>
                  </div>
                  <div className="form-grid">
                    <Field label="Latitude (north/south, -90 to 90) *">
                      {(id) => (
                        <input
                          id={id}
                          name="latitude"
                          type="number"
                          min={-90}
                          max={90}
                          step="0.0000001"
                          required
                        />
                      )}
                    </Field>
                    <Field label="Longitude (east/west, -180 to 180) *">
                      {(id) => (
                        <input
                          id={id}
                          name="longitude"
                          type="number"
                          min={-180}
                          max={180}
                          step="0.0000001"
                          required
                        />
                      )}
                    </Field>
                  </div>
                  {reason()}
                  {verification(
                    "I verified this real pin, its address and source record.",
                  )}
                  <div className="row-actions">
                    <button
                      type="button"
                      onClick={() => setSiteMode(null)}
                      disabled={busy}
                    >
                      Cancel pin
                    </button>
                    <button disabled={busy || !source} className="primary">
                      Save verified pin
                    </button>
                  </div>
                </form>
              )}
            </details>
          )}
          {latest && (
            <article className="inventory-detail">
              <h3>Route estimate · revision {latest.revision}</h3>
              <p>
                {latest.status}: {latest.message}
              </p>
              <p>
                Origin: {latest.origin.label} · {latest.origin.address} (
                {latest.origin.latitude}, {latest.origin.longitude})
              </p>
              <p>
                Destination: {latest.destination.label} ·{" "}
                {latest.destination.address} ({latest.destination.latitude},{" "}
                {latest.destination.longitude})
              </p>
              {latest.status === "SUCCESS" && (
                <>
                  <p>
                    <strong>
                      Planned road distance: {latest.distance_km} km
                    </strong>
                  </p>
                  <p>
                    <strong>
                      Estimated Driving Time: {latest.duration_display}
                    </strong>
                  </p>
                  <p>
                    Calculated {utcTime(latest.created_at)} · {latest.provider}{" "}
                    / {latest.profile}
                  </p>
                  <p className="notice">
                    Driving-car is not necessarily truck compliant. This
                    estimate is not live traffic, actual distance travelled, or
                    proof of arrival.
                  </p>
                  {latest.warnings.length > 0 && (
                    <div className="notice" role="note">
                      <strong>Provider road warnings — review required</strong>
                      <ul>
                        {latest.warnings.map((w, i) => (
                          <li key={i}>
                            {w.code && `${w.code}: `}
                            {w.message}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  <RoutePreview route={latest} />
                  <Attribution />
                  <p>
                    Indicative transport cost:{" "}
                    {latest.estimated_cost && latest.cost_basis
                      ? `${latest.estimated_cost} ${latest.cost_basis.currency} (${latest.cost_basis.kind} approved basis)`
                      : "NOT_CONFIGURED — no company tariff entered"}
                  </p>
                  {can("routes.confirm") &&
                    open &&
                    data.assignment &&
                    data.route_status !== "CONFIRMED" && (
                      <form onSubmit={confirm}>
                        {reason()}
                        {verification(
                          "I reviewed all route warnings and confirm this estimate for the current driver assignment.",
                        )}
                        <button disabled={busy} className="primary">
                          Confirm route assignment
                        </button>
                      </form>
                    )}
                </>
              )}
            </article>
          )}
          {!latest && (
            <p className="notice">
              {data.route_status === "NOT_CONFIGURED"
                ? "NOT_CONFIGURED: ORS_API_KEY is not configured on the backend. Orders and dispatch remain available."
                : "No route has been calculated. Verified coordinates are required."}
            </p>
          )}
          {data.delivery.status === "DISPATCHED" &&
            data.trip_status !== "COMPLETED" &&
            (can("deliveries.trip.update") || can("deliveries.trip.own")) && (
              <form onSubmit={trip}>
                <h3>
                  {data.trip_status === "ARRIVED"
                    ? "Record trip completion"
                    : "Record actual arrival"}
                </h3>
                <p>
                  Records the current server time after your human verification.
                  This does not change inventory or establish electronic proof
                  of delivery.
                </p>
                {reason()}
                {verification("I personally verified this actual trip event.")}
                <button disabled={busy} className="primary">
                  {data.trip_status === "ARRIVED"
                    ? "Confirm trip completion"
                    : "Confirm actual arrival"}
                </button>
              </form>
            )}
          <h3>Items and traceability</h3>
          <ul>
            {data.delivery.lines.map((l) => (
              <li key={l.id}>
                {l.item_name} · {l.loaded_quantity ?? l.quantity} {l.unit_name}{" "}
                · {l.location_name}
                {l.lot_id && ` · Lot/serial ${l.lot_id}`}{" "}
                {can("items.trace.read") && (
                  <button
                    onClick={() => {
                      setTracking({ item_id: l.item_id, lot_id: l.lot_id });
                      setJourneyPage(1);
                    }}
                  >
                    Item journey: {l.item_name}
                  </button>
                )}
              </li>
            ))}
          </ul>
          {tracking && (
            <section className="inventory-detail">
              <h3>Item journey</h3>
              {journey.loading ? (
                <p role="status">Loading recorded events...</p>
              ) : journey.error ? (
                <p role="alert" className="notice error">
                  {journey.error}
                </p>
              ) : (
                journey.data && (
                  <>
                    <p>
                      {journey.data.identity_note}. Scope: {journey.data.scope}.
                    </p>
                    <div className="table-scroll">
                      <table>
                        <caption>Recorded item events</caption>
                        <thead>
                          <tr>
                            {[
                              "Event",
                              "Time",
                              "Employee",
                              "Quantity",
                              "Location",
                              "Reference",
                            ].map((t) => (
                              <th key={t}>{t}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {journey.data.items.map((e, i) => (
                            <tr key={i}>
                              <td>{e.kind}</td>
                              <td>{utcTime(e.timestamp)}</td>
                              <td>{e.actor ?? "Not recorded"}</td>
                              <td>
                                {e.quantity} {e.unit}
                              </td>
                              <td>{e.location ?? "Not recorded"}</td>
                              <td>
                                {e.reference}
                                <details>
                                  <summary>Source links</summary>
                                  <p>{e.source}</p>
                                  {Object.entries(e.links).map(([k, v]) => (
                                    <p key={k}>
                                      {k}: {v ?? "None"}
                                    </p>
                                  ))}
                                </details>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    <Pagination
                      page={journeyPage}
                      total={journey.data.total}
                      size={100}
                      onChange={setJourneyPage}
                      loading={journey.loading}
                    />
                  </>
                )
              )}
            </section>
          )}
          {data.assignment_history.length > 0 && (
            <details>
              <summary>
                Driver assignment history ({data.assignment_history.length})
              </summary>
              {data.assignment_history.map((a) => (
                <p key={a.id}>
                  Revision {a.revision} · Driver{" "}
                  {options.data?.drivers.find((d) => d.id === a.driver_id)
                    ?.name ?? a.driver_id}{" "}
                  · {utcTime(a.created_at)} · {a.reason} · Assigned by{" "}
                  {a.actor_id}
                </p>
              ))}
            </details>
          )}
          {data.calculations.length > 0 && (
            <details>
              <summary>
                Route revision history ({data.calculations.length})
              </summary>
              {data.calculations.map((r) => (
                <div key={r.id}>
                  <p>
                    Revision {r.revision} · {r.status} ·{" "}
                    {r.distance_km ?? "No estimate"} {r.distance_km ? "km" : ""}{" "}
                    · {r.duration_display ?? "No duration"} ·{" "}
                    {utcTime(r.created_at)}
                  </p>
                  <p>
                    {r.origin.label} → {r.destination.label}
                  </p>
                  {r.warnings.map((w, i) => (
                    <p key={i}>{w.message}</p>
                  ))}
                </div>
              ))}
            </details>
          )}
          {data.confirmations.length > 0 && (
            <details>
              <summary>
                Confirmed route snapshots ({data.confirmations.length})
              </summary>
              {data.confirmations.map((c) => (
                <p key={c.id}>
                  Route {c.calculation_id} · Assignment {c.assignment_id} ·
                  Confirmed {utcTime(c.created_at)} by {c.actor_id} · {c.reason}
                </p>
              ))}
            </details>
          )}
          <button onClick={() => detail.reload()} disabled={busy}>
            Refresh route / trip
          </button>
        </>
      )}
    </section>
  );
}

export function DriverTrips() {
  const [page, setPage] = useState(1),
    [selected, setSelected] = useState<string | null>(null);
  const resource = useResource<{ items: Detail[]; total: number }>(
    `/routing/mine?page=${page}`,
  );
  return (
    <>
      <div className="page-header">
        <div>
          <h1>My delivery assignments</h1>
          <p>
            Only deliveries currently assigned to your driver account appear
            here.
          </p>
        </div>
        <button onClick={resource.reload}>Refresh assignments</button>
      </div>
      {resource.error && <p role="alert">{resource.error}</p>}
      {selected ? (
        <>
          <button onClick={() => setSelected(null)}>
            Back to my assignments
          </button>
          <RoutingPanel deliveryId={selected} />
        </>
      ) : (
        <section className="data-panel">
          {resource.loading ? (
            <p role="status">Loading assignments...</p>
          ) : resource.data?.items.length ? (
            resource.data.items.map((r) => (
              <article key={r.delivery.id} className="inventory-detail">
                <h2 className="sales-code">{r.delivery.code}</h2>
                <p>
                  {r.delivery.destination} · {r.delivery.status} ·{" "}
                  {r.route_status}
                </p>
                <p>
                  {r.delivery.lines
                    .map(
                      (l) =>
                        `${l.item_name}: ${l.loaded_quantity ?? l.quantity} ${l.unit_name}`,
                    )
                    .join("; ")}
                </p>
                <button onClick={() => setSelected(r.delivery.id)}>
                  Open assigned delivery
                </button>
              </article>
            ))
          ) : (
            <p>No deliveries assigned.</p>
          )}
          <Pagination
            page={page}
            total={resource.data?.total ?? 0}
            size={25}
            onChange={setPage}
            loading={resource.loading}
          />
        </section>
      )}
    </>
  );
}
