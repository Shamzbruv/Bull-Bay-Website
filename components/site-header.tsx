import Link from "next/link";
import { MainNav } from "@/components/main-nav";
import { SearchDialog } from "@/components/search-dialog";
import { getSessionUser } from "@/lib/auth/session";

export async function SiteHeader() {
  const user = await getSessionUser();

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
          <Link href={user ? "/member" : "/login"} className="icon-button" aria-label={user ? "My church account" : "Sign in"}>
            {user ? "☺" : "⇥"}
          </Link>
          <Link href="/give" className="give-button">
            Give <span aria-hidden="true">↗</span>
          </Link>
        </div>
      </header>
    </>
  );
}
