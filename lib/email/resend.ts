import { SITE_NAME } from "@/lib/org";

export type SendMailInput = {
  to: string | string[];
  subject: string;
  html: string;
  /** Shown to the recipient as "reply to" — Resend sends from a no-reply
   * address, so anywhere a staff member is composing a real message (not a
   * system notification), the UI must collect this and pass it through. */
  replyTo?: string;
  from?: string;
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

  const from = input.from ?? process.env.RESEND_FROM_EMAIL ?? `${SITE_NAME} <notifications@bullbaychurch.org>`;

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to: input.to,
        subject: input.subject,
        html: input.html,
        ...(input.replyTo ? { reply_to: input.replyTo } : {}),
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
