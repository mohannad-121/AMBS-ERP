"use client";
import { createContext, useContext, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { api, errorMessage } from "@/lib/api";
import type { User } from "@/lib/types";
import { Brand } from "./brand";
const UserContext = createContext<User | null>(null);
export function useUser() {
  const user = useContext(UserContext);
  if (!user) throw new Error("Authenticated user context is required");
  return user;
}
export function AppShell({
  user,
  children,
}: {
  user: User;
  children: React.ReactNode;
}) {
  const path = usePathname();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function logout() {
    setBusy(true);
    setError("");
    try {
      await api("/auth/logout", { method: "POST" });
      window.location.replace("/login");
    } catch (error) {
      setError(errorMessage(error));
      setBusy(false);
    }
  }
  return (
    <UserContext.Provider value={user}>
      <div
        className="app-shell"
        onKeyDown={(event) => {
          if (event.key === "Escape") setOpen(false);
        }}
      >
        {open && (
          <button
            className="nav-backdrop"
            aria-label="Close navigation"
            onClick={() => setOpen(false)}
          />
        )}
        <aside
          className={`sidebar ${open ? "sidebar-open" : ""}`}
          id="app-navigation"
        >
          <Brand />
          <p className="nav-caption">WORKSPACE</p>
          <nav aria-label="Main navigation">
            {[
              ["/", "System status", "system.read"],
              ["/inventory/overview", "Inventory", "inventory.read"],
              ["/sales", "Orders & dispatch", "sales.orders.read|sales.deliveries.read|deliveries.trip.own"],
              [
                "/purchasing/purchasing-dashboard",
                "Purchasing",
                "purchasing.orders.read",
              ],
              [
                "/purchasing/production-dashboard",
                "External production",
                "production.read",
              ],
              ["/master/customers", "Customers", "customers.read"],
              ["/master/projects", "Projects", "projects.read"],
              ["/master/lpos", "LPO references", "lpos.read"],
              ["/master/items", "Items", "items.read"],
              [
                "/master/categories",
                "Product categories",
                "items.read|categories.manage",
              ],
              ["/master/units", "Units of measure", "items.read|units.manage"],
              [
                "/master/families",
                "Families & variants",
                "items.read|families.manage",
              ],
              ["/users", "Users & access", "users.read"],
              ["/audit", "Audit history", "audit.read"],
            ]
              .filter(([, , permission]) =>
                permission
                  .split("|")
                  .some((value) => user.permissions.includes(value)),
              )
              .map(([href, title]) => (
                <Link
                  href={href}
                  key={href}
                  aria-current={path === href ? "page" : undefined}
                  className={path === href ? "nav-active" : ""}
                  onClick={() => setOpen(false)}
                >
                  {title}
                </Link>
              ))}
          </nav>
          <div className="sidebar-footer">
            <p>AM Building Solutions</p>
            <span>Internal ERP</span>
          </div>
        </aside>
        <div className="app-main">
          <header className="app-topbar">
            <div className="topbar-left">
              <button
                className="menu-toggle"
                aria-expanded={open}
                aria-controls="app-navigation"
                onClick={() => setOpen(!open)}
              >
                Menu
              </button>
              <span>AMBS Internal ERP</span>
            </div>
            <div className="user-menu">
              <div>
                <strong>{user.display_name}</strong>
                <span>{user.username}</span>
              </div>
              <button onClick={logout} disabled={busy}>
                {busy ? "Signing out…" : "Sign out"}
              </button>
            </div>
          </header>
          {error && (
            <p className="notice error" role="alert">
              {error}
            </p>
          )}
          <main className="app-page">{children}</main>
        </div>
      </div>
    </UserContext.Provider>
  );
}
