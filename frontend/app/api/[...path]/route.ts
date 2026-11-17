import { NextRequest } from "next/server";
import { proxy } from "@/lib/proxy";
export const dynamic = "force-dynamic";
async function handler(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> },
) {
  return proxy(request, (await params).path.join("/"));
}
export { handler as GET, handler as POST, handler as PATCH, handler as PUT };
