import { getHub, handleEvents } from "@/lib/live/hub";

// What a screen or control panel sends (Socket.IO's `emit`). The page sends
// its connection id with a batch of events, in order. Whether a change is
// allowed is decided by that connection: control-panel changes only from a
// connection opened by a signed-in church admin (lib/live/hub.ts).

export async function POST(request: Request) {
  const body: unknown = await request.json().catch(() => null);
  if (!body || typeof body !== "object") return Response.json({ error: "Bad request" }, { status: 400 });
  const { clientId, events } = body as { clientId?: unknown; events?: unknown };
  if (typeof clientId !== "string" || !Array.isArray(events)) return Response.json({ error: "Bad request" }, { status: 400 });

  const hub = await getHub();
  const result = handleEvents(hub, clientId, events.slice(0, 100));
  // Unknown connection: this server restarted (e.g. a website update) since
  // the page connected. The page reconnects and sends again.
  if (result === "unknown-client") return Response.json({ error: "Reconnect", code: "RECONNECT" }, { status: 409 });
  return Response.json({ ok: true });
}
