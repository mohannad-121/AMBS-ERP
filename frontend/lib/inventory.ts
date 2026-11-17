export type InventoryRow = {
  id: string;
  name?: string;
  code?: string;
  status?: string;
  kind?: string;
  [key: string]: unknown;
};
export const inventoryScreens = {
  overview: "Inventory Overview",
  balances: "Stock Balances",
  movements: "Movement History",
  receipts: "Goods Receipts",
  issues: "Stock Issues",
  transfers: "Internal Transfers",
  reservations: "Reservations",
  counts: "Stock Counts",
  adjustments: "Stock Adjustments",
  "low-stock": "Low Stock",
  warehouses: "Warehouses",
  locations: "Storage Locations",
  traceability: "Lot / Serial Traceability",
  quality: "Damaged & Quarantined Stock",
} as const;
export type InventoryScreen = keyof typeof inventoryScreens;
export function isInventoryScreen(value: string): value is InventoryScreen {
  return Object.hasOwn(inventoryScreens, value);
}
export function movementCategory(kind: string): string {
  if (["RECEIPT", "RETURN"].includes(kind)) return "receipts";
  if (kind === "ISSUE") return "issues";
  if (["ADJUSTMENT_IN", "ADJUSTMENT_OUT", "COUNT_ADJUSTMENT"].includes(kind))
    return "adjustments";
  return "transfers";
}
export function movementPermission(kind: string, action: "create" | "post") {
  const category = movementCategory(kind);
  return `inventory.${category}.${category === "adjustments" ? "post" : action}`;
}
