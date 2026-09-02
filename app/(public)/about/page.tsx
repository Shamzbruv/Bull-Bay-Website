import type { Metadata } from "next";
import { JsonLd } from "@/components/json-ld";
import { SITE_NAME } from "@/lib/org";

export const metadata: Metadata = {
  title: "About",
  description: "The mission, vision and values of New Testament Church of God, Bull Bay.",
  alternates: { canonical: "/about" },
};

export default function AboutPage() {
  return (
    <section className="view inner-view" aria-labelledby="about-title">
      <JsonLd data={{ "@context": "https://schema.org", "@type": "AboutPage", name: `About ${SITE_NAME}` }} />
      <div className="page-hero compact-hero blue-wash">
        <p className="eyebrow">
          <span /> OUR STORY
        </p>
        <h1 id="about-title">
          Rooted in Christ.
          <br />
          <em>Present in community.</em>
        </h1>
        <p>New Testament Church of God, Bull Bay is a community of faith devoted to loving God and serving people.</p>
      </div>
      <section className="section about-grid">
        <article>
          <span className="card-icon">✦</span>
          <h2>Our mission</h2>
          <p>
            To lead people into a growing relationship with Jesus Christ and equip them to impact their homes,
            community and world.
          </p>
        </article>
        <article>
          <span className="card-icon">⌁</span>
          <h2>Our vision</h2>
          <p>To be a loving, Spirit-led church where every person can worship, grow, serve and belong.</p>
        </article>
        <article>
          <span className="card-icon">♡</span>
          <h2>Our values</h2>
          <p>Faith, love, integrity, service, discipleship and a deep commitment to our community.</p>
        </article>
      </section>
    </section>
  );
}
