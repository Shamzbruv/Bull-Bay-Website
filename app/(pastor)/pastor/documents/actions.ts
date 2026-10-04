"use server";

import { revalidatePath } from "next/cache";
import { createClient, createServiceRoleClient } from "@/lib/supabase/server";
import { getOrganizationId, getUserPermissions, getUserRoleCodes } from "@/lib/auth/session";
import { certifierName, certifyPreparedDocument } from "@/lib/documents/certify";
import { officeContext, recordOfficeAction, roleMembers } from "@/lib/office/context";
import { notifyUsers } from "@/lib/notifications";
import { officeAction } from "@/lib/office/action";
import type { ActionState } from "@/app/(public)/actions";

export async function uploadSignatureAsset(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const organizationId = await getOrganizationId();
  const permissions = organizationId ? await getUserPermissions(organizationId) : new Set<string>();
  // documents.certify (Pastor) manages the church stamp and the signature
  // that certifies a document. documents.manage (also the Executive
  // Assistant and Admin Assistant, who prepare documents but don't
  // certify them) can add their own signature only — the church stamp is
  // the certifying authority's mark, not something whoever typed the
  // letter should be able to attach to it themselves.
  const canUploadSignature = permissions.has("documents.certify") || permissions.has("documents.manage");
  if (!organizationId || !canUploadSignature) {
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
    if (!permissions.has("documents.certify")) {
      return { status: "error", message: "Only the Pastor manages the church stamp." };
    }
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
  revalidatePath("/admin/documents");
  return {
    status: "success",
    message: stampPath
      ? "Saved. Your signature/stamp will now appear on certified documents."
      : "Saved. Your signature will now appear on documents you prepare.",
  };
}

export async function certifyDocument(requestId: string): Promise<ActionState> {
  return officeAction(async () => {
    const { org, user, profile, permissions } = await officeContext();
    return certifyPreparedDocument({ org, requestId, actor: { userId: user.id, name: await certifierName(org, user.id, profile), permissions } });
  });
}

/** Someone in the office signing for the Pastor because it can't wait. */
export async function certifyDocumentUrgently(requestId: string, reason: string): Promise<ActionState> {
  return officeAction(async () => {
    const { org, user, profile, permissions } = await officeContext("documents.urgent_sign");
    const urgentReason = reason.trim().slice(0, 1000);
    if (!urgentReason) throw new Error("Say why this can't wait for the Pastor. He sees your reason.");
    return certifyPreparedDocument({ org, requestId, actor: { userId: user.id, name: await certifierName(org, user.id, profile), permissions }, urgentReason });
  });
}

/**
 * The super administrator adding the Pastor's signature and the church
 * stamp for him, from scans he handed over, so documents can be certified
 * without him doing the upload himself. They go on his own profile, exactly
 * as if he had uploaded them (he can replace them on his Documents page),
 * the audit log records who did it, and he is told.
 */
export async function uploadPastorSigningAssets(_prev: ActionState, formData: FormData): Promise<ActionState> {
  return officeAction(async () => {
    const { org, user, profile } = await officeContext();
    if (!(await getUserRoleCodes(org)).has("super_admin")) throw new Error("Only the super administrator can add the Pastor's signature for him.");
    const pastor = (await roleMembers(org, ["pastor"]))[0];
    if (!pastor) throw new Error("Nobody has the Pastor role yet. Give the Pastor his role first.");

    const picked: { field: "signature" | "stamp"; file: File; ext: string }[] = [];
    for (const field of ["signature", "stamp"] as const) {
      const file = formData.get(field);
      if (!(file instanceof File) || file.size === 0) continue;
      const ext = file.type === "image/png" ? "png" : file.type === "image/jpeg" ? "jpg" : null;
      const label = field === "signature" ? "Signature" : "Stamp";
      if (!ext) throw new Error(`${label}: use a PNG or JPEG image.`);
      if (file.size > 2 * 1024 * 1024) throw new Error(`${label}: keep each image under 2 MB.`);
      picked.push({ field, file, ext });
    }
    if (!picked.length) throw new Error("Choose the signature, the stamp, or both.");

    const admin = createServiceRoleClient();
    const update: { signature_path?: string; stamp_path?: string } = {};
    for (const { field, file, ext } of picked) {
      const path = `${field === "signature" ? "signatures" : "stamps"}/${pastor.id}-${Date.now()}.${ext}`;
      const { error } = await admin.storage.from("staff-assets").upload(path, Buffer.from(await file.arrayBuffer()), { contentType: file.type, upsert: true });
      if (error) throw new Error(`Couldn't upload the ${field} image.`);
      update[field === "signature" ? "signature_path" : "stamp_path"] = path;
    }
    const { error: profileError } = await admin.from("profiles").update(update).eq("organization_id", org).eq("id", pastor.id);
    if (profileError) throw new Error("The images uploaded, but the Pastor's profile could not be updated.");

    const what = picked.length === 2 ? "your signature and the church stamp" : picked[0]!.field === "signature" ? "your signature" : "the church stamp";
    await recordOfficeAction(org, user.id, "document.pastor_signing_assets_uploaded", "profiles", pastor.id, {
      signature: update.signature_path ? "uploaded" : "unchanged",
      stamp: update.stamp_path ? "uploaded" : "unchanged",
    });
    if (pastor.auth_user_id) {
      await notifyUsers(org, [pastor.auth_user_id], {
        title: picked.length === 2 ? "Your signature and the church stamp were added" : `${what[0]!.toUpperCase()}${what.slice(1)} was added`,
        body: `${await certifierName(org, user.id, profile)} uploaded ${what} for you, so documents can be certified. You can replace them on your Documents page.`,
        url: "/pastor/documents",
        type: "document_signature",
      });
    }
    revalidatePath("/pastor/documents");
    revalidatePath("/admin/documents");
    return `Saved to the Pastor's profile. ${picked.length === 2 ? "His signature and the church stamp" : what === "your signature" ? "His signature" : "The church stamp"} will be used when documents are certified, and he has been told.`;
  });
}
