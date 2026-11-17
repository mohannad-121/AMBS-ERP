import { requireUserPermission } from "@/lib/server-api";
import { UsersScreen } from "./users-screen";
export default async function UsersPage() {
  await requireUserPermission("users.read");
  return <UsersScreen />;
}
