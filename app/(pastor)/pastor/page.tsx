import type { Metadata } from "next";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getOrganizationId } from "@/lib/auth/session";

export const metadata: Metadata = { title: "Pastor Workspace" };

export default async function PastorDashboardPage() {
  const organizationId = await getOrganizationId();
  const supabase = await createClient();

  const [{ data: prayers }, { data: cases }, { count: draftSermons }] = await Promise.all([
    supabase
      .from("prayer_requests")
      .select("id, submitter_name, request_body, status, created_at")
      .eq("organization_id", organizationId ?? "")
      .in("status", ["new", "in_progress"])
      .order("created_at", { ascending: false })
      .limit(6),
    supabase
      .from("care_cases")
      .select("id, category, status")
      .eq("organization_id", organizationId ?? "")
      .neq("status", "closed"),
    supabase.from("sermons").select("id", { count: "exact", head: true }).eq("organization_id", organizationId ?? "").eq("status", "draft"),
  ]);

  return (
    <>
      <div className="dashboard-header">
        <div>
          <h1>Today</h1>
          <p>Prayer needing attention, open care cases, and sermon prep.</p>
        </div>
      </div>

      <div className="stat-grid">
        <div className="stat-card">
          <b>{prayers?.length ?? 0}</b>
          <span>Prayer requests to review</span>
        </div>
        <div className="stat-card">
          <b>{cases?.length ?? 0}</b>
          <span>Open pastoral care cases</span>
        </div>
        <div className="stat-card">
          <b>{draftSermons ?? 0}</b>
          <span>Sermons in draft</span>
        </div>
      </div>

      <div className="panel">
        <h2>Prayer requests</h2>
        {(!prayers || prayers.length === 0) && <p className="panel-empty">Nothing pending — great work.</p>}
        {prayers?.map((p) => (
          <div key={p.id} style={{ padding: "10px 0", borderBottom: "1px solid var(--color-border)" }}>
            <p style={{ margin: 0, fontSize: ".88rem" }}>{p.request_body}</p>
            <small style={{ color: "var(--color-muted)" }}>{p.submitter_name ?? "Anonymous"} • {new Date(p.created_at).toLocaleDateString("en-JM")}</small>
          </div>
        ))}
        <Link className="link-button" href="/pastor/care">
          View pastoral care <span>→</span>
        </Link>
      </div>
    </>
  );
}
