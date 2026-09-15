import { createServiceRoleClient } from "@/lib/supabase/server";
import { renderComposedEmail } from "@/lib/email/templates";
import { ORGANIZATION_SLUG } from "@/lib/org";
import { SITE_NAME } from "@/lib/org";

export type SendMailInput = {
  to: string | string[];
  subject: string;
  idempotencyKey?: string;
  html: string;
  /** Shown to the recipient as "reply to" — Resend sends from a no-reply
   * address, so anywhere a staff member is composing a real message (not a
   * system notification), the UI must collect this and pass it through. */
  replyTo?: string;
  from?: string;
  attachments?: {
    filename: string;
    content: Buffer | Uint8Array | string;
    contentType?: string;
  }[];
};

/**
 * Thin wrapper around Resend's REST API — no SDK dependency needed for a
 * single POST. Until RESEND_API_KEY is set (see docs/EMAIL.md), this
 * quietly no-ops rather than throwing, the same "scaffolded but inactive"
 * pattern used for the payment gateway — every caller already treats a
 * failed/skipped send as best-effort (invite/reset emails have a
 * Supabase-native fallback; nothing in the app blocks on this succeeding).
 */
export async function sendMail(input: SendMailInput): Promise<{ sent: boolean; error?: string }> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.warn(`[email] RESEND_API_KEY not set — skipped "${input.subject}" to ${input.to}`);
    return { sent: false, error: "not_configured" };
  }

  let subject = input.subject;
  let html = input.html;
  const marker = html.match(/^<!--church-template:([A-Za-z0-9+/=]+)-->/);
  if (marker) {
    html = html.slice(marker[0].length);
    try {
      const metadata = JSON.parse(Buffer.from(marker[1]!, "base64").toString("utf8")) as {slug:string;fields:Record<string,string>};
      const db = createServiceRoleClient();
      const {data:org} = await db.from("organizations").select("id").eq("slug",ORGANIZATION_SLUG).maybeSingle();
      if (org) {
       const {data:template} = await db.from("email_templates").select("subject,body,reply_to").eq("organization_id",org.id).eq("slug",metadata.slug).maybeSingle();
       if(template) {
        const fields={...metadata.fields,church_name:SITE_NAME};
        const fill=(text:string)=>text.replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g,(match,key:string)=>(fields as Record<string,string>)[key] ?? match);
        const candidateSubject=fill(template.subject),candidateBody=fill(template.body);
        // Broken edits cannot strand an invitation or remove its role/link.
        const required=metadata.slug==="invitation"?[metadata.fields.action_url,metadata.fields.role_name]:metadata.slug==="password-recovery"?[metadata.fields.action_url]:[];
        if(!/\{\{[^}]+\}\}/.test(candidateSubject+candidateBody)&&required.every(value=>value&&(candidateSubject+candidateBody).includes(value))) {
         subject=candidateSubject;html=renderComposedEmail({heading:subject,bodyText:candidateBody});input.replyTo ??= template.reply_to ?? undefined;
        }
       }
      }
    } catch { /* Keep the verified default if template storage is unavailable. */ }
  }
  const from = input.from ?? process.env.RESEND_FROM_EMAIL ?? `${SITE_NAME} <notifications@bullbayntcog.org>`;

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        ...(input.idempotencyKey ? { "Idempotency-Key": input.idempotencyKey } : {}),
      },
      body: JSON.stringify({
        from,
        to: input.to,
        subject,
        html,
        ...(input.replyTo ? { reply_to: input.replyTo } : {}),
        ...(input.attachments?.length
          ? {
              attachments: input.attachments.map((attachment) => ({
                filename: attachment.filename,
                content:
                  typeof attachment.content === "string"
                    ? attachment.content
                    : Buffer.from(attachment.content).toString("base64"),
                ...(attachment.contentType ? { content_type: attachment.contentType } : {}),
              })),
            }
          : {}),
      }),
    });

    if (!res.ok) {
      const body = await res.text();
      console.error("[email] Resend error", res.status, body);
      return { sent: false, error: `resend_${res.status}` };
    }
    return { sent: true };
  } catch (err) {
    console.error("[email] Resend request failed", err);
    return { sent: false, error: "network" };
  }
}

export function isEmailConfigured() {
  return Boolean(process.env.RESEND_API_KEY);
}
