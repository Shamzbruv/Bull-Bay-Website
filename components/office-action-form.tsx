"use client";
import { useActionState } from "react";
import type { ActionState } from "@/app/(public)/actions";
import { initialActionState } from "@/lib/action-state";
import { FormStatus } from "@/components/form-status";
import { SubmitButton } from "@/components/submit-button";
/** `actions`: more buttons (e.g. Preview PDF), shown just before the main one. */
export function OfficeActionForm({
  action,
  children,
  label = "Save",
  className = "clay-form",
  actions,
  submitValue,
}: {
  action: (state: ActionState, form: FormData) => Promise<ActionState>;
  children?: React.ReactNode;
  label?: string;
  className?: string;
  actions?: React.ReactNode;
  submitValue?: { name: string; value: string };
}) {
  const [state, submit] = useActionState(action, initialActionState);
  const button = (
    <SubmitButton
      pendingLabel="Saving…"
      name={submitValue?.name}
      value={submitValue?.value}
    >
      {label}
    </SubmitButton>
  );
  return (
    <form action={submit} className={className}>
      {children}
      <FormStatus state={state} />
      {actions ? (
        <div className="form-actions-row">
          {actions}
          {button}
        </div>
      ) : (
        button
      )}
    </form>
  );
}
