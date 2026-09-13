"use client";

import Link from "next/link";
import Image from "next/image";
import { DashboardIcon } from "@/components/dashboard-icons";
import { NotificationBell } from "@/components/notification-bell";
import type { NotificationRow } from "@/lib/notifications";
import type { DashboardUser, WorkspaceDestination } from "@/components/dashboard-nav";

export function DashboardTopbar({
  label,
  user,
  workspaces,
  navigationOpen,
  onOpenNavigation,
  profileHref,
  notifications,
  unreadCount,
}: {
  label: string;
  user: DashboardUser;
  workspaces: WorkspaceDestination[];
  navigationOpen: boolean;
  onOpenNavigation: () => void;
  profileHref: string;
  notifications: NotificationRow[];
  unreadCount: number;
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
          <label className="dashboard-workspace-switcher">
            <span className="sr-only">Preview role</span>
            <select aria-label="Preview role" value={workspaces.find(w => w.active)?.href ?? ""} onChange={e => { window.location.href = e.target.value; }}>
              {workspaces.map(workspace => <option key={workspace.href} value={workspace.href}>{workspace.label}</option>)}
            </select>
          </label>
        )}
        <Link className="dashboard-site-link" href="/" title="View church website">
          <DashboardIcon name="church" />
          <span>View website</span>
        </Link>
        <NotificationBell notifications={notifications} unreadCount={unreadCount} />
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
