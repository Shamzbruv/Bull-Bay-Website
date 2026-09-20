import { NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { createHash } from "node:crypto";
import { canSubscribe, selectWithColumnFallback } from "@/lib/calendar/integrations";
import { buildIcsCalendar, type IcsEvent } from "@/lib/calendar/ics";



/**
 * Subscribable per-person feed of a pastoral team member's own working
 * hours and calendar entries — the URL (signed, see feed-token.ts) is
 * what a phone or Google Calendar "subscribe by URL" is pointed at, not a
 * login. Includes only this one person's own data, and everything on it
 * (availability and events alike), since it's them viewing their own
 * schedule on their own device, not a third party.
 */
export async function GET(_request: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  if (!/^[A-Za-z0-9_-]{43}$/.test(token)) return NextResponse.json({error:"Reconnect this calendar from Calendar connections."},{status:410});
  const admin = createServiceRoleClient();
  const {data:subscription}=await admin.from("calendar_subscriptions").select("user_id,organization_id,calendar_profile_id").eq("token_hash",createHash("sha256").update(token).digest("hex")).is("revoked_at",null).maybeSingle();
  if(!subscription?.calendar_profile_id || !await canSubscribe(subscription.user_id,subscription.organization_id,subscription.calendar_profile_id)) return NextResponse.json({error:"This subscription is no longer active."},{status:404});
  const profileId=subscription.calendar_profile_id;

  const [profileResult, availabilityResult, eventsResult] = await Promise.all([
    admin.from("profiles").select("first_name, last_name, organization_id").eq("id", profileId).maybeSingle(),
    admin
      .from("pastoral_calendar_availability")
      .select("id, day_of_week, start_time, end_time, label")
      .eq("profile_id", profileId),
    selectWithColumnFallback(
      () =>
        admin
          .from("pastoral_calendar_events")
          .select("id, title, starts_at, ends_at, kind, location, meeting_url")
          .eq("profile_id", profileId)
          .gte("ends_at", new Date(Date.now() - 90 * 86400000).toISOString())
          .order("starts_at", { ascending: true })
          .limit(1000),
      async () => {
        // Same rows, shaped to match the primary query's columns — so
        // whichever one actually ran, the caller always sees the same
        // fields and doesn't need to know which happened.
        const result = await admin
          .from("pastoral_calendar_events")
          .select("id, title, starts_at, ends_at, kind")
          .eq("profile_id", profileId)
          .gte("ends_at", new Date(Date.now() - 90 * 86400000).toISOString())
          .order("starts_at", { ascending: true })
          .limit(1000);
        return { ...result, data: result.data?.map((row) => ({ ...row, location: null, meeting_url: null })) ?? null };
      },
    ),
  ]);

  if (profileResult.error || availabilityResult.error || eventsResult.error) return NextResponse.json({ error: "Calendar temporarily unavailable." }, { status: 503 });
  const profile = profileResult.data;
  const availability = availabilityResult.data;
  const events = eventsResult.data;
  if (!profile) {
    return NextResponse.json({ error: "This calendar link is invalid or has expired." }, { status: 404 });
  }

  const name = [profile.first_name, profile.last_name].filter(Boolean).join(" ") || "Pastoral team member";

  // Stable DTSTART and UID prevent a subscription refresh from moving recurrences.
  const availabilityEvents: IcsEvent[] = (availability ?? []).map(slot => {
    const anchor = new Date("2024-01-07T12:00:00Z");
    anchor.setUTCDate(anchor.getUTCDate() + slot.day_of_week);
    const dateKey = anchor.toISOString().slice(0, 10);
    return {
      uid: `availability-${slot.id}`,
      startsAt: `${dateKey}T${slot.start_time}-05:00`, endsAt: `${dateKey}T${slot.end_time}-05:00`,
      summary: slot.label ? `Available: ${slot.label}` : "Available", rrule: "FREQ=WEEKLY", transparent: true,
    };
  });

  const calendarEvents: IcsEvent[] = (events ?? []).map((event) => ({
    uid: `event-${event.id}`,
    startsAt: event.starts_at,
    endsAt: event.ends_at,
    summary: event.title,
    // The video-call link goes in both fields deliberately: LOCATION is
    // what most phone calendar apps show right under the event title
    // (which is the "vivid, at a glance" spot), while DESCRIPTION is what
    // the type still needs to say — and a link that appears in only one
    // of the two is the kind of thing that's invisible on exactly the app
    // someone happens to be checking from.
    description: [event.kind ? `Type: ${event.kind.replace("_", " ")}` : null, event.meeting_url ? `Video call: ${event.meeting_url}` : null]
      .filter(Boolean)
      .join("\n") || null,
    location: event.location || event.meeting_url || null,
  }));

  const { data: meetings, error: meetingError } = await admin.from("counsel_requests")
    .select("id, scheduled_event_id").eq("requester_profile_id", profileId).eq("status", "scheduled");
  const meetingIds = (meetings ?? []).flatMap(m => m.scheduled_event_id ? [m.scheduled_event_id] : []);
  const { data: ownMeetings, error: ownMeetingError } = meetingIds.length
    ? await admin.from("pastoral_calendar_events").select("id, title, starts_at, ends_at").in("id", meetingIds).in("counsel_request_id", (meetings ?? []).map(m => m.id))
    : { data: [], error: null };
  if (meetingError || ownMeetingError) return NextResponse.json({ error: "Calendar temporarily unavailable." }, { status: 503 });
  const ids = new Set(calendarEvents.map(e => e.uid));
  for (const meeting of ownMeetings ?? []) if (!ids.has(`event-${meeting.id}`)) calendarEvents.push({ uid: `event-${meeting.id}`, startsAt: meeting.starts_at, endsAt: meeting.ends_at, summary: "Pastoral appointment" });

  const ics = buildIcsCalendar(`${name} — Church Calendar`, [...availabilityEvents, ...calendarEvents]);

  return new NextResponse(ics, {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": 'inline; filename="pastoral-calendar.ics"',
      "Cache-Control": "private, no-store",
    },
  });
}
