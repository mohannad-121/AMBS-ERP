export type PurchaseRow = {
  id: string;
  name?: string;
  code?: string;
  status?: string;
  [key: string]: unknown;
};
export const purchasingScreens = {
  "purchasing-dashboard": "Purchasing Dashboard",
  "production-dashboard": "Production Dashboard",
  suppliers: "Supplier Directory",
  contacts: "Supplier Contacts",
  catalog: "Supplier Material Catalog",
  quotations: "Supplier Quotations",
  comparison: "Price Comparison",
  requests: "Purchase Requests",
  orders: "Purchase Orders",
  receipts: "Purchase Goods Receipts",
  outstanding: "Outstanding Purchases",
  production: "Outsourced Production",
  timeline: "Production Stage Timeline",
  transfers: "External Material Transfers",
  "custody-locations": "External Custody Locations",
  schedules: "Supplier Delivery Schedule",
  conversions: "Measured Material Conversions",
} as const;
export type PurchaseScreen = keyof typeof purchasingScreens;
export const screenResource = (screen: PurchaseScreen) =>
  screen === "outstanding"
    ? "orders"
    : screen === "timeline"
      ? "production"
      : screen;
export const readPermission = (screen: PurchaseScreen) =>
  screen === "suppliers" || screen === "contacts" || screen === "catalog"
    ? "suppliers.read"
    : screen === "quotations" || screen === "comparison"
      ? "suppliers.prices.read"
      : screen === "requests"
        ? "purchasing.requests.read"
        : [
              "production",
              "timeline",
              "transfers",
              "custody-locations",
              "conversions",
              "production-dashboard",
            ].includes(screen)
          ? "production.read"
          : "purchasing.orders.read";
export const createPermission: Record<string, string> = {
  suppliers: "suppliers.create",
  contacts: "suppliers.update",
  catalog: "suppliers.update",
  quotations: "suppliers.prices.manage",
  requests: "purchasing.requests.create",
  orders: "purchasing.orders.create",
  receipts: "purchasing.receipts.create",
  production: "production.create",
  "custody-locations": "production.manage",
  schedules: "purchasing.orders.confirm",
  conversions: "production.convert",
};
export const singular: Record<string, string> = {
  suppliers: "supplier",
  contacts: "contact",
  catalog: "supplier material",
  quotations: "quotation",
  requests: "purchase request",
  orders: "purchase order",
  receipts: "purchase receipt",
  production: "production order",
  "custody-locations": "custody location",
  schedules: "schedule update",
  conversions: "measured conversion",
};
