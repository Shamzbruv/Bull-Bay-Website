import type { Metadata } from "next";
import Link from "next/link";
import { JsonLd } from "@/components/json-ld";
import { SITE_NAME } from "@/lib/org";

export const revalidate = 300;

export const metadata: Metadata = {
  title: "Our Story",
  description: "The vision, mission and values of New Testament Church of God, Bull Bay.",
  alternates: { canonical: "/about" },
};

const IDENTITY_PILLARS = [
  "Kingdom-advancing",
  "Bible-based",
  "Christ-centered",
  "Spirit-filled",
  "Disciple-making",
  "Family-focused",
];

const MISSION_COMMITMENTS = [
  "Effective evangelism",
  "Spirit-filled worship",
  "Sustained prayer",
  "Deliberate discipleship",
  "Biblical stewardship",
  "Compassionate service",
  "Godly relationships",
];

const CORE_VALUES = [
  { name: "Reverence for God", text: "We honour God in worship, conduct and decisions." },
  { name: "Christ Centeredness", text: "Jesus remains the focus and foundation." },
  { name: "Spirit Empowerment", text: "We depend on the Holy Spirit to serve faithfully." },
  { name: "Care and Compassion", text: "We respond to people with love and practical care." },
  { name: "Integrity", text: "Our words, actions and stewardship must agree." },
  { name: "Unity", text: "We serve as one body with shared purpose." },
  { name: "Excellence", text: "We offer God our best in every assignment." },
];

export default function AboutPage() {
  return (
    <section className="inner-view" aria-labelledby="about-title">
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

      <section className="section">
        <p className="eyebrow">
          <span /> OUR VISION
        </p>
        <h2 style={{ maxWidth: 780 }}>
          We are a Kingdom-advancing, Bible-based, Christ-centered, Spirit-filled, disciple-making, family-focused
          church, <em>positively impacting people</em> in communities, the nation and the world for the glory of God.
        </h2>
        <div className="filter-pills" style={{ marginTop: 24 }}>
          {IDENTITY_PILLARS.map((p) => (
            <span key={p} className="badge blue" style={{ padding: "8px 14px", fontSize: ".72rem" }}>
              {p.toUpperCase()}
            </span>
          ))}
        </div>
      </section>

      <section className="section" style={{ paddingTop: 0 }}>
        <p className="eyebrow">
          <span /> OUR MISSION
        </p>
        <h2>Healthy churches advance the Kingdom.</h2>
        <p className="large-copy">
          The Mission of the New Testament Church of God in Jamaica is to advance the Kingdom of God by growing
          healthy churches committed to:
        </p>
        <div className="about-grid" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", marginTop: 30 }}>
          {MISSION_COMMITMENTS.map((c, i) => (
            <article key={c}>
              <span className="card-icon">{String(i + 1).padStart(2, "0")}</span>
              <h2 style={{ fontSize: "1.05rem" }}>{c}</h2>
            </article>
          ))}
        </div>
      </section>

      <section className="section" style={{ paddingTop: 0 }}>
        <p className="eyebrow">
          <span /> CORE VALUES
        </p>
        <h2>Seven values guide our life and ministry.</h2>
        <div className="about-grid" style={{ marginTop: 30 }}>
          {CORE_VALUES.map((v) => (
            <article key={v.name}>
              <span className="card-icon">✦</span>
              <h2 style={{ fontSize: "1.2rem" }}>{v.name}</h2>
              <p>{v.text}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="callout-section">
        <p className="eyebrow light">
          <span /> GO DEEPER
        </p>
        <h2>
          What we believe, and <em>where we are going.</em>
        </h2>
        <div className="callout-actions">
          <Link className="light-button" href="/beliefs">
            Our Beliefs <span>→</span>
          </Link>
          <Link className="outline-light-button" href="/direction">
            Our Direction 2026–2027
          </Link>
        </div>
      </section>
    </section>
  );
}
