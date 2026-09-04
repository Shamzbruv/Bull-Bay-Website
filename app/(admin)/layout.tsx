import { redirect } from "next/navigation";
import { SimpleDashboardNav } from "@/components/simple-dashboard-nav";
import { SimpleDashboardTopbar } from "@/components/simple-dashboard-topbar";
import { getAuthenticatorAssuranceLevel, getOrganizationId, getUserPermissions } from "@/lib/auth/session";

const NAV_ITEMS = [
  { href: "/admin", label: "Dashboard" },
  { href: "/admin/people", label: "People" },
  { href: "/admin/visitors", label: "Visitors" },
  { href: "/admin/events", label: "Events" },
  { href: "/admin/groups", label: "Groups" },
  { href: "/admin/volunteers", label: "Volunteers" },
  { href: "/admin/media", label: "Media" },
  { href: "/admin/giving", label: "Finance" },
  { href: "/admin/shop", label: "Shop" },
  { href: "/admin/direction", label: "Church Direction" },
  { href: "/admin/ministry-assignments", label: "Ministry Assignments" },
  { href: "/admin/annual-plan", label: "Annual Plan" },
  { href: "/admin/conference-document", label: "Conference Document" },
  { href: "/admin/documents", label: "Documents" },
  { href: "/admin/pastoral-team", label: "Pastoral Team" },
  { href: "/admin/attendance", label: "Attendance" },
  { href: "/admin/bulletin", label: "Bulletin" },
  { href: "/admin/gallery", label: "Gallery" },
  { href: "/admin/communications", label: "Communications" },
  { href: "/admin/roles", label: "Roles" },
  { href: "/admin/audit", label: "Audit Log" },
  { href: "/admin/settings", label: "Settings" },
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
];

// Uses SimpleDashboardNav/Topbar, not components/dashboard-nav.tsx or
// dashboard-topbar.tsx — those are mid-rewrite into a new workspace-switcher
// shell with no matching CSS yet. See components/simple-dashboard-nav.tsx.
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const organizationId = await getOrganizationId();
  if (!organizationId) redirect("/");

  const permissions = await getUserPermissions(organizationId);
  const isStaff = ADMIN_PERMISSIONS.some((p) => permissions.has(p));
  if (!isStaff) redirect("/member");

  const aal = await getAuthenticatorAssuranceLevel();
  if (aal !== "aal2") redirect(`/member/security?next=${encodeURIComponent("/admin")}`);

  return (
    <>
      <SimpleDashboardTopbar label="Church Admin" />
      <div className="dashboard-shell">
        <SimpleDashboardNav title="Church Admin" items={NAV_ITEMS} />
        <div className="dashboard-main">{children}</div>
      </div>
    </>
  );
}
