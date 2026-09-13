"use client";

import { useState, useTransition } from "react";
import { PastoralCalendar, type AvailabilityBlock, type CalendarEntry } from "./pastoral-calendar";
import { removeAvailability, removeCalendarEvent } from "@/app/(member)/member/team-calendar/actions";
import { AvailabilityForm, EventForm } from "@/app/(member)/member/team-calendar/calendar-forms";

/**
 * Wraps the visual calendar with the actual add/remove wiring for a
 * pastoral team member's own hours + entries — used at both
 * /member/team-calendar and /pastor/calendar (see team-calendar-view.tsx).
 * Removing something here calls the same server actions the old flat-list
 * "remove" links used; those already revalidatePath the page, so the
 * fresh availability/events just flow back down as props.
 */
export function ManageCalendarPanel({ availability, events }: { availability: AvailabilityBlock[]; events: CalendarEntry[] }) {
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);

  function handleRemoveAvailability(id: string) {
    startTransition(async () => {
      const result = await removeAvailability(id);
      setMessage(result.message);
    });
  }
  function handleRemoveEvent(id: string) {
    startTransition(async () => {
      const result = await removeCalendarEvent(id);
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
      />
      {message && (
        <p className="form-note" role="status" aria-live="polite">
          {pending ? "Updating…" : message}
        </p>
      )}
      <div className="pcal-forms">
        <AvailabilityForm />
        <EventForm />
      </div>
    </>
  );
}
