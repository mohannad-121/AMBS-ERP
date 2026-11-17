import { requireUserPermission } from "@/lib/server-api";
import { Dashboard } from "@/components/dashboard";
export default async function Home() {
  await requireUserPermission("system.read");
  return <Dashboard />;
}
