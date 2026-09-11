import { createPublicClient } from "@/lib/supabase/public";

export type SermonVideoSource = { kind: "youtube"; embedUrl: string } | { kind: "upload"; url: string } | null;

type SermonVideoFields = {
  video_provider: string | null;
  video_id: string | null;
  video_path: string | null;
};

/** Whatever the media/pastoral team attached to a sermon (a pasted
 * YouTube link or an uploaded file — see sermon-form.tsx) resolved to a
 * playable source. Shared by the sermon detail page's embed and the
 * homepage "Latest message" play button, so both always agree on what
 * counts as "this sermon has video". */
export function getSermonVideoSource(sermon: SermonVideoFields): SermonVideoSource {
  if (sermon.video_provider === "youtube" && sermon.video_id) {
    return { kind: "youtube", embedUrl: `https://www.youtube-nocookie.com/embed/${sermon.video_id}` };
  }
  if (sermon.video_provider === "upload" && sermon.video_path) {
    const { data } = createPublicClient().storage.from("sermon-video").getPublicUrl(sermon.video_path);
    return { kind: "upload", url: data.publicUrl };
  }
  return null;
}
