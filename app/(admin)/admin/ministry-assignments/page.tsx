import type { Metadata } from "next";
import { createClient, createServiceRoleClient } from "@/lib/supabase/server";
import { getOrganizationId, getUserPermissions } from "@/lib/auth/session";
import { AccessDenied } from "@/components/access-denied";
import { AssignmentRow } from "./assignment-row";
import { CreateAssignmentForm } from "./create-assignment-form";

export const metadata: Metadata = { title: "Ministry Assignments" };

export default async function AdminMinistryAssignmentsPage({
  searchParams,
}: {
  searchParams: Promise<{ ministry?: string }>;
}) {
  const { ministry: ministryFilter } = await searchParams;
  const organizationId = await getOrganizationId();
  const permissions = await getUserPermissions(organizationId ?? "");
  if (!permissions.has("ministry_assignments.manage")) return <AccessDenied />;

  const supabase = await createClient();
  const { data: ministries } = await supabase.from("ministries").select("id, slug, name").throwOnError().order("name");

  let query = createServiceRoleClient()
    .from("ministry_assignments")
    .select("id, position_title, display_name, is_active, public_visible, ministry_id, profiles(first_name, last_name)").throwOnError()
    .eq("organization_id", organizationId!)
    .order("sort_order");
  if (ministryFilter) {
    const m = ministries?.find((mm) => mm.slug === ministryFilter);
    if (m) query = query.eq("ministry_id", m.id);
  }
  const { data: assignments } = await query;
  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, first_name, last_name, email").throwOnError()
    .eq("organization_id", organizationId ?? "")
    .order("first_name");

  const ministryNameById = new Map((ministries ?? []).map((m) => [m.id, m.name]));
  const members = (profiles ?? []).map((p) => ({
    id: p.id,
    name: `${p.first_name ?? ""} ${p.last_name ?? ""}`.trim() || p.email || "Unnamed",
    email: p.email,
  }));

  return (
    <>
      <div className="dashboard-header">
        <div>
          <h1>Ministry Assignments</h1>
          <p>
            The 2026–2027 worker roster, imported from the conference deck. Everything defaults to internal — mark a
            row &quot;Public&quot; only once it&apos;s confirmed for public display, and link to a member profile
            only after verifying the person.
          </p>
        </div>
      </div>

      <div className="panel">
        <h2>Add someone to a ministry</h2>
        <CreateAssignmentForm ministries={(ministries ?? []).map((m) => ({ id: m.id, name: m.name }))} members={members} />
      </div>

      <div className="filter-pills" style={{ marginBottom: 20 }}>
        <a href="/admin/ministry-assignments" className={!ministryFilter ? "active" : ""}>
          All ({assignments?.length ?? 0})
        </a>
        {ministries?.map((m) => (
          <a key={m.id} href={`/admin/ministry-assignments?ministry=${m.slug}`} className={ministryFilter === m.slug ? "active" : ""}>
            {m.name}
          </a>
        ))}
      </div>

      <div className="panel">
        <div className="data-table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Position</th>
                <th>Person</th>
                <th>Active</th>
                <th>Visibility</th>
                <th>Link to member</th>
              </tr>
            </thead>
            <tbody>
              {assignments?.map((a) => {
                const linked = a.profiles as unknown as { first_name: string | null; last_name: string | null } | null;
                return (
                  <AssignmentRow
                    key={a.id}
                    id={a.id}
                    positionTitle={`${a.position_title}${!ministryFilter ? ` — ${ministryNameById.get(a.ministry_id) ?? ""}` : ""}`}
                    displayName={a.display_name}
                    linkedName={linked ? `${linked.first_name ?? ""} ${linked.last_name ?? ""}`.trim() : null}
                    isActive={a.is_active}
                    publicVisible={a.public_visible}
                  />
                );
              })}
            </tbody>
          </table>
        </div>
        {(!assignments || assignments.length === 0) && <p className="panel-empty">No assignments found.</p>}
      </div>
    </>
  );
}
