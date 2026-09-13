import { CancelRequestButton } from "./cancel-request-button";
import type { Metadata } from "next";
import Link from "next/link";
import { createClient, createServiceRoleClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/auth/session";
import { SITE_URL } from "@/lib/org";
import { AddToCalendarLinks } from "@/components/add-to-calendar-links";
import { BookingCalendar } from "./booking-calendar";

export const metadata: Metadata = { title: "Pastor & Calendar" };

export default async function MemberCounselPage() {
  const profile = await getCurrentProfile();
  const supabase = await createClient();

  const { data: team } = await supabase
    .from("pastoral_team_members")
    .select("profile_id, role_title, is_pastor, is_trained_counselor, bio, profiles(first_name, last_name)")
    .eq("is_active", true)
    .order("is_pastor", { ascending: false })
    .order("sort_order");

  const [{ data: myRequests }, { data: myTeamRow }] = await Promise.all([
    profile
      ? supabase
          .from("counsel_requests")
          .select("id, reason, status, is_urgent, preferred_date, created_at, scheduled_event_id, profiles:requested_with_profile_id(first_name, last_name)")
          .eq("requester_profile_id", profile.id)
          .order("created_at", { ascending: false })
          .limit(15)
      : Promise.resolve({ data: null }),
    profile ? supabase.from("pastoral_team_members").select("id").eq("profile_id", profile.id).maybeSingle() : Promise.resolve({ data: null }),
  ]);

  // The confirmed meeting time lives on pastoral_calendar_events, owned by
  // the pastor/team member and marked private — the requester's own
  // RLS-scoped client can't read someone else's private event, so the
  // service-role client fetches just the specific events this member's
  // own (already-authorized) requests point to.
  const scheduledEventIds = (myRequests ?? []).map((r) => r.scheduled_event_id).filter((id): id is string => Boolean(id));
  const { data: scheduledEvents } =
    scheduledEventIds.length > 0
      ? await createServiceRoleClient().from("pastoral_calendar_events").select("id, title, starts_at, ends_at").in("id", scheduledEventIds).in("counsel_request_id", (myRequests ?? []).map(r => r.id))
      : { data: [] };
  const scheduledEventById = new Map((scheduledEvents ?? []).map((e) => [e.id, e]));

  const teamOptions = (team ?? []).map((t) => {
    const p = t.profiles as unknown as { first_name: string | null; last_name: string | null } | null;
    return {
      profileId: t.profile_id,
      name: `${p?.first_name ?? ""} ${p?.last_name ?? ""}`.trim() || t.role_title,
      isPastor: t.is_pastor,
      isTrainedCounselor: t.is_trained_counselor,
      roleTitle: t.role_title,
      bio: t.bio,
    };
  });

  return (
    <>
      <div className="dashboard-header">
        <div>
          <h1>Pastor &amp; Calendar</h1>
          <p>See when the pastor is available, and request time with him or a member of the pastoral team.</p>
        </div>
        {myTeamRow && (
          <Link className="secondary-button compact" href="/member/team-calendar">
            Manage my calendar
          </Link>
        )}
      </div>

      <div className="panel">
        <h2>Request help from the pastoral team</h2>
        {teamOptions
          .filter((t) => !t.isPastor)
          .map((t) => (
            <div key={t.profileId} style={{ padding: "8px 0", borderBottom: "1px solid var(--color-border)" }}>
              <b>{t.name}</b> — {t.roleTitle}{" "}
              {t.isTrainedCounselor && <span className="badge blue">trained counselor</span>}
              {t.bio && <p style={{ margin: "4px 0 0", fontSize: ".82rem", color: "var(--color-muted-2)" }}>{t.bio}</p>}
            </div>
          ))}
        {teamOptions.filter((t) => !t.isPastor).length === 0 && <p className="panel-empty">No other pastoral team members listed yet.</p>}
      </div>

      <div className="panel">
        <h2>Request a meeting</h2>
        <p className="form-note" style={{ marginTop: -4 }}>
          Pick who you&apos;d like to meet with, browse their calendar in Month, Week, or Day view, and choose an open
          time. All times are shown in Jamaica time.
        </p>
        {teamOptions.length === 0 ? (
          <p className="panel-empty">Requests aren&apos;t available yet — check back soon.</p>
        ) : (
          <BookingCalendar team={teamOptions} />
        )}
      </div>

      <div className="panel">
        <h2>Your requests</h2>
        {(!myRequests || myRequests.length === 0) && <p className="panel-empty">You haven&apos;t sent any requests yet.</p>}
        {myRequests?.map((r) => {
          const withWhom = r.profiles as unknown as { first_name: string | null; last_name: string | null } | null;
          const scheduledEvent = r.scheduled_event_id ? scheduledEventById.get(r.scheduled_event_id) : null;
          return (
            <div key={r.id} style={{ padding: "8px 0", borderBottom: "1px solid var(--color-border)", fontSize: ".88rem" }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
                <span>
                  {r.reason} — with {withWhom?.first_name} {withWhom?.last_name}
                  {scheduledEvent
                    ? ` · ${new Date(scheduledEvent.starts_at).toLocaleString("en-JM", { dateStyle: "medium", timeStyle: "short", timeZone: "America/Jamaica" })}`
                    : r.preferred_date && ` · ${new Date(r.preferred_date).toLocaleDateString("en-JM", { dateStyle: "medium", timeZone: "America/Jamaica" })}`}
                </span>
                <span>
                  {r.is_urgent && <span className="badge gray" style={{ marginRight: 6 }}>urgent</span>}
                  <span className="badge blue">{r.status}</span>
                  {["requested", "scheduled"].includes(r.status) && <CancelRequestButton id={r.id} />}
                </span>
              </div>
              {scheduledEvent && (
                <div style={{ marginTop: 8 }}>
                  <AddToCalendarLinks
                    title={scheduledEvent.title}
                    startsAt={scheduledEvent.starts_at}
                    endsAt={scheduledEvent.ends_at}
                    description={`Meeting request: ${r.reason}`}
                    icsHref={`${SITE_URL}/api/calendar/counsel-request/${r.id}`}
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </>
  );
}
