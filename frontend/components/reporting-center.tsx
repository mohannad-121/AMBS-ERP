"use client";
import { useState } from "react";
import Link from "next/link";
import { useResource } from "@/lib/use-resource";
import { errorMessage } from "@/lib/api";
import { Pagination, utcTime } from "./forms";
import { StatusBadge } from "./status-badge";
import "./reporting-center.css";

type Category = { key: string; label: string; definition: string; filters: string[] };
type Row = Record<string, string | boolean | number | null>;
type Result = { category: string; definition: string; note: string; timezone: string; generated_at: string; items: Row[]; total: number; page_size: number; statuses: {status: string; count: string}[]; movement_totals: {movement_type: string; unit_id: string; unit: string; quantity: string; effects: string}[] };
const label = (value: string) => value.replace(/_id$/, "").replaceAll("_", " ").replace(/^./, c => c.toUpperCase());
const dateBasis: Record<string, string> = {
  sales: "sales order creation; fulfillment quantities are cumulative at the current snapshot",
  purchasing: "PO ordered-on date; received quantities are cumulative at the current snapshot",
  movements: "actual ledger posting time",
  production: "production order creation; progress is cumulative at the current snapshot",
  production_events: "recorded production event creation time",
  deliveries: "delivery creation; dispatch and reversal times appear separately",
  packing: "document issuance time",
};
const statuses: Record<string, string[]> = {
  sales: ["DRAFT", "CONFIRMED", "PARTIALLY_DISPATCHED", "COMPLETED", "CANCELLED"],
  purchasing: ["DRAFT", "CONFIRMED", "PARTIALLY_RECEIVED", "RECEIVED", "CLOSED", "CANCELLED"],
  inventory: ["USABLE", "EXTERNAL", "QUARANTINE", "DAMAGED", "REJECTED"],
  low_stock: ["LOW_STOCK"], movements: ["POSTED", "REVERSED"],
  production: ["DRAFT", "ACTIVE", "COMPLETED", "CANCELLED"],
  production_events: ["START", "COMPLETE", "TRANSFER", "YARD"],
  deliveries: ["DRAFT", "PICKED", "LOADED", "DISPATCHED", "REVERSED", "CANCELLED"],
  packing: ["ISSUED", "VOID", "REPLACED"],
};

function RecordPicker({ category, field, value, onChange }: {category: string; field: string; value: string; onChange: (v: string) => void}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [chosenName, setChosenName] = useState("");
  const records = useResource<{items: {id: string; name: string; code: string}[]}>(open ? `/reports/choices?${new URLSearchParams({category, field, search})}` : null);
  return <div className="field"><label htmlFor={`report-${field}`}>{label(field)}</label>
    <button type="button" id={`report-${field}`} aria-expanded={open} onClick={() => setOpen(!open)}>{value ? `Change ${label(field).toLowerCase()}: ${chosenName || "selected reference"}` : `Choose ${label(field).toLowerCase()}`}</button>
    {value && <button type="button" onClick={() => onChange("")}>Clear {label(field).toLowerCase()}</button>}
    {open && <><label htmlFor={`search-${field}`}>Search {label(field).toLowerCase()}</label><input id={`search-${field}`} maxLength={120} type="search" value={search} onChange={e => setSearch(e.target.value)} />
      {records.loading && <span role="status">Loading matching references…</span>}
      {records.error && <span role="alert">{records.error} <button type="button" onClick={records.reload}>Retry lookup</button></span>}
      <label htmlFor={`select-${field}`}>Matching {label(field).toLowerCase()} records (up to 25)</label><select id={`select-${field}`} value="" onChange={e => { if (e.target.value) { setChosenName(e.target.selectedOptions[0].text); onChange(e.target.value); setOpen(false); } }}><option value="">Select a recorded reference</option>{records.data?.items.map(r => <option key={r.id} value={r.id}>{r.code} · {r.name}</option>)}</select>
      {records.data && !records.data.items.length && <span>No matching references in this report scope.</span>}</>}
  </div>;
}

export function ReportingCenter() {
  const options = useResource<{categories: Category[]; timezone: string}>("/reports/options");
  const [selected, setSelected] = useState("");
  const [draft, setDraft] = useState<Record<string, string>>({});
  const [filters, setFilters] = useState<Record<string, string>>({});
  const [page, setPage] = useState(1);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const category = options.data?.categories.find(c => c.key === selected) ?? options.data?.categories[0];
  const query = new URLSearchParams({...filters, category: category?.key ?? "sales", page: String(page)});
  const resource = useResource<Result>(category ? `/reports?${query}` : null);
  const result = resource.data;
  const update = (field: string, value: string) => setDraft({...draft, [field]: value});
  async function download() {
    if (!category) return;
    setBusy(true); setError("");
    try {
      const response = await fetch(`/api/reports/export?${new URLSearchParams({...filters,category: category.key,page:"1"})}`, {cache:"no-store", credentials:"same-origin", signal:AbortSignal.timeout(15000)});
      if (!response.ok) { const data = await response.json(); throw new Error(data.error?.message ?? "The report export failed"); }
      const url = URL.createObjectURL(await response.blob());
      const a = document.createElement("a"); a.href = url; a.download = "ambs-operational-report.csv"; a.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (e) { setError(e instanceof Error ? e.message : errorMessage(e)); }
    finally { setBusy(false); }
  }
  const hidden = new Set(["row_id", "record_id", "item_id", "unit_id", "customer_id", "supplier_id", "project_id", "location_id", "warehouse_id", "href", "journey_href"]);
  const columns = Array.from(new Set(result?.items.flatMap(r => Object.keys(r)) ?? [])).filter(k => !hidden.has(k));
  return <div className="reporting-center">
    <header className="page-header"><div><p className="eyebrow">AMBS / MANAGEMENT EVIDENCE</p><h1>Reporting Center</h1><p>Traceable operational reports and exceptions, from recorded facts.</p></div><Link className="button secondary" href="/">Operational dashboard</Link></header>
    <div className="notice"><strong>Read-only review.</strong> No stock posting, company data import or financial transactions. Dates use Asia/Dubai (UTC+04:00); date ranges include the full local through date. Document issuance and physical dispatch are separate evidence.</div>
    {(options.error || resource.error || error) && <div className="notice error" role="alert">{options.error || resource.error || error}<button onClick={() => {options.reload();resource.reload();setError("");}}>Retry report</button></div>}
    {options.loading && <p role="status">Loading authorized reports…</p>}
    {options.data && !options.data.categories.length && <section className="panel"><h2>No authorized operational reports</h2><p>Your current permissions do not grant these reports. Access is also enforced by the server.</p></section>}
    {category && <>
      <section className="panel"><h2>Report scope</h2><form onSubmit={e => {e.preventDefault();setPage(1);setFilters(Object.fromEntries(Object.entries(draft).filter(([,v]) => v)));setError("");resource.reload();}}>
        <div className="report-filter-grid"><div className="field"><label htmlFor="report-category">Report category</label><select id="report-category" value={category.key} onChange={e => {setSelected(e.target.value);setDraft({});setFilters({});setPage(1);setError("");}}>{options.data?.categories.map(c => <option key={c.key} value={c.key}>{c.label}</option>)}</select></div>
        {category.filters.filter(f => f === "since" || f === "until").map(f => <div className="field" key={f}><label htmlFor={`report-${f}`}>{f === "since" ? "From date" : "Through date"} (Dubai)</label><input id={`report-${f}`} type="date" min="1900-01-01" max="9998-12-31" value={draft[f] ?? ""} onChange={e => update(f,e.target.value)} /></div>)}
        {category.key !== "exceptions" && <><div className="field"><label htmlFor="report-status">Actual status</label><select id="report-status" value={draft.status ?? ""} onChange={e => update("status",e.target.value)}><option value="">All recorded statuses</option>{statuses[category.key]?.map(s => <option key={s}>{s}</option>)}</select></div><div className="field"><label htmlFor="report-search">Reference contains</label><input id="report-search" maxLength={120} value={draft.search ?? ""} onChange={e => update("search",e.target.value)} /></div></>}
        {category.filters.filter(f => f.endsWith("_id")).map(f => <RecordPicker key={`${category.key}-${f}`} category={category.key} field={f} value={draft[f] ?? ""} onChange={v => update(f,v)} />)}
        </div><div className="row-actions"><button className="primary" disabled={resource.loading}>Apply filters</button><button type="button" onClick={() => {setDraft({});setFilters({});setPage(1);resource.reload();}}>Reset scope</button></div>
      </form><p>{category.definition}</p>{dateBasis[category.key] && <p><strong>Date filter basis:</strong> {dateBasis[category.key]}. A creation-date filter is not a dispatch-period filter; use Movements for stock effects posted during a period.</p>}</section>
      {resource.loading && <p role="status">Reading a consistent operational snapshot…</p>}
      {result && <>
        <section className="panel"><div className="report-result-heading"><div><p className="eyebrow">RECORDED STATUS COUNTS</p><h2>{category.label}</h2><p>Generated {utcTime(result.generated_at)} · Reporting timezone {result.timezone}</p></div><button disabled={busy || resource.loading} onClick={() => void download()}>{busy ? "Preparing CSV…" : "Export filtered CSV"}</button></div>
          <p className="muted">Exports include the complete filtered report, up to 1,000 rows, with exact decimal strings, units, filters and generation time. A new export obtains a new snapshot. Customer-signed receipt is not established by dispatch.</p>
          <div className="report-statuses">{result.statuses.map(s => <div key={s.status}><StatusBadge status={s.status}/><strong>{s.count}</strong><span>{category.key === "exceptions" ? "findings" : "distinct records"}</span></div>)}</div>
          {result.movement_totals.length > 0 && <section aria-label="Signed movements by type and unit"><h3>Signed effects by movement type and unit</h3><p>Totals cover the applied period and scope. Different units are separate; transfers can net to zero across locations. These are stock quantities, not financial values.</p><ul>{result.movement_totals.map(r => <li key={`${r.movement_type}-${r.unit_id}`}>{label(r.movement_type.toLowerCase())}: {r.quantity} {r.unit} · {r.effects} effects</li>)}</ul></section>}
          {result.items.length ? <div className="table-wrap" role="region" aria-label="Operational report results" tabIndex={0}><table><caption>{category.label} — {result.total} matching {category.key === "exceptions" ? "findings" : "rows"}; quantities retain their recorded units</caption><thead><tr>{columns.map(c => <th key={c} scope="col">{label(c)}</th>)}<th scope="col">References</th></tr></thead><tbody>{result.items.map(r => <tr key={`${r.category ?? category.key}-${r.row_id}`}>{columns.map(c => <td key={c}>{r[c] === null || r[c] === undefined || r[c] === "" ? "Not recorded" : c === "status" ? <StatusBadge status={String(r[c])}/> : typeof r[c] === "boolean" ? r[c] ? "Yes" : "No" : String(r[c])}</td>)}<td>{r.href && <Link href={String(r.href)}>Open source module</Link>}{r.journey_href && <Link href={String(r.journey_href)}>Item journey</Link>}</td></tr>)}</tbody></table></div> : <div className="dashboard-empty"><h3>{category.key === "exceptions" ? "No recorded findings in this scope" : "No matching operational records"}</h3><p>No warnings or transactions have been invented. Change the scope to review other recorded evidence.</p></div>}
          <Pagination page={page} total={result.total} size={50} loading={resource.loading} onChange={setPage}/><p>{result.note}</p>
        </section>
      </>}
    </>}
  </div>;
}
