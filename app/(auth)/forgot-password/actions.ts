"use server";

import { sendMail } from "@/lib/email/resend";
import { renderRecoveryEmail } from "@/lib/email/templates";
import { generateAuthLink } from "@/lib/supabase/generate-link";
import { SITE_URL } from "@/lib/org";
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
