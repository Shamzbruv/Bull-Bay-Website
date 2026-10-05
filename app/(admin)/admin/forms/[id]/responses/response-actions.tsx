"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { useConfirm } from "@/components/dialog-provider";
import { deleteResponses, releaseScores, setAccepting } from "../../actions";

export function AcceptingToggle({ formId, accepting }: { formId: string; accepting: boolean }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [on, setOn] = useState(accepting);
  return (
    <label className="fb-toggle">
      <input
        type="checkbox"
        role="switch"
        checked={on}
        disabled={pending}
        onChange={(e) => {
          const next = e.target.checked;
          setOn(next);
          start(async () => {
            const result = await setAccepting(formId, next);
            if (result.status !== "success") setOn(!next);
            router.refresh();
          });
        }}
      />
      <span className="fb-toggle-track" aria-hidden="true" />
      <span className="fb-toggle-text">{on ? "Accepting responses" : "Not accepting responses"}</span>
    </label>
  );
}

export function DeleteAllResponses({ formId, count }: { formId: string; count: number }) {
  const confirm = useConfirm();
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <button
      type="button"
      className="fb-button is-danger"
      disabled={pending}
      onClick={async () => {
        if (!(await confirm({ title: `Delete all ${count} responses?`, message: "Every response and uploaded file for this form is deleted for good. Download the spreadsheet first if you need a copy.", confirmLabel: "Delete all" }))) return;
        start(async () => {
          await deleteResponses(formId, "all");
          router.refresh();
        });
      }}
    >
      {pending ? "Deleting…" : "Delete all"}
    </button>
  );
}

export function ReleaseAllScores({ formId, count }: { formId: string; count: number }) {
  const confirm = useConfirm();
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <button
      type="button"
      className="fb-button"
      disabled={pending}
      onClick={async () => {
        if (!(await confirm({ title: `Release ${count} ${count === 1 ? "score" : "scores"}?`, message: "Each person who gave an email address is sent their score, with the feedback you've set.", confirmLabel: "Release and email" }))) return;
        start(async () => {
          await releaseScores(formId, "all", true);
          router.refresh();
        });
      }}
    >
      {pending ? "Releasing…" : `Release scores (${count})`}
    </button>
  );
}
