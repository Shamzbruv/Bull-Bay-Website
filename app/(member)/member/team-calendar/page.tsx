import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/auth/session";
import { DAY_NAMES } from "@/lib/pastoral/reasons";
import { AvailabilityForm, EventForm, RemoveAvailabilityButton, RemoveEventButton } from "./calendar-forms";

export const metadata: Metadata = { title: "My Pastoral Calendar" };

export default async function TeamCalendarPage() {
  const profile = await getCurrentProfile();
  if (!profile) return null;

  const supabase = await createClient();
  const { data: teamRow } = await supabase
    .from("pastoral_team_members")
    .select("role_title, is_pastor, is_active")
    .eq("profile_id", profile.id)
    .maybeSingle();

  if (!teamRow) {
    return (
      <div className="panel">
        <h1>My Pastoral Calendar</h1>
        <p className="panel-empty">
          This page is for the pastor and pastoral team (deacons, deaconesses, elders). You&apos;re not currently
          listed on the pastoral team — contact the church office if you believe this is a mistake.
        </p>
      </div>
    );
  }

  const [{ data: availability }, { data: events }] = await Promise.all([
    supabase.from("pastoral_calendar_availability").select("id, day_of_week, start_time, end_time, label").eq("profile_id", profile.id).order("day_of_week"),
    supabase.from("pastoral_calendar_events").select("id, title, starts_at, ends_at, kind, visibility").eq("profile_id", profile.id).order("starts_at", { ascending: false }).limit(30),
  ]);

  return (
    <>
      <div className="dashboard-header">
        <div>
          <h1>My Pastoral Calendar</h1>
          <p>
            {teamRow.is_pastor
              ? "Your working hours and days off are shown to every member on the Pastor & Calendar page."
              : "Your working hours and days off are shown to members under “Request help from the pastoral team.”"}
            {!teamRow.is_active && <span className="badge gray" style={{ marginLeft: 8 }}>currently inactive</span>}
          </p>
        </div>
      </div>

      <div className="panel">
        <h2>Weekly working hours</h2>
        {DAY_NAMES.map((day, i) => {
          const rows = availability?.filter((a) => a.day_of_week === i) ?? [];
          return (
            <div key={day} style={{ padding: "8px 0", borderBottom: "1px solid var(--color-border)" }}>
              <b style={{ display: "inline-block", width: 100 }}>{day}</b>
              {rows.length === 0 && <span style={{ color: "var(--color-muted-2)", fontSize: ".85rem" }}>Not published</span>}
              {rows.map((r) => (
                <span key={r.id} style={{ marginRight: 14, fontSize: ".85rem" }}>
                  {r.start_time.slice(0, 5)}–{r.end_time.slice(0, 5)} {r.label && `(${r.label})`}{" "}
                  <RemoveAvailabilityButton id={r.id} />
                </span>
              ))}
            </div>
          );
        })}
        <div style={{ marginTop: 16 }}>
          <AvailabilityForm />
        </div>
      </div>

      <div className="panel">
        <h2>Days off &amp; calendar entries</h2>
        {(!events || events.length === 0) && <p className="panel-empty">Nothing on your calendar yet.</p>}
        {events?.map((e) => (
          <div key={e.id} style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: "1px solid var(--color-border)", fontSize: ".88rem" }}>
            <span>
              <b>{e.title}</b> — {new Date(e.starts_at).toLocaleString("en-JM", { dateStyle: "medium", timeStyle: "short" })} to{" "}
              {new Date(e.ends_at).toLocaleString("en-JM", { dateStyle: "medium", timeStyle: "short" })}{" "}
              <span className="badge gray">{e.kind.replace("_", " ")}</span> <span className="badge gray">{e.visibility}</span>
            </span>
            <RemoveEventButton id={e.id} />
          </div>
        ))}
        <div style={{ marginTop: 16 }}>
          <EventForm />
        </div>
      </div>
    </>
  );
}
