"use client";

import { useActionState } from "react";
import { uploadConferenceDocument } from "@/app/(admin)/admin/actions";
import { initialActionState } from "@/lib/action-state";
import { SubmitButton } from "@/components/submit-button";
import { FormStatus } from "@/components/form-status";

export function UploadForm() {
  const [state, formAction] = useActionState(uploadConferenceDocument, initialActionState);
  return (
    <form className="clay-form" action={formAction}>
      <label>
        Replace conference document
        <input type="file" name="file" accept=".pptx,.pdf" required />
      </label>
      <FormStatus state={state} />
      <SubmitButton pendingLabel="Uploading…">Upload new version</SubmitButton>
    </form>
  );
}
