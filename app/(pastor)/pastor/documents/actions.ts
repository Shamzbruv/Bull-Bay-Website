"use server";

import { revalidatePath } from "next/cache";
import { createClient, createServiceRoleClient } from "@/lib/supabase/server";
import { getOrganizationId, getUserPermissions } from "@/lib/auth/session";
import { generateDocumentPdf } from "@/lib/documents/pdf";
import { getLogoBuffer, getStaffAssetBuffer } from "@/lib/documents/assets";
import { sendMail } from "@/lib/email/resend";
import { renderDocumentReadyEmail } from "@/lib/email/templates";
import { SITE_URL } from "@/lib/org";
import type { ActionState } from "@/app/(public)/actions";

export async function uploadSignatureAsset(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const organizationId = await getOrganizationId();
  const permissions = organizationId ? await getUserPermissions(organizationId) : new Set<string>();
  if (!organizationId || !permissions.has("documents.certify")) {
    return { status: "error", message: "You don't have permission to manage certification assets." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { status: "error", message: "Please sign in again." };

  const { data: profile } = await supabase.from("profiles").select("id").eq("auth_user_id", user.id).maybeSingle();
  if (!profile) return { status: "error", message: "Profile not found." };

  const admin = createServiceRoleClient();
  let signaturePath: string | undefined;
  let stampPath: string | undefined;

  const imageExtension = (file: File) => {
    if (file.type === "image/png") return "png";
    if (file.type === "image/jpeg") return "jpg";
    return null;
  };

  const validateImage = (file: File) => {
    if (!imageExtension(file)) return "Use a PNG or JPEG image.";
    if (file.size > 2 * 1024 * 1024) return "Keep each image under 2 MB.";
    return null;
  };

  const signatureFile = formData.get("signature");
  if (signatureFile instanceof File && signatureFile.size > 0) {
    const validationError = validateImage(signatureFile);
    if (validationError) return { status: "error", message: `Signature: ${validationError}` };
    signaturePath = `signatures/${profile.id}-${Date.now()}.${imageExtension(signatureFile)}`;
    const buf = Buffer.from(await signatureFile.arrayBuffer());
    const { error } = await admin.storage.from("staff-assets").upload(signaturePath, buf, { contentType: signatureFile.type, upsert: true });
    if (error) return { status: "error", message: "Couldn't upload the signature image." };
  }

  const stampFile = formData.get("stamp");
  if (stampFile instanceof File && stampFile.size > 0) {
    const validationError = validateImage(stampFile);
    if (validationError) return { status: "error", message: `Stamp: ${validationError}` };
    stampPath = `stamps/${profile.id}-${Date.now()}.${imageExtension(stampFile)}`;
    const buf = Buffer.from(await stampFile.arrayBuffer());
    const { error } = await admin.storage.from("staff-assets").upload(stampPath, buf, { contentType: stampFile.type, upsert: true });
    if (error) return { status: "error", message: "Couldn't upload the stamp image." };
  }

  const update: { signature_path?: string; stamp_path?: string } = {};
  if (signaturePath) update.signature_path = signaturePath;
  if (stampPath) update.stamp_path = stampPath;
  if (Object.keys(update).length === 0) return { status: "error", message: "Choose at least one image to upload." };

  const { error: profileError } = await admin
    .from("profiles")
    .update(update)
    .eq("organization_id", organizationId)
    .eq("id", profile.id);
  if (profileError) return { status: "error", message: "The files uploaded, but the profile could not be updated." };
  revalidatePath("/pastor/documents");
  return { status: "success", message: "Saved. Your signature/stamp will now appear on certified documents." };
}

export async function certifyDocument(requestId: string): Promise<ActionState> {
  const organizationId = await getOrganizationId();
  const permissions = organizationId ? await getUserPermissions(organizationId) : new Set<string>();
  if (!permissions.has("documents.certify")) return { status: "error", message: "You don't have permission to certify documents." };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { status: "error", message: "Please sign in again." };

  const { data: signerProfile } = await supabase
    .from("profiles")
    .select("id, first_name, last_name, signature_path, stamp_path")
    .eq("auth_user_id", user.id)
    .maybeSingle();

  const { data: request } = await supabase
    .from("document_requests")
    .select("*, profiles:requester_profile_id(id, first_name, last_name, email)")
    .eq("organization_id", organizationId ?? "")
    .eq("id", requestId)
    .maybeSingle();

  if (!request || !request.prepared_body) return { status: "error", message: "This document isn't ready to certify." };

  const requester = request.profiles as unknown as { id: string; first_name: string | null; last_name: string | null; email: string | null } | null;
  const recipientName = `${requester?.first_name ?? ""} ${requester?.last_name ?? ""}`.trim() || "Member";

  const [logo, signatureImage, stampImage] = await Promise.all([
    getLogoBuffer(),
    getStaffAssetBuffer(signerProfile?.signature_path ?? null),
    getStaffAssetBuffer(signerProfile?.stamp_path ?? null),
  ]);

  if (!signatureImage || !stampImage) {
    return { status: "error", message: "Upload both the authorized signature and church stamp before certifying a document." };
  }

  const admin = createServiceRoleClient();
  const pdfPath = `documents/${requestId}.pdf`;

  // Move to the intermediate stamped state so the database assigns the
  // official number. Any PDF/render/upload failure below rolls this back to
  // pending_pastor, so a request is never left falsely marked complete.
  const { data: numbered, error: numberError } = await supabase
    .from("document_requests")
    .update({ status: "stamped", certified_by: user.id, certified_at: new Date().toISOString() })
    .eq("id", requestId)
    .select("document_number")
    .single();
  if (numberError || !numbered?.document_number) return { status: "error", message: "Couldn't finalize this document." };

  let pdfBuffer: Buffer;
  try {
    pdfBuffer = await generateDocumentPdf({
      documentNumber: numbered.document_number,
      title: request.title,
      bodyParagraphs: request.prepared_body.split(/\n\s*\n/).map((p: string) => p.trim()).filter(Boolean),
      recipientName,
      issuedDate: new Date().toLocaleDateString("en-JM", { dateStyle: "long" }),
      signer: {
        name: `${signerProfile?.first_name ?? ""} ${signerProfile?.last_name ?? ""}`.trim() || "Senior Pastor",
        title: "Senior Pastor, New Testament Church of God, Bull Bay",
        signatureImage,
        stampImage,
      },
      logoImage: logo,
    });
  } catch {
    await supabase
      .from("document_requests")
      .update({ status: "pending_pastor", certified_by: null, certified_at: null })
      .eq("id", requestId);
    return { status: "error", message: "The PDF could not be generated. The request remains on the pastor's desk." };
  }

  const { error: uploadError } = await admin.storage.from("member-resources").upload(pdfPath, pdfBuffer, {
    contentType: "application/pdf",
    upsert: true,
  });
  if (uploadError) {
    await supabase
      .from("document_requests")
      .update({ status: "pending_pastor", certified_by: null, certified_at: null })
      .eq("id", requestId);
    return { status: "error", message: "The PDF failed to save. The request remains on the pastor's desk." };
  }

  const { data: updated, error: updateError } = await supabase
    .from("document_requests")
    .update({ pdf_path: pdfPath, status: "completed" })
    .eq("id", requestId)
    .select("document_number")
    .single();

  if (updateError) {
    await admin.storage.from("member-resources").remove([pdfPath]);
    await supabase
      .from("document_requests")
      .update({ status: "pending_pastor", certified_by: null, certified_at: null, pdf_path: null })
      .eq("id", requestId);
    return { status: "error", message: "Couldn't finalize this document. The request remains on the pastor's desk." };
  }

  if (requester?.email) {
    await sendMail({
      to: requester.email,
      subject: `Your document is ready — ${request.title}`,
      html: renderDocumentReadyEmail({
        recipientName,
        documentTitle: request.title,
        actionUrl: `${SITE_URL}/member/documents`,
      }),
      attachments: [
        {
          filename: `${numbered.document_number}.pdf`,
          content: pdfBuffer,
          contentType: "application/pdf",
        },
      ],
    }).catch(() => {});
  }

  revalidatePath("/pastor/documents");
  revalidatePath("/member/documents");
  return { status: "success", message: `Certified as ${updated?.document_number ?? "document"}.` };
}
