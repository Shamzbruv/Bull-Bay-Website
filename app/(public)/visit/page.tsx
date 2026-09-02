import type { Metadata } from "next";
import Link from "next/link";
import { getPrimaryCampus } from "@/lib/data/public";

export const revalidate = 120;
export const metadata: Metadata = {
  title: "Plan Your Visit",
  description: "Everything you need to know for your first Sunday at Bull Bay — service times, what to expect, and directions.",
  alternates: { canonical: "/visit" },
};

export default async function VisitPage() {
  const campus = await getPrimaryCampus();
  const schedule = Array.isArray(campus?.service_schedule)
    ? (campus?.service_schedule as { day: string; time: string; label: string }[])
    : [];
  const sunday = schedule.find((s) => s.day === "Sunday");

  return (
    <section aria-labelledby="visit-title">
      <div className="page-hero visit-hero">
        <p className="eyebrow">
          <span /> YOUR FIRST SUNDAY
        </p>
        <h1 id="visit-title">
          Come as you are.
          <br />
          <em>We saved you a seat.</em>
        </h1>
        <p>We want your first visit to Bull Bay to feel easy, warm, and meaningful.</p>
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
