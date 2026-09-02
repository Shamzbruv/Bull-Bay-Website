"use client";

import { useActionState } from "react";
import { saveFund } from "@/app/(admin)/admin/actions";
import { initialActionState } from "@/app/(public)/actions";
import { SubmitButton } from "@/components/submit-button";
import { FormStatus } from "@/components/form-status";

export function FundForm() {
  const [state, formAction] = useActionState(saveFund, initialActionState);
  return (
    <form action={formAction} style={{ display: "flex", gap: 10, alignItems: "flex-end", flexWrap: "wrap" }}>
      <label style={{ margin: 0 }}>
        Fund name
        <input name="name" required placeholder="e.g. Building Fund" />
      </label>
      <label style={{ margin: 0 }}>
        Short code
        <input name="code" required placeholder="building" />
      </label>
      <SubmitButton className="secondary-button compact" pendingLabel="Saving…">
        Add fund
      </SubmitButton>
      <FormStatus state={state} />
    </form>
  );
}
