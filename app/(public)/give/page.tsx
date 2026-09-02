import type { Metadata } from "next";
import { getActiveFunds } from "@/lib/data/public";
import { getSessionUser } from "@/lib/auth/session";
import { GivingForm } from "./giving-form";

export const metadata: Metadata = {
  title: "Give",
  description: "Your giving makes ministry possible at New Testament Church of God, Bull Bay.",
  alternates: { canonical: "/give" },
};

export default async function GivePage() {
  const [funds, user] = await Promise.all([getActiveFunds(), getSessionUser()]);

  return (
    <section aria-labelledby="giving-title">
      <div className="page-hero giving-hero">
        <p className="eyebrow light">
          <span /> GENEROSITY CHANGES LIVES
        </p>
        <h1 id="giving-title">
          Your giving makes
          <br />
          <em>ministry possible.</em>
        </h1>
        <p>Thank you for helping us share the love of Jesus in Bull Bay, Jamaica and beyond.</p>
      </div>
      <section className="section giving-layout">
        <div>
          <p className="eyebrow">
            <span /> GIVE WITH PURPOSE
          </p>
          <h2>Every gift helps build people, families, and communities.</h2>
          <p>
            Choose a fund below. Payment processing will go live once the church selects and verifies a
            Jamaica-supported provider such as WiPay, PayPal, or Powertranz.
          </p>
          <div className="giving-impact">
            <span>✦</span>
            <p>
              <b>Faithful stewardship</b>
              <br />
              Giving and shop payments are kept as separate records for clear financial reconciliation.
            </p>
          </div>
        </div>
        <GivingForm funds={funds.map((f) => ({ id: f.id, name: f.name }))} signedIn={Boolean(user)} />
      </section>
    </section>
  );
}
