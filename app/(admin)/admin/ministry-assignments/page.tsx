import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { getOrganizationId, getUserPermissions } from "@/lib/auth/session";
import { AccessDenied } from "@/components/access-denied";
import { AssignmentRow } from "./assignment-row";

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
  const { data: ministries } = await supabase.from("ministries").select("id, slug, name").order("name");

  let query = supabase
    .from("ministry_assignments")
    .select("id, position_title, display_name, is_active, public_visible, ministry_id, profiles(first_name, last_name)")
    .order("sort_order");
  if (ministryFilter) {
    const m = ministries?.find((mm) => mm.slug === ministryFilter);
    if (m) query = query.eq("ministry_id", m.id);
  }
  const { data: assignments } = await query;

  const ministryNameById = new Map((ministries ?? []).map((m) => [m.id, m.name]));

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
