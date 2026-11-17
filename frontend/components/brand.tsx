import Link from "next/link";
export function Brand() {
  return (
    <Link className="brand" href="/" aria-label="AMBS ERP home">
      <span className="brand-mark">AM</span>
      <span>
        AMBS <span className="brand-light">ERP</span>
      </span>
    </Link>
  );
}
