import Link from "next/link";
import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { getOrganizationId, getUserPermissions, isSuperAdmin, getAuthUser } from "@/lib/auth/session";
import { AccessDenied } from "@/components/access-denied";
import { StatusSelect } from "./status-select";
import { RoleSelect } from "./role-select";
import { InviteMemberForm } from "./invite-form";
import { ResetPasswordButton } from "./reset-password-button";
import { whatsAppLink } from "@/lib/members/whatsapp";

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
              <th>WhatsApp</th>
              <th>Status</th>
              <th>Staff role</th>
              <th>Account</th>
              {permissions.has("people.write") && <th>Password</th>}
            </tr>
          </thead>
          <tbody>
            {people?.map((p) => {
              const grant = p.auth_user_id ? roleByUser.get(p.auth_user_id) : undefined;
              const wa = whatsAppLink(p.phone);
              return (
                <tr key={p.id}>
                  <td>
                    <Link href={`/admin/people/${p.id}`}>{p.first_name} {p.last_name}</Link>
                  </td>
                  <td>{p.email}</td>
                  <td>{p.phone}</td>
                  <td>
                    {wa ? (
                      <a
                        className="secondary-button compact whatsapp-button"
                        href={wa}
                        target="_blank"
                        rel="noopener noreferrer"
                        title={`Open a WhatsApp chat with ${p.first_name ?? "this member"}`}
                      >
                        <WhatsAppIcon /> Message
                      </a>
                    ) : (
                      <span className="badge gray" title="No phone number on file that WhatsApp can open">
                        no number
                      </span>
                    )}
                  </td>
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

function WhatsAppIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 32 32" width="15" height="15" fill="currentColor">
      <path d="M16.001 3C9.096 3 3.5 8.596 3.5 15.5c0 2.42.674 4.68 1.845 6.607L3 29l7.087-2.31A12.44 12.44 0 0 0 16 28.5c6.905 0 12.5-5.596 12.5-12.5S22.906 3 16.001 3Zm.001 22.75a10.2 10.2 0 0 1-5.207-1.428l-.374-.222-3.968 1.292 1.31-3.868-.244-.396A10.19 10.19 0 0 1 5.75 15.5c0-5.66 4.59-10.25 10.25-10.25S26.25 9.84 26.25 15.5 21.66 25.75 16.002 25.75Zm5.61-7.677c-.307-.154-1.816-.897-2.098-1-.281-.103-.486-.154-.69.154-.205.307-.792 1-.972 1.205-.179.205-.358.23-.665.077-.307-.154-1.296-.478-2.469-1.524-.913-.814-1.53-1.82-1.709-2.128-.179-.307-.019-.473.135-.626.139-.138.307-.358.46-.537.154-.18.205-.307.307-.512.103-.205.051-.384-.026-.538-.077-.154-.69-1.663-.945-2.279-.249-.598-.502-.517-.69-.527l-.588-.01c-.205 0-.538.077-.82.384-.281.307-1.075 1.05-1.075 2.56s1.1 2.97 1.253 3.176c.154.205 2.166 3.307 5.248 4.636.733.317 1.305.506 1.751.647.735.234 1.404.201 1.933.122.59-.088 1.816-.742 2.072-1.46.256-.717.256-1.332.18-1.46-.078-.128-.283-.205-.59-.358Z" />
    </svg>
  );
}
