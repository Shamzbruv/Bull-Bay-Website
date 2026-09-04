import { redirect } from "next/navigation";
import { SimpleDashboardNav } from "@/components/simple-dashboard-nav";
import { SimpleDashboardTopbar } from "@/components/simple-dashboard-topbar";
import { getAuthenticatorAssuranceLevel, getOrganizationId, getUserPermissions } from "@/lib/auth/session";

const NAV_ITEMS = [
  { href: "/pastor", label: "Today" },
  { href: "/pastor/direction", label: "Strategic Direction" },
  { href: "/pastor/sermons", label: "Sermons" },
  { href: "/pastor/care", label: "Pastoral Care" },
  { href: "/pastor/documents", label: "Documents" },
  { href: "/member/team-calendar", label: "My Calendar" },
];

// See components/simple-dashboard-nav.tsx for why this doesn't use
// components/dashboard-nav.tsx / dashboard-topbar.tsx.
export default async function PastorLayout({ children }: { children: React.ReactNode }) {
  const organizationId = await getOrganizationId();
  if (!organizationId) redirect("/");

  const permissions = await getUserPermissions(organizationId);
  const isPastoralStaff =
    permissions.has("care.manage") ||
    permissions.has("care.read") ||
    permissions.has("sermons.manage") ||
    permissions.has("documents.certify") ||
    permissions.has("pastoral_calendar.manage");
  if (!isPastoralStaff) redirect("/member");

  const aal = await getAuthenticatorAssuranceLevel();
  if (aal !== "aal2") redirect(`/member/security?next=${encodeURIComponent("/pastor")}`);

  return (
    <>
      <SimpleDashboardTopbar label="Pastor Workspace" />
      <div className="dashboard-shell">
        <SimpleDashboardNav title="Pastor" items={NAV_ITEMS} />
        <div className="dashboard-main">{children}</div>
      </div>
    </>
  );
}
