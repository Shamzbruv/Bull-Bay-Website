"use client";
import { useActionState, useState } from "react";
import { SignaturePad } from "@/components/forms/signature-pad";
import { initialActionState } from "@/lib/action-state";
import { FormStatus } from "@/components/form-status";
import { SubmitButton } from "@/components/submit-button";
import { authorizePastorSignature } from "./actions";
export function PastorSignatureForm({ token, consent }: { token: string; consent: string }) {
  const [signature, setSignature] = useState<string | null>(null);
  const [state, action] = useActionState(authorizePastorSignature.bind(null, token), initialActionState);
  if (state.status === "success") return <FormStatus state={state} />;
  return <form className="clay-form" action={action}>
    <label>Your full name and title<input name="name" autoComplete="name" required minLength={2} maxLength={200} placeholder="e.g. Rev. John Brown" /></label>
    <h2>Permission to use your signature</h2><p>{consent}</p>
    <label className="check-label"><input type="checkbox" name="consent" required />I have read and agree to this authorization.</label>
    <p id="pastor-signature-label">Your signature</p><p id="pastor-signature-help">Draw below with your mouse or finger. Use Clear to start again.</p>
    <SignaturePad value={signature} onChange={setSignature} labelledBy="pastor-signature-label" describedBy="pastor-signature-help" />
    <input type="hidden" name="signature" value={signature ?? ""} /><FormStatus state={state} /><SubmitButton pendingLabel="Saving…">Save my signature and authorization</SubmitButton>
  </form>;
}
