"use client";

import { useActionState } from "react";
import { saveGroup } from "@/app/(admin)/admin/actions";
import { initialActionState } from "@/app/(public)/actions";
import { SubmitButton } from "@/components/submit-button";
import { FormStatus } from "@/components/form-status";

export function GroupForm() {
  const [state, formAction] = useActionState(saveGroup, initialActionState);
  return (
    <form className="clay-form" action={formAction}>
      <div className="form-row">
        <label>
          Name
          <input name="name" required />
        </label>
        <label>
          Category
          <input name="category" placeholder="e.g. Young Adults" />
        </label>
      </div>
      <label>
        Description
        <textarea name="description" />
      </label>
      <label>
        Meeting schedule
        <input name="meeting_schedule" placeholder="e.g. Tuesdays 7pm" />
      </label>
      <label className="check-label">
        <input type="checkbox" name="is_active" defaultChecked /> Active
      </label>
      <FormStatus state={state} />
      <SubmitButton pendingLabel="Saving…">Create group</SubmitButton>
    </form>
  );
}
