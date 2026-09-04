"use client";

import { useState, useTransition } from "react";
import { approveMembershipRequest, declineMembershipRequest } from "./actions";

export function MembershipRequestButtons({ id, status }: { id: string; status: string }) {
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);

  if (status === "approved") return <span className="badge">Approved</span>;
  if (status === "declined") return <span className="badge gray">Declined</span>;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6, alignItems: "flex-start" }}>
      <div style={{ display: "flex", gap: 6 }}>
        <button
          type="button"
          className="secondary-button compact"
          disabled={isPending}
          onClick={() =>
            startTransition(async () => {
              const result = await approveMembershipRequest(id);
              setMessage(result.message);
            })
          }
        >
          Approve &amp; create account
        </button>
        <button
          type="button"
          className="secondary-button compact"
          disabled={isPending}
          onClick={() =>
            startTransition(async () => {
              setMessage(null);
              await declineMembershipRequest(id);
            })
          }
        >
          Decline
        </button>
      </div>
      {message && <small style={{ color: "var(--color-muted)" }}>{message}</small>}
    </div>
  );
}
