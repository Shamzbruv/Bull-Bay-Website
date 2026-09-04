import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { getOrganizationId, getUserPermissions } from "@/lib/auth/session";
import { AccessDenied } from "@/components/access-denied";
import { isMembershipRequest } from "@/lib/members/membership-request";
import { StatusButtons } from "./status-buttons";
import { MembershipRequestButtons } from "./membership-request-buttons";

export const metadata: Metadata = { title: "Visitor Follow-up" };

const KIND_LABELS: Record<string, string> = {
  contact: "Contact form",
  connection_card: "Connection card",
};

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

  const pendingJoinRequests = (submissions ?? []).filter((s) => isMembershipRequest(s.interest) && s.status !== "closed").length;

  return (
    <>
      <div className="dashboard-header">
        <div>
          <h1>Visitor Follow-up</h1>
          <p>Connection cards, contact form messages, and requests to join the church.</p>
        </div>
      </div>
      {pendingJoinRequests > 0 && (
        <div className="alert warn" style={{ marginBottom: 16 }}>
          {pendingJoinRequests} {pendingJoinRequests === 1 ? "person is" : "people are"} waiting to be approved to join the church.
        </div>
      )}
      <div className="data-table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              <th>Type</th>
              <th>Name</th>
              <th>Contact</th>
              <th>Interest</th>
              <th>Message</th>
              <th>Status</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {submissions?.map((s) => {
              const joinRequest = isMembershipRequest(s.interest);
              return (
                <tr key={s.id}>
                  <td>
                    <span className={joinRequest ? "badge gold" : "badge gray"}>
                      {joinRequest ? "Request to join" : (KIND_LABELS[s.kind] ?? s.kind)}
                    </span>
                  </td>
                  <td>
                    {s.first_name} {s.last_name}
                  </td>
                  <td>
                    {s.email}
                    {s.phone ? ` • ${s.phone}` : ""}
                  </td>
                  <td>{joinRequest ? "—" : s.interest}</td>
                  <td style={{ maxWidth: 240 }}>{s.message}</td>
                  <td>
                    <span className="badge">
                      {joinRequest && s.status === "closed" ? (s.assigned_to ? "approved" : "declined") : s.status}
                    </span>
                  </td>
                  <td>
                    {joinRequest ? (
                      <MembershipRequestButtons id={s.id} status={s.status} approved={Boolean(s.assigned_to)} />
                    ) : (
                      <StatusButtons id={s.id} status={s.status} />
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {(!submissions || submissions.length === 0) && <p className="panel-empty">No submissions yet.</p>}
    </>
  );
}
