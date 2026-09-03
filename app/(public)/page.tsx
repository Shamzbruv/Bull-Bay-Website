import Image from "next/image";
import Link from "next/link";
import type { Metadata } from "next";
import { JsonLd } from "@/components/json-ld";
import { getPrimaryCampus, getPublishedSermons, getStrategicMovements, getUpcomingEvents } from "@/lib/data/public";
import { SITE_NAME, SITE_URL } from "@/lib/org";

export const revalidate = 60;

export const metadata: Metadata = {
  alternates: { canonical: "/" },
};

type IconName = "arrow" | "book" | "calendar" | "heart" | "people" | "pin" | "play" | "spark";

function Icon({ name, className = "" }: { name: IconName; className?: string }) {
  const common = {
    className,
    width: 24,
    height: 24,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.8,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true,
  };

  switch (name) {
    case "arrow":
      return <svg {...common}><path d="M5 12h14M13 6l6 6-6 6" /></svg>;
    case "book":
      return (
        <svg {...common}>
          <path d="M4 5.5A3.5 3.5 0 0 1 7.5 2H11v17H7.5A3.5 3.5 0 0 0 4 22V5.5Z" />
          <path d="M20 5.5A3.5 3.5 0 0 0 16.5 2H13v17h3.5A3.5 3.5 0 0 1 20 22V5.5Z" />
        </svg>
      );
    case "calendar":
      return <svg {...common}><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M16 3v4M8 3v4M3 10h18" /></svg>;
    case "heart":
      return <svg {...common}><path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8l1.1 1.1L12 21l7.8-7.5 1.1-1.1a5.5 5.5 0 0 0-.1-7.8Z" /></svg>;
    case "people":
      return <svg {...common}><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" /></svg>;
    case "pin":
      return <svg {...common}><path d="M20 10c0 5-8 12-8 12S4 15 4 10a8 8 0 1 1 16 0Z" /><circle cx="12" cy="10" r="2.5" /></svg>;
    case "play":
      return <svg {...common} fill="currentColor" stroke="none"><path d="m8 5 11 7-11 7V5Z" /></svg>;
    case "spark":
      return <svg {...common}><path d="m12 3-1.2 4.3A5 5 0 0 1 7.3 10L3 11.2l4.3 1.2a5 5 0 0 1 3.5 3.5L12 20l1.2-4.1a5 5 0 0 1 3.5-3.5l4.3-1.2-4.3-1.2a5 5 0 0 1-3.5-2.7L12 3Z" /></svg>;
  }
}

function formatEventDate(iso: string) {
  const date = new Date(iso);
  const options = { timeZone: "America/Jamaica" } as const;

  return {
    day: date.toLocaleDateString("en-JM", { ...options, day: "2-digit" }),
    month: date.toLocaleDateString("en-JM", { ...options, month: "short" }).toUpperCase(),
    weekday: date.toLocaleDateString("en-JM", { ...options, weekday: "short" }),
    time: date.toLocaleTimeString("en-JM", { ...options, hour: "numeric", minute: "2-digit" }),
  };
}

const QUICK_LINKS: { href: string; title: string; copy: string; icon: IconName }[] = [
  { href: "/visit", title: "I’m new", copy: "Everything you need for Sunday", icon: "spark" },
  { href: "/sermons", title: "Watch a message", copy: "Faith for the week ahead", icon: "play" },
  { href: "/prayer", title: "Request prayer", copy: "You don’t have to carry it alone", icon: "heart" },
  { href: "/give", title: "Give online", copy: "Help make a difference", icon: "book" },
];

const NEXT_STEPS: { href: string; eyebrow: string; title: string; copy: string; icon: IconName }[] = [
  {
    href: "/prayer",
    eyebrow: "Receive care",
    title: "Let us pray with you",
    copy: "Share what is on your heart. Your request is handled with care and compassion.",
    icon: "heart",
  },
  {
    href: "/groups",
    eyebrow: "Find your people",
    title: "Life is better together",
    copy: "Build real friendships and grow in faith in a community where you are known.",
    icon: "people",
  },
  {
    href: "/serve",
    eyebrow: "Use your gifts",
    title: "Make a local difference",
    copy: "There is a place for your gifts in our church family and throughout Bull Bay.",
    icon: "spark",
  },
];

export default async function HomePage() {
  const [campus, events, sermons, movements] = await Promise.all([
    getPrimaryCampus(),
    getUpcomingEvents(3),
    getPublishedSermons({ limit: 1 }),
    getStrategicMovements(),
  ]);
  const latestSermon = sermons[0];
  const schedule = Array.isArray(campus?.service_schedule)
    ? (campus.service_schedule as { day: string; time: string; label: string }[])
    : [];
  const sundaySchedule = schedule.find((item) => item.day === "Sunday");

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

      <div className="home-page">
        <section className="home-hero" aria-labelledby="hero-heading">
          <Image
            className="home-hero-image"
            src="/images/church/worship-hero-illustrative.jpg"
            alt="Illustrative scene of a multigenerational Jamaican church community worshipping together"
            fill
            priority
            sizes="(max-width: 768px) 100vw, 1400px"
          />
          <div className="home-hero-shade" />
          <div className="home-hero-content">
            <p className="home-kicker"><span /> Welcome to Bull Bay</p>
            <h1 id="hero-heading">Come as you are.<span>Meet Jesus here.</span></h1>
            <p>
              A warm, Spirit-filled church family where every generation can worship, grow, find community, and live
              with purpose.
            </p>
            <div className="home-hero-actions">
              <Link className="primary-button home-button-light" href="/visit">Plan your visit <Icon name="arrow" /></Link>
              <Link className="home-text-link" href="/live"><span className="home-play"><Icon name="play" /></span>Watch online</Link>
            </div>
          </div>

          <aside className="home-service-card" aria-label="Next Sunday gathering">
            <span className="home-service-icon"><Icon name="calendar" /></span>
            <div>
              <small>Join us this Sunday</small>
              <strong>{sundaySchedule?.time ?? "View service times"}</strong>
              <span>{campus?.city ?? "Bull Bay"}, {campus?.parish ?? "St. Andrew"}</span>
            </div>
            <Link href="/visit" aria-label="Get Sunday visit details"><Icon name="arrow" /></Link>
          </aside>
          <span className="home-image-note">Illustrative community image</span>
        </section>

        <nav className="home-quick-links" aria-label="Popular next steps">
          {QUICK_LINKS.map((item) => (
            <Link href={item.href} key={item.href}>
              <span className="home-quick-icon"><Icon name={item.icon} /></span>
              <span><strong>{item.title}</strong><small>{item.copy}</small></span>
              <Icon name="arrow" className="home-arrow" />
            </Link>
          ))}
        </nav>

        <section className="section home-intro" aria-labelledby="welcome-heading">
          <div className="home-intro-copy">
            <p className="eyebrow"><span /> There is room for you</p>
            <h2 id="welcome-heading">Church is more than a service. <em>It’s family.</em></h2>
            <p className="home-lead">
              Whether faith is new to you or has shaped your whole life, you can belong here. We are becoming a
              Bible-based, Christ-centred, Spirit-filled family that brings hope to Bull Bay and beyond.
            </p>
            <div className="home-intro-actions">
              <Link className="primary-button" href="/about">Discover our story <Icon name="arrow" /></Link>
              <Link className="link-button" href="/ministries">Explore ministries <Icon name="arrow" /></Link>
            </div>
            <div className="home-values" aria-label="Our community values">
              <span>Meet Jesus</span><span>Find community</span><span>Live with purpose</span>
            </div>
          </div>

          <figure className="home-intro-photo">
            <Image
              src="/images/church/community-care-illustrative.jpg"
              alt="Illustrative scene of a Jamaican church community serving neighbours together"
              fill
              sizes="(max-width: 850px) 100vw, 48vw"
            />
            <div className="home-photo-badge">
              <Icon name="heart" />
              <span><b>Love in action</b><small>Serving Bull Bay together</small></span>
            </div>
            <figcaption>Illustrative community image</figcaption>
          </figure>
        </section>

        {latestSermon && (
          <section className="section home-message-section" aria-labelledby="message-heading">
            <article className="home-message-card">
              <div className="home-message-art" aria-hidden="true">
                <Image src="/images/brand/logo-watermark-white.png" alt="" width={440} height={440} />
                <span className="home-message-orbit one" /><span className="home-message-orbit two" />
                <span className="home-message-play"><Icon name="play" /></span>
              </div>
              <div className="home-message-copy">
                <p className="home-kicker"><span /> Latest message</p>
                <h2 id="message-heading">A word for the <em>week ahead.</em></h2>
                <span className="home-message-label">Sunday message</span>
                <h3>{latestSermon.title}</h3>
                {latestSermon.summary && <p>{latestSermon.summary}</p>}
                <div className="home-message-meta">
                  {latestSermon.speaker && <span>{latestSermon.speaker}</span>}
                  {latestSermon.duration_seconds && <span>{Math.round(latestSermon.duration_seconds / 60)} min watch</span>}
                </div>
                <Link className="home-message-link" href={`/sermons/${latestSermon.slug}`}>Watch the message <Icon name="arrow" /></Link>
              </div>
            </article>
          </section>
        )}

        <section className="section home-events" aria-labelledby="events-heading">
          <div className="home-section-heading">
            <div>
              <p className="eyebrow"><span /> Happening at Bull Bay</p>
              <h2 id="events-heading">There’s always a way to <em>join in.</em></h2>
            </div>
            <Link className="link-button" href="/events">View all events <Icon name="arrow" /></Link>
          </div>

          <div className="home-event-grid">
            {events.length === 0 && (
              <div className="home-empty-state">
                <Icon name="calendar" /><h3>More gatherings are on the way</h3>
                <p>Check back soon or explore the full church calendar.</p>
                <Link className="link-button" href="/calendar">Open calendar <Icon name="arrow" /></Link>
              </div>
            )}
            {events.map((event, index) => {
              const date = formatEventDate(event.starts_at);
              return (
                <article className={`home-event-card tone-${(index % 3) + 1}`} key={event.id}>
                  <div className="home-event-top">
                    <time dateTime={event.starts_at} className="home-event-date">
                      <span>{date.month}</span><strong>{date.day}</strong><small>{date.weekday}</small>
                    </time>
                    {event.category && <span className="home-event-category">{event.category}</span>}
                  </div>
                  <div className="home-event-copy">
                    <h3>{event.title}</h3>{event.description && <p>{event.description}</p>}
                  </div>
                  <div className="home-event-meta">
                    <span><Icon name="calendar" /> {date.time}</span>
                    <span><Icon name="pin" /> {event.location_name ?? campus?.city ?? "Bull Bay"}</span>
                  </div>
                  <Link href={`/events/${event.slug}`} aria-label={`View details for ${event.title}`}>Event details <Icon name="arrow" /></Link>
                </article>
              );
            })}
          </div>
        </section>

        <section className="home-next-steps" aria-labelledby="next-step-heading">
          <div className="home-next-heading">
            <p className="eyebrow light"><span /> Your next step</p>
            <h2 id="next-step-heading">Wherever you are, there is a way <em>forward.</em></h2>
            <p>Start small. Ask for prayer, meet your people, or put your gifts to work.</p>
          </div>
          <div className="home-next-grid">
            {NEXT_STEPS.map((item) => (
              <Link href={item.href} key={item.href}>
                <span className="home-next-icon"><Icon name={item.icon} /></span>
                <small>{item.eyebrow}</small><h3>{item.title}</h3><p>{item.copy}</p>
                <span className="home-next-link">Take this step <Icon name="arrow" /></span>
              </Link>
            ))}
          </div>
        </section>

        <section className="section home-focus" aria-labelledby="focus-heading">
          <div className="home-section-heading">
            <div>
              <p className="eyebrow"><span /> Growing every generation</p>
              <h2 id="focus-heading">A place to become who God <em>made you to be.</em></h2>
            </div>
            <p>Our ministries create spaces for faith, friendship, healing, and practical service.</p>
          </div>
          <div className="home-focus-grid">
            <Link className="home-focus-card home-focus-men" href="/ministries/mens-ministry">
              <span>Men’s Ministry</span><h3>Strong faith.<br />Real brotherhood.</h3>
              <p>Growing men who lead with humility, integrity, and purpose.</p>
              <b>Explore ministry <Icon name="arrow" /></b>
            </Link>
            <Link className="home-focus-card home-focus-youth" href="/ministries/youth-ministry">
              <span>Youth Ministry</span><h3>Rooted now.<br />Ready for tomorrow.</h3>
              <p>A joyful place for young people to belong, ask, grow, and lead.</p>
              <b>Explore ministry <Icon name="arrow" /></b>
            </Link>
          </div>
        </section>

        {movements.length > 0 && (
          <section className="section home-direction" aria-labelledby="direction-heading">
            <div className="home-direction-copy">
              <span className="home-direction-year">2026—2027</span>
              <div>
                <p className="eyebrow"><span /> Our church direction</p>
                <h2 id="direction-heading">Seven movements. <em>One mission.</em></h2>
                <p>How we are welcoming, worshipping, growing, caring, and carrying hope into our community this year.</p>
              </div>
              <Link className="primary-button" href="/direction">See our direction <Icon name="arrow" /></Link>
            </div>
            <div className="home-movement-list">
              {movements.map((movement, index) => (
                <Link href={`/direction#${movement.slug}`} key={movement.id}>
                  <span>{String(index + 1).padStart(2, "0")}</span><strong>{movement.name}</strong><small>{movement.short_label}</small>
                </Link>
              ))}
            </div>
          </section>
        )}

        <section className="section home-visit" aria-labelledby="visit-heading">
          <div className="home-visit-photo">
            <Image
              src="/images/church/church-exterior.jpg"
              alt="The entrance to New Testament Church of God, Bull Bay"
              fill
              loading="eager"
              sizes="(max-width: 850px) 100vw, 56vw"
            />
            <span><Icon name="pin" /> Bull Bay, Jamaica</span>
          </div>
          <div className="home-visit-copy">
            <p className="eyebrow"><span /> Your first Sunday</p>
            <h2 id="visit-heading">You’re invited. <em>We’ll save you a seat.</em></h2>
            <p>
              Expect a genuine welcome, joyful worship, biblical teaching, and a church family ready to meet you.
              Come dressed as you feel comfortable.
            </p>
            {schedule.length > 0 && (
              <div className="home-schedule">
                {schedule.slice(0, 3).map((item) => (
                  <div key={`${item.day}-${item.time}`}><span>{item.day}</span><strong>{item.label}</strong><time>{item.time}</time></div>
                ))}
              </div>
            )}
            <div className="home-visit-actions">
              <Link className="primary-button" href="/visit">Plan your visit <Icon name="arrow" /></Link>
              <Link className="link-button" href="/contact">Ask a question <Icon name="arrow" /></Link>
            </div>
          </div>
        </section>

        <section className="home-final-invite" aria-labelledby="final-invite-heading">
          <Image src="/images/brand/logo-watermark-white.png" alt="" width={420} height={420} />
          <p className="eyebrow light"><span /> Welcome home</p>
          <h2 id="final-invite-heading">Your story matters.<br /><em>There’s a place for it here.</em></h2>
          <div>
            <Link className="light-button" href="/contact">Get connected <Icon name="arrow" /></Link>
            <Link className="outline-light-button" href="/prayer">Share a prayer request</Link>
          </div>
        </section>
      </div>
    </>
  );
}
