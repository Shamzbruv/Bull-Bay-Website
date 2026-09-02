import type { Metadata } from "next";
import Link from "next/link";
import { getPrimaryCampus, getStrategicMovementBySlug } from "@/lib/data/public";

export const revalidate = 120;
export const metadata: Metadata = {
  title: "Plan Your Visit",
  description: "Everything you need to know for your first Sunday at Bull Bay — service times, what to expect, and directions.",
  alternates: { canonical: "/visit" },
};

export default async function VisitPage() {
  const [campus, welcome] = await Promise.all([getPrimaryCampus(), getStrategicMovementBySlug("welcome")]);
  const schedule = Array.isArray(campus?.service_schedule)
    ? (campus?.service_schedule as { day: string; time: string; label: string }[])
    : [];
  const sunday = schedule.find((s) => s.day === "Sunday");

  return (
    <section aria-labelledby="visit-title">
      <div className="page-hero visit-hero">
        <p className="eyebrow">
          <span /> WELCOME: BELONGING
        </p>
        <h1 id="visit-title">
          Come as you are.
          <br />
          <em>We saved you a seat.</em>
        </h1>
        <p>
          {welcome?.objective ??
            "We want your first visit to Bull Bay to feel easy, warm, and meaningful — a culture of hospitality and belonging where you feel valued, connected and supported."}
        </p>
      </div>

      <div className="section" style={{ paddingBottom: 0 }}>
        <div className="church-photo-hero" style={{ minHeight: 320 }}>
          <picture className="church-photo-hero-media">
            <source media="(max-width: 700px)" srcSet="/images/church/church-hero-mobile.png" />
            <img src="/images/church/church-hero-desktop.png" alt="Entrance and sign of New Testament Church of God, Bull Bay" />
          </picture>
          <div className="church-photo-hero-overlay" />
          <div className="church-photo-hero-copy" style={{ padding: "40px 40px", width: "min(460px, 100%)" }}>
            <p className="eyebrow">
              <span /> FIND US
            </p>
            <h1 style={{ fontSize: "clamp(1.6rem, 3vw, 2.2rem)" }}>
              {campus?.city ?? "Bull Bay"}, {campus?.parish ?? "St. Andrew"}
            </h1>
          </div>
        </div>
      </div>

      <div className="section two-col">
        <div>
          <h2>What to expect</h2>
          <div className="expect-list">
            <article>
              <span>01</span>
              <div>
                <h3>Warm welcome</h3>
                <p>Our welcome team will help you settle in and answer any questions.</p>
              </div>
            </article>
            <article>
              <span>02</span>
              <div>
                <h3>Joyful worship</h3>
                <p>Join us as we sing, pray, and hear a Bible-centred message.</p>
              </div>
            </article>
            <article>
              <span>03</span>
              <div>
                <h3>Something for everyone</h3>
                <p>Children, teens, adults, and families can find a place to belong.</p>
              </div>
            </article>
          </div>

          <div className="panel" style={{ marginTop: 30 }}>
            <h2>Meet our welcome team</h2>
            <p style={{ color: "var(--color-muted-2)" }}>
              A friendly face will greet you at the gate and help you find your way — to a seat, to children&apos;s
              ministry, or just to a good cup of tea. Reach out ahead of time and we&apos;ll make sure someone is
              expecting you.
            </p>
            <Link className="primary-button compact" href="/contact">
              Let us know you&apos;re coming <span>→</span>
            </Link>
          </div>
        </div>
        <aside className="info-card">
          <span className="card-icon">◷</span>
          <p className="eyebrow">SUNDAY WORSHIP</p>
          <h3>{sunday?.time ?? "9:50 AM"}</h3>
          <p>Arrive a little early, meet someone new, and make yourself at home.</p>
          <Link className="primary-button compact" href="/contact">
            I&apos;m Coming <span>→</span>
          </Link>
        </aside>
      </div>
      <section className="section faq-section">
        <div className="section-heading">
          <p className="eyebrow">
            <span /> HELPFUL ANSWERS
          </p>
          <h2>
            First visit <em>questions.</em>
          </h2>
        </div>
        <div className="faq-list">
          <details open>
            <summary>
              What should I wear?<b>+</b>
            </summary>
            <p>Come comfortably. You will see people dressed in different styles, and you will be welcomed exactly as you are.</p>
          </details>
          <details>
            <summary>
              Can I bring my children?<b>+</b>
            </summary>
            <p>Absolutely. Families are a treasured part of our church community.</p>
          </details>
          <details>
            <summary>
              How do I get there?<b>+</b>
            </summary>
            <p>
              We&apos;re located in {campus?.city ?? "Bull Bay"}, {campus?.parish ?? "St. Andrew"}, Jamaica. Contact us for
              exact directions ahead of your visit.
            </p>
          </details>
        </div>
      </section>
    </section>
  );
}
