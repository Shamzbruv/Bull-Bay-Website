"use client";

import { useState, useTransition } from "react";
import { claimRequest, denyRequest } from "./actions";
import { certifyDocumentUrgently } from "@/app/(pastor)/pastor/documents/actions";
import { usePrompt } from "@/components/dialog-provider";

export function ClaimButton({ requestId }: { requestId: string }) {
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  return (
    <span className="inline-action">
      <button
        type="button"
        className="secondary-button compact"
        disabled={pending}
        onClick={() => startTransition(async () => setMessage((await claimRequest(requestId)).message))}
      >
        {pending ? "Assigning…" : "Start reviewing"}
      </button>
      {message && <small role="status">{message}</small>}
    </span>
  );
}

export function DenyButton({ requestId }: { requestId: string }) {
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const prompt = usePrompt();
  return (
    <span className="inline-action">
      <button
        type="button"
        className="secondary-button compact"
        disabled={pending}
        onClick={async () => {
          const reason = await prompt({
            title: "Deny this request",
            message: "Let the member know why, so they can put in a corrected request.",
            placeholder: "Reason for not approving this request",
            confirmLabel: "Deny request",
          });
          if (!reason) return;
          startTransition(async () => setMessage((await denyRequest(requestId, reason)).message));
        }}
      >
        {pending ? "Updating…" : "Deny"}
      </button>
      {message && <small role="status">{message}</small>}
    </span>
  );
}

/** For someone in the office who can't certify normally: sign a document
 *  that's waiting on the Pastor's desk, because it can't wait. */
export function UrgentSignButton({ requestId, signingReady }: { requestId: string; signingReady: boolean }) {
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const prompt = usePrompt();
  if (!signingReady) return null;
  return (
    <span className="inline-action">
      <button
        type="button"
        className="secondary-button compact danger"
        disabled={pending}
        onClick={async () => {
          const reason = await prompt({
            title: "Urgent: sign for the Pastor?",
            message:
              "His signature and the church stamp will be applied now and the PDF sent. He's told straight away, by notification and email, that you did it and why.",
            placeholder: "Why can't this wait for the Pastor?",
            confirmLabel: "Sign, stamp and send",
          });
          if (!reason) return;
          startTransition(async () => setMessage((await certifyDocumentUrgently(requestId, reason)).message));
        }}
      >
        {pending ? "Signing…" : "Urgent: sign now"}
      </button>
      {message && <small role="status">{message}</small>}
    </span>
  );
}
