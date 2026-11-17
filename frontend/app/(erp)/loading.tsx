export default function Loading() {
  return (
    <div role="status" aria-label="Loading your workspace">
      <div className="page-header">
        <p className="eyebrow">AMBS WORKSPACE</p>
      </div>
      <div className="kpi-grid">
        {[0, 1, 2, 3].map((n) => (
          <div key={n} className="kpi-card skeleton">
            Loading your workspace…
          </div>
        ))}
      </div>
    </div>
  );
}
