"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getOrganizationId } from "@/lib/auth/session";
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

export async function updatePrayerStatus(prayerId: string, status: string): Promise<void> {
  const supabase = await createClient();
  await supabase.from("prayer_requests").update({ status }).eq("id", prayerId);
  revalidatePath("/pastor");
  revalidatePath("/pastor/care");
}
