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
type ApiOptions = { method?: string; body?: unknown };
const dashboardReads = new Set<AbortController>();
let pendingLogouts = 0;
let reviewSignedOut = false;

export async function api<T>(
  path: string,
  options: ApiOptions = {},
): Promise<T> {
  const logout = path === "/auth/logout" && options.method !== undefined && options.method !== "GET";
  const dashboard = path === "/dashboard" && (options.method ?? "GET") === "GET";
  const durableReview = path.startsWith("/onboarding/review/") && (options.method ?? "GET") === "GET";
  if ((dashboard || durableReview) && (pendingLogouts || durableReview && reviewSignedOut)) throw new DOMException("Review read cancelled for sign out", "AbortError");
  const controller = dashboard || durableReview ? new AbortController() : undefined;
  if (controller) dashboardReads.add(controller);
  if (logout) {
    pendingLogouts++;
    reviewSignedOut = true;
    // Snapshot access is revalidated at completion. Cancel obsolete reads before
    // revoking the session so their late 401 cannot override successful logout.
    for (const read of dashboardReads) read.abort();
  }
  try {
    const result = await request<T>(path, options, controller?.signal);
    if (path === "/auth/login" && options.method === "POST") reviewSignedOut = false;
    return result;
  } catch (failure) {
    if (logout) reviewSignedOut = false;
    throw failure;
  } finally {
    if (controller) dashboardReads.delete(controller);
    if (logout) pendingLogouts--;
  }
}

async function request<T>(
  path: string,
  options: ApiOptions,
  cancellation?: AbortSignal,
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
    signal: cancellation
      ? AbortSignal.any([cancellation, AbortSignal.timeout(15000)])
      : AbortSignal.timeout(15000),
  });
  const data = await response.json();
  cancellation?.throwIfAborted();
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
