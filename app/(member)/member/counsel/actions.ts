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

  if (!preferredDate || !preferredTime) return { status: "error", message: "Choose an available date and time." };
  const { error } = await supabase.from("counsel_requests").insert({
    organization_id: organizationId,
    requester_profile_id: profile.id,
    requested_with_profile_id: requestedWith,
    reason,
    details: details || null,
    is_urgent: false,
    preferred_date: preferredDate,
    preferred_time: preferredTime,
  });
  if (error) return { status: "error", message: error.message };

  revalidatePath("/member/counsel");
  return {
    status: "success",
    message: "Your request has been sent. You will be notified when it is confirmed.",
  };
}

export async function cancelMyCounselRequest(requestId: string): Promise<ActionState> {
  const profile = await getCurrentProfile();
  if (!profile) return { status: "error", message: "Please sign in." };
  const supabase = await createClient();
  const { data } = await supabase.from("counsel_requests").select("requester_profile_id").eq("id", requestId).maybeSingle();
  if (data?.requester_profile_id !== profile.id) return { status: "error", message: "Request not found." };
  const { error } = await supabase.rpc("respond_counsel_request", { request_id: requestId, decision: "cancelled" });
  revalidatePath("/", "layout");
  return error ? { status: "error", message: error.message } : { status: "success", message: "Request cancelled." };
}
