"use client";

import { useActionState } from "react";
import { saveAnnualPlanItem } from "@/app/(admin)/admin/actions";
import { initialActionState } from "@/app/(public)/actions";
import { SubmitButton } from "@/components/submit-button";
import { FormStatus } from "@/components/form-status";

const MONTHS = [
  "September", "October", "November", "December", "January", "February",
  "March", "April", "May", "June", "July", "August",
];

export function PlanItemForm() {
  const [state, formAction] = useActionState(saveAnnualPlanItem, initialActionState);
  return (
    <form className="clay-form" action={formAction}>
      <div className="form-row">
        <label>
          Title
          <input name="title" required />
        </label>
        <label>
          Month
          <select name="month" defaultValue="September">
            {MONTHS.map((m) => (
              <option key={m}>{m}</option>
            ))}
          </select>
        </label>
      </div>
      <label>
        Category
        <input name="category" placeholder="e.g. Leadership, Youth, Missions" />
      </label>
      <label>
        Description
        <textarea name="description" />
      </label>
      <FormStatus state={state} />
      <SubmitButton pendingLabel="Saving…">Add plan item</SubmitButton>
    </form>
  );
}
