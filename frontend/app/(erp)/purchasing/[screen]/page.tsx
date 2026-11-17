import { notFound } from "next/navigation";
import { requireUserPermission } from "@/lib/server-api";
import {
  purchasingScreens,
  readPermission,
  type PurchaseScreen,
} from "@/lib/purchasing";
import { PurchasingScreen } from "@/components/purchasing-screen";
export default async function Page({
  params,
}: {
  params: Promise<{ screen: string }>;
}) {
  const { screen } = await params;
  if (!Object.hasOwn(purchasingScreens, screen)) notFound();
  await requireUserPermission(readPermission(screen as PurchaseScreen));
  return <PurchasingScreen key={screen} screen={screen as PurchaseScreen} />;
}
