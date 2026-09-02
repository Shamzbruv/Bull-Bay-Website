"use client";

import { useActionState } from "react";
import { saveVolunteerOpportunity } from "@/app/(admin)/admin/actions";
import { initialActionState } from "@/app/(public)/actions";
import { SubmitButton } from "@/components/submit-button";
import { FormStatus } from "@/components/form-status";

export function OpportunityForm() {
  const [state, formAction] = useActionState(saveVolunteerOpportunity, initialActionState);
  return (
    <form className="clay-form" action={formAction}>
      <label>
        Title
        <input name="title" required placeholder="e.g. Sunday Ushering Team" />
      </label>
      <label>
        Description
        <textarea name="description" />
      </label>
      <FormStatus state={state} />
      <SubmitButton pendingLabel="Saving…">Create opportunity</SubmitButton>
    </form>
  );
}
