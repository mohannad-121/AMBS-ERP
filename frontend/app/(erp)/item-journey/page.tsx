import { requireUserPermission } from "@/lib/server-api";
import { InventoryReview } from "@/components/inventory-review";
export default async function ItemJourneyPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  await requireUserPermission("items.trace.company");
  await requireUserPermission("items.trace.read");
  const query = await searchParams;
  const item = typeof query.item === "string" && /^[0-9a-f-]{36}$/.test(query.item) ? query.item : "";
  return <InventoryReview mode="journey" initialItem={item} />;
}
