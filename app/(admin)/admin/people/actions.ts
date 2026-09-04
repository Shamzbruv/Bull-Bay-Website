"use server";

import { revalidatePath } from "next/cache";
import { randomInt } from "node:crypto";
import { createClient, createServiceRoleClient } from "@/lib/supabase/server";
import { getOrganizationId, getUserPermissions } from "@/lib/auth/session";
import { SITE_URL } from "@/lib/org";
import { sendMail } from "@/lib/email/resend";
import { renderInviteEmail, renderTempPasswordEmail } from "@/lib/email/templates";
import type { ActionState } from "@/app/(public)/actions";

/**
 * The only way an account gets created — never public self-service. Uses
 * the Supabase Admin API (service role, server-only) to create the
 * auth.users row directly, then fills in the membership/job/personal
 * details the admin collected for the new profile.
 *
 * The invite email is entirely ours: admin.auth.admin.generateLink() mints
 * a real, working one-time invite link but — unlike inviteUserByEmail() —
 * never sends anything itself, so the only email that goes out is the one
 * sendMail() sends here, through Resend directly. Supabase's own mailer
 * (and its per-address rate limit) is never involved in this flow.
 */
export async function inviteMember(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const organizationId = await getOrganizationId();
  const permissions = organizationId ? await getUserPermissions(organizationId) : new Set<string>();
  if (!organizationId || !permissions.has("people.write")) {
    return { status: "error", message: "You don't have permission to invite members." };
  }

  const email = String(formData.get("email") || "").trim().toLowerCase();
  const firstName = String(formData.get("first_name") || "").trim();
  const lastName = String(formData.get("last_name") || "").trim();
  if (!email || !firstName || !lastName) {
    return { status: "error", message: "Please provide at least an email, first name and last name." };
  }

  const admin = createServiceRoleClient();
  const redirectTo = `${SITE_URL}/auth/callback?next=${encodeURIComponent("/auth/update-password")}`;

  const { data: linkData, error: inviteError } = await admin.auth.admin.generateLink({
    type: "invite",
    email,
    options: { redirectTo },
  });
  const invitedUser = linkData?.user;
  const actionLink = linkData?.properties?.action_link;
  if (inviteError || !invitedUser || !actionLink) {
    return {
      status: "error",
      message: inviteError?.message?.toLowerCase().includes("already been registered")
        ? "This email already has an account."
        : "We couldn't create the invitation. Please try again.",
    };
  }

  const supabase = await createClient();
  const {
    data: { user: actor },
  } = await supabase.auth.getUser();

  // The new-auth-user trigger already created a bare profile row for this
  // email — fill in everything the admin collected.
  const { error: profileError } = await admin
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
    .eq("auth_user_id", invitedUser.id);

  if (profileError) {
    return { status: "error", message: "The account was created, but we couldn't save their details — edit their profile below, then send the invite." };
  }

  await admin.from("audit_logs").insert({
    organization_id: organizationId,
    actor_id: actor?.id ?? null,
    action: "member.invited",
    entity_type: "profiles",
    entity_id: invitedUser.id,
    metadata: { email },
  });

  const { sent } = await sendMail({
    to: email,
    subject: `You're invited to the Bull Bay church platform`,
    html: renderInviteEmail({ recipientName: firstName, actionUrl: actionLink }),
  });

  revalidatePath("/admin/people");
  return sent
    ? { status: "success", message: `Invitation sent to ${email}.` }
    : { status: "error", message: `Account created for ${email}, but the invite email couldn't be sent. Use "Reset password" instead to get them a temporary password.` };
}

function generateTempPassword() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";
  let out = "";
  for (let i = 0; i < 14; i++) out += chars[randomInt(chars.length)];
  return out;
}

/**
 * Admin/delegated-admin password reset: issues a temporary password and
 * forces the member to replace it (middleware enforces this) the moment
 * they next sign in. Shown once to the admin here, and emailed if Resend
 * is configured — never stored anywhere in the clear afterward.
 */
export async function resetMemberPassword(profileId: string): Promise<ActionState> {
  const organizationId = await getOrganizationId();
  const permissions = organizationId ? await getUserPermissions(organizationId) : new Set<string>();
  if (!organizationId || !permissions.has("people.write")) {
    return { status: "error", message: "You don't have permission to reset member passwords." };
  }

  const supabase = await createClient();
  const { data: profile } = await supabase
    .from("profiles")
    .select("auth_user_id, email, first_name")
    .eq("organization_id", organizationId)
    .eq("id", profileId)
    .maybeSingle();
  if (!profile?.auth_user_id) return { status: "error", message: "This person doesn't have a login account yet." };

  const tempPassword = generateTempPassword();
  const admin = createServiceRoleClient();
  const { error } = await admin.auth.admin.updateUserById(profile.auth_user_id, { password: tempPassword });
  if (error) return { status: "error", message: "Couldn't reset the password. Please try again." };

  const { error: flagError } = await admin
    .from("profiles")
    .update({ must_change_password: true })
    .eq("organization_id", organizationId)
    .eq("id", profileId);
  if (flagError) {
    return { status: "error", message: "The password changed, but the required-reset flag could not be saved. Contact technical support." };
  }

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
