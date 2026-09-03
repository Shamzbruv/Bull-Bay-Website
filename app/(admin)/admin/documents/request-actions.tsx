"use client";

import { claimRequest, denyRequest } from "./actions";

export function ClaimButton({ requestId }: { requestId: string }) {
  return (
    <button type="button" className="secondary-button compact" onClick={() => claimRequest(requestId)}>
      Start reviewing
    </button>
  );
}

export function DenyButton({ requestId }: { requestId: string }) {
  return (
    <button
      type="button"
      className="secondary-button compact"
      onClick={() => {
        const reason = prompt("Reason for not approving this request?");
        if (reason) denyRequest(requestId, reason);
      }}
    >
      Deny
    </button>
  );
}
