import { NextResponse } from "next/server";
import { createClient, createServiceRoleClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/auth/session";
import { buildIcsCalendar } from "@/lib/calendar/ics";

/**
 * A single-event .ics download for a member's own confirmed meeting —
 * "Add to my calendar" on a scheduled counsel request. The underlying
 * pastoral_calendar_events row belongs to the pastor/team member, not the
 * requester, and is marked private (it isn't meant to appear on the
 * public "coming up" list), so the requester's own RLS-scoped client
 * can't read it directly. Authorization happens here instead: confirm
 * the signed-in profile is this request's requester before using the
 * service-role client to read the linked event.
 */
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const profile = await getCurrentProfile();
  if (!profile) return NextResponse.json({ error: "Please sign in." }, { status: 401 });

  const supabase = await createClient();
  const { data: counselRequest } = await supabase
    .from("counsel_requests")
    .select("id, reason, requester_profile_id, scheduled_event_id, status")
    .eq("id", id)
    .maybeSingle();

  if (!counselRequest || counselRequest.requester_profile_id !== profile.id) {
    return NextResponse.json({ error: "Request not found." }, { status: 404 });
  }
  if (counselRequest.status !== "scheduled" || !counselRequest.scheduled_event_id) {
    return NextResponse.json({ error: "This request hasn't been scheduled yet." }, { status: 404 });
  }

  const admin = createServiceRoleClient();
  const { data: event } = await admin
    .from("pastoral_calendar_events")
    .select("id, title, starts_at, ends_at")
    .eq("id", counselRequest.scheduled_event_id)
    .maybeSingle();
  if (!event) return NextResponse.json({ error: "That calendar entry no longer exists." }, { status: 404 });

  const ics = buildIcsCalendar(event.title, [
    {
      uid: `counsel-${counselRequest.id}`,
      startsAt: event.starts_at,
      endsAt: event.ends_at,
      summary: event.title,
      description: `Meeting request: ${counselRequest.reason}`,
    },
  ]);

  return new NextResponse(ics, {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": 'attachment; filename="meeting.ics"',
    },
  });
}
