import type { Metadata } from "next";
import Link from "next/link";
import { getPublicGoalsForMovement, getStrategicMovements, getStrategicPriorities } from "@/lib/data/public";

export const revalidate = 300;

export const metadata: Metadata = {
  title: "Our Direction 2026–2027",
  description: "New Testament Church of God, Bull Bay's strategic priorities and seven local ministry movements for the 2026–2027 church year.",
  alternates: { canonical: "/direction" },
};

export default async function DirectionPage() {
  const [priorities, movements] = await Promise.all([getStrategicPriorities(), getStrategicMovements()]);
  const goalsByMovement = await Promise.all(
    movements.map(async (m) => ({ movementId: m.id, goals: await getPublicGoalsForMovement(m.id) })),
  );
  const goalsMap = new Map(goalsByMovement.map((g) => [g.movementId, g.goals]));

  return (
    <section className="section" style={{ paddingTop: 50 }}>
      <p className="eyebrow">
        <span /> CHURCH YEAR 2026–2027
      </p>
      <h1
        style={{
          fontFamily: "var(--font-display)",
          color: "var(--color-blue-700)",
          fontSize: "clamp(2.2rem,4.4vw,3.6rem)",
          margin: "0 0 18px",
          letterSpacing: "-.03em",
        }}
      >
        Our Direction 2026–2027
      </h1>
      <p className="large-copy">
        Seven priorities will focus our work this church year, lived out through seven local ministry movements.
      </p>

      <div className="panel" style={{ marginTop: 40 }}>
        <h2>2026–2027 Strategic Priorities</h2>
        <div style={{ display: "grid", gap: 10 }}>
          {priorities.map((p) => (
            <div
              key={p.id}
              style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 0", borderBottom: "1px solid var(--color-border)" }}
            >
              <span style={{ fontSize: ".95rem", color: "var(--color-ink)" }}>{p.title}</span>
              {p.is_primary_focus && <span className="badge blue">Primary focus</span>}
            </div>
          ))}
        </div>
        <p className="form-note" style={{ marginTop: 16 }}>
          Male Discipleship and Youth Engagement &amp; Empowerment receive heightened resourcing, focused leadership
          attention and dedicated programming this year — the aim is transformational impact, not activity alone.
          Explore{" "}
          <Link href="/ministries/mens-ministry" className="link-button" style={{ display: "inline-flex" }}>
            Men&apos;s Ministry
          </Link>{" "}
          and{" "}
          <Link href="/ministries/youth-ministry" className="link-button" style={{ display: "inline-flex" }}>
            Youth Ministry
          </Link>
          .
        </p>
      </div>

      <div style={{ marginTop: 50 }}>
        <h2 style={{ fontFamily: "var(--font-display)", color: "var(--color-blue-700)", fontSize: "1.6rem", marginBottom: 24 }}>
          Seven Local Movements
        </h2>
        <div style={{ display: "grid", gap: 16 }}>
          {movements.map((m) => {
            const goals = goalsMap.get(m.id) ?? [];
            return (
              <article className="panel" id={m.slug} key={m.id} style={{ scrollMarginTop: 100 }}>
                <span className="tag">{m.short_label}</span>
                <h3 style={{ fontFamily: "var(--font-display)", color: "var(--color-blue-700)", fontSize: "1.5rem", margin: "14px 0 4px" }}>
                  {m.name}
                  {m.description && <span style={{ color: "var(--color-muted)", fontSize: "1rem", fontWeight: 400 }}> — {m.description}</span>}
                </h3>
                {m.objective && (
                  <p style={{ margin: "12px 0 0", color: "var(--color-ink)" }}>
                    <b style={{ color: "var(--color-olive-600)" }}>Objective: </b>
                    {m.objective}
                  </p>
                )}
                {m.expected_outcome && (
                  <p style={{ margin: "8px 0 0", color: "var(--color-muted-2)" }}>
                    <b style={{ color: "var(--color-olive-600)" }}>Expected outcome: </b>
                    {m.expected_outcome}
                  </p>
                )}
                {goals.length > 0 ? (
                  <div style={{ marginTop: 14 }}>
                    <b style={{ fontSize: ".78rem", color: "var(--color-olive-600)", textTransform: "uppercase", letterSpacing: ".05em" }}>
                      2026–2027 goal
                    </b>
                    <ul style={{ margin: "8px 0 0", paddingLeft: 20, color: "var(--color-ink)" }}>
                      {goals.map((g) => (
                        <li key={g.id}>{g.goal_text}</li>
                      ))}
                    </ul>
                  </div>
                ) : (
                  <p className="form-note" style={{ marginTop: 14 }}>
                    How we are responding: our leadership tracks specific, measurable targets for this movement
                    internally and reports progress through the church&apos;s regular ministry updates.
                  </p>
                )}
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}
