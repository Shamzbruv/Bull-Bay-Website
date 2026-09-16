import type { Metadata } from "next";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getOrganizationId, getUserPermissions } from "@/lib/auth/session";
import { CounselRequestRow } from "./counsel-request-row";
import { roleMembers } from "@/lib/office/context";
import { PrayerRequestRow } from "./prayer-request-row";

export const metadata: Metadata = { title: "Pastoral Care" };

export default async function PastoralCarePage() {
  const organizationId = await getOrganizationId();
  const supabase = await createClient();
  const permissions = await getUserPermissions(organizationId ?? "");

  // RLS already scopes this to cases the signed-in pastor owns or has been
  // explicitly granted access to — no broad "admin sees everything" here.
  const [{ data: cases }, { data: prayers }, { data: counselRequests }, pastoralTeam] = await Promise.all([
    supabase
      .from("care_cases")
      .select("id, category, status, summary, created_at").throwOnError()
      .eq("organization_id", organizationId ?? "")
      .order("created_at", { ascending: false }),
    supabase
      .from("prayer_requests")
      .select("id, submitter_name, request_body, visibility, status, assigned_to, created_at, completion_note").throwOnError()
      .eq("organization_id", organizationId ?? "")
      .order("created_at", { ascending: false })
      .limit(20),
    supabase
      .from("counsel_requests")
      .select("id, reason, details, is_urgent, status, preferred_date, preferred_time, created_at, profiles:requester_profile_id(first_name, last_name)").throwOnError()
      .order("is_urgent", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(30),
    permissions.has("prayer.review") ? roleMembers(organizationId ?? "", ["pastoral_care_team", "student_pastor"]) : Promise.resolve([]),
  ]);

  const prayerAssignees = pastoralTeam.flatMap(person => person.auth_user_id ? [{ userId: person.auth_user_id, name: `${person.first_name ?? ""} ${person.last_name ?? ""}`.trim() }] : []);

  return (
    <>
      <div className="dashboard-header">
        <div>
          <h1>Pastoral Care</h1>
          <p>Care cases and prayer requests you have access to — access is explicitly granted and audited.</p>
        </div>
      </div>

      <div className="panel">
        <h2>Care cases</h2>
        {(!cases || cases.length === 0) && <p className="panel-empty">No care cases assigned to you.</p>}
        {cases?.map((c) => (
          <Link key={c.id} href={`/pastor/care/${c.id}`} style={{ display: "flex", justifyContent: "space-between", padding: "10px 0", borderBottom: "1px solid var(--color-border)" }}>
            <span>{c.category ?? "Pastoral care"} — {c.summary ?? "No summary"}</span>
            <span className="badge">{c.status}</span>
          </Link>
        ))}
      </div>

      <div className="panel">
        <h2>Counsel requests</h2>
        {(!counselRequests || counselRequests.length === 0) && <p className="panel-empty">No counsel requests right now.</p>}
        {counselRequests?.map((r) => {
          const requester = r.profiles as unknown as { first_name: string | null; last_name: string | null } | null;
          return (
            <CounselRequestRow
              key={r.id}
              id={r.id}
              reason={r.reason}
              requesterName={`${requester?.first_name ?? ""} ${requester?.last_name ?? ""}`.trim() || "A member"}
              details={r.details}
              isUrgent={r.is_urgent}
              preferredDate={r.preferred_date}
              preferredTime={r.preferred_time}
              status={r.status}
            />
          );
        })}
      </div>

      <div className="panel">
        <h2>Prayer requests</h2>
        {(!prayers || prayers.length === 0) && <p className="panel-empty">No prayer requests.</p>}
        {prayers?.map((prayer) => (
          <PrayerRequestRow
            key={prayer.id}
            id={prayer.id}
            name={prayer.submitter_name ?? "Anonymous"}
            body={prayer.request_body}
            visibility={prayer.visibility}
            status={prayer.status}
            createdAt={prayer.created_at}
            assignedTo={prayer.assigned_to}
            assignees={prayerAssignees}
            canAssign={permissions.has("prayer.review")}
            completionNote={prayer.completion_note}
          />
        ))}
      </div>
    </>
  );
}
