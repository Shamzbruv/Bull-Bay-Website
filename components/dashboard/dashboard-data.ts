import { getWorkspaceAccess } from "@/lib/auth/workspace";
import { createClient } from "@/lib/supabase/server";
import { getAuthUser, getCurrentProfile } from "@/lib/auth/session";

/**
 * Loads the signed-in person's dashboard identity and, when requested, their
 * staff permissions. Unlike the older session helpers, this keeps query
 * failures so a dashboard can distinguish unavailable data from an empty list.
 *
 * Routes its user/profile lookups through the cached session helpers
 * (getAuthUser/getCurrentProfile) instead of querying fresh — every layout
 * already calls those on the same request, so this reuses that result
 * rather than paying for another auth.getUser() and another profiles query.
 */
export async function loadDashboardContext(includeAccess = false) {
  const supabase = await createClient();
  const errors: string[] = [];
  const user = await getAuthUser();

  if (!user) {
    errors.push("Session: No signed-in user could be found. Please sign in again.");
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

  const profile = await getCurrentProfile();
  if (!profile) {
    errors.push("Profile: This account is not linked to a church profile yet. Ask an administrator to link it.");
  }

  const permissions = new Set<string>();
  const roleCodes = new Set<string>();
  const roleNames: string[] = [];

  if (includeAccess && profile) {
    const access = await getWorkspaceAccess(profile.organization_id);
    for (const code of access.roleCodes) roleCodes.add(code);
    for (const permission of access.permissions) permissions.add(permission);
    roleNames.push(access.roleName);
  }

  return {
    supabase,
    user,
    profile,
    permissions,
    roleCodes,
    roleNames,
    errors,
  };
}

export function addQueryError(errors: string[], label: string, error: { message: string } | null) {
  if (error) errors.push(`${label}: ${error.message}`);
}

