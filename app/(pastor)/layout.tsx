import { getWorkspaceAccess } from "@/lib/auth/workspace";
import { redirect } from "next/navigation";
import { WorkspaceShell } from "@/components/workspace-shell";
import type { DashboardNavSection } from "@/components/dashboard-nav";
import { getCurrentProfile, getOrganizationId } from "@/lib/auth/session";
import { getAvatarUrl } from "@/lib/members/avatar";
import { getMyNotifications } from "@/lib/notifications";

export default async function PastorLayout({ children }: { children: React.ReactNode }) {
  const organizationId = await getOrganizationId();
  if (!organizationId) redirect("/");

  const access = await getWorkspaceAccess(organizationId);
  const { permissions } = access;
  const profile = await getCurrentProfile();
  if (access.home !== "pastor" && !access.superAdmin) redirect("/workspace");

  const allowed = (...required: string[]) => required.some((permission) => permissions.has(permission));
  const allSections: DashboardNavSection[] = [
    {
      label: "Pastoral workspace",
      items: [
        { href: "/pastor", label: "Today", icon: "home" },
        { href: "/pastor/profile", label: "My profile", icon: "person" },
        { href: "/member/calendar", label: "My calendar subscriptions", icon: "calendar" },
        { href: "/pastor/care", label: "Pastoral care", icon: "heart" },
        { href: "/pastor/calendar", label: "My calendar", icon: "calendar" },
      ],
    },
    {
      label: "Ministry tools",
      items: [
        ...(allowed("people.read") ? [{ href: "/admin/people", label: "People", icon: "people" as const }] : []),
        ...(allowed("people.write") ? [{ href: "/admin/visitors", label: "Visitors", icon: "person" as const }] : []),
        ...(allowed("giving.read") ? [{ href: "/admin/giving", label: "Giving reports", icon: "coins" as const }] : []),
        ...(allowed("attendance.manage") ? [{ href: "/admin/attendance", label: "Attendance", icon: "checklist" as const }] : []),
        ...(allowed("communications.send") ? [{ href: "/admin/communications", label: "Communications", icon: "mail" as const }] : []),
        ...(allowed("content.manage") ? [{ href: "/admin/ministries", label: "Ministries", icon: "church" as const }] : []),
        ...(allowed("direction.manage")
          ? [{ href: "/pastor/direction", label: "Strategic direction", icon: "chart" as const }]
          : []),
        ...(allowed("sermons.manage") ? [{ href: "/pastor/sermons", label: "Sermons", icon: "book" as const }] : []),
        ...(allowed("documents.certify")
          ? [{ href: "/pastor/documents", label: "Documents", icon: "file" as const }]
          : []),
      ],
    },
    {
      label: "My church",
      items: [
        { href: "/member/events", label: "My events", icon: "calendar" },
        { href: "/member/counsel", label: "Request a meeting", icon: "heart" },
        { href: "/member/documents", label: "My document requests", icon: "file" },
        { href: "/member/serving", label: "My serving schedule", icon: "team" },
        { href: "/member/giving", label: "My giving", icon: "coins" },
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
  const workspaces = access.destinations;
  const { notifications, unreadCount } = await getMyNotifications();

  return (
    <WorkspaceShell
      title={access.roleName}
      subtitle="Care & ministry"
      tone="pastor"
      sections={sections}
      user={user}
      workspaces={workspaces}
      notifications={notifications}
      unreadCount={unreadCount}
    >
      {children}
    </WorkspaceShell>
  );
}
