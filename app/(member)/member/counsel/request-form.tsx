"use client";

import { useActionState, useEffect } from "react";
import { submitCounselRequest } from "./actions";
import { initialActionState } from "@/lib/action-state";
import { SubmitButton } from "@/components/submit-button";
import { FormStatus } from "@/components/form-status";
import { COUNSEL_REQUEST_REASONS } from "@/lib/pastoral/reasons";

export type TeamOption = { profileId: string; name: string; isPastor: boolean; isTrainedCounselor: boolean };
type SelectedSlot = { startsAt: string; endsAt: string };

function jamaicaDateKey(iso: string): string {
  return new Date(iso).toLocaleDateString("en-CA", { timeZone: "America/Jamaica" });
}
function jamaicaTime24(iso: string): string {
  return new Date(iso).toLocaleTimeString("en-GB", { timeZone: "America/Jamaica", hour: "2-digit", minute: "2-digit" });
}
function formatSlotRange(slot: SelectedSlot): string {
  const dateLabel = new Date(slot.startsAt).toLocaleDateString("en-US", { timeZone: "America/Jamaica", weekday: "long", month: "long", day: "numeric" });
  const timeLabel = new Date(slot.startsAt).toLocaleTimeString("en-US", { timeZone: "America/Jamaica", hour: "numeric", minute: "2-digit" });
  return `${dateLabel} · ${timeLabel}`;
}

/**
 * Just the "finish the request" half now — picking who and when moved to
 * the calendar (see booking-calendar.tsx), which is what actually drives
 * `personId`/`selectedSlot` here. Kept as its own component (rather than
 * folded into BookingCalendar) since /pastor and other flows may want to
 * reuse just the calendar without this form.
 */
export function CounselRequestForm({
  team,
  personId,
  selectedSlot,
  onClearSlot,
}: {
  team: TeamOption[];
  personId: string;
  selectedSlot: SelectedSlot | null;
  onClearSlot: () => void;
}) {
  const [state, formAction] = useActionState(submitCounselRequest, initialActionState);
  const person = team.find((t) => t.profileId === personId) ?? null;

  // A successful submission clears the picked slot so the calendar
  // doesn't keep showing a now-booked time as "selected".
  useEffect(() => {
    if (state.status === "success") onClearSlot();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  return (
    <form className="clay-form" action={formAction}>
      <input type="hidden" name="requested_with_profile_id" value={personId} />
      <input type="hidden" name="preferred_date" value={selectedSlot ? jamaicaDateKey(selectedSlot.startsAt) : ""} />
      <input type="hidden" name="preferred_time" value={selectedSlot ? jamaicaTime24(selectedSlot.startsAt) : ""} />

      {selectedSlot ? (
        <div className="pcal-selected-slot">
          <span>
            <b>{formatSlotRange(selectedSlot)}</b> with {person?.name ?? "the pastoral team"}
          </span>
          <button type="button" className="link-button" onClick={onClearSlot}>
            change
          </button>
        </div>
      ) : (
        <p className="form-note">Pick an open time from the calendar above to request it.</p>
      )}

      <label>
        Reason
        <select name="reason" required defaultValue="">
          <option value="" disabled>
            Choose…
          </option>
          {COUNSEL_REQUEST_REASONS.map((reason) => (
            <option key={reason}>{reason}</option>
          ))}
        </select>
      </label>
      <label>
        Anything they should know beforehand? (optional)
        <textarea name="details" maxLength={5000} placeholder="Only visible to the person you're meeting with and authorized church leadership." />
      </label>
      <p className="form-note">Your request is pending until the pastoral team confirms it; availability can change before confirmation.</p>
      <FormStatus state={state} />
      <SubmitButton pendingLabel="Sending…" disabled={!selectedSlot}>
        Request this time
      </SubmitButton>
    </form>
  );
}
