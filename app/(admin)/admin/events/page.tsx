import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { getOrganizationId, getUserPermissions } from "@/lib/auth/session";
import { AccessDenied } from "@/components/access-denied";
import { DeleteButton } from "@/components/delete-button";
import { deleteEvent } from "@/app/(admin)/admin/actions";
import { EventForm } from "./event-form";

export const metadata: Metadata = { title: "Events" };

export default async function AdminEventsPage() {
  const organizationId = await getOrganizationId();
  const permissions = await getUserPermissions(organizationId ?? "");
  if (!permissions.has("events.manage")) return <AccessDenied />;

  const supabase = await createClient();
  const { data: events } = await supabase
    .from("events")
    .select("id, title, category, description, location_name, starts_at, status, visibility, event_registrations(id)")
    .eq("organization_id", organizationId ?? "")
    .order("starts_at", { ascending: false })
    .limit(100);

  return (
    <>
      <div className="dashboard-header">
        <div>
          <h1>Events</h1>
          <p>Create and manage church events and registrations.</p>
        </div>
      </div>
      <div className="panel">
        <details className="dashboard-disclosure">
          <summary>+ Create an event</summary>
          <EventForm />
        </details>
      </div>
      <div className="panel">
        <h2>All events</h2>
        <div className="data-table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Title</th>
                <th>Starts</th>
                <th>Status</th>
                <th>Registrations</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {events?.map((e) => (
                <tr key={e.id}>
                  <td>
                    <details className="table-editor">
                      <summary>{e.title}</summary>
                      <EventForm event={e} />
                    </details>
                  </td>
                  <td>{new Date(e.starts_at).toLocaleString("en-JM", { dateStyle: "medium", timeStyle: "short", timeZone: "America/Jamaica" })}</td>
                  <td>
                    <span className={`badge ${e.status === "published" ? "" : "gray"}`}>{e.status}</span>
                  </td>
                  <td>{e.event_registrations?.length ?? 0}</td>
                  <td>
                    <DeleteButton
                      action={deleteEvent}
                      id={e.id}
                      confirmText={`Delete "${e.title}" permanently? This also removes its registrations.`}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {(!events || events.length === 0) && <p className="panel-empty">No events yet.</p>}
      </div>
    </>
  );
}
