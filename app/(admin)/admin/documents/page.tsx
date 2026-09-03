import type { Metadata } from "next";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getOrganizationId, getUserPermissions } from "@/lib/auth/session";
import { AccessDenied } from "@/components/access-denied";
import { TemplateForm } from "./template-form";
import { ClaimButton, DenyButton } from "./request-actions";

export const metadata: Metadata = { title: "Documents" };

export default async function AdminDocumentsPage() {
  const organizationId = await getOrganizationId();
  const permissions = await getUserPermissions(organizationId ?? "");
  if (!permissions.has("documents.manage")) return <AccessDenied />;

  const supabase = await createClient();
  const [{ data: templates }, { data: requests }] = await Promise.all([
    supabase.from("document_templates").select("*").order("name"),
    supabase
      .from("document_requests")
      .select("id, title, purpose, status, created_at, profiles:requester_profile_id(first_name, last_name)")
      .in("status", ["submitted", "in_review", "prepared"])
      .order("created_at", { ascending: true }),
  ]);

  return (
    <>
      <div className="dashboard-header">
        <div>
          <h1>Documents</h1>
          <p>Templates the office uses, and requests waiting to be prepared for the pastor.</p>
        </div>
      </div>

      <div className="panel">
        <h2>New template</h2>
        <TemplateForm />
      </div>

      <div className="panel">
        <h2>Existing templates</h2>
        {templates?.map((t) => (
          <div key={t.id} style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: "1px solid var(--color-border)" }}>
            <span>
              {t.name} {t.category && <span className="badge gray">{t.category}</span>}
            </span>
            <span className={`badge ${t.is_active ? "blue" : "gray"}`}>{t.is_active ? "active" : "inactive"}</span>
          </div>
        ))}
        {(!templates || templates.length === 0) && <p className="panel-empty">No templates yet.</p>}
      </div>

      <div className="panel">
        <h2>Requests to prepare</h2>
        {(!requests || requests.length === 0) && <p className="panel-empty">Nothing waiting right now.</p>}
        {requests?.map((r) => {
          const requester = r.profiles as unknown as { first_name: string | null; last_name: string | null } | null;
          return (
            <div key={r.id} style={{ padding: "12px 0", borderBottom: "1px solid var(--color-border)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, flexWrap: "wrap" }}>
                <div>
                  <b>{r.title}</b> — {requester?.first_name} {requester?.last_name}
                  <p style={{ margin: "4px 0 0", fontSize: ".85rem", color: "var(--color-muted-2)" }}>{r.purpose}</p>
                </div>
                <span className="badge gray">{r.status.replace("_", " ")}</span>
              </div>
              <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
                {r.status === "submitted" && <ClaimButton requestId={r.id} />}
                <Link className="secondary-button compact" href={`/admin/documents/${r.id}`}>
                  {r.status === "submitted" ? "Review & prepare" : "Continue preparing"}
                </Link>
                <DenyButton requestId={r.id} />
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}
