import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/auth/session";
import { DescriptionForm, AddTeamMemberForm } from "./ministry-team-forms";
import { TeamMemberRow } from "./team-member-row";

export const metadata: Metadata = { title: "My Team" };

export default async function MyMinistryTeamPage() {
  const profile = await getCurrentProfile();
  const supabase = await createClient();

  const { data: ledMinistries } = profile
    ? await supabase
        .from("ministries")
        .select("id, name, icon, description, slug")
        .eq("leader_profile_id", profile.id)
        .order("name")
    : { data: null };

  if (!ledMinistries || ledMinistries.length === 0) {
    return (
      <>
        <div className="dashboard-header">
          <div>
            <h1>My Team</h1>
            <p>This is for ministry leaders — you don&apos;t currently lead a ministry on file.</p>
          </div>
        </div>
        <p className="panel-empty">
          If you lead a ministry, ask a church administrator to set you as its leader under Admin → Ministries.
        </p>
      </>
    );
  }

  const ministryIds = ledMinistries.map((m) => m.id);
  const { data: assignments } = await supabase
    .from("ministry_assignments")
    .select("id, ministry_id, position_title, display_name, public_visible, profiles(first_name, last_name)")
    .in("ministry_id", ministryIds)
    .eq("is_active", true)
    .order("sort_order");

  return (
    <>
      <div className="dashboard-header">
        <div>
          <h1>My Team</h1>
          <p>Keep your ministry&apos;s description and team roster current — changes show up on the public Ministries page right away.</p>
        </div>
      </div>

      {ledMinistries.map((ministry) => {
        const roster = (assignments ?? []).filter((a) => a.ministry_id === ministry.id);
        return (
          <div className="panel" key={ministry.id}>
            <h2>
              {ministry.icon} {ministry.name}
            </h2>

            <h3 style={{ fontSize: ".92rem", marginTop: 18 }}>Description</h3>
            <DescriptionForm ministryId={ministry.id} description={ministry.description} />

            <h3 style={{ fontSize: ".92rem", marginTop: 26 }}>Team</h3>
            {roster.length === 0 && <p className="panel-empty">No team members added yet.</p>}
            {roster.length > 0 && (
              <div className="data-table-wrap" style={{ marginBottom: 16 }}>
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>Role</th>
                      <th>Visibility</th>
                      <th />
                    </tr>
                  </thead>
                  <tbody>
                    {roster.map((a) => {
                      const linked = a.profiles as unknown as { first_name: string | null; last_name: string | null } | null;
                      const name = linked ? `${linked.first_name ?? ""} ${linked.last_name ?? ""}`.trim() : (a.display_name ?? "—");
                      return (
                        <TeamMemberRow
                          key={a.id}
                          id={a.id}
                          ministryId={ministry.id}
                          name={name}
                          isLinked={Boolean(linked)}
                          positionTitle={a.position_title}
                          publicVisible={a.public_visible}
                        />
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
            <details className="dashboard-disclosure">
              <summary>+ Add a team member</summary>
              <AddTeamMemberForm ministryId={ministry.id} />
            </details>
          </div>
        );
      })}
    </>
  );
}
