"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { ActionState } from "@/app/(public)/actions";

const CONTACT_METHODS = new Set(["email", "sms", "whatsapp", "phone"]);
const GENDERS = new Set(["female", "male", "other"]);
const MARITAL_STATUSES = new Set(["single", "married", "widowed", "divorced", "separated"]);

type ParsedField = { value: string | null; error: string | null };

function textField(
  formData: FormData,
  name: string,
  label: string,
  maxLength: number,
  required = false,
): ParsedField {
  const rawValue = formData.get(name);
  if (rawValue !== null && typeof rawValue !== "string") {
    return { value: null, error: `${label} must be text.` };
  }

  const value = rawValue?.trim() || null;
  if (required && !value) return { value: null, error: `Please enter your ${label.toLowerCase()}.` };
  if (value && value.length > maxLength) {
    return { value: null, error: `${label} must be ${maxLength} characters or fewer.` };
  }

  return { value, error: null };
}

function choiceField(
  formData: FormData,
  name: string,
  label: string,
  allowed: Set<string>,
): ParsedField {
  const parsed = textField(formData, name, label, 40);
  if (parsed.error || !parsed.value) return parsed;
  if (!allowed.has(parsed.value)) return { value: null, error: `Choose a valid ${label.toLowerCase()}.` };
  return parsed;
}

function dateField(formData: FormData, name: string, label: string): ParsedField {
  const parsed = textField(formData, name, label, 10);
  if (parsed.error || !parsed.value) return parsed;

  const timestamp = Date.parse(`${parsed.value}T00:00:00Z`);
  const isCalendarDate =
    /^\d{4}-\d{2}-\d{2}$/.test(parsed.value) &&
    !Number.isNaN(timestamp) &&
    new Date(timestamp).toISOString().slice(0, 10) === parsed.value;

  return isCalendarDate ? parsed : { value: null, error: `Enter a valid ${label.toLowerCase()}.` };
}

function isValidPhone(value: string | null) {
  if (!value) return true;
  const digitCount = value.replace(/\D/g, "").length;
  return digitCount >= 7 && digitCount <= 15 && /^[0-9+().\-\s]+$/.test(value);
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
  return data ? { ...data, authUserId: user.id } : null;
}

export async function updateProfile(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const supabase = await createClient();
  const profile = await requireProfileId(supabase);
  if (!profile) return { status: "error", message: "Please sign in again." };

  const firstName = textField(formData, "first_name", "First name", 80, true);
  const lastName = textField(formData, "last_name", "Last name", 80, true);
  const phone = textField(formData, "phone", "Phone", 32);
  const dateOfBirth = dateField(formData, "date_of_birth", "Date of birth");
  const gender = choiceField(formData, "gender", "Gender", GENDERS);
  const maritalStatus = choiceField(formData, "marital_status", "Marital status", MARITAL_STATUSES);
  const preferredContact = choiceField(
    formData,
    "preferred_contact_method",
    "Preferred contact method",
    CONTACT_METHODS,
  );
  const addressLine1 = textField(formData, "address_line1", "Street address or community", 180);
  const city = textField(formData, "city", "City or district", 100);
  const parish = textField(formData, "parish", "Parish", 80);
  const emergencyContactName = textField(formData, "emergency_contact_name", "Emergency contact name", 120);
  const emergencyContactPhone = textField(formData, "emergency_contact_phone", "Emergency contact phone", 32);
  const jobTitle = textField(formData, "job_title", "Job title", 120);
  const employer = textField(formData, "employer", "Employer or business", 140);
  const occupation = textField(formData, "occupation", "Occupation or profession", 140);
  const professionalBio = textField(formData, "professional_bio", "Professional bio", 1200);

  const invalidField = [
    firstName,
    lastName,
    phone,
    dateOfBirth,
    gender,
    maritalStatus,
    preferredContact,
    addressLine1,
    city,
    parish,
    emergencyContactName,
    emergencyContactPhone,
    jobTitle,
    employer,
    occupation,
    professionalBio,
  ].find((field) => field.error);
  if (invalidField?.error) return { status: "error", message: invalidField.error };

  if (!isValidPhone(phone.value) || !isValidPhone(emergencyContactPhone.value)) {
    return { status: "error", message: "Enter a valid phone number using 7 to 15 digits." };
  }

  const today = new Date().toISOString().slice(0, 10);
  if (dateOfBirth.value && (dateOfBirth.value > today || dateOfBirth.value < "1900-01-01")) {
    return { status: "error", message: "Enter a date of birth between 1900 and today." };
  }

  if (Boolean(emergencyContactName.value) !== Boolean(emergencyContactPhone.value)) {
    return { status: "error", message: "Add both a name and phone number for your emergency contact." };
  }

  if (preferredContact.value && preferredContact.value !== "email" && !phone.value) {
    return { status: "error", message: "Add your phone number to use that preferred contact method." };
  }

  const openToProfessionalRequests = formData.get("open_to_professional_requests") === "on";
  if (openToProfessionalRequests && !occupation.value) {
    return { status: "error", message: "Add your occupation before joining the professional directory." };
  }

  const { data: updatedProfile, error } = await supabase
    .from("profiles")
    .update({
      first_name: firstName.value,
      last_name: lastName.value,
      phone: phone.value,
      date_of_birth: dateOfBirth.value,
      gender: gender.value,
      marital_status: maritalStatus.value,
      preferred_contact_method: preferredContact.value,
      address_line1: addressLine1.value,
      city: city.value,
      parish: parish.value,
      emergency_contact_name: emergencyContactName.value,
      emergency_contact_phone: emergencyContactPhone.value,
      communication_email_opt_in: formData.get("communication_email_opt_in") === "on",
      communication_sms_opt_in: formData.get("communication_sms_opt_in") === "on",
      job_title: jobTitle.value,
      employer: employer.value,
      occupation: occupation.value,
      professional_bio: professionalBio.value,
      open_to_professional_requests: openToProfessionalRequests,
    })
    .eq("id", profile.id)
    .eq("auth_user_id", profile.authUserId)
    .select("id")
    .maybeSingle();

  if (error || !updatedProfile) {
    console.error("Member profile update failed", error?.code ?? "no_matching_profile");
    return { status: "error", message: "We couldn't save your profile. Please try again." };
  }
  revalidatePath("/member/profile");
  revalidatePath("/member");
  revalidatePath("/member/directory");
  revalidatePath("/admin/profile");
  revalidatePath("/pastor/profile");
  if (formData.get("onboarding") === "1") redirect("/member");
  return { status: "success", message: "Profile updated." };
}

const AVATAR_MAX_BYTES = 5 * 1024 * 1024;
const AVATAR_EXT_BY_TYPE: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

/**
 * Uploads to the private member-avatars bucket, into the caller's own
 * auth-user-id folder — the only folder their Storage RLS policy
 * ("member-avatars own read/write") lets them touch — then points
 * profiles.avatar_path at it. Old files aren't left behind: each upload
 * reuses the same fixed filename per type and any previous file under a
 * different extension is removed first.
 */
export async function uploadAvatar(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const supabase = await createClient();
  const profile = await requireProfileId(supabase);
  if (!profile) return { status: "error", message: "Please sign in again." };

  const file = formData.get("avatar");
  if (!(file instanceof File) || file.size === 0) {
    return { status: "error", message: "Choose a photo to upload." };
  }
  if (file.size > AVATAR_MAX_BYTES) {
    return { status: "error", message: "Please choose a photo under 5 MB." };
  }
  const ext = AVATAR_EXT_BY_TYPE[file.type];
  if (!ext) return { status: "error", message: "Please upload a JPG, PNG, or WEBP photo." };

  const folder = profile.authUserId;
  const path = `${folder}/avatar.${ext}`;

  // Clean up a previous photo saved under a different extension, so
  // switching from a .png to a .jpg doesn't leave the old file behind.
  const otherExts = Object.values(AVATAR_EXT_BY_TYPE).filter((e) => e !== ext);
  await supabase.storage.from("member-avatars").remove(otherExts.map((e) => `${folder}/avatar.${e}`));

  const { error: uploadError } = await supabase.storage
    .from("member-avatars")
    .upload(path, file, { upsert: true, contentType: file.type });
  if (uploadError) return { status: "error", message: "We couldn't upload that photo. Please try again." };

  const { error: profileError } = await supabase.from("profiles").update({ avatar_path: path }).eq("id", profile.id);
  if (profileError) return { status: "error", message: "The photo uploaded, but we couldn't save it to your profile." };

  revalidatePath("/member/profile");
  revalidatePath("/member");
  revalidatePath("/admin/profile");
  revalidatePath("/pastor/profile");
  revalidatePath("/admin");
  revalidatePath("/pastor");
  return { status: "success", message: "Profile photo updated." };
}

export async function removeAvatar(): Promise<ActionState> {
  const supabase = await createClient();
  const profile = await requireProfileId(supabase);
  if (!profile) return { status: "error", message: "Please sign in again." };

  const allExts = Object.values(AVATAR_EXT_BY_TYPE);
  await supabase.storage.from("member-avatars").remove(allExts.map((e) => `${profile.authUserId}/avatar.${e}`));
  await supabase.from("profiles").update({ avatar_path: null }).eq("id", profile.id);

  revalidatePath("/member/profile");
  revalidatePath("/member");
  revalidatePath("/admin/profile");
  revalidatePath("/pastor/profile");
  revalidatePath("/admin");
  revalidatePath("/pastor");
  return { status: "success", message: "Profile photo removed." };
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
