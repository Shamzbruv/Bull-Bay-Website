"use client";

import { useActionState, useState } from "react";
import { promoteAnnualPlanItemToEvent } from "@/app/(admin)/admin/actions";
import { initialActionState } from "@/app/(public)/actions";
import { FormStatus } from "@/components/form-status";

export function PromoteForm({ itemId }: { itemId: string }) {
  const [open, setOpen] = useState(false);
  const [state, formAction] = useActionState(promoteAnnualPlanItemToEvent.bind(null, itemId), initialActionState);

  if (!open) {
    return (
      <button type="button" className="secondary-button compact" onClick={() => setOpen(true)}>
        Promote to event
      </button>
    );
  }

  return (
    <form action={formAction} style={{ display: "flex", gap: 8, alignItems: "flex-end", flexWrap: "wrap", marginTop: 8 }}>
      <label style={{ margin: 0 }}>
        Date/time
        <input type="datetime-local" name="starts_at" required />
      </label>
      <label style={{ margin: 0 }}>
        Location
        <input name="location_name" placeholder="e.g. Main Sanctuary" />
      </label>
      <label style={{ margin: 0 }}>
        Visibility
        <select name="visibility" defaultValue="public">
          <option value="public">Public</option>
          <option value="members">Members only</option>
        </select>
      </label>
      <button type="submit" className="secondary-button compact">
        Create draft event
      </button>
      <FormStatus state={state} />
    </form>
  );
}
