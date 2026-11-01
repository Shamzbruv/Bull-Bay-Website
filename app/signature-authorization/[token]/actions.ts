"use server";
import { officeAction } from "@/lib/office/action";
import { pastorSignatureInvitation, PASTOR_SIGNATURE_CONSENT } from "@/lib/documents/pastor-signatures";
import { tokenHash } from "@/lib/documents/officiant";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { notifyUsers } from "@/lib/notifications";
import type { ActionState } from "@/app/(public)/actions";
export async function authorizePastorSignature(token: string, _: ActionState, form: FormData): Promise<ActionState> {
  return officeAction(async () => {
    const invite = await pastorSignatureInvitation(token);
    if (!invite || invite.accepted_at) throw new Error("This invitation has expired, been revoked, or already been completed. Please contact the church office.");
    const name = String(form.get("name") ?? "").trim();
    if (name.length < 2 || name.length > 200) throw new Error("Enter your full name (up to 200 characters).");
    if (form.get("consent") !== "on") throw new Error("Read and acknowledge the signature authorization before submitting.");
    const signature = String(form.get("signature") ?? "");
    if (!/^data:image\/png;base64,[A-Za-z0-9+/=]+$/.test(signature) || signature.length > 400000) throw new Error("Draw your signature using your mouse or finger.");
    const bytes = Buffer.from(signature.split(",")[1]!, "base64");
    if (bytes.length < 150 || bytes.subarray(0, 8).toString("hex") !== "89504e470d0a1a0a") throw new Error("A valid drawn signature is required.");
    const db = createServiceRoleClient();
    const { data, error } = await db.from("pastor_signature_authorizations").update({ name, signature_png: signature, consent_text: PASTOR_SIGNATURE_CONSENT, accepted_at: new Date().toISOString() }).eq("id", invite.id).eq("token_hash", tokenHash(token)).is("accepted_at", null).is("revoked_at", null).gt("expires_at", new Date().toISOString()).select("id,organization_id,invited_by").maybeSingle();
    if (error || !data) throw new Error("This invitation changed or was already completed. Contact the church office for a new invitation.");
    await notifyUsers(data.organization_id, [data.invited_by], { title: "Pastor signature authorized", body: `${name} added their signature and authorized reuse on church documents.`, url: "/admin/documents/pastor-signatures", type: "document" }).catch(() => {});
    return "Thank you. Your name, signature and authorization have been saved. The church office can now select your signature for church documents. Contact the office whenever you want to withdraw authorization.";
  });
}
