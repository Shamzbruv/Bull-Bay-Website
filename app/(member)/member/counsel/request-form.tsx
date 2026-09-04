"use client";

import { useActionState } from "react";
import { submitCounselRequest } from "./actions";
import { initialActionState } from "@/lib/action-state";
import { SubmitButton } from "@/components/submit-button";
import { FormStatus } from "@/components/form-status";
import { COUNSEL_REQUEST_REASONS } from "@/lib/pastoral/reasons";

type TeamOption = { profileId: string; name: string; isPastor: boolean; isTrainedCounselor: boolean };

export function CounselRequestForm({ team }: { team: TeamOption[] }) {
  const [state, formAction] = useActionState(submitCounselRequest, initialActionState);

  return (
    <form className="clay-form" action={formAction}>
      <label>
        Who would you like to meet with?
        <select name="requested_with_profile_id" required defaultValue="">
          <option value="" disabled>
            Choose…
          </option>
          {team.map((t) => (
            <option key={t.profileId} value={t.profileId}>
              {t.name}
              {t.isPastor ? " (Senior Pastor)" : ""}
              {t.isTrainedCounselor ? " — trained counselor" : ""}
            </option>
          ))}
        </select>
      </label>
      <label>
        Reason
        <select name="reason" required defaultValue="">
          <option value="" disabled>
            Choose…
          </option>
          {COUNSEL_REQUEST_REASONS.map((r) => (
            <option key={r} value={r}>
              {r}
            </option>
          ))}
        </select>
      </label>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <label>
          Preferred date (optional)
          <input type="date" name="preferred_date" />
        </label>
        <label>
          Preferred time (optional)
          <input type="time" name="preferred_time" />
        </label>
      </div>
      <label>
        Anything they should know beforehand? (optional)
        <textarea name="details" placeholder="Kept private — only visible to the person you're meeting with and church leadership." />
      </label>
      <p className="form-note">
        If your preferred time falls outside their published hours, we&apos;ll mark it urgent so it&apos;s not missed.
      </p>
      <FormStatus state={state} />
      <SubmitButton pendingLabel="Sending…">Send request</SubmitButton>
    </form>
  );
}
