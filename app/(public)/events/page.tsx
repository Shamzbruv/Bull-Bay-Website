import type { Metadata } from "next";
import Link from "next/link";
import { getUpcomingEvents } from "@/lib/data/public";

export const metadata: Metadata = {
  title: "Events",
  description: "Find a worship service, ministry gathering, outreach event, or something for your family.",
  alternates: { canonical: "/events" },
};

function formatEventDate(iso: string) {
  const date = new Date(iso);
  return {
    day: date.toLocaleDateString("en-JM", { day: "2-digit", timeZone: "America/Jamaica" }),
    month: date.toLocaleDateString("en-JM", { month: "short", timeZone: "America/Jamaica" }).toUpperCase(),
  };
}

export default async function EventsPage() {
  const events = await getUpcomingEvents(50);

  return (
    <section aria-labelledby="events-title">
      <div className="page-hero compact-hero olive-wash">
        <p className="eyebrow">
          <span /> MARK YOUR CALENDAR
        </p>
        <h1 id="events-title">
          Life is better
          <br />
          <em>together.</em>
        </h1>
        <p>Find a worship service, ministry gathering, outreach event, or something for your family.</p>
      </div>
      <section className="section">
        <div className="calendar-toolbar">
          <h2>Upcoming at Bull Bay</h2>
          <Link className="secondary-button" href="/calendar">
            ＋ View full calendar
          </Link>
        </div>
        <div className="event-list">
          {events.length === 0 && <p className="panel-empty">No upcoming events yet — check back soon.</p>}
          {events.map((event) => {
            const { day, month } = formatEventDate(event.starts_at);
            return (
              <article className="event-row" key={event.id}>
                <div className="event-date">
                  <b>{day}</b>
                  <small>{month}</small>
                </div>
                <div className="event-body">
                  {event.category && <small>{event.category}</small>}
                  <h3>{event.title}</h3>
                  {event.description && <p>{event.description}</p>}
                </div>
                <Link href={`/events/${event.slug}`} aria-label={`View ${event.title}`}>
                  →
                </Link>
              </article>
            );
          })}
        </div>
      </section>
    </section>
  );
}
