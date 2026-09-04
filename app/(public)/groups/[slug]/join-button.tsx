"use client";

import { useActionState } from "react";
import Link from "next/link";
import { joinGroup } from "@/app/(public)/actions";
import { initialActionState } from "@/lib/action-state";
import { SubmitButton } from "@/components/submit-button";
import { FormStatus } from "@/components/form-status";

export function JoinButton({ groupId, signedIn }: { groupId: string; signedIn: boolean }) {
  const action = joinGroup.bind(null, groupId);
  const [state, formAction] = useActionState(action, initialActionState);

  if (!signedIn) {
    return (
      <div className="panel">
        <p>Please sign in to request to join this group.</p>
        <Link className="primary-button compact" href="/login">
          Sign in <span>→</span>
        </Link>
      </div>
    );
  }

  return (
    <form action={formAction} className="panel">
      <FormStatus state={state} />
      <SubmitButton pendingLabel="Sending request…">Request to Join <span>→</span></SubmitButton>
    </form>
  );
}
