import Link from "next/link";
import type { Metadata } from "next";
import { JsonLd } from "@/components/json-ld";
import { getPrimaryCampus, getPublishedSermons, getUpcomingEvents } from "@/lib/data/public";
import { SITE_NAME, SITE_URL } from "@/lib/org";

export const revalidate = 60;

export const metadata: Metadata = {
  alternates: { canonical: "/" },
};

function formatEventDate(iso: string) {
  const date = new Date(iso);
  return {
    day: date.toLocaleDateString("en-JM", { day: "2-digit", timeZone: "America/Jamaica" }),
    month: date.toLocaleDateString("en-JM", { month: "short", timeZone: "America/Jamaica" }).toUpperCase(),
  };
}

export default async function HomePage() {
  const [campus, events, sermons] = await Promise.all([
    getPrimaryCampus(),
    getUpcomingEvents(4),
    getPublishedSermons({ limit: 1 }),
  ]);
  const latestSermon = sermons[0];
  const sundaySchedule = Array.isArray(campus?.service_schedule)
    ? (campus?.service_schedule as { day: string; time: string; label: string }[]).find((s) => s.day === "Sunday")
    : null;

  return (
    <>
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "Church",
          name: SITE_NAME,
          url: SITE_URL,
          address: campus
            ? {
                "@type": "PostalAddress",
                addressLocality: campus.city,
                addressRegion: campus.parish,
                addressCountry: "JM",
              }
            : undefined,
        }}
      />

      <section aria-labelledby="hero-heading">
        <div className="hero-shell">
          <div className="hero-copy">
            <p className="eyebrow">
              <span /> NEW TESTAMENT CHURCH OF GOD • BULL BAY
            </p>
            <h1 id="hero-heading">
              A place to <em>worship,</em>
              <br />
              grow &amp; belong.
            </h1>
            <p className="hero-text">
              A warm church family in Bull Bay where people meet Jesus, discover purpose, and make a difference in
              Jamaica and beyond.
            </p>
            <div className="hero-actions">
              <Link className="primary-button" href="/visit">
                Plan Your Visit <span>→</span>
              </Link>
              <Link className="play-button" href="/live">
                <b>▶</b> Watch Church Live
              </Link>
            </div>
            {sundaySchedule && (
              <div className="service-chip" aria-label={`Sunday worship starts at ${sundaySchedule.time}`}>
                <span className="clock">◷</span>
                <span>
                  <b>This Sunday</b>
                  <small>Worship begins at {sundaySchedule.time}</small>
                </span>
                <Link href="/events" aria-label="View all events">
                  →
                </Link>
              </div>
            )}
          </div>
          <div className="hero-art" aria-label="Illustration representing the church community">
            <div className="sun-disc" />
            <div className="hill hill-one" />
            <div className="hill hill-two" />
            <div className="church-illustration">
              <div className="cross" />
              <div className="roof" />
              <div className="building">
                <i />
                <i />
                <i />
              </div>
            </div>
            <div className="hero-float float-one">
              <span>♡</span>
              <b>Prayer is powerful</b>
              <small>We are standing with you.</small>
            </div>
            <div className="hero-float float-two">
              <span>✦</span>
              <b>Find your people</b>
              <small>Discover a ministry.</small>
            </div>
          </div>
        </div>

        <section className="quick-actions" aria-label="Quick actions">
          <Link href="/live">
            <span className="action-icon blue">▶</span>
            <b>Watch Live</b>
            <small>Join us online</small>
            <i>→</i>
          </Link>
          <Link href="/sermons">
            <span className="action-icon green">⌁</span>
            <b>Latest Sermon</b>
            <small>Be encouraged today</small>
            <i>→</i>
          </Link>
          <Link href="/prayer">
            <span className="action-icon olive">♡</span>
            <b>Need Prayer?</b>
            <small>We will pray with you</small>
            <i>→</i>
          </Link>
          <Link href="/give">
            <span className="action-icon gold">✦</span>
            <b>Give Online</b>
            <small>Make a difference</small>
            <i>→</i>
          </Link>
        </section>

        <section className="section home-welcome">
          <div className="section-heading">
            <p className="eyebrow">
              <span /> YOU ARE WELCOME HERE
            </p>
            <h2>
              Church feels like <em>family.</em>
            </h2>
          </div>
          <p className="large-copy">
            Whether you are searching for a church home, returning to faith, or ready to grow deeper, there is a
            place for you at Bull Bay.
          </p>
          <Link className="link-button" href="/about">
            Discover our story <span>→</span>
          </Link>
          <div className="welcome-cards">
            <article className="soft-card card-blue">
              <span className="card-number">01</span>
              <div>
                <h3>Meet Jesus</h3>
                <p>Experience a life-changing relationship with Christ.</p>
              </div>
              <span className="card-arrow">↗</span>
            </article>
            <article className="soft-card card-olive">
              <span className="card-number">02</span>
              <div>
                <h3>Find Community</h3>
                <p>Build meaningful relationships that help you grow.</p>
              </div>
              <span className="card-arrow">↗</span>
            </article>
            <article className="soft-card card-white">
              <span className="card-number">03</span>
              <div>
                <h3>Make a Difference</h3>
                <p>Use your gifts to serve our church and community.</p>
              </div>
              <span className="card-arrow">↗</span>
            </article>
          </div>
        </section>

        {latestSermon && (
          <section className="section featured-sermon-section">
            <div className="section-heading split-heading">
              <div>
                <p className="eyebrow">
                  <span /> LATEST MESSAGE
                </p>
                <h2>
                  Truth for your <em>week.</em>
                </h2>
              </div>
              <Link className="link-button" href="/sermons">
                Explore sermons <span>→</span>
              </Link>
            </div>
            <article className="featured-sermon">
              <div className="sermon-image">
                <div className="sermon-cross">✦</div>
                <p>
                  THE WORD
                  <br />
                  <strong>STILL SPEAKS</strong>
                </p>
                <Link className="round-play" href="/live" aria-label="Watch church live">
                  ▶
                </Link>
              </div>
              <div className="sermon-detail">
                <span className="tag">SUNDAY MESSAGE</span>
                <h3>{latestSermon.title}</h3>
                {latestSermon.summary && <p>{latestSermon.summary}</p>}
                <div className="sermon-meta">
                  <span>{latestSermon.speaker}</span>
                  {latestSermon.duration_seconds && <span>• {Math.round(latestSermon.duration_seconds / 60)} min</span>}
                </div>
                <Link className="primary-button compact" href={`/sermons/${latestSermon.slug}`}>
                  Watch Message <span>→</span>
                </Link>
              </div>
            </article>
          </section>
        )}

        <section className="section upcoming-section">
          <div className="section-heading split-heading">
            <div>
              <p className="eyebrow">
                <span /> WHAT&apos;S HAPPENING
              </p>
              <h2>
                Come be a part of <em>it.</em>
              </h2>
            </div>
            <Link className="link-button" href="/events">
              View calendar <span>→</span>
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

        <section className="callout-section">
          <div className="callout-orb orb-one" />
          <div className="callout-orb orb-two" />
          <p className="eyebrow light">
            <span /> TAKE YOUR NEXT STEP
          </p>
          <h2>
            There is a place for you
            <br />
            in the <em>story God is writing.</em>
          </h2>
          <div className="callout-actions">
            <Link className="light-button" href="/contact">
              Get Connected <span>→</span>
            </Link>
            <Link className="outline-light-button" href="/prayer">
              Share a Prayer Request
            </Link>
          </div>
        </section>
      </section>
    </>
  );
}
