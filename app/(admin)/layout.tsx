import PastorLayout from "@/app/(pastor)/layout";
import { redirect } from "next/navigation";
import { WorkspaceShell } from "@/components/workspace-shell";
import type { DashboardNavSection } from "@/components/dashboard-nav";
import { getWorkspaceAccess } from "@/lib/auth/workspace";
import { getCurrentProfile, getOrganizationId } from "@/lib/auth/session";
import { getAvatarUrl } from "@/lib/members/avatar";
import { getMyNotifications } from "@/lib/notifications";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const organizationId = await getOrganizationId();
  if (!organizationId) redirect("/");

  const access = await getWorkspaceAccess(organizationId);
  const { permissions, roleCodes } = access;
  const profile = await getCurrentProfile();
  if (access.home === "pastor") return <PastorLayout>{children}</PastorLayout>;
  if (access.home !== "admin" && !access.superAdmin) redirect("/workspace");
  const avatarUrl = await getAvatarUrl(profile?.avatar_path);
  const title =
    roleCodes.has("super_admin") ||
    roleCodes.has("church_admin") ||
    permissions.has("sites.manage") ||
    permissions.has("roles.manage")
    ? "Church Admin"
    : roleCodes.has("secretary") || (permissions.has("documents.manage") && permissions.has("attendance.submit"))
      ? "Secretary Office"
      : roleCodes.has("finance_officer") || permissions.has("giving.manage")
        ? "Finance Office"
        : roleCodes.has("media_coordinator") || roleCodes.has("content_editor") || permissions.has("media.manage")
          ? "Media Team"
          : roleCodes.has("store_manager") || permissions.has("shop.manage")
            ? "Church Store"
            : "Team Workspace";
  const name = [profile?.first_name, profile?.last_name].filter(Boolean).join(" ").trim();
  const user = {
    name: name || profile?.email?.split("@")[0] || "Church staff",
    email: profile?.email,
    avatarUrl,
  };
  const allowed = (...required: string[]) => required.some((permission) => permissions.has(permission));
  const allSections: DashboardNavSection[] = [
    {
      label: "Overview",
      items: [
        { href: "/admin", label: "Dashboard", icon: "home" },
        { href: "/admin/profile", label: "My profile", icon: "person" },
        { href: "/member/calendar", label: "My calendar subscriptions", icon: "calendar" },
        { href: "/member/security", label: "Account security", icon: "shield" },
        ...(allowed("sites.manage", "roles.manage")
          ? [{ href: "/admin/setup", label: "Setup center", icon: "sparkles" as const }]
          : []),
      ],
    },
    {
      label: "People & ministry",
      items: [
        ...(allowed("people.read") ? [{ href: "/admin/people", label: "People", icon: "people" as const }] : []),
        ...(allowed("people.write") ? [{ href: "/admin/visitors", label: "Visitors", icon: "person" as const }] : []),
        ...(allowed("content.manage") ? [{ href: "/admin/ministries", label: "Ministries", icon: "church" as const }] : []),
        ...(allowed("events.manage") ? [{ href: "/admin/events", label: "Events", icon: "calendar" as const }] : []),
        ...(allowed("groups.manage") ? [{ href: "/admin/groups", label: "Groups", icon: "users" as const }] : []),
        ...(allowed("volunteers.manage") ? [{ href: "/admin/volunteers", label: "Volunteers", icon: "heart" as const }] : []),
        ...(allowed("ministry_assignments.manage")
          ? [{ href: "/admin/ministry-assignments", label: "Ministry assignments", icon: "team" as const }]
          : []),
      ],
    },
    {
      label: "Office",
      items: [
        ...(allowed("attendance.manage", "attendance.submit")
          ? [{ href: "/admin/attendance", label: "Attendance", icon: "checklist" as const }]
          : []),
        ...(allowed("documents.manage") ? [{ href: "/admin/documents", label: "Documents", icon: "file" as const }] : []),
        ...(allowed("pastoral_calendar.manage")
          ? [{ href: "/admin/pastoral-team", label: "Pastoral team", icon: "calendar" as const }]
          : []),
        ...(allowed("communications.send")
          ? [{ href: "/admin/communications", label: "Communications", icon: "mail" as const }]
          : []),
      ],
    },
    {
      label: "Publishing",
      items: [
        ...(allowed("content.manage") ? [{ href: "/admin/bulletin", label: "Bulletin", icon: "clipboard" as const }] : []),
        ...(allowed("sermons.manage") ? [{ href: "/admin/media", label: "Sermon media", icon: "media" as const }] : []),
        ...(allowed("media.manage") ? [{ href: "/admin/gallery", label: "Gallery", icon: "gallery" as const }] : []),
      ],
    },
    {
      label: "Finance & store",
      items: [
        ...(allowed("giving.read", "giving.manage")
          ? [{ href: "/admin/giving", label: "Finance", icon: "coins" as const }]
          : []),
        ...(allowed("shop.manage") ? [{ href: "/admin/shop", label: "Church store", icon: "shop" as const }] : []),
      ],
    },
    {
      label: "Planning",
      items: [
        ...(allowed("direction.manage")
          ? [
              { href: "/admin/direction", label: "Church direction", icon: "chart" as const },
              { href: "/admin/conference-document", label: "Conference document", icon: "book" as const },
            ]
          : []),
        ...(allowed("events.manage") ? [{ href: "/admin/annual-plan", label: "Annual plan", icon: "calendar" as const }] : []),
      ],
    },
    {
      label: "Administration",
      items: [
        // Roles & access is deliberately gated on the super_admin role
        // itself, not the roles.manage permission — only the top admin
        // sees or grants roles. See app/(admin)/admin/roles/page.tsx.
        ...(roleCodes.has("super_admin") ? [{ href: "/admin/roles", label: "Roles & access", icon: "shield" as const }] : []),
        ...(allowed("roles.manage") ? [{ href: "/admin/audit", label: "Audit log", icon: "archive" as const }] : []),
        ...(allowed("sites.manage") ? [{ href: "/admin/settings", label: "Settings", icon: "settings" as const }] : []),
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
  const workspaces = access.destinations;
  const { notifications, unreadCount } = await getMyNotifications();

  return (
    <WorkspaceShell
      title={access.roleName || title}
      subtitle="Operations workspace"
      tone="admin"
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
