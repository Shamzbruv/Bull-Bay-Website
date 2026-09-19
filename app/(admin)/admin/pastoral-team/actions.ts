"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getOrganizationId, getUserPermissions } from "@/lib/auth/session";
import type { ActionState } from "@/app/(public)/actions";

async function requireCalendarManage() {
  const organizationId = await getOrganizationId();
  const permissions = organizationId ? await getUserPermissions(organizationId) : new Set<string>();
  return { organizationId, allowed: permissions.has("pastoral_calendar.manage") };
}

/**
 * The page's own instruction is "mark exactly one person as the Senior
 * Pastor" — nothing enforced that. Every other screen that asks "who is
 * the pastor" (the pastor & calendar page, counsel-request routing, the
 * church directory) picks the first row matching is_pastor=true and
 * is_active=true and trusts there is only one. Two checked boxes didn't
 * error; it silently made whichever row sorted first "the" pastor while
 * the other one's calendar sat there unreachable — which is exactly the
 * bug that was reported. Called before writing a new is_pastor=true row,
 * this clears the flag everywhere else in the org first, so the checkbox
 * behaves like the radio button the copy already describes it as.
 */
async function clearOtherPastors(
  supabase: Awaited<ReturnType<typeof createClient>>,
  organizationId: string,
  keep: { id: string } | { profileId: string },
) {
  let query = supabase.from("pastoral_team_members").update({ is_pastor: false }).eq("organization_id", organizationId).eq("is_pastor", true);
  query = "id" in keep ? query.neq("id", keep.id) : query.neq("profile_id", keep.profileId);
  const { error } = await query;
  return error;
}

export async function addPastoralTeamMember(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const { organizationId, allowed } = await requireCalendarManage();
  if (!organizationId || !allowed) return { status: "error", message: "You don't have permission to do this." };

  const email = String(formData.get("email") || "").trim();
  const roleTitle = String(formData.get("role_title") || "").trim();
  const isPastor = formData.get("is_pastor") === "on";
  const isTrainedCounselor = formData.get("is_trained_counselor") === "on";
  const bio = String(formData.get("bio") || "").trim();
  if (!email || !roleTitle) return { status: "error", message: "Enter the member's email and a role title." };

  const supabase = await createClient();
  const { data: profile } = await supabase.from("profiles").select("id, first_name, last_name").eq("organization_id", organizationId).eq("email", email.toLowerCase()).maybeSingle();
  if (!profile) return { status: "error", message: "No member found with that email. They need an account first." };

  if (isPastor) {
    const clearError = await clearOtherPastors(supabase, organizationId, { profileId: profile.id });
    if (clearError) return { status: "error", message: "Couldn't update the previous Senior Pastor's record." };
  }

  const { error } = await supabase.from("pastoral_team_members").upsert(
    {
      organization_id: organizationId,
      profile_id: profile.id,
      role_title: roleTitle,
      is_pastor: isPastor,
      is_trained_counselor: isTrainedCounselor,
      bio: bio || null,
      is_active: true,
    },
    { onConflict: "organization_id,profile_id" },
  );
  if (error) return { status: "error", message: "Couldn't save this team member." };

  revalidatePath("/admin/pastoral-team");
  const name = `${profile.first_name ?? ""} ${profile.last_name ?? ""}`.trim() || email;
  return { status: "success", message: `${name} added to the pastoral team.` };
}

export async function updatePastoralTeamMember(id: string, _prev: ActionState, formData: FormData): Promise<ActionState> {
  const { organizationId, allowed } = await requireCalendarManage();
  if (!organizationId || !allowed) return { status: "error", message: "You don't have permission to do this." };

  const roleTitle = String(formData.get("role_title") || "").trim();
  const bio = String(formData.get("bio") || "").trim();
  const isPastor = formData.get("is_pastor") === "on";
  if (!roleTitle) return { status: "error", message: "Enter a role title." };

  const supabase = await createClient();

  if (isPastor) {
    const clearError = await clearOtherPastors(supabase, organizationId, { id });
    if (clearError) return { status: "error", message: "Couldn't update the previous Senior Pastor's record." };
  }

  const { error } = await supabase
    .from("pastoral_team_members")
    .update({ role_title: roleTitle, bio: bio || null, is_pastor: isPastor })
    .eq("organization_id", organizationId)
    .eq("id", id);
  if (error) return { status: "error", message: "Couldn't save those changes." };

  revalidatePath("/admin/pastoral-team");
  revalidatePath("/member/counsel");
  revalidatePath("/pastor/calendar");
  return { status: "success", message: isPastor ? "Updated. Any previous Senior Pastor was unmarked." : "Updated." };
}

export async function toggleTeamMemberActive(id: string, isActive: boolean): Promise<void> {
  const { organizationId, allowed } = await requireCalendarManage();
  if (!organizationId || !allowed) return;
  const supabase = await createClient();
  // Reactivating a row that still carries is_pastor=true from before it was
  // deactivated would otherwise recreate the two-active-pastors bug this
  // whole file was fixed for — clear any other active pastor first, same
  // as marking someone pastor from the edit form does.
  const { data: row } = await supabase.from("pastoral_team_members").select("is_pastor").eq("organization_id", organizationId).eq("id", id).maybeSingle();
  if (isActive && row?.is_pastor) await clearOtherPastors(supabase, organizationId, { id });
  await supabase.from("pastoral_team_members").update({ is_active: isActive }).eq("organization_id", organizationId).eq("id", id);
  revalidatePath("/admin/pastoral-team");
  revalidatePath("/pastor/calendar");
}

export async function toggleTeamMemberCounselor(id: string, value: boolean): Promise<void> {
  const { allowed } = await requireCalendarManage();
  if (!allowed) return;
  const supabase = await createClient();
  await supabase.from("pastoral_team_members").update({ is_trained_counselor: value }).eq("id", id);
  revalidatePath("/admin/pastoral-team");
  revalidatePath("/member/counsel");
}
