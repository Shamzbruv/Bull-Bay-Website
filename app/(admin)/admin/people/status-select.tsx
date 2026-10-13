"use client";

import { useState, useTransition } from "react";
import { updateMembershipStatus } from "@/app/(admin)/admin/actions";

import { MEMBERSHIP_STATUSES as STATUSES } from "@/lib/members/records";

export function StatusSelect({ profileId, status }: { profileId: string; status: string }) {
  const [value, setValue] = useState(status);
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const displayedValue = pending ? value : status;

  return (
    <span className="inline-action">
      <select
        value={displayedValue}
        disabled={pending}
        aria-label="Membership status"
        onChange={(event) => {
          const previous = value;
          const next = event.target.value;
          setValue(next);
          setMessage(null);
          startTransition(async () => {
            const result = await updateMembershipStatus(profileId, next);
            setMessage(result.message);
            if (result.status === "error") setValue(previous);
          });
        }}
      >
        {STATUSES.map((item) => (
          <option key={item} value={item}>
            {item.replaceAll("_", " ")}
          </option>
        ))}
      </select>
      {message && <small role="status">{message}</small>}
    </span>
  );
}
