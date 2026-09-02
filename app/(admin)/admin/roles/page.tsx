import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { getOrganizationId, getUserPermissions } from "@/lib/auth/session";
import { AccessDenied } from "@/components/access-denied";
import { InviteForm } from "./invite-form";
import { RevokeButton } from "./revoke-button";

export const metadata: Metadata = { title: "Roles & Staff" };

export default async function AdminRolesPage() {
  const organizationId = await getOrganizationId();
  const permissions = await getUserPermissions(organizationId ?? "");
  if (!permissions.has("roles.manage")) return <AccessDenied />;

  const supabase = await createClient();
  const [{ data: roles }, { data: assignments }] = await Promise.all([
    supabase.from("roles").select("id, name, code").eq("organization_id", organizationId ?? "").order("name"),
    supabase
      .from("user_roles")
      .select("id, user_id, granted_at, roles(name)")
      .eq("organization_id", organizationId ?? ""),
  ]);

  // user_roles.user_id points at auth.users, not profiles — no direct FK for
  // PostgREST to embed, so resolve names with a second lookup by auth_user_id.
  const userIds = [...new Set((assignments ?? []).map((a) => a.user_id))];
  const { data: staffProfiles } = userIds.length
    ? await supabase.from("profiles").select("auth_user_id, first_name, last_name, email").in("auth_user_id", userIds)
    : { data: [] as { auth_user_id: string | null; first_name: string | null; last_name: string | null; email: string | null }[] };
  const profileByUserId = new Map((staffProfiles ?? []).map((p) => [p.auth_user_id, p]));

  return (
    <>
      <div className="dashboard-header">
        <div>
          <h1>Roles &amp; Staff</h1>
          <p>Invitation-only staff access — never make account creation equal church membership.</p>
        </div>
      </div>

      <div className="panel">
        <h2>Invite staff</h2>
        <InviteForm roles={roles ?? []} />
        <p className="form-note">Invited staff must enable two-factor authentication before they can access any workspace.</p>
      </div>

      <div className="panel">
        <h2>Current staff roles</h2>
        <div className="data-table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Person</th>
                <th>Role</th>
                <th>Granted</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {assignments?.map((a) => {
                const role = a.roles as unknown as { name: string } | null;
                const person = profileByUserId.get(a.user_id);
                return (
                  <tr key={a.id}>
                    <td>{person ? `${person.first_name ?? ""} ${person.last_name ?? ""}`.trim() || person.email : "Staff user"}</td>
                    <td>{role?.name}</td>
                    <td>{new Date(a.granted_at).toLocaleDateString("en-JM", { dateStyle: "medium" })}</td>
                    <td>
                      <RevokeButton userRoleId={a.id} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {(!assignments || assignments.length === 0) && <p className="panel-empty">No staff roles assigned yet.</p>}
      </div>
    </>
  );
}
