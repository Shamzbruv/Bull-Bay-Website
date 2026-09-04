"use client";

import { useActionState } from "react";
import { registerForEvent } from "@/app/(public)/actions";
import { initialActionState } from "@/lib/action-state";
import { SubmitButton } from "@/components/submit-button";
import { FormStatus } from "@/components/form-status";

export function RegisterForm({ eventId, signedIn }: { eventId: string; signedIn: boolean }) {
  const action = registerForEvent.bind(null, eventId);
  const [state, formAction] = useActionState(action, initialActionState);

  return (
    <form className="clay-form" action={formAction}>
      <h3 style={{ fontFamily: "var(--font-display)", color: "var(--color-blue-700)", margin: "0 0 16px" }}>
        Register for this event
      </h3>
      {!signedIn && (
        <>
          <label>
            Your name
            <input name="guestName" required autoComplete="name" />
          </label>
          <label>
            Email address
            <input name="guestEmail" type="email" required autoComplete="email" />
          </label>
        </>
      )}
      <label>
        Number attending
        <input name="quantity" type="number" min={1} defaultValue={1} />
      </label>
      <FormStatus state={state} />
      <SubmitButton pendingLabel="Registering…">Register <span>→</span></SubmitButton>
    </form>
  );
}
