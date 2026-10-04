import { createServiceRoleClient } from "@/lib/supabase/server";
import { OfficeActionForm } from "@/components/office-action-form";
import { syncCalendarNow } from "@/app/(member)/member/calendar/actions";
import { SyncActivity } from "./sync-activity";

/**
 * Where this calendar stands with Google: which account it is synced with,
 * when it was last checked, anything that went wrong, and a button to sync
 * right now. Render it only where the viewer may see this calendar's
 * connections (the calendar owner and the staff who manage it).
 */
export async function GoogleSyncStatus({ profileId }: { profileId: string }) {
  const { data: connections } = await createServiceRoleClient()
    .from("calendar_connections")
    .select("id, google_email, last_synced_at, last_error")
    .eq("calendar_profile_id", profileId)
    .order("created_at");
  if (!connections?.length) return null;

  return (
    <>
      {connections.map((c) => (
        <div className="panel" key={c.id}>
          <div className="panel-heading">
            <div>
              <p className="section-kicker">Google Calendar</p>
              <h2>Two-way sync with {c.google_email}</h2>
            </div>
            <span className={`badge ${c.last_error ? "gold" : "blue"}`}>{c.last_error ? "needs attention" : "in sync"}</span>
          </div>
          <p className="form-note">
            Add, change or delete an entry here, or in the church calendar this created in Google Calendar, and the other side follows within about a
            minute. Weekly working hours are set here only.{" "}
            {c.last_synced_at ? `Last checked ${new Date(c.last_synced_at).toLocaleString("en-JM", { timeZone: "America/Jamaica", timeStyle: "short", dateStyle: "medium" })}.` : "Not checked yet."}
          </p>
          {c.last_error && <p role="alert">{c.last_error}</p>}
          <OfficeActionForm action={syncCalendarNow} label="Sync now">
            <input type="hidden" name="id" value={c.id} />
          </OfficeActionForm>
          <SyncActivity connectionId={c.id} />
        </div>
      ))}
    </>
  );
}
