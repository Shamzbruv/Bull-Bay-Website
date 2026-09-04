"use client";

import { useActionState } from "react";
import { saveProduct } from "@/app/(admin)/admin/actions";
import { initialActionState } from "@/lib/action-state";
import { SubmitButton } from "@/components/submit-button";
import { FormStatus } from "@/components/form-status";

export function ProductForm() {
  const [state, formAction] = useActionState(saveProduct, initialActionState);
  return (
    <form className="clay-form" action={formAction}>
      <div className="form-row">
        <label>
          Name
          <input name="name" required />
        </label>
        <label>
          Price (JMD)
          <input name="price" required placeholder="2500" />
        </label>
      </div>
      <label>
        Description
        <textarea name="description" />
      </label>
      <div className="form-row">
        <label>
          Kind
          <select name="kind" defaultValue="physical">
            <option value="physical">Physical</option>
            <option value="digital">Digital</option>
            <option value="software">Software</option>
            <option value="service">Service</option>
            <option value="subscription">Subscription</option>
          </select>
        </label>
        <label>
          Initial stock (physical only)
          <input type="number" name="initial_stock" min={0} defaultValue={0} />
        </label>
      </div>
      <label>
        Status
        <select name="status" defaultValue="draft">
          <option value="draft">Draft</option>
          <option value="active">Active</option>
          <option value="archived">Archived</option>
        </select>
      </label>
      <FormStatus state={state} />
      <SubmitButton pendingLabel="Saving…">Create product</SubmitButton>
    </form>
  );
}
