import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { getOrganizationId, getUserPermissions } from "@/lib/auth/session";
import { AccessDenied } from "@/components/access-denied";
import { StatusSelect } from "./status-select";

export const metadata: Metadata = { title: "People" };

export default async function AdminPeoplePage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q } = await searchParams;
  const organizationId = await getOrganizationId();
  const permissions = await getUserPermissions(organizationId ?? "");
  if (!permissions.has("people.read")) return <AccessDenied />;

  const supabase = await createClient();
  let request = supabase
    .from("profiles")
    .select("id, first_name, last_name, email, phone, membership_status, joined_at")
    .eq("organization_id", organizationId ?? "")
    .order("last_name", { ascending: true })
    .limit(100);
  if (q) request = request.ilike("last_name", `%${q}%`);
  const { data: people } = await request;

  return (
    <>
      <div className="dashboard-header">
        <div>
          <h1>People</h1>
          <p>Church directory — {people?.length ?? 0} shown.</p>
        </div>
      </div>
      <form className="filter-row" style={{ marginBottom: 20 }}>
        <input className="filter-input" type="search" name="q" defaultValue={q} placeholder="Search by last name" />
      </form>
      <div className="data-table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Email</th>
              <th>Phone</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {people?.map((p) => (
              <tr key={p.id}>
                <td>
                  {p.first_name} {p.last_name}
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
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
