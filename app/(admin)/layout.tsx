import { redirect } from "next/navigation";
import { DashboardNav } from "@/components/dashboard-nav";
import { DashboardTopbar } from "@/components/dashboard-topbar";
import { getAuthenticatorAssuranceLevel, getOrganizationId, getUserPermissions } from "@/lib/auth/session";

const NAV_ITEMS = [
  { href: "/admin", label: "Dashboard" },
  { href: "/admin/people", label: "People" },
  { href: "/admin/visitors", label: "Visitors" },
  { href: "/admin/events", label: "Events" },
  { href: "/admin/groups", label: "Groups" },
  { href: "/admin/volunteers", label: "Volunteers" },
  { href: "/admin/media", label: "Media" },
  { href: "/admin/giving", label: "Giving" },
  { href: "/admin/shop", label: "Shop" },
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
];

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
      <DashboardTopbar label="Church Admin" />
      <div className="dashboard-shell">
        <DashboardNav title="Church Admin" items={NAV_ITEMS} />
        <div className="dashboard-main">{children}</div>
      </div>
    </>
  );
}
