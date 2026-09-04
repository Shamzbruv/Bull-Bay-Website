import { createClient, createServiceRoleClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/auth/session";
import { DAY_NAMES } from "@/lib/pastoral/reasons";
import { CounselRequestRow } from "@/app/(pastor)/pastor/care/counsel-request-row";
import { PrayerRequestRow } from "@/app/(pastor)/pastor/care/prayer-request-row";
import { AvailabilityForm, EventForm, RemoveAvailabilityButton, RemoveEventButton } from "./calendar-forms";

/**
 * Shared body for the pastoral-team calendar — rendered at /member/team-calendar
 * (for deacons/deaconesses/elders whose only access is the Member workspace)
 * and at /pastor/calendar (for the pastor, inside the Pastor shell). Kept as
 * one component so both routes always show identical content; only the
 * surrounding workspace chrome differs.
 */
export async function TeamCalendarView() {
  const profile = await getCurrentProfile();
  if (!profile) return null;

  const supabase = await createClient();
  const admin = createServiceRoleClient();
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

  const [{ data: availability }, { data: events }, { data: counselRequests }, { data: assignedPrayers }] = await Promise.all([
    supabase.from("pastoral_calendar_availability").select("id, day_of_week, start_time, end_time, label").eq("profile_id", profile.id).order("day_of_week"),
    supabase.from("pastoral_calendar_events").select("id, title, starts_at, ends_at, kind, visibility").eq("profile_id", profile.id).order("starts_at", { ascending: false }).limit(30),
    supabase
      .from("counsel_requests")
      .select("id, reason, details, is_urgent, status, preferred_date, preferred_time, profiles:requester_profile_id(first_name, last_name)")
      .eq("requested_with_profile_id", profile.id)
      .in("status", ["requested", "scheduled"])
      .order("is_urgent", { ascending: false })
      .order("created_at", { ascending: false }),
    profile.auth_user_id
      ? admin
          .from("prayer_requests")
          .select("id, submitter_name, request_body, visibility, status, assigned_to, created_at")
          .eq("organization_id", profile.organization_id)
          .eq("assigned_to", profile.auth_user_id)
          .in("status", ["new", "in_progress"])
          .order("created_at", { ascending: false })
      : Promise.resolve({ data: [] }),
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

      {assignedPrayers && assignedPrayers.length > 0 && (
        <div className="panel">
          <div className="panel-heading">
            <div>
              <p className="section-kicker">Prayer care</p>
              <h2>Assigned to you</h2>
            </div>
            <span className="badge gold">{assignedPrayers.length} open</span>
          </div>
          {assignedPrayers.map((prayer) => (
            <PrayerRequestRow
              key={prayer.id}
              id={prayer.id}
              name={prayer.submitter_name ?? "Anonymous"}
              body={prayer.request_body}
              visibility={prayer.visibility}
              status={prayer.status}
              createdAt={prayer.created_at}
              assignedTo={prayer.assigned_to}
              assignees={[]}
              canAssign={false}
            />
          ))}
        </div>
      )}

      <div className="panel">
        <div className="panel-heading">
          <div>
            <p className="section-kicker">Your care inbox</p>
            <h2>Meeting requests</h2>
          </div>
          <span className="badge blue">{counselRequests?.length ?? 0} open</span>
        </div>
        {(!counselRequests || counselRequests.length === 0) && (
          <p className="panel-empty">No requests are assigned to you right now.</p>
        )}
        {counselRequests?.map((request) => {
          const requester = request.profiles as unknown as { first_name: string | null; last_name: string | null } | null;
          return (
            <CounselRequestRow
              key={request.id}
              id={request.id}
              reason={request.reason}
              requesterName={`${requester?.first_name ?? ""} ${requester?.last_name ?? ""}`.trim() || "A member"}
              details={request.details}
              isUrgent={request.is_urgent}
              preferredDate={request.preferred_date}
              preferredTime={request.preferred_time}
              status={request.status}
            />
          );
        })}
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
