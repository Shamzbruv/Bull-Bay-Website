import Link from "next/link";
import { MainNav } from "@/components/main-nav";
import { SearchDialog } from "@/components/search-dialog";
import { HeaderAuth } from "@/components/header-auth";

// Deliberately not async / no cookies() read — see lib/supabase/public.ts.
// The one bit that needs to know who's asking (HeaderAuth) is a client
// component so the rest of this (and every page that renders it) can be
// statically cached.
export function SiteHeader() {
  return (
    <>
      <div className="announcement-bar" role="status">
        <span className="pulse" /> Welcome to Bull Bay Digital Church
        <Link href="/visit" className="text-button">
          Plan your first visit <span aria-hidden="true">→</span>
        </Link>
      </div>

      <header className="site-header">
        <Link className="brand" href="/" aria-label="New Testament Church of God Bull Bay home">
          <span className="brand-mark" aria-hidden="true">
            <span />
            <i />
          </span>
          <span>
            <strong>NTCOG</strong>
            <small>BULL BAY</small>
          </span>
        </Link>

        <MainNav />

        <div className="header-actions">
          <SearchDialog />
          <HeaderAuth />
          <Link href="/give" className="give-button">
            Give <span aria-hidden="true">↗</span>
          </Link>
        </div>
      </header>
    </>
  );
}
