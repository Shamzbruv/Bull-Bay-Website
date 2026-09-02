"use client";

import { useActionState } from "react";
import { updateProfile } from "@/app/(member)/member/actions";
import { initialActionState } from "@/app/(public)/actions";
import { SubmitButton } from "@/components/submit-button";
import { FormStatus } from "@/components/form-status";
import type { Database } from "@/lib/supabase/types";

type Profile = Database["public"]["Tables"]["profiles"]["Row"];

export function ProfileForm({ profile }: { profile: Profile }) {
  const [state, formAction] = useActionState(updateProfile, initialActionState);

  return (
    <form className="clay-form" action={formAction}>
      <div className="form-row">
        <label>
          First name
          <input name="first_name" defaultValue={profile.first_name ?? ""} />
        </label>
        <label>
          Last name
          <input name="last_name" defaultValue={profile.last_name ?? ""} />
        </label>
      </div>
      <label>
        Email
        <input value={profile.email ?? ""} disabled />
      </label>
      <label>
        Phone
        <input name="phone" defaultValue={profile.phone ?? ""} autoComplete="tel" />
      </label>
      <label>
        Preferred contact method
        <select name="preferred_contact_method" defaultValue={profile.preferred_contact_method ?? ""}>
          <option value="">No preference</option>
          <option value="email">Email</option>
          <option value="sms">SMS</option>
          <option value="whatsapp">WhatsApp</option>
          <option value="phone">Phone</option>
        </select>
      </label>
      <FormStatus state={state} />
      <SubmitButton pendingLabel="Saving…">Save changes</SubmitButton>
    </form>
  );
}
