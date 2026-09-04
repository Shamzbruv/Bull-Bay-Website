import { createClient } from "@/lib/supabase/server";

type DashboardRole = {
  code: string;
  name: string;
  role_permissions: { permission_code: string }[];
};

/**
 * Loads the signed-in person's dashboard identity and, when requested, their
 * staff permissions. Unlike the older session helpers, this keeps query
 * failures so a dashboard can distinguish unavailable data from an empty list.
 */
export async function loadDashboardContext(includeAccess = false) {
  const supabase = await createClient();
  const errors: string[] = [];
  const authResult = await supabase.auth.getUser();

  if (authResult.error) errors.push(`Session: ${authResult.error.message}`);
  const user = authResult.data.user;

  if (!user) {
    if (!authResult.error) errors.push("Session: No signed-in user could be found. Please sign in again.");
    return {
      supabase,
      user: null,
      profile: null,
      permissions: new Set<string>(),
      roleCodes: new Set<string>(),
      roleNames: [] as string[],
      errors,
    };
  }

  const profileResult = await supabase
    .from("profiles")
    .select(
      "id, organization_id, first_name, last_name, email, phone, city, household_id, emergency_contact_name, communication_email_opt_in, communication_sms_opt_in, signature_path, stamp_path",
    )
    .eq("auth_user_id", user.id)
    .maybeSingle();

  if (profileResult.error) errors.push(`Profile: ${profileResult.error.message}`);
  if (!profileResult.data && !profileResult.error) {
    errors.push("Profile: This account is not linked to a church profile yet. Ask an administrator to link it.");
  }

  const permissions = new Set<string>();
  const roleCodes = new Set<string>();
  const roleNames: string[] = [];

  if (includeAccess && profileResult.data) {
    const accessResult = await supabase
      .from("user_roles")
      .select("roles!inner(code, name, role_permissions(permission_code))")
      .eq("organization_id", profileResult.data.organization_id)
      .eq("user_id", user.id);

    if (accessResult.error) errors.push(`Roles and permissions: ${accessResult.error.message}`);

    for (const row of accessResult.data ?? []) {
      const role = row.roles as unknown as DashboardRole | null;
      if (!role) continue;
      roleCodes.add(role.code);
      if (!roleNames.includes(role.name)) roleNames.push(role.name);
      for (const permission of role.role_permissions ?? []) permissions.add(permission.permission_code);
    }
  }

  return {
    supabase,
    user,
    profile: profileResult.data,
    permissions,
    roleCodes,
    roleNames,
    errors,
  };
}

export function addQueryError(errors: string[], label: string, error: { message: string } | null) {
  if (error) errors.push(`${label}: ${error.message}`);
}

