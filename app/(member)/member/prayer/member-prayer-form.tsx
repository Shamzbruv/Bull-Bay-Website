"use client";

import { useActionState } from "react";
import { submitPrayerRequest } from "@/app/(public)/actions";
import { initialActionState } from "@/lib/action-state";
import { SubmitButton } from "@/components/submit-button";
import { FormStatus } from "@/components/form-status";

/** Same submitPrayerRequest() the public /prayer page uses — signed-in
 * members already have a name and contact on file, so this only asks for
 * what's actually needed from them. */
export function MemberPrayerForm() {
  const [state, formAction] = useActionState(submitPrayerRequest, initialActionState);

  if (state.status === "success") {
    return <div className="alert success">{state.message}</div>;
  }

  return (
    <form className="clay-form" action={formAction}>
      <label>
        Your prayer request
        <textarea name="request" required placeholder="How can we pray for you?" style={{ minHeight: 140 }} />
      </label>
      <label className="check-label">
        <input type="checkbox" name="confidential" defaultChecked /> Keep this confidential — visible only to the
        pastor and prayer team leadership
      </label>
      <FormStatus state={state} />
      <SubmitButton pendingLabel="Sending…">Send prayer request</SubmitButton>
    </form>
  );
}
