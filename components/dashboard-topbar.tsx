"use client";

import Link from "next/link";
import Image from "next/image";
import { DashboardIcon } from "@/components/dashboard-icons";
import type { DashboardUser, WorkspaceDestination } from "@/components/dashboard-nav";

export function DashboardTopbar({
  label,
  user,
  workspaces,
  navigationOpen,
  onOpenNavigation,
  profileHref,
}: {
  label: string;
  user: DashboardUser;
  workspaces: WorkspaceDestination[];
  navigationOpen: boolean;
  onOpenNavigation: () => void;
  profileHref: string;
}) {
  const initials =
    user.name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join("") || "BB";

  return (
    <header className="dashboard-topbar">
      <div className="dashboard-topbar-left">
        <button
          className="dashboard-menu-button"
          type="button"
          aria-label="Open navigation"
          aria-controls="workspace-navigation"
          aria-expanded={navigationOpen}
          onClick={onOpenNavigation}
        >
          <span aria-hidden="true" />
          <span aria-hidden="true" />
          <span aria-hidden="true" />
        </button>
        <Link className="dashboard-mobile-brand" href="/" aria-label="NTCOG Bull Bay website">
          <Image src="/images/brand/bull-bay-symbol.png" alt="" width={36} height={36} priority />
        </Link>
        <div className="dashboard-topbar-context">
          <small>Welcome to</small>
          <strong>{label}</strong>
        </div>
      </div>

      <div className="dashboard-topbar-actions">
        {workspaces.length > 1 && (
          <nav className="dashboard-workspace-switcher" aria-label="Switch workspace">
            {workspaces.map((workspace) => (
              <Link key={workspace.href} href={workspace.href} aria-current={workspace.active ? "page" : undefined}>
                <DashboardIcon name={workspace.icon} />
                <span>{workspace.label}</span>
              </Link>
            ))}
          </nav>
        )}
        <Link className="dashboard-site-link" href="/" title="View church website">
          <DashboardIcon name="church" />
          <span>View website</span>
        </Link>
        <Link className="dashboard-topbar-user" href={profileHref} aria-label={`Open profile for ${user.name}`}>
          {user.avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element -- signed Storage URL, not an optimizable local/remote asset
            <img className="dashboard-avatar dashboard-avatar-photo" src={user.avatarUrl} alt="" aria-hidden="true" />
          ) : (
            <span className="dashboard-avatar" aria-hidden="true">{initials}</span>
          )}
          <span>
            <strong>{user.name}</strong>
            <small>My profile</small>
          </span>
        </Link>
      </div>
    </header>
  );
}
