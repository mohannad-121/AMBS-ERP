import { notFound } from "next/navigation";
import { requireUserPermission } from "@/lib/server-api";
import { isInventoryScreen } from "@/lib/inventory";
import { InventoryScreenView } from "@/components/inventory-screen";
export default async function InventoryPage({
  params,
}: {
  params: Promise<{ screen: string }>;
}) {
  const { screen } = await params;
  if (!isInventoryScreen(screen)) notFound();
  await requireUserPermission("inventory.read");
  return <InventoryScreenView key={screen} screen={screen} />;
}
