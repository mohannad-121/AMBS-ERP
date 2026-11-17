import Link from "next/link";
export default function Forbidden() {
  return (
    <section className="empty-state">
      <p className="eyebrow">ACCESS RESTRICTED</p>
      <h1>Permission required</h1>
      <p>
        Your account does not have permission to view this area. Contact your
        system administrator to review your access.
      </p>
      <Link className="button-link" href="/">
        Return to workspace
      </Link>
    </section>
  );
}
