"use client";

import { useActionState } from "react";
import { uploadPastorSigningAssets } from "./actions";
import { initialActionState } from "@/lib/action-state";
import { SubmitButton } from "@/components/submit-button";
import { FormStatus } from "@/components/form-status";

/** The super administrator's upload of the Pastor's signature and the
 *  church stamp, onto the Pastor's own profile. */
export function PastorAssetsForm({ pastorName, hasSignature, hasStamp }: { pastorName: string; hasSignature: boolean; hasStamp: boolean }) {
  const [state, formAction] = useActionState(uploadPastorSigningAssets, initialActionState);
  return (
    <form className="clay-form" action={formAction}>
      <p className="form-note" style={{ marginTop: 0 }}>
        Nothing can be certified, and nobody can sign urgently, until both are on file. If {pastorName} has given you
        scans, add them here: they&apos;re saved to his profile exactly as if he had uploaded them himself, kept
        private, and he&apos;s told. He can replace them from his own Documents page.
      </p>
      <label>
        Pastor&apos;s signature {hasSignature ? <span className="badge blue">on file</span> : <span className="badge red">missing</span>}
        <input type="file" name="signature" accept="image/png,image/jpeg" />
      </label>
      <label>
        Church stamp {hasStamp ? <span className="badge blue">on file</span> : <span className="badge red">missing</span>}
        <input type="file" name="stamp" accept="image/png,image/jpeg" />
      </label>
      <p className="form-note">PNG or JPEG, under 2 MB each, ideally on a plain white or transparent background.</p>
      <FormStatus state={state} />
      <SubmitButton pendingLabel="Uploading…">Save to the Pastor&apos;s profile</SubmitButton>
    </form>
  );
}
