import { getHub } from "@/lib/live/hub";

export const dynamic = "force-dynamic";

/** Sanctuary screens ask on every reconnect whether an outro is playing. */
export async function GET() {
  const hub = await getHub();
  return Response.json({ sanctuaryOverride: hub.state.sanctuaryOverride ?? null }, { headers: { "Cache-Control": "no-store" } });
}
