"use client";

import { toggleTeamMemberVisible, removeTeamMember } from "./actions";
import { useConfirm } from "@/components/dialog-provider";

export function TeamMemberRow({
  id,
  ministryId,
  name,
  isLinked,
  positionTitle,
  publicVisible,
}: {
  id: string;
  ministryId: string;
  name: string;
  isLinked: boolean;
  positionTitle: string;
  publicVisible: boolean;
}) {
  const confirm = useConfirm();
  return (
    <tr>
      <td>
        {name} {isLinked && <span className="badge blue">linked account</span>}
      </td>
      <td>{positionTitle}</td>
      <td>
        <label className="check-label" style={{ marginBottom: 0 }}>
          <input
            type="checkbox"
            defaultChecked={publicVisible}
            onChange={(e) => toggleTeamMemberVisible(id, ministryId, e.target.checked)}
          />
          Public
        </label>
      </td>
      <td>
        <button
          type="button"
          className="link-button"
          onClick={async () => {
            if (await confirm({ message: `Remove ${name} from this team?`, confirmLabel: "Remove", danger: true })) removeTeamMember(id, ministryId);
          }}
        >
          Remove
        </button>
      </td>
    </tr>
  );
}
