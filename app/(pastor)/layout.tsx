import { redirect } from "next/navigation";
import { WorkspaceShell } from "@/components/workspace-shell";
import type { DashboardNavSection, WorkspaceDestination } from "@/components/dashboard-nav";
import { getCurrentProfile, getOrganizationId, getUserPermissions } from "@/lib/auth/session";
import { getAvatarUrl } from "@/lib/members/avatar";

const ADMIN_PERMISSIONS = [
  "people.read",
  "people.write",
  "events.manage",
  "groups.manage",
  "volunteers.manage",
  "sermons.manage",
  "content.manage",
  "giving.read",
  "giving.manage",
  "shop.manage",
  "roles.manage",
  "sites.manage",
  "direction.manage",
  "ministry_assignments.manage",
  "documents.manage",
  "documents.certify",
  "media.manage",
  "pastoral_calendar.manage",
  "communications.send",
  "attendance.manage",
  "attendance.submit",
] as const;

export default async function PastorLayout({ children }: { children: React.ReactNode }) {
  const organizationId = await getOrganizationId();
  if (!organizationId) redirect("/");

  const [permissions, profile] = await Promise.all([getUserPermissions(organizationId), getCurrentProfile()]);
  const isPastoralStaff =
    permissions.has("pastoral_workspace.access") ||
    permissions.has("care.manage") ||
    permissions.has("care.read") ||
    permissions.has("sermons.manage") ||
    permissions.has("documents.certify") ||
    permissions.has("pastoral_calendar.manage");
  if (!isPastoralStaff) redirect("/member");

  const allowed = (...required: string[]) => required.some((permission) => permissions.has(permission));
  const allSections: DashboardNavSection[] = [
    {
      label: "Pastoral workspace",
      items: [
        { href: "/pastor", label: "Today", icon: "home" },
        { href: "/pastor/profile", label: "My profile", icon: "person" },
        { href: "/pastor/care", label: "Pastoral care", icon: "heart" },
        { href: "/pastor/calendar", label: "My calendar", icon: "calendar" },
      ],
    },
    {
      label: "Ministry tools",
      items: [
        ...(allowed("direction.manage")
          ? [{ href: "/pastor/direction", label: "Strategic direction", icon: "chart" as const }]
          : []),
        ...(allowed("sermons.manage") ? [{ href: "/pastor/sermons", label: "Sermons", icon: "book" as const }] : []),
        ...(allowed("documents.certify")
          ? [{ href: "/pastor/documents", label: "Documents", icon: "file" as const }]
          : []),
      ],
    },
  ];
  const sections = allSections.filter((section) => section.items.length > 0);
  const name = [profile?.first_name, profile?.last_name].filter(Boolean).join(" ").trim();
  const user = {
    name: name || profile?.email?.split("@")[0] || "Pastoral team member",
    email: profile?.email,
    avatarUrl: await getAvatarUrl(profile?.avatar_path),
  };
  const canUseAdmin = ADMIN_PERMISSIONS.some((permission) => permissions.has(permission));
  const workspaces: WorkspaceDestination[] = [
    { href: "/member", label: "Member", icon: "home" },
    ...(canUseAdmin ? [{ href: "/admin", label: "Admin", icon: "briefcase" as const }] : []),
    { href: "/pastor", label: "Pastor", icon: "heart", active: true },
  ];

  return (
    <WorkspaceShell
      title="Pastor Workspace"
      subtitle="Care & ministry"
      tone="pastor"
      sections={sections}
      user={user}
      workspaces={workspaces}
    >
      {children}
    </WorkspaceShell>
  );
}
