import { cache } from "react";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { getUserPermissions, getUserRoleCodes } from "./session";
import { workspaceForRoles } from "./roles";
import type { WorkspaceDestination } from "@/components/dashboard-nav";

export const getWorkspaceAccess = cache(async (organizationId: string) => {
  const actualRoles = await getUserRoleCodes(organizationId);
  const superAdmin = actualRoles.has("super_admin");
  const supabase = await createClient();
  const { data: roles, error } = await supabase.from("roles").select("code, name, role_permissions(permission_code)").eq("organization_id", organizationId).order("name");
  if (error) throw new Error("Workspace roles could not be loaded. Please retry.");
  const selected = superAdmin ? (await cookies()).get("workspace_preview")?.value : undefined;
  const role = roles?.find(r => r.code === selected);
  const preview = superAdmin && (selected === "member" || Boolean(role && role.code !== "super_admin"));
  const roleCodes = preview ? new Set([selected!]) : actualRoles;
  const permissions = preview ? new Set(role?.role_permissions.map(p => p.permission_code) ?? []) : await getUserPermissions(organizationId);
  const home = workspaceForRoles(roleCodes);
  const roleName = role?.name ?? roles?.find(r => actualRoles.has(r.code))?.name ?? (home === "pastor" ? "Pastor Workspace" : home === "member" ? "My Church" : "Church Admin");
  // Everyone with a staff role is still a church member first — the admin
  // workspace switcher needs its own real "Member" link (not the
  // super-admin-only preview below, which simulates someone else's
  // access) so any staff member can reach their own /member dashboard.
  // Pastor's own layout already includes this unconditionally, and super
  // admin's preview list below covers it too, so this only ever fires
  // for everyone else. Mirrors member/pastor layouts always listing
  // themselves first: without it, a plain staff member had no way back
  // to Admin from the switcher either, since it was empty for them.
  //
  // Only ever built for someone who actually holds that elevated access
  // (home === "admin"/"pastor") — a plain member has no admin/pastor
  // workspace to switch to, so their destinations list stays empty, same
  // as before staff members got this at all.
  const destinations: WorkspaceDestination[] = superAdmin
    ? [
        { href: "/auth/workspace?role=super_admin", label: "Super Administrator", icon: "shield", active: !preview },
        { href: "/auth/workspace?role=member", label: "Member", icon: "home", active: selected === "member" },
        ...(roles ?? []).filter(r => r.code !== "super_admin").map(r => ({ href: `/auth/workspace?role=${encodeURIComponent(r.code)}`, label: r.name, icon: "briefcase" as const, active: selected === r.code })),
      ]
    : home === "admin" || home === "pastor"
      ? [
          { href: home === "admin" ? "/admin" : "/pastor", label: roleName, icon: "briefcase", active: true },
          { href: "/member", label: "Member", icon: "home" },
        ]
      : [];
  return { roleCodes, permissions, home, preview, superAdmin, destinations, roleName };
});
