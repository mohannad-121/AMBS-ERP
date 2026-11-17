"use client";
import { useId, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { StatusBadge } from "./status-badge";
import { CountUp } from "./count-up";
import { api, errorMessage } from "@/lib/api";
import { useResource } from "@/lib/use-resource";
import { useUser } from "./app-shell";
import { Modal, Pagination, utcTime } from "./forms";
import {
  purchasingScreens,
  screenResource,
  readPermission,
  createPermission,
  singular,
  type PurchaseRow as Row,
  type PurchaseScreen,
} from "@/lib/purchasing";
import type { Page } from "@/lib/types";
const text = (v: unknown) => (v == null ? "" : String(v));
const rows = (v: unknown): Row[] => (Array.isArray(v) ? (v as Row[]) : []);
const subscribed = () => () => {};
const today = () =>
  new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Dubai",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
type FieldDef = {
  key: string;
  label: string;
  type?: string;
  resource?: string;
  options?: string[];
  optionLabels?: Record<string, string>;
  required?: boolean;
  initial?: unknown;
};
function Field({
  field,
  value,
  onChange,
}: {
  field: FieldDef;
  value: unknown;
  onChange: (v: unknown, row?: Row) => void;
}) {
  const id = useId();
  const [search, setSearch] = useState("");
  const result = useResource<Page<Row>>(
    field.resource
      ? `/purchasing/options/${field.resource}?search=${encodeURIComponent(search)}&page_size=100`
      : null,
  );
  if (field.type === "checkbox")
    return (
      <label className="inventory-check">
        <input
          type="checkbox"
          checked={!!value}
          onChange={(e) => onChange(e.target.checked)}
        />
        {field.label}
      </label>
    );
  if (field.type === "multi")
    return (
      <fieldset className="inventory-line">
        <legend>{field.label}</legend>
        {field.options?.map((option) => (
          <label className="inventory-check" key={option}>
            <input
              type="checkbox"
              checked={Array.isArray(value) && value.includes(option)}
              onChange={(e) =>
                onChange(
                  e.target.checked
                    ? [...(Array.isArray(value) ? value : []), option]
                    : (Array.isArray(value) ? value : []).filter(
                        (v) => v !== option,
                      ),
                )
              }
            />
            {option.replaceAll("_", " ")}
          </label>
        ))}
      </fieldset>
    );
  const options = result.data?.items ?? [];
  return (
    <div className="field">
      <label htmlFor={id}>
        {field.label}
        {field.required ? " *" : ""}
      </label>
      {field.resource && (
        <input
          aria-label={`Search ${field.label}`}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search references"
        />
      )}
      {field.resource || field.options ? (
        <select
          id={id}
          required={field.required}
          value={text(value)}
          onChange={(e) =>
            onChange(
              e.target.value,
              options.find((r) => r.id === e.target.value),
            )
          }
        >
          <option value="">Select / unknown</option>
          {field.resource &&
            !!value &&
            !options.some((r) => r.id === value) && (
              <option value={text(value)}>
                Selected reference {text(value)}
              </option>
            )}
          {field.options?.map((v) => (
            <option key={v} value={v}>
              {field.optionLabels?.[v] ?? v.replaceAll("_", " ")}
            </option>
          ))}
          {options.map((r) => (
            <option key={r.id} value={r.id}>
              {r.name}
            </option>
          ))}
        </select>
      ) : field.type === "textarea" ? (
        <textarea
          id={id}
          required={field.required}
          maxLength={2000}
          value={text(value)}
          onChange={(e) => onChange(e.target.value)}
        />
      ) : (
        <input
          id={id}
          required={field.required}
          type={field.type ?? "text"}
          value={text(value)}
          step={field.type === "number" ? "0.000000000001" : undefined}
          min={
            field.type === "number" && field.key !== "amount" ? "0" : undefined
          }
          maxLength={
            field.key === "currency"
              ? 3
              : field.key === "reason"
                ? 1000
                : field.key === "name"
                  ? 200
                  : 1000
          }
          onChange={(e) =>
            onChange(
              field.key === "currency"
                ? e.target.value.toUpperCase()
                : e.target.value,
            )
          }
        />
      )}
      {result.loading && (
        <span className="field-hint" role="status">
          Loading references…
        </span>
      )}
      {result.error && (
        <p className="notice error" role="alert">
          {result.error}
        </p>
      )}
      {(result.data?.total ?? 0) > 100 && (
        <p className="field-hint">Refine the search to find more references.</p>
      )}
    </div>
  );
}
const f = (
  key: string,
  label: string,
  extra: Partial<FieldDef> = {},
): FieldDef => ({ key, label, ...extra });
const required = { required: true };
const supplier = f("supplier_id", "Supplier", {
  resource: "suppliers",
  ...required,
});
const warehouse = f("warehouse_id", "Receiving warehouse", {
  resource: "warehouses",
  ...required,
});
const reason = f("reason", "Business reason", {
  type: "textarea",
  ...required,
});
const notes = f("notes", "Notes (optional)", { type: "textarea" });
const currency = f("currency", "Currency", { initial: "", ...required });
const commercialFields: Record<string, FieldDef[]> = {
  suppliers: [
    f("name", "Official supplier name", required),
    f("types", "Supplier types", {
      type: "multi",
      options: [
        "RAW_MATERIAL",
        "FABRICATION",
        "POWDER_COATING",
        "GALVANIZING",
        "FINISHED_COMPONENT",
        "MULTI_SERVICE",
      ],
    }),
    f("address", "Address"),
    f("country", "Country"),
    f("phone", "Phone"),
    f("email", "Email", { type: "email" }),
    f("tax_registration", "Tax registration"),
    f("payment_terms", "Payment terms"),
    notes,
    f("is_active", "Active", { type: "checkbox", initial: true }),
    f(
      "duplicate_confirmed",
      "I reviewed matching names and confirm a distinct supplier",
      { type: "checkbox" },
    ),
  ],
  contacts: [
    supplier,
    f("name", "Contact name", required),
    f("position", "Position"),
    f("phone", "Phone"),
    f("email", "Email", { type: "email" }),
    f("is_main", "Main contact", { type: "checkbox" }),
    f("is_active", "Active", { type: "checkbox", initial: true }),
  ],
  catalog: [
    supplier,
    f("item_id", "Material item", { resource: "items", ...required }),
    f("unit_id", "Purchase unit", { resource: "units", ...required }),
    f("supplier_reference", "Supplier item reference"),
    f("description", "Supplier description"),
    f("minimum_quantity", "Minimum order quantity (verified)", {
      type: "number",
    }),
    f("lead_days", "Verified lead time in days", { type: "number" }),
    f("reported_available", "Supplier-reported availability", {
      type: "number",
    }),
    f("verified_on", "Availability verified on", { type: "date" }),
    f("is_active", "Active", { type: "checkbox", initial: true }),
    notes,
  ],
  quotations: [
    supplier,
    f("reference", "Supplier quotation reference", required),
    f("quoted_on", "Quotation date", {
      type: "date",
      initial: today(),
      ...required,
    }),
    f("valid_until", "Valid until (if confirmed)", { type: "date" }),
    currency,
    f("freight", "Known freight charge", { type: "number" }),
    f("taxes", "Known tax amount (metadata only)", { type: "number" }),
    f("fees", "Known other charges", { type: "number" }),
    f("lead_days", "Quoted lead time in days", { type: "number" }),
    f("supersedes_id", "Previous quotation (new price version)", {
      resource: "quotations",
    }),
    notes,
  ],
  requests: [
    f("requested_on", "Request date", {
      type: "date",
      initial: today(),
      ...required,
    }),
    f("required_on", "Required date (if known)", { type: "date" }),
    f("priority", "Priority", {
      options: ["LOW", "NORMAL", "HIGH", "URGENT"],
      initial: "NORMAL",
      ...required,
    }),
    reason,
    f("quotation_id", "Related quotation (optional)", {
      resource: "quotations",
    }),
    notes,
  ],
  orders: [
    supplier,
    f("quotation_id", "Related quotation (optional)", {
      resource: "quotations",
    }),
    f("request_id", "Submitted purchase request (conversion)", {
      resource: "requests",
    }),
    warehouse,
    f("ordered_on", "Order date", {
      type: "date",
      initial: today(),
      ...required,
    }),
    f("expected_on", "Agreed expected delivery date (optional)", {
      type: "date",
    }),
    currency,
    f("freight", "Known freight charge", { type: "number" }),
    f("taxes", "Known tax amount (metadata only)", { type: "number" }),
    f("fees", "Known other charges", { type: "number" }),
    notes,
  ],
  receipts: [
    f("order_id", "Purchase order", { resource: "orders", ...required }),
    f("received_at", "Actual receipt time (UTC)", {
      type: "datetime-local",
      initial: new Date().toISOString().slice(0, 16),
      ...required,
    }),
    reason,
    f("source_reference", "Supplier delivery / source reference"),
    notes,
  ],
  production: [
    f("item_id", "Output item", { resource: "items", ...required }),
    f("quantity", "Planned production quantity", {
      type: "number",
      ...required,
    }),
    f("ownership", "Material ownership", {
      options: ["AMBS", "SUPPLIER"],
      ...required,
    }),
    f("instructions", "Production instructions", {
      type: "textarea",
      ...required,
    }),
    f("planned_start", "Planned start (if known)", { type: "date" }),
    f("expected_finish", "Agreed expected finish (if known)", { type: "date" }),
    notes,
  ],
  "custody-locations": [
    f("name", "Verified custody location name", required),
    supplier,
    warehouse,
    f("is_active", "Active", { type: "checkbox", initial: true }),
  ],
  schedules: [
    f("order_id", "Purchase order", { resource: "orders" }),
    f("requested_on", "Requested delivery date", { type: "date" }),
    f("confirmed_on", "Supplier-confirmed date", { type: "date" }),
    f("eta", "Current supplier-reported ETA", { type: "date" }),
    reason,
    f("evidence", "Supplier evidence / update reference", required),
  ],
  costs: [
    supplier,
    f("amount", "Processing charge or correction", {
      type: "number",
      ...required,
    }),
    currency,
    f("reference", "Cost reference", required),
    reason,
  ],
  conversions: [
    f("approved_reference", "Approved measured conversion reference", required),
    reason,
  ],
  comparison: [
    f("item_id", "Compare item", { resource: "items", ...required }),
    f("unit_id", "Comparison unit", { resource: "units", ...required }),
    currency,
    f("quantity", "Requested comparison quantity", {
      type: "number",
      ...required,
    }),
  ],
};
type Values = Record<string, unknown>;
type EditLine = {
  key: string;
  line_type: string;
  item_id: string;
  unit_id: string;
  description: string;
  quantity: string;
  unit_price: string;
  source_id: string;
  destination_id: string;
  lot_id: string;
  order_line_id: string;
  location_id: string;
};
const blankLine = (): EditLine => ({
  key: crypto.randomUUID(),
  line_type: "STOCK",
  item_id: "",
  unit_id: "",
  description: "",
  quantity: "",
  unit_price: "",
  source_id: "",
  destination_id: "",
  lot_id: "",
  order_line_id: "",
  location_id: "",
});
const fieldValues = (fields: FieldDef[], row?: Row): Values =>
  Object.fromEntries(
    fields.map((field) => [
      field.key,
      row?.[field.key] ??
        field.initial ??
        (field.type === "multi" ? [] : field.type === "checkbox" ? false : ""),
    ]),
  );
type FormProps = {
  resource: string;
  initial?: Row;
  mode?: string;
  busy: boolean;
  error: string;
  onSave: (path: string, method: string, body: unknown) => void;
};
function BusinessForm({
  resource,
  initial,
  mode,
  busy,
  error,
  onSave,
}: FormProps) {
  const definitions = commercialFields[resource] ?? [];
  const [values, setValues] = useState<Values>(() =>
    fieldValues(definitions, initial),
  );
  const [requestKey] = useState(() => crypto.randomUUID());
  const [lines, setLines] = useState<EditLine[]>(() =>
    rows(initial?.lines).length
      ? rows(initial?.lines)
          .filter(
            (row) =>
              mode !== "amend" || !/^0(?:\.0+)?$/.test(text(row.outstanding)),
          )
          .map(
            (row) =>
              ({
                ...blankLine(),
                ...Object.fromEntries(
                  Object.keys(blankLine())
                    .filter((k) => k !== "key")
                    .map((k) => [k, text(row[k])]),
                ),
                quantity: text(
                  mode === "amend" ? row.outstanding : row.quantity,
                ),
              }) as EditLine,
          )
      : [blankLine()],
  );
  const [outputs, setOutputs] = useState<EditLine[]>([blankLine()]);
  const [stages, setStages] = useState<Values[]>(() =>
    rows(initial?.stages).length
      ? rows(initial?.stages).map((s) => ({
          name: s.name,
          supplier_id: s.supplier_id,
          location_id: s.location_id,
          expected_on: s.expected_on,
        }))
      : [{ name: "", supplier_id: "", location_id: "", expected_on: "" }],
  );
  const [purchaseId, setPurchaseId] = useState(
    text(initial?.purchase_order_id),
  );
  const [purchaseLine, setPurchaseLine] = useState(
    text(initial?.purchase_order_line_id),
  );
  const [attachments, setAttachments] = useState<Values[]>(() =>
    rows(initial?.attachments).map((a) => ({
      name: a.name,
      reference: a.reference,
      sha256: a.sha256,
    })),
  );
  const order = useResource<Row>(
    resource === "receipts" && values.order_id
      ? `/purchasing/orders/${values.order_id}`
      : resource === "production" && purchaseId
        ? `/purchasing/orders/${purchaseId}`
        : null,
  );
  const scheduleStage = text(initial?.stage_id);
  const [amendReason, setAmendReason] = useState("");
  const change = (key: string, value: unknown) =>
    setValues((v) => ({ ...v, [key]: value }));
  function submit(event: React.SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    const body: Values = {};
    for (const field of definitions) {
      const value = values[field.key];
      body[field.key] =
        value === "" || value == null
          ? null
          : field.key === "lead_days"
            ? Number(value)
            : value;
    }
    if (
      resource === "suppliers" &&
      (!Array.isArray(body.types) || !body.types.length)
    ) {
      onSave("", "VALIDATION", "Select at least one supplier type.");
      return;
    }
    if (
      ["quotations", "requests", "orders", "receipts", "production"].includes(
        resource,
      )
    )
      Object.assign(body, {
        request_key: requestKey,
        version: mode === "edit" ? initial?.version : undefined,
      });
    if (["quotations", "requests", "orders"].includes(resource))
      body.lines = lines.map((l) => ({
        line_type: l.line_type,
        item_id: l.line_type === "STOCK" ? l.item_id : null,
        unit_id: l.unit_id,
        description: l.description,
        quantity: l.quantity,
        unit_price: l.unit_price || null,
      }));
    if (resource === "receipts") {
      body.received_at = new Date(`${body.received_at}Z`).toISOString();
      body.lines = lines.map((l) => ({
        order_line_id: l.order_line_id,
        quantity: l.quantity,
        location_id: l.location_id || null,
        lot_id: l.lot_id || null,
      }));
    }
    if (resource === "production") {
      body.purchase_order_line_id = purchaseLine || null;
      body.stages = stages.map((s) => ({
        name: s.name,
        supplier_id: s.supplier_id,
        location_id: body.ownership === "AMBS" ? s.location_id || null : null,
        expected_on: s.expected_on || null,
      }));
    }
    if (["quotations", "production"].includes(resource))
      body.attachments = attachments.map((a) => ({
        name: a.name,
        reference: a.reference,
        sha256: a.sha256 || null,
      }));
    if (resource === "schedules" && scheduleStage) {
      body.order_id = null;
      body.stage_id = scheduleStage;
    }
    if (resource === "costs") body.request_key = requestKey;
    if (resource === "conversions") {
      body.request_key = requestKey;
      body.inputs = lines.map((l) => ({
        item_id: l.item_id,
        unit_id: l.unit_id,
        quantity: l.quantity,
        source_id: l.source_id,
        lot_id: l.lot_id || null,
      }));
      body.outputs = outputs.map((l) => ({
        item_id: l.item_id,
        unit_id: l.unit_id,
        quantity: l.quantity,
        destination_id: l.destination_id,
        lot_id: l.lot_id || null,
      }));
    }
    const path =
      resource === "costs"
        ? `/production/${initial?.order_id}/costs`
        : resource === "comparison"
          ? "/compare"
          : mode === "amend"
            ? `/orders/${initial?.id}/amend`
            : `/${resource}${mode === "edit" ? `/${initial?.id}` : ""}`;
    onSave(
      path,
      mode === "edit" || resource === "catalog" ? "PUT" : "POST",
      mode === "amend" ? { reason: amendReason, replacement: body } : body,
    );
  }
  function lineEditor(
    entries: EditLine[],
    set: (v: EditLine[]) => void,
    label: string,
    conversion = false,
    output = false,
  ) {
    const update = (index: number, key: string, value: unknown, row?: Row) =>
      set(
        entries.map((line, i) =>
          i === index
            ? {
                ...line,
                [key]: text(value),
                ...(key === "item_id"
                  ? {
                      unit_id: text(row?.unit_id),
                      description: text(row?.name),
                    }
                  : {}),
              }
            : line,
        ),
      );
    return (
      <section>
        <h3>{label}</h3>
        {entries.map((line, index) => (
          <section
            className="inventory-line"
            key={line.key}
            aria-label={`${label} ${index + 1}`}
          >
            <h3>
              {label} {index + 1}
            </h3>
            <div className="form-grid">
              {resource === "receipts" ? (
                <Field
                  field={f("order_line_id", `Purchase line ${index + 1}`, {
                    options: rows(order.data?.lines).map((r) => r.id),
                    optionLabels: Object.fromEntries(
                      rows(order.data?.lines).map((r) => [
                        r.id,
                        `${text(r.description)} · Outstanding ${text(r.outstanding)} ${text(r.unit_name)}`,
                      ]),
                    ),
                    ...required,
                  })}
                  value={line.order_line_id}
                  onChange={(v) => update(index, "order_line_id", v)}
                />
              ) : (
                <>
                  {!conversion && (
                    <Field
                      field={f("line_type", `Line type ${index + 1}`, {
                        options: ["STOCK", "SERVICE"],
                        ...required,
                      })}
                      value={line.line_type}
                      onChange={(v) => update(index, "line_type", v)}
                    />
                  )}
                  {(conversion || line.line_type === "STOCK") && (
                    <Field
                      field={f("item_id", `${label} item ${index + 1}`, {
                        resource: "items",
                        ...required,
                      })}
                      value={line.item_id}
                      onChange={(v, r) => update(index, "item_id", v, r)}
                    />
                  )}
                  <Field
                    field={f("unit_id", `${label} unit ${index + 1}`, {
                      resource: "units",
                      ...required,
                    })}
                    value={line.unit_id}
                    onChange={(v) => update(index, "unit_id", v)}
                  />
                  {!conversion && (
                    <Field
                      field={f(
                        "description",
                        `Line description ${index + 1}`,
                        required,
                      )}
                      value={line.description}
                      onChange={(v) => update(index, "description", v)}
                    />
                  )}
                </>
              )}
              <Field
                field={f("quantity", `${label} quantity ${index + 1}`, {
                  type: "number",
                  ...required,
                })}
                value={line.quantity}
                onChange={(v) => update(index, "quantity", v)}
              />
              {!conversion && resource !== "receipts" && (
                <Field
                  field={f("unit_price", `Unit price ${index + 1} (if known)`, {
                    type: "number",
                  })}
                  value={line.unit_price}
                  onChange={(v) => update(index, "unit_price", v)}
                />
              )}
              {(conversion || resource === "receipts") && (
                <>
                  <Field
                    field={f(
                      output
                        ? "destination_id"
                        : conversion
                          ? "source_id"
                          : "location_id",
                      `${output ? "Output" : conversion ? "Input" : "Receiving"} location ${index + 1}`,
                      { resource: "locations", required: conversion },
                    )}
                    value={
                      output
                        ? line.destination_id
                        : conversion
                          ? line.source_id
                          : line.location_id
                    }
                    onChange={(v) =>
                      update(
                        index,
                        output
                          ? "destination_id"
                          : conversion
                            ? "source_id"
                            : "location_id",
                        v,
                      )
                    }
                  />
                  <Field
                    field={f("lot_id", `${label} lot / serial ${index + 1}`, {
                      resource: "lots",
                    })}
                    value={line.lot_id}
                    onChange={(v) => update(index, "lot_id", v)}
                  />
                </>
              )}
            </div>
            {resource === "receipts" && (
              <div className="field-hint">
                {rows(order.data?.lines).map((r) => (
                  <p key={r.id}>
                    {r.id}: {text(r.description)} · {text(r.unit_name)} ·
                    Outstanding {text(r.outstanding)} · {text(r.line_type)}.
                    Service acceptance has no stock location or lot.
                  </p>
                ))}
              </div>
            )}
            <button
              type="button"
              disabled={entries.length === 1}
              onClick={() => set(entries.filter((_, i) => i !== index))}
            >
              Remove {label.toLowerCase()} {index + 1}
            </button>
          </section>
        ))}
        <button
          type="button"
          disabled={entries.length >= (conversion ? 15 : 30)}
          onClick={() => set([...entries, blankLine()])}
        >
          Add {label.toLowerCase()}
        </button>
      </section>
    );
  }
  return (
    <form className="inventory-form" onSubmit={submit}>
      <fieldset disabled={busy}>
        <p className="field-hint">
          Record verified facts. Unknown dates and charges stay blank. Stock
          changes require an explicit posting action. Service lines create no
          stock.
        </p>
        <div className="form-grid">
          {definitions
            .filter(
              (field) =>
                !(
                  resource === "schedules" &&
                  scheduleStage &&
                  field.key === "order_id"
                ),
            )
            .map((field) => (
              <Field
                key={field.key}
                field={field}
                value={values[field.key]}
                onChange={(v) => change(field.key, v)}
              />
            ))}
        </div>
        {["quotations", "requests", "orders", "receipts"].includes(resource) &&
          lineEditor(
            lines,
            setLines,
            resource === "receipts" ? "Received" : "Purchase",
          )}
        {resource === "production" && (
          <>
            <h3>Source purchase obligation</h3>
            <Field
              field={f("purchase_order", "Related purchase order", {
                resource: "orders",
                required: values.ownership === "SUPPLIER",
              })}
              value={purchaseId}
              onChange={(v) => {
                setPurchaseId(text(v));
                setPurchaseLine("");
              }}
            />
            <div className="field">
              <label htmlFor="production-purchase-line">
                Purchase output line{" "}
                {values.ownership === "SUPPLIER" ? "*" : ""}
              </label>
              <select
                id="production-purchase-line"
                value={purchaseLine}
                required={values.ownership === "SUPPLIER"}
                onChange={(e) => setPurchaseLine(e.target.value)}
              >
                <option value="">None / select a line</option>
                {rows(order.data?.lines)
                  .filter((r) => r.line_type === "STOCK")
                  .map((r) => (
                    <option key={r.id} value={r.id}>
                      {text(r.description)} · {text(r.quantity)}{" "}
                      {text(r.unit_name)}
                    </option>
                  ))}
              </select>
            </div>
            <h3>Recorded production route</h3>
            <p>
              Only the stages entered here apply. Do not add coating or
              galvanizing unless the approved route requires it.
            </p>
            {stages.map((stage, index) => (
              <section className="inventory-line" key={index}>
                <h3>Stage {index + 1}</h3>
                <div className="form-grid">
                  {[
                    f("name", `Stage name ${index + 1}`, required),
                    { ...supplier, label: `Stage supplier ${index + 1}` },
                    ...(values.ownership === "AMBS"
                      ? [
                          f(
                            "location_id",
                            `External custody location ${index + 1}`,
                            { resource: "locations", ...required },
                          ),
                        ]
                      : []),
                    f(
                      "expected_on",
                      `Stage agreed finish ${index + 1} (optional)`,
                      { type: "date" },
                    ),
                  ].map((field) => (
                    <Field
                      key={field.key}
                      field={field}
                      value={stage[field.key]}
                      onChange={(v) =>
                        setStages((previous) =>
                          previous.map((entry, i) =>
                            i === index ? { ...entry, [field.key]: v } : entry,
                          ),
                        )
                      }
                    />
                  ))}
                </div>
                <button
                  type="button"
                  disabled={stages.length === 1}
                  onClick={() =>
                    setStages((s) => s.filter((_, i) => i !== index))
                  }
                >
                  Remove stage {index + 1}
                </button>
              </section>
            ))}
            <button
              type="button"
              disabled={stages.length >= 12}
              onClick={() =>
                setStages((s) => [
                  ...s,
                  {
                    name: "",
                    supplier_id: "",
                    location_id: "",
                    expected_on: "",
                  },
                ])
              }
            >
              Add production stage
            </button>
          </>
        )}
        {resource === "conversions" && (
          <>
            {lineEditor(lines, setLines, "Input", true)}
            {lineEditor(outputs, setOutputs, "Output", true, true)}
            <p className="notice">
              Measured conversion consumes owned inputs and records measured
              outputs. No BOM or cost distribution is inferred. Active
              production claims cannot be consumed.
            </p>
            <label className="inventory-check">
              <input type="checkbox" required />I verified the measured inputs,
              outputs and approval reference.
            </label>
          </>
        )}
        {["quotations", "production"].includes(resource) && (
          <section>
            <h3>Attachment metadata</h3>
            <p className="field-hint">
              Record an approved document reference and optional SHA256. Files
              and remote URLs are not fetched.
            </p>
            {attachments.map((a, index) => (
              <div className="inventory-line" key={index}>
                {[
                  f("name", `Attachment name ${index + 1}`, required),
                  f("reference", `Attachment reference ${index + 1}`, required),
                  f("sha256", `Attachment SHA256 ${index + 1}`),
                ].map((field) => (
                  <Field
                    key={field.key}
                    field={field}
                    value={a[field.key]}
                    onChange={(v) =>
                      setAttachments((previous) =>
                        previous.map((entry, i) =>
                          i === index ? { ...entry, [field.key]: v } : entry,
                        ),
                      )
                    }
                  />
                ))}
                <button
                  type="button"
                  onClick={() =>
                    setAttachments((a) => a.filter((_, i) => i !== index))
                  }
                >
                  Remove attachment {index + 1}
                </button>
              </div>
            ))}
            <button
              type="button"
              disabled={attachments.length >= 10}
              onClick={() =>
                setAttachments((a) => [
                  ...a,
                  { name: "", reference: "", sha256: "" },
                ])
              }
            >
              Add attachment reference
            </button>
          </section>
        )}
        {mode === "amend" && (
          <Field
            field={f("reason", "Amendment reason", required)}
            value={amendReason}
            onChange={(v) => setAmendReason(text(v))}
          />
        )}
        {error && (
          <p className="notice error" role="alert">
            {error}
          </p>
        )}
        <div className="modal-actions">
          <button
            className="primary"
            disabled={busy || (resource === "receipts" && !order.data)}
          >
            {busy
              ? "Saving…"
              : resource === "comparison"
                ? "Compare recorded quotations"
                : mode === "amend"
                  ? "Close remainder and save replacement draft"
                  : "Save record"}
          </button>
        </div>
      </fieldset>
    </form>
  );
}

function OperationForm({
  busy,
  error,
  onSave,
  path,
  title,
  stage,
  action,
  ownership,
}: {
  busy: boolean;
  error: string;
  onSave: (path: string, method: string, body: unknown) => void;
  path: string;
  title: string;
  stage?: Row;
  action?: string;
  ownership?: string;
}) {
  const [requestKey] = useState(() => crypto.randomUUID());
  const [values, setValues] = useState<Values>({ reason: "" });
  const fields = [
    reason,
    ...(stage
      ? [
          f("quantity", "Actual stage quantity", {
            type: "number",
            ...required,
          }),
          ...(action === "start" && ownership === "AMBS"
            ? [
                f("source_id", "Owned stock source location", {
                  resource: "locations",
                  ...required,
                }),
              ]
            : []),
          ...(action === "yard"
            ? [
                f("location_id", "Actual yard receiving location", {
                  resource: "locations",
                  ...required,
                }),
              ]
            : []),
          f("lot_id", "Actual lot / serial (if tracked)", { resource: "lots" }),
        ]
      : []),
  ];
  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        const body: Values = { request_key: requestKey, reason: values.reason };
        if (stage)
          for (const field of fields.filter((f) => f.key !== "reason"))
            body[field.key] = values[field.key] || null;
        onSave(path, "POST", body);
      }}
    >
      <fieldset disabled={busy}>
        <p>
          Confirm {title.toLowerCase()}. This action is audited. Posted
          commercial and stock history remains retained.
        </p>
        {fields.map((field) => (
          <Field
            key={field.key}
            field={field}
            value={values[field.key]}
            onChange={(v) => setValues((old) => ({ ...old, [field.key]: v }))}
          />
        ))}
        <label className="inventory-check">
          <input type="checkbox" required />I verified this operation and its
          actual quantity/reference.
        </label>
        {error && (
          <p role="alert" className="notice error">
            {error}
          </p>
        )}
        <div className="modal-actions">
          <button className="primary" disabled={busy}>
            {busy ? "Posting…" : "Confirm action"}
          </button>
        </div>
      </fieldset>
    </form>
  );
}

type ModalState = {
  title: string;
  resource?: string;
  initial?: Row;
  mode?: string;
  path?: string;
  stage?: Row;
  action?: string;
  ownership?: string;
};
export function PurchasingScreen({
  screen,
  identity,
}: {
  screen: PurchaseScreen;
  identity?: string;
}) {
  const { permissions } = useUser();
  const has = (permission: string) => permissions.includes(permission);
  const hydrated = useSyncExternalStore(
    subscribed,
    () => true,
    () => false,
  );
  const [revision, setRevision] = useState(0),
    [page, setPage] = useState(1),
    [search, setSearch] = useState(""),
    [status, setStatus] = useState(""),
    [supplierFilter, setSupplierFilter] = useState(""),
    [sort, setSort] = useState("created_at"),
    [direction, setDirection] = useState("desc");
  const [modal, setModal] = useState<ModalState | null>(null),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [success, setSuccess] = useState(""),
    [comparison, setComparison] = useState<Row | null>(null);
  const resource = screenResource(screen),
    dashboard = screen.endsWith("dashboard");
  const params = new URLSearchParams({
    page: String(page),
    search,
    status,
    sort,
    direction,
    ...(supplierFilter ? { supplier_id: supplierFilter } : {}),
    ...(screen === "outstanding" ? { open_only: "true" } : {}),
  });
  const result = useResource<Page<Row> & Row>(
    screen === "comparison"
      ? null
      : `/purchasing/${dashboard ? "dashboard" : `${resource}${identity ? `/${identity}` : `?${params}`}`}`,
    revision,
  );
  function open(state: ModalState) {
    setError("");
    setSuccess("");
    setModal(state);
  }
  async function save(path: string, method: string, body: unknown) {
    if (method === "VALIDATION") {
      setError(text(body));
      return;
    }
    setBusy(true);
    setError("");
    try {
      const saved = await api<Row>(`/purchasing${path}`, { method, body });
      if (path === "/compare") setComparison(saved);
      else {
        setSuccess("Business operation completed successfully.");
        setRevision((r) => r + 1);
      }
      setModal(null);
    } catch (failure) {
      setError(errorMessage(failure));
    } finally {
      setBusy(false);
    }
  }
  const operation = (
    row: Row,
    action: string,
    title: string,
    target = resource,
  ) => open({ title, path: `/${target}/${row.id}/${action}` });
  function actions(row: Row, res = resource) {
    return (
      <div className="row-actions">
        {!identity && (
          <Link className="button-link" href={`/purchasing/${res}/${row.id}`}>
            View details
          </Link>
        )}
        {res === "suppliers" && has("suppliers.update") && (
          <button
            onClick={() =>
              open({
                title: "Edit supplier",
                resource: "suppliers",
                mode: "edit",
                initial: row,
              })
            }
          >
            Edit supplier
          </button>
        )}
        {res === "contacts" && has("suppliers.update") && (
          <button
            onClick={() =>
              open({
                title: "Edit supplier contact",
                resource: "contacts",
                mode: "edit",
                initial: row,
              })
            }
          >
            Edit contact
          </button>
        )}
        {res === "catalog" && has("suppliers.update") && (
          <button
            onClick={() =>
              open({
                title: "Update supplier material evidence",
                resource: "catalog",
                initial: row,
              })
            }
          >
            Update association
          </button>
        )}
        {["orders", "requests", "quotations"].includes(res) &&
          row.status === "DRAFT" &&
          has(createPermission[res]) && (
            <button
              onClick={() =>
                open({
                  title: "Edit draft",
                  resource: res,
                  mode: "edit",
                  initial: row,
                })
              }
            >
              Edit draft
            </button>
          )}
        {res === "orders" && (
          <>
            {row.status === "DRAFT" && has("purchasing.orders.confirm") && (
              <button
                onClick={() =>
                  operation(row, "confirm", "Confirm purchase order", "orders")
                }
              >
                Confirm PO
              </button>
            )}
            {["CONFIRMED", "PARTIALLY_RECEIVED"].includes(text(row.status)) &&
              has("purchasing.receipts.create") && (
                <button
                  onClick={() =>
                    open({
                      title: "Receive actual materials",
                      resource: "receipts",
                      initial: { id: "", order_id: row.id },
                    })
                  }
                >
                  Receive goods
                </button>
              )}
            {["CONFIRMED", "PARTIALLY_RECEIVED", "RECEIVED"].includes(
              text(row.status),
            ) &&
              has("purchasing.orders.close") && (
                <button
                  onClick={() =>
                    operation(
                      row,
                      "close",
                      "Close remaining obligation",
                      "orders",
                    )
                  }
                >
                  Close remainder
                </button>
              )}
            {["CONFIRMED", "PARTIALLY_RECEIVED"].includes(text(row.status)) &&
              has("purchasing.orders.create") &&
              has("purchasing.orders.close") && (
                <button
                  onClick={() =>
                    open({
                      title: "Amend unreceived commercial remainder",
                      resource: "orders",
                      mode: "amend",
                      initial: { ...row, request_id: null },
                    })
                  }
                >
                  Amend remainder
                </button>
              )}
            {has("purchasing.orders.confirm") && (
              <button
                onClick={() =>
                  open({
                    title: "Record supplier delivery update",
                    resource: "schedules",
                    initial: { id: "", order_id: row.id },
                  })
                }
              >
                Update schedule
              </button>
            )}
          </>
        )}
        {res === "custody-locations" &&
          has("production.manage") &&
          has("inventory.locations.manage") && (
            <button
              onClick={() =>
                open({
                  title: "Edit verified custody location",
                  resource: res,
                  mode: "edit",
                  initial: row,
                })
              }
            >
              Edit custody location
            </button>
          )}
        {res === "production" &&
          row.status === "DRAFT" &&
          has("production.create") && (
            <button
              onClick={() =>
                open({
                  title: "Edit unstarted production route",
                  resource: res,
                  mode: "edit",
                  initial: row,
                })
              }
            >
              Edit production plan
            </button>
          )}
        {res === "requests" && (
          <>
            {row.status === "DRAFT" && has("purchasing.requests.manage") && (
              <button
                onClick={() =>
                  operation(
                    row,
                    "submit",
                    "Submit purchase request",
                    "requests",
                  )
                }
              >
                Submit request
              </button>
            )}
            {row.status === "SUBMITTED" && has("purchasing.orders.create") && (
              <button
                onClick={() =>
                  open({
                    title: "Convert submitted request to PO",
                    resource: "orders",
                    initial: { id: "", request_id: row.id, lines: row.lines },
                  })
                }
              >
                Convert to PO
              </button>
            )}
          </>
        )}
        {res === "quotations" && has("suppliers.prices.manage") && (
          <>
            {row.status === "DRAFT" && (
              <button
                onClick={() =>
                  operation(
                    row,
                    "issue",
                    "Issue quotation for comparison",
                    "quotations",
                  )
                }
              >
                Issue quotation
              </button>
            )}
            {row.status === "ISSUED" && (
              <button
                onClick={() =>
                  open({
                    title: "New historical price version",
                    resource: "quotations",
                    initial: { ...row, id: "", supersedes_id: row.id },
                  })
                }
              >
                New price version
              </button>
            )}
          </>
        )}
        {["orders", "requests", "quotations"].includes(res) &&
          row.status === "DRAFT" &&
          has(
            res === "orders"
              ? "purchasing.orders.close"
              : res === "requests"
                ? "purchasing.requests.manage"
                : "suppliers.prices.manage",
          ) && (
            <button
              onClick={() => operation(row, "cancel", "Cancel draft", res)}
            >
              Cancel draft
            </button>
          )}
        {res === "receipts" && (
          <>
            {row.status === "DRAFT" && has("purchasing.receipts.post") && (
              <button
                onClick={() =>
                  operation(row, "post", "Post purchase receipt", "receipts")
                }
              >
                Post receipt
              </button>
            )}
            {row.status === "DRAFT" && has("purchasing.receipts.create") && (
              <button
                onClick={() =>
                  operation(
                    row,
                    "cancel",
                    "Cancel purchase receipt",
                    "receipts",
                  )
                }
              >
                Cancel receipt
              </button>
            )}
            {row.status === "POSTED" && has("purchasing.receipts.post") && (
              <button
                onClick={() =>
                  operation(
                    row,
                    "reverse",
                    "Reverse whole purchase receipt",
                    "receipts",
                  )
                }
              >
                Reverse receipt
              </button>
            )}
          </>
        )}
        {res === "production" && (
          <>
            {has("production.costs.manage") && (
              <button
                onClick={() =>
                  open({
                    title: "Record indicative processing cost",
                    resource: "costs",
                    initial: { id: "", order_id: row.id },
                  })
                }
              >
                Record processing cost
              </button>
            )}
            {row.status === "DRAFT" && has("production.manage") && (
              <button
                onClick={() =>
                  operation(
                    row,
                    "cancel",
                    "Cancel unstarted production",
                    "production",
                  )
                }
              >
                Cancel plan
              </button>
            )}
          </>
        )}
      </div>
    );
  }
  function details(row: Row, res = resource) {
    const fields = [
      "code",
      "name",
      "supplier_name",
      "kind",
      "description",
      "supplier_reference",
      "minimum_quantity",
      "lead_days",
      "is_main",
      "approved_reference",
      "status",
      "ownership",
      "item_name",
      "quantity",
      "unit_name",
      "reason",
      "instructions",
      "reference",
      "quoted_on",
      "valid_until",
      "currency",
      "freight",
      "taxes",
      "fees",
      "ordered_on",
      "expected_on",
      "planned_start",
      "expected_finish",
      "delivery_status",
      "due_on",
      "yard_received",
      "outstanding",
      "closure_reason",
      "source_reference",
      "received_at",
      "address",
      "country",
      "phone",
      "email",
      "payment_terms",
      "tax_registration",
      "notes",
      "is_active",
      "availability_status",
      "reported_available",
      "verified_on",
      "created_by",
      "posted_by",
      "created_at",
      "confirmed_at",
      "completed_at",
    ];
    return (
      <>
        <section className="data-panel inventory-detail">
          <h2>{row.name ?? row.code ?? "Business details"}</h2>
          {actions(row, res)}
          <dl>
            {fields
              .filter((k) => row[k] != null)
              .map((k) => (
                <div key={k}>
                  <dt>{k.replaceAll("_", " ")}</dt>
                  <dd>{text(row[k])}</dd>
                </div>
              ))}
          </dl>
          {rows(row.lines).length > 0 && (
            <div className="table-scroll">
              <table>
                <thead>
                  <tr>
                    <th>Item / service snapshot</th>
                    <th className="numeric-heading">Ordered / requested</th>
                    <th className="numeric-heading">Received</th>
                    <th className="numeric-heading">
                      Outstanding / closed remainder
                    </th>
                    {has("suppliers.prices.read") && (
                      <th className="numeric-heading">Unit price</th>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {rows(row.lines).map((l) => (
                    <tr key={l.id}>
                      <td>
                        {text(l.description)}
                        <span className="table-subtext">
                          {text(l.item_name)} · {text(l.line_type)} ·{" "}
                          {text(l.id)}
                        </span>
                      </td>
                      <td>
                        {text(l.quantity)} {text(l.unit_name)}
                      </td>
                      <td>{text(l.received)}</td>
                      <td>
                        {text(l.outstanding)}
                        {l.closed_remainder != null &&
                          ` · Closed ${l.closed_remainder}`}
                      </td>
                      {has("suppliers.prices.read") && (
                        <td>
                          {l.unit_price == null
                            ? "Unknown"
                            : `${l.unit_price} ${text(row.currency)}`}
                          {l.quoted_unit_price != null && (
                            <span className="table-subtext">
                              Quoted {text(l.quoted_unit_price)} · Unit variance{" "}
                              {text(l.unit_price_variance)}
                            </span>
                          )}
                          {l.price_comparison_note != null && (
                            <span className="table-subtext">
                              {text(l.price_comparison_note)}
                            </span>
                          )}
                          {l.cost_basis != null && (
                            <span className="table-subtext">
                              {text(l.cost_basis)}
                            </span>
                          )}
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {row.movement_id != null && (
            <p className="master-code">
              Linked stock movement: {text(row.movement_id)}
            </p>
          )}
          <div className="row-actions">
            {[
              [
                "request_id",
                "requests",
                "Source purchase request",
                "purchasing.requests.read",
              ],
              [
                "quotation_id",
                "quotations",
                "Source supplier quotation",
                "suppliers.prices.read",
              ],
              [
                "amends_id",
                "orders",
                "Previous amended order",
                "purchasing.orders.read",
              ],
              [
                "order_id",
                "orders",
                "Source purchase order",
                "purchasing.orders.read",
              ],
              [
                "purchase_order_id",
                "orders",
                "Related purchase obligation",
                "purchasing.orders.read",
              ],
            ].map(
              ([key, target, label, permission]) =>
                row[key] != null &&
                has(permission) && (
                  <Link
                    key={key}
                    className="button-link"
                    href={`/purchasing/${target}/${row[key]}`}
                  >
                    {label}
                  </Link>
                ),
            )}
          </div>
          {["input_lines", "output_lines"].map(
            (key) =>
              rows(row[key]).length > 0 && (
                <section key={key}>
                  <h3>
                    {key === "input_lines"
                      ? "Measured consumed inputs"
                      : "Measured outputs — cost pending approved allocation"}
                  </h3>
                  <p>
                    Different items and units are not treated as an implicit
                    conversion formula.
                  </p>
                  <div className="table-scroll">
                    <table>
                      <thead>
                        <tr>
                          <th>Item / identity</th>
                          <th className="numeric-heading">Measured quantity</th>
                          <th>Source / destination</th>
                        </tr>
                      </thead>
                      <tbody>
                        {rows(row[key]).map((l) => (
                          <tr key={l.id}>
                            <td>
                              {text(l.item_name)} · {text(l.lot_identifier)}
                            </td>
                            <td>
                              {text(l.quantity)} {text(l.unit_name)}
                            </td>
                            <td>
                              {text(l.source_name)} → {text(l.destination_name)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </section>
              ),
          )}
        </section>
        {rows(row.stages).length > 0 && (
          <section className="data-panel inventory-detail">
            <h2>Production route and custody</h2>
            <p>
              Stage quantities describe progress of the same goods. Completion
              does not duplicate stock.
            </p>
            {rows(row.stages).map((stage) => (
              <article className="inventory-line" key={stage.id}>
                <h3>
                  {text(stage.sequence)}. {stage.name} ·{" "}
                  {text(stage.supplier_name)}
                </h3>
                <p>
                  Entered {text(stage.entered)} · Completed{" "}
                  {text(stage.completed)} · In process {text(stage.in_process)}{" "}
                  · Ready {text(stage.ready)} · At this stage{" "}
                  {text(stage.current_custody)} · Yard received{" "}
                  {text(stage.yard_received)} {text(row.unit_name)}
                </p>
                <p
                  className={
                    stage.delivery_status === "Delayed"
                      ? "notice error"
                      : "field-hint"
                  }
                >
                  <StatusBadge status={text(stage.delivery_status)} />
                  {stage.due_on ? ` · ${stage.due_on}` : ""}
                </p>
                {["DRAFT", "ACTIVE"].includes(text(row.status)) &&
                  has("production.stages.update") && (
                    <div className="row-actions">
                      {["start", "complete", "transfer", "yard"]
                        .filter(
                          (a) => a !== "start" || text(stage.sequence) === "1",
                        )
                        .filter(
                          (a) =>
                            a !== "yard" ||
                            stage.id === rows(row.stages).at(-1)?.id,
                        )
                        .filter(
                          (a) =>
                            a !== "transfer" ||
                            stage.id !== rows(row.stages).at(-1)?.id,
                        )
                        .filter(
                          (a) =>
                            !["transfer", "yard"].includes(a) ||
                            has("production.transfers.post"),
                        )
                        .map((action) => (
                          <button
                            key={action}
                            onClick={() =>
                              open({
                                title: `${action === "yard" ? "Receive at yard" : action === "transfer" ? "Transfer completed quantity" : action === "complete" ? "Record stage completion" : "Start production quantity"} — ${stage.name}`,
                                path: `/stages/${stage.id}/${action}`,
                                stage,
                                action,
                                ownership: text(row.ownership),
                              })
                            }
                          >
                            {action === "yard"
                              ? "Receive at yard"
                              : action === "transfer"
                                ? "Transfer completed"
                                : action === "complete"
                                  ? "Record completion"
                                  : "Start quantity"}
                          </button>
                        ))}
                      <button
                        onClick={() =>
                          open({
                            title: "Update recorded stage schedule",
                            resource: "schedules",
                            initial: { id: "", stage_id: stage.id },
                          })
                        }
                      >
                        Update stage schedule
                      </button>
                    </div>
                  )}
                <History
                  title="Stage schedule history"
                  data={rows(stage.schedule_history)}
                />
              </article>
            ))}
          </section>
        )}
        <History
          title="Production and custody timeline"
          data={rows(row.events)}
        />
        <History
          title="Delivery date history"
          data={rows(row.schedule_history)}
        />
        <History
          title="Processing costs — pending approved allocation"
          data={rows(row.costs)}
        />
        <History
          title="Approved attachment references"
          data={rows(row.attachments)}
        />
        {[
          "contacts",
          "catalog",
          "quotations",
          "orders",
          "receipts",
          "outstanding_work",
        ].map(
          (key) =>
            rows(row[key]).length > 0 && (
              <section className="data-panel inventory-detail" key={key}>
                <h2>{key.replaceAll("_", " ")}</h2>
                {rows(row[key]).map((child) => (
                  <article className="inventory-line" key={child.id}>
                    <strong>
                      {text(child.name ?? child.code ?? child.reference)}
                    </strong>
                    <p>
                      {text(child.status)} {text(child.delivery_status)}{" "}
                      {text(child.availability_status)}
                    </p>
                    {key === "contacts" ? (
                      <p>
                        {text(child.phone)} {text(child.email)}{" "}
                        {child.is_main ? "Main contact" : ""}
                      </p>
                    ) : (
                      <Link
                        href={`/purchasing/${key === "outstanding_work" ? "production" : key}/${child.id}`}
                      >
                        Open related record
                      </Link>
                    )}
                  </article>
                ))}
              </section>
            ),
        )}
      </>
    );
  }
  return (
    <>
      <div className="page-header">
        <div>
          <p className="eyebrow">SUPPLY & EXTERNAL PRODUCTION</p>
          <h1>{purchasingScreens[screen]}</h1>
          <p>
            Recorded supplier commitments, verified progress and traceable owned
            stock.
          </p>
        </div>
      </div>
      <nav className="inventory-tabs" aria-label="Purchasing sections">
        {Object.entries(purchasingScreens)
          .filter(([key]) => has(readPermission(key as PurchaseScreen)))
          .map(([key, label]) => (
            <Link
              key={key}
              href={`/purchasing/${key}`}
              aria-current={screen === key ? "page" : undefined}
            >
              {label}
            </Link>
          ))}
      </nav>
      {identity && (
        <Link className="button-link" href={`/purchasing/${screen}`}>
          Back to {purchasingScreens[screen]}
        </Link>
      )}
      {success && (
        <p role="status" className="notice success">
          {success}
        </p>
      )}
      {error && !modal && (
        <p role="alert" className="notice error">
          {error}
        </p>
      )}
      <div className="inventory-toolbar">
        {!identity &&
          createPermission[resource] &&
          has(createPermission[resource]) && (
            <button
              className="primary"
              disabled={!hydrated}
              onClick={() =>
                open({ title: `Create ${singular[resource]}`, resource })
              }
            >
              Create {singular[resource]}
            </button>
          )}
        {screen === "comparison" && (
          <button
            className="primary"
            disabled={!hydrated}
            onClick={() =>
              open({
                title: "Compare verified supplier quotations",
                resource: "comparison",
              })
            }
          >
            Compare quotations
          </button>
        )}
        <button
          disabled={result.loading}
          onClick={() => setRevision((r) => r + 1)}
        >
          Refresh records
        </button>
      </div>
      {!identity && !dashboard && screen !== "comparison" && (
        <form
          className="filter-bar data-panel"
          onSubmit={(e) => {
            e.preventDefault();
            setSearch(text(new FormData(e.currentTarget).get("search")));
            setPage(1);
          }}
        >
          <div className="field">
            <label htmlFor="purchase-search">Search records</label>
            <input id="purchase-search" name="search" />
          </div>
          <button>Search</button>
          <Field
            field={f("status", "Status filter", {
              options: [
                "DRAFT",
                "ISSUED",
                "SUBMITTED",
                "CONVERTED",
                "CONFIRMED",
                "PARTIALLY_RECEIVED",
                "RECEIVED",
                "CLOSED",
                "POSTED",
                "ACTIVE",
                "COMPLETED",
                "CANCELLED",
                "REVERSED",
              ],
            })}
            value={status}
            onChange={(v) => {
              setStatus(text(v));
              setPage(1);
            }}
          />
          <Field
            field={f("supplier", "Supplier filter", { resource: "suppliers" })}
            value={supplierFilter}
            onChange={(v) => {
              setSupplierFilter(text(v));
              setPage(1);
            }}
          />
          <Field
            field={f("sort", "Sort by", {
              options: ["created_at", "name", "code", "status"],
            })}
            value={sort}
            onChange={(v) => setSort(text(v))}
          />
          <Field
            field={f("direction", "Sort direction", {
              options: ["asc", "desc"],
            })}
            value={direction}
            onChange={(v) => setDirection(text(v))}
          />
        </form>
      )}
      {result.loading && (
        <p role="status" className="notice">
          Loading verified records…
        </p>
      )}
      {result.error && (
        <p role="alert" className="notice error">
          {result.error}
        </p>
      )}
      {identity && result.data && details(result.data)}
      {!identity && !dashboard && screen !== "comparison" && (
        <section className="data-panel inventory-table">
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Reference / name</th>
                  <th>Supplier / item</th>
                  <th>Status / schedule</th>
                  <th>Created / updated</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {!result.loading && rows(result.data?.items).length === 0 && (
                  <tr>
                    <td colSpan={5}>
                      No records match this view. Actual company data must be
                      entered and verified.
                    </td>
                  </tr>
                )}
                {rows(result.data?.items).map((row) => (
                  <tr key={row.id}>
                    <td>
                      <strong>{row.name ?? row.code}</strong>
                      <span className="table-subtext master-code">
                        {row.code ?? row.id}
                      </span>
                    </td>
                    <td>{text(row.supplier_name ?? row.item_name)}</td>
                    <td>
                      <StatusBadge
                        status={
                          row.status ??
                          (row.is_active === false ? "Inactive" : "Active")
                        }
                      />
                      <span className="table-subtext">
                        {text(row.delivery_status ?? row.availability_status)}
                      </span>
                    </td>
                    <td>
                      {row.created_at ? utcTime(text(row.created_at)) : "—"}
                    </td>
                    <td>{actions(row)}</td>
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
      {screen === "comparison" && comparison && (
        <section className="data-panel inventory-detail">
          <h2>Evidence-based comparison</h2>
          <p>{text(comparison.assumptions)}</p>
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Supplier / quote</th>
                  <th>Price / unit</th>
                  <th>Landed amount / rank</th>
                  <th>Comparability evidence</th>
                  <th>Availability / timing</th>
                </tr>
              </thead>
              <tbody>
                {rows(comparison.items).map((row) => (
                  <tr key={row.id}>
                    <td>
                      {text(row.supplier_name)} · {text(row.reference)}
                    </td>
                    <td>
                      {text(row.unit_price)} {text(row.currency)} /{" "}
                      {text(row.unit_name)}
                    </td>
                    <td>
                      {row.landed_cost == null
                        ? "Not Comparable"
                        : `${row.landed_cost} ${row.currency} · Rank ${row.rank}`}
                    </td>
                    <td>
                      {text(row.comparison)}
                      <ul>
                        {Array.isArray(row.reasons) &&
                          row.reasons.map((r, i) => <li key={i}>{text(r)}</li>)}
                      </ul>
                    </td>
                    <td>
                      {text(row.availability_status)}
                      <span className="table-subtext">
                        {row.lead_days == null
                          ? "Lead time unknown"
                          : `${row.lead_days} reported days`}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {!rows(comparison.items).length && (
            <p>No quotation history exists for this item.</p>
          )}
        </section>
      )}
      {dashboard && result.data && (
        <>
          <div className="inventory-metrics">
            {(screen === "purchasing-dashboard"
              ? [
                  ["Open requests", "open_requests"],
                  ["Open confirmed POs", "open_orders"],
                  ["Partial POs", "partially_received"],
                ]
              : [["Active production plans", "active_production"]]
            ).map(([label, key]) => (
              <section className="data-panel" key={key}>
                <span>{label}</span>
                <strong>
                  {result.data?.[key] != null ? (
                    <CountUp value={text(result.data[key])} />
                  ) : (
                    "Unavailable"
                  )}
                </strong>
              </section>
            ))}
          </div>
          {screen === "purchasing-dashboard" ? (
            <>
              <History
                title="Expected incoming — not owned on-hand"
                data={rows(result.data.incoming)}
              />
              <History
                title="Outstanding purchase commitments by currency"
                data={rows(result.data.commitments)}
              />
              <Summary
                title="Overdue supplier deliveries"
                data={rows(result.data.overdue_orders)}
                resource="orders"
              />
              <Summary
                title="Recent goods receipts"
                data={rows(result.data.recent_receipts)}
                resource="receipts"
              />
              <Summary
                title="Quotation expiry / validity review"
                data={rows(result.data.expiring_quotations)}
                resource="quotations"
              />
              {has("suppliers.prices.read") && (
                <Summary
                  title="Recent supplier quotation history"
                  data={rows(result.data.recent_quotations)}
                  resource="quotations"
                />
              )}
            </>
          ) : (
            <>
              <p className="notice">{text(result.data.ownership_note)}</p>
              <Summary
                title="Current outsourced production"
                data={rows(result.data.production_orders)}
                resource="production"
              />
              <History
                title="Stage custody and completion — quantities per unit"
                data={rows(result.data.stages)}
              />
              <History
                title="Delayed production stages"
                data={rows(result.data.delayed_stages)}
              />
              <History
                title="Completed material pending collection"
                data={rows(result.data.pending_collection)}
              />
              <History
                title="Latest verified production updates"
                data={rows(result.data.latest_events)}
              />
            </>
          )}
        </>
      )}
      {modal && (
        <Modal title={modal.title} onClose={() => setModal(null)} busy={busy}>
          {modal.path ? (
            <OperationForm
              busy={busy}
              error={error}
              onSave={save}
              path={modal.path}
              title={modal.title}
              stage={modal.stage}
              action={modal.action}
              ownership={modal.ownership}
            />
          ) : (
            <BusinessForm
              resource={modal.resource!}
              initial={modal.initial}
              mode={modal.mode}
              busy={busy}
              error={error}
              onSave={save}
            />
          )}
        </Modal>
      )}
    </>
  );
}
function History({ title, data }: { title: string; data: Row[] }) {
  if (!data.length) return null;
  const keys = [
    "kind",
    "name",
    "production_code",
    "item_name",
    "supplier_name",
    "ownership",
    "sequence",
    "quantity",
    "unit_name",
    "amount",
    "currency",
    "basis",
    "allocation_status",
    "completed",
    "in_process",
    "ready",
    "current_custody",
    "yard_received",
    "delivery_status",
    "due_on",
    "requested_on",
    "confirmed_on",
    "eta",
    "evidence",
    "reason",
    "actor_id",
    "created_at",
    "reference",
    "sha256",
  ];
  return (
    <section className="data-panel inventory-detail">
      <h2>{title}</h2>
      <ol className="purchasing-timeline">
        {data.map((row, index) => (
          <li key={row.id ?? index}>
            <dl>
              {keys
                .filter((k) => row[k] != null)
                .map((k) => (
                  <div key={k}>
                    <dt>{k.replaceAll("_", " ")}</dt>
                    <dd>{text(row[k])}</dd>
                  </div>
                ))}
            </dl>
            {row.movement_id != null && (
              <p className="master-code">
                Stock movement {text(row.movement_id)}
              </p>
            )}
            {row.receipt_id != null && (
              <Link href={`/purchasing/receipts/${row.receipt_id}`}>
                Linked purchase receipt
              </Link>
            )}
          </li>
        ))}
      </ol>
    </section>
  );
}
function Summary({
  title,
  data,
  resource,
}: {
  title: string;
  data: Row[];
  resource: string;
}) {
  return (
    <section className="data-panel inventory-detail">
      <h2>{title}</h2>
      {!data.length ? (
        <p>No matching verified records.</p>
      ) : (
        data.map((row) => (
          <article className="inventory-line" key={row.id}>
            <Link href={`/purchasing/${resource}/${row.id}`}>
              {row.code ?? row.name ?? text(row.reference)}
            </Link>
            <p>
              {text(row.supplier_name ?? row.item_name)} · {text(row.status)} ·{" "}
              {text(row.delivery_status)}
            </p>
          </article>
        ))
      )}
    </section>
  );
}
