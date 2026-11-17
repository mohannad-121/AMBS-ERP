"use client";
import { StatusBadge } from "./status-badge";
import { useId, useState, useSyncExternalStore } from "react";
import { useUser } from "./app-shell";
import { Modal, Pagination, utcTime } from "./forms";
import { api, errorMessage } from "@/lib/api";
import { useResource } from "@/lib/use-resource";
import { RoutingPanel } from "./routing-panel";

type Option = {
  id: string;
  name: string;
  customer_id?: string;
  project_id?: string | null;
  address?: string;
  location?: string;
  unit_name?: string;
};
type Options = Record<
  "customers" | "projects" | "lpos" | "items" | "warehouses" | "drivers",
  Option[]
>;
type History = {
  id: string;
  quantity: string;
  status: string;
  source_reference: string;
};
type Allocation = { id: string; remaining: string; history: History[] };
type Line = {
  id: string;
  item_id: string;
  item_name: string;
  unit_name: string;
  quantity: string;
  dispatched: string;
  on_hand: string;
  reserved: string;
  available: string;
  fulfillable: string;
  outstanding: string;
  allocated: string;
  allocations: Allocation[];
};
type DeliveryLine = {
  id: string;
  item_name: string;
  unit_name: string;
  quantity: string;
  picked_quantity: string | null;
  loaded_quantity: string | null;
  location_name: string;
  lot_id: string | null;
  movement_id: string | null;
};
type Delivery = {
  id: string;
  code: string;
  order_id: string;
  order_code: string;
  warehouse_id: string;
  destination: string;
  driver_id: string | null;
  status: string;
  created_at: string;
  picked_at: string | null;
  loaded_at: string | null;
  dispatched_at: string | null;
  lines: DeliveryLine[];
};
type Order = {
  id: string;
  code: string;
  customer_id: string;
  customer_name: string;
  project_id: string | null;
  lpo_id: string | null;
  requested_date: string | null;
  priority: string;
  notes: string | null;
  status: string;
  version: number;
  lines: Line[];
  deliveries: Delivery[];
  amendments: {
    id: string;
    version: number;
    created_at: string;
    created_by: string;
    reason: string;
    before: unknown;
    after: unknown;
  }[];
};
type Page<T> = { items: T[]; total: number; page: number };
type Task = { action: string; order?: Order; delivery?: Delivery };
const names: Record<string, string> = {
  create: "New order",
  edit: "Edit draft",
  amend: "Amend order",
  confirm: "Confirm order",
  allocate: "Reserve available stock",
  release: "Release allocations",
  prepare: "Prepare delivery",
  pick: "Confirm picking",
  load: "Confirm loading",
  dispatch: "Post dispatch",
  reverse: "Reverse delivery",
  cancel: "Cancel order",
  "cancel-delivery": "Cancel preparation",
};
const subscribe = () => () => {};
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
function Select({
  label,
  value,
  onChange,
  options,
  required = false,
}: {
  label: string;
  value: string;
  onChange: (s: string) => void;
  options: Option[];
  required?: boolean;
}) {
  return (
    <Field label={label}>
      {(id) => (
        <select
          id={id}
          required={required}
          value={value}
          onChange={(e) => onChange(e.target.value)}
        >
          <option value="">{required ? "Select..." : "None"}</option>
          {options.map((o) => (
            <option value={o.id} key={o.id}>
              {o.name}
            </option>
          ))}
        </select>
      )}
    </Field>
  );
}
function StockInfo({
  item,
  ordered = "0",
}: {
  item: string;
  ordered?: string;
}) {
  const r = useResource<{
    on_hand: string;
    reserved: string;
    available: string;
    fulfillable: string;
    shortage: string;
  }>(
    item
      ? `/sales/availability/${item}?ordered=${encodeURIComponent(ordered || "0")}`
      : null,
  );
  return (
    <p className="field-hint" aria-live="polite">
      {r.error ||
        (r.loading
          ? "Loading stock..."
          : r.data
            ? `On hand ${r.data.on_hand} / Reserved ${r.data.reserved} / Available ${r.data.available} / Fulfillable ${r.data.fulfillable} / Shortage ${r.data.shortage}`
            : "Select an item to see stock.")}
    </p>
  );
}

export function SalesScreen() {
  const user = useUser(),
    can = (p: string) => user.permissions.includes(`sales.${p}`);
  const orderRead = can("orders.read");
  const ready = useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  );
  const [tab, setTab] = useState(orderRead ? "orders" : "deliveries"),
    [page, setPage] = useState(1),
    [search, setSearch] = useState(""),
    [status, setStatus] = useState("");
  const [selected, setSelected] = useState<string | null>(null),
    [routingDelivery, setRoutingDelivery] = useState<string | null>(null),
    [task, setTask] = useState<Task | null>(null),
    [revision, setRevision] = useState(0),
    [notice, setNotice] = useState("");
  const options = useResource<Options>(
    orderRead ? "/sales/options" : null,
    revision,
  );
  const list = useResource<Page<Order>>(
    tab === "orders" || tab === "outstanding"
      ? `/sales/orders?page=${page}&search=${encodeURIComponent(search)}&status=${status}&outstanding=${tab === "outstanding"}`
      : null,
    revision,
  );
  const deliveries = useResource<Page<Delivery>>(
    tab === "deliveries"
      ? `/sales/deliveries?page=${page}&status=${status}`
      : null,
    revision,
  );
  const detail = useResource<Order>(
    selected ? `/sales/orders/${selected}` : null,
    revision,
  );
  const [stockItem, setStockItem] = useState("");
  function reload() {
    setRevision((n) => n + 1);
  }
  function buttons(o: Order) {
    return (
      <div className="row-actions">
        {o.status === "DRAFT" && can("orders.update") && (
          <button onClick={() => setTask({ action: "edit", order: o })}>
            Edit draft
          </button>
        )}
        {o.status === "DRAFT" && can("orders.confirm") && (
          <button onClick={() => setTask({ action: "confirm", order: o })}>
            Confirm order
          </button>
        )}
        {!["DRAFT", "CANCELLED"].includes(o.status) && can("orders.amend") && (
          <button onClick={() => setTask({ action: "amend", order: o })}>
            Amend order
          </button>
        )}
        {["CONFIRMED", "PARTIALLY_DISPATCHED"].includes(o.status) &&
          can("deliveries.prepare") && (
            <button
              className="primary"
              onClick={() => setTask({ action: "prepare", order: o })}
            >
              Prepare delivery
            </button>
          )}
        {["CONFIRMED", "PARTIALLY_DISPATCHED"].includes(o.status) &&
          can("allocations.manage") && (
            <>
              <button onClick={() => setTask({ action: "allocate", order: o })}>
                Reserve available stock
              </button>
              <button onClick={() => setTask({ action: "release", order: o })}>
                Release allocations
              </button>
            </>
          )}
        {!["COMPLETED", "CANCELLED"].includes(o.status) &&
          can("orders.cancel") && (
            <button onClick={() => setTask({ action: "cancel", order: o })}>
              Cancel order
            </button>
          )}
      </div>
    );
  }
  function deliveryCard(d: Delivery) {
    return (
      <article className="inventory-detail" key={d.id} data-delivery-id={d.id}>
        <h3>{d.code}</h3>
        <p>
          {d.order_code} / <StatusBadge status={d.status} /> / Destination:{" "}
          {d.destination}
        </p>
        <p className="field-hint">
          Prepared {utcTime(d.created_at)}
          {d.picked_at && `  /  Picked ${utcTime(d.picked_at)}`}
          {d.loaded_at && `  /  Loaded ${utcTime(d.loaded_at)}`}
          {d.dispatched_at && `  /  Dispatched ${utcTime(d.dispatched_at)}`}
        </p>
        <div className="table-scroll">
          <table>
            <caption className="sr-only">Delivery quantities</caption>
            <thead>
              <tr>
                <th>Item / source</th>
                <th>Required</th>
                <th>Picked</th>
                <th>Loaded</th>
                <th>Stock issue</th>
              </tr>
            </thead>
            <tbody>
              {d.lines.map((l) => (
                <tr key={l.id}>
                  <td>
                    {l.item_name} / {l.unit_name}
                    <br />
                    {l.location_name}
                    {l.lot_id && `  /  Lot/serial ${l.lot_id}`}
                  </td>
                  <td>{l.quantity}</td>
                  <td>{l.picked_quantity ?? "Not verified"}</td>
                  <td>{l.loaded_quantity ?? "Not verified"}</td>
                  <td>{l.movement_id ?? "Pending dispatch"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="row-actions">
          {user.permissions.includes("routes.read") && (
            <button onClick={() => setRoutingDelivery(d.id)}>
              Driver, route & item journey
            </button>
          )}
          {d.status === "DRAFT" && can("deliveries.pick") && (
            <button onClick={() => setTask({ action: "pick", delivery: d })}>
              Confirm picking
            </button>
          )}
          {d.status === "PICKED" && can("deliveries.load") && (
            <button onClick={() => setTask({ action: "load", delivery: d })}>
              Confirm loading
            </button>
          )}
          {d.status === "LOADED" && can("deliveries.dispatch") && (
            <button
              className="primary"
              onClick={() => setTask({ action: "dispatch", delivery: d })}
            >
              Post dispatch
            </button>
          )}
          {["DRAFT", "PICKED", "LOADED"].includes(d.status) &&
            can("deliveries.prepare") && (
              <button
                onClick={() =>
                  setTask({ action: "cancel-delivery", delivery: d })
                }
              >
                Cancel preparation
              </button>
            )}
          {d.status === "DISPATCHED" && can("deliveries.reverse") && (
            <button onClick={() => setTask({ action: "reverse", delivery: d })}>
              Reverse delivery
            </button>
          )}
        </div>
      </article>
    );
  }
  return (
    <>
      <div className="page-header">
        <div>
          <p className="eyebrow">CORE OPERATIONS</p>
          <h1>Orders & dispatch</h1>
          <p>
            Prepare, verify and dispatch stock against the original customer
            order.
          </p>
        </div>
        <div className="row-actions">
          <button onClick={reload}>Refresh</button>
          {can("orders.create") && (
            <button
              className="primary"
              disabled={!ready || !options.data}
              onClick={() => setTask({ action: "create" })}
            >
              New order
            </button>
          )}
        </div>
      </div>
      <div className="row-actions" aria-label="Order views">
        {[
          ...(orderRead ? ["orders", "outstanding"] : []),
          "deliveries",
          ...(orderRead ? ["availability"] : []),
        ].map((t) => (
          <button
            key={t}
            aria-pressed={tab === t}
            onClick={() => {
              setTab(t);
              setPage(1);
              setStatus("");
              setSelected(null);
            }}
          >
            {
              {
                orders: "Sales orders",
                outstanding: "Outstanding / backorders",
                deliveries: "Delivery history",
                availability: "Stock availability",
              }[t]
            }
          </button>
        ))}
      </div>
      {notice && (
        <p className="notice" role="status">
          {notice}
        </p>
      )}
      {(options.error || list.error || deliveries.error || detail.error) && (
        <p className="notice error" role="alert">
          {options.error || list.error || deliveries.error || detail.error}
        </p>
      )}
      {selected ? (
        <section className="data-panel">
          <button onClick={() => setSelected(null)}>Back to orders</button>
          {detail.loading ? (
            <p role="status">Loading order...</p>
          ) : (
            detail.data && (
              <>
                <h2 className="sales-code">{detail.data.code}</h2>
                <p>
                  {detail.data.customer_name} /{" "}
                  <StatusBadge status={detail.data.status} /> / Priority{" "}
                  {detail.data.priority} / Requested{" "}
                  {detail.data.requested_date ?? "Not specified"}
                </p>
                <p>
                  Project:{" "}
                  {options.data?.projects.find(
                    (p) => p.id === detail.data?.project_id,
                  )?.name ??
                    detail.data.project_id ??
                    "None"}{" "}
                  / LPO:{" "}
                  {options.data?.lpos.find((p) => p.id === detail.data?.lpo_id)
                    ?.name ??
                    detail.data.lpo_id ??
                    "None"}
                </p>
                {detail.data.notes && <p>{detail.data.notes}</p>}
                {buttons(detail.data)}
                <div className="table-scroll">
                  <table>
                    <caption>Order fulfillment</caption>
                    <thead>
                      <tr>
                        {[
                          "Item / unit",
                          "Ordered",
                          "On hand",
                          "Reserved (all)",
                          "Available",
                          "Allocated",
                          "Fulfillable",
                          "Dispatched",
                          "Outstanding",
                        ].map((h) => (
                          <th key={h}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {detail.data.lines.map((l) => (
                        <tr key={l.id}>
                          <td>
                            {l.item_name} / {l.unit_name}
                          </td>
                          {[
                            l.quantity,
                            l.on_hand,
                            l.reserved,
                            l.available,
                            l.allocated,
                            l.fulfillable,
                            l.dispatched,
                            l.outstanding,
                          ].map((q, i) => (
                            <td key={i}>{q}</td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <p className="field-hint">
                  Outstanding quantities stay on this order. Preparing a
                  delivery reserves usable stock automatically; only dispatch
                  deducts on-hand stock.
                </p>
                <h2>Deliveries</h2>
                {detail.data.deliveries.length ? (
                  detail.data.deliveries.map(deliveryCard)
                ) : (
                  <p>No deliveries yet.</p>
                )}
                <details>
                  <summary>Allocation history</summary>
                  {detail.data.lines.map((l) => (
                    <div key={l.id}>
                      <h3>{l.item_name}</h3>
                      {l.allocations.length ? (
                        l.allocations.map((a) => (
                          <div key={a.id}>
                            <p>
                              Allocation {a.id} / Remaining hold {a.remaining}
                            </p>
                            {a.history.map((h) => (
                              <p key={h.id}>
                                {h.quantity} / {h.status} / {h.source_reference}
                              </p>
                            ))}
                          </div>
                        ))
                      ) : (
                        <p>No stock allocated.</p>
                      )}
                    </div>
                  ))}
                </details>
                <details>
                  <summary>
                    Amendment history ({detail.data.amendments.length})
                  </summary>
                  {detail.data.amendments.map((a) => (
                    <div key={a.id}>
                      <h3>
                        Version {a.version} / {utcTime(a.created_at)}
                      </h3>
                      <p>
                        {a.reason} / Actor {a.created_by}
                      </p>
                      <pre>
                        {JSON.stringify(
                          { before: a.before, after: a.after },
                          null,
                          2,
                        )}
                      </pre>
                    </div>
                  ))}
                </details>
              </>
            )
          )}
        </section>
      ) : tab === "availability" ? (
        <section className="data-panel">
          <h2>Usable stock availability</h2>
          <Select
            label="Item"
            value={stockItem}
            onChange={setStockItem}
            options={options.data?.items ?? []}
          />
          <StockInfo item={stockItem} />
          <p>
            Quarantined, damaged, rejected, blocked and external supplier stock
            is excluded.
          </p>
        </section>
      ) : (
        <section className="data-panel">
          <div className="form-grid">
            {tab !== "deliveries" && (
              <Field label="Search orders / customer">
                {(id) => (
                  <input
                    id={id}
                    value={search}
                    onChange={(e) => {
                      setSearch(e.target.value);
                      setPage(1);
                    }}
                  />
                )}
              </Field>
            )}
            <Select
              label="Status"
              value={status}
              onChange={(s) => {
                setStatus(s);
                setPage(1);
              }}
              options={(tab === "deliveries"
                ? [
                    "DRAFT",
                    "PICKED",
                    "LOADED",
                    "DISPATCHED",
                    "REVERSED",
                    "CANCELLED",
                  ]
                : [
                    "DRAFT",
                    "CONFIRMED",
                    "PARTIALLY_DISPATCHED",
                    "COMPLETED",
                    "CANCELLED",
                  ]
              ).map((s) => ({ id: s, name: s }))}
            />
          </div>
          {list.loading || deliveries.loading ? (
            <p role="status">Loading records...</p>
          ) : tab === "deliveries" ? (
            deliveries.data?.items.length ? (
              deliveries.data.items.map(deliveryCard)
            ) : (
              <p>No deliveries found.</p>
            )
          ) : (
            <div className="table-scroll">
              <table>
                <caption>
                  {tab === "outstanding"
                    ? "Outstanding orders and backorders"
                    : "Customer sales orders"}
                </caption>
                <thead>
                  <tr>
                    <th>Order</th>
                    <th>Customer</th>
                    <th>Requested</th>
                    <th>Status</th>
                    <th>Outstanding by item</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {list.data?.items.map((o) => (
                    <tr key={o.id}>
                      <td>{o.code}</td>
                      <td>{o.customer_name}</td>
                      <td>{o.requested_date ?? "Not specified"}</td>
                      <td>
                        <StatusBadge status={o.status} />
                      </td>
                      <td>
                        {o.lines.map((l) => (
                          <div key={l.id}>
                            {l.item_name}: {l.outstanding} {l.unit_name}
                          </div>
                        ))}
                      </td>
                      <td>
                        <button onClick={() => setSelected(o.id)}>
                          View order
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {list.data?.items.length === 0 && <p>No orders found.</p>}
            </div>
          )}
          <Pagination
            page={page}
            total={
              (tab === "deliveries" ? deliveries.data : list.data)?.total ?? 0
            }
            size={25}
            onChange={setPage}
            loading={list.loading || deliveries.loading}
          />
        </section>
      )}
      {routingDelivery && (
        <Modal
          title="Driver, route & item journey"
          onClose={() => {
            setRoutingDelivery(null);
            reload();
          }}
        >
          <RoutingPanel deliveryId={routingDelivery} />
        </Modal>
      )}
      {task && (
        <SalesForm
          task={task}
          options={options.data}
          onClose={() => setTask(null)}
          onSuccess={(row) => {
            setTask(null);
            setNotice(`${names[task.action]} completed.`);
            if (task.action === "create") {
              setSelected(row.id);
              setTab("orders");
            }
            reload();
          }}
        />
      )}
    </>
  );
}

function SalesForm({
  task,
  options,
  onClose,
  onSuccess,
}: {
  task: Task;
  options?: Options;
  onClose: () => void;
  onSuccess: (r: { id: string }) => void;
}) {
  const { action, order, delivery } = task;
  const [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const [requestKey] = useState(() => crypto.randomUUID());
  const [customer, setCustomer] = useState(""),
    [project, setProject] = useState(""),
    [lpo, setLpo] = useState("");
  const [draftLines, setDraftLines] = useState([
    { key: crypto.randomUUID(), item_id: "", quantity: "" },
  ]);
  const actual = action === "pick" || action === "load",
    amend = action === "amend" || action === "edit";
  const projectOption = options?.projects.find(
      (p) => p.id === order?.project_id,
    ),
    customerOption = options?.customers.find(
      (c) => c.id === order?.customer_id,
    );
  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setError("");
    const f = new FormData(e.currentTarget);
    const body: Record<string, unknown> = {
      request_key: requestKey,
      reason: f.get("reason"),
    };
    if (action === "create")
      Object.assign(body, {
        customer_id: customer,
        project_id: project || null,
        lpo_id: lpo || null,
        requested_date: f.get("date") || null,
        priority: f.get("priority"),
        notes: f.get("notes") || null,
        lines: draftLines.map((l) => ({
          item_id: l.item_id,
          quantity: l.quantity,
        })),
      });
    if (amend)
      Object.assign(body, {
        version: order?.version,
        requested_date: f.get("date") || null,
        priority: f.get("priority"),
        notes: f.get("notes") || null,
        lines: order?.lines.map((l) => ({
          id: l.id,
          quantity: f.get(`qty-${l.id}`),
        })),
      });
    if (action === "prepare" || action === "allocate")
      body.warehouse_id = f.get("warehouse");
    if (action === "prepare")
      Object.assign(body, {
        destination: f.get("destination"),
        driver_id: f.get("driver") || null,
      });
    if (actual)
      Object.assign(body, {
        verified: true,
        lines: delivery?.lines.map((l) => ({
          id: l.id,
          quantity: f.get(`actual-${l.id}`),
        })),
      });
    if (action === "reverse") body.goods_returned_to_origin = true;
    const path =
      action === "create"
        ? "/sales/orders"
        : delivery
          ? `/sales/deliveries/${delivery.id}/${action === "cancel-delivery" ? "cancel" : action}`
          : `/sales/orders/${order?.id}/${action}`;
    try {
      const row = await api<{ id: string }>(path, { method: "POST", body });
      onSuccess(row);
    } catch (err) {
      setError(errorMessage(err));
      setBusy(false);
    }
  }
  return (
    <Modal title={names[action]} onClose={onClose} busy={busy}>
      <form onSubmit={submit}>
        {error && (
          <p className="notice error" role="alert">
            {error}
          </p>
        )}
        {action === "create" && (
          <>
            <div className="form-grid">
              <Select
                label="Customer *"
                value={customer}
                required
                onChange={(s) => {
                  setCustomer(s);
                  setProject("");
                  setLpo("");
                }}
                options={options?.customers ?? []}
              />
              <Select
                label="Project"
                value={project}
                onChange={(s) => {
                  setProject(s);
                  setLpo("");
                }}
                options={
                  options?.projects.filter((p) => p.customer_id === customer) ??
                  []
                }
              />
              <Select
                label="Customer LPO"
                value={lpo}
                onChange={(s) => {
                  setLpo(s);
                  const linked = options?.lpos.find((l) => l.id === s);
                  if (linked?.project_id) setProject(linked.project_id);
                }}
                options={
                  options?.lpos.filter(
                    (l) =>
                      l.customer_id === customer &&
                      (!project || l.project_id === project),
                  ) ?? []
                }
              />
            </div>
            {draftLines.map((l, index) => (
              <div className="inventory-line" key={l.key}>
                <div className="form-grid">
                  <Select
                    label={`Item ${index + 1} *`}
                    required
                    value={l.item_id}
                    onChange={(s) =>
                      setDraftLines((rows) =>
                        rows.map((r) =>
                          r.key === l.key ? { ...r, item_id: s } : r,
                        ),
                      )
                    }
                    options={options?.items ?? []}
                  />
                  <Field label={`Ordered quantity ${index + 1} *`}>
                    {(id) => (
                      <input
                        id={id}
                        type="number"
                        min="0.000001"
                        step="0.000001"
                        required
                        value={l.quantity}
                        onChange={(e) =>
                          setDraftLines((rows) =>
                            rows.map((r) =>
                              r.key === l.key
                                ? { ...r, quantity: e.target.value }
                                : r,
                            ),
                          )
                        }
                      />
                    )}
                  </Field>
                </div>
                <p>
                  Unit:{" "}
                  {options?.items.find((i) => i.id === l.item_id)?.unit_name ??
                    "Select item"}
                </p>
                <StockInfo item={l.item_id} ordered={l.quantity} />
                {draftLines.length > 1 && (
                  <button
                    type="button"
                    onClick={() =>
                      setDraftLines((rows) =>
                        rows.filter((r) => r.key !== l.key),
                      )
                    }
                  >
                    Remove line {index + 1}
                  </button>
                )}
              </div>
            ))}
            <button
              type="button"
              disabled={draftLines.length >= 30}
              onClick={() =>
                setDraftLines((rows) => [
                  ...rows,
                  { key: crypto.randomUUID(), item_id: "", quantity: "" },
                ])
              }
            >
              Add order line
            </button>
          </>
        )}
        {(action === "create" || amend) && (
          <>
            <div className="form-grid">
              <Field label="Requested delivery date">
                {(id) => (
                  <input
                    id={id}
                    name="date"
                    type="date"
                    defaultValue={order?.requested_date ?? ""}
                  />
                )}
              </Field>
              <Field label="Priority">
                {(id) => (
                  <select
                    id={id}
                    name="priority"
                    defaultValue={order?.priority ?? "NORMAL"}
                  >
                    {["LOW", "NORMAL", "HIGH", "URGENT"].map((p) => (
                      <option key={p}>{p}</option>
                    ))}
                  </select>
                )}
              </Field>
            </div>
            <Field label="Notes">
              {(id) => (
                <textarea
                  id={id}
                  name="notes"
                  maxLength={2000}
                  defaultValue={order?.notes ?? ""}
                />
              )}
            </Field>
          </>
        )}
        {amend &&
          order?.lines.map((l) => (
            <Field label={`${l.item_name} quantity *`} key={l.id}>
              {(id) => (
                <input
                  id={id}
                  name={`qty-${l.id}`}
                  type="number"
                  min="0.000001"
                  step="0.000001"
                  required
                  defaultValue={l.quantity}
                />
              )}
            </Field>
          ))}
        {(action === "prepare" || action === "allocate") && (
          <Field label="Origin warehouse *">
            {(id) => (
              <select
                id={id}
                name="warehouse"
                required
                defaultValue={
                  options?.warehouses.length === 1
                    ? options.warehouses[0].id
                    : ""
                }
              >
                <option value="">Select warehouse / </option>
                {options?.warehouses.map((w) => (
                  <option key={w.id} value={w.id}>
                    {w.name}
                  </option>
                ))}
              </select>
            )}
          </Field>
        )}
        {action === "prepare" && (
          <>
            <p>
              Usable available stock will be reserved and added automatically.
              Any shortage remains on this order.
            </p>
            <Field label="Verified customer destination / site *">
              {(id) => (
                <textarea
                  id={id}
                  name="destination"
                  required
                  maxLength={1000}
                  defaultValue={
                    projectOption?.location || customerOption?.address || ""
                  }
                />
              )}
            </Field>
            <Field label="Assigned driver (optional)">
              {(id) => (
                <select id={id} name="driver" defaultValue="">
                  <option value="">Unassigned</option>
                  {options?.drivers.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name}
                    </option>
                  ))}
                </select>
              )}
            </Field>
          </>
        )}
        {actual && (
          <>
            <p>
              Enter the quantities physically verified. Use zero for items not{" "}
              {action === "pick" ? "picked" : "loaded"}.
            </p>
            {delivery?.lines.map((l, i) => (
              <Field
                key={l.id}
                label={`Actual ${action === "pick" ? "picked" : "loaded"} ${i + 1}  /  ${l.item_name} *`}
              >
                {(id) => (
                  <>
                    <p className="field-hint">
                      {l.location_name} / Maximum{" "}
                      {action === "pick" ? l.quantity : l.picked_quantity}{" "}
                      {l.unit_name}
                      {l.lot_id && `  /  Lot/serial ${l.lot_id}`}
                    </p>
                    <input
                      id={id}
                      name={`actual-${l.id}`}
                      required
                      type="number"
                      min="0"
                      step="0.000001"
                      max={
                        action === "pick"
                          ? l.quantity
                          : (l.picked_quantity ?? "0")
                      }
                    />
                  </>
                )}
              </Field>
            ))}
          </>
        )}
        {action === "dispatch" && (
          <p>
            This posts physical stock issues for the actual loaded quantities
            and updates the original order. Verify the load is leaving the
            origin.
          </p>
        )}
        {action === "reverse" && (
          <p>
            Reverse only after all dispatched goods have physically returned to
            their original locations and lot/serial identities. This adds
            compensating stock movements and reopens the original demand.
          </p>
        )}
        {action === "release" && (
          <p>
            Release all unused allocations. Cancel any open preparation first.
            Manual inventory holds remain separate.
          </p>
        )}
        {action === "cancel" && (
          <p>
            This cancels open preparations and releases this order / s holds.
            Orders with net dispatched goods cannot be cancelled.
          </p>
        )}
        <Field label="Business reason *">
          {(id) => (
            <textarea
              id={id}
              name="reason"
              required
              minLength={10}
              maxLength={1000}
            />
          )}
        </Field>
        <label className="checkbox-field">
          <input type="checkbox" required />
          {action === "reverse"
            ? "I verified all goods have physically returned to their original locations."
            : actual
              ? "I physically verified these actual quantities."
              : "I reviewed this operation and its business details."}
        </label>
        <div className="row-actions">
          <button type="button" disabled={busy} onClick={onClose}>
            Cancel
          </button>
          <button className="primary" disabled={busy} type="submit">
            {busy
              ? "Saving..."
              : action === "create"
                ? "Create order"
                : "Confirm action"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
