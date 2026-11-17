"use client";
import { useState } from "react";
import { api, errorMessage } from "@/lib/api";
import { useResource } from "@/lib/use-resource";
import type { Page, Role, User } from "@/lib/types";
import { useUser } from "@/components/app-shell";
import { Modal, Pagination, PasswordField, utcTime } from "@/components/forms";

type ModalState =
  { kind: "create" } | { kind: "edit" | "reset" | "activation"; user: User };
type AccountData = {
  username: string;
  email: string | null;
  display_name: string;
  roles?: string[];
  password?: string;
};

function AccountForm({
  user,
  roles,
  canAssignRoles,
  busy,
  error,
  onSave,
  onCancel,
}: {
  user?: User;
  roles: Role[];
  canAssignRoles: boolean;
  busy: boolean;
  error: string;
  onSave: (body: AccountData) => void;
  onCancel: () => void;
}) {
  const [selected, setSelected] = useState(user?.roles ?? []);
  function submit(event: React.SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const body: AccountData = {
      username: String(data.get("username")),
      email: String(data.get("email")).trim() || null,
      display_name: String(data.get("display_name")),
    };
    if (canAssignRoles) body.roles = selected;
    if (!user) body.password = String(data.get("password"));
    onSave(body);
  }
  return (
    <form onSubmit={submit} aria-busy={busy}>
      <fieldset disabled={busy}>
        <div className="field">
          <label htmlFor="display-name">Full name</label>
          <input
            id="display-name"
            name="display_name"
            required
            maxLength={120}
            defaultValue={user?.display_name}
            autoComplete="name"
          />
        </div>
        <div className="form-grid">
          <div className="field">
            <label htmlFor="account-username">Username</label>
            <input
              id="account-username"
              name="username"
              required
              minLength={3}
              maxLength={64}
              pattern="[a-zA-Z0-9][a-zA-Z0-9_.\-]{2,63}"
              autoCapitalize="none"
              spellCheck={false}
              defaultValue={user?.username}
              aria-describedby="username-hint"
            />
            <p id="username-hint" className="field-hint">
              Letters, numbers, dots, underscores or hyphens.
            </p>
          </div>
          <div className="field">
            <label htmlFor="account-email">
              Email <span className="optional">(optional)</span>
            </label>
            <input
              id="account-email"
              name="email"
              type="email"
              maxLength={254}
              defaultValue={user?.email ?? ""}
              autoComplete="email"
            />
          </div>
        </div>
        {!user && <PasswordField newPassword label="Initial password" />}
        {canAssignRoles && (
          <fieldset className="role-selector">
            <legend>Roles</legend>
            <p className="field-hint">
              Select the access this account needs. Role changes end the user’s
              current sessions.
            </p>
            <div className="role-grid">
              {roles.map((role) => (
                <label className="role-option" key={role.id}>
                  <input
                    type="checkbox"
                    checked={selected.includes(role.code)}
                    onChange={(event) =>
                      setSelected(
                        event.target.checked
                          ? [...selected, role.code]
                          : selected.filter((value) => value !== role.code),
                      )
                    }
                  />
                  <span>
                    {role.code.replaceAll("_", " ")}
                    <small>{role.description}</small>
                  </span>
                </label>
              ))}
            </div>
          </fieldset>
        )}
        {error && (
          <p className="notice error" role="alert">
            {error}
          </p>
        )}
        <div className="modal-actions">
          <button type="button" onClick={onCancel}>
            Cancel
          </button>
          <button type="submit" className="primary">
            {busy ? "Saving…" : user ? "Save account" : "Create account"}
          </button>
        </div>
      </fieldset>
    </form>
  );
}

export function UsersScreen() {
  const currentUser = useUser();
  const can = (permission: string) =>
    currentUser.permissions.includes(permission);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const list = useResource<Page<User>>(
    `/users?page=${page}&search=${encodeURIComponent(search)}`,
  );
  const roles = useResource<Role[]>("/roles");
  const [modal, setModal] = useState<ModalState | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  function open(value: ModalState) {
    setError("");
    setModal(value);
  }
  async function save(
    path: string,
    method: string,
    body: unknown,
    message: string,
  ) {
    setBusy(true);
    setError("");
    try {
      await api(path, { method, body });
      if (
        modal &&
        modal.kind !== "create" &&
        modal.user.id === currentUser.id
      ) {
        window.location.replace("/");
        return;
      }
      setModal(null);
      setNotice(message);
      list.reload();
    } catch (error) {
      setError(errorMessage(error));
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <div className="page-header">
        <div>
          <p className="eyebrow">SECURITY ADMINISTRATION</p>
          <h1>Users & access</h1>
          <p>Manage company accounts, roles and account security.</p>
        </div>
        {can("users.create") && (
          <button
            className="primary"
            onClick={() => open({ kind: "create" })}
            disabled={roles.loading || !!roles.error}
          >
            Create user
          </button>
        )}
      </div>
      {notice && (
        <p className="notice success" role="status">
          {notice}
        </p>
      )}
      {roles.error && (
        <p className="notice error" role="alert">
          Role catalog could not be loaded.{" "}
          <button onClick={roles.reload}>Try again</button>
        </p>
      )}
      <section className="data-panel" aria-label="User accounts">
        <form
          className="filter-bar"
          onSubmit={(event) => {
            event.preventDefault();
            setSearch(String(new FormData(event.currentTarget).get("search")));
            setPage(1);
          }}
        >
          <div className="field">
            <label htmlFor="user-search">Search users</label>
            <input
              id="user-search"
              name="search"
              type="search"
              maxLength={120}
              placeholder="Name, username or email"
            />
          </div>
          <button type="submit">Search</button>
          <button type="button" onClick={list.reload} disabled={list.loading}>
            Refresh
          </button>
        </form>
        {list.loading ? (
          <p className="table-message" role="status">
            Loading accounts…
          </p>
        ) : list.error ? (
          <p className="notice error" role="alert">
            {list.error} <button onClick={list.reload}>Try again</button>
          </p>
        ) : (
          <>
            <div className="table-scroll">
              <table>
                <caption className="sr-only">
                  Company user accounts and assigned roles
                </caption>
                <thead>
                  <tr>
                    <th scope="col">Account</th>
                    <th scope="col">Roles</th>
                    <th scope="col">Status</th>
                    <th scope="col">Updated</th>
                    <th scope="col">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {list.data?.items.map((user) => (
                    <tr key={user.id}>
                      <td>
                        <strong>{user.display_name}</strong>
                        <span className="table-subtext">{user.username}</span>
                        {user.email && (
                          <span className="table-subtext">{user.email}</span>
                        )}
                      </td>
                      <td>
                        <div className="role-badges">
                          {user.roles.length ? (
                            user.roles.map((role) => (
                              <span className="neutral-badge" key={role}>
                                {role.replaceAll("_", " ")}
                              </span>
                            ))
                          ) : (
                            <span className="muted">No roles assigned</span>
                          )}
                        </div>
                      </td>
                      <td>
                        <span
                          className={`badge ${user.is_active ? "healthy" : "degraded"}`}
                        >
                          {user.is_active ? "Active" : "Inactive"}
                        </span>
                      </td>
                      <td>
                        <time
                          dateTime={user.updated_at}
                          className="table-subtext"
                        >
                          {utcTime(user.updated_at)}
                        </time>
                      </td>
                      <td>
                        <div className="row-actions">
                          {can("users.update") && (
                            <button
                              onClick={() => open({ kind: "edit", user })}
                              disabled={roles.loading || !!roles.error}
                            >
                              Edit
                              <span className="sr-only"> {user.username}</span>
                            </button>
                          )}
                          {can("users.reset_password") && (
                            <button
                              onClick={() => open({ kind: "reset", user })}
                            >
                              Reset password
                              <span className="sr-only">
                                {" "}
                                for {user.username}
                              </span>
                            </button>
                          )}
                          {can("users.update") && (
                            <button
                              className={user.is_active ? "danger-text" : ""}
                              onClick={() => open({ kind: "activation", user })}
                            >
                              {user.is_active ? "Deactivate" : "Activate"}
                              <span className="sr-only"> {user.username}</span>
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {list.data?.items.length === 0 && (
                <p className="table-message">No accounts match this search.</p>
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
      {modal && (
        <Modal
          title={
            modal.kind === "create"
              ? "Create user"
              : modal.kind === "edit"
                ? "Edit account"
                : modal.kind === "reset"
                  ? "Reset password"
                  : modal.user.is_active
                    ? "Deactivate account?"
                    : "Activate account?"
          }
          onClose={() => setModal(null)}
          busy={busy}
        >
          {(modal.kind === "create" || modal.kind === "edit") && (
            <AccountForm
              key={modal.kind === "create" ? "create" : modal.user.id}
              user={modal.kind === "edit" ? modal.user : undefined}
              roles={roles.data ?? []}
              canAssignRoles={can("users.roles")}
              busy={busy}
              error={error}
              onCancel={() => setModal(null)}
              onSave={(body) =>
                void save(
                  modal.kind === "create"
                    ? "/users"
                    : `/users/${modal.user.id}`,
                  modal.kind === "create" ? "POST" : "PATCH",
                  body,
                  modal.kind === "create"
                    ? "User account created."
                    : "Account updated.",
                )
              }
            />
          )}
          {modal.kind === "reset" && (
            <form
              onSubmit={(event) => {
                event.preventDefault();
                void save(
                  `/users/${modal.user.id}/password`,
                  "POST",
                  {
                    password: new FormData(event.currentTarget).get("password"),
                  },
                  "Password reset. The user’s sessions have ended.",
                );
              }}
              aria-busy={busy}
            >
              <p>
                Set a new password for <strong>{modal.user.username}</strong>.
                This will end every active session for this account.
              </p>
              <fieldset disabled={busy}>
                <PasswordField newPassword label="New password" />
                {error && (
                  <p className="notice error" role="alert">
                    {error}
                  </p>
                )}
                <div className="modal-actions">
                  <button type="button" onClick={() => setModal(null)}>
                    Cancel
                  </button>
                  <button className="primary" type="submit">
                    {busy ? "Resetting…" : "Confirm password reset"}
                  </button>
                </div>
              </fieldset>
            </form>
          )}
          {modal.kind === "activation" && (
            <div>
              <p>
                {modal.user.is_active
                  ? "This account will lose access and all of its sessions will end."
                  : "This account will be able to sign in again."}
              </p>
              <p>
                <strong>{modal.user.display_name}</strong> ·{" "}
                {modal.user.username}
              </p>
              {error && (
                <p className="notice error" role="alert">
                  {error}
                </p>
              )}
              <div className="modal-actions">
                <button onClick={() => setModal(null)} disabled={busy}>
                  Cancel
                </button>
                <button
                  className={modal.user.is_active ? "danger" : "primary"}
                  disabled={busy}
                  onClick={() =>
                    void save(
                      `/users/${modal.user.id}/activation`,
                      "PATCH",
                      { is_active: !modal.user.is_active },
                      modal.user.is_active
                        ? "Account deactivated."
                        : "Account activated.",
                    )
                  }
                >
                  {busy
                    ? "Saving…"
                    : modal.user.is_active
                      ? "Deactivate account"
                      : "Activate account"}
                </button>
              </div>
            </div>
          )}
        </Modal>
      )}
    </>
  );
}
