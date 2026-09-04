import type { Metadata } from "next";
import Link from "next/link";
import { getMinistries } from "@/lib/data/public";

export const revalidate = 120;
export const metadata: Metadata = {
  title: "Ministries",
  description: "Find your place to grow and serve at Bull Bay.",
  alternates: { canonical: "/ministries" },
};

export default async function MinistriesPage() {
  const ministries = await getMinistries();

  return (
    <section aria-labelledby="ministries-title">
      <div className="page-hero ministry-hero">
        <p className="eyebrow light">
          <span /> THERE&apos;S A PLACE FOR YOU
        </p>
        <h1 id="ministries-title">
          Grow in faith.
          <br />
          <em>Serve with joy.</em>
        </h1>
        <p>Ministry is where gifts become impact and church becomes family.</p>
      </div>
      <div className="section" style={{ paddingBottom: 0 }}>
        <div className="church-photo-hero" style={{ minHeight: 300 }}>
          <picture className="church-photo-hero-media">
            <img src="/images/church/worship-hands-raised.jpg" alt="The Bull Bay congregation in worship" />
          </picture>
          <div className="church-photo-hero-overlay" />
          <div className="church-photo-hero-copy" style={{ padding: "30px 34px", width: "min(400px, 100%)" }}>
            <p className="eyebrow">
              <span /> LIFE TOGETHER
            </p>
            <h1 style={{ fontSize: "clamp(1.4rem, 3vw, 1.9rem)" }}>Every generation, growing.</h1>
          </div>
        </div>
      </div>
      <section className="section ministry-grid">
        {ministries.map((ministry) => (
          <article className="ministry-card" key={ministry.id}>
            <span className="icon">{ministry.icon}</span>
            <div>
              <h3>{ministry.name}</h3>
              {ministry.description && <p>{ministry.description}</p>}
            </div>
            <Link href={`/ministries/${ministry.slug}`}>Learn more →</Link>
          </article>
        ))}
      </section>
    </section>
  );
}
