"use server";

import { revalidatePath } from "next/cache";
import { createClient, createServiceRoleClient } from "@/lib/supabase/server";
import { getOrganizationId, getUserPermissions } from "@/lib/auth/session";
import { generateAuthLink } from "@/lib/supabase/generate-link";
import { SITE_URL } from "@/lib/org";
import { sendMail } from "@/lib/email/resend";
import { renderRecoveryEmail } from "@/lib/email/templates";
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

/** Send recovery only to the email verified by Auth; staff never receive a password. */
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

  const admin = createServiceRoleClient();
  const { data: account, error: accountError } = await admin.auth.admin.getUserById(profile.auth_user_id);
  if (accountError || !account.user?.email) return { status: "error", message: "Account recovery is unavailable." };
  const { actionLink, error } = await generateAuthLink({
    type: "recovery", email: account.user.email,
    redirectTo: `${SITE_URL}/auth/callback?next=${encodeURIComponent("/auth/update-password")}`,
  });
  if (error || !actionLink) return { status: "error", message: "Couldn't create a recovery link. Please retry." };
  const result = await sendMail({ to: account.user.email, subject: "Reset your Bull Bay account password", html: renderRecoveryEmail({ actionUrl: actionLink }) });
  return result.sent ? { status: "success", message: "A private password reset link was sent to the account's registered email." }
    : { status: "error", message: "The recovery email could not be sent. Please retry." };
}
