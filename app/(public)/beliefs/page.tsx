import type { Metadata } from "next";
import Link from "next/link";
import { JsonLd } from "@/components/json-ld";
import { getPublishedDoctrineStatements } from "@/lib/data/public";
import { SITE_NAME } from "@/lib/org";

export const revalidate = 300;

export const metadata: Metadata = {
  title: "What We Believe",
  description: "The Declaration of Faith of New Testament Church of God, Bull Bay.",
  alternates: { canonical: "/beliefs" },
};

export default async function BeliefsPage() {
  const statements = await getPublishedDoctrineStatements();

  return (
    <section className="section" style={{ paddingTop: 50 }}>
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "WebPage",
          name: `What We Believe | ${SITE_NAME}`,
          about: { "@type": "Organization", name: SITE_NAME },
        }}
      />
      <p className="eyebrow">
        <span /> DECLARATION OF FAITH
      </p>
      <h1
        style={{
          fontFamily: "var(--font-display)",
          color: "var(--color-blue-700)",
          fontSize: "clamp(2.2rem,4vw,3.4rem)",
          margin: "0 0 18px",
          letterSpacing: "-.03em",
        }}
      >
        What We Believe
      </h1>
      <p className="large-copy">
        The Church of God believes the whole Bible to be completely and equally inspired and that it is the written
        Word of God. The Church of God has adopted the following Declaration of Faith as its standard and official
        expression of its doctrine.
      </p>
      <p className="form-note" style={{ marginTop: -6, marginBottom: 30 }}>
        We believe:
      </p>

      <ol style={{ listStyle: "none", padding: 0, marginTop: 40, display: "grid", gap: 14 }}>
        {statements.map((s) => (
          <li key={s.id} className="panel" style={{ display: "flex", gap: 18, alignItems: "flex-start", marginBottom: 0 }}>
            <span
              aria-hidden="true"
              style={{
                fontFamily: "var(--font-display)",
                fontSize: "1.6rem",
                color: "var(--color-olive-600)",
                minWidth: 40,
              }}
            >
              {String(s.ordinal).padStart(2, "0")}
            </span>
            <p style={{ margin: 0, color: "var(--color-ink)", fontSize: "1.02rem", lineHeight: 1.6 }}>{s.statement}</p>
          </li>
        ))}
      </ol>

      {statements.length === 0 && <p className="panel-empty">Our Declaration of Faith will appear here shortly.</p>}

      <div className="panel" style={{ marginTop: 30, textAlign: "center" }}>
        <h2 style={{ marginTop: 0 }}>Doctrinal Commitments</h2>
        <p style={{ maxWidth: 560, margin: "0 auto 16px", color: "var(--color-muted-2)" }}>
          Read the fuller Doctrinal Commitments of the denomination, with the Scripture references behind each one.
        </p>
        <Link className="primary-button" href="/beliefs/doctrinal-commitments">
          Doctrinal Commitments <span>→</span>
        </Link>
      </div>
    </section>
  );
}
