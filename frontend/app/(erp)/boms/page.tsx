import { requireUserPermission } from "@/lib/server-api";
import { BomScreen } from "@/components/manufacturing-screen";
export default async function Page({ searchParams }: { searchParams: Promise<Record<string,string|undefined>> }) {
  await requireUserPermission("bom.read");
  const supplied=await searchParams;
  const q=Object.fromEntries(Object.entries(supplied).map(([k,v])=>[k, typeof v==="string" && /^[0-9a-f-]{36}$/.test(v) ? v : undefined]));
  return <BomScreen itemId={q.item} initialId={q.id} />;
}
