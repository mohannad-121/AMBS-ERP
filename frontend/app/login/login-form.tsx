"use client";
import { useState, useSyncExternalStore } from "react";
import { Brand } from "@/components/brand";
import { PasswordField } from "@/components/forms";
import { api, errorMessage } from "@/lib/api";
const subscribe = () => () => {};
export function LoginForm() {
  // Server-rendered credentials stay disabled until React can handle submission.
  const hydrated = useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function submit(event: React.SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    setBusy(true);
    setError("");
    try {
      await api("/auth/login", {
        method: "POST",
        body: {
          identifier: data.get("identifier"),
          password: data.get("password"),
        },
      });
      window.location.replace("/");
    } catch (error) {
      setError(errorMessage(error));
      setBusy(false);
    }
  }
  return (
    <main className="login-page">
      <section className="login-story">
        <Brand />
        <div>
          <p className="eyebrow">AM BUILDING SOLUTIONS</p>
          <h1>
            Your workspace.
            <br />
            Connected.
          </h1>
          <p>A shared foundation for the people behind every project.</p>
        </div>
        <span>AMBS Internal ERP</span>
      </section>
      <section className="login-form-area">
        <div className="auth-card">
          <div className="mobile-brand">
            <Brand />
          </div>
          <p className="eyebrow">WELCOME BACK</p>
          <h1>Sign in to AMBS ERP</h1>
          <p>Use your company account to continue.</p>
          <form
            method="post"
            action="/api/auth/login"
            onSubmit={submit}
            aria-busy={busy || !hydrated}
          >
            <fieldset disabled={busy || !hydrated}>
              <div className="field">
                <label htmlFor="identifier">Username or email</label>
                <input
                  id="identifier"
                  name="identifier"
                  autoComplete="username"
                  autoCapitalize="none"
                  spellCheck={false}
                  required
                  maxLength={254}
                  aria-describedby={error ? "login-error" : undefined}
                />
              </div>
              <PasswordField />
              {error && (
                <p className="notice error" id="login-error" role="alert">
                  {error}
                </p>
              )}
              <button className="primary full-width" type="submit">
                {!hydrated
                  ? "Preparing sign-in…"
                  : busy
                    ? "Signing in…"
                    : "Sign in"}
              </button>
            </fieldset>
            <noscript>
              <p className="notice error">
                Enable JavaScript to sign in securely, then reload this page.
              </p>
            </noscript>
          </form>
          <p className="access-help">
            Ask your system administrator for account access or a password
            reset.
          </p>
        </div>
      </section>
    </main>
  );
}
