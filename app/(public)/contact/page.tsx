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
          <span /> YOUR NEXT STEP STARTS HERE
        </p>
        <h1 id="connect-title">
          Let&apos;s get
          <br />
          <em>connected.</em>
        </h1>
        <p>Tell us a little about yourself and a member of our team will be in touch.</p>
      </div>
      <section className="section form-layout">
        <aside className="form-aside">
          <span className="card-icon">✦</span>
          <h2>You belong here.</h2>
          <p>Choose what you are interested in and we will route your request to the right ministry team.</p>
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
