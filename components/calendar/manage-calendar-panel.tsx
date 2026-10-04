"use client";

import { useRef, useState, useTransition } from "react";
import { PastoralCalendar, type AvailabilityBlock, type CalendarEntry } from "./pastoral-calendar";
import { removeAvailability, removeCalendarEvent } from "@/app/(member)/member/team-calendar/actions";
import { AvailabilityForm, EventForm } from "@/app/(member)/member/team-calendar/calendar-forms";

/**
 * Wraps the visual calendar with the actual add/remove wiring for a
 * pastoral team member's own hours + entries — used at both
 * /member/team-calendar and /pastor/calendar (see team-calendar-view.tsx).
 * Removing or changing something here calls server actions that already
 * revalidatePath the page, so the fresh availability/events just flow back
 * down as props. Editing swaps the add form for the same form, prefilled.
 */
export function ManageCalendarPanel({ availability, events, profileId }: { profileId?: string; availability: AvailabilityBlock[]; events: CalendarEntry[] }) {
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const [editing, setEditing] = useState<CalendarEntry | null>(null);
  const formRef = useRef<HTMLDivElement>(null);

  function handleEdit(entry: CalendarEntry) {
    setEditing(entry);
    setMessage(null);
    setTimeout(() => formRef.current?.scrollIntoView({ behavior: "smooth", block: "center" }), 0);
  }

  function handleRemoveAvailability(id: string) {
    startTransition(async () => {
      const result = await removeAvailability(id, profileId);
      setMessage(result.message);
    });
  }
  function handleRemoveEvent(id: string) {
    startTransition(async () => {
      const result = await removeCalendarEvent(id, profileId);
      setMessage(result.message);
    });
  }

  return (
    <>
      <PastoralCalendar
        mode="manage"
        availability={availability}
        events={events}
        onRemoveAvailability={handleRemoveAvailability}
        onRemoveEvent={handleRemoveEvent}
        onEditEvent={handleEdit}
      />
      {message && (
        <p className="form-note" role="status" aria-live="polite">
          {pending ? "Updating…" : message}
        </p>
      )}
      <div className="pcal-forms">
        <AvailabilityForm profileId={profileId} />
        <div ref={formRef}>
          <EventForm
            key={editing?.id ?? "new"}
            profileId={profileId}
            editing={editing}
            onDone={(done) => {
              setEditing(null);
              setMessage(done);
            }}
            onCancel={() => setEditing(null)}
          />
        </div>
      </div>
    </>
  );
}
