"use client";

import { useActionState, useState } from "react";
import { inviteMember } from "./actions";
import { initialActionState } from "@/lib/action-state";
import { SubmitButton } from "@/components/submit-button";
import { FormStatus } from "@/components/form-status";

const STATUSES = ["visitor", "returning_visitor", "attendee", "prospective_member", "member"];

export function InviteMemberForm() {
  const [open, setOpen] = useState(false);
  const [state, formAction] = useActionState(inviteMember, initialActionState);

  if (!open) {
    return (
      <button type="button" className="primary-button compact" onClick={() => setOpen(true)}>
        + Invite a member
      </button>
    );
  }

  return (
    <form className="clay-form" action={formAction}>
      <h3 style={{ margin: "0 0 16px", color: "var(--color-blue-700)" }}>Invite a new member</h3>
      <p className="form-note" style={{ marginTop: 0 }}>
        This creates their login and emails them a link to set a password. Only people invited here can sign in —
        there is no public sign-up.
      </p>
      <div className="form-row">
        <label>
          First name
          <input name="first_name" required />
        </label>
        <label>
          Last name
          <input name="last_name" required />
        </label>
      </div>
      <div className="form-row">
        <label>
          Email
          <input name="email" type="email" required />
        </label>
        <label>
          Phone
          <input name="phone" />
        </label>
      </div>
      <label>
        Membership status
        <select name="membership_status" defaultValue="member">
          {STATUSES.map((s) => (
            <option key={s} value={s}>
              {s.replace("_", " ")}
            </option>
          ))}
        </select>
      </label>

      <details style={{ margin: "8px 0 16px" }}>
        <summary style={{ cursor: "pointer", fontSize: ".82rem", fontWeight: 700, color: "var(--color-blue-700)", padding: "6px 0" }}>
          Job, address &amp; emergency contact (optional)
        </summary>
        <div className="form-row">
          <label>
            Job title
            <input name="job_title" />
          </label>
          <label>
            Employer
            <input name="employer" />
          </label>
        </div>
        <label>
          Marital status
          <select name="marital_status" defaultValue="">
            <option value="">Prefer not to say</option>
            <option value="single">Single</option>
            <option value="married">Married</option>
            <option value="widowed">Widowed</option>
            <option value="divorced">Divorced</option>
          </select>
        </label>
        <label>
          Address
          <input name="address_line1" />
        </label>
        <div className="form-row">
          <label>
            City / district
            <input name="city" />
          </label>
          <label>
            Parish
            <input name="parish" />
          </label>
        </div>
        <div className="form-row">
          <label>
            Emergency contact name
            <input name="emergency_contact_name" />
          </label>
          <label>
            Emergency contact phone
            <input name="emergency_contact_phone" />
          </label>
        </div>
      </details>

      <FormStatus state={state} />
      <div style={{ display: "flex", gap: 10 }}>
        <SubmitButton pendingLabel="Sending invite…">Send invitation</SubmitButton>
        <button type="button" className="secondary-button compact" onClick={() => setOpen(false)}>
          Cancel
        </button>
      </div>
    </form>
  );
}
