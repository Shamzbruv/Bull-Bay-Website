import type { Metadata } from "next";
import Image from "next/image";
import { JsonLd } from "@/components/json-ld";
import { getPrimaryCampus } from "@/lib/data/public";
import { CHURCH_ADDRESS, CHURCH_CONTACTS, CHURCH_EMAIL, CHURCH_MAP_LINKS, CHURCH_PLUS_CODE, SITE_NAME } from "@/lib/org";
import { breadcrumbStructuredData, churchStructuredData } from "@/lib/seo";
import { ContactForm } from "./contact-form";

export const revalidate = 120;
export const metadata: Metadata = {
  title: "Contact Us",
  description:
    "Reach the church office, the Office of the Pastor, or our support desk — and find your way to Weise Road, 9 Miles, Bull Bay.",
  alternates: { canonical: "/contact" },
};

export default async function ContactPage() {
  const campus = await getPrimaryCampus();
  const schedule = Array.isArray(campus?.service_schedule)
    ? (campus?.service_schedule as { day: string; time: string; label: string }[])
    : [];

  return (
    <section aria-labelledby="contact-title">
      {/* Same builder and the same @id as the homepage, so search engines
          read one church rather than two similarly-named ones. */}
      <JsonLd data={churchStructuredData(schedule)} />
      <JsonLd
        data={breadcrumbStructuredData([
          { name: "Home", path: "/" },
          { name: "Contact Us", path: "/contact" },
        ])}
      />

      <div className="contact-hero">
        <div className="contact-hero-copy">
          <p className="eyebrow">
            <span /> WE WOULD LOVE TO HEAR FROM YOU
          </p>
          <h1 id="contact-title">
            Come and see —
            <br />
            <em>or simply call.</em>
          </h1>
          <p className="hero-text">
            There is a real person at the end of every number on this page. Whether you are planning a first
            Sunday, arranging a wedding, asking after someone, or stuck signing in — start here and we will get
            you to the right hands.
          </p>
          <div className="contact-hero-actions">
            <a className="primary-button" href={`tel:${CHURCH_CONTACTS[0]?.dial}`}>
              Call the church office <span>→</span>
            </a>
            <a className="secondary-button" href="#find-us">
              Find your way here
            </a>
          </div>
        </div>
        <div className="contact-hero-media">
          <Image
            src="/images/church/pastor-preaching.jpg"
            alt="Rev. Dr. Kevin Page preaching at Bull Bay, with the choir seated behind him"
            width={1050}
            height={1400}
            priority
            sizes="(max-width: 900px) 100vw, 44vw"
          />
        </div>
      </div>

      <section className="section" aria-labelledby="reach-us">
        <div className="home-section-heading">
          <h2 id="reach-us">
            Who to <em>call.</em>
          </h2>
          <p>Three lines, so your call reaches the person who can actually help — first time.</p>
        </div>
        <div className="contact-card-grid">
          {CHURCH_CONTACTS.map((contact) => (
            <a key={contact.dial} className="contact-card" href={`tel:${contact.dial}`}>
              <span className="card-icon" aria-hidden="true">
                {contact.icon}
              </span>
              <p className="contact-card-role">{contact.role}</p>
              <h3>{contact.title}</h3>
              <p className="contact-card-desc">{contact.description}</p>
              <strong className="contact-card-number">{contact.display}</strong>
              <span className="contact-card-cta" aria-hidden="true">
                Tap to call →
              </span>
            </a>
          ))}
        </div>
        <p className="contact-note">
          Hoping to speak with Rev. Dr. Kevin Page? Call the <strong>Office of the Pastor</strong> above. His
          Executive Assistant keeps his diary and will arrange a call, a visit or an appointment — it is the
          surest way to reach him.
        </p>
      </section>

      <section className="section contact-find-us" id="find-us" aria-labelledby="find-us-title">
        <div className="contact-map-layout">
          <div className="contact-map-details">
            <div className="home-section-heading">
              <h2 id="find-us-title">
                Find your <em>way here.</em>
              </h2>
            </div>
            <address className="contact-address">
              <strong>{SITE_NAME}</strong>
              {CHURCH_ADDRESS.street}
              <br />
              {CHURCH_ADDRESS.town}, {CHURCH_ADDRESS.parish}
              <br />
              {CHURCH_ADDRESS.postal}
              <br />
              {CHURCH_ADDRESS.country}
            </address>
            <p className="contact-plus-code">
              <span>Plus Code</span>
              <b>{CHURCH_PLUS_CODE}</b>
              <small>Type this into Google Maps to land on the church gate exactly.</small>
            </p>
            <p className="contact-map-help">
              Open the address in your map app and it will navigate you door to door from wherever you are.
            </p>
            <div className="contact-map-actions">
              <a className="primary-button compact" href={CHURCH_MAP_LINKS.google} target="_blank" rel="noopener noreferrer">
                Google Maps <span>→</span>
              </a>
              <a className="secondary-button" href={CHURCH_MAP_LINKS.apple} target="_blank" rel="noopener noreferrer">
                Apple Maps
              </a>
              <a className="secondary-button" href={CHURCH_MAP_LINKS.waze} target="_blank" rel="noopener noreferrer">
                Waze
              </a>
            </div>
            {schedule.length > 0 && (
              <div className="contact-times">
                <h3>When we gather</h3>
                <ul>
                  {schedule.map((service) => (
                    <li key={`${service.day}-${service.time}`}>
                      <b>{service.day}</b>
                      <span>{service.label}</span>
                      <time>{service.time}</time>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            <p className="contact-email-line">
              Prefer to write? <a href={`mailto:${CHURCH_EMAIL}`}>{CHURCH_EMAIL}</a>
            </p>
          </div>
          <figure className="contact-map-frame">
            <iframe
              src={CHURCH_MAP_LINKS.embed}
              title={`Map showing ${CHURCH_ADDRESS.street}, ${CHURCH_ADDRESS.town}`}
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
            />
            <figcaption>
              Map data ©{" "}
              <a href={CHURCH_MAP_LINKS.openStreetMap} target="_blank" rel="noopener noreferrer">
                OpenStreetMap
              </a>{" "}
              contributors
            </figcaption>
          </figure>
        </div>
      </section>

      <section className="section form-layout" aria-labelledby="write-to-us">
        <aside className="form-aside">
          <span className="card-icon">✦</span>
          <h2 id="write-to-us">Or send us a message.</h2>
          <p>
            Tell us what brought you here — planning a visit, joining a ministry, a prayer request, a
            pastoral-care enquiry, or a general question. We route it to the right team, and no pastoral-care
            names or personal details are ever shown publicly.
          </p>
          <div className="mini-stat">
            <b>Visit us</b>
            <span>
              {CHURCH_ADDRESS.street}, {CHURCH_ADDRESS.town}, {CHURCH_ADDRESS.parish}
            </span>
          </div>
        </aside>
        <ContactForm />
      </section>
    </section>
  );
}
