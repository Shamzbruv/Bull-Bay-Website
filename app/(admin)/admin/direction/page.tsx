import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { getOrganizationId, getUserPermissions } from "@/lib/auth/session";
import { AccessDenied } from "@/components/access-denied";
import { PriorityToggle } from "./priority-toggle";
import { GoalControls } from "./goal-controls";

export const metadata: Metadata = { title: "Church Direction" };

export default async function AdminDirectionPage() {
  const organizationId = await getOrganizationId();
  const permissions = await getUserPermissions(organizationId ?? "");
  if (!permissions.has("direction.manage")) return <AccessDenied />;

  const supabase = await createClient();
  const { data: churchYear } = await supabase.from("church_years").select("*").eq("status", "active").maybeSingle();

  const [{ data: priorities }, { data: movements }] = await Promise.all([
    supabase.from("strategic_priorities").select("*").eq("church_year_id", churchYear?.id ?? "").order("sort_order"),
    supabase.from("strategic_movements").select("*, strategic_goals(*)").eq("church_year_id", churchYear?.id ?? "").order("sort_order"),
  ]);

  return (
    <>
      <div className="dashboard-header">
        <div>
          <h1>Church Direction</h1>
          <p>
            {churchYear?.label} ({churchYear?.starts_on} to {churchYear?.ends_on}) — priorities, movements,
            objectives, outcomes and goals.
          </p>
        </div>
      </div>

      <div className="panel">
        <h2>Strategic priorities</h2>
        {priorities?.map((p) => (
          <div key={p.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 0", borderBottom: "1px solid var(--color-border)" }}>
            <span>
              {p.title} {p.is_primary_focus && <span className="badge blue">Primary focus</span>}
            </span>
            <PriorityToggle id={p.id} publicVisible={p.public_visible} />
          </div>
        ))}
      </div>

      <div className="panel">
        <h2>Local movements &amp; SMART goals</h2>
        <p className="form-note">
          Goal text is preserved exactly as approved. Toggle &quot;Public&quot; only for goals the church is ready to
          share externally — everything defaults to internal.
        </p>
        {movements?.map((m) => (
          <div key={m.id} style={{ marginBottom: 20 }}>
            <b style={{ color: "var(--color-blue-700)" }}>
              {m.name} — {m.short_label}
            </b>
            <p style={{ fontSize: ".85rem", color: "var(--color-muted-2)", margin: "6px 0" }}>{m.objective}</p>
            <div className="data-table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Goal</th>
                    <th>Status / Visibility</th>
                  </tr>
                </thead>
                <tbody>
                  {(m.strategic_goals ?? []).map((g) => (
                    <tr key={g.id}>
                      <td>{g.goal_text}</td>
                      <td>
                        <GoalControls id={g.id} status={g.status} publicVisible={g.public_visible} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
