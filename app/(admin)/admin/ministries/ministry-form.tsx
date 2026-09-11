"use client";

import { useActionState } from "react";
import { saveMinistry } from "@/app/(admin)/admin/actions";
import { initialActionState } from "@/lib/action-state";
import { SubmitButton } from "@/components/submit-button";
import { FormStatus } from "@/components/form-status";

type EditableMinistry = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  icon: string | null;
  leader_profile_id: string | null;
  is_active: boolean;
};

type LeaderOption = { id: string; name: string };

export function MinistryForm({ ministry, leaders }: { ministry?: EditableMinistry; leaders: LeaderOption[] }) {
  const [state, formAction] = useActionState(saveMinistry, initialActionState);

  return (
    <form className="clay-form" action={formAction}>
      {ministry && <input type="hidden" name="id" value={ministry.id} />}
      <div className="form-row">
        <label>
          Name
          <input name="name" required defaultValue={ministry?.name ?? ""} />
        </label>
        <label>
          Icon (a single emoji or symbol)
          <input name="icon" maxLength={4} placeholder="✦" defaultValue={ministry?.icon ?? ""} />
        </label>
      </div>
      <label>
        Slug (URL)
        <input name="slug" defaultValue={ministry?.slug ?? ""} placeholder="auto-generated from name if blank" />
      </label>
      <label>
        Description — shown on the ministries list and the &quot;Learn more&quot; page
        <textarea name="description" defaultValue={ministry?.description ?? ""} />
      </label>
      <label>
        Ministry leader
        <select name="leader_profile_id" defaultValue={ministry?.leader_profile_id ?? ""}>
          <option value="">No leader assigned</option>
          {leaders.map((l) => (
            <option key={l.id} value={l.id}>
              {l.name}
            </option>
          ))}
        </select>
        <span className="form-note">The leader gets a &quot;My Team&quot; section to manage their own roster and description.</span>
      </label>
      <label className="check-label">
        <input type="checkbox" name="is_active" defaultChecked={ministry?.is_active ?? true} /> Visible on the public
        Ministries page
      </label>
      <FormStatus state={state} />
      <SubmitButton pendingLabel="Saving…">{ministry ? "Save changes" : "Create ministry"}</SubmitButton>
    </form>
  );
}
