import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getOrganizationId, getUserPermissions } from "@/lib/auth/session";
import { AccessDenied } from "@/components/access-denied";
import { mergeTemplate } from "@/lib/documents/merge";
import { SITE_NAME } from "@/lib/org";
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
    .select("*, profiles:requester_profile_id(first_name, last_name, joined_at), document_templates(body)")
    .eq("id", id)
    .maybeSingle();
  if (!request) notFound();

  const requester = request.profiles as unknown as { first_name: string | null; last_name: string | null; joined_at: string | null } | null;
  const template = request.document_templates as unknown as { body: string } | null;

  const baseBody = request.prepared_body ?? template?.body ?? "";
  const mergedParagraphs = mergeTemplate(baseBody, {
    member_name: `${requester?.first_name ?? ""} ${requester?.last_name ?? ""}`.trim() || "[member name]",
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
            Requested by {requester?.first_name} {requester?.last_name} — &ldquo;{request.purpose}&rdquo;
          </p>
        </div>
      </div>

      <div className="panel">
        <h2>Prepare the document</h2>
        <p className="form-note">
          Merge fields have been filled in from the member&apos;s profile — review and edit before sending to the
          pastor.
        </p>
        <PrepareForm requestId={request.id} initialBody={mergedParagraphs.join("\n\n")} />
      </div>
    </>
  );
}
