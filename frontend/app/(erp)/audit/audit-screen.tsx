"use client";
import { useState } from "react";
import { useResource } from "@/lib/use-resource";
import type { AuditEvent, Page } from "@/lib/types";
import { Pagination, utcTime } from "@/components/forms";
export function AuditScreen() {
  const [page, setPage] = useState(1);
  const [filter, setFilter] = useState("");
  const [filterError, setFilterError] = useState("");
  const list = useResource<Page<AuditEvent>>(`/audit?page=${page}${filter}`);
  function search(event: React.SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    setFilterError("");
    const data = new FormData(event.currentTarget);
    const query = new URLSearchParams();
    for (const name of ["actor", "action"]) {
      const value = String(data.get(name)).trim();
      if (value) query.set(name, value);
    }
    const from = String(data.get("from"));
    const to = String(data.get("to"));
    if (from && to && to < from) {
      setFilterError("End date must be on or after start date.");
      return;
    }
    if (from) query.set("start_at", new Date(`${from}T00:00:00`).toISOString());
    if (to) {
      const end = new Date(`${to}T00:00:00`);
      end.setDate(end.getDate() + 1);
      query.set("end_at", end.toISOString());
    }
    setFilter(`&${query.toString()}`);
    setPage(1);
  }
  return (
    <>
      <div className="page-header">
        <div>
          <p className="eyebrow">SECURITY ADMINISTRATION</p>
          <h1>Audit history</h1>
          <p>
            Trace sign-ins, account changes and security decisions. Timestamps
            are UTC.
          </p>
        </div>
        <button onClick={list.reload} disabled={list.loading}>
          Refresh events
        </button>
      </div>
      <section className="data-panel" aria-label="Security audit events">
        <form className="filter-bar audit-filters" onSubmit={search}>
          <div className="field">
            <label htmlFor="audit-actor">Actor username</label>
            <input
              id="audit-actor"
              name="actor"
              maxLength={64}
              placeholder="Any actor"
            />
          </div>
          <div className="field">
            <label htmlFor="audit-action">Action</label>
            <input
              id="audit-action"
              name="action"
              maxLength={64}
              placeholder="e.g. auth.login_failed"
            />
          </div>
          <div className="field">
            <label htmlFor="audit-from">From date</label>
            <input id="audit-from" name="from" type="date" />
          </div>
          <div className="field">
            <label htmlFor="audit-to">Through date</label>
            <input id="audit-to" name="to" type="date" />
          </div>
          <button type="submit">Apply filters</button>
          <button
            type="reset"
            onClick={() => {
              setFilter("");
              setFilterError("");
              setPage(1);
            }}
          >
            Clear
          </button>
        </form>
        <p className="filter-help">
          Date boundaries use your browser’s local timezone.
        </p>
        {filterError && (
          <p className="notice error" role="alert">
            {filterError}
          </p>
        )}
        {list.loading ? (
          <p className="table-message" role="status">
            Loading audit events…
          </p>
        ) : list.error ? (
          <p className="notice error" role="alert">
            {list.error} <button onClick={list.reload}>Try again</button>
          </p>
        ) : (
          <>
            <div className="table-scroll">
              <table>
                <caption className="sr-only">Security audit history</caption>
                <thead>
                  <tr>
                    <th scope="col">Timestamp (UTC)</th>
                    <th scope="col">Actor</th>
                    <th scope="col">Action</th>
                    <th scope="col">Target</th>
                    <th scope="col">Details</th>
                  </tr>
                </thead>
                <tbody>
                  {list.data?.items.map((event) => (
                    <tr key={event.id}>
                      <td>
                        <time dateTime={event.occurred_at}>
                          {utcTime(event.occurred_at)}
                        </time>
                      </td>
                      <td>{event.actor_username ?? "Unauthenticated"}</td>
                      <td>
                        <code>{event.action}</code>
                      </td>
                      <td>
                        {event.target_type ?? "—"}
                        {event.target_id && (
                          <span className="table-subtext mono">
                            {event.target_id}
                          </span>
                        )}
                      </td>
                      <td>
                        {Object.keys(event.details).length ? (
                          <details>
                            <summary>View details</summary>
                            <pre className="audit-details">
                              {JSON.stringify(event.details, null, 2)}
                            </pre>
                          </details>
                        ) : (
                          "—"
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {list.data?.items.length === 0 && (
                <p className="table-message">No events match these filters.</p>
              )}
            </div>
            <Pagination
              page={page}
              total={list.data?.total ?? 0}
              onChange={setPage}
              loading={list.loading}
            />
          </>
        )}
      </section>
    </>
  );
}
