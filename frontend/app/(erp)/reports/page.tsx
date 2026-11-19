import { requireUserPermission } from "@/lib/server-api";
import { ReportingCenter } from "@/components/reporting-center";

export default async function ReportsPage() {
  await requireUserPermission(["sales.orders.read", "purchasing.orders.read", "inventory.read", "production.read", "sales.deliveries.read", "packing.company"]);
  return <ReportingCenter />;
}
