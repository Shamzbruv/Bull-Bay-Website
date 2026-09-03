"use client";

import { useActionState } from "react";
import { prepareRequest } from "../actions";
import { initialActionState } from "@/app/(public)/actions";
import { SubmitButton } from "@/components/submit-button";
import { FormStatus } from "@/components/form-status";

export function PrepareForm({ requestId, initialBody }: { requestId: string; initialBody: string }) {
  const action = prepareRequest.bind(null, requestId);
  const [state, formAction] = useActionState(action, initialActionState);

  return (
    <form className="clay-form" action={formAction}>
      <label>
        Final document text
        <textarea name="prepared_body" required defaultValue={initialBody} style={{ minHeight: 260 }} />
      </label>
      <FormStatus state={state} />
      <SubmitButton pendingLabel="Sending…">Send to Pastor for certification</SubmitButton>
    </form>
  );
}
