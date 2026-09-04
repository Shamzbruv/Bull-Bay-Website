"use client";

import { useActionState, useState, useTransition } from "react";
import { addAvailability, addCalendarEvent, removeAvailability, removeCalendarEvent } from "./actions";
import { initialActionState } from "@/lib/action-state";
import { SubmitButton } from "@/components/submit-button";
import { FormStatus } from "@/components/form-status";
import { DAY_NAMES } from "@/lib/pastoral/reasons";

export function AvailabilityForm() {
  const [state, formAction] = useActionState(addAvailability, initialActionState);
  return (
    <form className="clay-form" action={formAction} style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 12, alignItems: "end" }}>
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

export function EventForm() {
  const [state, formAction] = useActionState(addCalendarEvent, initialActionState);
  return (
    <form className="clay-form" action={formAction} style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 12, alignItems: "end" }}>
      <label style={{ gridColumn: "1 / -1" }}>
        Title
        <input type="text" name="title" required placeholder="Day off, conference, appointment…" />
      </label>
      <label>
        Type
        <select name="kind" defaultValue="day_off">
          <option value="day_off">Day off</option>
          <option value="busy">Busy / unavailable</option>
          <option value="appointment">Appointment</option>
        </select>
      </label>
      <label>
        Visible to
        <select name="visibility" defaultValue="public">
          <option value="public">Everyone (shown on the calendar)</option>
          <option value="private">Just me</option>
        </select>
      </label>
      <label>
        Starts
        <input type="datetime-local" name="starts_at" required />
      </label>
      <label>
        Ends
        <input type="datetime-local" name="ends_at" required />
      </label>
      <div style={{ gridColumn: "1 / -1" }}>
        <FormStatus state={state} />
        <SubmitButton pendingLabel="Adding…">Add to calendar</SubmitButton>
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
