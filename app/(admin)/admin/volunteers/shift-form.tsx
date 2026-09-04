"use client";

import { useActionState } from "react";
import { addVolunteerShift } from "@/app/(admin)/admin/actions";
import { initialActionState } from "@/lib/action-state";
import { SubmitButton } from "@/components/submit-button";
import { FormStatus } from "@/components/form-status";

export function ShiftForm({ opportunityId }: { opportunityId: string }) {
  const action = addVolunteerShift.bind(null, opportunityId);
  const [state, formAction] = useActionState(action, initialActionState);
  return (
    <form action={formAction} style={{ display: "flex", gap: 8, alignItems: "flex-end", flexWrap: "wrap", marginTop: 10 }}>
      <label style={{ margin: 0 }}>
        Date/time
        <input type="datetime-local" name="starts_at" required />
      </label>
      <label style={{ margin: 0 }}>
        Slots
        <input type="number" name="slots" defaultValue={1} min={1} style={{ width: 70 }} />
      </label>
      <SubmitButton className="secondary-button compact" pendingLabel="Adding…">
        Add shift
      </SubmitButton>
      <FormStatus state={state} />
    </form>
  );
}
