import { connect, disconnect, getHub, type Role } from "@/lib/live/hub";
import { churchToolsAccess } from "@/lib/tools/access";

// One long-lived connection per sanctuary TV, OBS overlay or control panel
// (Server-Sent Events). Replaces the countdown's Socket.IO connection; see
// lib/live/hub.ts.

export const dynamic = "force-dynamic";

const encoder = new TextEncoder();

export async function GET(request: Request) {
  const requested = new URL(request.url).searchParams.get("role");
  const role: Role = requested === "admin" || requested === "overlay" ? requested : "sanctuary";
  const isAdmin = role === "admin" && (await churchToolsAccess()) === "admin";
  const hub = await getHub();

  let clientId: string | null = null;
  let keepAlive: ReturnType<typeof setInterval> | null = null;
  let closed = false;

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      const write = (chunk: string) => {
        if (closed) return false;
        try {
          controller.enqueue(encoder.encode(chunk));
          return true;
        } catch {
          finish();
          return false;
        }
      };
      const finish = () => {
        if (closed) return;
        closed = true;
        if (keepAlive) clearInterval(keepAlive);
        if (clientId) disconnect(hub, clientId);
        try {
          controller.close();
        } catch {
          // already closed by the client going away
        }
      };
      request.signal.addEventListener("abort", finish);

      // Safari holds back the first 1 KB of a stream; the padding pushes the
      // first real event through immediately. `retry` is how soon a dropped
      // screen reconnects.
      write(`:${" ".repeat(2048)}\nretry: 2000\n\n`);

      if (role === "admin" && !isAdmin) {
        // The page reacts by sending the operator to sign in.
        write(`event: authError\ndata: ${JSON.stringify("Please sign in to the church site again.")}\n\n`);
        finish();
        return;
      }

      const client = connect(hub, role, isAdmin, (event, data) =>
        write(`event: ${event}\ndata: ${JSON.stringify(data ?? null)}\n\n`),
      );
      clientId = client.id;
      // Comments every 15 s keep proxies from closing an idle connection.
      keepAlive = setInterval(() => write(": ping\n\n"), 15000);
    },
    cancel() {
      closed = true;
      if (keepAlive) clearInterval(keepAlive);
      if (clientId) disconnect(hub, clientId);
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      // no-transform keeps compression from holding events back.
      "Cache-Control": "no-cache, no-transform",
      "X-Accel-Buffering": "no",
    },
  });
}
