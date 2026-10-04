"use client";

import { useActionState, useState, useTransition } from "react";
import { addAvailability, addCalendarEvent, removeAvailability, removeCalendarEvent, updateCalendarEvent } from "./actions";
import { initialActionState } from "@/lib/action-state";
import type { CalendarEntry } from "@/components/calendar/pastoral-calendar";
import type { ActionState } from "@/app/(public)/actions";
import { SubmitButton } from "@/components/submit-button";
import { FormStatus } from "@/components/form-status";
import { DAY_NAMES } from "@/lib/pastoral/reasons";

export function AvailabilityForm({ profileId }: { profileId?: string }) {
  const [state, formAction] = useActionState(addAvailability, initialActionState);
  return (
    <form className="clay-form" action={formAction} style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 12, alignItems: "end" }}>
      <input type="hidden" name="profile_id" value={profileId ?? ""} />
      <label>
        Day
        <select name="day_of_week" required defaultValue="">
          <option value="" disabled>
            Choose…
          </option>
          {DAY_NAMES.map((d, i) => (
            <option key={d} value={i}>
              {d}
            </option>
          ))}
        </select>
      </label>
      <label>
        From
        <input type="time" name="start_time" required />
      </label>
      <label>
        To
        <input type="time" name="end_time" required />
      </label>
      <label>
        Label (optional)
        <input type="text" name="label" placeholder="In the office" />
      </label>
      <div style={{ gridColumn: "1 / -1" }}>
        <FormStatus state={state} />
        <SubmitButton pendingLabel="Adding…">Add weekly hours</SubmitButton>
      </div>
    </form>
  );
}

export function RemoveAvailabilityButton({ id }: { id: string }) {
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  return (
    <span className="inline-action">
      <button type="button" className="link-button" disabled={pending} onClick={() => startTransition(async () => setMessage((await removeAvailability(id)).message))}>
        {pending ? "removing…" : "remove"}
      </button>
      {message && <small role="status">{message}</small>}
    </span>
  );
}

/** A datetime-local value (YYYY-MM-DDTHH:mm) for an instant, in Jamaica time. */
function toLocalInput(iso: string): string {
  return new Date(iso).toLocaleString("sv-SE", { timeZone: "America/Jamaica", hour12: false }).replace(" ", "T").slice(0, 16);
}

/** Adds a calendar entry, or — given `editing` — changes that entry. */
export function EventForm({
  profileId,
  editing,
  onDone,
  onCancel,
}: {
  profileId?: string;
  editing?: CalendarEntry | null;
  onDone?: (message: string) => void;
  onCancel?: () => void;
}) {
  const [state, formAction] = useActionState(async (previous: ActionState, formData: FormData) => {
    const result = await (editing ? updateCalendarEvent : addCalendarEvent)(previous, formData);
    if (editing && result.status === "success") onDone?.(result.message);
    return result;
  }, initialActionState);
  return (
    <form className="clay-form" action={formAction} style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 12, alignItems: "end" }}>
      <input type="hidden" name="profile_id" value={profileId ?? ""} />
      {editing && <input type="hidden" name="id" value={editing.id} />}
      {editing && (
        <p style={{ gridColumn: "1 / -1", margin: 0 }}>
          <strong>Editing &ldquo;{editing.title}&rdquo;</strong>
          {editing.source === "google" && <span className="form-note"> — this entry was added in Google Calendar; your changes are sent back there too.</span>}
        </p>
      )}
      <label style={{ gridColumn: "1 / -1" }}>
        Title
        <input type="text" name="title" required maxLength={200} defaultValue={editing?.title} placeholder="Meeting with Deacon Board, day off, conference…" />
      </label>
      <label>
        Type
        <select name="kind" defaultValue={editing && editing.kind !== "appointment" ? editing.kind : "meeting"}>
          <option value="meeting">Meeting</option>
          <option value="day_off">Day off</option>
          <option value="busy">Busy / unavailable</option>
        </select>
      </label>
      <label>
        Visible to
        <select name="visibility" defaultValue={editing?.visibility ?? "public"}>
          <option value="public">Everyone (shown on the calendar)</option>
          <option value="private">Pastor and administrative team</option>
        </select>
      </label>
      <label>
        Starts
        <input type="datetime-local" name="starts_at" required defaultValue={editing ? toLocalInput(editing.startsAt) : undefined} />
      </label>
      <label>
        Ends
        <input type="datetime-local" name="ends_at" required defaultValue={editing ? toLocalInput(editing.endsAt) : undefined} />
      </label>
      <label>
        Location
        <input type="text" name="location" maxLength={200} defaultValue={editing?.location ?? undefined} placeholder="Pastor's office, church sanctuary, member's home…" />
      </label>
      <label style={{ gridColumn: "1 / -1" }}>
        Video call link (optional)
        <input type="url" name="meeting_url" defaultValue={editing?.meetingUrl ?? undefined} placeholder="https://meet.google.com/… (Google Meet, Zoom, or any video link)" />
      </label>
      <div style={{ gridColumn: "1 / -1", display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
        <FormStatus state={state} />
        <SubmitButton pendingLabel={editing ? "Saving…" : "Adding…"}>{editing ? "Save changes" : "Add to calendar"}</SubmitButton>
        {editing && (
          <button type="button" className="secondary-button" onClick={onCancel}>
            Cancel
          </button>
        )}
      </div>
    </form>
  );
}

export function RemoveEventButton({ id }: { id: string }) {
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  return (
    <span className="inline-action">
      <button type="button" className="link-button" disabled={pending} onClick={() => startTransition(async () => setMessage((await removeCalendarEvent(id)).message))}>
        {pending ? "removing…" : "remove"}
      </button>
      {message && <small role="status">{message}</small>}
    </span>
  );
}
