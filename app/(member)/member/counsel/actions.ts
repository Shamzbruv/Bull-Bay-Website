"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile, getOrganizationId } from "@/lib/auth/session";
import { COUNSEL_REQUEST_REASONS } from "@/lib/pastoral/reasons";
import type { ActionState } from "@/app/(public)/actions";

export async function submitCounselRequest(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const organizationId = await getOrganizationId();
  const profile = await getCurrentProfile();
  if (!organizationId || !profile) return { status: "error", message: "Please sign in again." };

  const requestedWith = String(formData.get("requested_with_profile_id") || "").trim() || null;
  const reason = String(formData.get("reason") || "").trim();
  const details = String(formData.get("details") || "").trim();
  const preferredDate = String(formData.get("preferred_date") || "").trim() || null;
  const preferredTime = String(formData.get("preferred_time") || "").trim() || null;

  if (!COUNSEL_REQUEST_REASONS.includes(reason as (typeof COUNSEL_REQUEST_REASONS)[number])) {
    return { status: "error", message: "Please choose a valid reason." };
  }

  const supabase = await createClient();
  if (!requestedWith) return { status: "error", message: "Choose a member of the pastoral team." };
  const { data: requestedTeamMember } = await supabase
    .from("pastoral_team_members")
    .select("profile_id")
    .eq("organization_id", organizationId)
    .eq("profile_id", requestedWith)
    .eq("is_active", true)
    .maybeSingle();
  if (!requestedTeamMember) return { status: "error", message: "That pastoral team member is not currently available for requests." };

  if (preferredDate && preferredDate < new Date().toLocaleDateString("en-CA", { timeZone: "America/Jamaica" })) {
    return { status: "error", message: "Choose today or a future date." };
  }

  // Outside published hours (or on a published day off) → flagged urgent so
  // it stands out to whoever picks it up, rather than silently waiting for
  // a slot that was never actually open.
  let isUrgent = false;
  if (requestedWith && preferredDate) {
    const dayOfWeek = new Date(`${preferredDate}T12:00:00-05:00`).getUTCDay();
    const { data: availability } = await supabase
      .from("pastoral_calendar_availability")
      .select("start_time, end_time")
      .eq("profile_id", requestedWith)
      .eq("day_of_week", dayOfWeek);

    if (!availability || availability.length === 0) {
      isUrgent = true;
    } else if (preferredTime) {
      const withinHours = availability.some((a) => preferredTime >= a.start_time.slice(0, 5) && preferredTime <= a.end_time.slice(0, 5));
      if (!withinHours) isUrgent = true;
    }

    const { data: dayOff } = await supabase
      .from("pastoral_calendar_events")
      .select("id")
      .eq("profile_id", requestedWith)
      .eq("kind", "day_off")
      .lt("starts_at", `${preferredDate}T23:59:59-05:00`)
      .gt("ends_at", `${preferredDate}T00:00:00-05:00`);
    if (dayOff && dayOff.length > 0) isUrgent = true;
  }

  const { error } = await supabase.from("counsel_requests").insert({
    organization_id: organizationId,
    requester_profile_id: profile.id,
    requested_with_profile_id: requestedWith,
    reason,
    details: details || null,
    is_urgent: isUrgent,
    preferred_date: preferredDate,
    preferred_time: preferredTime,
  });
  if (error) return { status: "error", message: "We couldn't send that request. Please try again." };

  revalidatePath("/member/counsel");
  return {
    status: "success",
    message: isUrgent
      ? "Sent — marked as urgent since it falls outside their published hours. They'll get back to you as soon as they can."
      : "Your request has been sent. You'll be notified once it's scheduled.",
  };
}
