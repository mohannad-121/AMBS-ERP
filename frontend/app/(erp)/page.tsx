import { requireUserPermission } from "@/lib/server-api";
import { getSystemStatus } from "@/lib/status";
import { StatusPanel } from "../status-panel";
export default async function Dashboard() {
  await requireUserPermission("system.read");
  return (
    <>
      <div className="page-header">
        <div>
          <p className="eyebrow">WORKSPACE</p>
          <h1>System status</h1>
          <p>Connectivity across your AMBS ERP environment.</p>
        </div>
      </div>
      <StatusPanel initialStatus={await getSystemStatus()} />
    </>
  );
}
