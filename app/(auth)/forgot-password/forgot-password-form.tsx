"use client";

import { useActionState } from "react";
import { requestPasswordReset } from "./actions";
import { initialActionState } from "@/app/(public)/actions";
import { SubmitButton } from "@/components/submit-button";

export function ForgotPasswordForm() {
  const [state, formAction] = useActionState(requestPasswordReset, initialActionState);

  if (state.status === "success") {
    return <div className="alert success">{state.message}</div>;
  }

  return (
    <form action={formAction} className="clay-form" style={{ padding: 0, background: "transparent", boxShadow: "none" }}>
      <label>
        Email address
        <input type="email" name="email" required autoComplete="email" placeholder="you@example.com" />
      </label>
      {state.status === "error" && <div className="alert warn">{state.message}</div>}
      <SubmitButton pendingLabel="Sending…">Send reset link</SubmitButton>
    </form>
  );
}
