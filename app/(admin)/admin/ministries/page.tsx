import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { getOrganizationId, getUserPermissions } from "@/lib/auth/session";
import { AccessDenied } from "@/components/access-denied";
import { DeleteButton } from "@/components/delete-button";
import { deleteMinistry } from "@/app/(admin)/admin/actions";
import { MinistryForm } from "./ministry-form";

export const metadata: Metadata = { title: "Ministries" };

export default async function AdminMinistriesPage() {
  const organizationId = await getOrganizationId();
  const permissions = await getUserPermissions(organizationId ?? "");
  if (!permissions.has("content.manage")) return <AccessDenied />;

  const supabase = await createClient();
  const [{ data: ministries }, { data: profiles }] = await Promise.all([
    supabase
      .from("ministries")
      .select("id, slug, name, description, icon, leader_profile_id, is_active, profiles:leader_profile_id(first_name, last_name)").throwOnError()
      .eq("organization_id", organizationId ?? "")
      .order("sort_order"),
    supabase.from("profiles").select("id, first_name, last_name").throwOnError().eq("organization_id", organizationId ?? "").order("first_name"),
  ]);

  const leaders = (profiles ?? []).map((p) => ({
    id: p.id,
    name: `${p.first_name ?? ""} ${p.last_name ?? ""}`.trim() || "Unnamed",
  }));

  return (
    <>
      <div className="dashboard-header">
        <div>
          <h1>Ministries</h1>
          <p>Names, descriptions and leaders shown on the public Ministries page — set a leader to give them a My Team section.</p>
        </div>
      </div>

      <div className="panel">
        <h2>New ministry</h2>
        <MinistryForm leaders={leaders} />
      </div>

      <div className="panel">
        <h2>All ministries</h2>
        <div className="data-table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Leader</th>
                <th>Visible</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {ministries?.map((m) => {
                const leader = m.profiles as unknown as { first_name: string | null; last_name: string | null } | null;
                const leaderName = leader ? `${leader.first_name ?? ""} ${leader.last_name ?? ""}`.trim() : null;
                return (
                  <tr key={m.id}>
                    <td>
                      <details className="table-editor">
                        <summary>
                          {m.icon} {m.name}
                        </summary>
                        <MinistryForm ministry={m} leaders={leaders} />
                      </details>
                    </td>
                    <td>{leaderName || <span style={{ color: "var(--color-muted)" }}>Unassigned</span>}</td>
                    <td>
                      <span className={`badge ${m.is_active ? "" : "gray"}`}>{m.is_active ? "Visible" : "Hidden"}</span>
                    </td>
                    <td>
                      <DeleteButton action={deleteMinistry} id={m.id} confirmText={`Delete "${m.name}" permanently?`} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {(!ministries || ministries.length === 0) && <p className="panel-empty">No ministries yet.</p>}
      </div>
    </>
  );
}
