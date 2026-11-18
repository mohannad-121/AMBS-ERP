import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/server-api";
import { ImportCenter } from "@/components/import-center";

export default async function Page() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (!user.roles.some(role => ["SUPER_ADMIN", "OPERATIONS"].includes(role))) redirect("/forbidden");
  return <ImportCenter />;
}
