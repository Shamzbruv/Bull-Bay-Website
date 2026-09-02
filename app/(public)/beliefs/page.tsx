import type { Metadata } from "next";
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
        Our faith is grounded in Scripture and centred on Christ. These fourteen statements are New Testament Church
        of God, Bull Bay&apos;s Declaration of Faith, approved for the 2026–2027 church year.
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
    </section>
  );
}
