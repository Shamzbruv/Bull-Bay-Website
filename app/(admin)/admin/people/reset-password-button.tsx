"use client";

import { useState, useTransition } from "react";
import { resetMemberPassword } from "./actions";
import { useConfirm } from "@/components/dialog-provider";

export function ResetPasswordButton({ profileId, hasAccount }: { profileId: string; hasAccount: boolean }) {
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const confirm = useConfirm();

  if (!hasAccount) {
    return <span style={{ fontSize: ".72rem", color: "var(--color-muted)" }}>No account yet</span>;
  }

  return (
    <div>
      <button
        type="button"
        className="secondary-button compact"
        disabled={pending}
        onClick={async () => {
          if (!(await confirm({ message: "Send a password reset link to this account's registered email?", confirmLabel: "Send link" }))) return;
          startTransition(async () => {
            const result = await resetMemberPassword(profileId);
            setMessage(result.message);
          });
        }}
      >
        {pending ? "Sending…" : "Reset password"}
      </button>
      {message && (
        <p style={{ fontSize: ".72rem", marginTop: 6, maxWidth: 260, color: message.includes("was sent") ? "var(--color-olive-700)" : "#a8341f" }}>
          {message}
        </p>
      )}
    </div>
  );
}
