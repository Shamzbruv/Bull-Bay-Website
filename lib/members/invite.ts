import { createServiceRoleClient } from "@/lib/supabase/server";
import { SITE_URL } from "@/lib/org";
import { sendMail } from "@/lib/email/resend";
import { renderInviteEmail } from "@/lib/email/templates";
import { generateAuthLink } from "@/lib/supabase/generate-link";

/**
 * The one place a real login account gets provisioned — used both when
 * staff invite someone by hand (admin/people) and when a pastor/admin
 * approves a public "request to join" submission (admin/visitors). Never
 * exposed to the public directly; every caller must already have checked
 * people.write.
 *
 * Uses the Supabase Admin API (service role) to create the auth.users row,
 * then fills in the profile the new-user trigger stubbed out. The invite
 * email is entirely ours — generateAuthLink() mints a real one-time link
 * but sends nothing itself, so Supabase's own mailer (and its rate limit)
 * is never involved; sendMail() is the only email that goes out, through
 * Resend. See lib/supabase/generate-link.ts for why this bypasses
 * admin.auth.admin.generateLink() rather than calling it directly.
 */
export async function createInvitedMember(params: {
  organizationId: string;
  actorId: string | null;
  email: string;
  firstName: string;
  lastName: string;
  phone?: string | null;
  membershipStatus?: string;
}): Promise<{ ok: true; email: string } | { ok: false; message: string }> {
  const { organizationId, actorId, firstName, lastName } = params;
  const email = params.email.trim().toLowerCase();
  if (!email || !firstName || !lastName) {
    return { ok: false, message: "An email, first name and last name are required." };
  }

  const admin = createServiceRoleClient();
  const redirectTo = `${SITE_URL}/auth/callback?next=${encodeURIComponent("/auth/update-password")}`;

  const { actionLink, userId, error: inviteError } = await generateAuthLink({ type: "invite", email, redirectTo });
  if (inviteError || !userId || !actionLink) {
    return {
      ok: false,
      message: inviteError?.toLowerCase().includes("already been registered")
        ? "This email already has an account."
        : "We couldn't create the invitation. Please try again.",
    };
  }

  // The new-auth-user trigger already created a bare profile row for this
  // email — fill in everything that's known about them.
  const { error: profileError } = await admin
    .from("profiles")
    .update({
      first_name: firstName,
      last_name: lastName,
      phone: params.phone?.trim() || null,
      membership_status: params.membershipStatus ?? "visitor",
      must_change_password: true,
      invited_by: actorId,
      invited_at: new Date().toISOString(),
    })
    .eq("auth_user_id", userId);

  if (profileError) {
    return { ok: false, message: "The account was created, but we couldn't save their details — edit their profile, then send the invite." };
  }

  await admin.from("audit_logs").insert({
    organization_id: organizationId,
    actor_id: actorId,
    action: "member.invited",
    entity_type: "profiles",
    entity_id: userId,
    metadata: { email },
  });

  const { sent } = await sendMail({
    to: email,
    subject: "You're invited to the Bull Bay church platform",
    html: renderInviteEmail({ recipientName: firstName, actionUrl: actionLink }),
  });

  return sent
    ? { ok: true, email }
    : { ok: false, message: `Account created for ${email}, but the invite email couldn't be sent. Use "Reset password" from People to issue access.` };
}
