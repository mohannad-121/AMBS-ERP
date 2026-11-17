import { notFound } from "next/navigation";
import { requireUserPermission } from "@/lib/server-api";
import { isResource } from "@/lib/master-data";
import { MasterScreen } from "@/components/master-screen";
export default async function MasterDetail({
  params,
}: {
  params: Promise<{ resource: string; id: string }>;
}) {
  const { resource, id } = await params;
  if (!isResource(resource) || !/^[0-9a-f-]{36}$/.test(id)) notFound();
  await requireUserPermission(
    ["categories", "units", "families"].includes(resource)
      ? ["items.read", `${resource}.manage`]
      : `${resource}.read`,
  );
  return <MasterScreen resource={resource} recordId={id} />;
}
