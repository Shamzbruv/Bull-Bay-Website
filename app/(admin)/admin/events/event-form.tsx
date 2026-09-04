"use client";

import { useActionState } from "react";
import { saveEvent } from "@/app/(admin)/admin/actions";
import { initialActionState } from "@/lib/action-state";
import { SubmitButton } from "@/components/submit-button";
import { FormStatus } from "@/components/form-status";

type EditableEvent = {
  id: string;
  title: string;
  category: string | null;
  description: string | null;
  starts_at: string;
  location_name: string | null;
  visibility: string;
  status: string;
};

function jamaicaInputValue(iso: string) {
  return new Date(new Date(iso).getTime() - 5 * 60 * 60 * 1000).toISOString().slice(0, 16);
}

export function EventForm({ event }: { event?: EditableEvent }) {
  const [state, formAction] = useActionState(saveEvent, initialActionState);
  return (
    <form className="clay-form" action={formAction}>
      {event && <input type="hidden" name="id" value={event.id} />}
      <div className="form-row">
        <label>
          Title
          <input name="title" required defaultValue={event?.title ?? ""} />
        </label>
        <label>
          Category
          <input name="category" placeholder="e.g. PRAYER & FASTING" defaultValue={event?.category ?? ""} />
        </label>
      </div>
      <label>
        Description
        <textarea name="description" defaultValue={event?.description ?? ""} />
      </label>
      <div className="form-row">
        <label>
          Starts at
          <input type="datetime-local" name="starts_at" required defaultValue={event ? jamaicaInputValue(event.starts_at) : ""} />
        </label>
        <label>
          Location
          <input name="location_name" defaultValue={event?.location_name ?? ""} />
        </label>
      </div>
      <div className="form-row">
        <label>
          Visibility
          <select name="visibility" defaultValue={event?.visibility ?? "public"}>
            <option value="public">Public</option>
            <option value="members">Members only</option>
            <option value="staff">Staff only</option>
          </select>
        </label>
        <label>
          Status
          <select name="status" defaultValue={event?.status ?? "draft"}>
            <option value="draft">Draft</option>
            <option value="published">Published</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </label>
      </div>
      <FormStatus state={state} />
      <SubmitButton pendingLabel="Saving…">{event ? "Save event" : "Create event"}</SubmitButton>
    </form>
  );
}
