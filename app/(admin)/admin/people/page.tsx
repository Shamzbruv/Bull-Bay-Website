import Link from "next/link";
import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { getOrganizationId, getUserPermissions, isSuperAdmin, getAuthUser } from "@/lib/auth/session";
import { AccessDenied } from "@/components/access-denied";
import { StatusSelect } from "./status-select";
import { RoleSelect } from "./role-select";
import { InviteMemberForm } from "./invite-form";
import { ResetPasswordButton } from "./reset-password-button";

export const metadata: Metadata = { title: "People" };

export default async function AdminPeoplePage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q } = await searchParams;
  const organizationId = await getOrganizationId();
  const permissions = await getUserPermissions(organizationId ?? "");
  if (!permissions.has("people.read")) return <AccessDenied />;
  const canManageRoles = organizationId ? await isSuperAdmin(organizationId) : false;

  const actor = await getAuthUser();
  const supabase = await createClient();
  let request = supabase
    .from("profiles")
    .select("id, first_name, last_name, email, phone, membership_status, joined_at, auth_user_id, must_change_password").throwOnError()
    .eq("organization_id", organizationId ?? "")
    .order("last_name", { ascending: true })
    .limit(200);
  if (q) { const term = q.replace(/[^a-zA-Z0-9 @.+_-]/g, "").slice(0,100); request = request.or(`first_name.ilike.%${term}%,last_name.ilike.%${term}%,email.ilike.%${term}%,phone.ilike.%${term}%`); }
  const { data: people } = await request;

  // Staff role, shown and changed right here — Roles & Access is now
  // invitation-only (see app/(admin)/admin/roles/page.tsx).
  const { data: roles } = await supabase
    .from("roles")
    .select("id, name").throwOnError()
    .eq("organization_id", organizationId ?? "")
    .order("name");
  const authUserIds = (people ?? []).flatMap((p) => (p.auth_user_id ? [p.auth_user_id] : []));
  const { data: grants } = authUserIds.length
    ? await supabase
        .from("user_roles")
        .select("user_id, role_id, roles(name)").throwOnError()
        .eq("organization_id", organizationId ?? "")
        .in("user_id", authUserIds)
    : { data: [] as { user_id: string; role_id: string; roles: { name: string } | null }[] };
  const roleByUser = new Map(
    (grants ?? []).map((g) => [g.user_id, { id: g.role_id, name: (g.roles as unknown as { name: string } | null)?.name ?? "Staff" }]),
  );

  return (
    <>
      <div className="dashboard-header">
        <div>
          <h1>People</h1>
          <p>
            Church directory — {people?.length ?? 0} shown. Accounts are invitation-only.
            {canManageRoles && " Change someone's staff role right here in the Staff role column."}
          </p>
        </div>
      </div>

      {permissions.has("people.write") && (
        <div className="panel">
          <InviteMemberForm />
        </div>
      )}

      <form className="filter-row" style={{ marginBottom: 20 }}>
        <input className="filter-input" type="search" name="q" defaultValue={q} placeholder="Search name, email or phone" />
      </form>
      <div className="data-table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Email</th>
              <th>Phone</th>
              <th>Status</th>
              <th>Staff role</th>
              <th>Account</th>
              {permissions.has("people.write") && <th>Password</th>}
            </tr>
          </thead>
          <tbody>
            {people?.map((p) => {
              const grant = p.auth_user_id ? roleByUser.get(p.auth_user_id) : undefined;
              return (
                <tr key={p.id}>
                  <td>
                    <Link href={`/admin/people/${p.id}`}>{p.first_name} {p.last_name}</Link>
                  </td>
                  <td>{p.email}</td>
                  <td>{p.phone}</td>
                  <td>
                    {permissions.has("people.write") ? (
                      <StatusSelect profileId={p.id} status={p.membership_status} />
                    ) : (
                      <span className="badge">{p.membership_status}</span>
                    )}
                  </td>
                  <td>
                    {canManageRoles ? (
                      p.auth_user_id === actor?.id || p.email?.toLowerCase() === "shamzbiz1@gmail.com" ? (
                        <span className="badge">{grant?.name ?? "Super Administrator"} (locked)</span>
                      ) : p.auth_user_id ? (
                        <RoleSelect profileId={p.id} roleId={grant?.id ?? ""} roles={roles ?? []} />
                      ) : (
                        <span className="badge gray" title="Invite them first">invite first</span>
                      )
                    ) : (
                      <span className="badge">{grant?.name ?? "Member"}</span>
                    )}
                  </td>
                  <td>
                    {p.auth_user_id ? (
                      p.must_change_password ? (
                        <span className="badge gold">password pending</span>
                      ) : (
                        <span className="badge blue">active</span>
                      )
                    ) : (
                      <span className="badge gray">not invited</span>
                    )}
                  </td>
                  {permissions.has("people.write") && (
                    <td>
                      <ResetPasswordButton profileId={p.id} hasAccount={Boolean(p.auth_user_id)} />
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </>
  );
}
