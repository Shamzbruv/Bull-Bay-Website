"use server";

import { revalidatePath } from "next/cache";
import { after } from "next/server";
import { getCalendarContext } from "@/lib/calendar/context";
import { syncConnectionsForProfile } from "@/lib/calendar/integrations";
import { notifyUser } from "@/lib/notifications";
import type { ActionState } from "@/app/(public)/actions";

const CALENDAR_KINDS = new Set(["day_off", "busy", "appointment", "meeting"]);

/** Everything that shows a calendar needs refreshing after a change, and Google needs to hear about it. */
function afterCalendarChange(profileId: string) {
  revalidatePath("/member/team-calendar");
  revalidatePath("/pastor/calendar");
  revalidatePath("/member/counsel");
  revalidatePath("/member/church-calendar");
  // Pushed right away instead of waiting for the background worker's next pass.
  after(() => syncConnectionsForProfile(profileId));
}

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

  afterCalendarChange(profile.id);
  return { status: "success", message: "Hours added." };
}

export async function removeAvailability(id: string, profileId?: string): Promise<ActionState> {
  const context = await getCalendarContext(profileId);
  if (!context) return { status: "error", message: "Only active pastoral-team members can change availability." };
  const { profile, supabase } = context;
  const { error } = await supabase.from("pastoral_calendar_availability").delete().eq("profile_id", profile.id).eq("id", id);
  if (error) return { status: "error", message: "Those hours could not be removed." };
  afterCalendarChange(profile.id);
  return { status: "success", message: "Hours removed." };
}

type EntryFields = {
  title: string;
  kind: string;
  visibility: string;
  startsAt: Date;
  endsAt: Date;
  location: string | null;
  meetingUrl: string | null;
};

/** The add and edit forms collect the same fields, so they are checked in one place. */
function readEntryFields(formData: FormData): { error: string } | { fields: EntryFields } {
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
  if (!title || !startsAt || !endsAt) return { error: "Fill in the title and both dates." };
  if (!CALENDAR_KINDS.has(kind) || kind === "appointment" || !new Set(["public", "private"]).has(visibility)) {
    return { error: "Choose a valid calendar type and visibility." };
  }
  if (title.length > 200) return { error: "Keep the title under 200 characters." };
  if (location.length > 200) return { error: "Keep the location under 200 characters." };
  if (meetingUrl && !/^https:\/\//i.test(meetingUrl)) {
    return { error: "The video call link should start with https:// — paste the full Google Meet (or Zoom) link." };
  }
  if (meetingUrl.length > 500) return { error: "That video call link is too long." };
  const start = new Date(`${startsAt}:00-05:00`);
  const end = new Date(`${endsAt}:00-05:00`);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end <= start) return { error: "End must be after start." };
  return { fields: { title, kind, visibility, startsAt: start, endsAt: end, location: location || null, meetingUrl: meetingUrl || null } };
}

/** Whoever's calendar this is should hear about it when someone else changed it, rather than relying on them opening the tab. */
async function tellOwner(
  context: NonNullable<Awaited<ReturnType<typeof getCalendarContext>>>,
  headline: string,
  fields: EntryFields,
) {
  const { profile, current } = context;
  if (profile.id === current.id || !profile.auth_user_id) return;
  const when = fields.startsAt.toLocaleString("en-JM", { dateStyle: "medium", timeStyle: "short", timeZone: "America/Jamaica" });
  await notifyUser({
    organizationId: profile.organization_id,
    userId: profile.auth_user_id,
    title: `${headline}: ${fields.title}`,
    body: [when, fields.location, fields.meetingUrl ? "Video call — link on the calendar entry" : null].filter(Boolean).join(" · "),
    url: "/pastor/calendar",
    type: "calendar_entry",
  }).catch(() => {});
}

export async function addCalendarEvent(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const context = await getCalendarContext(String(formData.get("profile_id") || ""));
  if (!context) return { status: "error", message: "Only active pastoral-team members can edit this calendar." };
  const { profile, supabase } = context;

  const parsed = readEntryFields(formData);
  if ("error" in parsed) return { status: "error", message: parsed.error };
  const { fields } = parsed;

  const { data: conflicts } = await supabase
    .from("pastoral_calendar_events")
    .select("id")
    .eq("profile_id", profile.id)
    .lt("starts_at", fields.endsAt.toISOString())
    .gt("ends_at", fields.startsAt.toISOString())
    .limit(1);
  if (conflicts && conflicts.length > 0) return { status: "error", message: "That entry overlaps something already on your calendar." };

  const { error } = await supabase.from("pastoral_calendar_events").insert({
    profile_id: profile.id,
    title: fields.title,
    kind: fields.kind,
    visibility: fields.visibility,
    starts_at: fields.startsAt.toISOString(),
    ends_at: fields.endsAt.toISOString(),
    location: fields.location,
    meeting_url: fields.meetingUrl,
  });
  if (error) return { status: "error", message: error.code === "23P01" ? "That time was just booked. Choose another time." : "Couldn't save that calendar entry." };

  await tellOwner(context, "New calendar entry", fields);
  afterCalendarChange(profile.id);
  return { status: "success", message: "Added to your calendar." };
}

export async function updateCalendarEvent(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const context = await getCalendarContext(String(formData.get("profile_id") || ""));
  if (!context) return { status: "error", message: "Only active pastoral-team members can edit this calendar." };
  const { profile, supabase } = context;

  const id = String(formData.get("id") || "");
  const { data: existing } = await supabase
    .from("pastoral_calendar_events")
    .select("id, kind, counsel_request_id, source, starts_at, ends_at")
    .eq("profile_id", profile.id)
    .eq("id", id)
    .maybeSingle();
  if (!existing) return { status: "error", message: "That calendar entry no longer exists." };
  if (existing.kind === "appointment" || existing.counsel_request_id) return { status: "error", message: "Manage counselling appointments from the request inbox." };

  const parsed = readEntryFields(formData);
  if ("error" in parsed) return { status: "error", message: parsed.error };
  const { fields } = parsed;

  // Entries typed into the website may not overlap others (an entry that came
  // from Google already may, and is only checked if its time is being moved).
  const moved = new Date(existing.starts_at).getTime() !== fields.startsAt.getTime() || new Date(existing.ends_at).getTime() !== fields.endsAt.getTime();
  if (moved && existing.source === "platform") {
    const { data: conflicts } = await supabase
      .from("pastoral_calendar_events")
      .select("id")
      .eq("profile_id", profile.id)
      .neq("id", id)
      .lt("starts_at", fields.endsAt.toISOString())
      .gt("ends_at", fields.startsAt.toISOString())
      .limit(1);
    if (conflicts && conflicts.length > 0) return { status: "error", message: "That entry would overlap something already on your calendar." };
  }

  const { error } = await supabase
    .from("pastoral_calendar_events")
    .update({
      title: fields.title,
      kind: fields.kind,
      visibility: fields.visibility,
      starts_at: fields.startsAt.toISOString(),
      ends_at: fields.endsAt.toISOString(),
      location: fields.location,
      meeting_url: fields.meetingUrl,
    })
    .eq("profile_id", profile.id)
    .eq("id", id);
  if (error) return { status: "error", message: error.code === "23P01" ? "That time was just booked. Choose another time." : "Couldn't save those changes." };

  await tellOwner(context, "Calendar entry changed", fields);
  afterCalendarChange(profile.id);
  return { status: "success", message: "Saved." };
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
  afterCalendarChange(profile.id);
  return { status: "success", message: "Calendar entry removed." };
}
