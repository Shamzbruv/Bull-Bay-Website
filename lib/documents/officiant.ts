import { createHash, randomBytes } from "node:crypto";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { queueOfficeEmail } from "@/lib/office/email";
import { recordOfficeAction } from "@/lib/office/context";
import { SITE_URL } from "@/lib/org";
import type { Json } from "@/lib/supabase/types";

export function tokenHash(token: string) { return createHash("sha256").update(token).digest("hex"); }
export function signingBinding(r: { prepared_body: string | null; title: string; details: Json; template_snapshot: Json; requester_profile_id: string | null; recipient_name: string | null; recipient_email: string | null }) {
  return { body: r.prepared_body, title: r.title, details: r.details, template: r.template_snapshot, member: r.requester_profile_id, recipient: r.recipient_name, email: r.recipient_email };
}
export function sameSigningBinding(a: unknown, b: unknown) { return JSON.stringify(canonical(a)) === JSON.stringify(canonical(b)); }
export async function readOfficiant(org: string, form: FormData) {
  const db = createServiceRoleClient();
  const profileId = String(form.get("officiant_profile_id") ?? "");
  let name = String(form.get("officiant_name") ?? "").trim().slice(0, 200);
  let email = String(form.get("officiant_email") ?? "").trim().slice(0, 320);
  if (profileId && profileId !== "other") {
    const { data: person, error } = await db.from("profiles").select("first_name,last_name,email").eq("organization_id", org).eq("id", profileId).single();
    if (error || !person) throw new Error("Choose a pastor from this church.");
    name = [person.first_name, person.last_name].filter(Boolean).join(" "); email = person.email ?? "";
  }
  if (!name || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) throw new Error("Enter the officiating pastor's name and a valid email address.");
  return { name, email };
}
export async function requestOfficiantSignature(org: string, requestId: string, actor: string, form: FormData) {
  const db = createServiceRoleClient();
  const { name, email } = await readOfficiant(org, form);
  const { data: r, error } = await db.from("document_requests").select("*").eq("organization_id", org).eq("id", requestId).single();
  if (error || !r || r.status !== "pending_pastor" || !r.prepared_body) throw new Error("Prepare this document before requesting a signature.");
  const token = randomBytes(32).toString("hex");
  const { error: saveError } = await db.from("document_officiants").upsert({ request_id: requestId, organization_id: org, name, email, token_hash: tokenHash(token), binding: signingBinding(r), expires_at: new Date(Date.now() + 7 * 86400000).toISOString(), requested_by: actor, requested_at: new Date().toISOString(), signed_at: null, signature_png: null, acknowledgement: null });
  if (saveError) throw new Error("The signing request could not be saved. Refresh and try again.");
  await recordOfficeAction(org, actor, "document.officiant_requested", "document_requests", requestId, { officiant: name });
  const result = await queueOfficeEmail({ org, actor, recipient: email, template: "staff-notification", fields: { heading: "Please acknowledge and sign", intro: `Dear ${name}, please review ${r.title} and confirm that you officiated the ceremony.`, details: "Review the details before signing with your mouse or finger. This private link expires in seven days. Please do not forward it.", action_url: `${SITE_URL}/document-signing/${token}` }, dedupeKey: `officiant-${tokenHash(token)}` });
  return result.sent ? "Signing request emailed to the officiating pastor. The certificate will wait for their acknowledgement." : "Signing request saved; its email is queued for retry. Check Email delivery.";
}
export async function signingRequest(token: string) {
  if (!/^[a-f0-9]{64}$/.test(token)) return null;
  const db = createServiceRoleClient();
  const { data: signer, error } = await db.from("document_officiants").select("*").eq("token_hash", tokenHash(token)).maybeSingle();
  if (error) throw error;
  if (!signer || Date.parse(signer.expires_at) <= Date.now()) return null;
  const { data: request } = await db.from("document_requests").select("*").eq("organization_id", signer.organization_id).eq("id", signer.request_id).eq("status", "pending_pastor").maybeSingle();
  if (!request || !sameSigningBinding(signingBinding(request), signer.binding)) return null;
  return { signer, request };
}
function canonical(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonical);
  if (value && typeof value === "object") return Object.fromEntries(Object.entries(value).sort(([a], [b]) => a.localeCompare(b)).map(([k,v]) => [k, canonical(v)]));
  return value;
}
export const OFFICIANT_ACKNOWLEDGEMENT = "I confirm that I am the named officiating pastor, that I officiated the ceremony described above, and that this is my signature for this document.";
