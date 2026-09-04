import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { getOrganizationId, getUserPermissions } from "@/lib/auth/session";
import { AccessDenied } from "@/components/access-denied";
import { GroupForm } from "./group-form";
import { RequestButtons } from "./request-buttons";

export const metadata: Metadata = { title: "Groups" };

export default async function AdminGroupsPage() {
  const organizationId = await getOrganizationId();
  const permissions = await getUserPermissions(organizationId ?? "");
  if (!permissions.has("groups.manage")) return <AccessDenied />;

  const supabase = await createClient();
  const [{ data: groups }, { data: requests }] = await Promise.all([
    supabase.from("groups").select("id, name, category, description, meeting_schedule, visibility, is_active, group_members(id)").eq("organization_id", organizationId ?? "").order("name"),
    supabase.from("group_members").select("id, profiles(first_name, last_name), groups(name)").eq("status", "requested"),
  ]);

  return (
    <>
      <div className="dashboard-header">
        <div>
          <h1>Groups</h1>
          <p>Small groups and ministry teams.</p>
        </div>
      </div>

      {requests && requests.length > 0 && (
        <div className="panel">
          <h2>Pending join requests</h2>
          {requests.map((r) => {
            const profile = r.profiles as unknown as { first_name: string | null; last_name: string | null } | null;
            const group = r.groups as unknown as { name: string } | null;
            return (
              <div key={r.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 0", borderBottom: "1px solid var(--color-border)" }}>
                <span>
                  {profile?.first_name} {profile?.last_name} → <b>{group?.name}</b>
                </span>
                <RequestButtons memberId={r.id} />
              </div>
            );
          })}
        </div>
      )}

      <div className="panel">
        <details className="dashboard-disclosure">
          <summary>+ Create a group or ministry team</summary>
          <GroupForm />
        </details>
      </div>

      <div className="panel">
        <h2>All groups</h2>
        <div className="data-table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Category</th>
                <th>Members</th>
                <th>Active</th>
              </tr>
            </thead>
            <tbody>
              {groups?.map((g) => (
                <tr key={g.id}>
                  <td>
                    <details className="table-editor">
                      <summary>{g.name}</summary>
                      <GroupForm group={g} />
                    </details>
                  </td>
                  <td>{g.category}</td>
                  <td>{g.group_members?.length ?? 0}</td>
                  <td>{g.is_active ? "Yes" : "No"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
