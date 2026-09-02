"use client";

import { useActionState } from "react";
import { inviteStaffMember } from "@/app/(admin)/admin/actions";
import { initialActionState } from "@/app/(public)/actions";
import { SubmitButton } from "@/components/submit-button";
import { FormStatus } from "@/components/form-status";

export function InviteForm({ roles }: { roles: { id: string; name: string }[] }) {
  const [state, formAction] = useActionState(inviteStaffMember, initialActionState);
  return (
    <form action={formAction} style={{ display: "flex", gap: 10, alignItems: "flex-end", flexWrap: "wrap" }}>
      <label style={{ margin: 0 }}>
        Email
        <input type="email" name="email" required />
      </label>
      <label style={{ margin: 0 }}>
        Role
        <select name="roleId">
          {roles.map((r) => (
            <option key={r.id} value={r.id}>
              {r.name}
            </option>
          ))}
        </select>
      </label>
      <SubmitButton className="secondary-button compact" pendingLabel="Sending…">
        Send invitation
      </SubmitButton>
      <FormStatus state={state} />
    </form>
  );
}
