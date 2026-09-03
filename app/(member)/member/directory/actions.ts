"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile, getOrganizationId } from "@/lib/auth/session";
import type { ActionState } from "@/app/(public)/actions";

export async function sendHelpRequest(targetProfileId: string, _prev: ActionState, formData: FormData): Promise<ActionState> {
  const organizationId = await getOrganizationId();
  const profile = await getCurrentProfile();
  if (!organizationId || !profile) return { status: "error", message: "Please sign in again." };

  const message = String(formData.get("message") || "").trim();
  if (!message) return { status: "error", message: "Let them know what you need help with." };

  const supabase = await createClient();
  const { error } = await supabase.from("professional_help_requests").insert({
    organization_id: organizationId,
    requester_profile_id: profile.id,
    target_profile_id: targetProfileId,
    message,
  });
  if (error) return { status: "error", message: "Couldn't send that request. Please try again." };

  revalidatePath("/member/directory");
  return { status: "success", message: "Sent — they'll see it on their dashboard." };
}

export async function updateHelpRequestStatus(requestId: string, status: "responded" | "closed"): Promise<void> {
  const supabase = await createClient();
  await supabase.from("professional_help_requests").update({ status }).eq("id", requestId);
  revalidatePath("/member/directory");
}
