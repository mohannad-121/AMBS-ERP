import { NextRequest } from "next/server";
import { proxy } from "@/lib/proxy";
export const dynamic = "force-dynamic";
export async function GET(request: NextRequest) {
  return proxy(request, "system/status");
}
