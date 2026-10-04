import type { Metadata } from "next";
import Link from "next/link";
import { createClient, createServiceRoleClient } from "@/lib/supabase/server";
import { getOrganizationId, getUserPermissions } from "@/lib/auth/session";
import { AccessDenied } from "@/components/access-denied";
import { SignatureForm } from "./signature-form";
import { CertifyButton } from "./certify-button";
import { recipientSummary } from "@/lib/documents/delivery";
import { fullName } from "@/lib/members/name";
import { roleMembers } from "@/lib/office/context";
import { getWorkspaceAccess } from "@/lib/auth/workspace";
import { pastorSigningAssets } from "@/lib/documents/certify";
import { PastorAssetsForm } from "./pastor-assets-form";

export const metadata: Metadata = { title: "Documents to Certify" };

export default async function PastorDocumentsPage({ searchParams }: { searchParams: Promise<{ request?: string }> }) {
  const { request: requestId } = await searchParams;
  const organizationId = await getOrganizationId();
  const permissions = await getUserPermissions(organizationId ?? "");
  if (!permissions.has("documents.certify")) return <AccessDenied />;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Signed "on his behalf" means by anyone who isn't a pastor, whoever is
  // looking at this page.
  const pastorUserIds = (await roleMembers(organizationId!, ["pastor"])).flatMap((p) => (p.auth_user_id ? [p.auth_user_id] : []));
  const [{ data: profile, error: profileError }, { data: pending, error: pendingError }, { data: completed, error: completedError }, { data: onBehalf, error: onBehalfError }] = await Promise.all([
    supabase.from("profiles").select("signature_path, stamp_path").throwOnError().eq("auth_user_id", user!.id).maybeSingle(),
    supabase
      .from("document_requests")
      .select("id, title, purpose, prepared_body, created_at, requester_profile_id, recipient_name, recipient_email, profiles:requester_profile_id(first_name, last_name)").throwOnError()
      .eq("organization_id", organizationId!)
      .eq("status", "pending_pastor")
      .order("created_at", { ascending: true }),
    supabase
      .from("document_requests")
      .select("id, title, document_number, certified_at, requester_profile_id, recipient_name, recipient_email, profiles:requester_profile_id(first_name, last_name)").throwOnError()
      .eq("organization_id", organizationId!)
      .eq("status", "completed")
      .order("certified_at", { ascending: false })
      .limit(10),
    // Anything signed with his signature by someone else: the Executive
    // Assistant's delegated certifications and the office's urgent ones.
    supabase
      .from("document_requests")
      .select("id, title, document_number, certified_at, certified_by, urgent_reason, requester_profile_id, recipient_name, recipient_email, profiles:requester_profile_id(first_name, last_name)").throwOnError()
      .eq("organization_id", organizationId!)
      .eq("status", "completed")
      .not("certified_by", "is", null)
      .not("certified_by", "in", `(${(pastorUserIds.length ? pastorUserIds : ["00000000-0000-0000-0000-000000000000"]).join(",")})`)
      .order("certified_at", { ascending: false })
      .limit(20),
  ]);

  if (profileError || pendingError || completedError || onBehalfError) {
    throw new Error("Documents could not be loaded. Please retry.", { cause: profileError || pendingError || completedError || onBehalfError });
  }
  const signerIds = [...new Set((onBehalf ?? []).flatMap((r) => (r.certified_by ? [r.certified_by] : [])))];
  const { data: signers } = signerIds.length
    ? await createServiceRoleClient().from("profiles").select("auth_user_id, first_name, last_name").eq("organization_id", organizationId!).in("auth_user_id", signerIds)
    : { data: [] };
  const signerName = (id: string | null) => fullName(signers?.find((s) => s.auth_user_id === id)) || "Someone in the church office";
  const validRequestId = requestId && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(requestId);
  const { data: requested, error: requestedError } = validRequestId
    ? await supabase.from("document_requests").select("id,title,status,denial_reason,certified_by,urgent_reason").throwOnError()
        .eq("organization_id", organizationId!).eq("id", requestId).maybeSingle()
    : { data: null, error: null };
  if (requestedError) throw new Error("The linked document could not be loaded.", { cause: requestedError });

  const {data:authority} = await createServiceRoleClient().from("integration_settings").select("value").throwOnError().eq("key",`document_authority:${organizationId}`).maybeSingle();
  const assets = authority?.value as {signature_path?:string;stamp_path?:string} | undefined;
  // The Pastor certifies with his own signature; anyone else certifying
  // here (the super administrator) applies the Pastor's.
  const viewerIsPastor = pastorUserIds.includes(user!.id);
  const access = await getWorkspaceAccess(organizationId!);
  const pastorAssets = viewerIsPastor ? null : await pastorSigningAssets(organizationId!);
  const canCertify = viewerIsPastor
    ? Boolean((profile?.signature_path || assets?.signature_path) && (profile?.stamp_path || assets?.stamp_path))
    : Boolean(pastorAssets?.hasSignature && pastorAssets.hasStamp);

  return (
    <>
      <div className="dashboard-header">
        <div>
          <h1>Documents awaiting your certification</h1>
          <p>Review what the office has prepared, then sign and stamp it to release the finished PDF to the member.</p>
        </div>
      </div>

      {requestId && <div className="alert info" role="status">
        {!requested ? "The document linked from this alert is no longer available. Ask the office to check its record. An old alert does not mean a document is still awaiting signature."
          : requested.status === "pending_pastor" ? <a href={`#document-${requested.id}`}>Review {requested.title} below.</a>
          : requested.status === "completed" && requested.certified_by && !pastorUserIds.includes(requested.certified_by) ? <>{requested.title} was signed on your behalf{requested.urgent_reason ? `, urgently: ${requested.urgent_reason}` : "."} It&apos;s listed under Signed on your behalf below.</>
          : <>{requested.title}: {requested.status.replaceAll("_", " ")}. This document is no longer awaiting your signature.{requested.denial_reason && ` Reason: ${requested.denial_reason}`}</>}
      </div>}
      <nav className="office-toolbar"><Link className="secondary-button" href="/admin/documents">Document templates</Link><Link className="secondary-button" href="/admin/documents?type=certificates">Certificates</Link></nav>
      {viewerIsPastor ? (
        <div className="panel">
          <h2>Your signature &amp; stamp</h2>
          <SignatureForm hasSignature={Boolean(profile?.signature_path || assets?.signature_path)} hasStamp={Boolean(profile?.stamp_path || assets?.stamp_path)} />
        </div>
      ) : access.preview ? (
        <div className="panel">
          <h2>The Pastor&apos;s signature &amp; church stamp</h2>
          <p className="form-note">
            You&apos;re previewing a role, so nothing can be changed. Switch back to Super Administrator to add the
            Pastor&apos;s signature and the church stamp for him, here or on Documents.
          </p>
        </div>
      ) : pastorAssets?.pastor && access.superAdmin ? (
        <div className="panel">
          <h2>The Pastor&apos;s signature &amp; church stamp</h2>
          <PastorAssetsForm pastorName={pastorAssets.pastor.name} hasSignature={pastorAssets.hasSignature} hasStamp={pastorAssets.hasStamp} />
        </div>
      ) : null}

      <div className="panel">
        <h2>Waiting on your desk</h2>
        {(!pending || pending.length === 0) && <p className="panel-empty">Nothing is awaiting your signature right now. Earlier alerts can refer to documents that have since been completed, declined, or removed.</p>}
        {pending?.map((r) => {
          const requester = r.profiles as unknown as { first_name: string | null; last_name: string | null } | null;
          return (
            <div id={`document-${r.id}`} key={r.id} style={{ padding: "14px 0", borderBottom: "1px solid var(--color-border)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
                <div>
                  <b>{r.title}</b> — {recipientSummary(r, requester)}
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
                <a className="secondary-button compact" href={`/api/office/documents/${r.id}/preview`} target="_blank" rel="noreferrer">Preview PDF</a>
                <CertifyButton requestId={r.id} canCertify={canCertify} notReadyText={viewerIsPastor ? undefined : "The Pastor's signature and the church stamp need to be uploaded above before anything can be certified."} />
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
                {r.title} — {recipientSummary(r, requester)}
              </span>
              <span className="badge gray">{r.document_number}</span>
            </div>
          );
        })}
      </div>

      <div className="panel">
        <h2>Signed on your behalf</h2>
        <p className="form-note">
          Documents your signature and the church stamp went on without you certifying them yourself: the Executive
          Assistant&apos;s delegated approvals, and anything the office signed urgently because it couldn&apos;t wait.
          You were notified each time.
        </p>
        {(!onBehalf || onBehalf.length === 0) && <p className="panel-empty">None yet.</p>}
        {onBehalf?.map((r) => {
          const requester = r.profiles as unknown as { first_name: string | null; last_name: string | null } | null;
          return (
            <div key={r.id} style={{ padding: "10px 0", borderBottom: "1px solid var(--color-border)", fontSize: ".88rem" }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
                <span>
                  <b>{r.title}</b> — {recipientSummary(r, requester)}
                </span>
                <span>
                  {r.urgent_reason && <span className="badge red" style={{ marginRight: 6 }}>Urgent</span>}
                  <span className="badge gray">{r.document_number}</span>
                </span>
              </div>
              <p style={{ margin: "4px 0 0", color: "var(--color-muted-2)" }}>
                Signed by {signerName(r.certified_by)}
                {r.certified_at && <> on {new Date(r.certified_at).toLocaleString("en-JM", { dateStyle: "medium", timeStyle: "short", timeZone: "America/Jamaica" })}</>}
                {r.urgent_reason && <> · Reason: {r.urgent_reason}</>}
              </p>
              <a className="secondary-button compact" style={{ marginTop: 6 }} href={`/api/office/documents/${r.id}/preview`} target="_blank" rel="noreferrer">View PDF</a>
            </div>
          );
        })}
      </div>
    </>
  );
}
