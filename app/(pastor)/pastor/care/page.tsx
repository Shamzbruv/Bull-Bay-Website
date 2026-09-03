import type { Metadata } from "next";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getOrganizationId } from "@/lib/auth/session";
import { CounselRequestRow } from "./counsel-request-row";

export const metadata: Metadata = { title: "Pastoral Care" };

export default async function PastoralCarePage() {
  const organizationId = await getOrganizationId();
  const supabase = await createClient();

  // RLS already scopes this to cases the signed-in pastor owns or has been
  // explicitly granted access to — no broad "admin sees everything" here.
  const [{ data: cases }, { data: prayers }, { data: counselRequests }] = await Promise.all([
    supabase
      .from("care_cases")
      .select("id, category, status, summary, created_at")
      .eq("organization_id", organizationId ?? "")
      .order("created_at", { ascending: false }),
    supabase
      .from("prayer_requests")
      .select("id, submitter_name, request_body, visibility, status, created_at")
      .eq("organization_id", organizationId ?? "")
      .order("created_at", { ascending: false })
      .limit(20),
    supabase
      .from("counsel_requests")
      .select("id, reason, details, is_urgent, status, preferred_date, preferred_time, created_at, profiles:requester_profile_id(first_name, last_name)")
      .order("is_urgent", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(30),
  ]);

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
        {prayers?.map((p) => (
          <div key={p.id} style={{ padding: "10px 0", borderBottom: "1px solid var(--color-border)" }}>
            <p style={{ margin: 0, fontSize: ".88rem" }}>{p.request_body}</p>
            <small style={{ color: "var(--color-muted)" }}>
              {p.submitter_name ?? "Anonymous"} • {p.visibility} • <span className="badge">{p.status}</span>
            </small>
          </div>
        ))}
      </div>
    </>
  );
}
