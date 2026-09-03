"use client";

import { useActionState } from "react";
import { saveTemplate } from "./actions";
import { initialActionState } from "@/app/(public)/actions";
import { SubmitButton } from "@/components/submit-button";
import { FormStatus } from "@/components/form-status";
import { STANDARD_MERGE_FIELDS } from "@/lib/documents/merge";

export function TemplateForm() {
  const [state, formAction] = useActionState(saveTemplate, initialActionState);
  return (
    <form className="clay-form" action={formAction}>
      <div className="form-row">
        <label>
          Document name
          <input name="name" required placeholder="e.g. Letter of Good Standing" />
        </label>
        <label>
          Category
          <input name="category" placeholder="e.g. Membership, Reference" />
        </label>
      </div>
      <label>
        Short description
        <input name="description" placeholder="Shown to members when choosing a document type" />
      </label>
      <label>
        Document body
        <textarea
          name="body"
          required
          style={{ minHeight: 200 }}
          placeholder={"This letter certifies that {{member_name}} is a member in good standing of {{church_name}}, since {{membership_since}}.\n\nThis letter is issued for the purpose of: {{purpose}}."}
        />
      </label>
      <p className="form-note">
        Available merge fields: {STANDARD_MERGE_FIELDS.map((f) => `{{${f.key}}}`).join(", ")}. Separate paragraphs
        with a blank line.
      </p>
      <FormStatus state={state} />
      <SubmitButton pendingLabel="Saving…">Save template</SubmitButton>
    </form>
  );
}
