"use client";
import { useState } from "react";
import { api, errorMessage } from "@/lib/api";
import { useResource } from "@/lib/use-resource";

type Selection = { category: string; sheet: number; header_row: number; header_span: number; mapping: Record<string, string>; date_format: string };
type Revision = { id: string; ordinal: number; state: string; version: number; selection: Selection };
type Source = { id: string; namespace: string; sha256: string; parser_version: string; policy_version: string; created_at: string; revision?: Revision | null };
type Finding = { row: number; original: Record<string, string>; proposed: Record<string, string>; valid: boolean; issues: { code: string; message: string }[] };
type Run = { id: string; binding_sha256: string; created_at: string; result: { selection_valid: boolean; selection_issues: { code: string; message: string }[]; records: Finding[] } };
type Detail = { source: Source; revision: Revision | null; revisions: Revision[]; validations: Run[]; approval_effective: boolean; approval_warning?: string; decisions: { id: string; kind: string; actor_id: string; created_at: string; reason: string }[] };

export function DurableImportReview({ file, selection, sha256 }: { file: { filename: string; content_base64: string } | null; selection: Selection | null; sha256?: string }) {
  const [offset, setOffset] = useState(0), [refresh, setRefresh] = useState(0);
  const list = useResource<{ sources: Source[]; has_more: boolean }>(`/onboarding/review/sources?offset=${offset}&checkpoint=${refresh}`);
  const [detail, setDetail] = useState<Detail | null>(null), [busy, setBusy] = useState(false), [error, setError] = useState("");
  const [namespace, setNamespace] = useState(""), [attested, setAttested] = useState(false), [rows, setRows] = useState(""), [keys, setKeys] = useState("{}");
  const [mappingVersion, setMappingVersion] = useState(""), [intended, setIntended] = useState("PROPOSE_CREATE"), [reason, setReason] = useState("");
  async function load(id: string) { setDetail(await api<Detail>(`/onboarding/review/sources/${id}`)); }
  async function perform(operation: () => Promise<void>) {
    setBusy(true); setError("");
    try { await operation(); setRefresh(n => n + 1); } catch (failure) { setError(errorMessage(failure)); } finally { setBusy(false); }
  }
  async function saveSource() {
    if (!file || !attested || !selection) return;
    const source = await api<Source>("/onboarding/review/sources", { method: "POST", body: { ...file, category: selection.category, namespace, synthetic_only: true } });
    await load(source.id);
  }
  async function saveSelection() {
    if (!detail || !selection || detail.source.sha256 !== sha256) return;
    let sourceKeys: Record<string, string>;
    try { sourceKeys = JSON.parse(keys); } catch { setError("Source identities must be a JSON object, for example {\"2\":\"SYNTH-001\"}."); return; }
    await api(`/onboarding/review/sources/${detail.source.id}/revisions`, { method: "POST", body: { ...selection, expected_version: detail.revision?.version ?? 0, mapping_version: mappingVersion, selected_rows: rows.split(",").map(n => Number(n.trim())), source_keys: sourceKeys, intended_action: intended } });
    await load(detail.source.id);
  }
  async function action(name: string) {
    if (!detail?.revision) return;
    await api(`/onboarding/review/sources/${detail.source.id}/${name}`, { method: "POST", body: { expected_version: detail.revision.version, reason } });
    await load(detail.source.id);
  }
  return <section className="panel" aria-busy={busy}>
    <h2>4. Saved synthetic reviews</h2>
    <p><strong>NO DATA HAS BEEN IMPORTED</strong> · Approval records review metadata only. All future execution requires separate authorization.</p>
    <p>This isolated test feature retains synthetic files and findings in private test storage. Company source storage and retention are not approved.</p>
    {(error || list.error) && <p role="alert" className="error">{error || list.error}</p>}
    <fieldset disabled={busy} className="import-fields"><legend>Save the inspected synthetic source</legend>
      <div className="field"><label htmlFor="review-namespace">Synthetic source namespace</label><input id="review-namespace" value={namespace} onChange={e => setNamespace(e.target.value)} maxLength={100} placeholder="synthetic.acceptance" /></div>
      <label><input type="checkbox" checked={attested} onChange={e => setAttested(e.target.checked)} /> I confirm this source contains synthetic test data only.</label>
      <button disabled={!file || !selection || !attested || namespace.length < 3} onClick={() => void perform(saveSource)}>Save synthetic source manifest</button>
    </fieldset>
    <div className="table-wrap"><table><caption>Saved manifests · newest first</caption><thead><tr><th>Namespace and source</th><th>Review state</th><th>History</th></tr></thead><tbody>{list.data?.sources.map(source => <tr key={source.id}><td>{source.namespace}<br /><code>{source.id}</code><br /><small>SHA-256 {source.sha256}</small></td><td>{source.revision?.state ?? "RECEIVED"}<br />Revision {source.revision?.ordinal ?? 0} · version {source.revision?.version ?? 0}</td><td><button disabled={busy} onClick={() => void perform(() => load(source.id))}>Review {source.namespace}</button></td></tr>)}</tbody></table></div>
    <div className="actions"><button disabled={busy || offset === 0} onClick={() => setOffset(n => n - 20)}>Previous manifests</button><button disabled={busy || !list.data?.has_more} onClick={() => setOffset(n => n + 20)}>Next manifests</button><button disabled={busy} onClick={() => setRefresh(n => n + 1)}>Refresh saved reviews</button></div>
    {detail && <div>
      <h3>Saved review: {detail.source.namespace}</h3><p className="import-digest">Manifest {detail.source.id}<br />SHA-256 <code>{detail.source.sha256}</code><br />Parser {detail.source.parser_version} · policy {detail.source.policy_version}</p>
      <p><strong>{detail.revision?.state ?? "RECEIVED"}</strong> · {detail.approval_effective ? "Approved metadata; no execution capability" : "Read-only proposal; no effective approval"} · revision {detail.revision?.ordinal ?? 0} · version {detail.revision?.version ?? 0}</p>
      {detail.approval_warning && <p role="alert" className="error">{detail.approval_warning}</p>}
      <details><summary>Saved selection and immutable revision history</summary><pre>{JSON.stringify(detail.revisions, null, 2)}</pre></details>
      <fieldset disabled={busy} className="import-fields"><legend>New immutable selection revision</legend>
        <p>Reselect this exact source above and confirm headers/mappings before saving a revision. A new revision invalidates prior approval.</p>
        <div className="field"><label htmlFor="review-mapping">Mapping version</label><input id="review-mapping" value={mappingVersion} onChange={e => setMappingVersion(e.target.value)} maxLength={40} /></div>
        <div className="field"><label htmlFor="review-rows">Selected source row numbers (comma separated, maximum 100)</label><input id="review-rows" value={rows} onChange={e => setRows(e.target.value)} /></div>
        <div className="field"><label htmlFor="review-keys">Source row identities (JSON object)</label><textarea id="review-keys" value={keys} onChange={e => setKeys(e.target.value)} maxLength={25000} /></div>
        <div className="field"><label htmlFor="review-intended">Intended future action (proposal only)</label><select id="review-intended" value={intended} onChange={e => setIntended(e.target.value)}>{["PROPOSE_CREATE", "PROPOSE_LINK", "PROPOSE_UPDATE", "HISTORICAL_REFERENCE_ONLY", "PHYSICAL_REVIEW_ONLY"].map(value => <option key={value}>{value}</option>)}</select></div>
        <button disabled={!selection || detail.source.sha256 !== sha256 || !mappingVersion || !rows} onClick={() => void perform(saveSelection)}>Save selection revision</button>
      </fieldset>
      <fieldset disabled={busy || !detail.revision} className="import-fields"><legend>Validation and review decisions</legend>
        <div className="field"><label htmlFor="review-reason">Review reason (synthetic information only)</label><textarea id="review-reason" value={reason} onChange={e => setReason(e.target.value)} minLength={3} maxLength={500} /></div>
        <div className="actions">{[["validate", "Save validation run"], ["review", "Mark reviewed"], ["approve", "Approve review metadata"], ["reject", "Reject review"], ["cancel", "Cancel review"]].map(([name, title]) => <button key={name} disabled={reason.trim().length < 3} onClick={() => void perform(() => action(name))}>{title}</button>)}</div>
        <p>Only a separate Super Admin may approve. The approver must differ from the uploader and reviewer. Stale versions and changed references are rejected by the server.</p>
      </fieldset>
      <h3>Validation-run history</h3>{detail.validations.map(run => <details key={run.id}><summary>{run.created_at} · {run.result.selection_valid ? "Valid selection" : "Requires correction"} · {run.id}</summary><p className="import-digest">Binding <code>{run.binding_sha256}</code></p>{run.result.selection_issues.map(issue => <p key={issue.code}>{issue.code}: {issue.message}</p>)}<div className="table-wrap"><table><thead><tr><th>Row</th><th>Original values</th><th>Proposed values</th><th>Findings</th></tr></thead><tbody>{run.result.records.map(row => <tr key={row.row}><td>{row.row}</td><td><pre>{JSON.stringify(row.original, null, 2)}</pre></td><td><pre>{JSON.stringify(row.proposed, null, 2)}</pre></td><td>{row.valid ? "Valid" : "Invalid"}{row.issues.map((issue, index) => <p key={index}>{issue.code}: {issue.message}</p>)}</td></tr>)}</tbody></table></div></details>)}
      <h3>Decision history</h3><ul>{detail.decisions.map(decision => <li key={decision.id}>{decision.kind} · {decision.created_at} · actor {decision.actor_id} · {decision.reason}</li>)}</ul>
    </div>}
  </section>;
}
