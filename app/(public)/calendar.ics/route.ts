import { NextResponse } from "next/server";
import { createPublicClient } from "@/lib/supabase/public";
import { SITE_NAME } from "@/lib/org";
import { buildIcsCalendar } from "@/lib/calendar/ics";

export const revalidate = 300;

export async function GET() {
  const supabase = createPublicClient();
  const { data: events, error } = await supabase.from("events")
    .select("id, title, starts_at, ends_at, description, location_name")
    .eq("status", "published")
    .gte("starts_at", new Date(Date.now() - 90 * 86400000).toISOString())
    .order("starts_at").limit(1000);
  if (error) return NextResponse.json({ error: "Events calendar temporarily unavailable." }, { status: 503 });
  const calendar = buildIcsCalendar(`${SITE_NAME} Events`, (events ?? []).map(event => ({
    uid: event.id, startsAt: event.starts_at, endsAt: event.ends_at,
    summary: event.title, description: event.description, location: event.location_name,
  })));
  return new NextResponse(calendar, { headers: {
    "Content-Type": "text/calendar; charset=utf-8",
    "Content-Disposition": 'inline; filename="bull-bay-events.ics"',
  } });
}
