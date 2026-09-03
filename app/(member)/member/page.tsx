import type { Metadata } from "next";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/auth/session";
import { RealtimeRefresh } from "@/components/realtime-refresh";

export const metadata: Metadata = { title: "My Church" };

export default async function MemberDashboardPage() {
  const supabase = await createClient();
  const profile = await getCurrentProfile();

  const [{ data: registrations }, { data: groups }, { data: shifts }, { data: broadcasts }, { data: announcements }, { data: lastAttendance }] = await Promise.all([
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
    supabase.from("pastor_broadcasts").select("id, title, body, created_at").order("created_at", { ascending: false }).limit(3),
    supabase.from("announcements").select("id, title, body, published_at").eq("status", "published").order("published_at", { ascending: false }).limit(4),
    supabase.from("attendance_records").select("headcount, service_date, service_schedules(label)").order("service_date", { ascending: false }).limit(1).maybeSingle(),
  ]);

  const lastService = lastAttendance?.service_schedules as unknown as { label: string } | null;

  return (
    <>
      <RealtimeRefresh tables={["pastor_broadcasts", "announcements", "attendance_records"]} />
      <div className="dashboard-header">
        <div>
          <h1>Welcome{profile?.first_name ? `, ${profile.first_name}` : ""}.</h1>
          <p>Here&apos;s what&apos;s next for you at Bull Bay.</p>
        </div>
      </div>

      {lastAttendance && (
        <div className="panel" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
          <div>
            <h2 style={{ margin: 0 }}>{lastService?.label ?? "Last service"}</h2>
            <p style={{ margin: "4px 0 0", color: "var(--color-muted-2)", fontSize: ".88rem" }}>
              {new Date(lastAttendance.service_date).toLocaleDateString("en-JM", { dateStyle: "long" })}
            </p>
          </div>
          <div style={{ textAlign: "right" }}>
            <b style={{ fontSize: "1.8rem", color: "var(--color-blue-700)" }}>{lastAttendance.headcount}</b>
            <div style={{ fontSize: ".78rem", color: "var(--color-muted-2)" }}>in attendance</div>
          </div>
          <Link className="link-button" href="/member/attendance">
            See history <span>→</span>
          </Link>
        </div>
      )}

      {broadcasts && broadcasts.length > 0 && (
        <div className="panel" style={{ borderLeft: "4px solid var(--color-blue-700)" }}>
          <h2>From the Pastor&apos;s Desk</h2>
          {broadcasts.map((b) => (
            <div key={b.id} style={{ padding: "10px 0", borderBottom: "1px solid var(--color-border)" }}>
              <b>{b.title}</b>
              <p style={{ margin: "4px 0 0", fontSize: ".88rem", whiteSpace: "pre-wrap" }}>{b.body}</p>
              <small style={{ color: "var(--color-muted)" }}>{new Date(b.created_at).toLocaleDateString("en-JM", { dateStyle: "medium" })}</small>
            </div>
          ))}
        </div>
      )}

      {announcements && announcements.length > 0 && (
        <div className="panel">
          <h2>Bulletin</h2>
          {announcements.map((a) => (
            <div key={a.id} style={{ padding: "8px 0", borderBottom: "1px solid var(--color-border)" }}>
              <b style={{ fontSize: ".9rem" }}>{a.title}</b>
              <p style={{ margin: "2px 0 0", fontSize: ".85rem" }}>{a.body}</p>
            </div>
          ))}
        </div>
      )}

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
