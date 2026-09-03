"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

const LINKS = [
  { href: "/visit", label: "I'm New" },
  { href: "/live", label: "Watch" },
  { href: "/ministries", label: "Ministries" },
  { href: "/events", label: "Events" },
];

const EXPLORE_LINKS = [
  { href: "/about", label: "Our Story" },
  { href: "/beliefs", label: "Beliefs" },
  { href: "/sermons", label: "Sermons" },
  { href: "/groups", label: "Groups" },
  { href: "/direction", label: "Church Direction" },
];

function MenuIcon({ open }: { open: boolean }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" width="22" height="22" fill="none">
      {open ? (
        <path d="m6.5 6.5 11 11m0-11-11 11" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      ) : (
        <path d="M4.5 7.25h15M4.5 12h15M4.5 16.75h15" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      )}
    </svg>
  );
}

function ChevronDownIcon() {
  return (
    <svg className="nav-chevron" aria-hidden="true" viewBox="0 0 16 16" width="14" height="14" fill="none">
      <path d="m4 6 4 4 4-4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function MainNav() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const exploreActive = EXPLORE_LINKS.some((l) => pathname.startsWith(l.href));

  return (
    <div className="navigation-shell">
      <button
        type="button"
        className="menu-button nav-toggle"
        aria-label={open ? "Close navigation" : "Open navigation"}
        aria-expanded={open}
        aria-controls="main-nav"
        onClick={() => setOpen((v) => !v)}
      >
        <span className="nav-toggle-icon">
          <MenuIcon open={open} />
        </span>
      </button>
      <nav id="main-nav" className={`main-nav${open ? " open" : ""}`} aria-label="Primary navigation">
        {LINKS.map((link) => {
          const isActive = pathname.startsWith(link.href);
          return (
            <Link
              key={link.href}
              href={link.href}
              className={`nav-link${isActive ? " is-active" : ""}`}
              aria-current={isActive ? "page" : undefined}
              onClick={() => setOpen(false)}
            >
              {link.label}
            </Link>
          );
        })}
        <details className="nav-dropdown">
          <summary
            className={`nav-dropdown-trigger${exploreActive ? " is-active" : ""}`}
            aria-current={exploreActive ? "page" : undefined}
          >
            <span>About</span>
            <ChevronDownIcon />
          </summary>
          <div className="nav-dropdown-menu">
            {EXPLORE_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={`nav-dropdown-link${pathname.startsWith(link.href) ? " is-active" : ""}`}
                aria-current={pathname.startsWith(link.href) ? "page" : undefined}
                onClick={() => setOpen(false)}
              >
                {link.label}
              </Link>
            ))}
          </div>
        </details>
        <Link className="nav-mobile-give" href="/give" onClick={() => setOpen(false)}>
          Give online
        </Link>
      </nav>
    </div>
  );
}
