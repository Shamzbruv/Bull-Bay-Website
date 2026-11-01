"use server";
import { officeContext, recordOfficeAction } from "@/lib/office/context";
import { officeAction } from "@/lib/office/action";
import { emailPastorSignatureInvitation } from "@/lib/documents/pastor-signatures";
import type { ActionState } from "@/app/(public)/actions";
export async function invitePastor(_: ActionState, form: FormData): Promise<ActionState> {
  return officeAction(async () => { const { org, user } = await officeContext("documents.manage"); return emailPastorSignatureInvitation(org, user.id, String(form.get("email") ?? "")); });
}
export async function resendInvitation(id: string): Promise<ActionState> {
  return officeAction(async () => { const { org, user } = await officeContext("documents.manage"); return emailPastorSignatureInvitation(org, user.id, "", id); });
}
export async function revokeSignature(id: string): Promise<ActionState> {
  return officeAction(async () => {
    const { db, org, user } = await officeContext("documents.manage");
    const { data, error } = await db.from("pastor_signature_authorizations").update({ revoked_at: new Date().toISOString(), revoked_by: user.id }).eq("organization_id", org).eq("id", id).is("revoked_at", null).select("id").maybeSingle();
    if (error || !data) throw new Error("This invitation or authorization has already changed. Refresh and try again.");
    await recordOfficeAction(org, user.id, "pastor_signature.revoked", "pastor_signature_authorizations", id);
    return "Revoked. This link and signature cannot be used for future documents. Issued documents keep their original signatures.";
  });
}
