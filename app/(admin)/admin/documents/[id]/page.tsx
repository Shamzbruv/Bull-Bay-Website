import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getOrganizationId, getUserPermissions } from "@/lib/auth/session";
import { AccessDenied } from "@/components/access-denied";
import { mergeTemplate } from "@/lib/documents/merge";
import { SITE_NAME } from "@/lib/org";
import { pastorSigningReady } from "@/lib/documents/certify";
import { PrepareForm } from "./prepare-form";

export const metadata: Metadata = { title: "Prepare Document" };

export default async function PrepareDocumentPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const organizationId = await getOrganizationId();
  const permissions = await getUserPermissions(organizationId ?? "");
  if (!permissions.has("documents.manage")) return <AccessDenied />;

  const supabase = await createClient();
  const { data: request } = await supabase
    .from("document_requests")
    .select("*, profiles:requester_profile_id(first_name, last_name, joined_at), document_templates(body)").throwOnError()
    .eq("id", id)
    .maybeSingle();
  if (!request) notFound();

  const requester = request.profiles as unknown as { first_name: string | null; last_name: string | null; joined_at: string | null } | null;
  const canUrgentSign = permissions.has("documents.urgent_sign");
  const signingReady = canUrgentSign && (await pastorSigningReady(organizationId!));
  const template = request.document_templates as unknown as { body: string } | null;

  const baseBody = request.prepared_body ?? template?.body ?? "";
  const mergedParagraphs = mergeTemplate(baseBody, {
    member_name: `${requester?.first_name ?? ""} ${requester?.last_name ?? ""}`.trim() || request.recipient_name || "[member name]",
    date_today: new Date().toLocaleDateString("en-JM", { dateStyle: "long" }),
    purpose: request.purpose ?? "",
    membership_since: requester?.joined_at ? new Date(requester.joined_at).toLocaleDateString("en-JM", { dateStyle: "long" }) : "[date]",
    church_name: SITE_NAME,
  });

  return (
    <>
      <div className="dashboard-header">
        <div>
          <h1>{request.title}</h1>
          <p>
            {requester ? <>Requested by {requester.first_name} {requester.last_name}</> : <>For {request.recipient_name}</>}
            {request.purpose && <> — &ldquo;{request.purpose}&rdquo;</>}
          </p>
          {request.recipient_email && (
            <p className="form-note">
              The finished PDF goes to {request.recipient_name} ({request.recipient_email}), who isn&apos;t in the members list.
            </p>
          )}
        </div>
      </div>

      <div className="panel">
        <h2>Prepare the document</h2>
        <p className="form-note">
          Merge fields have been filled in from the member&apos;s profile — review and edit before sending to the
          pastor.
        </p>
        <PrepareForm requestId={request.id} initialBody={mergedParagraphs.join("\n\n")} canUrgentSign={canUrgentSign} signingReady={signingReady} />
      </div>
    </>
  );
}
