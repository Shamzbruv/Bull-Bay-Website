import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/auth/session";
import { NotificationsForm } from "./notifications-form";

export const metadata: Metadata = { title: "Notifications" };

export default async function NotificationsPage() {
  const profile = await getCurrentProfile();
  const supabase = await createClient();
  const { data: prefs } = await supabase
    .from("notification_preferences")
    .select("*")
    .eq("profile_id", profile?.id ?? "")
    .maybeSingle();

  return (
    <>
      <div className="dashboard-header">
        <div>
          <h1>Notifications</h1>
          <p>Choose how Bull Bay reaches you.</p>
        </div>
      </div>
      <NotificationsForm emailEnabled={prefs?.email_enabled ?? true} smsEnabled={prefs?.sms_enabled ?? false} />
    </>
  );
}
