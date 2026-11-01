"use client";
import { useActionState, useState, useTransition } from "react";
import { initialActionState } from "@/lib/action-state";
import { FormStatus } from "@/components/form-status";
import { SubmitButton } from "@/components/submit-button";
import { useConfirm } from "@/components/dialog-provider";
import { invitePastor, resendInvitation, revokeSignature } from "./actions";
export function InvitePastorForm() {
  const [state, action] = useActionState(invitePastor, initialActionState);
  return <form action={action} className="clay-form"><label>Pastor&apos;s email address<input type="email" name="email" required maxLength={320} placeholder="pastor@example.com" /></label><FormStatus state={state} /><SubmitButton pendingLabel="Sending…">Email signature invitation</SubmitButton></form>;
}
export function SignatureControls({ id, accepted }: { id: string; accepted: boolean }) {
  const [pending, start] = useTransition(); const [message, setMessage] = useState(""); const confirm = useConfirm();
  return <div className="button-row">{!accepted && <button className="secondary-button compact" disabled={pending} onClick={() => start(async () => setMessage((await resendInvitation(id)).message))}>Resend invitation</button>}
    <button className="secondary-button compact danger" disabled={pending} onClick={async () => { if (await confirm({ title: "Revoke this signature authorization?", message: "This disables the invitation and prevents future use of the saved signature. Documents already issued are kept.", confirmLabel: "Revoke" })) start(async () => setMessage((await revokeSignature(id)).message)); }}>Revoke</button><span role="status">{message}</span></div>;
}
