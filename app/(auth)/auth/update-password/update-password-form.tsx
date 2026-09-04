"use client";

import { useActionState } from "react";
import { updateAccountPassword } from "./actions";
import { initialActionState } from "@/app/(public)/actions";
import { SubmitButton } from "@/components/submit-button";
import { FormStatus } from "@/components/form-status";

export function UpdatePasswordForm({ forced }: { forced: boolean }) {
  const [state, formAction] = useActionState(updateAccountPassword, initialActionState);

  return (
    <form action={formAction} className="clay-form" style={{ padding: 0, background: "transparent", boxShadow: "none" }}>
      {forced && (
        <div className="alert info" style={{ marginBottom: 20 }}>
          For security, please set your own password before continuing.
        </div>
      )}
      <label>
        New password
        <input
          name="password"
          type="password"
          required
          minLength={8}
          maxLength={128}
          autoComplete="new-password"
        />
      </label>
      <label>
        Confirm new password
        <input
          name="confirm_password"
          type="password"
          required
          minLength={8}
          maxLength={128}
          autoComplete="new-password"
        />
      </label>
      <FormStatus state={state} />
      <SubmitButton pendingLabel="Saving…">Set password</SubmitButton>
    </form>
  );
}
