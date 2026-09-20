"use client";

import { useActionState } from "react";
import { uploadSignatureAsset } from "./actions";
import { initialActionState } from "@/lib/action-state";
import { SubmitButton } from "@/components/submit-button";
import { FormStatus } from "@/components/form-status";

/** `showStamp` is false for anyone who prepares documents but doesn't
 *  certify them (the Executive Assistant, the Admin Assistant) — the
 *  church stamp belongs to whoever certifies, and the upload action
 *  itself refuses a stamp file from anyone without documents.certify, so
 *  this just keeps the form from offering a field that would fail. */
export function SignatureForm({ hasSignature, hasStamp, showStamp = true }: { hasSignature: boolean; hasStamp: boolean; showStamp?: boolean }) {
  const [state, formAction] = useActionState(uploadSignatureAsset, initialActionState);

  return (
    <form className="clay-form" action={formAction}>
      <p className="form-note">
        {showStamp
          ? "Upload a photo or scan of your signature and stamp, each on a plain or transparent background. They're stored privately and only ever used to certify documents you approve."
          : "Upload a photo or scan of your signature, on a plain or transparent background. It's stored privately and appears on documents you prepare — alongside the Pastor's own signature and the church stamp, not instead of them."}
      </p>
      <label>
        Signature image {hasSignature && <span className="badge blue">on file</span>}
        <input type="file" name="signature" accept="image/png,image/jpeg,image/webp" />
      </label>
      {showStamp && (
        <label>
          Stamp image (optional) {hasStamp && <span className="badge blue">on file</span>}
          <input type="file" name="stamp" accept="image/png,image/jpeg,image/webp" />
        </label>
      )}
      <FormStatus state={state} />
      <SubmitButton pendingLabel="Uploading…">Save</SubmitButton>
    </form>
  );
}
