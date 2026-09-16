import { cookies } from "next/headers";
import { getAuthUser, getCurrentProfile, getUserPermissions, getUserRoleCodes } from "@/lib/auth/session";
import { createServiceRoleClient } from "@/lib/supabase/server";

export async function officeContext(permission?: string) {
  const [user, profile] = await Promise.all([getAuthUser(), getCurrentProfile()]);
  if (!user || !profile) throw new Error("Please sign in again.");
  const preview = (await cookies()).get("workspace_preview")?.value;
  if (preview && preview !== "super_admin" && (await getUserRoleCodes(profile.organization_id)).has("super_admin")) throw new Error("Leave role preview before making changes.");
  const permissions = await getUserPermissions(profile.organization_id);
  if (permission && !permissions.has(permission)) throw new Error("Your role does not allow this action.");
  return { user, profile, permissions, db: createServiceRoleClient(), org: profile.organization_id };
}

export async function recordOfficeAction(org: string, actor: string, action: string, entity: string, id: string, metadata: Record<string, string> = {}) {
  const { error } = await createServiceRoleClient().from("audit_logs").insert({ organization_id: org, actor_id: actor, action, entity_type: entity, entity_id: id, metadata });
  if (error) throw new Error("The accountability record could not be saved.");
}

export async function roleMembers(org: string, codes: string[]) {
  const db = createServiceRoleClient();
  const { data: roles, error } = await db.from("roles").select("id").eq("organization_id", org).in("code", codes);
  if (error) throw error;
  const { data: grants } = await db.from("user_roles").select("user_id").eq("organization_id", org).in("role_id", (roles ?? []).map(r => r.id));
  const ids = [...new Set((grants ?? []).map(r => r.user_id))];
  if (!ids.length) return [];
  const { data: people, error: peopleError } = await db.from("profiles").select("id, auth_user_id, first_name, last_name, email").eq("organization_id", org).in("auth_user_id", ids);
  if (peopleError) throw peopleError;
  return people ?? [];
}
