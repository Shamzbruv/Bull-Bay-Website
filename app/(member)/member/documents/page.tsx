import type { Metadata } from "next";
import { createClient, createServiceRoleClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/auth/session";
import { RequestForm } from "./request-form";
import { DownloadButton } from "./download-button";

export const metadata: Metadata = { title: "Document Requests" };

const STATUS_LABELS: Record<string, string> = {
  submitted: "Submitted",
  in_review: "Being reviewed",
  prepared: "Being prepared",
  pending_pastor: "With the pastor",
  stamped: "Certified",
  completed: "Ready",
  denied: "Not approved",
};

export default async function MyDocumentsPage() {
  const profile = await getCurrentProfile();
  const supabase = await createClient();
  const admin = createServiceRoleClient();

  const [{ data: templates }, { data: requests }] = await Promise.all([
    // The service client is intentionally limited to the active catalogue
    // for this signed-in member's organization. This keeps the request form
    // usable while older deployed databases receive the same-org member RLS
    // policy from the hardening migration.
    admin
      .from("document_templates")
      .select("id, name, description")
      .eq("organization_id", profile?.organization_id ?? "")
      .eq("is_active", true)
      .order("name"),
    supabase
      .from("document_requests")
      .select("id, title, purpose, status, created_at, document_number")
      .eq("requester_profile_id", profile?.id ?? "")
      .order("created_at", { ascending: false }),
  ]);

  return (
    <>
      <div className="dashboard-header">
        <div>
          <h1>Document Requests</h1>
          <p>Request a letter or certificate from the pastor&apos;s office — prepared and certified for you.</p>
        </div>
      </div>

      <div className="panel">
        <h2>Request a document</h2>
        {templates && templates.length > 0 ? (
          <RequestForm templates={templates} />
        ) : (
          <p className="panel-empty">No document types are available to request yet.</p>
        )}
      </div>

      <div className="panel">
        <h2>My requests</h2>
        {(!requests || requests.length === 0) && <p className="panel-empty">No document requests yet.</p>}
        <div className="data-table-wrap">
          {requests && requests.length > 0 && (
            <table className="data-table">
              <thead>
                <tr>
                  <th>Document</th>
                  <th>Requested</th>
                  <th>Status</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {requests.map((r) => (
                  <tr key={r.id}>
                    <td>
                      {r.title}
                      {r.document_number && <div style={{ fontSize: ".7rem", color: "var(--color-muted)" }}>{r.document_number}</div>}
                    </td>
                    <td>{new Date(r.created_at).toLocaleDateString("en-JM", { dateStyle: "medium" })}</td>
                    <td>
                      <span className={`badge ${r.status === "completed" ? "blue" : r.status === "denied" ? "red" : "gray"}`}>
                        {STATUS_LABELS[r.status] ?? r.status}
                      </span>
                    </td>
                    <td>{r.status === "completed" && <DownloadButton requestId={r.id} />}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </>
  );
}
