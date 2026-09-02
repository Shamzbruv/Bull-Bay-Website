import type { Metadata } from "next";
import Link from "next/link";
import { getStrategicMovementBySlug } from "@/lib/data/public";
import { PrayerForm } from "./prayer-form";

export const revalidate = 120;
export const metadata: Metadata = {
  title: "Prayer Request",
  description: "Our prayer team would be honoured to stand with you in faith.",
  alternates: { canonical: "/prayer" },
};

export default async function PrayerPage() {
  const watch = await getStrategicMovementBySlug("watch");

  return (
    <section aria-labelledby="prayer-title">
      <div className="page-hero prayer-hero">
        <p className="eyebrow">
          <span /> WATCH: PRAYER &amp; SPIRITUAL VIGILANCE
        </p>
        <h1 id="prayer-title">
          You don&apos;t have to
          <br />
          <em>carry it alone.</em>
        </h1>
        <p>{watch?.objective ?? "Our prayer team would be honoured to stand with you in faith."}</p>
      </div>
      <section className="section form-layout">
        <aside className="form-aside">
          <span className="card-icon">♡</span>
          <h2>A safe place to be heard.</h2>
          <p>
            Your request can be marked confidential — access is limited to the authorized prayer and pastoral team,
            enforced by database-level security policy, not just a hidden menu.
          </p>
          {watch?.expected_outcome && (
            <p style={{ fontSize: ".85rem", color: "var(--color-muted-2)" }}>{watch.expected_outcome}</p>
          )}
          <div className="mini-stat">
            <b>Prayer changes things.</b>
            <span>James 5:16</span>
          </div>
        </aside>
        <PrayerForm />
      </section>

      <section className="section" style={{ paddingTop: 0 }}>
        <div className="panel">
          <h2>Serve on the Prayer &amp; Fasting team</h2>
          <p style={{ color: "var(--color-muted-2)" }}>
            Interested in leading or joining corporate prayer and fasting at Bull Bay? Let us know — this serves
            alongside our confidential pastoral prayer workflow, not as part of it.
          </p>
          <Link className="primary-button compact" href="/serve">
            I&apos;m interested in Prayer &amp; Fasting <span>→</span>
          </Link>
        </div>
      </section>
    </section>
  );
}
