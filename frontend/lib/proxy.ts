import "server-only";
import { NextRequest } from "next/server";
const allowedPath =
  /^(auth\/(csrf|login|logout|me)|users(?:\/[0-9a-f-]{36}(?:\/(roles|activation|password))?)?|roles|permissions|audit|system\/status|dashboard)$/;
const requestTooLarge = () =>
  Response.json(
    {
      error: {
        code: "REQUEST_TOO_LARGE",
        message:
          "The request exceeds the allowed size. Reduce the text or image size and try again.",
      },
    },
    { status: 413, headers: { "Cache-Control": "no-store" } },
  );
export async function proxy(
  request: NextRequest,
  path: string,
): Promise<Response> {
  const masterPath =
    /^master\/(customers(?:\/duplicates)?|projects|lpos|items|categories|units|families)(?:\/[0-9a-f-]{36}(?:\/(activation|image))?)?$/.test(
      path,
    );
  const inventoryPath = /^inventory\/(?:review(?:\/physical-preview)?|journey\/[0-9a-f-]{36})$/.test(path) ||
    /^inventory\/(overview|balances|reconciliation|warehouses|locations|movements|reservations|counts|thresholds|lots|policies|options|records)(?:\/(?:[0-9a-f-]{36}|items|warehouses|locations|lots|movements|reservations|counts|thresholds))?(?:\/(?:post|reverse|cancel|release|consume|record|recount|start|status|trace))?$/.test(
      path,
    );
  const purchasingPath =
    /^purchasing\/(dashboard|compare|import-preview|conversions|suppliers|contacts|catalog|quotations|requests|orders|receipts|production|transfers|schedules|custody-locations|stages|options)(?:\/(?:[0-9a-f-]{36}|suppliers|items|units|warehouses|locations|lots|orders|production|quotations|requests))?(?:\/(?:issue|submit|confirm|close|cancel|amend|post|reverse|start|complete|transfer|yard|costs))?$/.test(
      path,
    );
  const salesPath =
    /^sales\/(options|orders|deliveries|availability)(?:\/[0-9a-f-]{36})?(?:\/(?:confirm|edit|amend|cancel|allocate|release|prepare|pick|load|dispatch|reverse))?$/.test(
      path,
    );
  const routingPath =
    /^routing\/(?:mine|sites|deliveries\/[0-9a-f-]{36}(?:\/(?:options|assign|calculate|confirm|trip|journey\/[0-9a-f-]{36}))?)$/.test(
      path,
    );
  const onboardingPath = /^onboarding\/(?:options|inspect|validate|report|reconcile|reconciliation-report)$/.test(path);
  const packingPath = /^(?:packing\/deliveries(?:\/[0-9a-f-]{36}\/(?:documents|preview))?|packing\/documents\/[0-9a-f-]{36}(?:\/(?:download|void))?|boms(?:\/[0-9a-f-]{36}(?:\/(?:submit|approve|archive))?)?|material-plans(?:\/[0-9a-f-]{36}(?:\/review)?)?|manufacturing\/options\/(?:items|orders|production|warehouses))$/.test(path);
  if (
    !onboardingPath &&
    !packingPath &&
    !allowedPath.test(path) &&
    !masterPath &&
    !inventoryPath &&
    !purchasingPath &&
    !salesPath &&
    !routingPath
  )
    return Response.json(
      { error: { code: "NOT_FOUND", message: "Resource not found" } },
      { status: 404 },
    );
  const protocol = request.nextUrl.protocol.replace(":", "");
  if (process.env.APP_ENV === "production" && protocol !== "https")
    return Response.json(
      {
        error: {
          code: "HTTPS_REQUIRED",
          message: "Secure HTTPS access is required",
        },
      },
      { status: 426 },
    );
  const unsafe = !["GET", "HEAD"].includes(request.method);
  const maxBytes = onboardingPath && path !== "onboarding/options" ? 7_000_000 : /^master\/items\/[0-9a-f-]{36}\/image$/.test(path)
    ? 7_000_000
    : inventoryPath || purchasingPath || salesPath || routingPath || packingPath
      ? 65536
      : 16384;
  if (Number(request.headers.get("content-length") ?? 0) > maxBytes)
    return requestTooLarge();
  // Bound the streamed body as well as declared Content-Length.
  let body: Uint8Array<ArrayBuffer> | undefined;
  if (unsafe && request.body) {
    const reader = request.body.getReader();
    const chunks: Uint8Array[] = [];
    let size = 0;
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > maxBytes) {
        await reader.cancel();
        return requestTooLarge();
      }
      chunks.push(value);
    }
    body = new Uint8Array(size);
    let offset = 0;
    for (const chunk of chunks) {
      body.set(chunk, offset);
      offset += chunk.length;
    }
  }
  const cookie = (request.headers.get("cookie") ?? "")
    .split(";")
    .filter((part) => /^(?:__Host-)?ambs_(?:session|csrf)=/.test(part.trim()))
    .join(";");
  try {
    const upstream = await fetch(
      `${process.env.INTERNAL_API_URL ?? "http://backend:8000"}/api/${path}${request.nextUrl.search}`,
      {
        method: request.method,
        body,
        redirect: "manual",
        cache: "no-store",
        signal: AbortSignal.timeout(12000),
        headers: {
          "Content-Type":
            request.headers.get("content-type") ?? "application/json",
          Cookie: cookie,
          Origin: request.headers.get("origin") ?? "",
          "X-CSRF-Token": request.headers.get("x-csrf-token") ?? "",
          "Sec-Fetch-Site": request.headers.get("sec-fetch-site") ?? "",
          "X-AMBS-BFF-Key": process.env.AUTH_BFF_SECRET ?? "",
          "X-AMBS-External-Proto": protocol,
        },
      },
    );
    const headers = new Headers({
      "Content-Type":
        upstream.headers.get("content-type") ?? "application/json",
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
    });
    for (const value of upstream.headers.getSetCookie())
      headers.append("Set-Cookie", value);
    if ((packingPath || onboardingPath) && upstream.headers.get("content-type") && (upstream.headers.get("content-type")?.startsWith("application/pdf") || upstream.headers.get("content-type")?.startsWith("text/csv"))) {
      for (const key of ["Content-Disposition", "X-AMBS-Document-SHA256", "X-AMBS-Source-Status", "X-AMBS-Document-Status"]) {
        const value = upstream.headers.get(key);
        if (value) headers.set(key, value);
      }
    }
    const retryAfter = upstream.headers.get("retry-after");
    if (retryAfter) headers.set("Retry-After", retryAfter);
    return new Response(await upstream.arrayBuffer(), {
      status: upstream.status,
      headers,
    });
  } catch {
    return Response.json(
      {
        error: {
          code: "SERVICE_UNAVAILABLE",
          message: "The ERP service is temporarily unavailable",
        },
      },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }
}
