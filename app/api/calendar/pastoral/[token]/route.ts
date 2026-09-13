import { NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { verifyCalendarFeedToken } from "@/lib/calendar/feed-token";
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
  const profileId = verifyCalendarFeedToken(token);
  if (!profileId) {
    return NextResponse.json({ error: "This calendar link is invalid or has expired." }, { status: 404 });
  }

  const admin = createServiceRoleClient();
  const [profileResult, availabilityResult, eventsResult] = await Promise.all([
    admin.from("profiles").select("first_name, last_name, organization_id").eq("id", profileId).maybeSingle(),
    admin
      .from("pastoral_calendar_availability")
      .select("id, day_of_week, start_time, end_time, label")
      .eq("profile_id", profileId),
    admin
      .from("pastoral_calendar_events")
      .select("id, title, starts_at, ends_at, kind")
      .eq("profile_id", profileId)
      .gte("ends_at", new Date(Date.now() - 90 * 86400000).toISOString())
      .order("starts_at", { ascending: true })
      .limit(1000),
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
    description: event.kind ? `Type: ${event.kind.replace("_", " ")}` : null,
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
      "Cache-Control": "private, max-age=900",
    },
  });
}
