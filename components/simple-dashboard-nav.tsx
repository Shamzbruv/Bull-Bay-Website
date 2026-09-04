"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

/**
 * Deliberately separate from components/dashboard-nav.tsx (which is mid-
 * rewrite into a workspace-switcher shell with no CSS yet — see the layout
 * files' comments). This is the plain, proven, already-styled nav pattern,
 * kept under its own name so it can't collide with that other work.
 */
export function SimpleDashboardNav({ title, items }: { title: string; items: { href: string; label: string }[] }) {
  const pathname = usePathname();
  return (
    <nav className="dashboard-nav" aria-label={`${title} navigation`}>
      <span className="dashboard-nav-title">{title}</span>
      {items.map((item) => (
        <Link key={item.href} href={item.href} aria-current={pathname === item.href ? "page" : undefined}>
          {item.label}
        </Link>
      ))}
      <form action="/auth/signout" method="post" style={{ marginTop: 12 }}>
        <button type="submit" className="secondary-button compact" style={{ width: "100%" }}>
          Sign out
        </button>
      </form>
    </nav>
  );
}
