import { requireUserPermission } from "@/lib/server-api";
import { MaterialPlansScreen } from "@/components/manufacturing-screen";
export default async function Page({ searchParams }: { searchParams: Promise<Record<string,string|undefined>> }) {
  await requireUserPermission("material_plans.read");
  const supplied=await searchParams;
  const q=Object.fromEntries(Object.entries(supplied).map(([k,v])=>[k, typeof v==="string" && /^[0-9a-f-]{36}$/.test(v) ? v : undefined]));
  return <MaterialPlansScreen itemId={q.item} salesId={q.sales} productionId={q.production} initialId={q.id} />;
}
