"use client";

import { updateMembershipStatus } from "@/app/(admin)/admin/actions";

const STATUSES = ["visitor", "returning_visitor", "attendee", "prospective_member", "member", "inactive"];

export function StatusSelect({ profileId, status }: { profileId: string; status: string }) {
  return (
    <select
      defaultValue={status}
      onChange={(e) => updateMembershipStatus(profileId, e.target.value)}
      style={{ borderRadius: 8, border: "1px solid var(--color-border)", padding: "4px 8px", fontSize: ".78rem" }}
    >
      {STATUSES.map((s) => (
        <option key={s} value={s}>
          {s.replace("_", " ")}
        </option>
      ))}
    </select>
  );
}
