"use client";

import { useState, useTransition } from "react";
import { approveMembershipRequest, declineMembershipRequest } from "./actions";

export function MembershipRequestButtons({ id, status, approved }: { id: string; status: string; approved: boolean }) {
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);

  if (status === "closed") return <span className={approved ? "badge" : "badge gray"}>{approved ? "Approved" : "Declined"}</span>;

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
