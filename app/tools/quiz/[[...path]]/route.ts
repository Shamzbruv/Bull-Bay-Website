import { readFile } from "node:fs/promises";
import path from "node:path";
import { churchToolsAccess, toolsPageDenied } from "@/lib/tools/access";

// Quiz Night (tools/quiz) is a single-page app: its scripts, styles and
// images are built into public/tools/quiz, and every page address under
// /tools/quiz gets the same HTML page from here once the visitor is
// confirmed as a church admin. The one exception is the buzzer page players
// open on their phones by scanning the QR code on the big screen.

const SHELL = path.join(process.cwd(), "tools/quiz/dist-shell/index.html");
const PLAYER_BUZZER = /^game\/[^/]+\/buzzer$/;

export async function GET(request: Request, { params }: { params: Promise<{ path?: string[] }> }) {
  const { path: parts = [] } = await params;
  const subpath = parts.join("/");
  // A missing script or image (e.g. an old cached page asking for last
  // build's file) is a 404, not the app's HTML.
  if (/\.[a-z0-9]+$/i.test(subpath)) return new Response("Not found", { status: 404 });

  if (!PLAYER_BUZZER.test(subpath)) {
    const access = await churchToolsAccess();
    if (access !== "admin") {
      const url = new URL(request.url);
      return toolsPageDenied(access, url.pathname + url.search, "Quiz Night");
    }
  }

  let html: string;
  try {
    html = await readFile(SHELL, "utf8");
  } catch {
    return new Response("Quiz Night hasn't been built on this server (npm run build:tools).", { status: 503 });
  }
  return new Response(html, {
    headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "private, no-store" },
  });
}
