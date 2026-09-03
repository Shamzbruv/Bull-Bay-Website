"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { ActionState } from "@/app/(public)/actions";

async function requireProfileId(supabase: Awaited<ReturnType<typeof createClient>>) {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  const { data } = await supabase
    .from("profiles")
    .select("id, household_id, organization_id")
    .eq("auth_user_id", user.id)
    .maybeSingle();
  return data ?? null;
}

export async function updateProfile(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const supabase = await createClient();
  const profile = await requireProfileId(supabase);
  if (!profile) return { status: "error", message: "Please sign in again." };

  const { error } = await supabase
    .from("profiles")
    .update({
      first_name: String(formData.get("first_name") || "").trim() || null,
      last_name: String(formData.get("last_name") || "").trim() || null,
      phone: String(formData.get("phone") || "").trim() || null,
      preferred_contact_method: String(formData.get("preferred_contact_method") || "") || null,
      occupation: String(formData.get("occupation") || "").trim() || null,
      professional_bio: String(formData.get("professional_bio") || "").trim() || null,
      open_to_professional_requests: formData.get("open_to_professional_requests") === "on",
    })
    .eq("id", profile.id);

  if (error) return { status: "error", message: "We couldn't save your profile. Please try again." };
  revalidatePath("/member/profile");
  return { status: "success", message: "Profile updated." };
}

export async function saveHousehold(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const supabase = await createClient();
  const profile = await requireProfileId(supabase);
  if (!profile) return { status: "error", message: "Please sign in again." };

  const name = String(formData.get("name") || "").trim();
  if (!name) return { status: "error", message: "Please enter a household name." };

  if (profile.household_id) {
    const { error } = await supabase.from("households").update({ name }).eq("id", profile.household_id);
    if (error) return { status: "error", message: "We couldn't save your household." };
  } else {
    const { data: household, error } = await supabase
      .from("households")
      .insert({ organization_id: profile.organization_id, name })
      .select("id")
      .single();
    if (error || !household) return { status: "error", message: "We couldn't create your household." };
    await supabase.from("profiles").update({ household_id: household.id }).eq("id", profile.id);
  }

  revalidatePath("/member/household");
  return { status: "success", message: "Household saved." };
}

export async function updateNotificationPreferences(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const supabase = await createClient();
  const profile = await requireProfileId(supabase);
  if (!profile) return { status: "error", message: "Please sign in again." };

  const { error } = await supabase.from("notification_preferences").upsert({
    profile_id: profile.id,
    email_enabled: formData.get("email_enabled") === "on",
    sms_enabled: formData.get("sms_enabled") === "on",
    push_enabled: false,
  });

  if (error) return { status: "error", message: "We couldn't save your preferences." };
  revalidatePath("/member/notifications");
  return { status: "success", message: "Notification preferences saved." };
}
