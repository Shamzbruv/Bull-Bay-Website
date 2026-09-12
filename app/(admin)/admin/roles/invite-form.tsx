"use client";

import { useState } from "react";
import { useActionState } from "react";
import { inviteStaffMember } from "@/app/(admin)/admin/actions";
import { initialActionState } from "@/lib/action-state";
import { SubmitButton } from "@/components/submit-button";
import { FormStatus } from "@/components/form-status";
import { MemberPicker, type MemberOption } from "@/components/member-picker";

export function InviteForm({ roles, members }: { roles: { id: string; name: string }[]; members: MemberOption[] }) {
  const [state, formAction] = useActionState(inviteStaffMember, initialActionState);
  const [email, setEmail] = useState("");

  return (
    <form action={formAction} style={{ display: "flex", gap: 10, alignItems: "flex-end", flexWrap: "wrap" }}>
      <label style={{ margin: 0, minWidth: 220 }}>
        Search an existing member
        <MemberPicker
          members={members}
          fieldName="_member_picker"
          placeholder="Type a name…"
          onSelect={(m) => setEmail(m?.email ?? "")}
        />
      </label>
      <label style={{ margin: 0 }}>
        Email
        <input type="email" name="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="or type an email directly" />
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
