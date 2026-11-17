"use client";
import { useRef, useState } from "react";
import Link from "next/link";
import { api, errorMessage } from "@/lib/api";
import { useResource } from "@/lib/use-resource";
import { useUser } from "./app-shell";
import { Modal, Pagination, utcTime } from "./forms";

type Option = { id: string; name: string; code: string; unit_id?: string; unit_name?: string };
type Component = { item_id: string; item_name?: string; quantity: string; unit_id: string; unit_name?: string; waste_percent: string | null };
type Bom = { id: string; code: string; item_id: string; item_name: string; unit_id: string; unit_name: string; output_quantity: string; revision: number; version: number; status: string; previous_id: string | null; source_reference: string; reason: string; effective_from: string | null; effective_until: string | null; approved_by: string | null; approved_at: string | null; components: Component[]; model: string };
type PlanLine = { id: string; item_name: string; unit_name: string; required: string; usable_on_hand: string; reserved: string; available: string; shortage: string; expected_incoming?: string; external_custody: string; unavailable_on_hand: string };
type Plan = { id: string; code: string; source: { type: string; code: string; id: string }; status: string; stale: boolean; stale_reason: string | null; sales_order_id: string | null; production_order_id: string | null; warehouse_id: string | null; created_at: string; prepared_by: string; lines: PlanLine[]; applications: { bom_id: string; bom_code: string; revision: number }[]; missing_boms: { item_name: string; quantity: string; reason: string }[]; review: { actor: string; at: string } | null; note: string };
type Page<T> = { items: T[]; total: number };
function SelectOptions({ rows }: { rows?: Option[] }) { return <>{rows?.map(o => <option key={o.id} value={o.id}>{o.name} · {o.code}{o.unit_name ? ` / ${o.unit_name}` : ""}</option>)}</>; }

export function BomScreen({ itemId = "", initialId = "" }: { itemId?: string; initialId?: string }) {
  const { permissions } = useUser(); const can = (p: string) => permissions.includes(p);
  const [page, setPage] = useState(1), [selected, setSelected] = useState(initialId);
  const [form, setForm] = useState<{ row?: Bom; revision?: boolean } | null>(null);
  const [task, setTask] = useState<"submit" | "approve" | "archive" | null>(null);
  const [busy, setBusy] = useState(false), [error, setError] = useState("");
  const errorRef = useRef<HTMLParagraphElement>(null); const [requestKey, setRequestKey] = useState("");
  const list = useResource<Page<Bom>>(`/boms?page=${page}${itemId ? `&item_id=${itemId}` : ""}`);
  const detail = useResource<Bom>(selected ? `/boms/${selected}` : null);
  function openForm(value: NonNullable<typeof form>) { setRequestKey(crypto.randomUUID()); setError(""); setForm(value); }
  async function save(body: unknown, editId?: string) {
    setBusy(true); setError("");
    try { const row = await api<Bom>(editId ? `/boms/${editId}` : "/boms", { method: editId ? "PATCH" : "POST", body }); setForm(null); setSelected(row.id); list.reload(); detail.reload(); }
    catch (e) { setError(errorMessage(e)); requestAnimationFrame(() => errorRef.current?.focus()); } finally { setBusy(false); }
  }
  async function transition(event: React.SubmitEvent<HTMLFormElement>) {
    event.preventDefault(); const f = new FormData(event.currentTarget); setBusy(true); setError("");
    try { await api(`/boms/${selected}/${task}`, { method: "POST", body: { request_key: requestKey, reason: f.get("reason"), ...(task === "approve" ? { specification_confirmed: f.get("confirmed") === "on" } : {}) } }); setTask(null); detail.reload(); list.reload(); }
    catch (e) { setError(errorMessage(e)); requestAnimationFrame(() => errorRef.current?.focus()); } finally { setBusy(false); }
  }
  const b = detail.data;
  return <>
    <div className="page-header"><div><h1>Bills of materials</h1><p>Versioned component definitions. Only explicitly approved, effective rules are used for planning.</p></div>{can("bom.create") && <button className="primary" onClick={() => openForm({})}>New draft BOM</button>}</div>
    <p className="notice">AMBS engineering ratios and wastage require owner approval. No company BOMs are supplied automatically.</p>
    {selected ? <section className="data-panel phase7-manufacturing"><button onClick={() => setSelected("")}>Back to BOM versions</button>
      {detail.loading && <p role="status">Loading BOM...</p>}{detail.error && <p role="alert">{detail.error}</p>}
      {b && <><h2>{b.item_name} · Revision {b.revision}</h2><p className="phase7-reference">{b.code}</p><p>{b.status} · Output {b.output_quantity} {b.unit_name}</p>
        <p>Source / engineering reference: {b.source_reference}</p><p>Revision reason: {b.reason}</p><p>Effective {b.effective_from ?? "on approval"} through {b.effective_until ?? "no expiry"}</p>
        {b.approved_by && <p>Approved by {b.approved_by} · {utcTime(b.approved_at ?? "")}</p>}
        <p>{b.model}</p>
        <div className="table-scroll"><table><caption className="sr-only">BOM component definition</caption><thead><tr><th>Component</th><th>Quantity per output</th><th>Unit</th><th>Approved allowance</th></tr></thead><tbody>{b.components.map(c => <tr key={c.item_id}><td><Link href={`/master/items/${c.item_id}`}>{c.item_name}</Link></td><td>{c.quantity}</td><td>{c.unit_name}</td><td>{c.waste_percent === null ? "Not configured" : `${c.waste_percent}%`}</td></tr>)}</tbody></table></div>
        <div className="row-actions">
          {b.status === "DRAFT" && can("bom.edit") && <button onClick={() => openForm({ row: b })}>Edit draft</button>}
          {can("bom.create") && <button onClick={() => openForm({ row: b, revision: true })}>Create draft revision</button>}
          {(["submit", "approve", "archive"] as const).filter(a => a === "submit" ? b.status === "DRAFT" && can("bom.edit") : a === "approve" ? b.status === "PENDING_APPROVAL" && can("bom.approve") : b.status !== "ARCHIVED" && can("bom.archive")).map(a => <button key={a} onClick={() => { setRequestKey(crypto.randomUUID()); setError(""); setTask(a); }}>{a === "submit" ? "Submit for approval" : a === "approve" ? "Approve definition" : "Archive definition"}</button>)}
          {can("material_plans.read") && <Link href={`/material-plans?item=${b.item_id}`}>Related material plans</Link>}
        </div>
      </>}
    </section> : <section className="data-panel phase7-manufacturing">{list.loading && <p role="status">Loading BOM versions...</p>}{list.error && <p role="alert">{list.error}</p>}
      <div className="table-scroll"><table><caption className="sr-only">BOM versions</caption><thead><tr><th>Assembly</th><th>Revision</th><th>Status</th><th>Output</th><th>Definition</th></tr></thead><tbody>{list.data?.items.map(row => <tr key={row.id}><td>{row.item_name}</td><td>{row.revision}</td><td>{row.status}</td><td>{row.output_quantity} {row.unit_name}</td><td><button onClick={() => setSelected(row.id)}>View BOM</button></td></tr>)}</tbody></table></div>
      {list.data?.total === 0 && <p>No BOM definitions. An authorized employee can prepare a draft; management must approve the specification before it can be used.</p>}
      <Pagination page={page} total={list.data?.total ?? 0} size={25} loading={list.loading} onChange={setPage} />
    </section>}
    {form && <Modal title={form.revision ? "New BOM revision" : form.row ? "Edit draft BOM" : "New draft BOM"} onClose={() => setForm(null)} busy={busy}><BomForm row={form.row} revision={form.revision} itemId={itemId} requestKey={requestKey} busy={busy} error={error} errorRef={errorRef} onSave={save} /></Modal>}
    {task && <Modal title={task === "approve" ? "Approve BOM specification" : task === "submit" ? "Submit BOM for approval" : "Archive BOM"} onClose={() => setTask(null)} busy={busy}><form onSubmit={transition}>
      {error && <p ref={errorRef} role="alert" tabIndex={-1} className="notice error">{error}</p>}
      {task === "approve" && <label className="checkbox-label"><input type="checkbox" name="confirmed" required disabled={busy} />I am authorized to approve the listed materials, quantities, units, allowance and engineering source for AMBS.</label>}
      <div className="field"><label htmlFor="bom-action-reason">Approval / action reason</label><textarea id="bom-action-reason" name="reason" required minLength={10} maxLength={1000} disabled={busy} /></div><button disabled={busy}>{busy ? "Saving..." : "Confirm BOM action"}</button>
    </form></Modal>}
  </>;
}

function BomForm({ row, revision, itemId, requestKey, busy, error, errorRef, onSave }: { row?: Bom; revision?: boolean; itemId: string; requestKey: string; busy: boolean; error: string; errorRef: React.RefObject<HTMLParagraphElement | null>; onSave: (body: unknown, editId?: string) => void }) {
  const [search, setSearch] = useState(""); const options = useResource<{ items: Option[] }>(`/manufacturing/options/items?search=${encodeURIComponent(search)}${row?.item_id || itemId ? `&selected_id=${row?.item_id || itemId}` : ""}`);
  const [item, setItem] = useState(row?.item_id ?? itemId), [unit, setUnit] = useState(row?.unit_id ?? "");
  const [components, setComponents] = useState<Component[]>(row?.components ?? [{ item_id: "", unit_id: "", quantity: "", waste_percent: null }]);
  function update(index: number, values: Partial<Component>) { setComponents(previous => previous.map((c, i) => i === index ? { ...c, ...values } : c)); }
  function submit(event: React.SubmitEvent<HTMLFormElement>) {
    event.preventDefault(); const f = new FormData(event.currentTarget);
    const currentItem = options.data?.items.find(o => o.id === item);
    onSave({ request_key: requestKey, reason: f.get("reason"), item_id: item, unit_id: unit || currentItem?.unit_id, output_quantity: f.get("output"), source_reference: f.get("source"), effective_from: f.get("from") || null, effective_until: f.get("until") || null, components: components.map(c => ({ item_id: c.item_id, quantity: c.quantity, unit_id: c.unit_id, waste_percent: c.waste_percent || null })), previous_id: revision ? row?.id : row?.previous_id ?? null, version: row?.version ?? 1 }, row && !revision ? row.id : undefined);
  }
  const currentOptions = options.data?.items ?? [];
  return <form onSubmit={submit} className="inventory-form">
    {error && <p ref={errorRef} role="alert" tabIndex={-1} className="notice error">{error}</p>}{options.error && <p role="alert">{options.error}</p>}
    <p>Use quantities per stated output in each item&apos;s existing unit. Components are stocked items; nested BOMs and unit conversions are unavailable.</p>
    <fieldset disabled={busy}><legend>Assembly definition</legend>
      <div className="field"><label htmlFor="bom-item-search">Find items for assembly / components</label><input id="bom-item-search" value={search} maxLength={120} onChange={e => setSearch(e.target.value)} /><p className="field-hint">Up to 100 matches. Search by name to find other items.</p></div>
      <div className="field"><label htmlFor="bom-output-item">Assembly item</label><select id="bom-output-item" value={item} required disabled={Boolean(row)} onChange={e => { setItem(e.target.value); setUnit(currentOptions.find(o => o.id === e.target.value)?.unit_id ?? ""); }}><option value="">Select existing item</option>{item && !currentOptions.some(o => o.id === item) && <option value={item}>{row?.item_name ?? "Selected item"}</option>}<SelectOptions rows={currentOptions} /></select></div>
      <div className="field"><label htmlFor="bom-output">Defined output quantity ({row?.unit_name ?? currentOptions.find(o => o.id === item)?.unit_name ?? "item unit"})</label><input id="bom-output" name="output" inputMode="decimal" required pattern="[0-9]+(\.[0-9]{1,6})?" defaultValue={row?.output_quantity ?? "1"} /></div>
      <div className="field"><label htmlFor="bom-source">Engineering source / approval reference</label><textarea id="bom-source" name="source" required minLength={5} maxLength={2000} defaultValue={row?.source_reference} /></div>
      <div className="form-grid"><div className="field"><label htmlFor="bom-from">Effective from (optional)</label><input id="bom-from" name="from" type="date" defaultValue={row?.effective_from ?? ""} /></div><div className="field"><label htmlFor="bom-until">Effective until (optional)</label><input id="bom-until" name="until" type="date" defaultValue={row?.effective_until ?? ""} /></div></div>
    </fieldset>
    <fieldset disabled={busy}><legend>Components (maximum 80)</legend>{components.map((c, index) => <div className="phase7-component" key={index}>
      <div className="field"><label htmlFor={`component-${index}`}>Component {index + 1}</label><select id={`component-${index}`} required value={c.item_id} onChange={e => { const o = currentOptions.find(o => o.id === e.target.value); update(index, { item_id: e.target.value, unit_id: o?.unit_id ?? "", unit_name: o?.unit_name, item_name: o?.name }); }}><option value="">Select component</option>{c.item_id && !currentOptions.some(o => o.id === c.item_id) && <option value={c.item_id}>{c.item_name}</option>}<SelectOptions rows={currentOptions.filter(o => o.id !== item)} /></select></div>
      <div className="field"><label htmlFor={`component-quantity-${index}`}>Quantity ({c.unit_name ?? "item unit"})</label><input id={`component-quantity-${index}`} value={c.quantity} required inputMode="decimal" pattern="[0-9]+(\.[0-9]{1,6})?" onChange={e => update(index, { quantity: e.target.value })} /></div>
      <div className="field"><label htmlFor={`component-waste-${index}`}>Approved allowance % (optional)</label><input id={`component-waste-${index}`} type="number" min="0" max="100" step="0.0001" value={c.waste_percent ?? ""} onChange={e => update(index, { waste_percent: e.target.value || null })} /></div>
      {components.length > 1 && <button type="button" onClick={() => setComponents(old => old.filter((_, i) => i !== index))}>Remove component {index + 1}</button>}
    </div>)}<button type="button" disabled={components.length >= 80} onClick={() => setComponents(old => [...old, { item_id: "", unit_id: "", quantity: "", waste_percent: null }])}>Add component</button></fieldset>
    <div className="field"><label htmlFor="bom-save-reason">Revision reason</label><textarea id="bom-save-reason" name="reason" minLength={10} maxLength={1000} required disabled={busy} /></div>
    <button className="primary" disabled={busy || options.loading}>{busy ? "Saving..." : "Save draft BOM"}</button>
  </form>;
}

export function MaterialPlansScreen({ itemId = "", salesId = "", productionId = "", initialId = "" }: { itemId?: string; salesId?: string; productionId?: string; initialId?: string }) {
  const { permissions } = useUser(); const can = (p: string) => permissions.includes(p);
  const [page, setPage] = useState(1), [selected, setSelected] = useState(initialId), [form, setForm] = useState(false), [review, setReview] = useState(false);
  const [busy, setBusy] = useState(false), [error, setError] = useState("");
  const [key, setKey] = useState(""); const errorRef = useRef<HTMLParagraphElement>(null);
  const list = useResource<Page<Plan>>(`/material-plans?page=${page}${itemId ? `&item_id=${itemId}` : ""}${salesId ? `&sales_order_id=${salesId}` : ""}${productionId ? `&production_order_id=${productionId}` : ""}`);
  const detail = useResource<Plan>(selected ? `/material-plans/${selected}` : null);
  const p = detail.data;
  function open(recalculate = false) { setKey(crypto.randomUUID()); setError(""); if (!recalculate) setSelected(""); setForm(true); }
  async function save(body: unknown) {
    setBusy(true); setError("");
    try { const result = await api<Plan>("/material-plans", { method: "POST", body }); setSelected(result.id); setForm(false); detail.reload(); list.reload(); }
    catch (e) { setError(errorMessage(e)); requestAnimationFrame(() => errorRef.current?.focus()); } finally { setBusy(false); }
  }
  async function submitReview(event: React.SubmitEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setError("");
    try { await api(`/material-plans/${selected}/review`, { method: "POST", body: { request_key: key, reason: new FormData(event.currentTarget).get("reason") } }); setReview(false); detail.reload(); }
    catch (e) { setError(errorMessage(e)); } finally { setBusy(false); }
  }
  return <>
    <div className="page-header"><div><h1>Material requirements</h1><p>Approved-rule calculations from confirmed sales demand or active production targets.</p></div>{can("material_plans.calculate") && <button className="primary" onClick={() => open()}>Calculate material plan</button>}</div>
    <p className="notice">Planning creates no stock movement, reservation, purchase order or production receipt. Expected incoming is separate from physically usable stock.</p>
    {selected ? <section className="data-panel phase7-manufacturing"><button onClick={() => setSelected("")}>Back to material plans</button><button onClick={detail.reload}>Refresh current state</button>
      {detail.loading && <p role="status">Loading plan...</p>}{detail.error && <p role="alert">{detail.error}</p>}
      {p && <><h2>{p.source.code} · {p.status.replaceAll("_", " ")}</h2><p className="phase7-reference">{p.code}</p><p>Calculated {utcTime(p.created_at)} by {p.prepared_by}</p>
        {p.stale && <p className="notice error" role="status">Stale snapshot: {p.stale_reason}. Recalculate before relying on availability.</p>}
        {p.review ? <p>Reviewed by {p.review.actor} · {utcTime(p.review.at)}</p> : <p>Not reviewed</p>}
        {p.missing_boms.length > 0 && <div className="notice"><h3>Awaiting approved BOM</h3>{p.missing_boms.map((m, i) => <p key={i}>{m.item_name} · Demand {m.quantity} · {m.reason}. Requirement is unknown.</p>)}</div>}
        <div className="table-scroll"><table className="phase7-material-table"><caption>Immutable calculation snapshot · quantities in the stated item unit</caption><thead><tr><th>Component / unit</th><th>Required</th><th>Usable on hand</th><th>Reserved</th><th>Available</th><th>Shortage</th><th>Expected incoming</th><th>Blocked / unavailable</th><th>External custody</th></tr></thead><tbody>{p.lines.map(l => <tr key={l.id}><td>{l.item_name}<br />{l.unit_name}</td><td>{l.required}</td><td>{l.usable_on_hand}</td><td>{l.reserved}</td><td>{l.available}</td><td>{l.shortage}<br />{Number(l.shortage) > 0 && (Number(l.expected_incoming ?? 0) > 0 ? "Awaiting receipt" : "Purchase / production review")}</td><td>{l.expected_incoming ?? "Restricted"}</td><td>{l.unavailable_on_hand}</td><td>{l.external_custody}</td></tr>)}</tbody></table></div>
        <h3>Applied BOM versions</h3>{p.applications.length ? p.applications.map((a, i) => <p key={i}><Link href={`/boms?id=${a.bom_id}`}>{a.bom_code} · Revision {a.revision}</Link></p>) : <p>No approved rule was applicable.</p>}
        <p>{p.note}</p><div className="row-actions">
          {can("material_plans.calculate") && <button onClick={() => open(true)}>Recalculate as new snapshot</button>}
          {can("material_plans.review") && !p.review && !p.stale && !p.missing_boms.length && <button onClick={() => { setKey(crypto.randomUUID()); setError(""); setReview(true); }}>Review current plan</button>}
          <Link href={p.source.type === "sales_order" ? "/sales" : `/purchasing/production/${p.source.id}`}>Open source workflow</Link>
          {can("purchasing.orders.read") && <Link href="/purchasing/orders">Purchasing orders / receipts</Link>}
          {can("production.read") && <Link href="/purchasing/production">Production records</Link>}
        </div>
      </>}
    </section> : <section className="data-panel phase7-manufacturing">{list.loading && <p role="status">Loading material plans...</p>}{list.error && <p role="alert">{list.error}</p>}
      <div className="table-scroll"><table><caption className="sr-only">Material planning history</caption><thead><tr><th>Source</th><th>Calculated result</th><th>Created</th><th>Snapshot</th></tr></thead><tbody>{list.data?.items.map(row => <tr key={row.id}><td>{row.source.code}</td><td>{row.status.replaceAll("_", " ")}</td><td>{utcTime(row.created_at)}</td><td><button onClick={() => setSelected(row.id)}>View material plan</button></td></tr>)}</tbody></table></div>
      {list.data?.total === 0 && <p>No material plans. Select an existing confirmed order or active production record to calculate; unapproved formulas remain unavailable.</p>}
      <Pagination page={page} total={list.data?.total ?? 0} size={25} loading={list.loading} onChange={setPage} />
    </section>}
    {form && <Modal title="Calculate material requirements" onClose={() => setForm(false)} busy={busy}><PlanForm previous={p} salesId={salesId} productionId={productionId} busy={busy} requestKey={key} error={error} errorRef={errorRef} onSave={save} /></Modal>}
    {review && <Modal title="Review material plan" onClose={() => setReview(false)} busy={busy}><form onSubmit={submitReview}>{error && <p role="alert">{error}</p>}<div className="field"><label htmlFor="plan-review">Review reason</label><textarea id="plan-review" name="reason" minLength={10} maxLength={1000} required disabled={busy} /></div><button disabled={busy}>{busy ? "Saving..." : "Confirm plan review"}</button></form></Modal>}
  </>;
}

function PlanForm({ previous, salesId, productionId, busy, requestKey, error, errorRef, onSave }: { previous?: Plan; salesId: string; productionId: string; busy: boolean; requestKey: string; error: string; errorRef: React.RefObject<HTMLParagraphElement | null>; onSave: (body: unknown) => void }) {
  const [type, setType] = useState(previous?.production_order_id || productionId ? "production" : "orders"), [source, setSource] = useState(previous?.sales_order_id ?? previous?.production_order_id ?? (salesId || productionId || ""));
  const [search, setSearch] = useState("");
  const options = useResource<{ items: Option[] }>(`/manufacturing/options/${type}?search=${encodeURIComponent(search)}${source ? `&selected_id=${source}` : ""}`), warehouses = useResource<{ items: Option[] }>("/manufacturing/options/warehouses");
  function submit(event: React.SubmitEvent<HTMLFormElement>) { event.preventDefault(); const f = new FormData(event.currentTarget); onSave({ request_key: requestKey, reason: f.get("reason"), sales_order_id: type === "orders" ? source : null, production_order_id: type === "production" ? source || productionId : null, warehouse_id: f.get("warehouse") || null, previous_id: previous?.id ?? null }); }
  return <form onSubmit={submit}>{error && <p ref={errorRef} tabIndex={-1} role="alert" className="notice error">{error}</p>}{options.error && <p role="alert">{options.error}</p>}{warehouses.error && <p role="alert">{warehouses.error}</p>}
    <fieldset disabled={busy}><legend>Existing demand</legend>
      <div className="field"><label htmlFor="plan-source-kind">Demand type</label><select id="plan-source-kind" value={type} disabled={Boolean(previous)} onChange={e => { setType(e.target.value); setSource(""); }}><option value="orders">Confirmed outstanding sales order</option><option value="production">Active production target</option></select></div>
      <p>{type === "orders" ? "Uses actual outstanding order quantities after posted dispatches." : "Uses the full active production target; it does not infer material consumption or receipts."}</p>
      <div className="field"><label htmlFor="plan-source-search">Find demand reference</label><input id="plan-source-search" value={search} maxLength={120} onChange={e => setSearch(e.target.value)} /></div>
      <div className="field"><label htmlFor="plan-source">Source order</label><select id="plan-source" value={source || (type === "production" ? productionId : "")} required disabled={Boolean(previous)} onChange={e => setSource(e.target.value)}><option value="">Select existing source</option>{previous && !options.data?.items.some(o => o.id === source) && <option value={source}>{previous.source.code}</option>}<SelectOptions rows={options.data?.items} /></select></div>
      <div className="field"><label htmlFor="plan-warehouse">Availability scope</label><select id="plan-warehouse" name="warehouse" defaultValue={previous?.warehouse_id ?? ""}><option value="">All usable AMBS warehouses</option><SelectOptions rows={warehouses.data?.items} /></select></div>
      <div className="field"><label htmlFor="plan-reason">Calculation reason</label><textarea id="plan-reason" name="reason" minLength={10} maxLength={1000} required /></div>
    </fieldset><button className="primary" disabled={busy || options.loading || warehouses.loading}>{busy ? "Calculating..." : "Calculate snapshot"}</button>
  </form>;
}
