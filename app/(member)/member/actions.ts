"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { ActionState } from "@/app/(public)/actions";

const CONTACT_METHODS = new Set(["email", "sms", "whatsapp", "phone"]);
const GENDERS = new Set(["female", "male", "other"]);
const MARITAL_STATUSES = new Set(["single", "married", "widowed", "divorced", "separated"]);

function optionalText(formData: FormData, name: string, maxLength: number) {
  const value = String(formData.get(name) || "").trim();
  return value ? value.slice(0, maxLength) : null;
}

function optionalChoice(formData: FormData, name: string, allowed: Set<string>) {
  const value = String(formData.get(name) || "");
  return allowed.has(value) ? value : null;
}

function optionalDate(formData: FormData, name: string) {
  const value = String(formData.get(name) || "");
  if (!value) return { value: null, valid: true };
  const valid = /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(`${value}T00:00:00Z`));
  return { value: valid ? value : null, valid };
}

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

  const firstName = optionalText(formData, "first_name", 80);
  const lastName = optionalText(formData, "last_name", 80);
  if (!firstName || !lastName) return { status: "error", message: "Please enter your first and last name." };

  const dateOfBirth = optionalDate(formData, "date_of_birth");
  const joinedAt = optionalDate(formData, "joined_at");
  if (!dateOfBirth.valid || !joinedAt.valid) return { status: "error", message: "Please enter a valid date." };

  const today = new Date().toISOString().slice(0, 10);
  if ((dateOfBirth.value && dateOfBirth.value > today) || (joinedAt.value && joinedAt.value > today)) {
    return { status: "error", message: "Dates cannot be in the future." };
  }

  const occupation = optionalText(formData, "occupation", 140);
  const openToProfessionalRequests = formData.get("open_to_professional_requests") === "on";
  if (openToProfessionalRequests && !occupation) {
    return { status: "error", message: "Add your occupation before joining the professional directory." };
  }

  const { error } = await supabase
    .from("profiles")
    .update({
      first_name: firstName,
      last_name: lastName,
      phone: optionalText(formData, "phone", 32),
      date_of_birth: dateOfBirth.value,
      gender: optionalChoice(formData, "gender", GENDERS),
      marital_status: optionalChoice(formData, "marital_status", MARITAL_STATUSES),
      preferred_contact_method: optionalChoice(formData, "preferred_contact_method", CONTACT_METHODS),
      address_line1: optionalText(formData, "address_line1", 180),
      city: optionalText(formData, "city", 100),
      parish: optionalText(formData, "parish", 80),
      emergency_contact_name: optionalText(formData, "emergency_contact_name", 120),
      emergency_contact_phone: optionalText(formData, "emergency_contact_phone", 32),
      joined_at: joinedAt.value,
      communication_email_opt_in: formData.get("communication_email_opt_in") === "on",
      communication_sms_opt_in: formData.get("communication_sms_opt_in") === "on",
      job_title: optionalText(formData, "job_title", 120),
      employer: optionalText(formData, "employer", 140),
      occupation,
      professional_bio: optionalText(formData, "professional_bio", 1200),
      open_to_professional_requests: openToProfessionalRequests,
    })
    .eq("id", profile.id);

  if (error) return { status: "error", message: "We couldn't save your profile. Please try again." };
  revalidatePath("/member/profile");
  revalidatePath("/member");
  revalidatePath("/member/directory");
  if (formData.get("onboarding") === "1") redirect("/member");
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
