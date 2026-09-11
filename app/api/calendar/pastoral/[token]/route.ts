import { NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { verifyCalendarFeedToken } from "@/lib/calendar/feed-token";
import { buildIcsCalendar, type IcsEvent } from "@/lib/calendar/ics";

const RRULE_DAYS = ["SU", "MO", "TU", "WE", "TH", "FR", "SA"];

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
  const [{ data: profile }, { data: availability }, { data: events }] = await Promise.all([
    admin.from("profiles").select("first_name, last_name").eq("id", profileId).maybeSingle(),
    admin
      .from("pastoral_calendar_availability")
      .select("day_of_week, start_time, end_time, label")
      .eq("profile_id", profileId),
    admin
      .from("pastoral_calendar_events")
      .select("id, title, starts_at, ends_at, kind")
      .eq("profile_id", profileId)
      .order("starts_at", { ascending: true })
      .limit(300),
  ]);

  if (!profile) {
    return NextResponse.json({ error: "This calendar link is invalid or has expired." }, { status: 404 });
  }

  const name = [profile.first_name, profile.last_name].filter(Boolean).join(" ") || "Pastoral team member";

  // Anchor each weekly availability block on the next upcoming occurrence
  // of its day, then repeat it weekly forever (RRULE) — a calendar app
  // needs one real date to hang the recurrence off of, not just "Sundays".
  const now = new Date();
  const availabilityEvents: IcsEvent[] = (availability ?? []).map((slot, index) => {
    const anchor = new Date(now);
    const daysUntil = (slot.day_of_week - anchor.getDay() + 7) % 7;
    anchor.setDate(anchor.getDate() + daysUntil);
    const dateKey = anchor.toISOString().slice(0, 10);
    return {
      uid: `availability-${profileId}-${slot.day_of_week}-${index}`,
      startsAt: `${dateKey}T${slot.start_time}-05:00`,
      endsAt: `${dateKey}T${slot.end_time}-05:00`,
      summary: slot.label ? `Available: ${slot.label}` : "Available",
      rrule: `FREQ=WEEKLY;BYDAY=${RRULE_DAYS[slot.day_of_week]}`,
    };
  });

  const calendarEvents: IcsEvent[] = (events ?? []).map((event) => ({
    uid: `event-${event.id}`,
    startsAt: event.starts_at,
    endsAt: event.ends_at,
    summary: event.title,
    description: event.kind ? `Type: ${event.kind.replace("_", " ")}` : null,
  }));

  const ics = buildIcsCalendar(`${name} — Pastoral Calendar`, [...availabilityEvents, ...calendarEvents]);

  return new NextResponse(ics, {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": 'inline; filename="pastoral-calendar.ics"',
      "Cache-Control": "private, max-age=900",
    },
  });
}
