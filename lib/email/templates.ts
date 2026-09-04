import { SITE_NAME, SITE_URL } from "@/lib/org";

const BRAND_BLUE = "#173f89";
const BRAND_BLUE_DARK = "#0f3274";
const BRAND_OLIVE = "#6a7e30";
const INK = "#1d2b45";
const MUTED = "#5c6a80";
const SURFACE = "#eef1ec";

/** Public form fields land in these emails unescaped otherwise — this is
 * the only thing standing between a prayer request textarea and arbitrary
 * HTML in a staff member's inbox. */
function escapeHtml(input: string): string {
  return input
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function paragraphsFromPlainText(input: string): string {
  return input
    .split(/\n\s*\n/)
    .map((paragraph) => `<p style="margin:0 0 14px;">${escapeHtml(paragraph).replace(/\n/g, "<br/>")}</p>`)
    .join("");
}

/**
 * The shared shell every outbound email renders inside: church logo on a
 * royal-blue band, a white content card, and a consistent footer. Built
 * with table layout + inline styles only — email clients don't reliably
 * support modern CSS, so this deliberately doesn't reuse styles/globals.css.
 */
function shell(opts: { preheader?: string; bodyHtml: string; footerNote?: string }) {
  const { preheader = "", bodyHtml, footerNote } = opts;
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${SITE_NAME}</title>
  </head>
  <body style="margin:0;padding:0;background:${SURFACE};font-family:'DM Sans',Arial,Helvetica,sans-serif;">
    <div style="display:none;max-height:0;overflow:hidden;opacity:0;">${preheader}</div>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${SURFACE};padding:32px 16px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:20px;overflow:hidden;box-shadow:0 8px 28px rgba(15,50,116,0.12);">
            <tr>
              <td style="background:linear-gradient(135deg, ${BRAND_BLUE} 0%, ${BRAND_BLUE_DARK} 100%);padding:32px 32px 28px;text-align:center;">
                <img src="${SITE_URL}/images/brand/bull-bay-logo.png" alt="${SITE_NAME}" width="72" height="72" style="display:block;margin:0 auto 14px;border-radius:50%;background:#fff;padding:6px;" />
                <div style="color:#ffffff;font-family:Georgia,'Times New Roman',serif;font-size:20px;font-weight:700;letter-spacing:-0.01em;">
                  New Testament Church of God
                </div>
                <div style="color:#cfe0a0;font-size:11px;letter-spacing:0.18em;text-transform:uppercase;margin-top:4px;">
                  Bull Bay, Jamaica
                </div>
              </td>
            </tr>
            <tr>
              <td style="padding:36px 32px;color:${INK};font-size:15px;line-height:1.65;">
                ${bodyHtml}
              </td>
            </tr>
            <tr>
              <td style="padding:22px 32px 30px;border-top:1px solid #e5e8e1;">
                <p style="margin:0 0 6px;color:${MUTED};font-size:12px;">
                  ${footerNote ?? "This message was sent by New Testament Church of God, Bull Bay."}
                </p>
                <p style="margin:0;color:${MUTED};font-size:12px;">
                  This is an automated message — please do not reply directly to this email.
                </p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

function button(label: string, url: string) {
  return `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:24px 0;">
    <tr>
      <td style="border-radius:12px;background:${BRAND_BLUE};">
        <a href="${url}" style="display:inline-block;padding:13px 26px;color:#ffffff;font-weight:700;font-size:14px;text-decoration:none;border-radius:12px;">
          ${label}
        </a>
      </td>
    </tr>
  </table>`;
}

/**
 * `actionUrl` must be the real `action_link` returned by
 * admin.auth.admin.generateLink({ type: "invite", ... }) — generateLink()
 * mints the one-time token but never sends anything itself, which is the
 * whole point: this is the only place that email goes out, straight
 * through Resend, with nothing routed through Supabase's own mailer.
 */
export function renderInviteEmail(opts: { recipientName: string; actionUrl: string }) {
  return shell({
    preheader: "You've been invited to the Bull Bay church platform.",
    bodyHtml: `
      <p style="margin:0 0 4px;color:${BRAND_OLIVE};font-size:12px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;">You're invited</p>
      <h1 style="margin:0 0 16px;color:${BRAND_BLUE};font-family:Georgia,'Times New Roman',serif;font-size:24px;">Welcome, ${opts.recipientName}.</h1>
      <p style="margin:0 0 8px;">The church office has set up an account for you on the Bull Bay church platform — your place to view the church calendar, submit prayer and counselling requests, and request documents from the pastor's office.</p>
      <p style="margin:16px 0 0;">Click below to set your password and get started:</p>
      ${button("Set your password", opts.actionUrl)}
      <p style="margin:0;color:${MUTED};font-size:13px;">If the button doesn't work, copy and paste this link into your browser:<br/><span style="word-break:break-all;">${opts.actionUrl}</span></p>
    `,
  });
}

/**
 * `actionUrl` must be the real `action_link` from
 * admin.auth.admin.generateLink({ type: "recovery", ... }) — same reasoning
 * as renderInviteEmail above: mint-only, we send it, nothing touches
 * Supabase's mailer.
 */
export function renderRecoveryEmail(opts: { actionUrl: string }) {
  return shell({
    preheader: "Reset your Bull Bay church platform password.",
    bodyHtml: `
      <p style="margin:0 0 4px;color:${BRAND_OLIVE};font-size:12px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;">Password reset</p>
      <h1 style="margin:0 0 16px;color:${BRAND_BLUE};font-family:Georgia,'Times New Roman',serif;font-size:24px;">Reset your password.</h1>
      <p style="margin:0 0 8px;">We received a request to reset the password for your Bull Bay church platform account. Click below to choose a new one.</p>
      ${button("Reset password", opts.actionUrl)}
      <p style="margin:0 0 8px;color:${MUTED};font-size:13px;">If the button doesn't work, copy and paste this link into your browser:<br/><span style="word-break:break-all;">${opts.actionUrl}</span></p>
      <p style="margin:0;color:${MUTED};font-size:13px;">If you didn't request this, you can safely ignore this email — your password won't change. Open this link on the same device and browser you requested it from.</p>
    `,
  });
}

export function renderTempPasswordEmail(opts: { recipientName: string; tempPassword: string }) {
  return shell({
    preheader: "Your password was reset by the church office.",
    bodyHtml: `
      <p style="margin:0 0 4px;color:${BRAND_OLIVE};font-size:12px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;">Password reset</p>
      <h1 style="margin:0 0 16px;color:${BRAND_BLUE};font-family:Georgia,'Times New Roman',serif;font-size:24px;">Hi ${opts.recipientName},</h1>
      <p style="margin:0 0 16px;">The church office has reset your password. Use this temporary password to sign in — you'll be asked to choose a new one right away.</p>
      <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 0 16px;background:${SURFACE};border-radius:12px;">
        <tr><td style="padding:16px 20px;font-family:monospace;font-size:18px;letter-spacing:0.05em;color:${BRAND_BLUE};font-weight:700;">${opts.tempPassword}</td></tr>
      </table>
      ${button("Sign in", `${SITE_URL}/login`)}
      <p style="margin:0;color:${MUTED};font-size:13px;">If you didn't request this, please contact the church office right away.</p>
    `,
  });
}

/** Used by Admin → Communications for one-off or bulk messages the
 * secretary/media team compose themselves. */
export function renderComposedEmail(opts: { heading: string; bodyText: string; senderName?: string }) {
  return shell({
    bodyHtml: `
      <h1 style="margin:0 0 16px;color:${BRAND_BLUE};font-family:Georgia,'Times New Roman',serif;font-size:22px;">${escapeHtml(opts.heading)}</h1>
      <div>${paragraphsFromPlainText(opts.bodyText)}</div>
      ${opts.senderName ? `<p style="margin:24px 0 0;color:${MUTED};font-size:13px;">— ${escapeHtml(opts.senderName)}</p>` : ""}
    `,
    footerNote: "This message was sent to you by New Testament Church of God, Bull Bay through the church platform.",
  });
}

export function renderDocumentReadyEmail(opts: { recipientName: string; documentTitle: string; actionUrl: string }) {
  return shell({
    preheader: "Your requested document is ready.",
    bodyHtml: `
      <p style="margin:0 0 4px;color:${BRAND_OLIVE};font-size:12px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;">Document ready</p>
      <h1 style="margin:0 0 16px;color:${BRAND_BLUE};font-family:Georgia,'Times New Roman',serif;font-size:24px;">Hi ${opts.recipientName},</h1>
      <p style="margin:0 0 8px;">Your requested document — <b>${opts.documentTitle}</b> — has been prepared and certified by the pastor's office.</p>
      ${button("View my document", opts.actionUrl)}
    `,
  });
}

/**
 * Internal notification for the office/pastor when a public form is
 * submitted (contact card, prayer request, etc.) — not sent to the person
 * who submitted it. Field values are escaped since they're unauthenticated
 * user input landing straight in a staff inbox.
 */
export function renderStaffNotificationEmail(opts: {
  heading: string;
  intro?: string;
  fields: { label: string; value: string | null }[];
  actionLabel?: string;
  actionUrl?: string;
}) {
  const rows = opts.fields
    .map(
      (f) => `<tr>
        <td style="padding:8px 10px 8px 0;border-bottom:1px solid #e5e8e1;color:${MUTED};font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.04em;width:130px;vertical-align:top;white-space:nowrap;">${escapeHtml(f.label)}</td>
        <td style="padding:8px 0;border-bottom:1px solid #e5e8e1;color:${INK};font-size:14px;white-space:pre-wrap;">${f.value ? escapeHtml(f.value) : "—"}</td>
      </tr>`,
    )
    .join("");

  return shell({
    preheader: opts.heading,
    bodyHtml: `
      <p style="margin:0 0 4px;color:${BRAND_OLIVE};font-size:12px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;">New submission</p>
      <h1 style="margin:0 0 12px;color:${BRAND_BLUE};font-family:Georgia,'Times New Roman',serif;font-size:22px;">${escapeHtml(opts.heading)}</h1>
      ${opts.intro ? `<p style="margin:0 0 16px;">${escapeHtml(opts.intro)}</p>` : ""}
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:8px 0 4px;">${rows}</table>
      ${opts.actionUrl ? button(opts.actionLabel ?? "Open in the church platform", opts.actionUrl) : ""}
    `,
    footerNote: "Sent automatically by the church platform when someone submits this form.",
  });
}
