"use client";
import { useRef, useState } from "react";
import Link from "next/link";
import { api, errorMessage } from "@/lib/api";
import { useResource } from "@/lib/use-resource";
import { useUser } from "./app-shell";
import { Modal, Pagination, utcTime } from "./forms";

type Page<T> = { items: T[]; total: number };
type Delivery = { id: string; code: string; status: string; destination: string; order_code: string };
type Document = { id: string; code: string; kind: string; revision: number; status: string; source_reversed: boolean; issued_at: string; issued_by: string; event: { reason: string } | null; snapshot: { lines: { name: string; unit: string; dispatched: string; has_image: boolean }[] } };
const labels = { PACKING_LIST: "Packing List", DELIVERY_ORDER: "Delivery Order" };
type Kind = keyof typeof labels;

export async function downloadPdf(path: string) {
  const response = await fetch(`/api${path}`, { cache: "no-store", credentials: "same-origin", signal: AbortSignal.timeout(15000) });
  if (!response.ok) {
    const data = await response.json();
    throw new Error(data.error?.message ?? "Unable to download document");
  }
  if (!response.headers.get("Content-Type")?.startsWith("application/pdf")) throw new Error("The service did not return a PDF");
  const url = URL.createObjectURL(await response.blob());
  const link = document.createElement("a");
  link.href = url;
  link.download = response.headers.get("Content-Disposition")?.match(/filename="([A-Za-z0-9.-]+)"/)?.[1] ?? "AMBS-document.pdf";
  document.body.append(link); link.click(); link.remove();
  // Give the browser time to consume its local download URL.
  setTimeout(() => URL.revokeObjectURL(url), 10000);
}

export function DocumentPanel({ deliveryId }: { deliveryId: string }) {
  const user = useUser();
  const can = (p: string) => user.permissions.includes(p);
  const resource = useResource<{ delivery_code: string; source_status: string; items: Document[] }>(`/packing/deliveries/${deliveryId}/documents`);
  const [task, setTask] = useState<{ action: "issue" | "replace" | "void"; kind: Kind; document?: Document } | null>(null);
  const [busy, setBusy] = useState(false), [error, setError] = useState("");
  const errorRef = useRef<HTMLParagraphElement>(null);
  const requestKey = useRef("");
  function open(next: NonNullable<typeof task>) { requestKey.current = crypto.randomUUID(); setError(""); setTask(next); }
  async function download(path: string) {
    setBusy(true); setError("");
    try { await downloadPdf(path); } catch (e) { setError(e instanceof Error ? e.message : errorMessage(e)); } finally { setBusy(false); }
  }
  async function submit(event: React.SubmitEvent<HTMLFormElement>) {
    event.preventDefault(); if (!task) return;
    const reason = String(new FormData(event.currentTarget).get("reason") ?? "");
    setBusy(true); setError("");
    try {
      await api(task.action === "void" ? `/packing/documents/${task.document?.id}/void` : `/packing/deliveries/${deliveryId}/documents`, {
        method: "POST", body: { request_key: requestKey.current, reason, ...(task.action === "void" ? {} : { kind: task.kind, replaces_id: task.document?.id ?? null }) },
      }); setTask(null); resource.reload();
    } catch (e) { setError(errorMessage(e)); requestAnimationFrame(() => errorRef.current?.focus()); } finally { setBusy(false); }
  }
  const data = resource.data;
  return <section className="data-panel phase7-panel">
    <h2>Packing & delivery documents</h2>
    <p>Preparation copies show verified quantities. Official documents record only posted dispatches. Issuing or reprinting never changes stock.</p>
    {resource.loading && <p role="status">Loading documents...</p>}
    {resource.error && <p role="alert">{resource.error}</p>}
    {error && !task && <p role="alert" className="notice error">{error}</p>}
    {data && <>
      <p><strong>{data.delivery_code}</strong> · Source: {data.source_status}</p>
      {data.source_status === "REVERSED" && <p className="notice" role="status">The physical dispatch was reversed. PDFs remain historical evidence; check the source and document status before use.</p>}
      <div className="row-actions">{(Object.keys(labels) as Kind[]).map(kind => {
        const exists = data.items.some(d => d.kind === kind);
        return <span key={kind}>
          {can("packing.prepare") && ["DRAFT", "PICKED", "LOADED"].includes(data.source_status) && <button disabled={busy} onClick={() => download(`/packing/deliveries/${deliveryId}/preview?kind=${kind}`)}>Preview draft {labels[kind]}</button>}
          {can("packing.issue") && data.source_status === "DISPATCHED" && !exists && <button disabled={busy} onClick={() => open({ action: "issue", kind })}>Issue {labels[kind]}</button>}
        </span>;
      })}<button disabled={busy || resource.loading} onClick={resource.reload}>Refresh documents</button></div>
      {!data.items.length && <p>No issued documents. Final documents become available after actual dispatch.</p>}
      {data.items.map(d => <article className="inventory-detail" key={d.id}>
        <h3>{labels[d.kind as Kind]} · Revision {d.revision}</h3>
        <p className="phase7-reference">{d.code}</p>
        <p>{d.status} · Issued {utcTime(d.issued_at)} by {d.issued_by}</p>
        {d.event && <p>Correction reason: {d.event.reason}</p>}
        <ul>{d.snapshot.lines.map((l, index) => <li key={index}>{l.name}: {l.dispatched} {l.unit} · {l.has_image ? "Issued picture included" : "Picture unavailable"}</li>)}</ul>
        <div className="row-actions">
          {can("packing.download") && <button disabled={busy} onClick={() => download(`/packing/documents/${d.id}/download`)}>Download / reprint {labels[d.kind as Kind]} R{d.revision}</button>}
          {can("packing.void") && d.status === "ISSUED" && <>
            {can("packing.issue") && data.source_status === "DISPATCHED" && <button disabled={busy} onClick={() => open({ action: "replace", kind: d.kind as Kind, document: d })}>Replace revision {d.revision}</button>}
            <button disabled={busy} onClick={() => open({ action: "void", kind: d.kind as Kind, document: d })}>Void revision {d.revision}</button>
          </>}
        </div>
      </article>)}
    </>}
    {task && <Modal title={`${task.action === "issue" ? "Issue" : task.action === "replace" ? "Replace" : "Void"} ${labels[task.kind]}`} onClose={() => setTask(null)} busy={busy}>
      <form onSubmit={submit}><p>Issued PDFs are permanent historical snapshots. Replacements and voids preserve the original document.</p>
        {error && <p ref={errorRef} tabIndex={-1} className="notice error" role="alert">{error}</p>}
        <div className="field"><label htmlFor="document-reason">Reason / authorization reference</label><textarea id="document-reason" name="reason" required minLength={10} maxLength={1000} disabled={busy} /></div>
        <button disabled={busy}>{busy ? "Saving..." : "Confirm document action"}</button>
      </form>
    </Modal>}
  </section>;
}

export function PackingScreen({ initialDelivery = "" }: { initialDelivery?: string }) {
  const [page, setPage] = useState(1), [search, setSearch] = useState(""), [selected, setSelected] = useState(initialDelivery);
  const resource = useResource<Page<Delivery>>(`/packing/deliveries?page=${page}&search=${encodeURIComponent(search)}`);
  return <>
    <div className="page-header"><div><h1>Packing documents</h1><p>Prepare, issue and reprint documents from actual ERP deliveries.</p></div></div>
    {selected ? <><button onClick={() => setSelected("")}>Back to deliveries</button><DocumentPanel key={selected} deliveryId={selected} /></> : <section className="data-panel">
      <div className="field"><label htmlFor="packing-search">Search delivery reference</label><input id="packing-search" value={search} maxLength={120} onChange={e => { setSearch(e.target.value); setPage(1); }} /></div>
      {resource.loading && <p role="status">Loading deliveries...</p>}{resource.error && <p role="alert">{resource.error}</p>}
      <div className="table-scroll"><table><caption className="sr-only">Deliveries available to your account</caption><thead><tr><th>Delivery / order</th><th>Destination</th><th>Status</th><th>Documents</th></tr></thead><tbody>
        {resource.data?.items.map(d => <tr key={d.id}><td>{d.code}<br />{d.order_code}</td><td>{d.destination}</td><td>{d.status}</td><td><button onClick={() => setSelected(d.id)}>Open documents</button></td></tr>)}
      </tbody></table></div>
      {resource.data?.total === 0 && <p>No deliveries available.</p>}
      <Pagination page={page} total={resource.data?.total ?? 0} size={25} loading={resource.loading} onChange={setPage} />
    </section>}
  </>;
}

export function ManufacturingLinks({ itemId, salesOrderId, productionOrderId }: { itemId?: string; salesOrderId?: string; productionOrderId?: string }) {
  const { permissions } = useUser();
  return <div className="row-actions phase7-links">
    {itemId && permissions.includes("bom.read") && <Link className="button secondary" href={`/boms?item=${itemId}`}>BOM versions & components</Link>}
    {permissions.includes("material_plans.read") && <Link className="button secondary" href={`/material-plans?${itemId ? `item=${itemId}` : salesOrderId ? `sales=${salesOrderId}` : `production=${productionOrderId}`}`}>Material plans & shortages</Link>}
  </div>;
}
