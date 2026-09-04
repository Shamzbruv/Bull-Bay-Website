import { createClient } from "@/lib/supabase/server";
import { ORGANIZATION_SLUG } from "@/lib/org";

/** The single seeded organization's id. Cached per-request via React's fetch dedupe is not
 * available for arbitrary Supabase calls, so callers should call this once per request and
 * thread the id through rather than re-querying repeatedly. */
export async function getOrganizationId(): Promise<string | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("organizations")
    .select("id")
    .eq("slug", ORGANIZATION_SLUG)
    .single();
  return data?.id ?? null;
}

export async function getSessionUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}

export async function getCurrentProfile() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("auth_user_id", user.id)
    .maybeSingle();

  return profile;
}

/** All permission codes the current user holds in the given organization. */
export async function getUserPermissions(organizationId: string): Promise<Set<string>> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return new Set();

  const { data } = await supabase
    .from("user_roles")
    .select("roles!inner(role_permissions(permission_code))")
    .eq("organization_id", organizationId)
    .eq("user_id", user.id);

  const codes = new Set<string>();
  for (const row of data ?? []) {
    const role = row.roles as unknown as { role_permissions: { permission_code: string }[] } | null;
    for (const rp of role?.role_permissions ?? []) {
      codes.add(rp.permission_code);
    }
  }
  return codes;
}

export async function requirePermission(organizationId: string, permission: string) {
  const permissions = await getUserPermissions(organizationId);
  return permissions.has(permission);
}

/** The role codes (e.g. "super_admin", "secretary") the current user holds
 * in this organization — distinct from permission codes, for the rare
 * screen that needs to gate on the actual role rather than what it grants
 * (roles.manage is deliberately only ever seeded onto super_admin today,
 * but a page that must never widen even if that changes should check the
 * role directly). */
export async function getUserRoleCodes(organizationId: string): Promise<Set<string>> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return new Set();

  const { data } = await supabase
    .from("user_roles")
    .select("roles!inner(code)")
    .eq("organization_id", organizationId)
    .eq("user_id", user.id);

  const codes = new Set<string>();
  for (const row of data ?? []) {
    const role = row.roles as unknown as { code: string } | null;
    if (role?.code) codes.add(role.code);
  }
  return codes;
}

export async function isSuperAdmin(organizationId: string): Promise<boolean> {
  const roleCodes = await getUserRoleCodes(organizationId);
  return roleCodes.has("super_admin");
}

/** Whether the current session has satisfied its MFA challenge (aal2). Staff/pastor/admin
 * route groups require this once the user has enrolled a factor. */
export async function getAuthenticatorAssuranceLevel() {
  const supabase = await createClient();
  const { data } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
  return data?.currentLevel ?? "aal1";
}
