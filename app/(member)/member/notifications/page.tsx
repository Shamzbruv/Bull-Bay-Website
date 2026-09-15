import { PushSettings } from "./push-settings";
import type { Metadata } from "next";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/auth/session";
import { getMyNotifications } from "@/lib/notifications";
import { NotificationsForm } from "./notifications-form";
import { NotificationList } from "./notification-list";

export const metadata: Metadata = { title: "Notifications" };

export default async function NotificationsPage() {
  const profile = await getCurrentProfile();
  const supabase = await createClient();
  const [{ data: prefs }, { notifications, unreadCount }] = await Promise.all([
    supabase.from("notification_preferences").select("*").eq("profile_id", profile?.id ?? "").maybeSingle(),
    getMyNotifications(50),
  ]);

  return (
    <>
      <PushSettings />
      <div className="dashboard-header">
        <div>
          <h1>Notifications</h1>
          <p>Everything the church platform has told you about — role changes, updates, and more.</p>
        </div>
      </div>

      <div className="panel">
        <h2>
          Recent {unreadCount > 0 && <span className="badge blue">{unreadCount} unread</span>}
        </h2>
        {notifications.length === 0 ? (
          <p className="panel-empty">Nothing yet — you&apos;ll see updates here as they happen.</p>
        ) : (
          <NotificationList notifications={notifications} />
        )}
      </div>

      <div className="panel">
        <h2>Preferences</h2>
        <p className="form-note">This only controls the emails/texts below — items in Recent above always show up here regardless.</p>
        <NotificationsForm emailEnabled={prefs?.email_enabled ?? true} smsEnabled={prefs?.sms_enabled ?? false} />
      </div>

      <p className="form-note">
        Looking for the bell instead? It&apos;s at the top of every page and shows the same list. <Link href="/member">Back to dashboard</Link>
      </p>
    </>
  );
}
