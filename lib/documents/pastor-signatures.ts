import { randomBytes } from "node:crypto";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { recordOfficeAction } from "@/lib/office/context";
import { queueOfficeEmail } from "@/lib/office/email";
import { signingBinding, tokenHash } from "@/lib/documents/officiant";
import { SITE_URL } from "@/lib/org";

export const PASTOR_SIGNATURE_CONSENT = "I confirm that this is my name and signature. I authorize authorized staff of New Testament Church of God, Bull Bay to store and apply my signature to certificates, letters, forms, and other church documents and records generated through this system for church purposes. This authorization remains in effect until revoked. I understand that I do not need to sign each document separately, that each use is recorded, and that I can ask the church office to withdraw this authorization at any time. Withdrawal stops future use and does not change documents already issued.";
export async function availablePastorSignatures(org: string) {
  const { data, error } = await createServiceRoleClient().from("pastor_signature_authorizations").select("id,name,email").eq("organization_id", org).is("revoked_at", null).not("accepted_at", "is", null).order("name");
  if (error) throw error;
  return data ?? [];
}
export async function savedPastorSignature(org: string, id: string) {
  if (!/^[a-f0-9-]{36}$/i.test(id)) throw new Error("Choose an authorized pastor signature.");
  const { data, error } = await createServiceRoleClient().from("pastor_signature_authorizations").select("*").eq("organization_id", org).eq("id", id).is("revoked_at", null).not("accepted_at", "is", null).maybeSingle();
  if (error || !data?.name || !data.signature_png || !data.consent_text) throw new Error("That signature is no longer authorized. Choose another pastor or send an invitation.");
  return { ...data, name: data.name, signature_png: data.signature_png, consent_text: data.consent_text };
}
export async function applySavedPastorSignature(org: string, requestId: string, actor: string, authorizationId: string) {
  const db = createServiceRoleClient();
  const signature = await savedPastorSignature(org, authorizationId);
  const { data: request, error: requestError } = await db.from("document_requests").select("*").eq("organization_id", org).eq("id", requestId).eq("status", "pending_pastor").single();
  if (requestError || !request) throw new Error("Prepare the document before choosing a signature.");
  const { error } = await db.from("document_officiants").upsert({ request_id: requestId, organization_id: org, authorization_id: signature.id, name: signature.name!, email: signature.email, token_hash: tokenHash(randomBytes(32).toString("hex")), binding: signingBinding(request), expires_at: new Date(Date.now() + 86400000).toISOString(), requested_by: actor, requested_at: new Date().toISOString(), signed_at: signature.accepted_at, signature_png: signature.signature_png, acknowledgement: signature.consent_text });
  if (error) throw new Error("That signature could not be selected. Refresh and choose an active authorization.");
  await recordOfficeAction(org, actor, "document.saved_pastor_signature_selected", "document_requests", requestId, { authorization_id: signature.id, signer_name: signature.name! });
  return "Authorized pastor signature selected. The document is ready for office certification; no new signing email is needed.";
}
export async function pastorSignatureInvitation(token: string) {
  if (!/^[a-f0-9]{64}$/.test(token)) return null;
  const { data, error } = await createServiceRoleClient().from("pastor_signature_authorizations").select("id,email,accepted_at,expires_at,revoked_at").eq("token_hash", tokenHash(token)).maybeSingle();
  if (error) throw error;
  if (!data || data.revoked_at || Date.parse(data.expires_at) <= Date.now()) return null;
  return data;
}
export async function emailPastorSignatureInvitation(org: string, actor: string, email: string, id?: string) {
  const db = createServiceRoleClient();
  const token = randomBytes(32).toString("hex");
  const values = { token_hash: tokenHash(token), expires_at: new Date(Date.now() + 7 * 86400000).toISOString() };
  let inviteId: string;
  if (id) {
    const { data, error } = await db.from("pastor_signature_authorizations").update(values).eq("id", id).eq("organization_id", org).is("accepted_at", null).is("revoked_at", null).select("id,email").single();
    if (error || !data) throw new Error("Only a pending invitation can be resent.");
    inviteId = data.id; email = data.email;
  } else {
    email = email.trim().toLowerCase();
    if (email.length > 320 || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) throw new Error("Enter a valid pastor email address.");
    const { data, error } = await db.from("pastor_signature_authorizations").insert({ ...values, organization_id: org, email, invited_by: actor }).select("id").single();
    if (error || !data) throw new Error("This pastor already has an active signature or pending invitation. Use Resend, or revoke it before inviting them again.");
    inviteId = data.id;
  }
  await recordOfficeAction(org, actor, "pastor_signature.invited", "pastor_signature_authorizations", inviteId);
  const delivery = await queueOfficeEmail({ org, actor, recipient: email, template: "staff-notification", fields: { heading: "Please add your pastor signature", intro: "Dear Pastor, the Bull Bay church office invites you to add your name and signature for reuse on church documents.", details: "Please review the authorization, enter your full name, and sign using a mouse or finger. You do not need an account. This private invitation expires in seven days; please do not forward it.", action_url: `${SITE_URL}/signature-authorization/${token}` }, dedupeKey: `pastor-signature-${inviteId}-${tokenHash(token)}` });
  return delivery.sent ? "Invitation emailed. The pastor can enter their name, sign, and authorize reuse." : "Invitation saved. The email is queued for retry; check Email delivery.";
}
