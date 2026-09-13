"use client";

import { useActionState, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { submitCounselRequest } from "./actions";
import { initialActionState } from "@/lib/action-state";
import { SubmitButton } from "@/components/submit-button";
import { FormStatus } from "@/components/form-status";
import { COUNSEL_REQUEST_REASONS } from "@/lib/pastoral/reasons";

type TeamOption = { profileId: string; name: string; isPastor: boolean; isTrainedCounselor: boolean };
export function CounselRequestForm({ team }: { team: TeamOption[] }) {
  const [state, formAction] = useActionState(submitCounselRequest, initialActionState);
  const [person, setPerson] = useState("");
  const [date, setDate] = useState("");
  const [slots, setSlots] = useState<{ starts_at: string; ends_at: string }[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => {
    if (!person || !date) return;
    let active = true;
    createClient().rpc("available_counsel_slots", { person, on_date: date }).then(({ data, error }) => {
      if (!active) return;
      setSlots(data ?? []);
      setError(error ? "Available times could not be loaded. Please choose the date again to retry." : "");
      setLoading(false);
    });
    return () => { active = false; };
  }, [person, date, state]);
  function resetSlots() { setSlots([]); setError(""); setLoading(true); }
  return (
    <form className="clay-form" action={formAction}>
      <label>Who would you like to meet with?
        <select name="requested_with_profile_id" required value={person} onChange={e => { resetSlots(); setPerson(e.target.value); }}>
          <option value="" disabled>Choose…</option>
          {team.map(t => <option key={t.profileId} value={t.profileId}>{t.name}{t.isPastor ? " (Pastor)" : ""}{t.isTrainedCounselor ? " — trained counselor" : ""}</option>)}
        </select>
      </label>
      <label>Reason<select name="reason" required defaultValue=""><option value="" disabled>Choose…</option>{COUNSEL_REQUEST_REASONS.map(reason => <option key={reason}>{reason}</option>)}</select></label>
      <label>Preferred date<input type="date" name="preferred_date" required value={date} onChange={e => { resetSlots(); setDate(e.target.value); }} /></label>
      <label>Available time (Jamaica, 30 minutes)
        <select key={`${person}-${date}-${slots.map(s => s.starts_at).join()}`} name="preferred_time" required defaultValue="" disabled={!person || !date || loading || slots.length === 0}>
          <option value="" disabled>{loading && person && date ? "Loading…" : "Choose an available time"}</option>
          {slots.map(slot => {
            const time = new Date(slot.starts_at).toLocaleTimeString("en-GB", { timeZone: "America/Jamaica", hour: "2-digit", minute: "2-digit" });
            return <option key={slot.starts_at} value={time}>{time}</option>;
          })}
        </select>
      </label>
      {error && <p role="alert">{error}</p>}
      {person && date && !loading && !error && !slots.length && <p role="status">No available times on this day. Choose another day or contact the church office.</p>}
      <label>Anything they should know beforehand? (optional)<textarea name="details" maxLength={5000} placeholder="Only visible to the person you're meeting with and authorized church leadership." /></label>
      <p className="form-note">Times exclude days off and private busy entries. Your request is pending until the pastoral team confirms it; availability can change before confirmation.</p>
      <FormStatus state={state} />
      <SubmitButton pendingLabel="Sending…">Request this time</SubmitButton>
    </form>
  );
}
