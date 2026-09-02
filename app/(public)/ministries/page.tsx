import type { Metadata } from "next";
import Link from "next/link";
import { getMinistries } from "@/lib/data/public";

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
