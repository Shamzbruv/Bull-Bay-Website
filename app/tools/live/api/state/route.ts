import { getHub } from "@/lib/live/hub";

export const dynamic = "force-dynamic";

export async function GET() {
  const hub = await getHub();
  return Response.json(hub.state, { headers: { "Cache-Control": "no-store" } });
}
