import { notFound } from "next/navigation";
import { requireUserPermission } from "@/lib/server-api";
import { isResource } from "@/lib/master-data";
import { MasterScreen } from "@/components/master-screen";
export default async function MasterPage({
  params,
}: {
  params: Promise<{ resource: string }>;
}) {
  const { resource } = await params;
  if (!isResource(resource)) notFound();
  await requireUserPermission(
    ["categories", "units", "families"].includes(resource)
      ? ["items.read", `${resource}.manage`]
      : `${resource}.read`,
  );
  return <MasterScreen resource={resource} />;
}
