import { randomUUID } from "node:crypto";
import { getCurrentProfile } from "@/lib/auth/session";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { isQuestion } from "@/lib/forms/schema";
import { UPLOAD_BUCKET, definitionOf, formAvailability, loadFormByPublicId, signInNeeded } from "@/lib/forms/server";
import { fileAllowed } from "@/lib/forms/validate";

// A file-upload answer goes straight from the respondent's browser to
// private storage, with a one-time upload link from here. Nothing large
// passes through the website itself, and the submission later checks the
// file really arrived in this respondent's folder.

const MAX_FILES_PER_SESSION = 30;

export async function POST(request: Request, { params }: { params: Promise<{ publicId: string }> }) {
  const refuse = (error: string, status = 400) => Response.json({ error }, { status });
  const body = (await request.json().catch(() => null)) as { questionId?: unknown; name?: unknown; size?: unknown; type?: unknown; session?: unknown } | null;
  if (!body) return refuse("Bad request.");
  const { questionId, name, size, type, session } = body;
  if (typeof questionId !== "string" || typeof name !== "string" || typeof size !== "number" || typeof type !== "string" || typeof session !== "string") return refuse("Bad request.");
  if (!/^[0-9a-f-]{36}$/.test(session)) return refuse("Reload the form and try again.");

  const form = await loadFormByPublicId((await params).publicId);
  if (!form) return refuse("This form no longer exists.", 404);
  const { items, settings } = definitionOf(form);
  const question = items.find((i) => i.id === questionId);
  if (!question || !isQuestion(question) || question.type !== "file_upload") return refuse("This question doesn't take files.");
  const open = await formAvailability(form, settings);
  if (!open.open) return refuse(open.message, 403);
  if (signInNeeded(settings)) {
    const profile = await getCurrentProfile();
    if (!profile || profile.organization_id !== form.organization_id) return refuse("Please sign in to upload.", 401);
  }
  if (size <= 0 || size > question.maxSizeMb * 1024 * 1024) return refuse(`Files must be under ${question.maxSizeMb} MB.`);
  if (!fileAllowed(question.accept, name, type)) return refuse("That kind of file isn't accepted here.");

  const db = createServiceRoleClient();
  const folder = `${form.id}/${session}`;
  const { data: existing } = await db.storage.from(UPLOAD_BUCKET).list(folder, { limit: MAX_FILES_PER_SESSION + 1 });
  if ((existing?.length ?? 0) >= MAX_FILES_PER_SESSION) return refuse("Too many files have been uploaded for this response.", 429);

  const safeName = name.replace(/[^A-Za-z0-9._-]+/g, "_").replace(/^_+|_+$/g, "").slice(-80) || "file";
  const path = `${folder}/${randomUUID().slice(0, 8)}-${safeName}`;
  const { data, error } = await db.storage.from(UPLOAD_BUCKET).createSignedUploadUrl(path);
  if (error || !data) return refuse("The upload couldn't start. Please try again.", 500);
  return Response.json({ path: data.path, token: data.token }, { headers: { "Cache-Control": "no-store" } });
}
