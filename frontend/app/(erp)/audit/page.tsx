import { requireUserPermission } from "@/lib/server-api";
import { AuditScreen } from "./audit-screen";
export default async function AuditPage() {
  await requireUserPermission("audit.read");
  return <AuditScreen />;
}
