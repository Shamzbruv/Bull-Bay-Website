import { createClient } from "@/lib/supabase/server";

/**
 * The member-avatars bucket is private (each person's own folder, per
 * storage RLS in 0010_storage_buckets.sql), so every place an avatar is
 * shown needs a short-lived signed URL rather than a public one. Safe to
 * call with the viewer's own avatar_path — createSignedUrl only succeeds
 * for a path the caller's own "member-avatars own read" policy allows.
 */
export async function getAvatarUrl(avatarPath: string | null | undefined): Promise<string | null> {
  if (!avatarPath) return null;
  const supabase = await createClient();
  const { data, error } = await supabase.storage.from("member-avatars").createSignedUrl(avatarPath, 3600);
  if (error || !data) return null;
  return data.signedUrl;
}
