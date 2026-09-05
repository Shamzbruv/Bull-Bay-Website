import type { Metadata } from "next";
import Link from "next/link";
import { createClient, createServiceRoleClient } from "@/lib/supabase/server";
import { getAuthUser, getOrganizationId, getUserPermissions } from "@/lib/auth/session";
import { CounselRequestRow } from "./counsel-request-row";
import { PrayerRequestRow } from "./prayer-request-row";

export const metadata: Metadata = { title: "Pastoral Care" };

export default async function PastoralCarePage() {
  const organizationId = await getOrganizationId();
  const supabase = await createClient();
  const [user, permissions] = await Promise.all([getAuthUser(), getUserPermissions(organizationId ?? "")]);
  const canManageCare = permissions.has("care.manage");

  // Uses the service-role client with the same visibility rule the RLS
  // policy is supposed to enforce (owner, or blanket care.manage),
  // applied here in code instead: "care_cases scoped read" currently
  // recurses into care_case_access and back — a live bug (see
  // 20260904050000_fix_care_cases_rls_recursion.sql, not yet applied) —
  // so the regular RLS-scoped client can't read this table at all right
  // now. Explicit per-case access grants (care_case_access) aren't
  // reproduced here, since checking those hits the same recursion; a case
  // shared with someone who isn't its owner and doesn't have care.manage
  // temporarily won't show up for them.
  let careCasesQuery = createServiceRoleClient()
    .from("care_cases")
    .select("id, category, status, summary, created_at")
    .eq("organization_id", organizationId ?? "")
    .order("created_at", { ascending: false });
  if (!canManageCare) careCasesQuery = careCasesQuery.eq("owner_id", user?.id ?? "");

  const [{ data: cases }, { data: prayers }, { data: counselRequests }, { data: pastoralTeam }] = await Promise.all([
    careCasesQuery,
    supabase
      .from("prayer_requests")
      .select("id, submitter_name, request_body, visibility, status, assigned_to, created_at")
      .eq("organization_id", organizationId ?? "")
      .order("created_at", { ascending: false })
      .limit(20),
    supabase
      .from("counsel_requests")
      .select("id, reason, details, is_urgent, status, preferred_date, preferred_time, created_at, profiles:requester_profile_id(first_name, last_name)")
      .order("is_urgent", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(30),
    supabase
      .from("pastoral_team_members")
      .select("role_title, profiles(first_name, last_name, auth_user_id)")
      .eq("organization_id", organizationId ?? "")
      .eq("is_active", true)
      .order("is_pastor", { ascending: false }),
  ]);

  const prayerAssignees = (pastoralTeam ?? []).flatMap((teamMember) => {
    const person = teamMember.profiles as unknown as { first_name: string | null; last_name: string | null; auth_user_id: string | null } | null;
    if (!person?.auth_user_id) return [];
    return [{
      userId: person.auth_user_id,
      name: `${person.first_name ?? ""} ${person.last_name ?? ""}`.trim() || teamMember.role_title,
    }];
  });

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
          />
        ))}
      </div>
    </>
  );
}
