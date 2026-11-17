"use client";
export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <main className="auth-page">
      <section className="auth-card">
        <h1>ERP temporarily unavailable</h1>
        <p>
          We could not load this page. Check the local services and try again.
        </p>
        <button onClick={reset}>Try again</button>
      </section>
    </main>
  );
}
