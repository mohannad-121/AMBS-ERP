import { requireUserPermission } from "@/lib/server-api";
import { SalesScreen } from "@/components/sales-screen";
import { DriverTrips } from "@/components/routing-panel";
export default async function Page() {
  const user = await requireUserPermission([
    "sales.orders.read",
    "sales.deliveries.read",
    "deliveries.trip.own",
  ]);
  if (
    !user.permissions.some((p) =>
      ["sales.orders.read", "sales.deliveries.read"].includes(p),
    )
  )
    return <DriverTrips />;
  return <SalesScreen />;
}
