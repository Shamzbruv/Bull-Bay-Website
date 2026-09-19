"use server";

import { revalidatePath } from "next/cache";
import { getCalendarContext } from "@/lib/calendar/context";
import { notifyUser } from "@/lib/notifications";
import type { ActionState } from "@/app/(public)/actions";

const CALENDAR_KINDS = new Set(["day_off", "busy", "appointment", "meeting"]);

export async function addAvailability(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const context = await getCalendarContext(String(formData.get("profile_id") || ""));
  if (!context) return { status: "error", message: "Only active pastoral-team members can publish availability." };
  const { profile, supabase } = context;

  const dayOfWeek = Number(formData.get("day_of_week"));
  const startTime = String(formData.get("start_time") || "");
  const endTime = String(formData.get("end_time") || "");
  const label = String(formData.get("label") || "").trim();
  if (!Number.isInteger(dayOfWeek) || dayOfWeek < 0 || dayOfWeek > 6 || !startTime || !endTime) return { status: "error", message: "Fill in the day and both times." };
  if (endTime <= startTime) return { status: "error", message: "End time must be after start time." };

  const { error } = await supabase.from("pastoral_calendar_availability").insert({
    profile_id: profile.id,
    day_of_week: dayOfWeek,
    start_time: startTime,
    end_time: endTime,
    label: label || null,
  });
  if (error) return { status: "error", message: error.code === "23P01" ? "Those hours overlap existing availability." : "Couldn't save those hours." };

  revalidatePath("/member/team-calendar");
  revalidatePath("/pastor/calendar");
  revalidatePath("/member/counsel");
  return { status: "success", message: "Hours added." };
}

export async function removeAvailability(id: string, profileId?: string): Promise<ActionState> {
  const context = await getCalendarContext(profileId);
  if (!context) return { status: "error", message: "Only active pastoral-team members can change availability." };
  const { profile, supabase } = context;
  const { error } = await supabase.from("pastoral_calendar_availability").delete().eq("profile_id", profile.id).eq("id", id);
  if (error) return { status: "error", message: "Those hours could not be removed." };
  revalidatePath("/member/team-calendar");
  revalidatePath("/pastor/calendar");
  revalidatePath("/member/counsel");
  return { status: "success", message: "Hours removed." };
}

export async function addCalendarEvent(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const context = await getCalendarContext(String(formData.get("profile_id") || ""));
  if (!context) return { status: "error", message: "Only active pastoral-team members can edit this calendar." };
  const { profile, current, supabase } = context;

  const title = String(formData.get("title") || "").trim();
  const kind = String(formData.get("kind") || "busy");
  const visibility = String(formData.get("visibility") || "public");
  const startsAt = String(formData.get("starts_at") || "");
  const endsAt = String(formData.get("ends_at") || "");
  const location = String(formData.get("location") || "").trim();
  // No separate "is this a video call" checkbox: a checkbox that can be
  // ticked with the link field left empty, or a link pasted in with the
  // box left unticked, is a state this form has no business allowing to
  // exist. Pasting a real link is the only signal that means anything.
  const meetingUrl = String(formData.get("meeting_url") || "").trim();
  if (!title || !startsAt || !endsAt) return { status: "error", message: "Fill in the title and both dates." };
  if (!CALENDAR_KINDS.has(kind) || kind === "appointment" || !new Set(["public", "private"]).has(visibility)) {
    return { status: "error", message: "Choose a valid calendar type and visibility." };
  }
  if (location.length > 200) return { status: "error", message: "Keep the location under 200 characters." };
  if (meetingUrl && !/^https:\/\//i.test(meetingUrl)) {
    return { status: "error", message: "The video call link should start with https:// — paste the full Google Meet (or Zoom) link." };
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
    location: location || null,
    meeting_url: meetingUrl || null,
  });
  if (error) return { status: "error", message: error.code === "23P01" ? "That time was just booked. Choose another time." : "Couldn't save that calendar entry." };

  // Whoever's calendar this is should hear about it when someone else put
  // it there — an assistant booking a meeting for the pastor shouldn't
  // rely on him happening to open the calendar tab and notice it himself.
  if (profile.id !== current.id && profile.auth_user_id) {
    const when = start.toLocaleString("en-JM", { dateStyle: "medium", timeStyle: "short", timeZone: "America/Jamaica" });
    await notifyUser({
      organizationId: profile.organization_id,
      userId: profile.auth_user_id,
      title: `New calendar entry: ${title}`,
      body: [when, location || null, meetingUrl ? "Video call — link on the calendar entry" : null].filter(Boolean).join(" · "),
      url: "/pastor/calendar",
      type: "calendar_entry",
    }).catch(() => {});
  }

  revalidatePath("/member/team-calendar");
  revalidatePath("/pastor/calendar");
  revalidatePath("/member/counsel");
  return { status: "success", message: "Added to your calendar." };
}

export async function removeCalendarEvent(id: string, profileId?: string): Promise<ActionState> {
  const context = await getCalendarContext(profileId);
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
  revalidatePath("/pastor/calendar");
  revalidatePath("/member/counsel");
  return { status: "success", message: "Calendar entry removed." };
}
