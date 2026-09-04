"use client";

import { useActionState } from "react";
import { saveAnnouncement, toggleAnnouncementPublished } from "./actions";
import { initialActionState } from "@/lib/action-state";
import { SubmitButton } from "@/components/submit-button";
import { FormStatus } from "@/components/form-status";

export function AnnouncementForm() {
  const [state, formAction] = useActionState(saveAnnouncement, initialActionState);
  return (
    <form className="clay-form" action={formAction}>
      <label>
        Title
        <input name="title" required placeholder="This Sunday…" />
      </label>
      <label>
        Announcement
        <textarea name="body" required style={{ minHeight: 100 }} />
      </label>
      <label className="check-label">
        <input type="checkbox" name="publish" defaultChecked />
        Publish immediately
      </label>
      <FormStatus state={state} />
      <SubmitButton pendingLabel="Saving…">Save announcement</SubmitButton>
    </form>
  );
}

export function PublishToggle({ id, isPublished }: { id: string; isPublished: boolean }) {
  return (
    <label className="check-label" style={{ marginBottom: 0 }}>
      <input type="checkbox" defaultChecked={isPublished} onChange={(e) => toggleAnnouncementPublished(id, e.target.checked)} />
      Published
    </label>
  );
}
