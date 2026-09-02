import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { getOrganizationId, getUserPermissions } from "@/lib/auth/session";
import { AccessDenied } from "@/components/access-denied";

export const metadata: Metadata = { title: "Audit Log" };

export default async function AdminAuditPage() {
  const organizationId = await getOrganizationId();
  const permissions = await getUserPermissions(organizationId ?? "");
  if (!permissions.has("roles.manage")) return <AccessDenied />;

  const supabase = await createClient();
  const { data: logs } = await supabase
    .from("audit_logs")
    .select("id, action, entity_type, entity_id, metadata, created_at")
    .eq("organization_id", organizationId ?? "")
    .order("created_at", { ascending: false })
    .limit(200);

  return (
    <>
      <div className="dashboard-header">
        <div>
          <h1>Audit Log</h1>
          <p>Accountability trail for role changes, refunds, and access grants — not staff surveillance.</p>
        </div>
      </div>
      <div className="data-table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              <th>When</th>
              <th>Action</th>
              <th>Entity</th>
              <th>Details</th>
            </tr>
          </thead>
          <tbody>
            {logs?.map((l) => (
              <tr key={l.id}>
                <td>{new Date(l.created_at).toLocaleString("en-JM", { dateStyle: "medium", timeStyle: "short", timeZone: "America/Jamaica" })}</td>
                <td>
                  <span className="badge blue">{l.action}</span>
                </td>
                <td>
                  {l.entity_type} {l.entity_id ? `#${l.entity_id.slice(0, 8)}` : ""}
                </td>
                <td style={{ fontSize: ".72rem", color: "var(--color-muted)" }}>{JSON.stringify(l.metadata)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {(!logs || logs.length === 0) && <p className="panel-empty">No audited events yet.</p>}
    </>
  );
}
