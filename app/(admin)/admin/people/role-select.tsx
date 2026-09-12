"use client";

import { useState, useTransition } from "react";
import { setPersonRole } from "@/app/(admin)/admin/actions";

export function RoleSelect({ profileId, roleId, roles }: { profileId: string; roleId: string; roles: { id: string; name: string }[] }) {
  const [value, setValue] = useState(roleId);
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  return (
    <span className="inline-action">
      <select
        value={value}
        disabled={pending}
        aria-label="Staff role"
        onChange={(event) => {
          const previous = value;
          const next = event.target.value;
          setValue(next);
          setMessage(null);
          startTransition(async () => {
            const result = await setPersonRole(profileId, next);
            setMessage(result.message);
            if (result.status === "error") setValue(previous);
          });
        }}
      >
        <option value="">Member (no staff role)</option>
        {roles.map((r) => (
          <option key={r.id} value={r.id}>
            {r.name}
          </option>
        ))}
      </select>
      {message && <small role="status">{message}</small>}
    </span>
  );
}
