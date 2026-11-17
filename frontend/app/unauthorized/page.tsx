import Link from "next/link";
import { Brand } from "@/components/brand";
export default function Unauthorized() {
  return (
    <main className="auth-page">
      <section className="auth-card">
        <Brand />
        <h1>Please sign in again</h1>
        <p>Your session has expired or your account access has changed.</p>
        <Link className="button-link" href="/login">
          Go to sign in
        </Link>
      </section>
    </main>
  );
}
