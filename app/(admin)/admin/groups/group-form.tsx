"use client";

import { useActionState } from "react";
import { saveGroup } from "@/app/(admin)/admin/actions";
import { initialActionState } from "@/lib/action-state";
import { SubmitButton } from "@/components/submit-button";
import { FormStatus } from "@/components/form-status";

type EditableGroup = {
  id: string;
  name: string;
  category: string | null;
  description: string | null;
  meeting_schedule: string | null;
  visibility: string;
  is_active: boolean;
};

export function GroupForm({ group }: { group?: EditableGroup }) {
  const [state, formAction] = useActionState(saveGroup, initialActionState);
  return (
    <form className="clay-form" action={formAction}>
      {group && <input type="hidden" name="id" value={group.id} />}
      <div className="form-row">
        <label>
          Name
          <input name="name" required defaultValue={group?.name ?? ""} />
        </label>
        <label>
          Category
          <input name="category" placeholder="e.g. Young Adults" defaultValue={group?.category ?? ""} />
        </label>
      </div>
      <label>
        Description
        <textarea name="description" defaultValue={group?.description ?? ""} />
      </label>
      <label>
        Meeting schedule
        <input name="meeting_schedule" placeholder="e.g. Tuesdays 7pm" defaultValue={group?.meeting_schedule ?? ""} />
      </label>
      <label>
        Visibility
        <select name="visibility" defaultValue={group?.visibility ?? "public"}>
          <option value="public">Public</option>
          <option value="members">Members only</option>
        </select>
      </label>
      <label className="check-label">
        <input type="checkbox" name="is_active" defaultChecked={group?.is_active ?? true} /> Active
      </label>
      <FormStatus state={state} />
      <SubmitButton pendingLabel="Saving…">{group ? "Save group" : "Create group"}</SubmitButton>
    </form>
  );
}
