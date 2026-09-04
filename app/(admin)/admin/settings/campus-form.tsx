"use client";

import { useActionState } from "react";
import { saveCampusSettings } from "@/app/(admin)/admin/actions";
import { initialActionState } from "@/lib/action-state";
import { SubmitButton } from "@/components/submit-button";
import { FormStatus } from "@/components/form-status";
import type { Database } from "@/lib/supabase/types";

type Campus = Database["public"]["Tables"]["campuses"]["Row"];

export function CampusForm({ campus }: { campus: Campus }) {
  const [state, formAction] = useActionState(saveCampusSettings, initialActionState);
  return (
    <form className="clay-form" action={formAction}>
      <input type="hidden" name="id" value={campus.id} />
      <div className="form-row">
        <label>
          Phone
          <input name="phone" defaultValue={campus.phone ?? ""} />
        </label>
        <label>
          Email
          <input name="email" defaultValue={campus.email ?? ""} />
        </label>
      </div>
      <label>
        Livestream URL
        <input name="livestream_url" defaultValue={campus.livestream_url ?? ""} placeholder="https://youtube.com/..." />
      </label>
      <label>
        Address
        <input name="address_line1" defaultValue={campus.address_line1 ?? ""} />
      </label>
      <div className="form-row">
        <label>
          City / district
          <input name="city" defaultValue={campus.city ?? ""} />
        </label>
        <label>
          Parish
          <input name="parish" defaultValue={campus.parish ?? ""} />
        </label>
      </div>
      <FormStatus state={state} />
      <SubmitButton pendingLabel="Saving…">Save settings</SubmitButton>
    </form>
  );
}
