"use client";

import { useState, useTransition } from "react";
import { claimRequest, denyRequest } from "./actions";

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
  return (
    <span className="inline-action">
      <button
        type="button"
        className="secondary-button compact"
        disabled={pending}
        onClick={() => {
          const reason = prompt("Reason for not approving this request?");
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
