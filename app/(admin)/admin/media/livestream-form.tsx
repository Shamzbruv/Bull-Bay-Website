"use client";

import { useActionState } from "react";
import { updateLivestreamUrl } from "@/app/(admin)/admin/actions";
import { initialActionState } from "@/lib/action-state";
import { SubmitButton } from "@/components/submit-button";
import { FormStatus } from "@/components/form-status";

export function LivestreamForm({ currentUrl }: { currentUrl: string | null }) {
  const [state, formAction] = useActionState(updateLivestreamUrl, initialActionState);
  return (
    <form action={formAction} style={{ display: "flex", gap: 10, alignItems: "flex-end", flexWrap: "wrap" }}>
      <label style={{ flex: 1, minWidth: 260, margin: 0 }}>
        Livestream URL
        <input name="livestream_url" defaultValue={currentUrl ?? ""} placeholder="https://youtube.com/channel/UC…" />
      </label>
      <SubmitButton className="secondary-button compact" pendingLabel="Saving…">
        Save link
      </SubmitButton>
      <FormStatus state={state} />
    </form>
  );
}
