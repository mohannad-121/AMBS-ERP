"use client";
import { useId, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { StatusBadge } from "./status-badge";
import { CountUp } from "./count-up";
import { api, errorMessage } from "@/lib/api";
import { useResource } from "@/lib/use-resource";
import {
  inventoryScreens,
  movementPermission,
  type InventoryRow as Row,
  type InventoryScreen,
} from "@/lib/inventory";
import { useUser } from "./app-shell";
import { Modal, Pagination, utcTime } from "./forms";
import type { Page } from "@/lib/types";

const hydrationSubscription = () => () => {};
type Save = (path: string, method: string, body: unknown) => void;
type FormProps = { busy: boolean; error: string; onSave: Save; row?: Row };
const string = (value: unknown) => (value == null ? "" : String(value));
const rowList = (value: unknown): Row[] =>
  Array.isArray(value) ? (value as Row[]) : [];

function Input({
  label,
  name,
  value = "",
  type = "text",
  required = false,
  minLength,
  step,
  min,
}: {
  label: string;
  name: string;
  value?: string;
  type?: string;
  required?: boolean;
  minLength?: number;
  step?: string;
  min?: string;
}) {
  const id = useId();
  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      <input
        id={id}
        name={name}
        type={type}
        defaultValue={value}
        required={required}
        minLength={minLength}
        maxLength={name === "reason" ? 1000 : 240}
        step={step}
        min={min}
      />
    </div>
  );
}

function Picker({
  label,
  resource,
  value,
  onChange,
  query = "",
  required = false,
  initialLabel,
}: {
  label: string;
  resource: string;
  value: string;
  onChange: (value: string, row?: Row) => void;
  query?: string;
  required?: boolean;
  initialLabel?: string;
}) {
  const id = useId();
  const [search, setSearch] = useState("");
  const path =
    resource === "available-items"
      ? "/inventory/balances?view=available"
      : `/inventory/options/${resource}?`;
  const result = useResource<Page<Row>>(
    `${path}${resource === "available-items" ? "&" : ""}search=${encodeURIComponent(search)}&page_size=30${query}`,
  );
  const rows = result.data?.items ?? [];
  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      <input
        aria-label={`Search ${label}`}
        placeholder="Search records"
        value={search}
        onChange={(event) => setSearch(event.target.value)}
      />
      <select
        id={id}
        value={value}
        required={required}
        onChange={(event) => {
          const next = event.target.value;
          onChange(
            next,
            rows.find((row) => row.id === next),
          );
        }}
      >
        <option value="">{required ? "Select a record" : "All / none"}</option>
        {value && !rows.some((row) => row.id === value) && (
          <option value={value}>
            {initialLabel ?? `Selected record ${value}`}
          </option>
        )}
        {rows.map((row) => (
          <option key={row.id} value={row.id}>
            {row.name ?? row.code ?? row.id}
          </option>
        ))}
      </select>
      {result.loading && (
        <p className="field-hint" role="status">
          Loading options…
        </p>
      )}
      {result.error && (
        <p className="notice error" role="alert">
          {result.error}
        </p>
      )}
      {(result.data?.total ?? 0) > 30 && (
        <p className="field-hint">
          Refine your search to find additional records.
        </p>
      )}
    </div>
  );
}

function FormFooter({
  busy,
  error,
  label = "Save draft",
}: {
  busy: boolean;
  error: string;
  label?: string;
}) {
  return (
    <>
      {error && (
        <p className="notice error" role="alert">
          {error}
        </p>
      )}
      <div className="modal-actions">
        <button className="primary" disabled={busy}>
          {busy ? "Saving…" : label}
        </button>
      </div>
    </>
  );
}

type Line = {
  key: string;
  item_id: string;
  unit_id: string;
  unit_name: string;
  tracking_mode: string;
  lot_id: string;
  source_id: string;
  destination_id: string;
  quantity: string;
  unit_cost: string;
  currency: string;
  item_name?: string;
  source_name?: string;
  destination_name?: string;
};
function newLine(): Line {
  return {
    key: crypto.randomUUID(),
    item_id: "",
    unit_id: "",
    unit_name: "",
    tracking_mode: "NONE",
    lot_id: "",
    source_id: "",
    destination_id: "",
    quantity: "",
    unit_cost: "",
    currency: "",
  };
}

function MovementForm({
  busy,
  error,
  onSave,
  row,
  initialKind,
}: FormProps & { initialKind: string }) {
  const [requestKey] = useState(() => crypto.randomUUID());
  const [kind, setKind] = useState(string(row?.kind) || initialKind);
  const [lines, setLines] = useState<Line[]>(() =>
    row?.lines
      ? rowList(row.lines).map(
          (entry) =>
            ({
              ...newLine(),
              ...entry,
              key: entry.id,
              quantity: string(entry.quantity),
              unit_cost: string(entry.unit_cost),
              currency: string(entry.currency),
              item_id: string(entry.item_id),
              unit_id: string(entry.unit_id),
              unit_name: string(entry.unit_name),
              tracking_mode:
                string(entry.tracking_mode) || (entry.lot_id ? "LOT" : "NONE"),
              source_id: string(entry.source_id),
              destination_id: string(entry.destination_id),
              lot_id: string(entry.lot_id),
            }) as Line,
        )
      : [newLine()],
  );
  const inbound = ["RECEIPT", "ADJUSTMENT_IN", "RETURN"].includes(kind);
  const outbound = ["ISSUE", "ADJUSTMENT_OUT"].includes(kind);
  const setLine = (key: string, changes: Partial<Line>) =>
    setLines((previous) =>
      previous.map((line) =>
        line.key === key ? { ...line, ...changes } : line,
      ),
    );
  function submit(event: React.SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const body = {
      kind,
      reason: form.get("reason"),
      source_reference: form.get("source_reference") || null,
      occurred_at: new Date(`${form.get("occurred_at")}Z`).toISOString(),
      lines: lines.map((line) => ({
        item_id: line.item_id,
        unit_id: line.unit_id,
        quantity: line.quantity,
        lot_id: line.lot_id || null,
        source_id: inbound ? null : line.source_id,
        destination_id: outbound ? null : line.destination_id,
        unit_cost: inbound && line.unit_cost ? line.unit_cost : null,
        currency: inbound && line.unit_cost ? line.currency : null,
      })),
      ...(row ? { version: row.version } : { request_key: requestKey }),
    };
    onSave(
      row ? `/movements/${row.id}` : "/movements",
      row ? "PUT" : "POST",
      body,
    );
  }
  const kinds =
    initialKind === "RECEIPT"
      ? ["RECEIPT", "RETURN"]
      : initialKind === "ISSUE"
        ? ["ISSUE"]
        : initialKind === "ADJUSTMENT_IN"
          ? ["ADJUSTMENT_IN", "ADJUSTMENT_OUT"]
          : ["TRANSFER", "DAMAGE", "QUARANTINE_TRANSFER", "INSPECTION_RELEASE"];
  return (
    <form className="inventory-form" onSubmit={submit} aria-busy={busy}>
      <fieldset disabled={busy}>
        <p className="field-hint">
          Drafts do not change stock. Verify the physical quantities and post
          separately.
        </p>
        <div className="form-grid">
          <div className="field">
            <label htmlFor="movement-kind">Movement type</label>
            <select
              id="movement-kind"
              value={kind}
              onChange={(event) => setKind(event.target.value)}
            >
              {Array.from(new Set([kind, ...kinds])).map((value) => (
                <option key={value}>{value}</option>
              ))}
            </select>
          </div>
          <Input
            label="Movement time (UTC)"
            name="occurred_at"
            type="datetime-local"
            required
            value={
              string(row?.occurred_at).slice(0, 16) ||
              new Date().toISOString().slice(0, 16)
            }
          />
          <Input
            label="Business reason"
            name="reason"
            required
            minLength={10}
            value={string(row?.reason)}
          />
          <Input
            label="Source / supplier reference (optional)"
            name="source_reference"
            value={string(row?.source_reference)}
          />
        </div>
        {kind === "RETURN" && (
          <p className="notice">
            Returns must enter a quarantine location until inspected.
          </p>
        )}
        {lines.map((line, index) => (
          <section
            className="inventory-line"
            key={line.key}
            aria-label={`Movement line ${index + 1}`}
          >
            <h3>Line {index + 1}</h3>
            <div className="form-grid">
              <Picker
                label={`Item ${index + 1}`}
                resource="items"
                value={line.item_id}
                required
                initialLabel={line.item_name}
                onChange={(value, item) =>
                  setLine(line.key, {
                    item_id: value,
                    unit_id: string(item?.unit_id),
                    unit_name: string(item?.unit_name),
                    tracking_mode: string(item?.tracking_mode) || "NONE",
                    lot_id: "",
                  })
                }
              />
              <div className="field">
                <label htmlFor={`qty-${line.key}`}>
                  Quantity {index + 1} ({line.unit_name || "select item"})
                </label>
                <input
                  id={`qty-${line.key}`}
                  type="number"
                  min="0.000001"
                  step="0.000001"
                  required
                  value={line.quantity}
                  onChange={(event) =>
                    setLine(line.key, { quantity: event.target.value })
                  }
                />
                <p className="field-hint">
                  Unit: {line.unit_name || "—"}. The server enforces its
                  precision.
                </p>
              </div>
              {!inbound && (
                <Picker
                  label={`Source location ${index + 1}`}
                  resource="locations"
                  value={line.source_id}
                  required
                  initialLabel={line.source_name}
                  onChange={(value) => setLine(line.key, { source_id: value })}
                />
              )}
              {!outbound && (
                <Picker
                  label={`Destination location ${index + 1}`}
                  resource="locations"
                  value={line.destination_id}
                  required
                  initialLabel={line.destination_name}
                  onChange={(value) =>
                    setLine(line.key, { destination_id: value })
                  }
                />
              )}
              {line.tracking_mode !== "NONE" && line.item_id && (
                <Picker
                  label={`Lot / serial ${index + 1}`}
                  resource="lots"
                  query={`&item_id=${line.item_id}`}
                  value={line.lot_id}
                  required
                  onChange={(value) => setLine(line.key, { lot_id: value })}
                />
              )}
              {inbound && (
                <>
                  <div className="field">
                    <label htmlFor={`cost-${line.key}`}>
                      Unit cost {index + 1} (optional)
                    </label>
                    <input
                      id={`cost-${line.key}`}
                      type="number"
                      min="0"
                      step="0.000000000001"
                      value={line.unit_cost}
                      onChange={(event) =>
                        setLine(line.key, { unit_cost: event.target.value })
                      }
                    />
                  </div>
                  <div className="field">
                    <label htmlFor={`currency-${line.key}`}>
                      Currency {index + 1} (ISO code)
                    </label>
                    <input
                      id={`currency-${line.key}`}
                      maxLength={3}
                      pattern="[A-Z]{3}"
                      placeholder="Enter confirmed currency"
                      required={!!line.unit_cost}
                      value={line.currency}
                      onChange={(event) =>
                        setLine(line.key, {
                          currency: event.target.value.toUpperCase(),
                        })
                      }
                    />
                  </div>
                </>
              )}
            </div>
            <button
              type="button"
              disabled={lines.length === 1}
              onClick={() =>
                setLines((previous) =>
                  previous.filter((entry) => entry.key !== line.key),
                )
              }
            >
              Remove line {index + 1}
            </button>
          </section>
        ))}
        <button
          type="button"
          disabled={lines.length >= 30}
          onClick={() => setLines((previous) => [...previous, newLine()])}
        >
          Add movement line
        </button>
        <FormFooter busy={busy} error={error} />
      </fieldset>
    </form>
  );
}

function ReservationForm({ busy, error, onSave }: FormProps) {
  const [requestKey] = useState(() => crypto.randomUUID());
  const [item, setItem] = useState<Row | undefined>();
  const [location, setLocation] = useState("");
  const [lot, setLot] = useState("");
  function submit(event: React.SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    onSave("/reservations", "POST", {
      request_key: requestKey,
      item_id: item?.id,
      location_id: location,
      lot_id: lot || null,
      quantity: data.get("quantity"),
      reason: data.get("reason"),
      source_reference: data.get("source_reference") || null,
    });
  }
  return (
    <form onSubmit={submit}>
      <fieldset disabled={busy}>
        <p className="field-hint">
          Internal stock hold only. This reserves usable stock without moving
          it.
        </p>
        <Picker
          label="Reservation item"
          resource="available-items"
          query={location ? `&location_id=${location}` : ""}
          value={item?.id ?? ""}
          required
          onChange={(_, row) => {
            setItem(row);
            setLot("");
          }}
        />
        <Picker
          label="Reservation location"
          resource="locations"
          value={location}
          required
          onChange={setLocation}
        />
        {item && item.tracking_mode !== "NONE" && (
          <Picker
            label="Reservation lot / serial"
            resource="lots"
            query={`&item_id=${item.id}`}
            value={lot}
            required
            onChange={setLot}
          />
        )}
        <p>Unit: {string(item?.unit_name) || "—"}</p>
        <Input
          label="Reserved quantity"
          name="quantity"
          type="number"
          step="0.000001"
          min="0.000001"
          required
        />
        <Input label="Business reason" name="reason" minLength={10} required />
        <Input label="Internal reference (optional)" name="source_reference" />
        <FormFooter busy={busy} error={error} label="Create reservation" />
      </fieldset>
    </form>
  );
}

function CountForm({ busy, error, onSave }: FormProps) {
  const [requestKey] = useState(() => crypto.randomUUID());
  const [location, setLocation] = useState("");
  const [lines, setLines] = useState<
    { key: string; item?: Row; lot: string }[]
  >([{ key: crypto.randomUUID(), lot: "" }]);
  function submit(event: React.SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    onSave("/counts", "POST", {
      request_key: requestKey,
      location_id: location,
      reason: data.get("reason"),
      lines: lines.map((line) => ({
        item_id: line.item?.id,
        lot_id: line.lot || null,
      })),
    });
  }
  return (
    <form className="inventory-form" onSubmit={submit}>
      <fieldset disabled={busy}>
        <Picker
          label="Count location"
          resource="locations"
          value={location}
          required
          onChange={setLocation}
        />
        <Input
          label="Count scope / business reason"
          name="reason"
          required
          minLength={10}
        />
        {lines.map((line, index) => (
          <section className="inventory-line" key={line.key}>
            <Picker
              label={`Count item ${index + 1}`}
              resource="items"
              value={line.item?.id ?? ""}
              required
              onChange={(_, item) =>
                setLines((previous) =>
                  previous.map((entry) =>
                    entry.key === line.key
                      ? { ...entry, item, lot: "" }
                      : entry,
                  ),
                )
              }
            />
            {line.item && line.item.tracking_mode !== "NONE" && (
              <Picker
                label={`Count lot / serial ${index + 1}`}
                resource="lots"
                query={`&item_id=${line.item.id}`}
                value={line.lot}
                required
                onChange={(lot) =>
                  setLines((previous) =>
                    previous.map((entry) =>
                      entry.key === line.key ? { ...entry, lot } : entry,
                    ),
                  )
                }
              />
            )}
            <button
              type="button"
              disabled={lines.length === 1}
              onClick={() =>
                setLines((previous) =>
                  previous.filter((entry) => entry.key !== line.key),
                )
              }
            >
              Remove count item {index + 1}
            </button>
          </section>
        ))}
        <button
          type="button"
          disabled={lines.length >= 30}
          onClick={() =>
            setLines((previous) => [
              ...previous,
              { key: crypto.randomUUID(), lot: "" },
            ])
          }
        >
          Add count item
        </button>
        <FormFooter busy={busy} error={error} label="Create count snapshot" />
      </fieldset>
    </form>
  );
}

function CountRecordForm({ busy, error, onSave, row }: FormProps) {
  function submit(event: React.SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    onSave(`/counts/${row!.id}/record`, "POST", {
      lines: rowList(row!.lines).map((line) => ({
        line_id: line.id,
        counted_quantity: data.get(`quantity-${line.id}`),
        reason: data.get(`reason-${line.id}`),
      })),
    });
  }
  return (
    <form className="inventory-form" onSubmit={submit}>
      <fieldset disabled={busy}>
        <p>
          Enter newly measured physical quantities. Posting is a separate
          confirmed action.
        </p>
        {rowList(row?.lines).map((line, index) => (
          <section key={line.id} className="inventory-line">
            <h3>{string(line.item_name)}</h3>
            <p>
              Snapshot: {string(line.expected_quantity)}{" "}
              {string(line.unit_name)}
            </p>
            <Input
              label={`Physically counted quantity ${index + 1}`}
              name={`quantity-${line.id}`}
              required
              type="number"
              step="0.000001"
              min="0"
              value={string(line.counted_quantity)}
            />
            <Input
              label={`Count explanation ${index + 1}`}
              name={`reason-${line.id}`}
              required
              minLength={10}
              value={string(line.reason)}
            />
          </section>
        ))}
        <FormFooter busy={busy} error={error} label="Submit count for review" />
      </fieldset>
    </form>
  );
}

function ReferenceForm({
  type,
  busy,
  error,
  onSave,
  row,
}: FormProps & {
  type: "warehouse" | "location" | "lot" | "threshold" | "policy";
}) {
  const [warehouse, setWarehouse] = useState(string(row?.warehouse_id));
  const [location, setLocation] = useState(
    string(row?.location_id ?? row?.parent_id),
  );
  const [item, setItem] = useState(string(row?.item_id));
  const [kind, setKind] = useState(string(row?.kind) || "USABLE");
  const policy = useResource<Row>(
    type === "policy" && item ? `/inventory/policies/${item}` : null,
  );
  function submit(event: React.SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const name = string(data.get("name"));
    if (type === "warehouse")
      onSave(`/warehouses${row ? `/${row.id}` : ""}`, row ? "PUT" : "POST", {
        name,
        address: data.get("address") || null,
        description: data.get("description") || null,
        is_default: data.get("is_default") === "on",
        is_active: data.get("is_active") === "on",
      });
    if (type === "location")
      onSave(`/locations${row ? `/${row.id}` : ""}`, row ? "PUT" : "POST", {
        name,
        warehouse_id: warehouse,
        parent_id: location || null,
        kind,
        is_active: data.get("is_active") === "on",
      });
    if (type === "lot")
      onSave("/lots", "POST", {
        name,
        identifier: data.get("identifier"),
        item_id: item,
        notes: data.get("notes") || null,
      });
    if (type === "policy")
      onSave(`/policies/${item}`, "PUT", {
        tracking_mode: data.get("tracking_mode"),
      });
    if (type === "threshold")
      onSave("/thresholds", "PUT", {
        item_id: item,
        warehouse_id: warehouse,
        location_id: location || null,
        minimum: data.get("minimum"),
      });
  }
  return (
    <form onSubmit={submit}>
      <fieldset disabled={busy}>
        {["warehouse", "location", "lot"].includes(type) && (
          <Input label="Name" name="name" required value={string(row?.name)} />
        )}
        {type === "warehouse" && (
          <>
            <Input
              label="Address (optional)"
              name="address"
              value={string(row?.address)}
            />
            <Input
              label="Description (optional)"
              name="description"
              value={string(row?.description)}
            />
            <label className="inventory-check">
              <input
                type="checkbox"
                name="is_default"
                defaultChecked={!!row?.is_default}
              />{" "}
              Default warehouse
            </label>
          </>
        )}
        {["location", "threshold"].includes(type) && (
          <Picker
            label="Warehouse"
            resource="warehouses"
            value={warehouse}
            required
            onChange={(value) => {
              setWarehouse(value);
              setLocation("");
            }}
          />
        )}
        {type === "location" && (
          <>
            <Picker
              label="Parent location (optional)"
              resource="locations"
              query={warehouse ? `&warehouse_id=${warehouse}` : ""}
              value={location}
              onChange={setLocation}
            />
            <div className="field">
              <label htmlFor="location-kind">Stock usability</label>
              <select
                id="location-kind"
                value={kind}
                onChange={(event) => setKind(event.target.value)}
              >
                {["USABLE", "QUARANTINE", "DAMAGED", "REJECTED"].map(
                  (value) => (
                    <option key={value}>{value}</option>
                  ),
                )}
              </select>
            </div>
          </>
        )}
        {["warehouse", "location"].includes(type) && (
          <label className="inventory-check">
            <input
              type="checkbox"
              name="is_active"
              defaultChecked={row ? !!row.is_active : true}
            />{" "}
            Active
          </label>
        )}
        {["lot", "threshold", "policy"].includes(type) && (
          <Picker
            label="Item"
            resource="items"
            value={item}
            required
            onChange={setItem}
          />
        )}
        {type === "lot" && (
          <>
            <Input label="Lot / serial identifier" name="identifier" required />
            <Input label="Notes (optional)" name="notes" />
          </>
        )}
        {type === "policy" && (
          <div className="field">
            <label htmlFor="tracking-mode">Tracking mode</label>
            <select
              key={string(policy.data?.tracking_mode)}
              id="tracking-mode"
              name="tracking_mode"
              disabled={!item || policy.loading || !policy.data}
              defaultValue={string(policy.data?.tracking_mode) || "NONE"}
            >
              {["NONE", "LOT", "SERIAL"].map((value) => (
                <option key={value}>{value}</option>
              ))}
            </select>
            <p className="field-hint">
              Tracking mode becomes fixed after inventory activity or lot
              registration.
            </p>
          </div>
        )}
        {type === "threshold" && (
          <>
            <Picker
              label="Threshold location (optional)"
              resource="locations"
              query={warehouse ? `&warehouse_id=${warehouse}` : ""}
              value={location}
              onChange={setLocation}
            />
            <Input
              label="Minimum quantity"
              name="minimum"
              required
              type="number"
              min="0"
              step="0.000001"
              value={string(row?.minimum)}
            />
          </>
        )}
        <FormFooter
          busy={
            busy ||
            (type === "policy" && (!item || policy.loading || !policy.data))
          }
          error={error || policy.error || ""}
          label="Save configuration"
        />
      </fieldset>
    </form>
  );
}

function ActionForm({
  row,
  path,
  action,
  busy,
  error,
  onSave,
  title,
}: FormProps & { path: string; action: string; title: string }) {
  const [requestKey] = useState(() => crypto.randomUUID());
  function submit(event: React.SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    onSave(path, "POST", {
      request_key: requestKey,
      reason: data.get("reason"),
    });
  }
  return (
    <form onSubmit={submit}>
      <fieldset disabled={busy}>
        <p>
          Confirm {title.toLowerCase()} for {row?.code ?? row?.id}. This action
          is audited. Posted stock history cannot be edited.
        </p>
        <Input
          label="Action reason"
          name="reason"
          required
          minLength={10}
          value={action === "post" ? string(row?.reason) : ""}
        />
        <FormFooter busy={busy} error={error} label="Confirm action" />
      </fieldset>
    </form>
  );
}

type ModalState = {
  type:
    | "movement"
    | "reservation"
    | "count"
    | "record-count"
    | "warehouse"
    | "location"
    | "lot"
    | "threshold"
    | "policy"
    | "action"
    | "lot-status";
  title: string;
  row?: Row;
  path?: string;
  action?: string;
  initialKind?: string;
};

export function InventoryScreenView({ screen }: { screen: InventoryScreen }) {
  const { permissions } = useUser();
  const has = (permission: string) => permissions.includes(permission);
  const hydrated = useSyncExternalStore(
    hydrationSubscription,
    () => true,
    () => false,
  );
  const [revision, setRevision] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [warehouse, setWarehouse] = useState("");
  const [location, setLocation] = useState("");
  const [status, setStatus] = useState("");
  const [sort, setSort] = useState("created_at");
  const [direction, setDirection] = useState("desc");
  const [kind, setKind] = useState(
    screen === "receipts"
      ? "RECEIPT"
      : screen === "issues"
        ? "ISSUE"
        : screen === "transfers"
          ? "TRANSFER"
          : screen === "adjustments"
            ? "ADJUSTMENT_IN"
            : "",
  );
  const [modal, setModal] = useState<ModalState | null>(null);
  const [detail, setDetail] = useState<Row | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const balanceScreen = ["balances", "low-stock", "quality"].includes(screen);
  const movementScreen = [
    "movements",
    "receipts",
    "issues",
    "transfers",
    "adjustments",
  ].includes(screen);
  const resource = movementScreen
    ? "movements"
    : screen === "traceability"
      ? "lots"
      : screen === "low-stock"
        ? "thresholds"
        : screen;
  const params = new URLSearchParams({
    page: String(page),
    search,
    sort: balanceScreen ? (sort === "created_at" ? "name" : sort) : sort,
    direction,
    ...(warehouse ? { warehouse_id: warehouse } : {}),
    ...(location ? { location_id: location } : {}),
    ...(status ? { status } : {}),
    ...(movementScreen && kind ? { kind } : {}),
  });
  const path =
    screen === "overview"
      ? `/inventory/overview?${params}`
      : balanceScreen
        ? `/inventory/balances?${params}&view=${screen === "low-stock" ? "low" : screen === "quality" ? "nonusable" : "all"}`
        : ["warehouses", "locations"].includes(screen)
          ? `/inventory/${screen}?${params}`
          : `/inventory/records/${resource}?${params}`;
  const result = useResource<Page<Row> & Row>(path, revision);
  function open(value: ModalState) {
    setError("");
    setSuccess("");
    setModal(value);
  }
  async function save(path: string, method: string, body: unknown) {
    setBusy(true);
    setError("");
    try {
      await api(`/inventory${path}`, { method, body });
      setModal(null);
      setDetail(null);
      setSuccess("Inventory operation completed successfully.");
      setRevision((value) => value + 1);
    } catch (failure) {
      setError(errorMessage(failure));
    } finally {
      setBusy(false);
    }
  }
  async function inspect(row: Row, recordCount = false) {
    setError("");
    try {
      const response = await api<Row>(
        `/inventory/${screen === "traceability" ? `lots/${row.id}/trace` : `${resource}/${row.id}`}`,
      );
      if (recordCount)
        open({
          type: "record-count",
          title: "Record physical count",
          row: response,
        });
      else setDetail({ ...row, ...response });
    } catch (failure) {
      setError(errorMessage(failure));
    }
  }
  const action = (row: Row, verb: string, title: string, target = resource) =>
    open({
      type: "action",
      title,
      row,
      path: `/${target}/${row.id}/${verb}`,
      action: verb,
    });
  const forms = { busy, error, onSave: save, row: modal?.row };
  const rows = result.data?.items ?? [];
  return (
    <>
      <div className="page-header">
        <div>
          <p className="eyebrow">INVENTORY CONTROL</p>
          <h1>{inventoryScreens[screen]}</h1>
          <p>
            Physical stock, explicit holds and traceable movements. Quantities
            are recorded in each item’s unit. On-hand includes owned external
            custody; dispatch availability excludes it.
          </p>
        </div>
      </div>
      <nav className="inventory-tabs" aria-label="Inventory sections">
        {Object.entries(inventoryScreens).map(([key, title]) => (
          <Link
            key={key}
            href={`/inventory/${key}`}
            aria-current={screen === key ? "page" : undefined}
          >
            {title}
          </Link>
        ))}
      </nav>
      {success && (
        <p className="notice success" role="status">
          {success}
        </p>
      )}
      {!modal && error && (
        <p className="notice error" role="alert">
          {error}
        </p>
      )}
      <div className="inventory-toolbar">
        {movementScreen &&
          !["REVERSAL", "COUNT_ADJUSTMENT"].includes(kind) &&
          has(movementPermission(kind || "RECEIPT", "create")) && (
            <button
              disabled={!hydrated}
              className="primary"
              onClick={() =>
                open({
                  type: "movement",
                  title: "Create stock movement",
                  initialKind: kind || "RECEIPT",
                })
              }
            >
              Create draft movement
            </button>
          )}
        {screen === "reservations" && has("inventory.reservations.create") && (
          <button
            disabled={!hydrated}
            className="primary"
            onClick={() =>
              open({
                type: "reservation",
                title: "Create internal reservation",
              })
            }
          >
            Create reservation
          </button>
        )}
        {screen === "counts" && has("inventory.counts.create") && (
          <button
            disabled={!hydrated}
            className="primary"
            onClick={() => open({ type: "count", title: "Create stock count" })}
          >
            Create stock count
          </button>
        )}
        {screen === "warehouses" && has("inventory.locations.manage") && (
          <button
            disabled={!hydrated}
            className="primary"
            onClick={() =>
              open({ type: "warehouse", title: "Create warehouse" })
            }
          >
            Create warehouse
          </button>
        )}
        {screen === "locations" && has("inventory.locations.manage") && (
          <button
            disabled={!hydrated}
            className="primary"
            onClick={() =>
              open({ type: "location", title: "Create storage location" })
            }
          >
            Create location
          </button>
        )}
        {screen === "traceability" && has("inventory.lots.manage") && (
          <>
            <button
              disabled={!hydrated}
              onClick={() =>
                open({ type: "policy", title: "Configure tracking" })
              }
            >
              Configure tracking
            </button>
            <button
              disabled={!hydrated}
              className="primary"
              onClick={() =>
                open({ type: "lot", title: "Register lot / serial" })
              }
            >
              Register lot / serial
            </button>
          </>
        )}
        {screen === "low-stock" && has("inventory.thresholds.manage") && (
          <button
            disabled={!hydrated}
            onClick={() =>
              open({ type: "threshold", title: "Set minimum stock" })
            }
          >
            Set minimum stock
          </button>
        )}
        {screen === "quality" &&
          has("inventory.quality.manage") &&
          has("inventory.transfers.create") && (
            <button
              disabled={!hydrated}
              onClick={() =>
                open({
                  type: "movement",
                  title: "Record stock quality movement",
                  initialKind: "DAMAGE",
                })
              }
            >
              Record damage / inspection
            </button>
          )}
        <button
          onClick={() => setRevision((value) => value + 1)}
          disabled={result.loading}
        >
          Refresh inventory
        </button>
      </div>
      {screen !== "overview" && (
        <form
          className="filter-bar data-panel"
          onSubmit={(event) => {
            event.preventDefault();
            setPage(1);
            setSearch(string(new FormData(event.currentTarget).get("search")));
          }}
        >
          <Input label="Search inventory" name="search" value={search} />
          <button>Search</button>
          <div className="field">
            <label htmlFor="inventory-sort">Sort by</label>
            <select
              id="inventory-sort"
              value={sort}
              onChange={(event) => {
                setSort(event.target.value);
                setPage(1);
              }}
            >
              {(balanceScreen
                ? ["name", "code", "on_hand", "reserved", "available"]
                : ["created_at", "code", "name", "status"]
              ).map((value) => (
                <option key={value}>{value}</option>
              ))}
            </select>
          </div>
          <div className="field">
            <label htmlFor="inventory-direction">Sort direction</label>
            <select
              id="inventory-direction"
              value={direction}
              onChange={(event) => setDirection(event.target.value)}
            >
              <option value="asc">Ascending</option>
              <option value="desc">Descending</option>
            </select>
          </div>
          {movementScreen && (
            <div className="field">
              <label htmlFor="inventory-kind">Movement filter</label>
              <select
                id="inventory-kind"
                value={kind}
                onChange={(event) => {
                  setKind(event.target.value);
                  setPage(1);
                }}
              >
                <option value="">All types</option>
                {[
                  "RECEIPT",
                  "ISSUE",
                  "TRANSFER",
                  "RETURN",
                  "DAMAGE",
                  "QUARANTINE_TRANSFER",
                  "INSPECTION_RELEASE",
                  "ADJUSTMENT_IN",
                  "ADJUSTMENT_OUT",
                  "REVERSAL",
                  "COUNT_ADJUSTMENT",
                ].map((value) => (
                  <option key={value}>{value}</option>
                ))}
              </select>
            </div>
          )}
          {!balanceScreen &&
            !["overview", "warehouses", "locations", "traceability"].includes(
              screen,
            ) && (
              <div className="field">
                <label htmlFor="inventory-status">Status filter</label>
                <input
                  id="inventory-status"
                  value={status}
                  onChange={(event) => {
                    setStatus(event.target.value.toUpperCase());
                    setPage(1);
                  }}
                  placeholder="For example DRAFT or ACTIVE"
                  maxLength={20}
                />
              </div>
            )}
        </form>
      )}
      {(balanceScreen || screen === "overview") && (
        <div className="filter-bar data-panel">
          <Picker
            label="Warehouse filter"
            resource="warehouses"
            value={warehouse}
            onChange={(value) => {
              setWarehouse(value);
              setLocation("");
              setPage(1);
            }}
          />
          <Picker
            label="Location filter"
            resource="locations"
            value={location}
            query={warehouse ? `&warehouse_id=${warehouse}` : ""}
            onChange={(value) => {
              setLocation(value);
              setPage(1);
            }}
          />
        </div>
      )}
      {result.loading && (
        <p role="status" className="notice">
          Loading inventory…
        </p>
      )}
      {result.error && (
        <p className="notice error" role="alert">
          {result.error}
        </p>
      )}
      {screen === "overview" && result.data && (
        <>
          <div className="inventory-metrics">
            {[
              ["Active items", "total_active_items"],
              ["Low-stock items", "low_stock_items"],
              ["Out-of-stock items", "out_of_stock_items"],
              ["Non-usable items", "nonusable_items"],
              ["Draft receipts", "pending_receipts"],
              ["Pending counts", "pending_counts"],
            ].map(([label, key]) => (
              <section className="data-panel" key={key}>
                <span>{label}</span>
                <strong>
                  {result.data?.[key] != null ? (
                    <CountUp value={string(result.data[key])} />
                  ) : (
                    "Unavailable"
                  )}
                </strong>
              </section>
            ))}
          </div>
          <section className="data-panel inventory-detail">
            <h2>Quantities by unit</h2>
            <div className="table-scroll">
              <table>
                <thead>
                  <tr>
                    <th>Unit</th>
                    <th>On Hand</th>
                    <th className="numeric-heading">Reserved</th>
                    <th className="numeric-heading">Available</th>
                    <th className="numeric-heading">Non-usable</th>
                  </tr>
                </thead>
                <tbody>
                  {rowList(result.data.totals_by_unit).map((row) => (
                    <tr key={string(row.unit_id)}>
                      <td>{string(row.unit_name)}</td>
                      <td className="numeric">{string(row.on_hand)}</td>
                      <td className="numeric">{string(row.reserved)}</td>
                      <td className="numeric">{string(row.available)}</td>
                      <td className="numeric">{string(row.nonusable)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="field-hint">
              Confirmed purchase obligations and recorded external work are
              shown separately below. They do not add dispatch availability;
              receiving or custody transfer must be posted first.
            </p>
          </section>
          <section className="data-panel inventory-detail">
            <h2>Expected incoming by unit</h2>
            {rowList(result.data.incoming).map((row, index) => (
              <p key={index}>
                {string(row.quantity)} {string(row.unit_name)}
              </p>
            ))}
            {rowList(result.data.incoming).length === 0 && (
              <p>
                No confirmed incoming quantities in this scope. A location
                filter excludes obligations whose receiving bin is not yet
                known.
              </p>
            )}
            <h2>External work by ownership and unit</h2>
            {rowList(result.data.in_production).map((row, index) => (
              <p key={index}>
                {string(row.quantity)} {string(row.unit_name)} ·{" "}
                {string(row.ownership)} owned
              </p>
            ))}
            <p className="field-hint">
              Incoming and external production can reference the same goods. Do
              not add these figures together.
            </p>
          </section>
          {has("inventory.costs.read") && (
            <section className="data-panel inventory-detail">
              <h2>Indicative operational valuation</h2>
              <p>
                Known-cost stock only, separated by currency. Incomplete cost
                buckets: {string(result.data.incomplete_cost_buckets)}
              </p>
              {rowList(result.data.valuation).map((row) => (
                <p key={string(row.currency)}>
                  {string(row.currency)} {string(row.value)}
                </p>
              ))}
            </section>
          )}
          <section className="data-panel inventory-detail">
            <h2>Recent movements</h2>
            {rowList(result.data.recent_movements).map((row) => (
              <p key={row.id}>
                {row.code} · {row.kind} · <StatusBadge status={row.status} />
              </p>
            ))}
            {rowList(result.data.recent_movements).length === 0 && (
              <p>No stock movements have been recorded.</p>
            )}
          </section>
        </>
      )}
      {screen !== "overview" && (
        <section className="data-panel inventory-table">
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>{balanceScreen ? "Item / unit" : "Reference / name"}</th>
                  {balanceScreen ? (
                    <>
                      <th>On Hand</th>
                      <th className="numeric-heading">Reserved</th>
                      <th className="numeric-heading">Available</th>
                      <th className="numeric-heading">Non-usable</th>
                    </>
                  ) : (
                    <>
                      <th>Type / status</th>
                      <th>Quantity / details</th>
                    </>
                  )}
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {!result.loading && !result.error && rows.length === 0 && (
                  <tr>
                    <td colSpan={balanceScreen ? 6 : 4}>
                      No inventory records match this view.
                    </td>
                  </tr>
                )}
                {rows.map((row) => (
                  <tr key={row.id}>
                    <td>
                      <strong>{row.name ?? row.code}</strong>
                      <span className="table-subtext master-code">
                        {row.code ?? row.id}
                      </span>
                      {row.unit_name != null && (
                        <span className="table-subtext">
                          Unit: {string(row.unit_name)}
                        </span>
                      )}
                    </td>
                    {balanceScreen ? (
                      <>
                        <td className="numeric">{string(row.on_hand)}</td>
                        <td className="numeric">{string(row.reserved)}</td>
                        <td>
                          {string(row.available)}
                          <span className="table-subtext">
                            <StatusBadge status={row.status} />
                            {row.low_stock ? " · Low stock" : ""}
                          </span>
                        </td>
                        <td className="numeric">{string(row.nonusable)}</td>
                      </>
                    ) : (
                      <>
                        <td>
                          {row.kind ?? ""}
                          <span className="table-subtext">
                            <StatusBadge
                              status={
                                row.status ??
                                (row.is_active === false
                                  ? "Inactive"
                                  : "Active")
                              }
                            />
                          </span>
                        </td>
                        <td>
                          {row.quantity != null
                            ? `${row.quantity} ${string(row.unit_name)}`
                            : row.created_at
                              ? utcTime(string(row.created_at))
                              : "—"}
                          {row.minimum != null && (
                            <span>Minimum: {string(row.minimum)}</span>
                          )}
                        </td>
                      </>
                    )}
                    <td>
                      <div className="row-actions">
                        {balanceScreen ? (
                          <button onClick={() => setDetail(row)}>
                            View stock detail
                          </button>
                        ) : ["warehouses", "locations"].includes(screen) ? (
                          <>
                            <button onClick={() => setDetail(row)}>
                              View details
                            </button>
                            {row.kind === "EXTERNAL" &&
                              has("production.read") && (
                                <Link
                                  className="button-link"
                                  href={`/purchasing/custody-locations/${row.id}`}
                                >
                                  Manage external custody
                                </Link>
                              )}
                            {has("inventory.locations.manage") &&
                              row.kind !== "EXTERNAL" && (
                                <button
                                  onClick={() =>
                                    open({
                                      type:
                                        screen === "warehouses"
                                          ? "warehouse"
                                          : "location",
                                      title: "Edit inventory location",
                                      row,
                                    })
                                  }
                                >
                                  Edit
                                </button>
                              )}
                          </>
                        ) : (
                          <button onClick={() => inspect(row)}>
                            View details
                          </button>
                        )}
                        {movementScreen && row.status === "DRAFT" && (
                          <>
                            {has(
                              movementPermission(string(row.kind), "create"),
                            ) && (
                              <button
                                onClick={async () => {
                                  try {
                                    const data = await api<Row>(
                                      `/inventory/movements/${row.id}`,
                                    );
                                    open({
                                      type: "movement",
                                      title: "Edit draft movement",
                                      row: data,
                                      initialKind: string(row.kind),
                                    });
                                  } catch (failure) {
                                    setError(errorMessage(failure));
                                  }
                                }}
                              >
                                Edit draft
                              </button>
                            )}
                            {has(
                              movementPermission(string(row.kind), "post"),
                            ) && (
                              <button
                                onClick={() =>
                                  action(row, "post", "Post movement")
                                }
                              >
                                Post movement
                              </button>
                            )}
                            {has(
                              movementPermission(string(row.kind), "create"),
                            ) && (
                              <button
                                onClick={() =>
                                  action(row, "cancel", "Cancel draft")
                                }
                              >
                                Cancel draft
                              </button>
                            )}
                          </>
                        )}
                        {movementScreen &&
                          row.status === "POSTED" &&
                          row.kind !== "REVERSAL" &&
                          has("inventory.movements.reverse") && (
                            <button
                              onClick={() =>
                                action(row, "reverse", "Reverse movement")
                              }
                            >
                              Reverse
                            </button>
                          )}
                        {screen === "reservations" &&
                          row.status === "ACTIVE" && (
                            <>
                              {has("inventory.reservations.release") && (
                                <button
                                  onClick={() =>
                                    action(
                                      row,
                                      "release",
                                      "Release reservation",
                                    )
                                  }
                                >
                                  Release reservation
                                </button>
                              )}
                              {has("inventory.reservations.consume") &&
                                has("inventory.issues.post") && (
                                  <button
                                    onClick={() =>
                                      action(
                                        row,
                                        "consume",
                                        "Consume reserved stock",
                                      )
                                    }
                                  >
                                    Consume stock
                                  </button>
                                )}
                            </>
                          )}
                        {screen === "counts" &&
                          !["POSTED", "CANCELLED"].includes(
                            row.status ?? "",
                          ) && (
                            <>
                              {has("inventory.counts.create") && (
                                <>
                                  <button onClick={() => inspect(row, true)}>
                                    Record counts
                                  </button>
                                  <button
                                    onClick={() =>
                                      action(
                                        row,
                                        "recount",
                                        "Start a fresh recount",
                                      )
                                    }
                                  >
                                    Recount
                                  </button>
                                  <button
                                    onClick={() =>
                                      action(row, "cancel", "Cancel count")
                                    }
                                  >
                                    Cancel count
                                  </button>
                                </>
                              )}
                              {row.status === "REVIEW" &&
                                has("inventory.counts.post") &&
                                has("inventory.adjustments.post") && (
                                  <button
                                    onClick={() =>
                                      action(
                                        row,
                                        "post",
                                        "Post count adjustment",
                                      )
                                    }
                                  >
                                    Post count
                                  </button>
                                )}
                            </>
                          )}
                        {screen === "traceability" &&
                          has("inventory.quality.manage") &&
                          has("inventory.lots.manage") && (
                            <button
                              onClick={() =>
                                open({
                                  type: "lot-status",
                                  title: "Change lot quality status",
                                  row,
                                })
                              }
                            >
                              Change status
                            </button>
                          )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination
            page={page}
            total={result.data?.total ?? 0}
            onChange={setPage}
            loading={result.loading}
          />
        </section>
      )}
      {screen === "low-stock" && <ThresholdList revision={revision} />}
      {detail && (
        <Modal title="Inventory record details" onClose={() => setDetail(null)}>
          <InventoryDetails
            data={detail}
            hasCosts={has("inventory.costs.read")}
          />
        </Modal>
      )}
      {modal && (
        <Modal title={modal.title} busy={busy} onClose={() => setModal(null)}>
          {modal.type === "movement" && (
            <MovementForm
              {...forms}
              initialKind={modal.initialKind ?? "RECEIPT"}
            />
          )}
          {modal.type === "reservation" && <ReservationForm {...forms} />}
          {modal.type === "count" && <CountForm {...forms} />}
          {modal.type === "record-count" && <CountRecordForm {...forms} />}
          {["warehouse", "location", "lot", "threshold", "policy"].includes(
            modal.type,
          ) && (
            <ReferenceForm
              {...forms}
              type={
                modal.type as
                  | "warehouse"
                  | "location"
                  | "lot"
                  | "threshold"
                  | "policy"
              }
            />
          )}
          {modal.type === "action" && (
            <ActionForm
              {...forms}
              path={modal.path!}
              action={modal.action!}
              title={modal.title}
            />
          )}
          {modal.type === "lot-status" && <LotStatusForm {...forms} />}
        </Modal>
      )}
    </>
  );
}

function ThresholdList({ revision }: { revision: number }) {
  const [page, setPage] = useState(1);
  const result = useResource<Page<Row>>(
    `/inventory/records/thresholds?page=${page}`,
    revision,
  );
  return (
    <section className="data-panel inventory-detail">
      <h2>Configured minimum levels</h2>
      {result.loading && <p role="status">Loading thresholds…</p>}
      {result.error && <p role="alert">{result.error}</p>}
      {result.data?.items.map((row) => (
        <p key={row.id}>
          {row.name} · Minimum {string(row.minimum)} {string(row.unit_name)} ·
          Available {string(row.available)} {row.low_stock ? "— Low stock" : ""}
        </p>
      ))}
      {result.data?.total === 0 && <p>No minimum levels configured.</p>}
      <Pagination
        page={page}
        total={result.data?.total ?? 0}
        onChange={setPage}
        loading={result.loading}
      />
    </section>
  );
}

function LotStatusForm({ busy, error, onSave, row }: FormProps) {
  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        const data = new FormData(event.currentTarget);
        onSave(`/lots/${row!.id}/status`, "PUT", {
          status: data.get("status"),
          reason: data.get("reason"),
        });
      }}
    >
      <fieldset disabled={busy}>
        <div className="field">
          <label htmlFor="lot-status">Lot / serial quality status</label>
          <select id="lot-status" name="status" defaultValue={row?.status}>
            <option>ACTIVE</option>
            <option>BLOCKED</option>
          </select>
        </div>
        <Input
          label="Inspection reason"
          name="reason"
          required
          minLength={10}
        />
        <FormFooter busy={busy} error={error} label="Confirm status change" />
      </fieldset>
    </form>
  );
}

function InventoryDetails({
  data,
  hasCosts,
}: {
  data: Row;
  hasCosts: boolean;
}) {
  const lines = rowList(data.lines);
  return (
    <div className="inventory-detail">
      <dl>
        {[
          "code",
          "name",
          "kind",
          "status",
          "reason",
          "source_reference",
          "quantity",
          "external_on_hand",
          "unit_name",
          "location_name",
          "address",
          "description",
          "created_at",
          "created_by",
          "posted_by",
          "posted_at",
        ]
          .filter((key) => data[key] != null)
          .map((key) => (
            <div key={key}>
              <dt>{key.replaceAll("_", " ")}</dt>
              <dd>{string(data[key])}</dd>
            </div>
          ))}
      </dl>
      {lines.length > 0 && (
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Item / unit</th>
                <th>Quantity / physical count</th>
                <th>Location / variance</th>
                {hasCosts && <th>Recorded unit cost</th>}
              </tr>
            </thead>
            <tbody>
              {lines.map((line) => (
                <tr key={line.id}>
                  <td>
                    {string(line.item_name)}
                    <span className="table-subtext">
                      {string(line.unit_name)} {string(line.lot_identifier)}
                    </span>
                  </td>
                  <td>
                    {line.quantity != null
                      ? string(line.quantity)
                      : `Expected ${line.expected_quantity} / Counted ${line.counted_quantity ?? "pending"}`}
                  </td>
                  <td>
                    {line.source_name != null || line.destination_name != null
                      ? `${line.source_name ?? "External"} → ${line.destination_name ?? "External"}`
                      : `Variance ${line.variance ?? "pending"}`}
                  </td>
                  {hasCosts && (
                    <td>
                      {line.unit_cost == null
                        ? "Unknown / not applicable"
                        : `${line.unit_cost} ${string(line.currency)}`}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {rowList(data.buckets).map((row) => (
        <section className="inventory-line" key={row.id}>
          <h3>
            {string(row.warehouse_name)} / {string(row.location_name)}
          </h3>
          <p>
            {string(row.kind)} {string(row.lot_identifier)}{" "}
            {string(row.lot_status)}
          </p>
          <p>
            On Hand {string(row.on_hand)} · Reserved {string(row.reserved)} ·
            Available {string(row.available)}
          </p>
          {hasCosts && (
            <p>
              Indicative value:{" "}
              {row.stock_value == null
                ? "Incomplete cost"
                : `${row.stock_value} ${row.currency ?? ""}`}
            </p>
          )}
        </section>
      ))}
      {data.lot != null && (
        <>
          <h3>Lot / serial</h3>
          <p>
            {string((data.lot as Row).identifier)} ·{" "}
            {string((data.lot as Row).status)}
          </p>
          {rowList(data.stock).map((row) => (
            <InventoryDetails key={row.id} data={row} hasCosts={hasCosts} />
          ))}
          <h3>Traceability history</h3>
          {rowList(data.movements).map((row) => (
            <section key={row.id}>
              <p>
                {row.code} · {row.kind} · <StatusBadge status={row.status} />
              </p>
              <InventoryDetails data={row} hasCosts={hasCosts} />
            </section>
          ))}
        </>
      )}
    </div>
  );
}
