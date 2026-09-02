"use client";

import { useActionState, useState } from "react";
import {
  linkAssignmentToProfile,
  toggleAssignmentActive,
  toggleAssignmentVisibility,
  unlinkAssignmentFromProfile,
} from "@/app/(admin)/admin/actions";
import { initialActionState } from "@/app/(public)/actions";

type Props = {
  id: string;
  positionTitle: string;
  displayName: string | null;
  linkedName: string | null;
  isActive: boolean;
  publicVisible: boolean;
};

export function AssignmentRow({ id, positionTitle, displayName, linkedName, isActive, publicVisible }: Props) {
  const [linking, setLinking] = useState(false);
  const [state, formAction] = useActionState(linkAssignmentToProfile.bind(null, id), initialActionState);

  return (
    <tr>
      <td>{positionTitle}</td>
      <td>
        {linkedName ? (
          <span>
            {linkedName} <span className="badge blue">linked</span>{" "}
            <button type="button" className="link-button" style={{ display: "inline" }} onClick={() => unlinkAssignmentFromProfile(id)}>
              unlink
            </button>
          </span>
        ) : (
          <span>
            {displayName} <span className="badge gray">not linked</span>
          </span>
        )}
      </td>
      <td>
        <label className="check-label" style={{ marginBottom: 0 }}>
          <input type="checkbox" defaultChecked={isActive} onChange={(e) => toggleAssignmentActive(id, e.target.checked)} />
          Active
        </label>
      </td>
      <td>
        <label className="check-label" style={{ marginBottom: 0 }}>
          <input type="checkbox" defaultChecked={publicVisible} onChange={(e) => toggleAssignmentVisibility(id, e.target.checked)} />
          Public
        </label>
      </td>
      <td>
        {!linkedName && !linking && (
          <button type="button" className="secondary-button compact" onClick={() => setLinking(true)}>
            Link to member
          </button>
        )}
        {!linkedName && linking && (
          <form action={formAction} style={{ display: "flex", gap: 6 }}>
            <input name="email" type="email" placeholder="member@email.com" required style={{ borderRadius: 8, border: "1px solid var(--color-border)", padding: 6, fontSize: ".76rem" }} />
            <button type="submit" className="secondary-button compact">
              Link
            </button>
          </form>
        )}
        {state.message && <div style={{ fontSize: ".72rem", marginTop: 4, color: state.status === "error" ? "#a8341f" : "var(--color-olive-700)" }}>{state.message}</div>}
      </td>
    </tr>
  );
}
