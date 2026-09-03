"use client";

import { useState, useTransition } from "react";
import { resetMemberPassword } from "./actions";

export function ResetPasswordButton({ profileId, hasAccount }: { profileId: string; hasAccount: boolean }) {
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  if (!hasAccount) {
    return <span style={{ fontSize: ".72rem", color: "var(--color-muted)" }}>No account yet</span>;
  }

  return (
    <div>
      <button
        type="button"
        className="secondary-button compact"
        disabled={pending}
        onClick={() => {
          if (!confirm("Reset this member's password? They'll need the temporary password shown to sign in.")) return;
          startTransition(async () => {
            const result = await resetMemberPassword(profileId);
            setMessage(result.message);
          });
        }}
      >
        {pending ? "Resetting…" : "Reset password"}
      </button>
      {message && (
        <p style={{ fontSize: ".72rem", marginTop: 6, maxWidth: 260, color: message.includes("Temporary") ? "var(--color-olive-700)" : "#a8341f" }}>
          {message}
        </p>
      )}
    </div>
  );
}
