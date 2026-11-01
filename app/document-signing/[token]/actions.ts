"use server";
import { officeAction } from "@/lib/office/action";
import { signingRequest, OFFICIANT_ACKNOWLEDGEMENT, tokenHash } from "@/lib/documents/officiant";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { notifyUsers } from "@/lib/notifications";
import type { ActionState } from "@/app/(public)/actions";
export async function acknowledgeDocument(token: string, _: ActionState, form: FormData): Promise<ActionState> {
  return officeAction(async () => {
    const current = await signingRequest(token);
    if (!current || current.signer.signed_at) throw new Error("This link has expired, been replaced, or already been signed. Ask the church office for help.");
    if (form.get("acknowledge") !== "on") throw new Error("Confirm that you officiated before signing.");
    const signature = String(form.get("signature") ?? "");
    if (!/^data:image\/png;base64,[A-Za-z0-9+/=]+$/.test(signature) || signature.length > 400000) throw new Error("Draw your signature again.");
    const bytes = Buffer.from(signature.split(",")[1]!, "base64");
    if (bytes.length < 150 || bytes.subarray(0,8).toString("hex") !== "89504e470d0a1a0a") throw new Error("A valid drawn signature is required.");
    const db = createServiceRoleClient();
    const { data, error } = await db.from("document_officiants").update({ signature_png: signature, signed_at: new Date().toISOString(), acknowledgement: OFFICIANT_ACKNOWLEDGEMENT }).eq("request_id", current.signer.request_id).eq("token_hash", tokenHash(token)).is("signed_at", null).gt("expires_at", new Date().toISOString()).select("request_id").maybeSingle();
    if (error || !data) throw new Error("The document changed or was already signed. Ask the office for a new link.");
    await notifyUsers(current.signer.organization_id, [current.signer.requested_by], { title: "Officiating pastor has signed", body: `${current.signer.name} acknowledged ${current.request.title}. It is ready for certification.`, url: `/admin/documents/${data.request_id}`, type: "document" }).catch(() => {});
    return "Thank you. Your acknowledgement and signature have been saved. The church office can now issue the certificate.";
  });
}
