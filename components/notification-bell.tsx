"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { DashboardIcon } from "@/components/dashboard-icons";
import { markAllNotificationsRead, markNotificationRead } from "@/app/(member)/member/notifications/actions";
import type { NotificationRow } from "@/lib/notifications";

function timeAgo(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  const minutes = Math.round(ms / 60000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(iso).toLocaleDateString("en-JM", { dateStyle: "medium" });
}

/**
 * The bell every workspace topbar shares (member/pastor/admin) — backed by
 * the `notifications` table (see lib/notifications.ts). Data is fetched
 * server-side by each layout and handed down as props; this component only
 * renders it, marks things read, and re-syncs itself in real time (a
 * `RealtimeRefresh`-style subscription, self-contained here since it also
 * needs to react locally without a full page navigation).
 */
export function NotificationBell({ notifications, unreadCount }: { notifications: NotificationRow[]; unreadCount: number }) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const rootRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  useEffect(() => {
    function onClickOutside(event: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel("notification-bell")
      .on("postgres_changes", { event: "*", schema: "public", table: "notifications" }, () => router.refresh())
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="notification-bell" ref={rootRef}>
      <button
        type="button"
        className="notification-bell-trigger"
        aria-label={unreadCount > 0 ? `Notifications, ${unreadCount} unread` : "Notifications"}
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        <DashboardIcon name="bell" />
        {unreadCount > 0 && <span className="notification-bell-badge">{unreadCount > 9 ? "9+" : unreadCount}</span>}
      </button>

      {open && (
        <div className="notification-bell-panel" role="menu">
          <div className="notification-bell-header">
            <strong>Notifications</strong>
            {unreadCount > 0 && (
              <button
                type="button"
                className="notification-bell-mark-all"
                disabled={pending}
                onClick={() => startTransition(async () => markAllNotificationsRead())}
              >
                Mark all read
              </button>
            )}
          </div>
          <div className="notification-bell-list">
            {notifications.length === 0 && <p className="notification-bell-empty">You&apos;re all caught up.</p>}
            {notifications.map((n) => {
              const item = (
                <>
                  <div className="notification-bell-item-top">
                    <span className="notification-bell-title">{n.title}</span>
                    {!n.read_at && <span className="notification-bell-dot" aria-hidden="true" />}
                  </div>
                  {n.body && <p>{n.body}</p>}
                  <small>{timeAgo(n.created_at)}</small>
                </>
              );
              const onOpen = () => {
                setOpen(false);
                if (!n.read_at) startTransition(async () => markNotificationRead(n.id));
              };
              return n.url ? (
                <Link key={n.id} href={n.url} className="notification-bell-item" onClick={onOpen}>
                  {item}
                </Link>
              ) : (
                <button key={n.id} type="button" className="notification-bell-item" onClick={onOpen}>
                  {item}
                </button>
              );
            })}
          </div>
          <Link href="/member/notifications" className="notification-bell-viewall" onClick={() => setOpen(false)}>
            View all
          </Link>
        </div>
      )}
    </div>
  );
}
