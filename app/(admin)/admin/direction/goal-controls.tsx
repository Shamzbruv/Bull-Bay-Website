"use client";

import { toggleGoalVisibility, updateGoalStatus } from "@/app/(admin)/admin/actions";

const STATUSES = ["not_started", "in_progress", "achieved", "at_risk"];

export function GoalControls({ id, status, publicVisible }: { id: string; status: string; publicVisible: boolean }) {
  return (
    <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
      <select
        defaultValue={status}
        onChange={(e) => updateGoalStatus(id, e.target.value)}
        style={{ borderRadius: 8, border: "1px solid var(--color-border)", padding: "4px 8px", fontSize: ".76rem" }}
      >
        {STATUSES.map((s) => (
          <option key={s} value={s}>
            {s.replace("_", " ")}
          </option>
        ))}
      </select>
      <label className="check-label" style={{ marginBottom: 0 }}>
        <input type="checkbox" defaultChecked={publicVisible} onChange={(e) => toggleGoalVisibility(id, e.target.checked)} />
        Public
      </label>
    </div>
  );
}
