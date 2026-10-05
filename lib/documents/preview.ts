import { getCurrentProfile, getUserPermissions } from "@/lib/auth/session";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { generateDocumentPdf } from "@/lib/documents/pdf";
import { getLogoBuffer } from "@/lib/documents/assets";
import { cleanDesign } from "@/lib/documents/design";
import { preparingSigner } from "@/lib/documents/certify";
import { roleMembers } from "@/lib/office/context";
import { fullName } from "@/lib/members/name";

// "Preview PDF": a document as it will look, before anything is saved or
// sent. Same layout, text, name and "prepared by" as the certified PDF
// (lib/documents/certify.ts), but marked DRAFT, with empty places for the
// Pastor's signature and the church stamp. Those, and the document number,
// are only ever added when it's certified, so a preview can never stand in
// for a real document.

/** Who may preview: whoever prepares documents or certifies them. */
export async function previewViewer(): Promise<{ org: string; authUserId: string } | Response> {
  const profile = await getCurrentProfile();
  if (!profile?.auth_user_id) return new Response("Please sign in again.", { status: 401 });
  const permissions = await getUserPermissions(profile.organization_id);
  if (!permissions.has("documents.manage") && !permissions.has("documents.certify")) return new Response("Your role can't preview documents.", { status: 403 });
  return { org: profile.organization_id, authUserId: profile.auth_user_id };
}

export async function draftDocumentPdf({
  org,
  title,
  body,
  recipientName,
  template,
  preparedBy,
}: {
  org: string;
  title: string;
  body: string;
  recipientName: string;
  /** The template's layout and design (a saved document's snapshot of it). */
  template: { layout?: string | null; design?: unknown } | null;
  /** Shown as having prepared it (an auth user id). */
  preparedBy: string | null;
}): Promise<Buffer> {
  const db = createServiceRoleClient();
  const [pastors, { data: authority }] = await Promise.all([
    roleMembers(org, ["pastor"]),
    db.from("integration_settings").select("value").eq("key", `document_authority:${org}`).maybeSingle(),
  ]);
  const pastor = pastors[0] ?? null;
  const design = cleanDesign(template?.design);
  // The name under the Pastor's signature line, as certifying prints it.
  const signerName = (authority?.value as { signer_name?: string } | undefined)?.signer_name || design.signer_name || fullName(pastor) || "Pastor";
  // The Pastor preparing his own letter isn't named twice, as when certified.
  const preparer = await preparingSigner(db, org, preparedBy, pastor?.auth_user_id);
  return generateDocumentPdf({
    title,
    documentNumber: "DRAFT",
    recipientName: recipientName || "(no name yet: it can't be certified without one)",
    bodyParagraphs: (body.trim() || "The document text hasn't been written yet.").split(/\n\s*\n/).filter(Boolean),
    issuedDate: new Date().toLocaleDateString("en-JM", { dateStyle: "long", timeZone: "America/Jamaica" }),
    logoImage: await getLogoBuffer(),
    draft: true,
    layout: template?.layout ?? undefined,
    design: { ...design, signer_name: signerName },
    preparer,
  });
}

export function pdfResponse(bytes: Buffer, filename: string): Response {
  return new Response(new Uint8Array(bytes), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${filename.replace(/[^A-Za-z0-9._-]+/g, "-")}"`,
      "Cache-Control": "private, no-store",
      "X-Robots-Tag": "noindex",
    },
  });
}
