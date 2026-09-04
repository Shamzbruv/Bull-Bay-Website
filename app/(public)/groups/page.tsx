import type { Metadata } from "next";
import Link from "next/link";
import { getPublicGroups } from "@/lib/data/public";

export const revalidate = 120;
export const metadata: Metadata = {
  title: "Small Groups",
  description: "Find a small group to grow in community at Bull Bay.",
  alternates: { canonical: "/groups" },
};

export default async function GroupsPage() {
  const groups = await getPublicGroups();

  return (
    <section className="section" style={{ paddingTop: 50 }}>
      <p className="eyebrow">
        <span /> LIFE TOGETHER
      </p>
      <h1 style={{ fontFamily: "var(--font-display)", color: "var(--color-blue-700)", fontSize: "clamp(2rem,4vw,3rem)" }}>
        Find your small group.
      </h1>

      <div className="church-photo-hero" style={{ minHeight: 300, marginTop: 24 }}>
        <picture className="church-photo-hero-media">
          <img src="/images/church/sanctuary-side.jpg" alt="Bull Bay members gathered together at church" />
        </picture>
        <div className="church-photo-hero-overlay" />
        <div className="church-photo-hero-copy" style={{ padding: "30px 34px", width: "min(400px, 100%)" }}>
          <p className="eyebrow">
            <span /> BETTER TOGETHER
          </p>
          <h1 style={{ fontSize: "clamp(1.4rem, 3vw, 1.9rem)" }}>Grow with your people.</h1>
        </div>
      </div>

      <div className="panel" style={{ marginTop: 30, textAlign: "center" }}>
        <h2 style={{ marginTop: 0 }}>Join us on GraceConnect</h2>
        <p style={{ maxWidth: 560, margin: "0 auto 16px", color: "var(--color-muted-2)" }}>
          Our small groups and Christian community live on GraceConnect — the home for connecting with Bull Bay
          members and other believers, joining a group, and growing in faith together online.
        </p>
        <a className="primary-button" href="https://graceconnect.love" target="_blank" rel="noreferrer">
          Join GraceConnect <span>→</span>
        </a>
      </div>

      <div className="ministry-grid" style={{ marginTop: 30 }}>
        {groups.length === 0 && <p className="panel-empty">No groups listed here yet — join us on GraceConnect above in the meantime.</p>}
        {groups.map((group) => (
          <article className="ministry-card" key={group.id}>
            <span className="icon">✦</span>
            <div>
              <h3>{group.name}</h3>
              {group.description && <p>{group.description}</p>}
              {group.meeting_schedule && <p>{group.meeting_schedule}</p>}
            </div>
            <Link href={`/groups/${group.slug}`}>View group →</Link>
          </article>
        ))}
      </div>
    </section>
  );
}
