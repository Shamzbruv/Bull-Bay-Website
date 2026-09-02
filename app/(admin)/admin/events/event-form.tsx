"use client";

import { useActionState } from "react";
import { saveEvent } from "@/app/(admin)/admin/actions";
import { initialActionState } from "@/app/(public)/actions";
import { SubmitButton } from "@/components/submit-button";
import { FormStatus } from "@/components/form-status";

export function EventForm() {
  const [state, formAction] = useActionState(saveEvent, initialActionState);
  return (
    <form className="clay-form" action={formAction}>
      <div className="form-row">
        <label>
          Title
          <input name="title" required />
        </label>
        <label>
          Category
          <input name="category" placeholder="e.g. PRAYER & FASTING" />
        </label>
      </div>
      <label>
        Description
        <textarea name="description" />
      </label>
      <div className="form-row">
        <label>
          Starts at
          <input type="datetime-local" name="starts_at" required />
        </label>
        <label>
          Location
          <input name="location_name" />
        </label>
      </div>
      <div className="form-row">
        <label>
          Visibility
          <select name="visibility" defaultValue="public">
            <option value="public">Public</option>
            <option value="members">Members only</option>
            <option value="staff">Staff only</option>
          </select>
        </label>
        <label>
          Status
          <select name="status" defaultValue="draft">
            <option value="draft">Draft</option>
            <option value="published">Published</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </label>
      </div>
      <FormStatus state={state} />
      <SubmitButton pendingLabel="Saving…">Create event</SubmitButton>
    </form>
  );
}
