import { SITE_URL } from "@/lib/org";
import { NextResponse } from "next/server";
import { getOrganizationId, isSuperAdmin } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { workspaceForRoles } from "@/lib/auth/roles";
export async function GET(request: Request) {
  const org = await getOrganizationId();
  if (!org || !(await isSuperAdmin(org))) return NextResponse.redirect(new URL("/workspace", SITE_URL));
  const code = new URL(request.url).searchParams.get("role") ?? "super_admin";
  const supabase = await createClient();
  const { data } = await supabase.from("roles").select("code").eq("organization_id", org).eq("code", code).maybeSingle();
  if (code !== "member" && !data) return NextResponse.json({ error: "Unknown role" }, { status: 400 });
  const response = NextResponse.redirect(new URL(`/${workspaceForRoles(new Set([code]))}`, SITE_URL));
  response.cookies.set("workspace_preview", code, { httpOnly: true, sameSite: "lax", secure: new URL(SITE_URL).protocol === "https:", path: "/", maxAge: 86400 });
  return response;
}
