"use client";

import { useState, useTransition } from "react";
import { revokeRole } from "@/app/(admin)/admin/actions";

export function RevokeButton({ userRoleId }: { userRoleId: string }) {
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);

  return (
    <span className="inline-action">
      <button
        type="button"
        className="secondary-button compact"
        disabled={pending}
        onClick={() => {
          if (!confirm("Remove this staff role?")) return;
          startTransition(async () => setMessage((await revokeRole(userRoleId)).message));
        }}
      >
        {pending ? "Removing…" : "Revoke"}
      </button>
      {message && <small role="status">{message}</small>}
    </span>
  );
}
