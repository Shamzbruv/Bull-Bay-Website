"use client";

import { useActionState } from "react";
import { addPastoralTeamMember } from "./actions";
import { initialActionState } from "@/app/(public)/actions";
import { SubmitButton } from "@/components/submit-button";
import { FormStatus } from "@/components/form-status";

export function TeamForm() {
  const [state, formAction] = useActionState(addPastoralTeamMember, initialActionState);

  return (
    <form className="clay-form" action={formAction}>
      <p className="form-note">
        The person must already have an account (invite them first under People). Once added here, they can publish
        their own weekly hours and calendar, and members can request help from them.
      </p>
      <label>
        Member email
        <input name="email" type="email" required placeholder="member@email.com" />
      </label>
      <label>
        Role title
        <input name="role_title" required placeholder="Deacon, Deaconess, Elder, Senior Pastor…" />
      </label>
      <label className="check-label">
        <input type="checkbox" name="is_pastor" />
        This is the Senior Pastor (calendar shown prominently to every member)
      </label>
      <label className="check-label">
        <input type="checkbox" name="is_trained_counselor" />
        Trained to give counselling
      </label>
      <label>
        Short bio (optional)
        <textarea name="bio" placeholder="A line or two members will see when requesting help." />
      </label>
      <FormStatus state={state} />
      <SubmitButton pendingLabel="Saving…">Add to pastoral team</SubmitButton>
    </form>
  );
}
