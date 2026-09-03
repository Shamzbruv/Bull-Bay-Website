"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getOrganizationId, getUserPermissions } from "@/lib/auth/session";
import type { ActionState } from "@/app/(public)/actions";

export async function saveAnnouncement(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const organizationId = await getOrganizationId();
  const permissions = organizationId ? await getUserPermissions(organizationId) : new Set<string>();
  if (!organizationId || !permissions.has("content.manage")) return { status: "error", message: "You don't have permission to do this." };

  const title = String(formData.get("title") || "").trim();
  const body = String(formData.get("body") || "").trim();
  const publishNow = formData.get("publish") === "on";
  if (!title || !body) return { status: "error", message: "Add a title and the announcement text." };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { error } = await supabase.from("announcements").insert({
    organization_id: organizationId,
    title,
    body,
    status: publishNow ? "published" : "draft",
    published_at: publishNow ? new Date().toISOString() : null,
    created_by: user?.id ?? null,
  });
  if (error) return { status: "error", message: "Couldn't save that announcement." };

  revalidatePath("/admin/bulletin");
  revalidatePath("/member");
  return { status: "success", message: publishNow ? "Published to every member's dashboard." : "Saved as a draft." };
}

export async function toggleAnnouncementPublished(id: string, publish: boolean): Promise<void> {
  const supabase = await createClient();
  await supabase
    .from("announcements")
    .update({ status: publish ? "published" : "archived", published_at: publish ? new Date().toISOString() : null })
    .eq("id", id);
  revalidatePath("/admin/bulletin");
  revalidatePath("/member");
}
