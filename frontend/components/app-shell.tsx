"use client";
import {
  createContext,
  useContext,
  useState,
  useEffect,
  useRef,
  useSyncExternalStore,
} from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { api, errorMessage } from "@/lib/api";
import type { User } from "@/lib/types";
import { Icon } from "./icon";
import { Brand } from "./brand";
const UserContext = createContext<User | null>(null);
const hydrationSubscription = () => () => {};
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
  // SSR markup can be clicked before React attaches handlers, especially in dev.
  const hydrated = useSyncExternalStore(
    hydrationSubscription,
    () => true,
    () => false,
  );
  const [collapsed, setCollapsed] = useState(false);
  const menuButton = useRef<HTMLButtonElement>(null);
  const navigation = useRef<HTMLElement>(null);
  const [open, setOpen] = useState(false);
  useEffect(() => {
    if (!open) return;
    const previous = document.activeElement as HTMLElement;
    navigation.current?.querySelector<HTMLAnchorElement>("nav a")?.focus();
    return () => previous?.focus();
  }, [open]);
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
        className={`app-shell ${collapsed ? "sidebar-collapsed" : ""}`}
        onKeyDown={(event) => {
          if (event.key === "Escape") setOpen(false);
        }}
      >
        <a className="skip-link" href="#main-content">
          Skip to content
        </a>
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
          ref={navigation}
          aria-label="Workspace navigation"
          onKeyDown={(event) => {
            if (!open || event.key !== "Tab") return;
            const controls =
              navigation.current?.querySelectorAll<HTMLElement>("a,button");
            if (!controls?.length) return;
            const first = controls[0],
              last = controls[controls.length - 1];
            if (event.shiftKey && document.activeElement === first) {
              event.preventDefault();
              last.focus();
            } else if (!event.shiftKey && document.activeElement === last) {
              event.preventDefault();
              first.focus();
            }
          }}
        >
          <Brand />
          <button
            className="sidebar-collapse"
            disabled={!hydrated}
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            aria-expanded={!collapsed}
            onClick={() => setCollapsed(!collapsed)}
          >
            <Icon name="chevron" />
          </button>
          <button
            className="drawer-close"
            aria-label="Close navigation drawer"
            onClick={() => setOpen(false)}
          >
            <Icon name="close" />
          </button>
          <nav aria-label="Main navigation">
            {navigationGroups.map((group) => {
              const links = group.links.filter(([, , permission]) =>
                permission.split("|").some((p) => p.startsWith("role:") ? user.roles.includes(p.slice(5)) : user.permissions.includes(p)),
              );
              return (
                links.length > 0 && (
                  <section className="nav-group" key={group.title}>
                    <p className="nav-caption">{group.title}</p>
                    {links.map(([href, title, , icon]) => (
                      <Link
                        href={href}
                        key={href}
                        title={title}
                        aria-current={isActive(path, href) ? "page" : undefined}
                        className={isActive(path, href) ? "nav-active" : ""}
                        onClick={() => setOpen(false)}
                      >
                        <Icon name={icon} />
                        <span>{title}</span>
                      </Link>
                    ))}
                  </section>
                )
              );
            })}
          </nav>
          <div className="sidebar-footer">
            <p>{user.display_name}</p>
            <span>{user.roles.join(" · ").replaceAll("_", " ")}</span>
            <p>AM Building Solutions</p>
            <span>Internal ERP · UAE</span>
          </div>
        </aside>
        <div className="app-main" inert={open ? true : undefined}>
          <header className="app-topbar">
            <div className="topbar-left">
              <button
                className="menu-toggle"
                disabled={!hydrated}
                ref={menuButton}
                aria-expanded={open}
                aria-controls="app-navigation"
                onClick={() => setOpen(!open)}
              >
                <Icon name="menu" />
                <span className="sr-only">Menu</span>
              </button>
              <div className="breadcrumb">
                <span>AMBS / Workspace</span>
                <strong>{pageTitle(path)}</strong>
              </div>
            </div>
            <div className="user-menu">
              <span className="avatar" aria-hidden="true">
                {user.display_name.slice(0, 2).toUpperCase()}
              </span>
              <div>
                <strong>{user.display_name}</strong>
                <span title={user.username}>
                  {user.roles.join(" · ").replaceAll("_", " ")}
                </span>
              </div>
              <button onClick={logout} disabled={busy || !hydrated}>
                {busy ? "Signing out…" : "Sign out"}
              </button>
            </div>
          </header>
          {error && (
            <p className="notice error" role="alert">
              {error}
            </p>
          )}
          <main id="main-content" className="app-page" tabIndex={-1}>
            {children}
          </main>
        </div>
      </div>
    </UserContext.Provider>
  );
}

const navigationGroups = [
  {
    title: "Overview",
    links: [["/", "Dashboard", "system.read", "dashboard"]],
  },
  {
    title: "Business",
    links: [
      ["/master/customers", "Customers", "customers.read", "people"],
      ["/master/projects", "Projects", "projects.read", "building"],
      ["/master/lpos", "LPO references", "lpos.read", "document"],
      [
        "/sales",
        "Orders & dispatch",
        "sales.orders.read|sales.deliveries.read|deliveries.trip.own",
        "truck",
      ],
    ],
  },
  {
    title: "Operations",
    links: [
      ["/imports", "Import Center", "role:SUPER_ADMIN|role:OPERATIONS", "document"],
      ["/inventory/overview", "Inventory", "inventory.read", "box"],
      ["/inventory-reconciliation", "Stock reconciliation", "inventory.read", "box"],
      ["/item-journey", "Global Item Journey", "items.trace.company", "box"],
      ["/packing", "Packing documents", "packing.read", "document"],
      ["/material-plans", "Material requirements", "material_plans.read", "production"],
      ["/inventory/warehouses", "Warehouses", "inventory.read", "building"],
      [
        "/purchasing/purchasing-dashboard",
        "Purchasing",
        "purchasing.orders.read",
        "document",
      ],
      [
        "/purchasing/production-dashboard",
        "External production",
        "production.read",
        "production",
      ],
      ["/purchasing/suppliers", "Suppliers", "suppliers.read", "people"],
    ],
  },
  {
    title: "Catalog",
    links: [
      ["/master/items", "Items", "items.read", "box"],
      ["/boms", "Bills of materials", "bom.read", "box"],
      [
        "/master/categories",
        "Product categories",
        "items.read|categories.manage",
        "dashboard",
      ],
      [
        "/master/units",
        "Units of measure",
        "items.read|units.manage",
        "document",
      ],
      [
        "/master/families",
        "Families & variants",
        "items.read|families.manage",
        "box",
      ],
    ],
  },
  {
    title: "Administration",
    links: [
      ["/users", "Users & access", "users.read", "shield"],
      ["/audit", "Audit history", "audit.read", "document"],
      ["/system", "System status", "system.read", "pulse"],
    ],
  },
];
function isActive(path: string, href: string) {
  if (href === "/") return path === "/";
  if (href === "/inventory/overview")
    return path.startsWith("/inventory/") && path !== "/inventory/warehouses";
  if (href === "/purchasing/purchasing-dashboard")
    return (
      path.startsWith("/purchasing/") &&
      !["production", "suppliers"].some((v) => path.includes(v))
    );
  if (href === "/purchasing/production-dashboard")
    return path.includes("/purchasing/production");
  return path === href || path.startsWith(href + "/");
}
function pageTitle(path: string) {
  const exact = navigationGroups
    .flatMap((g) => g.links)
    .find(([href]) => href === path);
  if (exact) return exact[1];
  const segment = path.split("/").filter(Boolean).at(-1) ?? "Dashboard";
  return /^[0-9a-f-]{36}$/.test(segment)
    ? "Record details"
    : segment.replaceAll("-", " ").replace(/^./, (c) => c.toUpperCase());
}
