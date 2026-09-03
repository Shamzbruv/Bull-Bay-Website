import Link from "next/link";
import Image from "next/image";
import { MainNav } from "@/components/main-nav";
import { SearchDialog } from "@/components/search-dialog";
import { HeaderAuth } from "@/components/header-auth";

function ClockIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" width="18" height="18" fill="none">
      <circle cx="12" cy="12" r="8.5" stroke="currentColor" strokeWidth="1.75" />
      <path d="M12 7.75v4.7l3.15 1.8" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
    </svg>
  );
}

function ArrowUpRightIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 20 20" width="16" height="16" fill="none">
      <path d="M5.25 14.75 14.5 5.5M7.25 5.5h7.25v7.25" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

// Deliberately not async / no cookies() read — see lib/supabase/public.ts.
// The one bit that needs to know who's asking (HeaderAuth) is a client
// component so the rest of this (and every page that renders it) can be
// statically cached.
export function SiteHeader() {
  return (
    <>
      <div className="service-info-bar announcement-bar">
        <div className="service-info-inner">
          <div className="service-info-primary">
            <ClockIcon />
            <span>
              Sunday worship at <time dateTime="09:50">9:50 AM</time>
            </span>
          </div>
          <span className="service-info-location">Bull Bay, St. Andrew</span>
          <Link href="/visit" className="service-info-link text-button">
            Plan your visit
            <ArrowUpRightIcon />
          </Link>
        </div>
      </div>

      <header className="site-header">
        <div className="site-header-inner">
          <Link className="brand site-brand" href="/" aria-label="New Testament Church of God, Bull Bay home">
            <span className="brand-mark">
              <Image
                src="/images/brand/bull-bay-symbol.png"
                alt=""
                width={48}
                height={48}
                className="brand-logo"
                priority
              />
            </span>
            <span className="brand-copy">
              <strong className="brand-name">New Testament Church of God</strong>
              <small className="brand-location">Bull Bay, Jamaica</small>
            </span>
          </Link>

          <MainNav />

          <nav className="header-actions" aria-label="Website tools">
            <div className="header-search">
              <SearchDialog />
            </div>
            <HeaderAuth />
            <Link href="/give" className="give-button header-give-link">
              <span>Give</span>
              <ArrowUpRightIcon />
            </Link>
          </nav>
        </div>
      </header>
    </>
  );
}
