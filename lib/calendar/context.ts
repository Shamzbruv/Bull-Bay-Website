import { getCurrentProfile, getUserPermissions } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";

export async function getCalendarContext(targetId?: string) {
  const current = await getCurrentProfile();
  if (!current) return null;
  const supabase = await createClient();
  const permissions = await getUserPermissions(current.organization_id);
  let profile = current;
  if (targetId && targetId !== current.id) {
    if (!permissions.has("pastoral_calendar.manage")) return null;
    const { data: target } = await supabase.from("profiles").select("*").eq("organization_id", current.organization_id).eq("id", targetId).maybeSingle();
    if (!target) return null;
    profile = target;
  }
  const { data: teamMember } = await supabase.from("pastoral_team_members").select("id, role_title, is_pastor").eq("organization_id", current.organization_id).eq("profile_id", profile.id).eq("is_active", true).maybeSingle();
  if (!teamMember || (profile.id !== current.id && !teamMember.is_pastor)) return null;
  return { profile, current, supabase, teamMember, permissions };
}
