import type { Metadata } from "next";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/auth/session";

export const metadata: Metadata = { title: "My Church" };

export default async function MemberDashboardPage() {
  const supabase = await createClient();
  const profile = await getCurrentProfile();

  const [{ data: registrations }, { data: groups }, { data: shifts }] = await Promise.all([
    supabase
      .from("event_registrations")
      .select("id, events(title, starts_at, slug)")
      .eq("profile_id", profile?.id ?? "")
      .eq("status", "registered")
      .limit(3),
    supabase.from("group_members").select("id, groups(name, slug)").eq("profile_id", profile?.id ?? "").eq("status", "active").limit(3),
    supabase
      .from("volunteer_assignments")
      .select("shift_id, status, volunteer_shifts(starts_at, volunteer_opportunities(title))")
      .eq("profile_id", profile?.id ?? "")
      .limit(3),
  ]);

  return (
    <>
      <div className="dashboard-header">
        <div>
          <h1>Welcome{profile?.first_name ? `, ${profile.first_name}` : ""}.</h1>
          <p>Here&apos;s what&apos;s next for you at Bull Bay.</p>
        </div>
      </div>

      <div className="panel">
        <h2>Upcoming registrations</h2>
        {(!registrations || registrations.length === 0) && <p className="panel-empty">No upcoming event registrations.</p>}
        {registrations?.map((r) => {
          const event = r.events as unknown as { title: string; starts_at: string; slug: string } | null;
          if (!event) return null;
          return (
            <div key={r.id} style={{ padding: "10px 0", borderBottom: "1px solid var(--color-border)" }}>
              <Link href={`/events/${event.slug}`}>
                <b>{event.title}</b>
              </Link>
              <div style={{ fontSize: ".78rem", color: "var(--color-muted)" }}>
                {new Date(event.starts_at).toLocaleString("en-JM", { dateStyle: "medium", timeStyle: "short", timeZone: "America/Jamaica" })}
              </div>
            </div>
          );
        })}
      </div>

      <div className="panel">
        <h2>Your groups</h2>
        {(!groups || groups.length === 0) && <p className="panel-empty">You haven&apos;t joined a group yet.</p>}
        {groups?.map((g) => {
          const group = g.groups as unknown as { name: string; slug: string } | null;
          if (!group) return null;
          return (
            <Link key={g.id} href={`/groups/${group.slug}`} style={{ display: "block", padding: "8px 0" }}>
              {group.name}
            </Link>
          );
        })}
        <Link className="link-button" href="/groups">
          Explore groups <span>→</span>
        </Link>
      </div>

      <div className="panel">
        <h2>Serving</h2>
        {(!shifts || shifts.length === 0) && <p className="panel-empty">No serving assignments yet.</p>}
        {shifts?.map((s) => {
          const shift = s.volunteer_shifts as unknown as { starts_at: string; volunteer_opportunities: { title: string } | null } | null;
          return (
            <div key={s.shift_id} style={{ padding: "8px 0" }}>
              <b>{shift?.volunteer_opportunities?.title}</b> — <span className="badge">{s.status}</span>
            </div>
          );
        })}
      </div>
    </>
  );
}
