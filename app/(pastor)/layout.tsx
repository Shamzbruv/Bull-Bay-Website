import { redirect } from "next/navigation";
import { DashboardNav } from "@/components/dashboard-nav";
import { DashboardTopbar } from "@/components/dashboard-topbar";
import { getAuthenticatorAssuranceLevel, getOrganizationId, getUserPermissions } from "@/lib/auth/session";

const NAV_ITEMS = [
  { href: "/pastor", label: "Today" },
  { href: "/pastor/direction", label: "Strategic Direction" },
  { href: "/pastor/sermons", label: "Sermons" },
  { href: "/pastor/care", label: "Pastoral Care" },
];

export default async function PastorLayout({ children }: { children: React.ReactNode }) {
  const organizationId = await getOrganizationId();
  if (!organizationId) redirect("/");

  const permissions = await getUserPermissions(organizationId);
  const isPastoralStaff = permissions.has("care.manage") || permissions.has("care.read") || permissions.has("sermons.manage");
  if (!isPastoralStaff) redirect("/member");

  const aal = await getAuthenticatorAssuranceLevel();
  if (aal !== "aal2") redirect(`/member/security?next=${encodeURIComponent("/pastor")}`);

  return (
    <>
      <DashboardTopbar label="Pastor Workspace" />
      <div className="dashboard-shell">
        <DashboardNav title="Pastor" items={NAV_ITEMS} />
        <div className="dashboard-main">{children}</div>
      </div>
    </>
  );
}
