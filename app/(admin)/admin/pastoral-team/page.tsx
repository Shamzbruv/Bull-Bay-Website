import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { getOrganizationId, getUserPermissions } from "@/lib/auth/session";
import { AccessDenied } from "@/components/access-denied";
import { TeamForm } from "./team-form";
import { TeamRow } from "./team-row";

export const metadata: Metadata = { title: "Pastoral Team" };

export default async function AdminPastoralTeamPage() {
  const organizationId = await getOrganizationId();
  const permissions = await getUserPermissions(organizationId ?? "");
  if (!permissions.has("pastoral_calendar.manage")) return <AccessDenied />;

  const supabase = await createClient();
  const { data: members } = await supabase
    .from("pastoral_team_members")
    .select("id, role_title, bio, is_pastor, is_trained_counselor, is_active, profiles(first_name, last_name)")
    .order("is_pastor", { ascending: false })
    .order("sort_order");

  return (
    <>
      <div className="dashboard-header">
        <div>
          <h1>Pastoral Team</h1>
          <p>
            Who appears on the pastor &amp; calendar page — able to publish their own working hours, and to be
            requested for counsel. Mark exactly one person as the Senior Pastor.
          </p>
        </div>
      </div>

      <div className="panel">
        <h2>Add someone</h2>
        <TeamForm />
      </div>

      <div className="panel">
        <h2>Current team</h2>
        <div className="data-table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Role</th>
                <th>Counselling</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {members?.map((m) => {
                const p = m.profiles as unknown as { first_name: string | null; last_name: string | null } | null;
                return (
                  <TeamRow
                    key={m.id}
                    id={m.id}
                    name={`${p?.first_name ?? ""} ${p?.last_name ?? ""}`.trim() || "—"}
                    roleTitle={m.role_title}
                    bio={m.bio}
                    isPastor={m.is_pastor}
                    isTrainedCounselor={m.is_trained_counselor}
                    isActive={m.is_active}
                  />
                );
              })}
            </tbody>
          </table>
        </div>
        {(!members || members.length === 0) && <p className="panel-empty">No pastoral team members yet.</p>}
      </div>
    </>
  );
}
