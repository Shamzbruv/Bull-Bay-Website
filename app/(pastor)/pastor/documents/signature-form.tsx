"use client";

import { useActionState } from "react";
import { uploadSignatureAsset } from "./actions";
import { initialActionState } from "@/app/(public)/actions";
import { SubmitButton } from "@/components/submit-button";
import { FormStatus } from "@/components/form-status";

export function SignatureForm({ hasSignature, hasStamp }: { hasSignature: boolean; hasStamp: boolean }) {
  const [state, formAction] = useActionState(uploadSignatureAsset, initialActionState);

  return (
    <form className="clay-form" action={formAction}>
      <p className="form-note">
        Upload a photo or scan of your signature and stamp, each on a plain or transparent background. They&apos;re
        stored privately and only ever used to certify documents you approve.
      </p>
      <label>
        Signature image {hasSignature && <span className="badge blue">on file</span>}
        <input type="file" name="signature" accept="image/png,image/jpeg,image/webp" />
      </label>
      <label>
        Stamp image (optional) {hasStamp && <span className="badge blue">on file</span>}
        <input type="file" name="stamp" accept="image/png,image/jpeg,image/webp" />
      </label>
      <FormStatus state={state} />
      <SubmitButton pendingLabel="Uploading…">Save</SubmitButton>
    </form>
  );
}
