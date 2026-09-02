"use client";

import { updateAnnualPlanItemStatus } from "@/app/(admin)/admin/actions";

const STATUSES = ["planned", "ready_to_publish", "published", "cancelled"];

export function StatusSelect({ id, status }: { id: string; status: string }) {
  return (
    <select
      defaultValue={status}
      onChange={(e) => updateAnnualPlanItemStatus(id, e.target.value)}
      style={{ borderRadius: 8, border: "1px solid var(--color-border)", padding: "4px 8px", fontSize: ".76rem" }}
    >
      {STATUSES.map((s) => (
        <option key={s} value={s}>
          {s.replace("_", " ")}
        </option>
      ))}
    </select>
  );
}
