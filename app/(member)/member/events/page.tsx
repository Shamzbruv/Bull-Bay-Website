import type { Metadata } from "next";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/auth/session";

export const metadata: Metadata = { title: "My Events" };

export default async function MyEventsPage() {
  const profile = await getCurrentProfile();
  const supabase = await createClient();
  const { data: registrations } = await supabase
    .from("event_registrations")
    .select("id, status, quantity, created_at, events(title, slug, starts_at)")
    .eq("profile_id", profile?.id ?? "")
    .order("created_at", { ascending: false });

  return (
    <>
      <div className="dashboard-header">
        <div>
          <h1>My Events</h1>
          <p>Everything you&apos;ve registered for.</p>
        </div>
      </div>
      <div className="panel">
        {(!registrations || registrations.length === 0) && <p className="panel-empty">No event registrations yet.</p>}
        <div className="data-table-wrap">
          {registrations && registrations.length > 0 && (
            <table className="data-table">
              <thead>
                <tr>
                  <th>Event</th>
                  <th>Date</th>
                  <th>Qty</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {registrations.map((r) => {
                  const event = r.events as unknown as { title: string; slug: string; starts_at: string } | null;
                  return (
                    <tr key={r.id}>
                      <td>{event && <Link href={`/events/${event.slug}`}>{event.title}</Link>}</td>
                      <td>{event && new Date(event.starts_at).toLocaleDateString("en-JM", { dateStyle: "medium", timeZone: "America/Jamaica" })}</td>
                      <td>{r.quantity}</td>
                      <td>
                        <span className="badge">{r.status}</span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </>
  );
}
