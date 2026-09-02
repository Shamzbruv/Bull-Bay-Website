import type { Metadata } from "next";
import Link from "next/link";
import { getUpcomingEvents } from "@/lib/data/public";

export const metadata: Metadata = {
  title: "Calendar",
  description: "Every upcoming service, ministry gathering and event at Bull Bay, with a downloadable calendar feed.",
  alternates: { canonical: "/calendar" },
};

export default async function CalendarPage() {
  const events = await getUpcomingEvents(100);
  const byMonth = new Map<string, typeof events>();
  for (const event of events) {
    const key = new Date(event.starts_at).toLocaleDateString("en-JM", {
      month: "long",
      year: "numeric",
      timeZone: "America/Jamaica",
    });
    byMonth.set(key, [...(byMonth.get(key) ?? []), event]);
  }

  return (
    <section className="section" style={{ paddingTop: 50 }}>
      <div className="calendar-toolbar">
        <div>
          <p className="eyebrow">
            <span /> FULL CALENDAR
          </p>
          <h1 style={{ fontFamily: "var(--font-display)", color: "var(--color-blue-700)", fontSize: "clamp(2rem,4vw,3rem)", margin: 0 }}>
            Everything happening at Bull Bay
          </h1>
        </div>
        <a className="secondary-button" href="/calendar.ics">
          ⤓ Subscribe (.ics)
        </a>
      </div>

      {[...byMonth.entries()].map(([month, monthEvents]) => (
        <div key={month} style={{ marginTop: 36 }}>
          <h2 style={{ fontFamily: "var(--font-display)", color: "var(--color-blue-600)", fontSize: "1.4rem" }}>{month}</h2>
          <div className="event-list">
            {monthEvents.map((event) => {
              const date = new Date(event.starts_at);
              return (
                <article className="event-row" key={event.id}>
                  <div className="event-date">
                    <b>{date.toLocaleDateString("en-JM", { day: "2-digit", timeZone: "America/Jamaica" })}</b>
                    <small>{date.toLocaleDateString("en-JM", { month: "short", timeZone: "America/Jamaica" }).toUpperCase()}</small>
                  </div>
                  <div className="event-body">
                    {event.category && <small>{event.category}</small>}
                    <h3>{event.title}</h3>
                    <p>{date.toLocaleTimeString("en-JM", { timeStyle: "short", timeZone: "America/Jamaica" })}</p>
                  </div>
                  <Link href={`/events/${event.slug}`} aria-label={`View ${event.title}`}>
                    →
                  </Link>
                </article>
              );
            })}
          </div>
        </div>
      ))}
      {events.length === 0 && <p className="panel-empty">No upcoming events yet — check back soon.</p>}
    </section>
  );
}
