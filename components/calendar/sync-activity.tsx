import { createServiceRoleClient } from "@/lib/supabase/server";

const WHEN = { timeZone: "America/Jamaica", dateStyle: "medium", timeStyle: "short" } as const;
const MARK: Record<string, string> = { from_google: "↓", to_google: "↑", info: "•" };

/**
 * What the two-way sync has done for one Google connection, in plain
 * sentences, newest first — so nobody has to wonder where an entry came from
 * or why one changed. Who may see this connection is the caller's call: only
 * render it for the calendar's owner, whoever connected the account, or the
 * office staff who manage the calendar.
 */
export async function SyncActivity({ connectionId, limit = 12 }: { connectionId: string; limit?: number }) {
  const { data } = await createServiceRoleClient()
    .from("calendar_sync_log")
    .select("id, direction, action, detail, created_at")
    .eq("connection_id", connectionId)
    .order("id", { ascending: false })
    .limit(limit);

  return (
    <details className="sync-activity" open>
      <summary>Recent sync activity</summary>
      {!data?.length ? (
        <p className="form-note">Nothing has been synced yet. Changes appear here as they happen.</p>
      ) : (
        <ul>
          {data.map((entry) => (
            <li key={entry.id} className={entry.action === "error" ? "is-error" : undefined}>
              <span className="sync-activity-mark" aria-hidden="true">{entry.action === "error" ? "⚠" : MARK[entry.direction]}</span>
              <span>
                {entry.detail}
                <time dateTime={entry.created_at}>{new Date(entry.created_at).toLocaleString("en-JM", WHEN)}</time>
              </span>
            </li>
          ))}
        </ul>
      )}
      <p className="form-note">{"↓"} came from Google Calendar &middot; {"↑"} was sent to Google Calendar</p>
    </details>
  );
}
