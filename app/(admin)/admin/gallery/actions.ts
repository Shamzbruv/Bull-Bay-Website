"use server";

import { revalidatePath } from "next/cache";
import { createClient, createServiceRoleClient } from "@/lib/supabase/server";
import { getOrganizationId, getUserPermissions } from "@/lib/auth/session";
import type { ActionState } from "@/app/(public)/actions";

async function requireMediaManage() {
  const organizationId = await getOrganizationId();
  const permissions = organizationId ? await getUserPermissions(organizationId) : new Set<string>();
  return { organizationId, allowed: permissions.has("media.manage") };
}

export async function uploadGalleryImage(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const { organizationId, allowed } = await requireMediaManage();
  if (!organizationId || !allowed) return { status: "error", message: "You don't have permission to do this." };

  const file = formData.get("image");
  if (!(file instanceof File) || file.size === 0) return { status: "error", message: "Please choose a photo." };
  const caption = String(formData.get("caption") || "").trim();
  const story = String(formData.get("story") || "").trim();

  const admin = createServiceRoleClient();
  const ext = file.name.split(".").pop() || "jpg";
  const storagePath = `${organizationId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
  const buffer = Buffer.from(await file.arrayBuffer());
  const { error: uploadError } = await admin.storage.from("gallery").upload(storagePath, buffer, {
    contentType: file.type || "image/jpeg",
  });
  if (uploadError) return { status: "error", message: "The upload failed. Please try again." };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { error } = await supabase.from("gallery_images").insert({
    organization_id: organizationId,
    storage_path: storagePath,
    caption: caption || null,
    story: story || null,
    uploaded_by: user?.id ?? null,
    is_published: true,
  });
  if (error) return { status: "error", message: "Uploaded, but couldn't save the details. Please try again." };

  revalidatePath("/admin/gallery");
  revalidatePath("/gallery");
  return { status: "success", message: "Added to the gallery." };
}

export async function toggleGalleryImagePublished(id: string, isPublished: boolean): Promise<void> {
  const { allowed } = await requireMediaManage();
  if (!allowed) return;
  const supabase = await createClient();
  await supabase.from("gallery_images").update({ is_published: isPublished }).eq("id", id);
  revalidatePath("/admin/gallery");
  revalidatePath("/gallery");
}

export async function deleteGalleryImage(id: string): Promise<void> {
  const { allowed } = await requireMediaManage();
  if (!allowed) return;
  const supabase = await createClient();
  const { data: image } = await supabase.from("gallery_images").select("storage_path").eq("id", id).maybeSingle();
  await supabase.from("gallery_images").delete().eq("id", id);
  if (image?.storage_path) {
    const admin = createServiceRoleClient();
    await admin.storage.from("gallery").remove([image.storage_path]);
  }
  revalidatePath("/admin/gallery");
  revalidatePath("/gallery");
}

export async function updateLivestreamUrl(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const { organizationId, allowed } = await requireMediaManage();
  if (!organizationId || !allowed) return { status: "error", message: "You don't have permission to do this." };

  const url = String(formData.get("livestream_url") || "").trim();
  const supabase = await createClient();
  const { error } = await supabase.from("campuses").update({ livestream_url: url || null }).eq("organization_id", organizationId);
  if (error) return { status: "error", message: "Couldn't save the livestream link." };

  revalidatePath("/admin/gallery");
  revalidatePath("/live");
  revalidatePath("/");
  return { status: "success", message: "Livestream link updated." };
}
