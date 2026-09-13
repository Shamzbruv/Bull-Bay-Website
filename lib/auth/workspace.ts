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
  const destinations: WorkspaceDestination[] = superAdmin ? [
    { href: "/auth/workspace?role=super_admin", label: "Super Administrator", icon: "shield", active: !preview },
    { href: "/auth/workspace?role=member", label: "Member", icon: "home", active: selected === "member" },
    ...(roles ?? []).filter(r => r.code !== "super_admin").map(r => ({ href: `/auth/workspace?role=${encodeURIComponent(r.code)}`, label: r.name, icon: "briefcase" as const, active: selected === r.code })),
  ] : [];
  return { roleCodes, permissions, home, preview, superAdmin, destinations, roleName: role?.name ?? roles?.find(r => actualRoles.has(r.code))?.name ?? (home === "pastor" ? "Pastor Workspace" : home === "member" ? "My Church" : "Church Admin") };
});
