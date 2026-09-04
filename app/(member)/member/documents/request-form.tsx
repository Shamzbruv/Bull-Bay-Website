"use client";

import { useActionState } from "react";
import { submitDocumentRequest } from "./actions";
import { initialActionState } from "@/lib/action-state";
import { SubmitButton } from "@/components/submit-button";
import { FormStatus } from "@/components/form-status";

type Template = { id: string; name: string; description: string | null };

export function RequestForm({ templates }: { templates: Template[] }) {
  const [state, formAction] = useActionState(submitDocumentRequest, initialActionState);

  return (
    <form className="clay-form" action={formAction}>
      <label>
        Document type
        <select name="template_id" required defaultValue="">
          <option value="" disabled>
            Choose a document…
          </option>
          {templates.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
        </select>
      </label>
      <label>
        What is this for?
        <textarea name="purpose" required placeholder="e.g. Needed for a visa application, employer request, etc." />
      </label>
      <FormStatus state={state} />
      <SubmitButton pendingLabel="Submitting…">Submit request</SubmitButton>
      <p className="form-note">Your request goes to the pastor&apos;s office to prepare and certify.</p>
    </form>
  );
}
