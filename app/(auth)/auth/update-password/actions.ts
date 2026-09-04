"use server";

import { redirect } from "next/navigation";
import { createClient, createServiceRoleClient } from "@/lib/supabase/server";
import type { ActionState } from "@/app/(public)/actions";

const MIN_PASSWORD_LENGTH = 8;
const MAX_PASSWORD_LENGTH = 128;

export async function updateAccountPassword(
  _previousState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const password = String(formData.get("password") || "");
  const confirmation = String(formData.get("confirm_password") || "");

  if (password.length < MIN_PASSWORD_LENGTH) {
    return { status: "error", message: `Please use at least ${MIN_PASSWORD_LENGTH} characters.` };
  }
  if (password.length > MAX_PASSWORD_LENGTH) {
    return { status: "error", message: `Please use no more than ${MAX_PASSWORD_LENGTH} characters.` };
  }
  if (password !== confirmation) {
    return { status: "error", message: "The passwords don't match." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { status: "error", message: "Your session expired. Please request a new link." };

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("id, organization_id, first_name, last_name, must_change_password")
    .eq("auth_user_id", user.id)
    .maybeSingle();
  if (profileError || !profile) {
    return { status: "error", message: "We couldn't find your church profile. Please contact the church office." };
  }

  const { error: passwordError } = await supabase.auth.updateUser({ password });
  if (passwordError) {
    return {
      status: "error",
      message: passwordError.message || "We couldn't update your password. Please try again.",
    };
  }

  // This flag is security-sensitive. Clear it on the trusted server after
  // verifying the session instead of letting the browser write it directly.
  const admin = createServiceRoleClient();
  const { error: flagError } = await admin
    .from("profiles")
    .update({ must_change_password: false })
    .eq("id", profile.id)
    .eq("auth_user_id", user.id);

  if (flagError) {
    return {
      status: "error",
      message: "Your password was updated, but account setup could not be completed. Please contact the church office.",
    };
  }

  await admin.from("audit_logs").insert({
    organization_id: profile.organization_id,
    actor_id: user.id,
    action: profile.must_change_password ? "account.initial_password_set" : "account.password_changed",
    entity_type: "profiles",
    entity_id: profile.id,
    metadata: {},
  });

  const needsProfileSetup = !profile.first_name?.trim() || !profile.last_name?.trim();
  redirect(needsProfileSetup ? "/member/profile?onboarding=1" : "/member");
}
