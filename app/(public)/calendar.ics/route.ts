import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { SITE_NAME } from "@/lib/org";

function toIcsDate(iso: string) {
  return new Date(iso).toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
}

function escapeIcs(value: string) {
  return value.replace(/[\\,;]/g, (m) => `\\${m}`).replace(/\n/g, "\\n");
}

/** Public, downloadable .ics calendar feed of published events. */
export async function GET() {
  const supabase = await createClient();
  const { data: events } = await supabase
    .from("events")
    .select("*")
    .eq("status", "published")
    .order("starts_at", { ascending: true })
    .limit(200);

  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Bull Bay Digital Church//Events//EN",
    "CALSCALE:GREGORIAN",
    `X-WR-CALNAME:${escapeIcs(SITE_NAME)} Events`,
    ...(events ?? []).flatMap((event) => [
      "BEGIN:VEVENT",
      `UID:${event.id}@bullbaychurch`,
      `DTSTAMP:${toIcsDate(event.created_at)}`,
      `DTSTART:${toIcsDate(event.starts_at)}`,
      ...(event.ends_at ? [`DTEND:${toIcsDate(event.ends_at)}`] : []),
      `SUMMARY:${escapeIcs(event.title)}`,
      ...(event.description ? [`DESCRIPTION:${escapeIcs(event.description)}`] : []),
      ...(event.location_name ? [`LOCATION:${escapeIcs(event.location_name)}`] : []),
      "END:VEVENT",
    ]),
    "END:VCALENDAR",
  ];

  return new NextResponse(lines.join("\r\n"), {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": 'attachment; filename="bull-bay-events.ics"',
    },
  });
}
