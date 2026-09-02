"use client";

import { useActionState } from "react";
import { updateNotificationPreferences } from "@/app/(member)/member/actions";
import { initialActionState } from "@/app/(public)/actions";
import { SubmitButton } from "@/components/submit-button";
import { FormStatus } from "@/components/form-status";

export function NotificationsForm({ emailEnabled, smsEnabled }: { emailEnabled: boolean; smsEnabled: boolean }) {
  const [state, formAction] = useActionState(updateNotificationPreferences, initialActionState);
  return (
    <form className="clay-form" action={formAction}>
      <label className="check-label">
        <input type="checkbox" name="email_enabled" defaultChecked={emailEnabled} /> Email updates
      </label>
      <label className="check-label" style={{ marginTop: 12 }}>
        <input type="checkbox" name="sms_enabled" defaultChecked={smsEnabled} /> SMS alerts (urgent only)
      </label>
      <FormStatus state={state} />
      <SubmitButton pendingLabel="Saving…">Save preferences</SubmitButton>
    </form>
  );
}
