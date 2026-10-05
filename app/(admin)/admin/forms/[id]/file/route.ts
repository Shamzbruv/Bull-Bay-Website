import { getOrganizationId, getUserPermissions } from "@/lib/auth/session";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { UPLOAD_BUCKET } from "@/lib/forms/server";

/** Opens an uploaded answer through a link that expires in five minutes;
 *  the files themselves are never public. */
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const org = await getOrganizationId();
  if (!org || !(await getUserPermissions(org)).has("forms.manage")) return new Response("Forbidden", { status: 403 });
  const { id } = await params;
  const path = new URL(request.url).searchParams.get("path") ?? "";
  if (!path.startsWith(`${id}/`) || path.includes("..")) return new Response("Not found", { status: 404 });
  const db = createServiceRoleClient();
  const { data: form } = await db.from("office_forms").select("id").eq("organization_id", org).eq("id", id).maybeSingle();
  if (!form) return new Response("Not found", { status: 404 });
  const { data, error } = await db.storage.from(UPLOAD_BUCKET).createSignedUrl(path, 300);
  if (error || !data?.signedUrl) return new Response("That file is no longer available.", { status: 404 });
  return new Response(null, { status: 302, headers: { Location: data.signedUrl, "Cache-Control": "private, no-store" } });
}
