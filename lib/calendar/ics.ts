/** Shared iCalendar (RFC 5545) helpers — used by the public events feed
 * (/calendar.ics), the per-person pastoral calendar feed, and single-event
 * "Add to calendar" downloads. No external library: the format is simple
 * enough that hand-rolling it avoids a dependency, and this file is the
 * one place that needs to get the escaping/date-formatting right. */

export function toIcsDateTime(iso: string) {
  return new Date(iso).toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
}

export function escapeIcs(value: string) {
  return value.replace(/[\\,;]/g, (m) => `\\${m}`).replace(/\r\n|\r|\n/g, "\\n");
}

export type IcsEvent = {
  uid: string;
  transparent?: boolean;
  startsAt: string;
  endsAt?: string | null;
  summary: string;
  description?: string | null;
  location?: string | null;
  /** Weekly-recurrence rule, e.g. "FREQ=WEEKLY;BYDAY=SU" — for availability
   * blocks rather than one-off events. */
  rrule?: string | null;
};

export function buildIcsCalendar(calendarName: string, events: IcsEvent[]): string {
  const now = toIcsDateTime(new Date().toISOString());
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Bull Bay Digital Church//Calendar//EN",
    "CALSCALE:GREGORIAN",
    `X-WR-CALNAME:${escapeIcs(calendarName)}`,
    ...events.flatMap((event) => [
      "BEGIN:VEVENT",
      `UID:${escapeIcs(event.uid)}@bullbaychurch`,
      `DTSTAMP:${now}`,
      `TRANSP:${event.transparent ? "TRANSPARENT" : "OPAQUE"}`,
      `DTSTART:${toIcsDateTime(event.startsAt)}`,
      ...(event.endsAt ? [`DTEND:${toIcsDateTime(event.endsAt)}`] : []),
      ...(event.rrule ? [`RRULE:${event.rrule}`] : []),
      `SUMMARY:${escapeIcs(event.summary)}`,
      ...(event.description ? [`DESCRIPTION:${escapeIcs(event.description)}`] : []),
      ...(event.location ? [`LOCATION:${escapeIcs(event.location)}`] : []),
      "END:VEVENT",
    ]),
    "END:VCALENDAR",
  ];
  // RFC 5545 folds at 75 octets, keeping UTF-8 characters intact.
  return lines.map(line => {
    let folded = "", bytes = 0;
    for (const char of line) {
      const size = new TextEncoder().encode(char).length;
      if (bytes + size > 75) { folded += "\r\n "; bytes = 1; }
      folded += char; bytes += size;
    }
    return folded;
  }).join("\r\n") + "\r\n";
}

/** The Google Calendar "quick add" deep link for one specific event — no
 * OAuth or API access needed, it just opens Google Calendar's own
 * pre-filled "add event" screen for the signed-in Google user to confirm. */
export function googleCalendarEventUrl(event: { title: string; startsAt: string; endsAt: string; description?: string | null; location?: string | null }) {
  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: event.title,
    dates: `${toIcsDateTime(event.startsAt)}/${toIcsDateTime(event.endsAt)}`,
  });
  if (event.description) params.set("details", event.description);
  if (event.location) params.set("location", event.location);
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}
