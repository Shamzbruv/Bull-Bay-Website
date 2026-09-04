"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/auth/session";
import type { ActionState } from "@/app/(public)/actions";

// Every write here relies on RLS ("profile_id = current_profile_id() OR
// staff with pastoral_calendar.manage") to enforce who can touch what — the
// app code only ever writes profile_id = the signed-in person's own id.

async function getTeamContext() {
  const profile = await getCurrentProfile();
  if (!profile) return null;
  const supabase = await createClient();
  const { data: teamMember } = await supabase
    .from("pastoral_team_members")
    .select("id")
    .eq("profile_id", profile.id)
    .eq("is_active", true)
    .maybeSingle();
  return teamMember ? { profile, supabase } : null;
}

export async function addAvailability(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const context = await getTeamContext();
  if (!context) return { status: "error", message: "Only active pastoral-team members can publish availability." };
  const { profile, supabase } = context;

  const dayOfWeek = Number(formData.get("day_of_week"));
  const startTime = String(formData.get("start_time") || "");
  const endTime = String(formData.get("end_time") || "");
  const label = String(formData.get("label") || "").trim();
  if (Number.isNaN(dayOfWeek) || !startTime || !endTime) return { status: "error", message: "Fill in the day and both times." };
  if (endTime <= startTime) return { status: "error", message: "End time must be after start time." };

  const { error } = await supabase.from("pastoral_calendar_availability").insert({
    profile_id: profile.id,
    day_of_week: dayOfWeek,
    start_time: startTime,
    end_time: endTime,
    label: label || null,
  });
  if (error) return { status: "error", message: "Couldn't save those hours." };

  revalidatePath("/member/team-calendar");
  revalidatePath("/member/counsel");
  return { status: "success", message: "Hours added." };
}

export async function removeAvailability(id: string): Promise<ActionState> {
  const context = await getTeamContext();
  if (!context) return { status: "error", message: "Only active pastoral-team members can change availability." };
  const { profile, supabase } = context;
  const { error } = await supabase.from("pastoral_calendar_availability").delete().eq("profile_id", profile.id).eq("id", id);
  if (error) return { status: "error", message: "Those hours could not be removed." };
  revalidatePath("/member/team-calendar");
  revalidatePath("/member/counsel");
  return { status: "success", message: "Hours removed." };
}

export async function addCalendarEvent(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const context = await getTeamContext();
  if (!context) return { status: "error", message: "Only active pastoral-team members can edit this calendar." };
  const { profile, supabase } = context;

  const title = String(formData.get("title") || "").trim();
  const kind = String(formData.get("kind") || "busy");
  const visibility = String(formData.get("visibility") || "public");
  const startsAt = String(formData.get("starts_at") || "");
  const endsAt = String(formData.get("ends_at") || "");
  if (!title || !startsAt || !endsAt) return { status: "error", message: "Fill in the title and both dates." };
  if (!new Set(["day_off", "busy", "appointment"]).has(kind) || !new Set(["public", "private"]).has(visibility)) {
    return { status: "error", message: "Choose a valid calendar type and visibility." };
  }
  const start = new Date(`${startsAt}:00-05:00`);
  const end = new Date(`${endsAt}:00-05:00`);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end <= start) {
    return { status: "error", message: "End must be after start." };
  }

  const { data: conflicts } = await supabase
    .from("pastoral_calendar_events")
    .select("id")
    .eq("profile_id", profile.id)
    .lt("starts_at", end.toISOString())
    .gt("ends_at", start.toISOString())
    .limit(1);
  if (conflicts && conflicts.length > 0) return { status: "error", message: "That entry overlaps something already on your calendar." };

  const { error } = await supabase.from("pastoral_calendar_events").insert({
    profile_id: profile.id,
    title,
    kind,
    visibility,
    starts_at: start.toISOString(),
    ends_at: end.toISOString(),
  });
  if (error) return { status: "error", message: "Couldn't save that calendar entry." };

  revalidatePath("/member/team-calendar");
  revalidatePath("/member/counsel");
  return { status: "success", message: "Added to your calendar." };
}

export async function removeCalendarEvent(id: string): Promise<ActionState> {
  const context = await getTeamContext();
  if (!context) return { status: "error", message: "Only active pastoral-team members can edit this calendar." };
  const { profile, supabase } = context;
  const { data: event } = await supabase
    .from("pastoral_calendar_events")
    .select("kind")
    .eq("profile_id", profile.id)
    .eq("id", id)
    .maybeSingle();
  if (event?.kind === "appointment") return { status: "error", message: "Manage counselling appointments from the request inbox." };
  const { error } = await supabase.from("pastoral_calendar_events").delete().eq("profile_id", profile.id).eq("id", id);
  if (error) return { status: "error", message: "That calendar entry could not be removed." };
  revalidatePath("/member/team-calendar");
  revalidatePath("/member/counsel");
  return { status: "success", message: "Calendar entry removed." };
}
