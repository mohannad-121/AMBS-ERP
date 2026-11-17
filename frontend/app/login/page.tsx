import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/server-api";
import { LoginForm } from "./login-form";
export const dynamic = "force-dynamic";
export default async function Login({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const query = await searchParams;
  if (Object.hasOwn(query, "password") || Object.hasOwn(query, "identifier"))
    redirect("/login");
  if (await getCurrentUser()) redirect("/");
  return <LoginForm />;
}
