import type { Metadata } from "next";
import { getOrganizationId, getUserPermissions } from "@/lib/auth/session";
import { AccessDenied } from "@/components/access-denied";
import { isEmailConfigured } from "@/lib/email/resend";
import { ComposeForm } from "./compose-form";

export const metadata: Metadata = { title: "Communications" };

export default async function AdminCommunicationsPage() {
  const organizationId = await getOrganizationId();
  const permissions = await getUserPermissions(organizationId ?? "");
  if (!permissions.has("communications.send")) return <AccessDenied />;

  return (
    <>
      <div className="dashboard-header">
        <div>
          <h1>Communications</h1>
          <p>Send a branded, church-logo email to one person or the whole congregation.</p>
        </div>
      </div>

      <div className="panel">
        <ComposeForm emailReady={isEmailConfigured()} />
      </div>
    </>
  );
}
