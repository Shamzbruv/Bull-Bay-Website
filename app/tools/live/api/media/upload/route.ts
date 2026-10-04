import { countdownStore } from "@/lib/live/store";
import { LIBRARY_FOLDERS, MAX_UPLOAD_BYTES, isAllowedUpload } from "@/lib/live/media";
import { toolsApiDenied } from "@/lib/tools/access";

export async function POST(request: Request) {
  const denied = await toolsApiDenied();
  if (denied) return denied;
  const declared = Number(request.headers.get("content-length") ?? 0);
  if (declared > MAX_UPLOAD_BYTES + 1024 * 1024) return Response.json({ error: "That file is over the 50 MB limit." }, { status: 413 });

  const form = await request.formData().catch(() => null);
  if (!form) return Response.json({ error: "No file uploaded." }, { status: 400 });
  const kind = String(form.get("kind") ?? "");
  const folder = LIBRARY_FOLDERS[kind];
  if (!folder) return Response.json({ error: 'kind must be "background" or "music"' }, { status: 400 });
  const store = countdownStore();
  if (!store) return Response.json({ error: "The countdown's media storage isn't set up on this server." }, { status: 503 });
  const file = form.get("file");
  if (!(file instanceof File) || file.size === 0) return Response.json({ error: "No file uploaded." }, { status: 400 });
  if (file.size > MAX_UPLOAD_BYTES) return Response.json({ error: "That file is over the 50 MB limit." }, { status: 413 });
  const mimeType = file.type || "";
  if (!isAllowedUpload(kind, mimeType)) return Response.json({ error: `That file type isn't allowed for ${kind}.` }, { status: 400 });

  try {
    const item = await store.uploadToLibrary(folder, file.name, new Uint8Array(await file.arrayBuffer()), mimeType);
    return Response.json({ ...item, mimeType });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("[live-countdown] upload failed:", message);
    return Response.json({ error: `Upload failed: ${message}` }, { status: 500 });
  }
}
