import { createServiceRoleClient } from "@/lib/supabase/server";
import { renderComposedEmail } from "@/lib/email/templates";
import { sendMail } from "@/lib/email/resend";
import { SITE_URL } from "@/lib/org";

export function fillText(text: string, fields: Record<string, string>) {
  return text.replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (_, key: string) => fields[key] ?? `{{${key}}}`);
}
export async function queueOfficeEmail(input: { org: string; recipient: string; template: string; fields: Record<string, string>; dedupeKey: string; actor?: string; attachmentPath?: string; attachmentName?: string }) {
  const db = createServiceRoleClient();
  const { data: template, error } = await db.from("email_templates").select("*").eq("organization_id", input.org).or(`id.eq.${/^[0-9a-f-]{36}$/i.test(input.template) ? input.template : '00000000-0000-0000-0000-000000000000'},slug.eq.${input.template.replace(/[^a-zA-Z0-9_-]/g, '')}`).maybeSingle();
  if (error || !template) throw new Error("Choose an available email template before sending.");
  const fields = { church_name: "New Testament Church of God, Bull Bay", action_url: `${SITE_URL}/member`, ...input.fields };
  const subject = fillText(template.subject, fields);
  const body = fillText(template.body, fields);
  if (/\{\{[^}]+\}\}/.test(subject + body)) throw new Error("The selected email template has unfilled fields.");
  const { data: delivery, error: insertError } = await db.from("email_deliveries").upsert({ organization_id: input.org, template_id: template.id, recipient: input.recipient, subject, html: renderComposedEmail({ heading: subject, bodyText: body }), reply_to: template.reply_to, attachment_path: input.attachmentPath ?? null, attachment_name: input.attachmentName ?? null, dedupe_key: input.dedupeKey, created_by: input.actor ?? null }, { onConflict: "dedupe_key", ignoreDuplicates: true }).select("id").maybeSingle();
  if (insertError) throw insertError;
  if (delivery) return deliverOfficeEmail(delivery.id);
  return { sent: true };
}
export async function deliverOfficeEmail(id: string) {
  const db = createServiceRoleClient();
  const { data, error } = await db.rpc("claim_office_email", { delivery: id });
  if (error) throw error;
  const delivery = data?.[0];
  if (!delivery) return { sent: false, error: "Already processing or sent." };
  let attachment: Buffer | undefined;
  if (delivery.attachment_path) {
    const { data: file, error: downloadError } = await db.storage.from("member-resources").download(delivery.attachment_path);
    if (downloadError || !file) {
      await db.from("email_deliveries").update({ status: "failed", last_error: "The PDF attachment could not be loaded." }).eq("id", id);
      return { sent: false, error: "PDF unavailable" };
    }
    attachment = Buffer.from(await file.arrayBuffer());
  }
  const result = await sendMail({ to: delivery.recipient, subject: delivery.subject, html: delivery.html, replyTo: delivery.reply_to ?? undefined, idempotencyKey: `office-${id}`, ...(attachment ? { attachments: [{ filename: delivery.attachment_name ?? "church-document.pdf", content: attachment, contentType: "application/pdf" }] } : {}) });
  const { error: saveError } = await db.from("email_deliveries").update({ status: result.sent ? "sent" : "failed", last_error: result.error ?? null, sent_at: result.sent ? new Date().toISOString() : null }).eq("id", id);
  if (saveError) throw saveError;
  return result;
}
