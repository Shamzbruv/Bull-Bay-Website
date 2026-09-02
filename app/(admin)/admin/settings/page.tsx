import type { Metadata } from "next";
import { getOrganizationId, getUserPermissions } from "@/lib/auth/session";
import { AccessDenied } from "@/components/access-denied";
import { getPrimaryCampus } from "@/lib/data/public";
import { CampusForm } from "./campus-form";

export const metadata: Metadata = { title: "Settings" };

export default async function AdminSettingsPage() {
  const organizationId = await getOrganizationId();
  const permissions = await getUserPermissions(organizationId ?? "");
  if (!permissions.has("sites.manage")) return <AccessDenied />;

  const campus = await getPrimaryCampus();

  return (
    <>
      <div className="dashboard-header">
        <div>
          <h1>Settings</h1>
          <p>Campus/contact details shown across the public site.</p>
        </div>
      </div>
      {campus && <CampusForm campus={campus} />}
    </>
  );
}
