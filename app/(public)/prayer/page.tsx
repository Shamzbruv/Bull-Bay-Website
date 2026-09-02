import type { Metadata } from "next";
import { PrayerForm } from "./prayer-form";

export const revalidate = 120;
export const metadata: Metadata = {
  title: "Prayer Request",
  description: "Our prayer team would be honoured to stand with you in faith.",
  alternates: { canonical: "/prayer" },
};

export default function PrayerPage() {
  return (
    <section aria-labelledby="prayer-title">
      <div className="page-hero prayer-hero">
        <p className="eyebrow">
          <span /> WE BELIEVE IN PRAYER
        </p>
        <h1 id="prayer-title">
          You don&apos;t have to
          <br />
          <em>carry it alone.</em>
        </h1>
        <p>Our prayer team would be honoured to stand with you in faith.</p>
      </div>
      <section className="section form-layout">
        <aside className="form-aside">
          <span className="card-icon">♡</span>
          <h2>A safe place to be heard.</h2>
          <p>
            Your request can be marked confidential — access is limited to the authorized prayer and pastoral team,
            enforced by database-level security policy, not just a hidden menu.
          </p>
          <div className="mini-stat">
            <b>Prayer changes things.</b>
            <span>James 5:16</span>
          </div>
        </aside>
        <PrayerForm />
      </section>
    </section>
  );
}
