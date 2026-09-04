"use client";

import { useState, useTransition } from "react";
import type { ActionState } from "@/app/(public)/actions";

/** Generic confirm-then-delete button for admin list rows. `action` must
 * already check the caller's permission — this component adds no access
 * control of its own, just the confirm prompt and pending/result state. */
export function DeleteButton({
  action,
  id,
  confirmText = "Delete this permanently?",
  label = "Delete",
}: {
  action: (id: string) => Promise<ActionState>;
  id: string;
  confirmText?: string;
  label?: string;
}) {
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);

  return (
    <span className="inline-action">
      <button
        type="button"
        className="link-button"
        disabled={pending}
        onClick={() => {
          if (!confirm(confirmText)) return;
          startTransition(async () => setMessage((await action(id)).message));
        }}
      >
        {pending ? "Deleting…" : label}
      </button>
      {message && <small role="status">{message}</small>}
    </span>
  );
}
