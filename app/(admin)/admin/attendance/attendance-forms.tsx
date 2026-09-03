"use client";

import { useActionState } from "react";
import { saveServiceSchedule, submitAttendance, toggleScheduleActive } from "./actions";
import { initialActionState } from "@/app/(public)/actions";
import { SubmitButton } from "@/components/submit-button";
import { FormStatus } from "@/components/form-status";

const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export function ScheduleForm() {
  const [state, formAction] = useActionState(saveServiceSchedule, initialActionState);
  return (
    <form className="clay-form" action={formAction} style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 12, alignItems: "end" }}>
      <label style={{ gridColumn: "span 2" }}>
        Service name
        <input name="label" required placeholder="Sunday Worship Service" />
      </label>
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
        Time
        <input type="time" name="service_time" required />
      </label>
      <div>
        <FormStatus state={state} />
        <SubmitButton pendingLabel="Adding…">Add service</SubmitButton>
      </div>
    </form>
  );
}

export function ScheduleToggle({ id, isActive }: { id: string; isActive: boolean }) {
  return (
    <label className="check-label" style={{ marginBottom: 0 }}>
      <input type="checkbox" defaultChecked={isActive} onChange={(e) => toggleScheduleActive(id, e.target.checked)} />
      Active
    </label>
  );
}

export function AttendanceSubmitForm({ schedules }: { schedules: { id: string; label: string }[] }) {
  const [state, formAction] = useActionState(submitAttendance, initialActionState);
  const today = new Date().toISOString().slice(0, 10);
  return (
    <form className="clay-form" action={formAction} style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 12, alignItems: "end" }}>
      <label>
        Service
        <select name="service_schedule_id" required defaultValue="">
          <option value="" disabled>
            Choose…
          </option>
          {schedules.map((s) => (
            <option key={s.id} value={s.id}>
              {s.label}
            </option>
          ))}
        </select>
      </label>
      <label>
        Date
        <input type="date" name="service_date" required defaultValue={today} />
      </label>
      <label>
        Headcount
        <input type="number" name="headcount" min={0} required />
      </label>
      <label>
        Notes (optional)
        <input type="text" name="notes" />
      </label>
      <div style={{ gridColumn: "1 / -1" }}>
        <FormStatus state={state} />
        <SubmitButton pendingLabel="Saving…">Record attendance</SubmitButton>
      </div>
    </form>
  );
}
