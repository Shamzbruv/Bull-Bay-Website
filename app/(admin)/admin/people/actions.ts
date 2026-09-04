"use server";

import { revalidatePath } from "next/cache";
import { randomInt } from "node:crypto";
import { createClient, createServiceRoleClient } from "@/lib/supabase/server";
import { getOrganizationId, getUserPermissions } from "@/lib/auth/session";
import { sendMail } from "@/lib/email/resend";
import { renderTempPasswordEmail } from "@/lib/email/templates";
import { createInvitedMember } from "@/lib/members/invite";
import type { ActionState } from "@/app/(public)/actions";

/**
 * The only way an account gets created — never public self-service (the
 * one exception, "request to join" being approved from admin/visitors,
 * goes through this same createInvitedMember() helper). Collects the
 * extra membership/job/personal details the admin has on hand and saves
 * them onto the profile the invite already provisioned.
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

  const supabase = await createClient();
  const {
    data: { user: actor },
  } = await supabase.auth.getUser();

  const result = await createInvitedMember({
    organizationId,
    actorId: actor?.id ?? null,
    email,
    firstName,
    lastName,
    phone: String(formData.get("phone") || "").trim(),
    membershipStatus: String(formData.get("membership_status") || "visitor"),
  });
  if (!result.ok) return { status: "error", message: result.message };

  // The invite already saved name/phone/membership status — layer on the
  // rest of what the admin collected.
  const admin = createServiceRoleClient();
  await admin
    .from("profiles")
    .update({
      job_title: String(formData.get("job_title") || "").trim() || null,
      employer: String(formData.get("employer") || "").trim() || null,
      marital_status: String(formData.get("marital_status") || "") || null,
      address_line1: String(formData.get("address_line1") || "").trim() || null,
      city: String(formData.get("city") || "").trim() || null,
      parish: String(formData.get("parish") || "").trim() || null,
      emergency_contact_name: String(formData.get("emergency_contact_name") || "").trim() || null,
      emergency_contact_phone: String(formData.get("emergency_contact_phone") || "").trim() || null,
    })
    .eq("organization_id", organizationId)
    .ilike("email", result.email);

  revalidatePath("/admin/people");
  return { status: "success", message: `Invitation sent to ${result.email}.` };
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
