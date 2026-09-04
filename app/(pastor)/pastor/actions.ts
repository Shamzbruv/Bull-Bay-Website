"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient, createServiceRoleClient } from "@/lib/supabase/server";
import { getCurrentProfile, getOrganizationId, getUserPermissions } from "@/lib/auth/session";
import type { ActionState } from "@/app/(public)/actions";

function slugify(input: string) {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export async function saveSermon(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const organizationId = await getOrganizationId();
  if (!organizationId) return { status: "error", message: "Something went wrong." };
  const supabase = await createClient();

  const id = String(formData.get("id") || "");
  const title = String(formData.get("title") || "").trim();
  if (!title) return { status: "error", message: "Please enter a title." };

  const payload = {
    organization_id: organizationId,
    slug: slugify(String(formData.get("slug") || title)),
    title,
    speaker: String(formData.get("speaker") || "").trim() || null,
    topics: String(formData.get("topics") || "")
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean),
    summary: String(formData.get("summary") || "").trim() || null,
    transcript: String(formData.get("transcript") || "").trim() || null,
    video_provider: String(formData.get("video_provider") || "") || null,
    video_id: String(formData.get("video_id") || "").trim() || null,
    preached_at: String(formData.get("preached_at") || "") || null,
    status: String(formData.get("status") || "draft"),
    published_at: formData.get("status") === "published" ? new Date().toISOString() : null,
  };

  const { error } = id
    ? await supabase.from("sermons").update(payload).eq("id", id)
    : await supabase.from("sermons").insert(payload);

  if (error) return { status: "error", message: "We couldn't save this sermon. Check the slug is unique." };
  revalidatePath("/pastor/sermons");
  revalidatePath("/sermons");
  redirect("/pastor/sermons");
}

export async function updateCareCase(caseId: string, _prev: ActionState, formData: FormData): Promise<ActionState> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("care_cases")
    .update({
      status: String(formData.get("status") || "open"),
      summary: String(formData.get("summary") || "").trim() || null,
      confidential_notes: String(formData.get("confidential_notes") || "").trim() || null,
    })
    .eq("id", caseId);

  if (error) return { status: "error", message: "We couldn't save this case." };
  revalidatePath(`/pastor/care/${caseId}`);
  return { status: "success", message: "Case updated." };
}

export async function updatePrayerStatus(prayerId: string, status: string): Promise<ActionState> {
  const organizationId = await getOrganizationId();
  const permissions = organizationId ? await getUserPermissions(organizationId) : new Set<string>();
  if (!organizationId) return { status: "error", message: "The church workspace could not be resolved." };
  if (!new Set(["new", "in_progress", "prayed", "closed"]).has(status)) {
    return { status: "error", message: "Choose a valid prayer-request status." };
  }
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { status: "error", message: "Please sign in again." };

  const canManageAll = permissions.has("care.manage");
  if (!canManageAll) {
    const [{ data: teamMember }, { data: assignedRequest }] = await Promise.all([
      supabase.from("pastoral_team_members").select("id").eq("profile_id", (await getCurrentProfile())?.id ?? "").eq("is_active", true).maybeSingle(),
      createServiceRoleClient().from("prayer_requests").select("id").eq("organization_id", organizationId).eq("id", prayerId).eq("assigned_to", user.id).maybeSingle(),
    ]);
    if (!teamMember || !assignedRequest) {
      return { status: "error", message: "Only the assigned pastoral team member can update this request." };
    }
  }

  const writer = canManageAll ? supabase : createServiceRoleClient();
  const { error } = await writer
    .from("prayer_requests")
    .update({ status })
    .eq("organization_id", organizationId)
    .eq("id", prayerId);
  if (error) return { status: "error", message: "The prayer request could not be updated." };
  revalidatePath("/pastor");
  revalidatePath("/pastor/care");
  revalidatePath("/member/team-calendar");
  return { status: "success", message: "Prayer request updated." };
}

export async function assignPrayerRequest(prayerId: string, assigneeUserId: string): Promise<ActionState> {
  const organizationId = await getOrganizationId();
  const permissions = organizationId ? await getUserPermissions(organizationId) : new Set<string>();
  if (!organizationId || !permissions.has("care.manage")) {
    return { status: "error", message: "You don't have permission to assign prayer requests." };
  }

  const supabase = await createClient();
  if (assigneeUserId) {
    const { data: teamMember } = await supabase
      .from("pastoral_team_members")
      .select("id, profiles!inner(auth_user_id)")
      .eq("organization_id", organizationId)
      .eq("is_active", true)
      .eq("profiles.auth_user_id", assigneeUserId)
      .maybeSingle();
    if (!teamMember) return { status: "error", message: "Choose an active member of the pastoral team." };
  }

  const { error } = await supabase
    .from("prayer_requests")
    .update({ assigned_to: assigneeUserId || null, ...(assigneeUserId ? { status: "in_progress" } : {}) })
    .eq("organization_id", organizationId)
    .eq("id", prayerId);
  if (error) return { status: "error", message: "The assignment could not be saved." };
  revalidatePath("/pastor");
  revalidatePath("/pastor/care");
  return { status: "success", message: assigneeUserId ? "Prayer request assigned." : "Assignment cleared." };
}

// Counsel requests -----------------------------------------------------
export async function scheduleCounselRequest(requestId: string, _prev: ActionState, formData: FormData): Promise<ActionState> {
  const supabase = await createClient();
  const { data: request } = await supabase
    .from("counsel_requests")
    .select("id, reason, requested_with_profile_id")
    .eq("id", requestId)
    .maybeSingle();
  if (!request?.requested_with_profile_id) return { status: "error", message: "This request can't be scheduled." };

  const startsAt = String(formData.get("starts_at") || "");
  const endsAt = String(formData.get("ends_at") || "");
  if (!startsAt || !endsAt) return { status: "error", message: "Choose a start and end time." };
  const startsAtJamaica = new Date(`${startsAt}:00-05:00`);
  const endsAtJamaica = new Date(`${endsAt}:00-05:00`);
  if (Number.isNaN(startsAtJamaica.getTime()) || Number.isNaN(endsAtJamaica.getTime()) || endsAtJamaica <= startsAtJamaica) {
    return { status: "error", message: "Choose a valid end time after the start time." };
  }

  const { data: conflicts } = await supabase
    .from("pastoral_calendar_events")
    .select("id")
    .eq("profile_id", request.requested_with_profile_id)
    .lt("starts_at", endsAtJamaica.toISOString())
    .gt("ends_at", startsAtJamaica.toISOString())
    .limit(1);
  if (conflicts && conflicts.length > 0) {
    return { status: "error", message: "That time overlaps another calendar entry. Choose a different slot." };
  }

  const { data: event, error: eventError } = await supabase
    .from("pastoral_calendar_events")
    .insert({
      profile_id: request.requested_with_profile_id,
      title: `Counsel: ${request.reason}`,
      kind: "appointment",
      visibility: "private",
      starts_at: startsAtJamaica.toISOString(),
      ends_at: endsAtJamaica.toISOString(),
      counsel_request_id: requestId,
    })
    .select("id")
    .single();
  if (eventError || !event) return { status: "error", message: "Couldn't add this to the calendar." };

  const { error } = await supabase
    .from("counsel_requests")
    .update({ status: "scheduled", scheduled_event_id: event.id })
    .eq("id", requestId);
  if (error) {
    await supabase.from("pastoral_calendar_events").delete().eq("id", event.id);
    return { status: "error", message: "The request could not be scheduled. No calendar entry was kept." };
  }

  revalidatePath("/pastor/care");
  revalidatePath("/member/team-calendar");
  revalidatePath("/member/counsel");
  return { status: "success", message: "Scheduled and added to the calendar." };
}

export async function declineCounselRequest(requestId: string, _prev: ActionState, formData: FormData): Promise<ActionState> {
  const supabase = await createClient();
  const note = String(formData.get("staff_notes") || "").trim();
  const { error } = await supabase
    .from("counsel_requests")
    .update({ status: "declined", staff_notes: note || null })
    .eq("id", requestId);
  if (error) return { status: "error", message: "Couldn't update this request." };
  revalidatePath("/pastor/care");
  revalidatePath("/member/team-calendar");
  revalidatePath("/member/counsel");
  return { status: "success", message: "Request declined." };
}

// Pastor's Desk broadcast ------------------------------------------------
export async function sendBroadcast(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const organizationId = await getOrganizationId();
  const permissions = organizationId ? await getUserPermissions(organizationId) : new Set<string>();
  if (!organizationId || !permissions.has("broadcasts.send")) return { status: "error", message: "You don't have permission to do this." };

  const profile = await getCurrentProfile();
  const title = String(formData.get("title") || "").trim();
  const body = String(formData.get("body") || "").trim();
  if (!title || !body) return { status: "error", message: "Add a title and a message." };

  const supabase = await createClient();
  const { error } = await supabase.from("pastor_broadcasts").insert({
    organization_id: organizationId,
    author_profile_id: profile?.id ?? null,
    title,
    body,
  });
  if (error) return { status: "error", message: "Couldn't send that broadcast." };

  revalidatePath("/pastor");
  revalidatePath("/member");
  return { status: "success", message: "Sent to every member's dashboard." };
}
