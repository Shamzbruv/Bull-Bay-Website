"use client";

import { revokeRole } from "@/app/(admin)/admin/actions";

export function RevokeButton({ userRoleId }: { userRoleId: string }) {
  return (
    <button type="button" className="secondary-button compact" onClick={() => revokeRole(userRoleId)}>
      Revoke
    </button>
  );
}
