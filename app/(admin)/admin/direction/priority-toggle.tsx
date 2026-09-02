"use client";

import { togglePriorityVisibility } from "@/app/(admin)/admin/actions";

export function PriorityToggle({ id, publicVisible }: { id: string; publicVisible: boolean }) {
  return (
    <label className="check-label" style={{ marginBottom: 0 }}>
      <input type="checkbox" defaultChecked={publicVisible} onChange={(e) => togglePriorityVisibility(id, e.target.checked)} />
      Public
    </label>
  );
}
