"use client";

import { useState, useTransition } from "react";
import { deleteFlaggedSpam } from "./actions";
import { useConfirm } from "@/components/dialog-provider";

/**
 * Bulk clear-out for everything the filter flags. The count comes from the
 * server render so the button can say exactly how many rows will go, but
 * the deletion re-checks each row server-side — this number is for the
 * person reading it, not an instruction the server trusts.
 */
export function SpamCleanupButton({ count }: { count: number }) {
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState("");
  const confirm = useConfirm();

  if (count === 0) return null;

  async function onCleanup() {
    if (!(await confirm({ message: `Permanently delete ${count} submission${count === 1 ? "" : "s"} flagged as spam? This cannot be undone.`, confirmLabel: "Delete", danger: true }))) return;
    startTransition(async () => {
      setResult((await deleteFlaggedSpam()).message);
    });
  }

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
      <button type="button" className="secondary-button danger" onClick={onCleanup} disabled={pending}>
        {pending ? "Deleting…" : `Delete ${count} flagged as spam`}
      </button>
      {result && (
        <span role="status" className="form-note" style={{ margin: 0 }}>
          {result}
        </span>
      )}
    </div>
  );
}
