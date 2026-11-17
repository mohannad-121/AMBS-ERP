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
  params: Promise<{ screen: string; id: string }>;
}) {
  const { screen, id } = await params;
  if (!Object.hasOwn(purchasingScreens, screen) || !/^[0-9a-f-]{36}$/.test(id))
    notFound();
  await requireUserPermission(readPermission(screen as PurchaseScreen));
  return (
    <PurchasingScreen
      key={`${screen}:${id}`}
      screen={screen as PurchaseScreen}
      identity={id}
    />
  );
}
