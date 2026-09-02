"use client";

import { useActionState } from "react";
import { saveSermon } from "@/app/(pastor)/pastor/actions";
import { initialActionState } from "@/app/(public)/actions";
import { SubmitButton } from "@/components/submit-button";
import { FormStatus } from "@/components/form-status";
import type { Database } from "@/lib/supabase/types";

type Sermon = Database["public"]["Tables"]["sermons"]["Row"];

export function SermonForm({ sermon }: { sermon?: Sermon }) {
  const [state, formAction] = useActionState(saveSermon, initialActionState);

  return (
    <form className="clay-form" action={formAction}>
      {sermon && <input type="hidden" name="id" value={sermon.id} />}
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
      <div className="form-row">
        <label>
          Video provider
          <select name="video_provider" defaultValue={sermon?.video_provider ?? ""}>
            <option value="">None yet</option>
            <option value="youtube">YouTube</option>
            <option value="cloudflare_stream">Cloudflare Stream</option>
          </select>
        </label>
        <label>
          Video ID
          <input name="video_id" defaultValue={sermon?.video_id ?? ""} placeholder="YouTube video ID" />
        </label>
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
