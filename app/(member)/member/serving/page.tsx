import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/auth/session";

export const metadata: Metadata = { title: "My Serving" };

export default async function MyServingPage() {
  const profile = await getCurrentProfile();
  const supabase = await createClient();
  const { data: assignments } = await supabase
    .from("volunteer_assignments")
    .select("shift_id, status, volunteer_shifts(starts_at, volunteer_opportunities(title))")
    .eq("profile_id", profile?.id ?? "");

  return (
    <>
      <div className="dashboard-header">
        <div>
          <h1>My Serving</h1>
          <p>Volunteer shifts you&apos;ve signed up for.</p>
        </div>
      </div>
      <div className="panel">
        {(!assignments || assignments.length === 0) && <p className="panel-empty">No serving assignments yet.</p>}
        {assignments?.map((a) => {
          const shift = a.volunteer_shifts as unknown as { starts_at: string; volunteer_opportunities: { title: string } | null } | null;
          return (
            <div key={a.shift_id} style={{ display: "flex", justifyContent: "space-between", padding: "10px 0", borderBottom: "1px solid var(--color-border)" }}>
              <div>
                <b>{shift?.volunteer_opportunities?.title}</b>
                <div style={{ fontSize: ".78rem", color: "var(--color-muted)" }}>
                  {shift && new Date(shift.starts_at).toLocaleString("en-JM", { dateStyle: "medium", timeStyle: "short", timeZone: "America/Jamaica" })}
                </div>
              </div>
              <span className="badge">{a.status}</span>
            </div>
          );
        })}
      </div>
    </>
  );
}
