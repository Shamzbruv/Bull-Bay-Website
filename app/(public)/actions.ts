"use server";

import { createClient } from "@/lib/supabase/server";
import { getOrganizationId } from "@/lib/auth/session";
import { parseJmdToMinorUnits } from "@/lib/money";
import { revalidatePath } from "next/cache";

export type ActionState = { status: "idle" | "success" | "error"; message: string };

export const initialActionState: ActionState = { status: "idle", message: "" };

async function currentProfileId() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { user: null, profileId: null };
  const { data: profile } = await supabase
    .from("profiles")
    .select("id, email, first_name, last_name")
    .eq("auth_user_id", user.id)
    .maybeSingle();
  return { user, profileId: profile?.id ?? null, profile };
}

export async function submitPrayerRequest(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const organizationId = await getOrganizationId();
  if (!organizationId) return { status: "error", message: "Something went wrong. Please try again." };

  const name = String(formData.get("name") || "").trim();
  const contact = String(formData.get("contact") || "").trim();
  const request = String(formData.get("request") || "").trim();
  const confidential = formData.get("confidential") === "on";

  if (!request) return { status: "error", message: "Please share your prayer request." };

  const supabase = await createClient();
  const { user, profileId } = await currentProfileId();
  const { error } = await supabase.from("prayer_requests").insert({
    organization_id: organizationId,
    submitter_profile_id: profileId,
    submitter_name: name || null,
    submitter_contact: contact || (user?.email ?? null),
    request_body: request,
    visibility: confidential ? "confidential" : "prayer_team",
  });

  if (error) return { status: "error", message: "We couldn't send your request. Please try again." };
  return {
    status: "success",
    message: "Your prayer request has been received. Our prayer team will be standing with you.",
  };
}

export async function submitConnectionCard(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const organizationId = await getOrganizationId();
  if (!organizationId) return { status: "error", message: "Something went wrong. Please try again." };

  const firstName = String(formData.get("firstName") || "").trim();
  const lastName = String(formData.get("lastName") || "").trim();
  const email = String(formData.get("email") || "").trim();
  const phone = String(formData.get("phone") || "").trim();
  const interest = String(formData.get("interest") || "").trim();
  const message = String(formData.get("message") || "").trim();

  if (!firstName || !lastName || !email) {
    return { status: "error", message: "Please fill in your name and email." };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("contact_submissions").insert({
    organization_id: organizationId,
    kind: "connection_card",
    first_name: firstName,
    last_name: lastName,
    email,
    phone: phone || null,
    interest: interest || null,
    message: message || null,
  });

  if (error) return { status: "error", message: "We couldn't send your message. Please try again." };
  return { status: "success", message: "Thanks for reaching out! A member of our team will be in touch soon." };
}

export async function registerForEvent(
  eventId: string,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const supabase = await createClient();
  const { profileId } = await currentProfileId();

  const guestName = String(formData.get("guestName") || "").trim();
  const guestEmail = String(formData.get("guestEmail") || "").trim();
  const quantityRaw = Number(formData.get("quantity") || 1);
  const quantity = Number.isFinite(quantityRaw) && quantityRaw > 0 ? Math.floor(quantityRaw) : 1;

  if (!profileId && (!guestName || !guestEmail)) {
    return { status: "error", message: "Please provide your name and email to register." };
  }

  const { error } = await supabase.from("event_registrations").insert({
    event_id: eventId,
    profile_id: profileId,
    guest_name: profileId ? null : guestName,
    guest_email: profileId ? null : guestEmail,
    quantity,
  });

  if (error) return { status: "error", message: "We couldn't complete your registration. Please try again." };
  revalidatePath("/events");
  return { status: "success", message: "You're registered! We look forward to seeing you there." };
}

export async function joinGroup(groupId: string, _prev: ActionState): Promise<ActionState> {
  const { user, profileId } = await currentProfileId();
  if (!user || !profileId) {
    return { status: "error", message: "Please sign in first so a group leader can follow up with you." };
  }
  const supabase = await createClient();
  const { error } = await supabase
    .from("group_members")
    .insert({ group_id: groupId, profile_id: profileId, status: "requested" });

  if (error) {
    if (error.code === "23505") return { status: "success", message: "You've already requested to join this group." };
    return { status: "error", message: "Something went wrong. Please try again." };
  }
  return { status: "success", message: "Request sent! A group leader will follow up with you soon." };
}

export async function applyForShift(shiftId: string, _prev: ActionState): Promise<ActionState> {
  const { user, profileId } = await currentProfileId();
  if (!user || !profileId) {
    return { status: "error", message: "Please sign in first to sign up for a serving shift." };
  }
  const supabase = await createClient();
  const { error } = await supabase.from("volunteer_assignments").insert({
    shift_id: shiftId,
    profile_id: profileId,
    status: "confirmed",
    responded_at: new Date().toISOString(),
  });

  if (error) {
    if (error.code === "23505") return { status: "success", message: "You're already signed up for this shift." };
    return { status: "error", message: "Something went wrong. Please try again." };
  }
  return { status: "success", message: "You're signed up to serve. Thank you!" };
}

export async function submitGivingIntent(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const organizationId = await getOrganizationId();
  if (!organizationId) return { status: "error", message: "Something went wrong. Please try again." };

  const amountMinor = parseJmdToMinorUnits(String(formData.get("amount") || ""));
  const fundId = String(formData.get("fundId") || "");
  if (!amountMinor || amountMinor <= 0) return { status: "error", message: "Please enter a valid amount." };
  if (!fundId) return { status: "error", message: "Please choose a fund to give to." };

  const supabase = await createClient();
  const { profileId, profile } = await currentProfileId();
  const guestName = String(formData.get("donorName") || "").trim();
  const guestEmail = String(formData.get("donorEmail") || "").trim();

  const { data: donation, error } = await supabase
    .from("donations")
    .insert({
      organization_id: organizationId,
      donor_profile_id: profileId,
      donor_name: profileId ? `${profile?.first_name ?? ""} ${profile?.last_name ?? ""}`.trim() || null : guestName || null,
      donor_email: profileId ? profile?.email ?? null : guestEmail || null,
      amount_minor: amountMinor,
      status: "pending",
    })
    .select("id")
    .single();

  if (error || !donation) return { status: "error", message: "We couldn't record your gift. Please try again." };

  const { error: allocationError } = await supabase
    .from("donation_allocations")
    .insert({ donation_id: donation.id, fund_id: fundId, amount_minor: amountMinor });

  if (allocationError) return { status: "error", message: "We couldn't record your gift. Please try again." };

  return {
    status: "success",
    message:
      "Thank you! Online payment is being finalized as we set up a Jamaican payment provider. Our office will follow up, or you're welcome to give in person or by bank transfer in the meantime.",
  };
}
