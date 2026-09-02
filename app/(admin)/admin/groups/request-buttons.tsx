"use client";

import { respondToGroupRequest } from "@/app/(admin)/admin/actions";

export function RequestButtons({ memberId }: { memberId: string }) {
  return (
    <div style={{ display: "flex", gap: 6 }}>
      <button type="button" className="secondary-button compact" onClick={() => respondToGroupRequest(memberId, true)}>
        Approve
      </button>
      <button type="button" className="secondary-button compact" onClick={() => respondToGroupRequest(memberId, false)}>
        Deny
      </button>
    </div>
  );
}
