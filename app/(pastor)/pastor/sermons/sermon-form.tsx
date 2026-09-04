"use client";

import { useState } from "react";
import { useActionState } from "react";
import { saveSermon } from "@/app/(pastor)/pastor/actions";
import { initialActionState } from "@/lib/action-state";
import { SubmitButton } from "@/components/submit-button";
import { FormStatus } from "@/components/form-status";
import type { Database } from "@/lib/supabase/types";

type Sermon = Database["public"]["Tables"]["sermons"]["Row"];

export function SermonForm({ sermon }: { sermon?: Sermon }) {
  const [state, formAction] = useActionState(saveSermon, initialActionState);
  const [videoSource, setVideoSource] = useState(() =>
    sermon?.video_provider === "upload" ? "upload" : sermon?.video_provider === "youtube" ? "youtube" : "none",
  );

  return (
    <form className="clay-form" action={formAction}>
      {sermon && <input type="hidden" name="id" value={sermon.id} />}
      {sermon?.video_path && <input type="hidden" name="existing_video_path" value={sermon.video_path} />}
      <div className="form-row">
        <label>
          Title
          <input name="title" defaultValue={sermon?.title} required />
        </label>
        <label>
          Slug (URL)
          <input name="slug" defaultValue={sermon?.slug} placeholder="auto-generated from title if blank" />
        </label>
      </div>
      <div className="form-row">
        <label>
          Speaker
          <input name="speaker" defaultValue={sermon?.speaker ?? ""} />
        </label>
        <label>
          Preached on
          <input type="date" name="preached_at" defaultValue={sermon?.preached_at ?? ""} />
        </label>
      </div>
      <label>
        Topics (comma-separated)
        <input name="topics" defaultValue={sermon?.topics?.join(", ") ?? ""} placeholder="faith, prayer, purpose" />
      </label>
      <label>
        Summary
        <textarea name="summary" defaultValue={sermon?.summary ?? ""} />
      </label>
      <div>
        <strong style={{ display: "block", marginBottom: 8, fontSize: ".82rem", color: "var(--color-blue-700)" }}>Video</strong>
        <div className="form-row">
          <label>
            <input
              type="radio"
              name="video_source"
              value="none"
              checked={videoSource === "none"}
              onChange={() => setVideoSource("none")}
            />{" "}
            No video yet
          </label>
          <label>
            <input
              type="radio"
              name="video_source"
              value="youtube"
              checked={videoSource === "youtube"}
              onChange={() => setVideoSource("youtube")}
            />{" "}
            YouTube link
          </label>
          <label>
            <input
              type="radio"
              name="video_source"
              value="upload"
              checked={videoSource === "upload"}
              onChange={() => setVideoSource("upload")}
            />{" "}
            Upload a video file
          </label>
        </div>
        {videoSource === "youtube" && (
          <label>
            YouTube link (or video ID)
            <input
              name="video_url"
              defaultValue={sermon?.video_provider === "youtube" ? sermon.video_id ?? "" : ""}
              placeholder="https://www.youtube.com/watch?v=…"
            />
          </label>
        )}
        {videoSource === "upload" && (
          <label>
            Video file
            <input type="file" name="video_file" accept="video/mp4,video/webm,video/quicktime" />
            {sermon?.video_path && (
              <span className="form-note">A video is already uploaded — choose a new file only to replace it.</span>
            )}
          </label>
        )}
      </div>
      <label>
        Transcript (optional)
        <textarea name="transcript" defaultValue={sermon?.transcript ?? ""} style={{ minHeight: 160 }} />
      </label>
      <label>
        Status
        <select name="status" defaultValue={sermon?.status ?? "draft"}>
          <option value="draft">Draft</option>
          <option value="published">Published</option>
          <option value="archived">Archived</option>
        </select>
      </label>
      <FormStatus state={state} />
      <SubmitButton pendingLabel="Saving…">Save sermon</SubmitButton>
    </form>
  );
}
