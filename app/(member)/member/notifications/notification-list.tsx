"use client";

import { useTransition } from "react";
import Link from "next/link";
import { markAllNotificationsRead, markNotificationRead } from "./actions";
import type { NotificationRow } from "@/lib/notifications";

export function NotificationList({ notifications }: { notifications: NotificationRow[] }) {
  const [pending, startTransition] = useTransition();
  const hasUnread = notifications.some((n) => !n.read_at);

  return (
    <div>
      {hasUnread && (
        <button
          type="button"
          className="secondary-button compact"
          disabled={pending}
          style={{ marginBottom: 14 }}
          onClick={() => startTransition(async () => markAllNotificationsRead())}
        >
          Mark all read
        </button>
      )}
      <ul className="notification-full-list">
        {notifications.map((n) => {
          const body = (
            <>
              <div className="notification-full-item-top">
                <strong>{n.title}</strong>
                {!n.read_at && <span className="badge blue">new</span>}
              </div>
              {n.body && <p>{n.body}</p>}
              <small>
                {new Date(n.created_at).toLocaleString("en-JM", { dateStyle: "medium", timeStyle: "short", timeZone: "America/Jamaica" })}
              </small>
            </>
          );
          const onOpen = () => {
            if (!n.read_at) startTransition(async () => markNotificationRead(n.id));
          };
          return (
            <li key={n.id} className={n.read_at ? "" : "notification-full-item-unread"}>
              {n.url ? (
                <Link href={n.url} onClick={onOpen}>
                  {body}
                </Link>
              ) : (
                <button type="button" onClick={onOpen}>
                  {body}
                </button>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
