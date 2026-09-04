import { WorkspaceShell } from "@/components/workspace-shell";
import type { DashboardNavSection, WorkspaceDestination } from "@/components/dashboard-nav";
import { getCurrentProfile, getOrganizationId, getUserPermissions } from "@/lib/auth/session";

const NAV_SECTIONS: DashboardNavSection[] = [
  {
    label: "Overview",
    items: [
      { href: "/member", label: "Home", icon: "home" },
      { href: "/member/profile", label: "My profile", icon: "person" },
      { href: "/member/household", label: "Household", icon: "users" },
    ],
  },
  {
    label: "Church life",
    items: [
      { href: "/member/events", label: "Events", icon: "calendar" },
      { href: "/member/groups", label: "Groups", icon: "people" },
      { href: "/member/ministry", label: "My ministry", icon: "church" },
      { href: "/member/serving", label: "Serving", icon: "heart" },
    ],
  },
  {
    label: "Care & records",
    items: [
      { href: "/member/prayer", label: "Prayer request", icon: "heart" },
      { href: "/member/documents", label: "Documents", icon: "file" },
      { href: "/member/counsel", label: "Pastor & calendar", icon: "calendar" },
      { href: "/member/directory", label: "Member directory", icon: "people" },
      { href: "/member/attendance", label: "Attendance", icon: "chart" },
      { href: "/member/giving", label: "Giving", icon: "coins" },
      { href: "/member/orders", label: "Orders & downloads", icon: "shop" },
    ],
  },
  {
    label: "Account",
    items: [
      { href: "/member/notifications", label: "Notifications", icon: "bell" },
      { href: "/member/security", label: "Security", icon: "shield" },
    ],
  },
];

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

const PASTORAL_PERMISSIONS = [
  "pastoral_workspace.access",
  "care.manage",
  "care.read",
  "sermons.manage",
  "documents.certify",
  "pastoral_calendar.manage",
] as const;

export default async function MemberLayout({ children }: { children: React.ReactNode }) {
  const [organizationId, profile] = await Promise.all([getOrganizationId(), getCurrentProfile()]);
  const permissions = organizationId ? await getUserPermissions(organizationId) : new Set<string>();
  const name = [profile?.first_name, profile?.last_name].filter(Boolean).join(" ").trim();
  const user = {
    name: name || profile?.email?.split("@")[0] || "Church member",
    email: profile?.email,
  };
  const canUseAdmin = ADMIN_PERMISSIONS.some((permission) => permissions.has(permission));
  const canUsePastor = PASTORAL_PERMISSIONS.some((permission) => permissions.has(permission));
  const workspaces: WorkspaceDestination[] = [
    { href: "/member", label: "Member", icon: "home", active: true },
    ...(canUseAdmin ? [{ href: "/admin", label: "Admin", icon: "briefcase" as const }] : []),
    ...(canUsePastor ? [{ href: "/pastor", label: "Pastor", icon: "heart" as const }] : []),
  ];

  return (
    <WorkspaceShell
      title="My Church"
      subtitle="Member portal"
      tone="member"
      sections={NAV_SECTIONS}
      user={user}
      workspaces={workspaces}
    >
      {children}
    </WorkspaceShell>
  );
}
