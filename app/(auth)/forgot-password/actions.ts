"use server";

import { createServiceRoleClient } from "@/lib/supabase/server";
import { sendMail } from "@/lib/email/resend";
import { renderRecoveryEmail } from "@/lib/email/templates";
import { SITE_URL } from "@/lib/org";
import type { ActionState } from "@/app/(public)/actions";

const GENERIC_MESSAGE = "If that email has an account with us, a password reset link is on its way. Check your inbox (and spam folder).";

/**
 * Deliberately mints the link with admin.auth.admin.generateLink() rather
 * than calling the public supabase.auth.resetPasswordForEmail() — that
 * method always sends Supabase's own mailer email itself, with no way to
 * intercept it. generateLink() only mints a real one-time token; sending
 * it is entirely ours, straight through Resend. Also means this can no
 * longer live as a client-side call (that method needs the service-role
 * key), hence the move to a server action.
 *
 * Always returns the same success message whether or not the email has an
 * account — a public form on an invite-only system shouldn't reveal who
 * has one.
 */
export async function requestPasswordReset(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const email = String(formData.get("email") || "").trim().toLowerCase();
  if (!email) return { status: "error", message: "Please enter your email address." };

  const redirectTo = `${SITE_URL}/auth/callback?next=${encodeURIComponent("/auth/update-password")}`;
  const admin = createServiceRoleClient();
  const { data, error } = await admin.auth.admin.generateLink({
    type: "recovery",
    email,
    options: { redirectTo },
  });

  if (!error && data?.properties?.action_link) {
    await sendMail({
      to: email,
      subject: "Reset your Bull Bay church platform password",
      html: renderRecoveryEmail({ actionUrl: data.properties.action_link }),
    }).catch(() => {});
  }

  return { status: "success", message: GENERIC_MESSAGE };
}
