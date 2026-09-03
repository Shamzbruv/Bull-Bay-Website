"use client";

import { toggleTeamMemberActive, toggleTeamMemberCounselor } from "./actions";

type Props = {
  id: string;
  name: string;
  roleTitle: string;
  isPastor: boolean;
  isTrainedCounselor: boolean;
  isActive: boolean;
};

export function TeamRow({ id, name, roleTitle, isPastor, isTrainedCounselor, isActive }: Props) {
  return (
    <tr>
      <td>
        {name} {isPastor && <span className="badge blue">pastor</span>}
      </td>
      <td>{roleTitle}</td>
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
