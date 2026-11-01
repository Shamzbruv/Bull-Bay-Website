"use client";

import { OfficiantFields, type OfficiantChoice } from "@/components/documents-officiant-fields";
import { useActionState, useState } from "react";
import { prepareRequest } from "../actions";
import { initialActionState } from "@/lib/action-state";
import { SubmitButton } from "@/components/submit-button";
import { FormStatus } from "@/components/form-status";
import { UrgentSignFields } from "../urgent-sign-fields";
import { PreviewNote, PreviewPdfButton } from "../preview-pdf-button";

export function PrepareForm({ requestId, initialBody, canUrgentSign, signingReady, pastors }: { requestId: string; initialBody: string; canUrgentSign: boolean; signingReady: boolean; pastors: OfficiantChoice[] }) {
  const action = prepareRequest.bind(null, requestId);
  const [state, formAction] = useActionState(action, initialActionState);
  const [urgent, setUrgent] = useState(false);
  const [officiant, setOfficiant] = useState(false);

  return (
    <form className="clay-form" action={formAction}>
      <label>
        Final document text
        <textarea name="prepared_body" required defaultValue={initialBody} style={{ minHeight: 260 }} />
      </label>
      <OfficiantFields pastors={pastors} enabled={officiant} onChange={value => { setOfficiant(value); setUrgent(false); }} />
      {canUrgentSign && !officiant && <UrgentSignFields urgent={urgent} onChange={setUrgent} signingReady={signingReady} />}
      <PreviewNote />
      <FormStatus state={state} />
      <div className="form-actions-row">
        <PreviewPdfButton href={`/api/office/documents/${requestId}/preview`} />
        <SubmitButton pendingLabel={urgent ? "Signing…" : "Sending…"}>{officiant ? "Save and request officiating pastor signature" : urgent ? "Sign, stamp and send now" : "Send to Pastor for certification"}</SubmitButton>
      </div>
    </form>
  );
}
