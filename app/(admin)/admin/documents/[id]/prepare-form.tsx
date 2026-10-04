"use client";

import { useActionState, useState } from "react";
import { prepareRequest } from "../actions";
import { initialActionState } from "@/lib/action-state";
import { SubmitButton } from "@/components/submit-button";
import { FormStatus } from "@/components/form-status";
import { UrgentSignFields } from "../urgent-sign-fields";

export function PrepareForm({ requestId, initialBody, canUrgentSign, signingReady }: { requestId: string; initialBody: string; canUrgentSign: boolean; signingReady: boolean }) {
  const action = prepareRequest.bind(null, requestId);
  const [state, formAction] = useActionState(action, initialActionState);
  const [urgent, setUrgent] = useState(false);

  return (
    <form className="clay-form" action={formAction}>
      <label>
        Final document text
        <textarea name="prepared_body" required defaultValue={initialBody} style={{ minHeight: 260 }} />
      </label>
      {canUrgentSign && <UrgentSignFields urgent={urgent} onChange={setUrgent} signingReady={signingReady} />}
      <FormStatus state={state} />
      <SubmitButton pendingLabel={urgent ? "Signing…" : "Sending…"}>{urgent ? "Sign, stamp and send now" : "Send to Pastor for certification"}</SubmitButton>
    </form>
  );
}
