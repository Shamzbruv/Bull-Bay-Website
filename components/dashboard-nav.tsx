"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useEffect } from "react";
import { DashboardIcon, type DashboardIconName } from "@/components/dashboard-icons";

export type DashboardNavItem = { href: string; label: string; icon: DashboardIconName; badge?: string | number };
export type DashboardNavSection = { label: string; items: DashboardNavItem[] };
export type WorkspaceDestination = { href: string; label: string; icon: DashboardIconName; active?: boolean };
export type DashboardUser = { name: string; email?: string | null };

function routeIsActive(pathname: string, href: string) {
  if (pathname === href) return true;
  const segments = href.split("/").filter(Boolean);
  return segments.length > 1 && pathname.startsWith(`${href}/`);
}

export function DashboardNav({
  title,
  subtitle,
  sections,
  user,
  workspaces,
  open,
  onClose,
}: {
  title: string;
  subtitle: string;
  sections: DashboardNavSection[];
  user: DashboardUser;
  workspaces: WorkspaceDestination[];
  open: boolean;
  onClose: () => void;
}) {
  const pathname = usePathname();

  useEffect(() => {
    onClose();
    // Close the mobile drawer after navigation; onClose is intentionally not
    // included because it is recreated by the client shell.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  return (
    <>
      <button className={`dashboard-nav-backdrop${open ? " is-open" : ""}`} type="button" aria-label="Close navigation" onClick={onClose} />
      <aside
        className={`dashboard-sidebar${open ? " is-open" : ""}`}
        id="workspace-navigation"
        aria-label={`${title} workspace navigation`}
        role={open ? "dialog" : undefined}
        aria-modal={open ? true : undefined}
      >
        <div className="dashboard-sidebar-head">
          <Link className="dashboard-brand" href="/" aria-label="NTCOG Bull Bay website">
            <span className="dashboard-brand-mark">
              <Image src="/images/brand/bull-bay-symbol.png" alt="" width={42} height={42} priority />
            </span>
            <span className="dashboard-brand-copy">
              <strong>NTCOG Bull Bay</strong>
              <small>{subtitle}</small>
            </span>
          </Link>
          <button className="dashboard-nav-close" type="button" aria-label="Close navigation" onClick={onClose}>
            <span aria-hidden="true">×</span>
          </button>
        </div>

        <div className="dashboard-workspace-title">
          <span>Current workspace</span>
          <strong>{title}</strong>
        </div>

        <nav className="dashboard-nav" aria-label={`${title} navigation`}>
          {sections.map((section) => (
            <div className="dashboard-nav-section" key={section.label}>
              <span className="dashboard-nav-title">{section.label}</span>
              {section.items.map((item) => {
                const active = routeIsActive(pathname, item.href);
                return (
                  <Link key={item.href} href={item.href} aria-current={active ? "page" : undefined}>
                    <DashboardIcon name={item.icon} />
                    <span>{item.label}</span>
                    {item.badge !== undefined && <small className="dashboard-nav-badge">{item.badge}</small>}
                  </Link>
                );
              })}
            </div>
          ))}
        </nav>

        <div className="dashboard-sidebar-footer">
          {workspaces.length > 1 && (
            <div className="dashboard-mobile-workspaces" aria-label="Switch workspace">
              <span>Switch workspace</span>
              <div>
                {workspaces.map((workspace) => (
                  <Link key={workspace.href} href={workspace.href} aria-current={workspace.active ? "page" : undefined}>
                    <DashboardIcon name={workspace.icon} />
                    {workspace.label}
                  </Link>
                ))}
              </div>
            </div>
          )}
          <div className="dashboard-sidebar-user">
            <span className="dashboard-avatar" aria-hidden="true">
              {user.name
                .split(/\s+/)
                .filter(Boolean)
                .slice(0, 2)
                .map((part) => part[0]?.toUpperCase())
                .join("") || "BB"}
            </span>
            <span>
              <strong>{user.name}</strong>
              {user.email && <small>{user.email}</small>}
            </span>
          </div>
          <form action="/auth/signout" method="post">
            <button type="submit" className="dashboard-signout">
              <DashboardIcon name="archive" />
              Sign out
            </button>
          </form>
        </div>
      </aside>
    </>
  );
}
