"use client";

import { useState } from "react";
import { PastoralCalendar } from "@/components/calendar/pastoral-calendar";
import { CounselRequestForm, type TeamOption } from "./request-form";

/**
 * Owns "whose calendar am I looking at" + "which slot did I pick", so the
 * calendar and the request form (reason/details only now — see
 * request-form.tsx) stay in sync without either needing its own copy of
 * the state. This is the filter the pastoral team member picker used to
 * be, just attached to an actual calendar instead of a bare <select>.
 */
export function BookingCalendar({ team }: { team: TeamOption[] }) {
  const [personId, setPersonId] = useState(team[0]?.profileId ?? "");
  const [selectedSlot, setSelectedSlot] = useState<{ startsAt: string; endsAt: string } | null>(null);

  return (
    <div>
      <label className="calendar-person-filter">
        Viewing calendar for
        <select
          value={personId}
          onChange={(e) => {
            setPersonId(e.target.value);
            setSelectedSlot(null);
          }}
        >
          {team.map((t) => (
            <option key={t.profileId} value={t.profileId}>
              {t.name}
              {t.isPastor ? " (Pastor)" : ""}
              {t.isTrainedCounselor ? " — trained counselor" : ""}
            </option>
          ))}
        </select>
      </label>

      <PastoralCalendar
        mode="book"
        availability={[]}
        events={[]}
        bookingPersonId={personId}
        selectedSlotIso={selectedSlot?.startsAt}
        onSlotSelect={(startsAt, endsAt) => setSelectedSlot({ startsAt, endsAt })}
      />

      <CounselRequestForm team={team} personId={personId} selectedSlot={selectedSlot} onClearSlot={() => setSelectedSlot(null)} />
    </div>
  );
}
