"use client";

import { useActionState } from "react";
import { addTeamMember, updateMinistryDescription } from "./actions";
import { initialActionState } from "@/lib/action-state";
import { SubmitButton } from "@/components/submit-button";
import { FormStatus } from "@/components/form-status";

export function DescriptionForm({ ministryId, description }: { ministryId: string; description: string | null }) {
  const [state, formAction] = useActionState(updateMinistryDescription.bind(null, ministryId), initialActionState);
  return (
    <form className="clay-form" action={formAction}>
      <label>
        What shows on &quot;Learn more&quot; for your ministry
        <textarea name="description" defaultValue={description ?? ""} placeholder="What your ministry does, who it's for, and how to get involved." />
      </label>
      <FormStatus state={state} />
      <SubmitButton pendingLabel="Saving…">Save description</SubmitButton>
    </form>
  );
}

export function AddTeamMemberForm({ ministryId }: { ministryId: string }) {
  const [state, formAction] = useActionState(addTeamMember.bind(null, ministryId), initialActionState);
  return (
    <form className="clay-form" action={formAction}>
      <div className="form-row">
        <label>
          Name
          <input name="display_name" required placeholder="e.g. Sister Michelle Brown" />
        </label>
        <label>
          Their role on the team
          <input name="position_title" required placeholder="e.g. Assistant Leader, Coordinator" />
        </label>
      </div>
      <label className="check-label">
        <input type="checkbox" name="public_visible" defaultChecked /> Show them publicly on this ministry&apos;s page
      </label>
      <FormStatus state={state} />
      <SubmitButton pendingLabel="Adding…">Add to team</SubmitButton>
    </form>
  );
}
