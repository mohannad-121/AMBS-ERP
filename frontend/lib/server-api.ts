import "server-only";
import { cache } from "react";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import type { User } from "./types";
export class ServerApiError extends Error {
  constructor(public status: number) {
    super("The ERP service is unavailable");
  }
}
export async function serverApi<T>(path: string): Promise<T> {
  const incoming = await headers();
  const response = await fetch(
    `${process.env.INTERNAL_API_URL ?? "http://backend:8000"}/api${path}`,
    {
      cache: "no-store",
      signal: AbortSignal.timeout(10000),
      headers: {
        Cookie: (await cookies()).toString(),
        "X-AMBS-BFF-Key": process.env.AUTH_BFF_SECRET ?? "",
        "X-AMBS-External-Proto": incoming.get("x-forwarded-proto") ?? "http",
      },
    },
  );
  if (!response.ok) throw new ServerApiError(response.status);
  return (await response.json()) as T;
}
export const getCurrentUser = cache(async (): Promise<User | null> => {
  try {
    return await serverApi<User>("/auth/me");
  } catch (error) {
    if (error instanceof ServerApiError && error.status === 401) return null;
    throw error;
  }
});
export async function requireUserPermission(
  permission: string | string[],
): Promise<User> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const alternatives = Array.isArray(permission) ? permission : [permission];
  if (!alternatives.some((value) => user.permissions.includes(value)))
    redirect("/forbidden");
  return user;
}
