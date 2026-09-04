"use client";

import { useActionState } from "react";
import { sendBroadcast } from "./actions";
import { initialActionState } from "@/lib/action-state";
import { SubmitButton } from "@/components/submit-button";
import { FormStatus } from "@/components/form-status";

export function BroadcastForm() {
  const [state, formAction] = useActionState(sendBroadcast, initialActionState);
  return (
    <form className="clay-form" action={formAction}>
      <label>
        Title
        <input name="title" required placeholder="A word for the church family" />
      </label>
      <label>
        Message
        <textarea name="body" required placeholder="What would you like every member to see on their dashboard?" style={{ minHeight: 110 }} />
      </label>
      <FormStatus state={state} />
      <SubmitButton pendingLabel="Sending…">Send to every member</SubmitButton>
    </form>
  );
}
