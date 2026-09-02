import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { getOrganizationId, getUserPermissions } from "@/lib/auth/session";
import { AccessDenied } from "@/components/access-denied";
import { StatusButtons } from "./status-buttons";

export const metadata: Metadata = { title: "Visitor Follow-up" };

export default async function AdminVisitorsPage() {
  const organizationId = await getOrganizationId();
  const permissions = await getUserPermissions(organizationId ?? "");
  if (!permissions.has("people.write")) return <AccessDenied />;

  const supabase = await createClient();
  const { data: submissions } = await supabase
    .from("contact_submissions")
    .select("*")
    .eq("organization_id", organizationId ?? "")
    .order("created_at", { ascending: false })
    .limit(100);

  return (
    <>
      <div className="dashboard-header">
        <div>
          <h1>Visitor Follow-up</h1>
          <p>Connection cards and contact form submissions.</p>
        </div>
      </div>
      <div className="data-table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Contact</th>
              <th>Interest</th>
              <th>Message</th>
              <th>Status</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {submissions?.map((s) => (
              <tr key={s.id}>
                <td>
                  {s.first_name} {s.last_name}
                </td>
                <td>
                  {s.email}
                  {s.phone ? ` • ${s.phone}` : ""}
                </td>
                <td>{s.interest}</td>
                <td style={{ maxWidth: 240 }}>{s.message}</td>
                <td>
                  <span className="badge">{s.status}</span>
                </td>
                <td>
                  <StatusButtons id={s.id} status={s.status} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {(!submissions || submissions.length === 0) && <p className="panel-empty">No submissions yet.</p>}
    </>
  );
}
