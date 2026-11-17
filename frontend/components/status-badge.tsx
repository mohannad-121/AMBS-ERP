const groups: Record<string, string[]> = {
  success: [
    "ACTIVE",
    "COMPLETED",
    "RECEIVED",
    "POSTED",
    "DISPATCHED",
    "CONFIRMED",
    "VERIFIED",
  ],
  warning: [
    "PENDING",
    "PARTIALLY_RECEIVED",
    "PARTIALLY_DISPATCHED",
    "RESERVED",
    "PICKED",
    "LOADED",
    "IN_PROGRESS",
    "ISSUED",
    "SUBMITTED",
  ],
  danger: [
    "FAILED",
    "BLOCKED",
    "DELAYED",
    "REJECTED",
    "DAMAGED",
    "NOT_CONFIGURED",
  ],
  neutral: [
    "DRAFT",
    "CANCELLED",
    "REVERSED",
    "INACTIVE",
    "UNAVAILABLE",
    "CLOSED",
  ],
};
export function StatusBadge({ status }: { status: string | undefined | null }) {
  const value = status ?? "UNAVAILABLE";
  const tone =
    Object.entries(groups).find(([, values]) =>
      values.includes(value.toUpperCase()),
    )?.[0] ?? "neutral";
  return (
    <span className={`status-badge status-${tone}`}>
      <span aria-hidden="true">
        {tone === "success"
          ? "✓"
          : tone === "danger"
            ? "!"
            : tone === "warning"
              ? "◷"
              : "•"}
      </span>
      <span>{value.replaceAll("_", " ")}</span>
    </span>
  );
}
