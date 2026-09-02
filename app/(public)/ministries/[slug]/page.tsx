import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getMinistryBySlug, getPublicMinistryLeaders } from "@/lib/data/public";

export const revalidate = 120;
export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const ministry = await getMinistryBySlug(slug);
  if (!ministry) return {};
  return {
    title: ministry.name,
    description: ministry.description ?? undefined,
    alternates: { canonical: `/ministries/${slug}` },
  };
}

export default async function MinistryDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const ministry = await getMinistryBySlug(slug);
  if (!ministry || !ministry.is_active) notFound();

  const leaders = await getPublicMinistryLeaders(ministry.id);

  return (
    <section className="section" style={{ paddingTop: 50 }}>
      <p className="eyebrow">
        <span /> MINISTRY
      </p>
      <h1 style={{ fontFamily: "var(--font-display)", color: "var(--color-blue-700)", fontSize: "clamp(2rem,4vw,3rem)" }}>
        {ministry.icon} {ministry.name}
      </h1>
      {ministry.description && <p className="large-copy">{ministry.description}</p>}

      {leaders.length > 0 && (
        <div className="panel" style={{ maxWidth: 480 }}>
          <h2>Ministry leaders</h2>
          <div style={{ display: "grid", gap: 8 }}>
            {leaders.map((l, i) => (
              <div key={i} style={{ display: "flex", justifyContent: "space-between" }}>
                <span>{l.display_name}</span>
                <span className="badge">{l.position_title}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <Link className="primary-button" href="/serve">
        Join or Serve in this Ministry <span>→</span>
      </Link>
    </section>
  );
}
