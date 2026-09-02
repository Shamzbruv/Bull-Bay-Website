import Link from "next/link";
import type { Metadata } from "next";
import { JsonLd } from "@/components/json-ld";
import { getPrimaryCampus, getPublishedSermons, getStrategicMovements, getUpcomingEvents } from "@/lib/data/public";
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
  const [campus, events, sermons, movements] = await Promise.all([
    getPrimaryCampus(),
    getUpcomingEvents(4),
    getPublishedSermons({ limit: 1 }),
    getStrategicMovements(),
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
        <div className="church-photo-hero">
          <picture className="church-photo-hero-media">
            <source media="(max-width: 700px)" srcSet="/images/church/church-hero-mobile.png" />
            <img src="/images/church/church-hero-desktop.png" alt="Entrance to New Testament Church of God, Bull Bay" />
          </picture>

          <div className="church-photo-hero-overlay" />

          <div className="church-photo-hero-copy">
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
              <span /> OUR VISION
            </p>
            <h2>
              Church feels like <em>family.</em>
            </h2>
          </div>
          <p className="large-copy">
            We are a Kingdom-advancing, Bible-based, Christ-centered, Spirit-filled, disciple-making, family-focused
            church, positively impacting people in communities, the nation and the world for the glory of God.
          </p>
          <Link className="link-button" href="/about">
            Our Story <span>→</span>
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

        {movements.length > 0 && (
          <section className="section" style={{ paddingTop: 0 }}>
            <div className="section-heading split-heading">
              <div>
                <p className="eyebrow">
                  <span /> CHURCH YEAR 2026–2027
                </p>
                <h2>
                  Our Direction <em>2026–2027.</em>
                </h2>
              </div>
              <Link className="link-button" href="/direction">
                Read our full direction <span>→</span>
              </Link>
            </div>
            <div className="ministry-grid" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))" }}>
              {movements.map((m) => (
                <Link key={m.id} href={`/direction#${m.slug}`} className="ministry-card" style={{ minHeight: 130 }}>
                  <span className="icon">{m.name.charAt(0)}</span>
                  <div>
                    <h3 style={{ fontSize: "1.1rem" }}>{m.name}</h3>
                    <p>{m.short_label}</p>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}

        <section className="section" style={{ paddingTop: 0 }}>
          <div className="section-heading">
            <p className="eyebrow">
              <span /> PRIMARY FOCUS FOR 2026–2027
            </p>
            <h2>Priority ministries this year.</h2>
          </div>
          <p className="large-copy">
            Two departments receive heightened resourcing, focused leadership attention and dedicated programming
            this church year. The aim is transformational impact — not activity alone.
          </p>
          <div className="welcome-cards">
            <Link href="/ministries/mens-ministry" className="soft-card card-blue">
              <span className="card-number">Male discipleship</span>
              <div>
                <h3>Men&apos;s Ministry</h3>
                <p>Heightened resourcing, focused leadership attention and dedicated programming.</p>
              </div>
              <span className="card-arrow">↗</span>
            </Link>
            <Link href="/ministries/youth-ministry" className="soft-card card-olive">
              <span className="card-number">Engagement &amp; empowerment</span>
              <div>
                <h3>Youth Ministry</h3>
                <p>Heightened resourcing, focused leadership attention and dedicated programming.</p>
              </div>
              <span className="card-arrow">↗</span>
            </Link>
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
