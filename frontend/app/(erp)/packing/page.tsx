import { requireUserPermission } from "@/lib/server-api";
import { PackingScreen } from "@/components/packing-screen";
export default async function Page({ searchParams }: { searchParams: Promise<Record<string,string|undefined>> }) {
  await requireUserPermission("packing.read");
  const supplied=await searchParams;
  const q=Object.fromEntries(Object.entries(supplied).map(([k,v])=>[k, typeof v==="string" && /^[0-9a-f-]{36}$/.test(v) ? v : undefined]));
  return <PackingScreen initialDelivery={q.delivery} />;
}
