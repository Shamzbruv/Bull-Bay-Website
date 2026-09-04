import Link from "next/link";
import Image from "next/image";
import { getPrimaryCampus } from "@/lib/data/public";

function ArrowRightIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 20 20" width="17" height="17" fill="none">
      <path d="M3.75 10h12.5m-4.5-4.5 4.5 4.5-4.5 4.5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export async function SiteFooter() {
  const campus = await getPrimaryCampus();
  const year = new Date().getFullYear();
  const schedule = Array.isArray(campus?.service_schedule)
    ? (campus.service_schedule as { day: string; time: string; label: string }[])
    : [];
  const sundayService = schedule.find((item) => item.day === "Sunday");

  return (
    <footer className="site-footer">
      <div className="footer-shell">
        <section className="footer-invitation" aria-labelledby="footer-invitation-heading">
          <div className="footer-invitation-copy">
            <p className="footer-eyebrow">You&apos;re welcome here</p>
            <h2 id="footer-invitation-heading">There is a place for you at Bull Bay.</h2>
            <p>Come worship, grow in faith, and find a church family to walk with.</p>
          </div>
          <div className="footer-invitation-actions">
            <Link href="/visit" className="light-button footer-primary-action">
              Plan your visit
              <ArrowRightIcon />
            </Link>
            <Link href="/contact" className="outline-light-button footer-secondary-action">
              Get connected
            </Link>
          </div>
        </section>

        <div className="footer-main footer-grid">
          <div className="footer-identity">
            <Link className="brand footer-brand footer-brand-link" href="/" aria-label="New Testament Church of God, Bull Bay home">
              <Image
                src="/images/brand/bull-bay-logo.png"
                alt=""
                width={84}
                height={84}
                className="footer-logo"
              />
              <span className="footer-brand-copy">
                <strong>New Testament Church of God</strong>
                <small>Bull Bay, Jamaica</small>
              </span>
            </Link>
            <p className="footer-summary">A church family helping people worship, grow, serve, and belong.</p>
            <address className="footer-address">
              {campus?.address_line1 && <span>{campus.address_line1}<br /></span>}
              {campus?.city ?? "Bull Bay"}, {campus?.parish ?? "St. Andrew"}
              <br />
              {campus?.country ?? "Jamaica"}
            </address>
            <p className="footer-service-note">
              Sunday worship <time>{sundayService?.time ?? "9:50 AM"}</time>
            </p>
          </div>

          <nav className="footer-nav" aria-label="Footer navigation">
            <div className="footer-nav-column">
              <h3>Explore</h3>
              <Link href="/about">Our Story</Link>
              <Link href="/beliefs">Beliefs</Link>
              <Link href="/sermons">Sermons</Link>
              <Link href="/events">Events</Link>
              <Link href="/ministries">Ministries</Link>
              <Link href="/groups">Groups</Link>
              <Link href="/direction">Church Direction</Link>
            </div>
            <div className="footer-nav-column">
              <h3>Connect</h3>
              <Link href="/visit">Plan Your Visit</Link>
              <Link href="/prayer">Prayer Request</Link>
              <Link href="/contact">Contact &amp; Next Steps</Link>
              <Link href="/join">Request to Join</Link>
              <Link href="/serve">Serve</Link>
              <Link href="/member">Member Portal</Link>
            </div>
            <div className="footer-nav-column">
              <h3>Watch &amp; Give</h3>
              <Link href="/live">Watch Online</Link>
              <Link href="/give">Give Online</Link>
              <Link href="/calendar">Calendar</Link>
              <Link href="/shop">Church Store</Link>
            </div>
          </nav>
        </div>

        <div className="footer-bottom">
          <p className="footer-legal">© {year} New Testament Church of God, Bull Bay.</p>
          <p>Worship. Grow. Serve. Belong.</p>
        </div>
      </div>
    </footer>
  );
}
