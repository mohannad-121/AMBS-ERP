"use client";
import { useEffect, useId, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { useUser } from "./app-shell";
import { Modal, Pagination, utcTime } from "./forms";
import { api, ApiError, errorMessage } from "@/lib/api";
import { useResource } from "@/lib/use-resource";
import {
  can,
  config,
  type Field,
  type MasterRow,
  type Resource,
} from "@/lib/master-data";
import type { Page } from "@/lib/types";

const subscribeToHydration = () => () => {};

function Lookup({
  field,
  value,
  onChange,
  customerId,
  exclude,
}: {
  field: Field;
  value: string;
  onChange: (id: string) => void;
  customerId?: string;
  exclude?: string;
}) {
  const [search, setSearch] = useState("");
  const controlId = useId();
  const resource = field.reference!;
  const filter =
    resource === "projects" && customerId ? `&customer_id=${customerId}` : "";
  const result = useResource<Page<MasterRow>>(
    `/master/${resource}?page_size=100&search=${encodeURIComponent(search)}${filter}`,
  );
  const selected = useResource<MasterRow>(
    value ? `/master/${resource}/${value}` : null,
  );
  const rows = result.data?.items.filter((row) => row.id !== exclude) ?? [];
  if (selected.data && !rows.some((row) => row.id === value))
    rows.unshift(selected.data);
  return (
    <div className="field">
      <label htmlFor={controlId}>{field.label}</label>
      <input
        aria-label={`Search ${field.label}`}
        placeholder="Search available records"
        value={search}
        onChange={(event) => setSearch(event.target.value)}
      />
      <select
        id={controlId}
        name={field.key}
        required={field.required}
        value={value}
        onChange={(event) => onChange(event.target.value)}
      >
        <option value="">{field.required ? "Select a record" : "None"}</option>
        {rows.map((row) => (
          <option
            key={row.id}
            value={row.id}
            disabled={!row.is_active && row.id !== value}
          >
            {row.name} {!row.is_active ? "(inactive)" : ""}
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
      {(result.data?.total ?? 0) > 100 && (
        <p className="field-hint">Refine your search to find more records.</p>
      )}
    </div>
  );
}

function MasterForm({
  resource,
  row,
  busy,
  error,
  duplicate,
  onSave,
}: {
  resource: Resource;
  row?: MasterRow;
  busy: boolean;
  error: string;
  duplicate: boolean;
  onSave: (body: Record<string, unknown>) => void;
}) {
  const user = useUser();
  const [refs, setRefs] = useState<Record<string, string>>(() =>
    Object.fromEntries(
      config[resource].fields
        .filter((field) => field.reference)
        .map((field) => [field.key, String(row?.[field.key] ?? "")]),
    ),
  );
  const family = useResource<MasterRow>(
    refs.family_id ? `/master/families/${refs.family_id}` : null,
  );
  const [definitions, setDefinitions] = useState<
    { key: string; choices: string }[]
  >(() =>
    Object.entries(
      (row?.attribute_definitions ?? {}) as Record<string, string[]>,
    ).map(([key, choices]) => ({ key, choices: choices.join(", ") })),
  );
  const [submittedName, setSubmittedName] = useState("");
  const possibleMatches = useResource<MasterRow[]>(
    duplicate && submittedName
      ? `/master/customers/duplicates?name=${encodeURIComponent(submittedName)}`
      : null,
  );
  const attrs = (family.data?.attribute_definitions ?? {}) as Record<
    string,
    string[]
  >;
  function submit(event: React.SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    setSubmittedName(String(data.get("name") ?? ""));
    const body: Record<string, unknown> = {};
    for (const field of config[resource].fields) {
      const value = String(data.get(field.key) ?? "").trim();
      body[field.key] = value || (field.required ? "" : null);
      if (field.type === "number" && value)
        body[field.key] =
          field.key === "decimal_places" ? Number(value) : value;
    }
    if (resource === "families")
      body.attribute_definitions = Object.fromEntries(
        definitions.map((definition) => [
          definition.key,
          definition.choices.split(",").map((choice) => choice.trim()),
        ]),
      );
    if (resource === "items")
      body.attributes = Object.fromEntries(
        Object.keys(attrs).map((key) => [
          key,
          String(data.get(`attribute-${key}`)),
        ]),
      );
    if (resource === "customers" && duplicate) {
      body.acknowledge_duplicate = data.get("acknowledge_duplicate") === "on";
      body.duplicate_reason = String(data.get("duplicate_reason") ?? "");
    }
    onSave(body);
  }
  return (
    <form onSubmit={submit} aria-busy={busy}>
      <fieldset disabled={busy}>
        <p className="field-hint">
          Internal codes are generated once and remain stable. Required fields
          are marked *.
        </p>
        <div className="form-grid">
          {config[resource].fields.map((field) =>
            field.reference ? (
              <Lookup
                key={field.key}
                field={field}
                value={refs[field.key] ?? ""}
                customerId={refs.customer_id}
                exclude={resource === field.reference ? row?.id : undefined}
                onChange={(value) =>
                  setRefs((previous) => ({
                    ...previous,
                    [field.key]: value,
                    ...(field.key === "customer_id" ? { project_id: "" } : {}),
                  }))
                }
              />
            ) : (
              <div key={field.key} className="field">
                <label htmlFor={field.key}>
                  {field.label}
                  {field.required ? " *" : ""}
                </label>
                {field.choices ? (
                  <select
                    id={field.key}
                    name={field.key}
                    required={field.required}
                    defaultValue={String(row?.[field.key] ?? field.choices[0])}
                  >
                    {field.choices
                      .filter(
                        (choice) =>
                          !(
                            resource === "projects" &&
                            choice === "archived" &&
                            !can(user.permissions, resource, "archive") &&
                            row?.status !== "archived"
                          ),
                      )
                      .map((choice) => (
                        <option key={choice} value={choice}>
                          {choice.replaceAll("_", " ")}
                        </option>
                      ))}
                  </select>
                ) : field.type === "textarea" ? (
                  <textarea
                    id={field.key}
                    name={field.key}
                    maxLength={4000}
                    defaultValue={String(row?.[field.key] ?? "")}
                  />
                ) : (
                  <input
                    id={field.key}
                    name={field.key}
                    type={field.type ?? "text"}
                    required={field.required}
                    maxLength={field.max ?? 200}
                    min={field.type === "number" ? 0 : undefined}
                    max={field.key === "decimal_places" ? 6 : undefined}
                    step={
                      field.type === "number"
                        ? field.key === "decimal_places"
                          ? 1
                          : "0.000001"
                        : undefined
                    }
                    pattern={field.key === "trn" ? "[0-9]{15}" : undefined}
                    defaultValue={String(
                      row?.[field.key] ??
                        (field.key === "country"
                          ? "United Arab Emirates"
                          : field.key === "decimal_places"
                            ? 0
                            : ""),
                    )}
                  />
                )}
              </div>
            ),
          )}
        </div>
        {resource === "families" && (
          <section className="attribute-editor">
            <h3>Approved variant attributes</h3>
            <p className="field-hint">
              Use keys such as design, length and colour. Each configured key is
              required for an item. Values do not automatically create
              combinations.
            </p>
            {definitions.map((definition, index) => (
              <div className="form-grid" key={index}>
                <div className="field">
                  <label htmlFor={`key-${index}`}>
                    Attribute key {index + 1}
                  </label>
                  <input
                    id={`key-${index}`}
                    required
                    pattern="[a-z][a-z0-9_]{0,39}"
                    value={definition.key}
                    onChange={(event) =>
                      setDefinitions((previous) =>
                        previous.map((entry, i) =>
                          i === index
                            ? { ...entry, key: event.target.value }
                            : entry,
                        ),
                      )
                    }
                  />
                </div>
                <div className="field">
                  <label htmlFor={`values-${index}`}>
                    Approved values {index + 1} (comma separated)
                  </label>
                  <input
                    id={`values-${index}`}
                    required
                    value={definition.choices}
                    onChange={(event) =>
                      setDefinitions((previous) =>
                        previous.map((entry, i) =>
                          i === index
                            ? { ...entry, choices: event.target.value }
                            : entry,
                        ),
                      )
                    }
                  />
                </div>
                <button
                  type="button"
                  onClick={() =>
                    setDefinitions((previous) =>
                      previous.filter((_, i) => i !== index),
                    )
                  }
                >
                  Remove attribute {index + 1}
                </button>
              </div>
            ))}
            <button
              type="button"
              disabled={definitions.length >= 12}
              onClick={() =>
                setDefinitions((previous) => [
                  ...previous,
                  { key: "", choices: "" },
                ])
              }
            >
              Add attribute
            </button>
          </section>
        )}
        {resource === "items" && refs.family_id && (
          <section>
            <h3>Variant attributes</h3>
            {family.loading && <p role="status">Loading family definition…</p>}
            {family.error && <p role="alert">{family.error}</p>}
            <div className="form-grid">
              {Object.entries(attrs).map(([key, choices]) => (
                <div className="field" key={`${refs.family_id}-${key}`}>
                  <label htmlFor={`attribute-${key}`}>{key} *</label>
                  <select
                    id={`attribute-${key}`}
                    name={`attribute-${key}`}
                    required
                    defaultValue={String(
                      (row?.attributes as Record<string, string> | undefined)?.[
                        key
                      ] ?? "",
                    )}
                  >
                    <option value="">Select approved value</option>
                    {choices.map((choice) => (
                      <option key={choice}>{choice}</option>
                    ))}
                  </select>
                </div>
              ))}
            </div>
          </section>
        )}
        {duplicate && (
          <section className="notice">
            <p>
              A customer with this normalized name already exists. Review
              possible matches before continuing.
            </p>
            {possibleMatches.loading && <p role="status">Checking matches…</p>}
            {possibleMatches.error && (
              <p role="alert">{possibleMatches.error}</p>
            )}
            <ul>
              {possibleMatches.data
                ?.filter((match) => match.id !== row?.id)
                .map((match) => (
                  <li key={match.id}>
                    <a
                      href={`/master/customers/${match.id}`}
                      target="_blank"
                      rel="noreferrer"
                    >
                      {match.name} · {match.code}
                    </a>
                  </li>
                ))}
            </ul>
            <label>
              <input name="acknowledge_duplicate" type="checkbox" required /> I
              confirm this is a distinct customer
            </label>
            <div className="field">
              <label htmlFor="duplicate_reason">
                Reason for separate customer
              </label>
              <input
                id="duplicate_reason"
                name="duplicate_reason"
                required
                minLength={10}
                maxLength={300}
              />
            </div>
          </section>
        )}
        {error && (
          <p className="notice error" role="alert">
            {error}
          </p>
        )}
        <div className="modal-actions">
          <button
            className="primary"
            disabled={
              busy ||
              (resource === "items" &&
                !!refs.family_id &&
                (!family.data || family.loading))
            }
          >
            {busy ? "Saving…" : "Save record"}
          </button>
        </div>
      </fieldset>
    </form>
  );
}

export function MasterScreen({
  resource,
  recordId,
}: {
  resource: Resource;
  recordId?: string;
}) {
  const user = useUser();
  const hydrated = useSyncExternalStore(
    subscribeToHydration,
    () => true,
    () => false,
  );
  const settings = config[resource];
  const [search, setSearch] = useState("");
  const [active, setActive] = useState("");
  const [sort, setSort] = useState("name");
  const [direction, setDirection] = useState("asc");
  const [page, setPage] = useState(1);
  const [filter, setFilter] = useState<Record<string, string>>({});
  const [revision, setRevision] = useState(0);
  const query = new URLSearchParams({
    search,
    sort,
    direction,
    page: String(page),
    ...(active ? { active } : {}),
    ...Object.fromEntries(
      Object.entries(filter).filter(
        ([key, value]) =>
          value &&
          (!key.startsWith("attribute_") ||
            (filter.attribute_key && filter.attribute_value)),
      ),
    ),
  });
  const listing = useResource<Page<MasterRow>>(
    !recordId ? `/master/${resource}?${query}` : null,
    revision,
  );
  const detail = useResource<MasterRow>(
    recordId ? `/master/${resource}/${recordId}` : null,
    revision,
  );
  const [modal, setModal] = useState<{
    kind: "edit" | "create" | "activation";
    row?: MasterRow;
  } | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [duplicate, setDuplicate] = useState(false);
  const [success, setSuccess] = useState("");
  const result = recordId ? detail : listing;
  function open(kind: "edit" | "create" | "activation", row?: MasterRow) {
    setError("");
    setDuplicate(false);
    setSuccess("");
    setModal({ kind, row });
  }
  async function save(body: Record<string, unknown>) {
    if (!modal) return;
    setBusy(true);
    setError("");
    try {
      const id = modal.row?.id;
      await api(
        `/master/${resource}${id ? `/${id}` : ""}${modal.kind === "activation" ? "/activation" : ""}`,
        {
          method: modal.kind === "activation" ? "PATCH" : id ? "PUT" : "POST",
          body,
        },
      );
      setModal(null);
      setRevision((value) => value + 1);
      setSuccess("Record saved successfully.");
    } catch (failure) {
      setError(errorMessage(failure));
      if (failure instanceof ApiError && failure.code === "POSSIBLE_DUPLICATE")
        setDuplicate(true);
    } finally {
      setBusy(false);
    }
  }
  function actions(row: MasterRow) {
    return (
      <div className="row-actions">
        {!recordId && (
          <Link className="button-link" href={`/master/${resource}/${row.id}`}>
            View details
          </Link>
        )}
        {can(user.permissions, resource, "update") && (
          <button onClick={() => open("edit", row)}>Edit</button>
        )}
        {resource !== "lpos" && can(user.permissions, resource, "archive") && (
          <button onClick={() => open("activation", row)}>
            {row.is_active ? "Archive" : "Reactivate"}
          </button>
        )}
      </div>
    );
  }
  const filterFields: Field[] =
    resource === "projects" || resource === "lpos"
      ? [
          {
            key: "customer_id",
            label: "Filter by customer",
            reference: "customers",
          },
        ]
      : resource === "items"
        ? [
            {
              key: "category_id",
              label: "Filter by category",
              reference: "categories",
            },
            {
              key: "family_id",
              label: "Filter by family",
              reference: "families",
            },
          ]
        : [];
  return (
    <>
      <div className="page-header">
        <div>
          <p className="eyebrow">BUSINESS MASTER DATA</p>
          <h1>
            {recordId ? (detail.data?.name ?? settings.title) : settings.title}
          </h1>
          <p>{settings.description}</p>
        </div>
        {!recordId && can(user.permissions, resource, "create") && (
          <button
            className="primary"
            disabled={!hydrated}
            onClick={() => open("create")}
          >
            Create {settings.singular}
          </button>
        )}
      </div>
      {success && (
        <p className="notice success" role="status">
          {success}
        </p>
      )}
      {result.error && (
        <p className="notice error" role="alert">
          {result.error}
          <button onClick={() => setRevision((value) => value + 1)}>
            Retry
          </button>
        </p>
      )}
      {!recordId && (
        <section className="data-panel" aria-label={settings.title}>
          <form
            className="filter-bar"
            onSubmit={(event) => {
              event.preventDefault();
              setPage(1);
              setSearch(
                String(new FormData(event.currentTarget).get("search") ?? ""),
              );
            }}
          >
            <div className="field">
              <label htmlFor="search">Search name or code</label>
              <input
                id="search"
                name="search"
                maxLength={200}
                defaultValue={search}
              />
            </div>
            <button>Search</button>
            <div className="field">
              <label htmlFor="active">Activation</label>
              <select
                id="active"
                value={active}
                onChange={(event) => {
                  setActive(event.target.value);
                  setPage(1);
                }}
              >
                <option value="">All records</option>
                <option value="true">Active</option>
                <option value="false">Inactive / archived</option>
              </select>
            </div>
            <div className="field">
              <label htmlFor="sort">Sort by</label>
              <select
                id="sort"
                value={sort}
                onChange={(event) => {
                  setSort(event.target.value);
                  setPage(1);
                }}
              >
                <option value="name">Name</option>
                <option value="code">Code</option>
                <option value="updated_at">Updated time</option>
                <option value="created_at">Created time</option>
              </select>
            </div>
            <div className="field">
              <label htmlFor="direction">Sort direction</label>
              <select
                id="direction"
                value={direction}
                onChange={(event) => {
                  setDirection(event.target.value);
                  setPage(1);
                }}
              >
                <option value="asc">Ascending</option>
                <option value="desc">Descending</option>
              </select>
            </div>
          </form>
          {filterFields.length > 0 && (
            <div className="filter-bar">
              {filterFields.map((field) => (
                <Lookup
                  key={field.key}
                  field={field}
                  value={filter[field.key] ?? ""}
                  onChange={(value) => {
                    setPage(1);
                    setFilter((previous) => ({
                      ...previous,
                      [field.key]: value,
                    }));
                  }}
                />
              ))}
            </div>
          )}
          {(resource === "items" ||
            resource === "projects" ||
            resource === "lpos") && (
            <div className="filter-bar">
              <div className="field">
                <label htmlFor="type-filter">
                  {resource === "items" ? "Item type" : "Status"}
                </label>
                <select
                  id="type-filter"
                  value={
                    filter[resource === "items" ? "item_type" : "status"] ?? ""
                  }
                  onChange={(event) => {
                    setPage(1);
                    setFilter((previous) => ({
                      ...previous,
                      [resource === "items" ? "item_type" : "status"]:
                        event.target.value,
                    }));
                  }}
                >
                  <option value="">All</option>
                  {(resource === "items"
                    ? [
                        "finished",
                        "raw_material",
                        "component",
                        "accessory",
                        "kit",
                      ]
                    : resource === "projects"
                      ? ["active", "completed", "archived"]
                      : ["active", "closed", "cancelled"]
                  ).map((value) => (
                    <option key={value} value={value}>
                      {value.replaceAll("_", " ")}
                    </option>
                  ))}
                </select>
              </div>
              {resource === "items" && (
                <>
                  <div className="field">
                    <label htmlFor="attribute_key">Attribute key</label>
                    <input
                      id="attribute_key"
                      value={filter.attribute_key ?? ""}
                      onChange={(event) =>
                        setFilter((previous) => ({
                          ...previous,
                          attribute_key: event.target.value,
                        }))
                      }
                    />
                  </div>
                  <div className="field">
                    <label htmlFor="attribute_value">Attribute value</label>
                    <input
                      id="attribute_value"
                      value={filter.attribute_value ?? ""}
                      onChange={(event) => {
                        setPage(1);
                        setFilter((previous) => ({
                          ...previous,
                          attribute_value: event.target.value,
                        }));
                      }}
                    />
                  </div>
                </>
              )}
            </div>
          )}
          <div className="table-scroll" aria-busy={listing.loading}>
            <table>
              <thead>
                <tr>
                  <th>Name / internal code</th>
                  <th>Status</th>
                  <th>Updated</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {listing.loading && (
                  <tr>
                    <td colSpan={4} role="status">
                      Loading records…
                    </td>
                  </tr>
                )}
                {!listing.loading &&
                  !listing.error &&
                  listing.data?.items.length === 0 && (
                    <tr>
                      <td colSpan={4}>
                        No records found.{" "}
                        {can(user.permissions, resource, "create")
                          ? "Create a record to get started."
                          : "Try a different search or filter."}
                      </td>
                    </tr>
                  )}
                {listing.data?.items.map((row) => (
                  <tr key={row.id}>
                    <td>
                      <strong>{row.name}</strong>
                      <span className="table-subtext master-code">
                        {row.code}
                      </span>
                    </td>
                    <td>
                      <span className="neutral-badge">
                        {String(
                          row.status ?? (row.is_active ? "Active" : "Archived"),
                        )}
                      </span>
                    </td>
                    <td>{utcTime(row.updated_at)}</td>
                    <td>{actions(row)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination
            page={page}
            total={listing.data?.total ?? 0}
            onChange={setPage}
            loading={listing.loading}
          />
        </section>
      )}
      {recordId && detail.loading && <p role="status">Loading record…</p>}
      {recordId && detail.data && (
        <>
          <Link className="button-link" href={`/master/${resource}`}>
            Back to {settings.title}
          </Link>
          {actions(detail.data)}
          <section className="data-panel master-details">
            <dl>
              {Object.entries(detail.data)
                .filter(([key]) => !["image", "created_by"].includes(key))
                .map(([key, value]) => (
                  <div key={key}>
                    <dt>{key.replaceAll("_", " ")}</dt>
                    <dd>
                      {key.endsWith("_id") &&
                      value &&
                      [
                        "customer_id",
                        "project_id",
                        "category_id",
                        "unit_id",
                        "family_id",
                        "parent_id",
                      ].includes(key) ? (
                        <Link
                          href={`/master/${({ customer_id: "customers", project_id: "projects", category_id: "categories", unit_id: "units", family_id: "families", parent_id: "categories" } as Record<string, string>)[key]}/${value}`}
                        >
                          View linked {key.replace("_id", "")}
                        </Link>
                      ) : typeof value === "object" && value !== null ? (
                        <pre>{JSON.stringify(value, null, 2)}</pre>
                      ) : (
                        String(value ?? "—")
                      )}
                    </dd>
                  </div>
                ))}
            </dl>
          </section>
          {resource === "customers" && (
            <>
              {user.permissions.includes("projects.read") && (
                <Related
                  resource="projects"
                  filter={`customer_id=${recordId}`}
                />
              )}
              {user.permissions.includes("lpos.read") && (
                <Related resource="lpos" filter={`customer_id=${recordId}`} />
              )}
            </>
          )}
          {resource === "projects" &&
            user.permissions.includes("lpos.read") && (
              <Related resource="lpos" filter={`project_id=${recordId}`} />
            )}
          {resource === "families" &&
            user.permissions.includes("items.read") && (
              <Related resource="items" filter={`family_id=${recordId}`} />
            )}
          {resource === "items" && (
            <ItemPicture
              item={detail.data}
              canManage={user.permissions.includes("images.manage")}
              onSaved={() => {
                setSuccess("Approved item image saved.");
                setRevision((value) => value + 1);
              }}
            />
          )}
        </>
      )}
      {modal && (
        <Modal
          title={
            modal.kind === "activation"
              ? `${modal.row?.is_active ? "Archive" : "Reactivate"} ${settings.singular}`
              : `${modal.kind === "create" ? "Create" : "Edit"} ${settings.singular}`
          }
          busy={busy}
          onClose={() => setModal(null)}
        >
          {modal.kind === "activation" ? (
            <>
              <p>
                {modal.row?.is_active
                  ? "Archive this record? Its identity and existing relationships will be retained."
                  : "Reactivate this record for future use?"}
              </p>
              {error && (
                <p className="notice error" role="alert">
                  {error}
                </p>
              )}
              <button
                disabled={busy}
                className="primary"
                onClick={() => save({ is_active: !modal.row?.is_active })}
              >
                Confirm
              </button>
            </>
          ) : (
            <MasterForm
              resource={resource}
              row={modal.row}
              busy={busy}
              error={error}
              duplicate={duplicate}
              onSave={save}
            />
          )}
        </Modal>
      )}
    </>
  );
}

function Related({ resource, filter }: { resource: Resource; filter: string }) {
  const [page, setPage] = useState(1);
  const result = useResource<Page<MasterRow>>(
    `/master/${resource}?${filter}&page=${page}`,
  );
  return (
    <section className="data-panel master-related">
      <h2>Linked {config[resource].title.toLowerCase()}</h2>
      {result.loading && <p role="status">Loading linked records…</p>}
      {result.error && <p role="alert">{result.error}</p>}
      {result.data?.items.length === 0 && <p>No linked records.</p>}
      <ul>
        {result.data?.items.map((row) => (
          <li key={row.id}>
            <Link href={`/master/${resource}/${row.id}`}>
              {row.name} · {row.code}
            </Link>
          </li>
        ))}
      </ul>
      <Pagination
        page={page}
        total={result.data?.total ?? 0}
        onChange={setPage}
        loading={result.loading}
      />
    </section>
  );
}

function ItemPicture({
  item,
  canManage,
  onSaved,
}: {
  item: MasterRow;
  canManage: boolean;
  onSaved: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [preview, setPreview] = useState("");
  useEffect(() => {
    return () => {
      if (preview) URL.revokeObjectURL(preview);
    };
  }, [preview]);
  async function upload(event: React.SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    const file = new FormData(event.currentTarget).get("image");
    if (!(file instanceof File) || !file.size) return;
    if (
      file.size > 5 * 1024 * 1024 ||
      !["image/png", "image/jpeg", "image/webp"].includes(file.type)
    ) {
      setError("Choose a PNG, JPEG or WebP file of at most 5 MiB.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const bytes = new Uint8Array(await file.arrayBuffer());
      let binary = "";
      for (let offset = 0; offset < bytes.length; offset += 8192)
        binary += String.fromCharCode(...bytes.subarray(offset, offset + 8192));
      await api(`/master/items/${item.id}/image`, {
        method: "PUT",
        body: { mime_type: file.type, content_base64: btoa(binary) },
      });
      onSaved();
    } catch (failure) {
      setError(errorMessage(failure));
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="data-panel master-related">
      <h2>Approved item image</h2>
      {item.image ? (
        // Authenticated image endpoint supplies verified local files, never public URLs.
        // eslint-disable-next-line @next/next/no-img-element
        <img
          className="item-picture"
          src={`/api/master/items/${item.id}/image?v=${encodeURIComponent(String((item.image as { updated_at: string }).updated_at))}`}
          alt={item.name}
          width={240}
          height={180}
        />
      ) : (
        <div className="image-placeholder">No approved image</div>
      )}
      {preview && (
        <div>
          <p>Selected image preview</p>
          {/* Authenticated/local blob preview intentionally bypasses the public image optimizer. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            className="item-picture"
            src={preview}
            alt="Selected image preview"
            width={240}
            height={180}
          />
        </div>
      )}
      {canManage && (
        <form onSubmit={upload}>
          <div className="field">
            <label htmlFor="item-image">
              Upload or replace image (PNG, JPEG, WebP · max 5 MiB)
            </label>
            <input
              id="item-image"
              name="image"
              type="file"
              accept="image/png,image/jpeg,image/webp"
              required
              disabled={busy}
              onChange={(event) => {
                const file = event.target.files?.[0];
                setPreview(
                  file &&
                    file.size <= 5 * 1024 * 1024 &&
                    ["image/png", "image/jpeg", "image/webp"].includes(
                      file.type,
                    )
                    ? URL.createObjectURL(file)
                    : "",
                );
              }}
            />
          </div>
          <button disabled={busy}>{busy ? "Uploading…" : "Save image"}</button>
        </form>
      )}
      {error && (
        <p className="notice error" role="alert">
          {error}
        </p>
      )}
    </section>
  );
}
