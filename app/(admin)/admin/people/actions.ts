"use server";

import { revalidatePath } from "next/cache";
import { createClient, createServiceRoleClient } from "@/lib/supabase/server";
import { getOrganizationId } from "@/lib/auth/session";
import { SITE_URL } from "@/lib/org";
import { sendMail } from "@/lib/email/resend";
import { renderTempPasswordEmail } from "@/lib/email/templates";
import type { ActionState } from "@/app/(public)/actions";

/**
 * The only way an account gets created — never public self-service. Uses
 * the Supabase Admin API (service role, server-only) to create the
 * auth.users row directly, then fills in the membership/job/personal
 * details the admin collected for the new profile.
 *
 * The invite email itself is Supabase's own (its mailer_templates_invite
 * are branded to match the site — see Auth → Email Templates), sent
 * through the Resend SMTP relay. It is NOT duplicated with a second,
 * separately-composed email here: an earlier version of this action also
 * sent one via sendMail(), but that link had no auth token on it (only
 * Supabase's own {{ .ConfirmationURL }} carries the real one-time code),
 * so it went nowhere — Supabase's is the only one that actually works.
 */
export async function inviteMember(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const organizationId = await getOrganizationId();
  if (!organizationId) return { status: "error", message: "Something went wrong." };

  const email = String(formData.get("email") || "").trim().toLowerCase();
  const firstName = String(formData.get("first_name") || "").trim();
  const lastName = String(formData.get("last_name") || "").trim();
  if (!email || !firstName || !lastName) {
    return { status: "error", message: "Please provide at least an email, first name and last name." };
  }

  const admin = createServiceRoleClient();
  const redirectTo = `${SITE_URL}/auth/callback?next=${encodeURIComponent("/auth/update-password")}`;

  const { data: invited, error: inviteError } = await admin.auth.admin.inviteUserByEmail(email, { redirectTo });
  if (inviteError || !invited.user) {
    return {
      status: "error",
      message: inviteError?.message?.includes("already registered")
        ? "This email already has an account."
        : "We couldn't send the invitation. Please try again.",
    };
  }

  const supabase = await createClient();
  const {
    data: { user: actor },
  } = await supabase.auth.getUser();

  // The new-auth-user trigger already created a bare profile row for this
  // email — fill in everything the admin collected.
  const { error: profileError } = await supabase
    .from("profiles")
    .update({
      first_name: firstName,
      last_name: lastName,
      phone: String(formData.get("phone") || "").trim() || null,
      membership_status: String(formData.get("membership_status") || "visitor"),
      job_title: String(formData.get("job_title") || "").trim() || null,
      employer: String(formData.get("employer") || "").trim() || null,
      marital_status: String(formData.get("marital_status") || "") || null,
      address_line1: String(formData.get("address_line1") || "").trim() || null,
      city: String(formData.get("city") || "").trim() || null,
      parish: String(formData.get("parish") || "").trim() || null,
      emergency_contact_name: String(formData.get("emergency_contact_name") || "").trim() || null,
      emergency_contact_phone: String(formData.get("emergency_contact_phone") || "").trim() || null,
      must_change_password: true,
      invited_by: actor?.id ?? null,
      invited_at: new Date().toISOString(),
    })
    .eq("auth_user_id", invited.user.id);

  if (profileError) {
    return { status: "error", message: "Invitation sent, but we couldn't save their details. Edit their profile below." };
  }

  await supabase.from("audit_logs").insert({
    organization_id: organizationId,
    actor_id: actor?.id ?? null,
    action: "member.invited",
    entity_type: "profiles",
    entity_id: invited.user.id,
    metadata: { email },
  });

  revalidatePath("/admin/people");
  return { status: "success", message: `Invitation sent to ${email}.` };
}

function generateTempPassword() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";
  let out = "";
  for (let i = 0; i < 12; i++) out += chars[Math.floor(Math.random() * chars.length)];
  return out;
}

/**
 * Admin/delegated-admin password reset: issues a temporary password and
 * forces the member to replace it (middleware enforces this) the moment
 * they next sign in. Shown once to the admin here, and emailed if Resend
 * is configured — never stored anywhere in the clear afterward.
 */
export async function resetMemberPassword(profileId: string): Promise<ActionState> {
  const supabase = await createClient();
  const { data: profile } = await supabase.from("profiles").select("auth_user_id, email, first_name").eq("id", profileId).maybeSingle();
  if (!profile?.auth_user_id) return { status: "error", message: "This person doesn't have a login account yet." };

  const tempPassword = generateTempPassword();
  const admin = createServiceRoleClient();
  const { error } = await admin.auth.admin.updateUserById(profile.auth_user_id, { password: tempPassword });
  if (error) return { status: "error", message: "Couldn't reset the password. Please try again." };

  await supabase.from("profiles").update({ must_change_password: true }).eq("id", profileId);

  if (profile.email) {
    await sendMail({
      to: profile.email,
      subject: "Your Bull Bay account password was reset",
      html: renderTempPasswordEmail({ recipientName: profile.first_name ?? "there", tempPassword }),
    }).catch(() => {});
  }

  return {
    status: "success",
    message: `Temporary password: ${tempPassword} — share this with them securely. They'll be asked to set a new one when they sign in.`,
  };
}
