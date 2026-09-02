"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

const LINKS = [
  { href: "/", label: "Home" },
  { href: "/visit", label: "I'm New" },
  { href: "/sermons", label: "Sermons" },
  { href: "/events", label: "Events" },
  { href: "/ministries", label: "Ministries" },
  { href: "/shop", label: "Shop" },
];

const EXPLORE_LINKS = [
  { href: "/about", label: "Our Story" },
  { href: "/beliefs", label: "Our Beliefs" },
  { href: "/direction", label: "Our Direction 2026–2027" },
];

export function MainNav() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const exploreActive = EXPLORE_LINKS.some((l) => pathname.startsWith(l.href));

  return (
    <>
      <button
        className="menu-button"
        aria-label="Open navigation"
        aria-expanded={open}
        aria-controls="main-nav"
        onClick={() => setOpen((v) => !v)}
      >
        ☰
      </button>
      <nav id="main-nav" className={`main-nav${open ? " open" : ""}`} aria-label="Primary navigation">
        {LINKS.map((link) => {
          const isActive = link.href === "/" ? pathname === "/" : pathname.startsWith(link.href);
          return (
            <Link
              key={link.href}
              href={link.href}
              aria-current={isActive ? "page" : undefined}
              onClick={() => setOpen(false)}
            >
              {link.label}
            </Link>
          );
        })}
        <details className="nav-dropdown">
          <summary aria-current={exploreActive ? "page" : undefined}>About</summary>
          <div className="nav-dropdown-menu">
            {EXPLORE_LINKS.map((link) => (
              <Link key={link.href} href={link.href} onClick={() => setOpen(false)}>
                {link.label}
              </Link>
            ))}
          </div>
        </details>
      </nav>
    </>
  );
}
