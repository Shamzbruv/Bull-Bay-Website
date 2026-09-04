"use client";

import { useActionState } from "react";
import { submitMembershipRequest } from "@/app/(public)/actions";
import { initialActionState } from "@/lib/action-state";
import { SubmitButton } from "@/components/submit-button";
import { FormStatus } from "@/components/form-status";

export function JoinForm() {
  const [state, formAction] = useActionState(submitMembershipRequest, initialActionState);

  if (state.status === "success") {
    return <div className="alert success">{state.message}</div>;
  }

  return (
    <form className="clay-form" action={formAction}>
      <div className="form-row">
        <label>
          First name
          <input name="firstName" required autoComplete="given-name" />
        </label>
        <label>
          Last name
          <input name="lastName" required autoComplete="family-name" />
        </label>
      </div>
      <label>
        Email address
        <input name="email" type="email" required autoComplete="email" />
      </label>
      <label>
        Phone (optional)
        <input name="phone" autoComplete="tel" />
      </label>
      <label>
        Tell us a little about yourself (optional)
        <textarea name="message" placeholder="Where you're coming from, how long you've been visiting, anything you'd like the pastor to know" />
      </label>
      <FormStatus state={state} />
      <SubmitButton pendingLabel="Sending…">
        Request to join <span>→</span>
      </SubmitButton>
    </form>
  );
}
