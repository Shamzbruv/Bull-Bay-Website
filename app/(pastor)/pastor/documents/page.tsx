import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { getOrganizationId, getUserPermissions } from "@/lib/auth/session";
import { AccessDenied } from "@/components/access-denied";
import { SignatureForm } from "./signature-form";
import { CertifyButton } from "./certify-button";

export const metadata: Metadata = { title: "Documents to Certify" };

export default async function PastorDocumentsPage() {
  const organizationId = await getOrganizationId();
  const permissions = await getUserPermissions(organizationId ?? "");
  if (!permissions.has("documents.certify")) return <AccessDenied />;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [{ data: profile }, { data: pending }, { data: completed }] = await Promise.all([
    supabase.from("profiles").select("signature_path, stamp_path").eq("auth_user_id", user!.id).maybeSingle(),
    supabase
      .from("document_requests")
      .select("id, title, purpose, prepared_body, created_at, profiles:requester_profile_id(first_name, last_name)")
      .eq("status", "pending_pastor")
      .order("created_at", { ascending: true }),
    supabase
      .from("document_requests")
      .select("id, title, document_number, certified_at, profiles:requester_profile_id(first_name, last_name)")
      .eq("status", "completed")
      .order("certified_at", { ascending: false })
      .limit(10),
  ]);

  const canCertify = Boolean(profile?.signature_path);

  return (
    <>
      <div className="dashboard-header">
        <div>
          <h1>Documents awaiting your certification</h1>
          <p>Review what the office has prepared, then sign and stamp it to release the finished PDF to the member.</p>
        </div>
      </div>

      <div className="panel">
        <h2>Your signature &amp; stamp</h2>
        <SignatureForm hasSignature={Boolean(profile?.signature_path)} hasStamp={Boolean(profile?.stamp_path)} />
      </div>

      <div className="panel">
        <h2>Waiting on your desk</h2>
        {(!pending || pending.length === 0) && <p className="panel-empty">Nothing waiting right now.</p>}
        {pending?.map((r) => {
          const requester = r.profiles as unknown as { first_name: string | null; last_name: string | null } | null;
          return (
            <div key={r.id} style={{ padding: "14px 0", borderBottom: "1px solid var(--color-border)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
                <div>
                  <b>{r.title}</b> — {requester?.first_name} {requester?.last_name}
                  <p style={{ margin: "4px 0 0", fontSize: ".85rem", color: "var(--color-muted-2)" }}>{r.purpose}</p>
                </div>
              </div>
              <details style={{ marginTop: 8 }}>
                <summary style={{ cursor: "pointer", fontSize: ".82rem", color: "var(--color-blue-700)" }}>Preview prepared text</summary>
                <p style={{ whiteSpace: "pre-wrap", fontSize: ".85rem", marginTop: 8, background: "var(--color-surface-2)", padding: 12, borderRadius: 10 }}>
                  {r.prepared_body}
                </p>
              </details>
              <div style={{ marginTop: 10 }}>
                <CertifyButton requestId={r.id} canCertify={canCertify} />
              </div>
            </div>
          );
        })}
      </div>

      <div className="panel">
        <h2>Recently certified</h2>
        {(!completed || completed.length === 0) && <p className="panel-empty">Nothing certified yet.</p>}
        {completed?.map((r) => {
          const requester = r.profiles as unknown as { first_name: string | null; last_name: string | null } | null;
          return (
            <div key={r.id} style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: "1px solid var(--color-border)", fontSize: ".88rem" }}>
              <span>
                {r.title} — {requester?.first_name} {requester?.last_name}
              </span>
              <span className="badge gray">{r.document_number}</span>
            </div>
          );
        })}
      </div>
    </>
  );
}
