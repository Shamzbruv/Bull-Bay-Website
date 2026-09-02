import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/auth/session";
import { ConferenceDownload } from "./conference-download";

export const metadata: Metadata = { title: "My Ministry & Serving" };

export default async function MyMinistryPage() {
  const profile = await getCurrentProfile();
  const supabase = await createClient();

  const [{ data: assignments }, { data: shifts }] = await Promise.all([
    supabase
      .from("ministry_assignments")
      .select("id, position_title, is_active, ministries(name, slug)")
      .eq("profile_id", profile?.id ?? "")
      .eq("is_active", true),
    supabase
      .from("volunteer_assignments")
      .select("shift_id, status, volunteer_shifts(starts_at, volunteer_opportunities(title))")
      .eq("profile_id", profile?.id ?? ""),
  ]);

  return (
    <>
      <div className="dashboard-header">
        <div>
          <h1>My Ministry &amp; Serving</h1>
          <p>Your ministry positions, serving shifts, and the current church conference document.</p>
        </div>
      </div>

      <div className="panel">
        <h2>My ministry assignments</h2>
        {(!assignments || assignments.length === 0) && (
          <p className="panel-empty">
            No ministry positions are linked to your account yet. If you serve on a ministry team, ask a church
            administrator to confirm and link your record.
          </p>
        )}
        {assignments?.map((a) => {
          const ministry = a.ministries as unknown as { name: string; slug: string } | null;
          return (
            <div key={a.id} style={{ display: "flex", justifyContent: "space-between", padding: "10px 0", borderBottom: "1px solid var(--color-border)" }}>
              <span>{ministry?.name}</span>
              <span className="badge">{a.position_title}</span>
            </div>
          );
        })}
      </div>

      <div className="panel">
        <h2>My serving shifts</h2>
        {(!shifts || shifts.length === 0) && <p className="panel-empty">No serving shifts scheduled yet.</p>}
        {shifts?.map((s) => {
          const shift = s.volunteer_shifts as unknown as { starts_at: string; volunteer_opportunities: { title: string } | null } | null;
          return (
            <div key={s.shift_id} style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: "1px solid var(--color-border)" }}>
              <div>
                <b>{shift?.volunteer_opportunities?.title}</b>
                <div style={{ fontSize: ".78rem", color: "var(--color-muted)" }}>
                  {shift && new Date(shift.starts_at).toLocaleString("en-JM", { dateStyle: "medium", timeStyle: "short", timeZone: "America/Jamaica" })}
                </div>
              </div>
              <span className="badge">{s.status}</span>
            </div>
          );
        })}
      </div>

      <div className="panel">
        <h2>Church Members Conference 2026–2027</h2>
        <p style={{ color: "var(--color-muted-2)" }}>
          The full conference document — our vision, mission, strategic direction and annual plan — is available for
          every signed-in member.
        </p>
        <ConferenceDownload />
      </div>
    </>
  );
}
