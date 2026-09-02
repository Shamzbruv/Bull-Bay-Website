"use client";

import { useActionState } from "react";
import { saveHousehold } from "@/app/(member)/member/actions";
import { initialActionState } from "@/app/(public)/actions";
import { SubmitButton } from "@/components/submit-button";
import { FormStatus } from "@/components/form-status";

export function HouseholdForm({ initialName }: { initialName: string }) {
  const [state, formAction] = useActionState(saveHousehold, initialActionState);
  return (
    <form className="clay-form" action={formAction}>
      <label>
        Household name
        <input name="name" defaultValue={initialName} placeholder="e.g. The Campbell Family" required />
      </label>
      <FormStatus state={state} />
      <SubmitButton pendingLabel="Saving…">Save household</SubmitButton>
    </form>
  );
}
