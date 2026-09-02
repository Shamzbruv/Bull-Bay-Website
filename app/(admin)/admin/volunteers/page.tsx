import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { getOrganizationId, getUserPermissions } from "@/lib/auth/session";
import { AccessDenied } from "@/components/access-denied";
import { OpportunityForm } from "./opportunity-form";
import { ShiftForm } from "./shift-form";

export const metadata: Metadata = { title: "Volunteers" };

export default async function AdminVolunteersPage() {
  const organizationId = await getOrganizationId();
  const permissions = await getUserPermissions(organizationId ?? "");
  if (!permissions.has("volunteers.manage")) return <AccessDenied />;

  const supabase = await createClient();
  const { data: opportunities } = await supabase
    .from("volunteer_opportunities")
    .select("id, title, description, volunteer_shifts(id, starts_at, slots, volunteer_assignments(id))")
    .eq("organization_id", organizationId ?? "")
    .order("title");

  return (
    <>
      <div className="dashboard-header">
        <div>
          <h1>Volunteers</h1>
          <p>Serving opportunities, shifts, and who has signed up.</p>
        </div>
      </div>
      <div className="panel">
        <h2>New opportunity</h2>
        <OpportunityForm />
      </div>
      {opportunities?.map((opp) => (
        <div className="panel" key={opp.id}>
          <h2>{opp.title}</h2>
          {opp.description && <p style={{ color: "var(--color-muted-2)" }}>{opp.description}</p>}
          {(opp.volunteer_shifts ?? []).map((shift) => (
            <div key={shift.id} style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: "1px solid var(--color-border)" }}>
              <span>{new Date(shift.starts_at).toLocaleString("en-JM", { dateStyle: "medium", timeStyle: "short", timeZone: "America/Jamaica" })}</span>
              <span className="badge">{shift.volunteer_assignments?.length ?? 0} / {shift.slots} filled</span>
            </div>
          ))}
          <ShiftForm opportunityId={opp.id} />
        </div>
      ))}
      {(!opportunities || opportunities.length === 0) && <p className="panel-empty">No volunteer opportunities yet.</p>}
    </>
  );
}
