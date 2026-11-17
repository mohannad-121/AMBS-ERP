export async function GET() {
  return Response.json(
    { status: "ok", service: "AMBS ERP frontend" },
    { headers: { "Cache-Control": "no-store" } },
  );
}
