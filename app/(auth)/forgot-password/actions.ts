"use server";

import { sendMail } from "@/lib/email/resend";
import { renderRecoveryEmail } from "@/lib/email/templates";
import { generateAuthLink } from "@/lib/supabase/generate-link";
import { SITE_URL } from "@/lib/org";
import { callerIp, rateLimit } from "@/lib/rate-limit";
import type { ActionState } from "@/app/(public)/actions";

const GENERIC_MESSAGE = "If that email has an account with us, a password reset link is on its way. Check your inbox (and spam folder).";

/**
 * Deliberately mints the link with generateAuthLink() rather than calling
 * the public supabase.auth.resetPasswordForEmail() — that method always
 * sends Supabase's own mailer email itself (subject to GoTrue's own
 * per-address rate limit), with no way to intercept it. generateAuthLink()
 * only mints a real one-time token via a raw REST call (see
 * lib/supabase/generate-link.ts for why not the SDK's own
 * admin.auth.admin.generateLink()); sending it is entirely ours, straight
 * through Resend. Needs the service-role key, hence this is a server
 * action rather than a client-side call.
 *
 * Always returns the same success message whether or not the email has an
 * account — a public form on an invite-only system shouldn't reveal who
 * has one.
 */
export async function requestPasswordReset(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const email = String(formData.get("email") || "").trim().toLowerCase();
  if (!email) return { status: "error", message: "Please enter your email address." };

  // Minting the link ourselves (see above) means GoTrue's own per-address
  // send limit never applies, so without this anyone could point a loop at
  // this form and bury a member's inbox — or burn the church's whole
  // Resend quota, which would take every other email down with it.
  // Throttled by address and by source, and a throttled caller still gets
  // GENERIC_MESSAGE: telling them they were throttled would confirm the
  // address exists, which is exactly what this form refuses to reveal.
  const ip = await callerIp();
  // Both counters are advanced before they are combined — with `&&` the
  // second call would be short-circuited away whenever the first already
  // said no, so a flood aimed at one address would never register against
  // its source.
  // The per-address limit is the one that matters — it is what stops a
  // member's inbox being buried. The per-IP limit is deliberately loose
  // for the carrier-NAT reason described in the public form actions.
  const perEmail = rateLimit(`password-reset:email:${email}`, 3, 60 * 60 * 1000).allowed;
  const perIp = rateLimit(`password-reset:ip:${ip}`, 20, 60 * 60 * 1000).allowed;
  if (!perEmail || !perIp) {
    console.warn(`[auth] password reset throttled for ${ip}`);
    return { status: "success", message: GENERIC_MESSAGE };
  }

  const redirectTo = `${SITE_URL}/auth/callback?next=${encodeURIComponent("/auth/update-password")}`;
  const { actionLink } = await generateAuthLink({ type: "recovery", email, redirectTo });

  if (actionLink) {
    await sendMail({
      to: email,
      subject: "Reset your Bull Bay church platform password",
      html: renderRecoveryEmail({ actionUrl: actionLink }),
    }).catch(() => {});
  }

  return { status: "success", message: GENERIC_MESSAGE };
}
