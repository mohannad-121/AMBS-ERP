import { requireUserPermission } from "@/lib/server-api";
import { InventoryReview } from "@/components/inventory-review";
export default async function ReconciliationPage() {
  await requireUserPermission("inventory.read");
  return <InventoryReview mode="reconciliation" />;
}
