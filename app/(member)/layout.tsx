import { redirect } from "next/navigation";
import { getWorkspaceAccess } from "@/lib/auth/workspace";
import AdminLayout from "@/app/(admin)/layout";
import PastorLayout from "@/app/(pastor)/layout";
import { WorkspaceShell } from "@/components/workspace-shell";
import type { DashboardNavSection } from "@/components/dashboard-nav";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile, getOrganizationId } from "@/lib/auth/session";
import { getAvatarUrl } from "@/lib/members/avatar";
import { getMyNotifications } from "@/lib/notifications";

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
      { href: "/member/calendar", label: "My calendar", icon: "calendar" },
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

export default async function MemberLayout({ children }: { children: React.ReactNode }) {
  const [organizationId, profile] = await Promise.all([getOrganizationId(), getCurrentProfile()]);
  if (!organizationId || !profile) redirect("/login");
  const access = await getWorkspaceAccess(organizationId);
  // Shared account/member features retain the assigned workspace's shell.
  if (access.home === "admin") return <AdminLayout>{children}</AdminLayout>;
  if (access.home === "pastor") return <PastorLayout>{children}</PastorLayout>;

  const supabase = await createClient();
  const { data: ledMinistry } = profile
    ? await supabase.from("ministries").select("id").eq("leader_profile_id", profile.id).limit(1).maybeSingle()
    : { data: null };
  const leadsMinistry = Boolean(ledMinistry);
  const sections: DashboardNavSection[] = NAV_SECTIONS.map((section) =>
    section.label === "Church life" && leadsMinistry
      ? { ...section, items: [...section.items, { href: "/member/ministry-team", label: "My Team", icon: "team" as const }] }
      : section,
  );

  const name = [profile?.first_name, profile?.last_name].filter(Boolean).join(" ").trim();
  const user = {
    name: name || profile?.email?.split("@")[0] || "Church member",
    email: profile?.email,
    avatarUrl: await getAvatarUrl(profile?.avatar_path),
  };
  const workspaces = access.destinations;
  const { notifications, unreadCount } = await getMyNotifications();

  return (
    <WorkspaceShell
      title={access.roleCodes.has("group_leader") ? "Ministry Leader" : "My Church"}
      subtitle="Member portal"
      tone="member"
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
