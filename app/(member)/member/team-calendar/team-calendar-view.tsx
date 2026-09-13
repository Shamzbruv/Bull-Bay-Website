import { createClient, createServiceRoleClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/auth/session";
import { SITE_URL } from "@/lib/org";
import { createCalendarFeedToken } from "@/lib/calendar/feed-token";
import { CounselRequestRow } from "@/app/(pastor)/pastor/care/counsel-request-row";
import { PrayerRequestRow } from "@/app/(pastor)/pastor/care/prayer-request-row";
import { ManageCalendarPanel } from "@/components/calendar/manage-calendar-panel";
import type { CalendarEntry } from "@/components/calendar/pastoral-calendar";
import { SyncCalendarPanel } from "./sync-calendar-panel";

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

  if (!teamRow?.is_active) {
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
    supabase.from("pastoral_calendar_events").select("id, title, starts_at, ends_at, kind, visibility").eq("profile_id", profile.id).gte("ends_at", new Date().toISOString()).order("starts_at").limit(100),
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

      <SyncCalendarPanel feedUrl={`${SITE_URL}/api/calendar/pastoral/${createCalendarFeedToken(profile.id)}`} />

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
        <div className="panel-heading">
          <div>
            <p className="section-kicker">My calendar</p>
            <h2>Hours &amp; entries</h2>
          </div>
        </div>
        <p className="form-note">Switch between Month, Week, and Day to see your published hours and calendar entries at a glance — add or remove them below.</p>
        <ManageCalendarPanel
          availability={(availability ?? []).map((a) => ({ id: a.id, dayOfWeek: a.day_of_week, startTime: a.start_time, endTime: a.end_time, label: a.label }))}
          events={(events ?? []).map((e) => ({
            id: e.id,
            title: e.title,
            startsAt: e.starts_at,
            endsAt: e.ends_at,
            kind: e.kind as CalendarEntry["kind"],
            visibility: e.visibility as CalendarEntry["visibility"],
          }))}
        />
      </div>
    </>
  );
}
