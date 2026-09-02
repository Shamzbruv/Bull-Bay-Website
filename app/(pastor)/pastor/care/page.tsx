import type { Metadata } from "next";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getOrganizationId } from "@/lib/auth/session";

export const metadata: Metadata = { title: "Pastoral Care" };

export default async function PastoralCarePage() {
  const organizationId = await getOrganizationId();
  const supabase = await createClient();

  // RLS already scopes this to cases the signed-in pastor owns or has been
  // explicitly granted access to — no broad "admin sees everything" here.
  const [{ data: cases }, { data: prayers }] = await Promise.all([
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
