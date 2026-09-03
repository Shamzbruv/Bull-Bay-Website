"use client";

import { useActionState, useState } from "react";
import { sendHelpRequest, updateHelpRequestStatus } from "./actions";
import { initialActionState } from "@/app/(public)/actions";
import { SubmitButton } from "@/components/submit-button";
import { FormStatus } from "@/components/form-status";

export function RequestHelpButton({ profileId, name }: { profileId: string; name: string }) {
  const [open, setOpen] = useState(false);
  const [state, formAction] = useActionState(sendHelpRequest.bind(null, profileId), initialActionState);

  if (state.status === "success") {
    return <p style={{ fontSize: ".8rem", color: "var(--color-olive-700)" }}>{state.message}</p>;
  }

  if (!open) {
    return (
      <button type="button" className="secondary-button compact" onClick={() => setOpen(true)}>
        Request help
      </button>
    );
  }

  return (
    <form action={formAction} style={{ marginTop: 8 }}>
      <textarea name="message" required placeholder={`What do you need from ${name}?`} style={{ width: "100%", minHeight: 70 }} />
      <div style={{ display: "flex", gap: 8, marginTop: 6, alignItems: "center" }}>
        <SubmitButton pendingLabel="Sending…">Send request</SubmitButton>
        <button type="button" className="link-button" onClick={() => setOpen(false)}>
          Cancel
        </button>
      </div>
      <FormStatus state={state} />
    </form>
  );
}

export function RequestStatusActions({ id, status }: { id: string; status: string }) {
  if (status !== "sent") return <span className="badge blue">{status}</span>;
  return (
    <div style={{ display: "flex", gap: 6 }}>
      <button type="button" className="link-button" onClick={() => updateHelpRequestStatus(id, "responded")}>
        mark responded
      </button>
      <button type="button" className="link-button" onClick={() => updateHelpRequestStatus(id, "closed")}>
        close
      </button>
    </div>
  );
}
