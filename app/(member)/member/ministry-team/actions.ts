"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/auth/session";
import type { ActionState } from "@/app/(public)/actions";

async function requireLeaderOf(ministryId: string) {
  const profile = await getCurrentProfile();
  if (!profile) return { allowed: false as const };
  const supabase = await createClient();
  const { data: ministry } = await supabase
    .from("ministries")
    .select("id, organization_id")
    .eq("id", ministryId)
    .eq("leader_profile_id", profile.id)
    .maybeSingle();
  return ministry ? { allowed: true as const, supabase, profile, organizationId: ministry.organization_id } : { allowed: false as const };
}

/** Only the description — name/slug/icon stay with the staff-only
 * Admin > Ministries editor (content.manage). This is the one column a
 * ministry's own leader can change, matching what the RLS policy that
 * backs this was written to allow (see
 * 20260911230000_ministry_editing_and_leader_teams.sql). */
export async function updateMinistryDescription(ministryId: string, _prev: ActionState, formData: FormData): Promise<ActionState> {
  const check = await requireLeaderOf(ministryId);
  if (!check.allowed) return { status: "error", message: "You don't lead this ministry." };

  const description = String(formData.get("description") || "").trim();
  const { error } = await check.supabase.from("ministries").update({ description: description || null }).eq("id", ministryId);
  if (error) return { status: "error", message: "Couldn't save that description." };

  revalidatePath("/member/ministry-team");
  revalidatePath("/ministries");
  return { status: "success", message: "Saved — this now shows on the public Ministries page." };
}

/**
 * Adds an unlinked roster entry by name, not by picking a member profile
 * — a leader identifying "Sister Brown" by name isn't proof of who's
 * actually behind that name. Linking a roster entry to a verified
 * account stays a staff-only action (Admin > Ministry Assignments),
 * matching the rule the ministry_assignments table itself documents.
 */
export async function addTeamMember(ministryId: string, _prev: ActionState, formData: FormData): Promise<ActionState> {
  const check = await requireLeaderOf(ministryId);
  if (!check.allowed) return { status: "error", message: "You don't lead this ministry." };

  const displayName = String(formData.get("display_name") || "").trim();
  const positionTitle = String(formData.get("position_title") || "").trim();
  if (!displayName || !positionTitle) return { status: "error", message: "Enter a name and their role on the team." };

  const { error } = await check.supabase.from("ministry_assignments").insert({
    organization_id: check.organizationId,
    ministry_id: ministryId,
    display_name: displayName,
    position_title: positionTitle,
    public_visible: formData.get("public_visible") === "on",
    is_active: true,
    created_by: check.profile.auth_user_id,
  });
  if (error) return { status: "error", message: "Couldn't add this team member." };

  revalidatePath("/member/ministry-team");
  revalidatePath("/ministries");
  return { status: "success", message: "Added to your team." };
}

export async function toggleTeamMemberVisible(assignmentId: string, ministryId: string, publicVisible: boolean): Promise<void> {
  const check = await requireLeaderOf(ministryId);
  if (!check.allowed) return;
  await check.supabase.from("ministry_assignments").update({ public_visible: publicVisible }).eq("id", assignmentId).eq("ministry_id", ministryId);
  revalidatePath("/member/ministry-team");
  revalidatePath("/ministries");
}

export async function removeTeamMember(assignmentId: string, ministryId: string): Promise<void> {
  const check = await requireLeaderOf(ministryId);
  if (!check.allowed) return;
  await check.supabase.from("ministry_assignments").delete().eq("id", assignmentId).eq("ministry_id", ministryId);
  revalidatePath("/member/ministry-team");
  revalidatePath("/ministries");
}
