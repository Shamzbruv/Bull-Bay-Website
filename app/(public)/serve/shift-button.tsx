"use client";

import { useActionState } from "react";
import { applyForShift, initialActionState } from "@/app/(public)/actions";
import { SubmitButton } from "@/components/submit-button";
import { FormStatus } from "@/components/form-status";

export function ShiftButton({ shiftId, signedIn }: { shiftId: string; signedIn: boolean }) {
  const action = applyForShift.bind(null, shiftId);
  const [state, formAction] = useActionState(action, initialActionState);

  if (!signedIn) {
    return <span style={{ fontSize: ".78rem", color: "var(--color-muted)" }}>Sign in to volunteer</span>;
  }

  return (
    <form action={formAction} style={{ display: "inline" }}>
      <FormStatus state={state} />
      <SubmitButton className="secondary-button compact" pendingLabel="Signing up…">
        Sign up to serve
      </SubmitButton>
    </form>
  );
}
