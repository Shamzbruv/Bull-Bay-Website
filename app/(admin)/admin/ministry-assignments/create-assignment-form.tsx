"use client";

import { useActionState, useState } from "react";
import { createMinistryAssignment } from "@/app/(admin)/admin/actions";
import { initialActionState } from "@/lib/action-state";
import { SubmitButton } from "@/components/submit-button";
import { FormStatus } from "@/components/form-status";
import { MemberPicker, type MemberOption } from "@/components/member-picker";

export function CreateAssignmentForm({ ministries, members }: { ministries: { id: string; name: string }[]; members: MemberOption[] }) {
  const [state, formAction] = useActionState(createMinistryAssignment, initialActionState);
  const [picked, setPicked] = useState<MemberOption | null>(null);

  return (
    <form className="clay-form" action={formAction}>
      <div className="form-row">
        <label>
          Ministry
          <select name="ministry_id" required defaultValue="">
            <option value="" disabled>
              Choose a ministry
            </option>
            {ministries.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          Their role or position
          <input name="position_title" required placeholder="e.g. Leader, Coordinator, Usher" />
        </label>
      </div>
      <label>
        Search for a member
        <MemberPicker members={members} fieldName="profile_id" placeholder="Type a name to search…" onSelect={setPicked} />
      </label>
      {!picked && (
        <label>
          Or, if they&apos;re not in the system yet, type their name
          <input name="display_name" placeholder="e.g. Sister Michelle Brown" />
          <span className="form-note">Stays unlinked until a real account can be verified and linked later.</span>
        </label>
      )}
      <label className="check-label">
        <input type="checkbox" name="public_visible" /> Show publicly on this ministry&apos;s page
      </label>
      <FormStatus state={state} />
      <SubmitButton pendingLabel="Adding…">Add to roster</SubmitButton>
    </form>
  );
}
