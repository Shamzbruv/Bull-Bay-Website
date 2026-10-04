import { countdownStore } from "@/lib/live/store";
import { LIBRARY_FOLDERS } from "@/lib/live/media";
import { toolsApiDenied } from "@/lib/tools/access";

/** Background videos/images and music tracks uploaded for the countdown. */
export async function GET(request: Request) {
  const denied = await toolsApiDenied();
  if (denied) return denied;
  const kind = new URL(request.url).searchParams.get("kind") ?? "";
  const folder = LIBRARY_FOLDERS[kind];
  if (!folder) return Response.json({ error: 'kind must be "background" or "music"' }, { status: 400 });
  const store = countdownStore();
  if (!store) return Response.json([]);
  try {
    return Response.json(await store.listLibrary(folder), { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("[live-countdown]", error instanceof Error ? error.message : error);
    return Response.json([]);
  }
}
