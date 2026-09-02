"use client";

import { updateVisitorStatus } from "@/app/(admin)/admin/actions";

export function StatusButtons({ id, status }: { id: string; status: string }) {
  return (
    <div style={{ display: "flex", gap: 6 }}>
      {status !== "in_progress" && (
        <button type="button" className="secondary-button compact" onClick={() => updateVisitorStatus(id, "in_progress")}>
          Mark in progress
        </button>
      )}
      {status !== "closed" && (
        <button type="button" className="secondary-button compact" onClick={() => updateVisitorStatus(id, "closed")}>
          Close
        </button>
      )}
    </div>
  );
}
