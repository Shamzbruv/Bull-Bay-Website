import type { Metadata } from "next";
import Link from "next/link";
import { getVolunteerOpportunities } from "@/lib/data/public";
import { getSessionUser } from "@/lib/auth/session";
import { ShiftButton } from "./shift-button";

export const metadata: Metadata = {
  title: "Serve",
  description: "Use your gifts to serve Bull Bay and the wider community.",
  alternates: { canonical: "/serve" },
};

const SERVE_MINISTRIES = [
  { slug: "mens-ministry", name: "Men's Ministry" },
  { slug: "youth-ministry", name: "Youth Ministry" },
  { slug: "hospitality", name: "Welcome / Hospitality" },
  { slug: "childrens-ministry", name: "Children's Ministry" },
  { slug: "worship-music", name: "Music Ministry" },
  { slug: "media-ministry", name: "Media Ministry" },
  { slug: "community-outreach", name: "Evangelism, Discipleship & Mission" },
  { slug: "benevolence-ministry", name: "Benevolence Ministry" },
];

export default async function ServePage() {
  const [opportunities, user] = await Promise.all([getVolunteerOpportunities(), getSessionUser()]);

  return (
    <section className="section" style={{ paddingTop: 50 }}>
      <p className="eyebrow">
        <span /> USE YOUR GIFTS
      </p>
      <h1 style={{ fontFamily: "var(--font-display)", color: "var(--color-blue-700)", fontSize: "clamp(2rem,4vw,3rem)" }}>
        Serve with Bull Bay.
      </h1>
      <p className="large-copy">Find a ministry to join — these are open opportunities, not a staff directory.</p>

      <div className="ministry-grid" style={{ marginTop: 24 }}>
        {SERVE_MINISTRIES.map((m) => (
          <Link key={m.slug} href={`/ministries/${m.slug}`} className="ministry-card">
            <span className="icon">✦</span>
            <div>
              <h3 style={{ fontSize: "1.1rem" }}>{m.name}</h3>
            </div>
            <span>Learn more →</span>
          </Link>
        ))}
      </div>

      <h2 style={{ fontFamily: "var(--font-display)", color: "var(--color-blue-700)", fontSize: "1.5rem", marginTop: 50 }}>
        Open serving shifts
      </h2>
      <div style={{ marginTop: 20, display: "grid", gap: 16 }}>
        {opportunities.length === 0 && <p className="panel-empty">No open volunteer opportunities right now — check back soon.</p>}
        {opportunities.map((opp) => (
          <div className="panel" key={opp.id}>
            <h2>{opp.title}</h2>
            {opp.description && <p style={{ color: "var(--color-muted-2)" }}>{opp.description}</p>}
            <div style={{ display: "grid", gap: 10, marginTop: 14 }}>
              {(opp.volunteer_shifts ?? []).map((shift) => (
                <div key={shift.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
                  <span style={{ fontSize: ".84rem" }}>
                    {new Date(shift.starts_at).toLocaleString("en-JM", { dateStyle: "medium", timeStyle: "short", timeZone: "America/Jamaica" })}
                  </span>
                  <ShiftButton shiftId={shift.id} signedIn={Boolean(user)} />
                </div>
              ))}
              {(opp.volunteer_shifts ?? []).length === 0 && (
                <p style={{ fontSize: ".8rem", color: "var(--color-muted)" }}>No scheduled shifts yet.</p>
              )}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
