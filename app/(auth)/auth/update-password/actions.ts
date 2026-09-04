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
  if (!/\S/.test(password)) {
    return { status: "error", message: "Your password must include at least one non-space character." };
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
    .select("id, organization_id, must_change_password")
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

  let admin: ReturnType<typeof createServiceRoleClient> | null = null;
  try {
    admin = createServiceRoleClient();
  } catch {
    // A regular password change does not need privileged database access. A
    // forced change must fail closed, however, or middleware would keep the
    // account trapped on this screen with no reliable indication that setup
    // was incomplete.
    if (profile.must_change_password) {
      return {
        status: "error",
        message: "Your password was updated, but account setup could not be completed. Please contact the church office.",
      };
    }
  }

  if (profile.must_change_password && admin) {
    // This flag is security-sensitive. Clear it only on the trusted server,
    // after Supabase has successfully changed the authenticated user's
    // password. Selecting the row verifies that the targeted flag was
    // actually cleared rather than accepting a zero-row update as success.
    const { data: clearedProfile, error: flagError } = await admin
      .from("profiles")
      .update({ must_change_password: false })
      .eq("id", profile.id)
      .eq("auth_user_id", user.id)
      .select("id")
      .maybeSingle();

    if (flagError || !clearedProfile) {
      return {
        status: "error",
        message: "Your password was updated, but account setup could not be completed. Please contact the church office.",
      };
    }
  }

  if (admin) {
    // Password success should not be rolled back in the UI merely because a
    // best-effort audit insert fails.
    try {
      const { error: auditError } = await admin.from("audit_logs").insert({
        organization_id: profile.organization_id,
        actor_id: user.id,
        action: profile.must_change_password ? "account.initial_password_set" : "account.password_changed",
        entity_type: "profiles",
        entity_id: profile.id,
        metadata: {},
      });
      if (auditError) console.error("Password audit insert failed", auditError.code);
    } catch {
      console.error("Password audit insert failed");
    }
  }

  if (profile.must_change_password) redirect("/member/profile?onboarding=1");
  redirect("/member");
}
