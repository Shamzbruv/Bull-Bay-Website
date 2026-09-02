import Link from "next/link";
import Image from "next/image";
import { getPrimaryCampus } from "@/lib/data/public";

export async function SiteFooter() {
  const campus = await getPrimaryCampus();
  const year = new Date().getFullYear();

  return (
    <footer className="site-footer">
      <div className="footer-top">
        <Link className="brand footer-brand" href="/" aria-label="New Testament Church of God, Bull Bay home">
          <Image
            src="/images/brand/bull-bay-logo.png"
            alt="New Testament Church of God, Bull Bay"
            width={92}
            height={92}
            className="footer-logo"
          />
        </Link>
        <p>A church family helping people worship, grow, serve and belong.</p>
        <Link href="/member" className="light-button">
          Member Portal <span aria-hidden="true">→</span>
        </Link>
      </div>
      <div className="footer-grid">
        <div>
          <b>Visit us</b>
          <p>
            {campus?.city ?? "Bull Bay"}, {campus?.parish ?? "St. Andrew"}
            <br />
            Jamaica
          </p>
          <Link className="footer-link" href="/visit">
            Plan your visit →
          </Link>
        </div>
        <div>
          <b>Explore</b>
          <Link href="/sermons">Sermons</Link>
          <Link href="/events">Events</Link>
          <Link href="/ministries">Ministries</Link>
          <Link href="/groups">Small Groups</Link>
        </div>
        <div>
          <b>Connect</b>
          <Link href="/prayer">Prayer request</Link>
          <Link href="/contact">Contact & next steps</Link>
          <Link href="/give">Give online</Link>
          <Link href="/serve">Volunteer</Link>
        </div>
        <div>
          <b>Live &amp; Give</b>
          <Link href="/live">Watch live</Link>
          <Link href="/shop">Church store</Link>
          <Link href="/calendar">Calendar</Link>
        </div>
      </div>
      <div className="footer-bottom">
        <span>© {year} New Testament Church of God, Bull Bay.</span>
        <span>Built for a connected church community.</span>
      </div>
    </footer>
  );
}
