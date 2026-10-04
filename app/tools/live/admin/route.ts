import { readFile } from "node:fs/promises";
import path from "node:path";
import { churchToolsAccess, toolsPageDenied } from "@/lib/tools/access";

// The Live Countdown control panel. Its page lives outside public/ so it
// can only be reached through this admin check; its script and styles
// (public/tools/live/admin.js, admin.css) hold nothing private, and every
// change it makes is checked again on the server (lib/live/hub.ts).

const PAGE = path.join(process.cwd(), "tools/live/admin.html");

export async function GET() {
  const access = await churchToolsAccess();
  if (access !== "admin") return toolsPageDenied(access, "/tools/live/admin", "The Live Countdown control panel");
  return new Response(await readFile(PAGE, "utf8"), {
    headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "private, no-store" },
  });
}
