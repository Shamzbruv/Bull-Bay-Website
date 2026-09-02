"use client";

import { useActionState } from "react";
import { updateCareCase } from "@/app/(pastor)/pastor/actions";
import { initialActionState } from "@/app/(public)/actions";
import { SubmitButton } from "@/components/submit-button";
import { FormStatus } from "@/components/form-status";
import type { Database } from "@/lib/supabase/types";

type CareCase = Database["public"]["Tables"]["care_cases"]["Row"];

export function CaseForm({ careCase }: { careCase: CareCase }) {
  const action = updateCareCase.bind(null, careCase.id);
  const [state, formAction] = useActionState(action, initialActionState);

  return (
    <form className="clay-form" action={formAction}>
      <label>
        Summary
        <input name="summary" defaultValue={careCase.summary ?? ""} />
      </label>
      <label>
        Confidential notes
        <textarea name="confidential_notes" defaultValue={careCase.confidential_notes ?? ""} style={{ minHeight: 160 }} />
      </label>
      <label>
        Status
        <select name="status" defaultValue={careCase.status}>
          <option value="open">Open</option>
          <option value="in_progress">In progress</option>
          <option value="closed">Closed</option>
        </select>
      </label>
      <FormStatus state={state} />
      <SubmitButton pendingLabel="Saving…">Save case</SubmitButton>
    </form>
  );
}
