"use client";

import { useState, useTransition } from "react";
import { deleteSubmission } from "./actions";

/**
 * Deleting is permanent and there is no undo, so it always asks first and
 * names who the message is from — on a screen full of near-identical spam
 * rows, "Delete this submission?" alone is too easy to confirm against the
 * wrong row.
 */
export function DeleteSubmissionButton({ id, label }: { id: string; label: string }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState("");

  function onDelete() {
    if (!window.confirm(`Permanently delete the submission from ${label}? This cannot be undone.`)) return;
    setError("");
    startTransition(async () => {
      const result = await deleteSubmission(id);
      if (result.status === "error") setError(result.message);
    });
  }

  return (
    <>
      <button type="button" className="secondary-button compact danger" onClick={onDelete} disabled={pending}>
        {pending ? "Deleting…" : "Delete"}
      </button>
      {error && (
        <span role="alert" className="form-error">
          {error}
        </span>
      )}
    </>
  );
}
