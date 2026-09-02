import type { Metadata } from "next";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { getOrganizationId, getUserPermissions } from "@/lib/auth/session";
import { AccessDenied } from "@/components/access-denied";
import { UploadForm } from "./upload-form";

export const metadata: Metadata = { title: "Conference Document" };

export default async function AdminConferenceDocumentPage() {
  const organizationId = await getOrganizationId();
  const permissions = await getUserPermissions(organizationId ?? "");
  if (!permissions.has("direction.manage")) return <AccessDenied />;

  const admin = createServiceRoleClient();
  const { data: files } = await admin.storage.from("member-resources").list("conference");
  const current = files?.find((f) => f.name.endsWith(".pptx") || f.name.endsWith(".pdf"));

  return (
    <>
      <div className="dashboard-header">
        <div>
          <h1>Conference Document</h1>
          <p>Private, signed-in-member access only — never exposed via a public URL.</p>
        </div>
      </div>

      <div className="panel">
        <h2>Current file</h2>
        {current ? (
          <div>
            <b>{current.name}</b>
            <p style={{ color: "var(--color-muted)", fontSize: ".82rem" }}>
              {current.metadata?.size ? `${Math.round((current.metadata.size as number) / 1024)} KB` : ""}
              {current.updated_at ? ` • updated ${new Date(current.updated_at).toLocaleDateString("en-JM")}` : ""}
            </p>
          </div>
        ) : (
          <p className="panel-empty">No document uploaded yet.</p>
        )}
      </div>

      <div className="panel">
        <h2>Upload a new version</h2>
        <p className="form-note">Uploading replaces the version members download from their portal.</p>
        <UploadForm />
      </div>
    </>
  );
}
