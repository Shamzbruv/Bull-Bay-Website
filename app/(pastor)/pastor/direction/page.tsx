import type { Metadata } from "next";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getOrganizationId, getUserPermissions } from "@/lib/auth/session";
import { AccessDenied } from "@/components/access-denied";

export const metadata: Metadata = { title: "Strategic Direction" };

export default async function PastorDirectionPage() {
  const organizationId = await getOrganizationId();
  const permissions = await getUserPermissions(organizationId ?? "");
  if (!permissions.has("direction.manage")) return <AccessDenied />;

  const supabase = await createClient();
  const { data: churchYear } = await supabase.from("church_years").select("*").eq("status", "active").maybeSingle();

  const [{ data: movements }, { data: planItems }] = await Promise.all([
    supabase
      .from("strategic_movements")
      .select("*, strategic_goals(*)")
      .eq("church_year_id", churchYear?.id ?? "")
      .order("sort_order", { ascending: true }),
    supabase
      .from("annual_plan_items")
      .select("*")
      .eq("church_year_id", churchYear?.id ?? "")
      .in("status", ["planned", "ready_to_publish"])
      .order("month", { ascending: true })
      .limit(10),
  ]);

  const totalGoals = (movements ?? []).reduce((sum, m) => sum + (m.strategic_goals?.length ?? 0), 0);
  const achievedGoals = (movements ?? []).reduce(
    (sum, m) => sum + (m.strategic_goals ?? []).filter((g) => g.status === "achieved").length,
    0,
  );

  return (
    <>
      <div className="dashboard-header">
        <div>
          <h1>Strategic Direction {churchYear?.label}</h1>
          <p>The seven movements, SMART-goal status, and upcoming annual-plan items for this church year.</p>
        </div>
      </div>

      <div className="stat-grid">
        <div className="stat-card">
          <b>{movements?.length ?? 0}</b>
          <span>Strategic movements</span>
        </div>
        <div className="stat-card">
          <b>
            {achievedGoals}/{totalGoals}
          </b>
          <span>Goals achieved</span>
        </div>
        <div className="stat-card">
          <b>{planItems?.length ?? 0}</b>
          <span>Upcoming annual-plan items</span>
        </div>
      </div>

      <div className="panel">
        <h2>Movements &amp; SMART goals</h2>
        <div style={{ display: "grid", gap: 16 }}>
          {movements?.map((m) => (
            <div key={m.id} style={{ borderBottom: "1px solid var(--color-border)", paddingBottom: 14 }}>
              <b style={{ color: "var(--color-blue-700)" }}>{m.name}</b>
              {(m.strategic_goals ?? []).map((g) => (
                <div key={g.id} style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", fontSize: ".85rem" }}>
                  <span>{g.goal_text}</span>
                  <span className={`badge ${g.status === "achieved" ? "" : g.status === "at_risk" ? "red" : "gray"}`}>
                    {g.status.replace("_", " ")}
                  </span>
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>

      <div className="panel">
        <h2>Upcoming annual-plan items</h2>
        {(!planItems || planItems.length === 0) && <p className="panel-empty">No planned items yet.</p>}
        {planItems?.map((p) => (
          <div key={p.id} style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: "1px solid var(--color-border)" }}>
            <span>
              {p.title} <small style={{ color: "var(--color-muted)" }}>({p.month})</small>
            </span>
            <span className="badge gray">{p.status.replace("_", " ")}</span>
          </div>
        ))}
      </div>

      <div className="panel">
        <h2>Related workspaces</h2>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <Link className="secondary-button compact" href="/pastor/care">
            Prayer &amp; Pastoral Care
          </Link>
          <Link className="secondary-button compact" href="/pastor/sermons">
            Sermon Planning
          </Link>
          <Link className="secondary-button compact" href="/admin/events">
            Events &amp; Annual Plan
          </Link>
        </div>
      </div>
    </>
  );
}
