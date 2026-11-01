"use client";
import { useActionState, useState } from "react";
import { SignaturePad } from "@/components/forms/signature-pad";
import { initialActionState } from "@/lib/action-state";
import { FormStatus } from "@/components/form-status";
import { SubmitButton } from "@/components/submit-button";
import { acknowledgeDocument } from "./actions";
export function SigningForm({ token }: { token: string }) {
  const [signature, setSignature] = useState<string | null>(null);
  const [state, action] = useActionState(acknowledgeDocument.bind(null, token), initialActionState);
  if (state.status === "success") return <FormStatus state={state} />;
  return <form action={action} className="clay-form">
    <label className="check-label"><input type="checkbox" name="acknowledge" required />I confirm that I am the named officiating pastor, that I officiated the ceremony described above, and that this is my signature for this document.</label>
    <p id="signature-label">Your signature</p><p id="signature-help">Draw below using your mouse or finger. Your signature applies only to this document.</p>
    <SignaturePad value={signature} onChange={setSignature} labelledBy="signature-label" describedBy="signature-help" />
    <input type="hidden" name="signature" value={signature ?? ""} />
    <FormStatus state={state} /><SubmitButton pendingLabel="Saving…">Acknowledge and sign</SubmitButton>
  </form>;
}
