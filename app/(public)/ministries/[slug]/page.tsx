import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getMinistryBySlug } from "@/lib/data/public";

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
  if (!ministry) notFound();

  return (
    <section className="section" style={{ paddingTop: 50 }}>
      <p className="eyebrow">
        <span /> MINISTRY
      </p>
      <h1 style={{ fontFamily: "var(--font-display)", color: "var(--color-blue-700)", fontSize: "clamp(2rem,4vw,3rem)" }}>
        {ministry.icon} {ministry.name}
      </h1>
      {ministry.description && <p className="large-copy">{ministry.description}</p>}
      <Link className="primary-button" href="/contact">
        Join this ministry <span>→</span>
      </Link>
    </section>
  );
}
