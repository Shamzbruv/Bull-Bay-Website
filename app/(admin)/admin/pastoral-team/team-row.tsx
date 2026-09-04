"use client";

import { useActionState } from "react";
import { toggleTeamMemberActive, toggleTeamMemberCounselor, updatePastoralTeamMember } from "./actions";
import { initialActionState } from "@/lib/action-state";
import { SubmitButton } from "@/components/submit-button";
import { FormStatus } from "@/components/form-status";

type Props = {
  id: string;
  name: string;
  roleTitle: string;
  bio: string | null;
  isPastor: boolean;
  isTrainedCounselor: boolean;
  isActive: boolean;
};

export function TeamRow({ id, name, roleTitle, bio, isPastor, isTrainedCounselor, isActive }: Props) {
  const [state, formAction] = useActionState(updatePastoralTeamMember.bind(null, id), initialActionState);

  return (
    <tr>
      <td>
        {name} {isPastor && <span className="badge blue">pastor</span>}
      </td>
      <td>
        <details className="dashboard-disclosure">
          <summary>
            <span>
              <b>{roleTitle}</b>
              <small>Edit role, bio &amp; senior pastor flag</small>
            </span>
          </summary>
          <form action={formAction} className="form-stack">
            <label>
              Role title
              <input name="role_title" defaultValue={roleTitle} required />
            </label>
            <label>
              Short bio
              <textarea name="bio" defaultValue={bio ?? ""} placeholder="A line or two members will see when requesting help." />
            </label>
            <label className="check-label">
              <input type="checkbox" name="is_pastor" defaultChecked={isPastor} />
              This is the Senior Pastor
            </label>
            <FormStatus state={state} />
            <SubmitButton pendingLabel="Saving…">Save changes</SubmitButton>
          </form>
        </details>
      </td>
      <td>
        <label className="check-label" style={{ marginBottom: 0 }}>
          <input type="checkbox" defaultChecked={isTrainedCounselor} onChange={(e) => toggleTeamMemberCounselor(id, e.target.checked)} />
          Trained counselor
        </label>
      </td>
      <td>
        <label className="check-label" style={{ marginBottom: 0 }}>
          <input type="checkbox" defaultChecked={isActive} onChange={(e) => toggleTeamMemberActive(id, e.target.checked)} />
          Active
        </label>
      </td>
    </tr>
  );
}
