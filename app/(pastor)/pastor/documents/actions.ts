"use server";

import { revalidatePath } from "next/cache";
import { createClient, createServiceRoleClient } from "@/lib/supabase/server";
import { getOrganizationId, getUserPermissions } from "@/lib/auth/session";
import { generateDocumentPdf } from "@/lib/documents/pdf";
import { getLogoBuffer, getStaffAssetBuffer } from "@/lib/documents/assets";
import { queueOfficeEmail } from "@/lib/office/email";
import { officeContext, recordOfficeAction, roleMembers } from "@/lib/office/context";
import { officeAction } from "@/lib/office/action";
import { notifyUsers } from "@/lib/notifications";
import { fullName } from "@/lib/members/name";
import { cleanDesign } from "@/lib/documents/design";
import { SITE_URL } from "@/lib/org";
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
  const { db, org, user, profile, permissions } = await officeContext();
  if (!permissions.has("documents.certify") && !permissions.has("documents.sign_delegate")) throw new Error("Only the Pastor or Executive Assistant may apply the signature and church stamp.");
  const { data: request } = await db.from("document_requests").select("*").eq("organization_id",org).eq("id",requestId).maybeSingle();
  if (!request?.prepared_body || request.status !== "pending_pastor") throw new Error("Prepare the document and submit it for certification first.");
  const [{data:recipient},{data:authority},pastors,{data:preparerProfile}] = await Promise.all([
   db.from("profiles").select("id,first_name,last_name,email").eq("organization_id",org).eq("id",request.requester_profile_id ?? "").maybeSingle(),
   db.from("integration_settings").select("value").eq("key",`document_authority:${org}`).maybeSingle(),
   roleMembers(org,["pastor"]),
   request.prepared_by ? db.from("profiles").select("auth_user_id,first_name,last_name,signature_path").eq("organization_id",org).eq("auth_user_id",request.prepared_by).maybeSingle() : Promise.resolve({data:null}),
  ]);
  if (!recipient?.email) throw new Error("The recipient needs an email address so the PDF can be delivered.");
  // Printed on the certificate itself ("This certificate is presented to
  // ___") and used as the pastor's own signature name below — a document
  // bearing the church stamp and the pastor's signature must not go out
  // with a blank or placeholder name in either spot, so this is checked
  // and refused here rather than papered over with a generic fallback the
  // way an ordinary email greeting can be.
  const recipientName = fullName(recipient);
  if (!recipientName) throw new Error("This member has no name on file. Add their first and last name in People before certifying this document.");
  const assetConfig = authority?.value as { signature_path?:string; stamp_path?:string; signer_name?:string } | undefined;
  const signerId = pastors.find(p=>p.auth_user_id===user.id)?.id ?? pastors[0]?.id;
  const {data:signerProfile} = signerId ? await db.from("profiles").select("auth_user_id,signature_path,stamp_path,first_name,last_name").eq("id",signerId).maybeSingle() : {data:null};

  // A signature line for whoever actually typed up the letter, distinct
  // from the pastor's own "Certified by" signature below it — but only
  // when they're different people. The pastor preparing and certifying
  // his own letter doesn't need his own signature printed on it twice.
  let preparer: { name: string; title?: string; signatureImage?: Buffer | null } | undefined;
  if (preparerProfile?.auth_user_id && preparerProfile.auth_user_id !== signerProfile?.auth_user_id) {
    const preparerName = fullName(preparerProfile);
    if (preparerName) {
      const { data: preparerRole } = await db.from("user_roles").select("roles(name)").eq("organization_id", org).eq("user_id", preparerProfile.auth_user_id).limit(1).maybeSingle();
      preparer = {
        name: preparerName,
        title: (preparerRole?.roles as unknown as { name: string } | null)?.name,
        signatureImage: await getStaffAssetBuffer(preparerProfile.signature_path),
      };
    }
  }

  const [logo,signatureImage,stampImage] = await Promise.all([getLogoBuffer(),getStaffAssetBuffer(signerProfile?.signature_path || assetConfig?.signature_path || null),getStaffAssetBuffer(signerProfile?.stamp_path || assetConfig?.stamp_path || null)]);
  if(!signatureImage || !stampImage) throw new Error("The authorized Pastor signature and church stamp must both be configured.");
  const snapshot = (request.template_snapshot ?? {}) as {layout?:string;design?:unknown;email_template_id?:string};
  const design=cleanDesign(snapshot.design);
  const signerName=assetConfig?.signer_name || design.signer_name || fullName(signerProfile) || "Pastor";
  const {data:numbered,error:lockError}=await db.from("document_requests").update({status:"stamped",certified_by:user.id,certified_at:new Date().toISOString(),signer_profile_id:signerId ?? null}).eq("organization_id",org).eq("id",requestId).eq("status","pending_pastor").select("document_number").maybeSingle();
  if(lockError || !numbered?.document_number) throw new Error("This document is already being certified. Refresh before trying again.");
  const path=`documents/${requestId}/${numbered.document_number}.pdf`;
  try {
   const pdf=await generateDocumentPdf({documentNumber:numbered.document_number,title:request.title,bodyParagraphs:request.prepared_body.split(/\n\s*\n/).filter(Boolean),recipientName,issuedDate:new Date().toLocaleDateString("en-JM",{dateStyle:"long",timeZone:"America/Jamaica"}),logoImage:logo,layout:snapshot.layout,design,signer:{name:signerName,title:"Pastor, New Testament Church of God, Bull Bay",signatureImage,stampImage},preparer});
   const {error:uploadError}=await db.storage.from("member-resources").upload(path,pdf,{contentType:"application/pdf",upsert:true});if(uploadError)throw new Error("The PDF could not be saved.");
   await recordOfficeAction(org,user.id,"document.signature_stamp_applied","document_requests",requestId,{signer_name:signerName,document_number:numbered.document_number,authority:permissions.has("documents.sign_delegate")?"executive_delegation":"pastor_approval"});
   await notifyUsers(org,pastors.flatMap(p=>p.auth_user_id && p.auth_user_id!==user.id?[p.auth_user_id]:[]),{title:"Your signature and the church stamp were used",body:`${profile.first_name ?? ""} ${profile.last_name ?? ""} certified ${request.title} (${numbered.document_number}).`,url:`/pastor/documents?request=${requestId}`,type:"document_signature"});
   const {error:finishError}=await db.from("document_requests").update({status:"completed",pdf_path:path}).eq("id",requestId).eq("status","stamped");if(finishError)throw finishError;
  } catch(error) {
   await db.from("document_requests").update({status:"pending_pastor",certified_by:null,certified_at:null,pdf_path:null}).eq("id",requestId).eq("status","stamped");throw error;
  }
  const result=await queueOfficeEmail({org,recipient:recipient.email,template:snapshot.email_template_id || (snapshot.layout==="certificate"?"certificate-ready":"document-ready"),fields:{recipient_name:recipientName,document_title:request.title,certificate_title:request.title,document_number:numbered.document_number,action_url:`${SITE_URL}/member/documents`},attachmentPath:path,attachmentName:`${numbered.document_number}.pdf`,dedupeKey:`document-${requestId}`,actor:user.id});
  return result.sent?`Certified as ${numbered.document_number}. The PDF was emailed to the recipient.`:`Certified as ${numbered.document_number}. PDF email is queued for retry; check Email delivery.`;
 });
}
