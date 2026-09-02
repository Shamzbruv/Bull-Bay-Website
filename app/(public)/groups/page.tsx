import type { Metadata } from "next";
import Link from "next/link";
import { getPublicGroups } from "@/lib/data/public";

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
      <div className="ministry-grid" style={{ marginTop: 30 }}>
        {groups.length === 0 && <p className="panel-empty">No groups listed yet — check back soon.</p>}
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
