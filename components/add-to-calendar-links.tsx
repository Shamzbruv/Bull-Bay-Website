import { googleCalendarEventUrl } from "@/lib/calendar/ics";

/** "Add to Google Calendar" (opens Google's own pre-filled add-event
 * screen — no OAuth needed) plus a plain .ics download that Apple/phone
 * Calendar and Outlook open directly. Server-renderable — both are just
 * links, no client JS required. */
export function AddToCalendarLinks({
  title,
  startsAt,
  endsAt,
  description,
  location,
  icsHref,
}: {
  title: string;
  startsAt: string;
  endsAt: string;
  description?: string | null;
  location?: string | null;
  /** URL that returns a text/calendar response for this one event. */
  icsHref: string;
}) {
  const googleUrl = googleCalendarEventUrl({ title, startsAt, endsAt, description, location });

  return (
    <span style={{ display: "inline-flex", gap: 10, flexWrap: "wrap" }}>
      <a className="link-button" href={googleUrl} target="_blank" rel="noreferrer">
        Add to Google Calendar
      </a>
      <a className="link-button" href={icsHref}>
        Add to phone (.ics)
      </a>
    </span>
  );
}
