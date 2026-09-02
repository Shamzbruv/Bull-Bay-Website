import type { Metadata } from "next";
import { getPrimaryCampus } from "@/lib/data/public";
import { ContactForm } from "./contact-form";

export const revalidate = 120;
export const metadata: Metadata = {
  title: "Contact & Next Steps",
  description: "Tell us a little about yourself and a member of our team will be in touch.",
  alternates: { canonical: "/contact" },
};

export default async function ContactPage() {
  const campus = await getPrimaryCampus();

  return (
    <section aria-labelledby="connect-title">
      <div className="page-hero compact-hero olive-wash">
        <p className="eyebrow">
          <span /> WHOLENESS &amp; WELCOME
        </p>
        <h1 id="connect-title">
          Let&apos;s get
          <br />
          <em>connected.</em>
        </h1>
        <p>Whatever brought you here — a first visit, a ministry, prayer, or just a question — we want to hear from you.</p>
      </div>
      <section className="section form-layout">
        <aside className="form-aside">
          <span className="card-icon">✦</span>
          <h2>You belong here.</h2>
          <p>
            Choose what you are interested in: planning a visit, joining a ministry, a prayer request, a
            pastoral-care enquiry, or a general question. We will route it to the right team — no pastoral-care
            names or personal details are ever shown publicly.
          </p>
          <div className="mini-stat">
            <b>Visit us</b>
            <span>
              {campus?.city ?? "Bull Bay"}, {campus?.parish ?? "St. Andrew"}, Jamaica
            </span>
          </div>
        </aside>
        <ContactForm />
      </section>
    </section>
  );
}
