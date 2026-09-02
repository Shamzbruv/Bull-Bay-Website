"use client";

import { useActionState } from "react";
import { submitPrayerRequest, initialActionState } from "@/app/(public)/actions";
import { SubmitButton } from "@/components/submit-button";
import { FormStatus } from "@/components/form-status";

export function PrayerForm() {
  const [state, formAction] = useActionState(submitPrayerRequest, initialActionState);

  return (
    <form className="clay-form" action={formAction}>
      <label>
        Your name (optional)
        <input name="name" autoComplete="name" placeholder="Your name" />
      </label>
      <label>
        Email or phone (optional)
        <input name="contact" placeholder="So we can follow up" />
      </label>
      <label>
        Your prayer request
        <textarea name="request" required placeholder="How can we pray for you?" />
      </label>
      <label className="check-label">
        <input type="checkbox" name="confidential" defaultChecked /> Keep this confidential
      </label>
      <FormStatus state={state} />
      <SubmitButton>
        Send Prayer Request <span>→</span>
      </SubmitButton>
    </form>
  );
}
