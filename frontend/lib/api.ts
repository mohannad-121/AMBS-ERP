"use client";
export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
  ) {
    super(message);
  }
}
export async function api<T>(
  path: string,
  options: { method?: string; body?: unknown } = {},
): Promise<T> {
  const method = options.method ?? "GET";
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (method !== "GET") {
    const response = await fetch("/api/auth/csrf", {
      cache: "no-store",
      signal: AbortSignal.timeout(12000),
    });
    if (!response.ok)
      throw new ApiError(
        response.status,
        "CSRF_UNAVAILABLE",
        "Unable to prepare a secure request. Please try again.",
      );
    const csrf = (await response.json()) as { csrf_token: string };
    headers["X-CSRF-Token"] = csrf.csrf_token;
  }
  const response = await fetch(`/api${path}`, {
    method,
    headers,
    cache: "no-store",
    credentials: "same-origin",
    body: method === "GET" ? undefined : JSON.stringify(options.body ?? {}),
    signal: AbortSignal.timeout(15000),
  });
  const data = await response.json();
  if (!response.ok) {
    if (response.status === 401 && path !== "/auth/login")
      window.location.replace("/unauthorized");
    throw new ApiError(
      response.status,
      data.error?.code ?? "REQUEST_FAILED",
      (data.error?.message ?? "The request could not be completed.") +
        (data.error?.fields?.length ? " Fields: " + data.error.fields.map((field: { field: string }) => field.field.replaceAll("_", " ")).join(", ") : ""),
    );
  }
  return data as T;
}
export function errorMessage(error: unknown): string {
  return error instanceof ApiError
    ? error.message
    : "The service could not be reached. Please try again.";
}
