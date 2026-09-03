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
  const { data: profile } = await supabase.from("profiles").select("id, first_name, last_name").eq("email", email).maybeSingle();
  if (!profile) return { status: "error", message: "No member found with that email. They need an account first." };

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

export async function toggleTeamMemberActive(id: string, isActive: boolean): Promise<void> {
  const { allowed } = await requireCalendarManage();
  if (!allowed) return;
  const supabase = await createClient();
  await supabase.from("pastoral_team_members").update({ is_active: isActive }).eq("id", id);
  revalidatePath("/admin/pastoral-team");
}

export async function toggleTeamMemberCounselor(id: string, value: boolean): Promise<void> {
  const { allowed } = await requireCalendarManage();
  if (!allowed) return;
  const supabase = await createClient();
  await supabase.from("pastoral_team_members").update({ is_trained_counselor: value }).eq("id", id);
  revalidatePath("/admin/pastoral-team");
  revalidatePath("/member/counsel");
}
