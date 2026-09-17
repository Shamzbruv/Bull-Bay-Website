import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { getOrganizationId, getUserPermissions } from "@/lib/auth/session";
import { AccessDenied } from "@/components/access-denied";
import { isMembershipRequest } from "@/lib/members/membership-request";
import { StatusButtons } from "./status-buttons";
import { MembershipRequestButtons } from "./membership-request-buttons";
import { DeleteSubmissionButton } from "./delete-button";
import { SpamCleanupButton } from "./spam-cleanup";
import { scoreSubmission } from "@/lib/spam";

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
    .select("*").throwOnError()
    .eq("organization_id", organizationId ?? "")
    .order("created_at", { ascending: false })
    .limit(100);

  const pendingJoinRequests = (submissions ?? []).filter((s) => isMembershipRequest(s.interest) && s.status !== "closed").length;

  // Scored here rather than stored on the row: the rule can be tightened
  // and every existing submission is re-judged on the next page load, with
  // no migration and no backfill. Requests to join are never scored —
  // those are decided by a person, not a filter.
  const assessments = new Map(
    (submissions ?? []).map((s) => [
      s.id,
      isMembershipRequest(s.interest)
        ? null
        : scoreSubmission({
            firstName: s.first_name,
            lastName: s.last_name,
            email: s.email,
            phone: s.phone,
            interest: s.interest,
            message: s.message,
          }),
    ]),
  );
  const spamCount = [...assessments.values()].filter((a) => a?.verdict === "spam").length;

  return (
    <>
      <div className="dashboard-header">
        <div>
          <h1>Visitor Follow-up</h1>
          <p>Connection cards, contact form messages, and requests to join the church.</p>
        </div>
        <SpamCleanupButton count={spamCount} />
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
              const assessment = assessments.get(s.id) ?? null;
              const flagged = assessment?.verdict === "spam" || assessment?.verdict === "suspect";
              return (
                <tr key={s.id} className={assessment?.verdict === "spam" ? "row-muted" : undefined}>
                  <td>
                    <span className={joinRequest ? "badge gold" : "badge gray"}>
                      {joinRequest ? "Request to join" : (KIND_LABELS[s.kind] ?? s.kind)}
                    </span>
                    {flagged && (
                      <span
                        className="badge red"
                        title={assessment?.reasons.join(" • ")}
                        style={{ display: "block", marginTop: 6 }}
                      >
                        {assessment?.verdict === "spam" ? "Spam" : "Possible spam"}
                      </span>
                    )}
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
                    <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
                      {joinRequest ? (
                        <MembershipRequestButtons id={s.id} status={s.status} approved={Boolean(s.assigned_to)} />
                      ) : (
                        <StatusButtons id={s.id} status={s.status} />
                      )}
                      <DeleteSubmissionButton
                        id={s.id}
                        label={[s.first_name, s.last_name].filter(Boolean).join(" ").trim() || s.email || "this sender"}
                      />
                    </div>
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
