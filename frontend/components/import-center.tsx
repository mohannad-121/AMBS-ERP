"use client";
import { useRef, useState } from "react";
import { api, errorMessage } from "@/lib/api";
import { useResource } from "@/lib/use-resource";
import "./import-center.css";

type Category = { id: string; fields: string[]; required: string[] };
type Candidate = { header_row: number; header_span: number; score: number; columns: { column: string; label: string }[]; suggested_mapping: Record<string, string> };
type Sheet = { index: number; name: string; nonempty_rows: number; ambiguous: boolean; formula_cells: number; candidates: Candidate[]; sample: { row: number; values: string[] }[] };
type Inspection = { sha256: string; sheets: Sheet[]; warnings: string[] };
type RecordRow = { row: number; original: Record<string, string>; proposed: Record<string, string>; matches: Record<string, { id: string; code?: string }>; valid: boolean; issues: { field: string; code: string; severity: string; message: string }[]; reconciliation?: { status: string; ledger_on_hand: string | null; cached_on_hand?: string; counted_quantity: string; variance: string | null; active_reserved?: string; ledger_unreserved?: string; issues: string[]; references: string[] } };
type Result = { sha256: string; summary: Record<string, number>; records: RecordRow[]; missing_columns: string[]; warnings: string[]; reconciliation_summary?: Record<string, number> };
const names: Record<string, string> = { customers: "Customers", projects: "Projects", lpos: "LPO references", items: "Items & variants", units: "Units of measure", categories: "Product categories", packing_deliveries: "Historical packing & deliveries", physical_stock: "Physical stock for review" };
const label = (value: string) => value.replaceAll("_", " ");

export function ImportCenter() {
  const options = useResource<{ categories: Category[]; retention: string }>("/onboarding/options");
  const [category, setCategory] = useState("customers"), [file, setFile] = useState<{ filename: string; content_base64: string } | null>(null);
  const [inspection, setInspection] = useState<Inspection | null>(null), [sheetIndex, setSheetIndex] = useState(0);
  const [candidateIndex, setCandidateIndex] = useState(0), [mapping, setMapping] = useState<Record<string, string>>({});
  const [dateFormat, setDateFormat] = useState("iso"), [result, setResult] = useState<Result | null>(null);
  const [busy, setBusy] = useState(false), [error, setError] = useState(""), [page, setPage] = useState(1), [issuesOnly, setIssuesOnly] = useState(false);
  const errorRef = useRef<HTMLDivElement>(null), fileInput = useRef<HTMLInputElement>(null), resultRef = useRef<HTMLElement>(null);
  const sheet = inspection?.sheets[sheetIndex], candidate = sheet?.candidates[candidateIndex];
  const selected = options.data?.categories.find(c => c.id === category);
  const records = result?.records.filter(row => !issuesOnly || row.issues.length) ?? [];
  function reset() { setFile(null); setInspection(null); setResult(null); setMapping({}); setError(""); setSheetIndex(0); setCandidateIndex(0); setPage(1); if (fileInput.current) fileInput.current.value = ""; }
  function reportError(e: unknown) { setError(errorMessage(e)); requestAnimationFrame(() => errorRef.current?.focus()); }
  function chooseSheet(index: number) { setSheetIndex(index); setCandidateIndex(0); setMapping(inspection?.sheets[index].candidates[0]?.suggested_mapping ?? {}); setResult(null); }
  async function upload(source: File | undefined) {
    if (!source) return;
    setError(""); setResult(null); setInspection(null); setFile(null);
    if (!/\.(xlsx|csv)$/i.test(source.name) || !source.size || source.size > 4 * 1024 * 1024) { setError("Choose a nonempty .xlsx or .csv file of at most 4 MiB. Macros, HTML, ZIP and legacy .xls files are not accepted."); requestAnimationFrame(() => errorRef.current?.focus()); return; }
    setBusy(true);
    try {
      const encoded = await new Promise<string>((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(String(reader.result).split(",")[1]); reader.onerror = reject; reader.readAsDataURL(source); });
      const value = { filename: source.name, content_base64: encoded };
      const found = await api<Inspection>("/onboarding/inspect", { method: "POST", body: { ...value, category } });
      setFile(value); setInspection(found); setSheetIndex(0); setCandidateIndex(0); setMapping(found.sheets[0]?.candidates[0]?.suggested_mapping ?? {});
    } catch (e) { reportError(e); } finally { setBusy(false); }
  }
  function payload() { return { ...file, category, sheet: sheetIndex, header_row: candidate?.header_row, header_span: candidate?.header_span, mapping, date_format: dateFormat }; }
  async function validate(reconcile = false) {
    setBusy(true); setError("");
    try { const value = await api<Result>(reconcile ? "/onboarding/reconcile" : "/onboarding/validate", { method: "POST", body: payload() }); setResult(value); setPage(1); requestAnimationFrame(() => resultRef.current?.focus()); }
    catch (e) { reportError(e); } finally { setBusy(false); }
  }
  async function downloadReport() {
    setBusy(true); setError("");
    try {
      const prepared = await fetch("/api/auth/csrf", { cache: "no-store" }); if (!prepared.ok) throw new Error("csrf");
      const token = await prepared.json();
      const response = await fetch(result?.reconciliation_summary ? "/api/onboarding/reconciliation-report" : "/api/onboarding/report", { method: "POST", headers: { "Content-Type": "application/json", "X-CSRF-Token": token.csrf_token }, body: JSON.stringify(payload()), cache: "no-store", signal: AbortSignal.timeout(15000) });
      if (!response.ok) { setError("The report could not be prepared. Your session may have expired; sign in again and revalidate the source."); return; }
      const url = URL.createObjectURL(await response.blob()); const link = document.createElement("a"); link.href = url; link.download = "ambs-validation-preview.csv"; link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (e) { reportError(e); } finally { setBusy(false); }
  }
  return <div className="import-center" aria-busy={busy}>
    <header className="page-heading"><div><p className="eyebrow">Data onboarding · Phase 8A</p><h1>Import Center</h1><p>Inspect your source, resolve uncertainty, and review a complete dry run.</p></div></header>
    <div className="import-notice" role="note"><strong>PREVIEW ONLY — NO DATA HAS BEEN IMPORTED</strong><p>Historical references, physical stock counts and actual ledger transactions are different. This screen never creates customers, orders, deliveries, balances or stock movements.</p></div>
    {(error || options.error) && <div className="error" role="alert" ref={errorRef} tabIndex={-1}>{error || options.error}</div>}
    <section className="panel"><h2>1. Choose and inspect a source</h2><p>Private request-memory processing. No source file is retained on the server. Refreshing this page clears the preview.</p>
      <fieldset disabled={busy || options.loading} className="import-fields"><legend className="sr-only">Source selection</legend>
        <div className="field"><label htmlFor="import-category">Import category</label><select id="import-category" value={category} onChange={e => { setCategory(e.target.value); reset(); }}>{options.data?.categories.map(c => <option value={c.id} key={c.id}>{names[c.id]}</option>)}</select></div>
        <div className="field"><label htmlFor="import-file">Excel or CSV source</label><input ref={fileInput} id="import-file" type="file" accept=".xlsx,.csv" onChange={e => void upload(e.target.files?.[0])} aria-describedby="import-limits" /><small id="import-limits">4 MiB · 16 sheets · 2,000 rows/sheet · 5,000 rows/workbook · 50 columns. UTF-8/UTF-16 CSV. No formulas or macros are executed.</small></div>
      </fieldset>{busy && <p role="status">Preparing a bounded preview…</p>}
    </section>
    {inspection && <section className="panel"><h2>2. Confirm headers and map columns</h2><p>{file?.filename} · {inspection.sheets.length} detected sheet(s). Original values are preserved beside proposed values.</p>
      <fieldset disabled={busy} className="import-fields"><legend className="sr-only">Worksheet and header selection</legend>
        <div className="field"><label htmlFor="import-sheet">Worksheet</label><select id="import-sheet" value={sheetIndex} onChange={e => chooseSheet(Number(e.target.value))}>{inspection.sheets.map((s, i) => <option key={i} value={i}>{s.name} · {s.nonempty_rows} nonempty rows</option>)}</select></div>
        <div className="field"><label htmlFor="import-header">Header rows</label><select id="import-header" value={candidateIndex} onChange={e => { const index = Number(e.target.value); setCandidateIndex(index); setMapping(sheet?.candidates[index]?.suggested_mapping ?? {}); setResult(null); }}>{sheet?.candidates.map((c, i) => <option key={i} value={i}>Row {c.header_row}{c.header_span === 2 ? ` + ${c.header_row + 1}` : ""} · {c.columns.length} columns · suggestion {i + 1}</option>)}</select></div>
        <div className="field"><label htmlFor="import-dates">Source date convention</label><select id="import-dates" value={dateFormat} onChange={e => { setDateFormat(e.target.value); setResult(null); }}><option value="iso">ISO YYYY-MM-DD / styled Excel dates</option><option value="dmy">Day/month/year</option><option value="mdy">Month/day/year</option></select></div>
      </fieldset>
      <p className="import-caution">{sheet?.ambiguous ? "Ambiguous headers: confirm the correct row(s). " : "Confirm suggested headers and mappings. "}{sheet?.formula_cells ? `${sheet.formula_cells} formula cell(s) will be treated as literal, untrusted text. ` : ""}Templates, repeated headers and merged headings need manual review.</p>
      <details><summary>View source sample (first eight nonempty rows)</summary><div className="table-wrap"><table><thead><tr><th>Source row</th><th>Original cells</th></tr></thead><tbody>{sheet?.sample.map(r => <tr key={r.row}><td>{r.row}</td><td>{r.values.join(" | ")}</td></tr>)}</tbody></table></div></details>
      <fieldset disabled={busy} className="import-mapping"><legend>ERP field → source column</legend>{selected?.fields.map(field => <div className="field" key={field}><label htmlFor={"map-" + field}>{label(field)}{selected.required.includes(field) ? " (required)" : ""}</label><select id={"map-" + field} value={mapping[field] ?? ""} onChange={e => { const next = { ...mapping }; if (e.target.value) next[field] = e.target.value; else delete next[field]; setMapping(next); setResult(null); }}><option value="">Not mapped</option>{candidate?.columns.map(c => <option value={c.column} key={c.column}>{c.column}: {c.label}</option>)}</select></div>)}</fieldset>
      <div className="actions"><button className="primary" disabled={busy || !candidate} onClick={() => void validate()}>Validate preview</button>{category === "physical_stock" && <button disabled={busy || !candidate} onClick={() => void validate(true)}>Reconcile against ERP (preview only)</button>}<button disabled={busy} onClick={reset}>Clear private preview</button></div>
    </section>}
    {result && <section className="panel" tabIndex={-1} ref={resultRef}><h2>3. Review the dry run</h2><p><strong>0 records imported. 0 stock ledger changes.</strong> Validation is a proposal, never permission to post.</p>
      {result.reconciliation_summary && <div className="import-caution"><h3>Physical stock reconciliation — no posting</h3><p>Expected is the authoritative ledger total, compared with the ERP cache. Reservations are holds, not additional stock. Only the supplied rows are reviewed; omitted SKUs are not zero counts. File reconciliation supports untracked quantities; exact lot/serial counts use Stock Reconciliation.</p><p>{Object.entries(result.reconciliation_summary).map(([k,v]) => `${label(k)}: ${v}`).join(" · ")}</p></div>}<p className="import-digest">Source SHA-256: <code>{result.sha256}</code></p>
      <div className="import-summary">{["total", "valid", "invalid", "possible_duplicates", "missing_relationships", "existing_matches", "manual_review"].map(k => <div key={k}><span>{label(k)}</span><strong>{result.summary[k]}</strong></div>)}</div>
      {result.missing_columns.length > 0 && <p className="error">Missing required mappings: {result.missing_columns.map(label).join(", ")}. Map them above and validate again.</p>}
      {!result.summary.total && <p>No data rows remain after the selected header. Confirm the sheet and header rows.</p>}
      <div className="actions"><button disabled={busy} onClick={() => void downloadReport()}>Export validation report (CSV)</button><label><input type="checkbox" checked={issuesOnly} onChange={e => { setIssuesOnly(e.target.checked); setPage(1); }} /> Show records requiring review</label></div>
      <div className="table-wrap"><table><caption>Original and proposed values · {records.length} records in this view</caption><thead><tr><th>Source row</th><th>Original → proposed</th><th>Review findings</th></tr></thead><tbody>{records.slice((page - 1) * 25, page * 25).map(row => <tr key={row.row}><td><strong>{row.row}</strong>{row.reconciliation && <div><strong>{row.reconciliation.status}</strong><p>Expected: {row.reconciliation.ledger_on_hand ?? "Unresolved"} · Cached: {row.reconciliation.cached_on_hand ?? "Unresolved"} · Counted: {row.reconciliation.counted_quantity} · Difference: {row.reconciliation.variance ?? "Not compared"}</p><p>Reserved: {row.reconciliation.active_reserved ?? "Unresolved"} · Unreserved: {row.reconciliation.ledger_unreserved ?? "Unresolved"}</p><p>{row.reconciliation.issues.join("; ")}</p><p>Supporting movements (up to 20): {row.reconciliation.references.join(", ") || "None"}</p></div>}<p>{row.valid ? row.issues.length ? "Valid with review" : "Valid" : "Invalid"}</p></td><td>{Object.entries(row.proposed).map(([field, value]) => <div className="import-value" key={field}><strong>{label(field)}</strong><span>{row.original[field] || "(empty)"}</span><span>→ {value || "(empty)"}</span>{row.matches[field] && <small>Existing ERP match {row.matches[field].code ?? ""}</small>}</div>)}</td><td>{row.issues.length ? <ul>{row.issues.map((i, j) => <li key={j}><strong>{i.severity === "error" ? "Error" : "Review"} · {label(i.field)}</strong>: {i.message}</li>)}</ul> : "No issues detected in these checks."}</td></tr>)}</tbody></table></div>
      <div className="actions"><button disabled={page === 1 || busy} onClick={() => setPage(p => p - 1)}>Previous records</button><span>Page {page} of {Math.max(1, Math.ceil(records.length / 25))}</span><button disabled={page * 25 >= records.length || busy} onClick={() => setPage(p => p + 1)}>Next records</button></div>
    </section>}
  </div>;
}
