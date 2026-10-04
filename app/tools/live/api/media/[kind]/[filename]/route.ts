import { getHub, isMediaInUse } from "@/lib/live/hub";
import { LIBRARY_FOLDERS } from "@/lib/live/media";
import { countdownStore } from "@/lib/live/store";
import { toolsApiDenied } from "@/lib/tools/access";

export async function DELETE(_: Request, { params }: { params: Promise<{ kind: string; filename: string }> }) {
  const denied = await toolsApiDenied();
  if (denied) return denied;
  const { kind, filename } = await params;
  const folder = LIBRARY_FOLDERS[kind];
  if (!folder) return Response.json({ error: 'kind must be "background" or "music"' }, { status: 400 });
  if (!filename || filename.includes("/") || filename.includes("..")) return Response.json({ error: "Bad file name." }, { status: 400 });
  const filePath = `${folder}/${filename}`;

  if (isMediaInUse(await getHub(), filePath)) {
    return Response.json({ error: "Can't delete the item currently in use — switch to another one first." }, { status: 400 });
  }
  const store = countdownStore();
  if (store) {
    try {
      await store.deleteFromLibrary(filePath);
    } catch (error) {
      console.error("[live-countdown]", error instanceof Error ? error.message : error);
      return Response.json({ error: "Delete failed — please try again." }, { status: 500 });
    }
  }
  return Response.json({ ok: true });
}
