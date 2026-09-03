"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/auth/session";
import type { ActionState } from "@/app/(public)/actions";

// Every write here relies on RLS ("profile_id = current_profile_id() OR
// staff with pastoral_calendar.manage") to enforce who can touch what — the
// app code only ever writes profile_id = the signed-in person's own id.

export async function addAvailability(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const profile = await getCurrentProfile();
  if (!profile) return { status: "error", message: "Please sign in again." };

  const dayOfWeek = Number(formData.get("day_of_week"));
  const startTime = String(formData.get("start_time") || "");
  const endTime = String(formData.get("end_time") || "");
  const label = String(formData.get("label") || "").trim();
  if (Number.isNaN(dayOfWeek) || !startTime || !endTime) return { status: "error", message: "Fill in the day and both times." };
  if (endTime <= startTime) return { status: "error", message: "End time must be after start time." };

  const supabase = await createClient();
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

export async function removeAvailability(id: string): Promise<void> {
  const supabase = await createClient();
  await supabase.from("pastoral_calendar_availability").delete().eq("id", id);
  revalidatePath("/member/team-calendar");
  revalidatePath("/member/counsel");
}

export async function addCalendarEvent(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const profile = await getCurrentProfile();
  if (!profile) return { status: "error", message: "Please sign in again." };

  const title = String(formData.get("title") || "").trim();
  const kind = String(formData.get("kind") || "busy");
  const visibility = String(formData.get("visibility") || "public");
  const startsAt = String(formData.get("starts_at") || "");
  const endsAt = String(formData.get("ends_at") || "");
  if (!title || !startsAt || !endsAt) return { status: "error", message: "Fill in the title and both dates." };
  if (new Date(endsAt) <= new Date(startsAt)) return { status: "error", message: "End must be after start." };

  const supabase = await createClient();
  const { error } = await supabase.from("pastoral_calendar_events").insert({
    profile_id: profile.id,
    title,
    kind,
    visibility,
    starts_at: new Date(startsAt).toISOString(),
    ends_at: new Date(endsAt).toISOString(),
  });
  if (error) return { status: "error", message: "Couldn't save that calendar entry." };

  revalidatePath("/member/team-calendar");
  revalidatePath("/member/counsel");
  return { status: "success", message: "Added to your calendar." };
}

export async function removeCalendarEvent(id: string): Promise<void> {
  const supabase = await createClient();
  await supabase.from("pastoral_calendar_events").delete().eq("id", id);
  revalidatePath("/member/team-calendar");
  revalidatePath("/member/counsel");
}
