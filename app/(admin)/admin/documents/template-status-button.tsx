"use client";

import { useState, useTransition } from "react";
import { toggleTemplateActive } from "./actions";

export function TemplateStatusButton({ templateId, isActive }: { templateId: string; isActive: boolean }) {
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);

  return (
    <div className="inline-action">
      <button
        type="button"
        className="secondary-button compact"
        disabled={pending}
        onClick={() => {
          startTransition(async () => {
            const result = await toggleTemplateActive(templateId, !isActive);
            setMessage(result.message);
          });
        }}
      >
        {pending ? "Saving…" : isActive ? "Hide from members" : "Make available"}
      </button>
      {message && <small role="status">{message}</small>}
    </div>
  );
}
