"use client";

import { useState } from "react";
import { api, errorMessage } from "@/lib/api";
import type { SystemStatus } from "@/lib/status";

export function StatusPanel({
  initialStatus,
}: {
  initialStatus: SystemStatus;
}) {
  const [status, setStatus] = useState(initialStatus);
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState("");
  const available = status.backend.available && status.database.available;

  async function refresh() {
    setChecking(true);
    setError("");
    try {
      setStatus(await api<SystemStatus>("/status"));
    } catch (error) {
      setError(
        `${errorMessage(error)} The results below are from the previous check.`,
      );
    } finally {
      setChecking(false);
    }
  }

  return (
    <section
      className="status-panel"
      aria-labelledby="status-title"
      aria-busy={checking}
    >
      <div className="panel-heading">
        <div>
          <h2 id="status-title">System status</h2>
          <p>Live connectivity checks across your local stack.</p>
        </div>
        <button onClick={refresh} disabled={checking}>
          {checking ? "Checking…" : "Refresh status"}
        </button>
      </div>
      <div aria-live="polite" role="status">
        {error && <p className="error-banner">{error}</p>}
        <div className={`summary ${available ? "healthy" : "degraded"}`}>
          <span className="dot" aria-hidden="true" />
          <div>
            <strong>
              {available
                ? "All systems operational"
                : "Connection requires attention"}
            </strong>
            <p>
              {available
                ? "Backend and database connections are responding."
                : "Review the service results below and refresh after recovery."}
            </p>
          </div>
        </div>
        <div className="service-list">
          {(
            [
              [
                "backend",
                "Application API",
                "FastAPI",
                "Application availability",
              ],
              ["database", "Database", "PostgreSQL", "Live database query"],
            ] as const
          ).map(([key, title, technology, description]) => (
            <div className="service-row" key={key}>
              <div>
                <h3>{title}</h3>
                <p>
                  {technology} <span aria-hidden="true">·</span> {description}
                </p>
              </div>
              <div className="service-result">
                <span
                  className={`badge ${status[key].available ? "healthy" : "degraded"}`}
                >
                  {status[key].available ? "Connected" : "Unavailable"}
                </span>
                <p>{status[key].message}</p>
              </div>
            </div>
          ))}
        </div>
        <p className="checked">
          Last checked{" "}
          <time dateTime={status.checkedAt}>
            {status.checkedAt.replace("T", " ").slice(0, 19)} UTC
          </time>
        </p>
      </div>
    </section>
  );
}
