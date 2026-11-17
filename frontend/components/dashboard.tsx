"use client";
import Link from "next/link";
import { useResource } from "@/lib/use-resource";
import { useUser } from "./app-shell";
import { CountUp, formatQuantity } from "./count-up";
import { Icon } from "./icon";
import { StatusBadge } from "./status-badge";
import { utcTime } from "./forms";

type Summary = {
  as_of: string;
  cards: {
    key: string;
    label: string;
    value: string;
    href: string;
    note: string;
  }[];
  queues: {
    label: string;
    href: string;
    items: { id: string; code: string; status: string }[];
  }[];
  demand?: { unit: string; precision: number; quantity: string }[];
  inventory?: {
    unit: string;
    precision: number;
    on_hand: string;
    reserved: string;
    available: string;
    nonusable: string;
    external: string;
  }[];
  activity?: { id: string; action: string; actor: string | null; at: string }[];
};
const cardIcons: Record<string, string> = {
  orders: "document",
  deliveries: "truck",
  purchases: "box",
  production: "production",
  low: "pulse",
  customers: "people",
  projects: "building",
};
export function Dashboard() {
  const user = useUser();
  const result = useResource<Summary>("/dashboard");
  const data = result.data;
  const actions = [
    ["customers.create", "/master/customers", "Manage customers", "people"],
    ["sales.orders.create", "/sales", "Create an order", "document"],
    [
      "inventory.receipts.create",
      "/inventory/receipts",
      "Receive stock",
      "box",
    ],
    ["sales.deliveries.prepare", "/sales", "Prepare deliveries", "truck"],
    ["inventory.read", "/inventory/low-stock", "Review low stock", "pulse"],
  ].filter(([permission]) => user.permissions.includes(permission));
  return (
    <>
      <div className="page-header dashboard-header">
        <div>
          <p className="eyebrow">AM BUILDING SOLUTIONS / OPERATIONS</p>
          <h1>Operational dashboard</h1>
          <p>A clear view of your work, from order to delivery.</p>
        </div>
        <button onClick={result.reload} disabled={result.loading}>
          {result.loading ? "Updating…" : "Refresh overview"}
        </button>
      </div>
      {result.error && (
        <div className="notice error" role="alert">
          {result.error} <button onClick={result.reload}>Try again</button>
        </div>
      )}
      {!data && result.loading && (
        <div
          className="kpi-grid"
          role="status"
          aria-label="Loading operational dashboard"
        >
          {[0, 1, 2, 3].map((n) => (
            <div className="kpi-card skeleton" key={n}>
              <span>Loading overview…</span>
            </div>
          ))}
        </div>
      )}
      {data && (
        <>
          <div className="overview-label">
            <span>
              <span className="live-dot" /> PostgreSQL overview
            </span>
            <span>Updated {utcTime(data.as_of)}</span>
          </div>
          <div className="kpi-grid">
            {data.cards.map((card) => (
              <Link
                className={`kpi-card ${card.key === "low" ? "kpi-attention" : ""}`}
                href={card.href}
                key={card.key}
                data-metric={card.key}
              >
                <div className="kpi-heading">
                  <span>{card.label}</span>
                  <span className="kpi-icon">
                    <Icon name={cardIcons[card.key]} />
                  </span>
                </div>
                <strong>
                  <CountUp value={card.value} />
                </strong>
                <div className="kpi-foot">
                  <span>{card.note}</span>
                  <Icon name="arrow" />
                </div>
              </Link>
            ))}
          </div>
          {data.cards.length === 0 && (
            <section className="dashboard-panel">
              <h2>Your workspace is ready</h2>
              <p>
                Your role has no company-wide metrics. Use the navigation to
                access your permitted work.
              </p>
            </section>
          )}
          <div className="dashboard-grid">
            {data.demand && (
              <section className="dashboard-panel demand-panel">
                <div className="section-heading">
                  <div>
                    <p className="eyebrow">CUSTOMER COMMITMENTS</p>
                    <h2>Outstanding demand</h2>
                  </div>
                  <Icon name="document" />
                </div>
                <p className="panel-description">
                  Confirmed demand remaining after dispatched quantities. Each
                  unit is reported separately.
                </p>
                {data.demand.length ? (
                  <div className="demand-values">
                    {data.demand.map((row, i) => (
                      <div key={i}>
                        <strong>
                          <CountUp
                            value={row.quantity}
                            precision={row.precision}
                          />
                        </strong>
                        <span>{row.unit}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <Empty
                    title="No outstanding demand"
                    text="Confirmed orders will appear here when there is work to fulfill."
                  />
                )}
              </section>
            )}
            <section className="dashboard-panel quick-panel">
              <div className="section-heading">
                <div>
                  <p className="eyebrow">YOUR WORKSPACE</p>
                  <h2>Quick actions</h2>
                </div>
                <Icon name="arrow" />
              </div>
              {actions.length ? (
                <div className="quick-actions">
                  {actions.map(([, href, label, icon]) => (
                    <Link href={href} key={label}>
                      <Icon name={icon} />
                      <span>{label}</span>
                      <Icon name="arrow" />
                    </Link>
                  ))}
                </div>
              ) : (
                <Empty
                  title="Use your assigned workflow"
                  text="Available actions depend on your current permissions."
                />
              )}
            </section>
          </div>
          {data.inventory && (
            <section className="dashboard-panel inventory-insights">
              <div className="section-heading">
                <div>
                  <p className="eyebrow">STOCK POSITION</p>
                  <h2>Inventory insights</h2>
                </div>
                <Link href="/inventory/balances">
                  View balances <Icon name="arrow" />
                </Link>
              </div>
              <p className="panel-description">
                On-hand includes all custody. Available is allocatable stock
                after reservations. Reserved, non-usable and external quantities
                are separate views, not additive totals.
              </p>
              {data.inventory.length ? (
                <div
                  className="table-scroll"
                  role="region"
                  aria-label="Inventory by unit"
                  tabIndex={0}
                >
                  <table>
                    <thead>
                      <tr>
                        <th>Unit</th>
                        <th>On-hand</th>
                        <th>Reserved</th>
                        <th>Available</th>
                        <th>Non-usable</th>
                        <th>External custody</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.inventory.map((r, i) => (
                        <tr key={i}>
                          <td>{r.unit}</td>
                          {(
                            [
                              "on_hand",
                              "reserved",
                              "available",
                              "nonusable",
                              "external",
                            ] as const
                          ).map((k) => (
                            <td className="numeric" key={k}>
                              {formatQuantity(r[k], r.precision)}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <Empty
                  title="No stock recorded"
                  text="Posted stock movements will populate this overview. No quantities are estimated."
                />
              )}
            </section>
          )}
          <div className="dashboard-grid work-queues">
            {data.queues.map((queue) => (
              <section className="dashboard-panel" key={queue.label}>
                <div className="section-heading">
                  <h2>{queue.label}</h2>
                  <Link href={queue.href} aria-label={`Open ${queue.label}`}>
                    <Icon name="arrow" />
                  </Link>
                </div>
                {queue.items.length ? (
                  <ul className="work-list">
                    {queue.items.map((item) => (
                      <li key={item.id}>
                        <Link href={queue.href}>
                          <strong>{item.code}</strong>
                          <StatusBadge status={item.status} />
                        </Link>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <Empty
                    title="Nothing waiting here"
                    text="Matching records will appear as operations progress."
                  />
                )}
              </section>
            ))}
          </div>
          {data.activity && (
            <section className="dashboard-panel">
              <div className="section-heading">
                <div>
                  <p className="eyebrow">AUDITED EVENTS</p>
                  <h2>Recent activity</h2>
                </div>
                <Link href="/audit">
                  View audit history <Icon name="arrow" />
                </Link>
              </div>
              {data.activity.length ? (
                <ol className="activity-list">
                  {data.activity.map((event) => (
                    <li key={event.id}>
                      <span className="activity-mark">
                        <Icon name="shield" />
                      </span>
                      <div>
                        <strong>
                          {event.action
                            .replaceAll(".", " / ")
                            .replaceAll("_", " ")}
                        </strong>
                        <span>{event.actor ?? "System"}</span>
                      </div>
                      <time dateTime={event.at}>{utcTime(event.at)}</time>
                    </li>
                  ))}
                </ol>
              ) : (
                <Empty
                  title="No activity recorded"
                  text="Authorized audit events will appear here."
                />
              )}
            </section>
          )}
        </>
      )}
    </>
  );
}
function Empty({ title, text }: { title: string; text: string }) {
  return (
    <div className="dashboard-empty">
      <span className="empty-icon">
        <Icon name="box" />
      </span>
      <strong>{title}</strong>
      <p>{text}</p>
    </div>
  );
}
