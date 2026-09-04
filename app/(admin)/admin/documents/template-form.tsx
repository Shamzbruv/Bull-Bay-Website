"use client";

import { useActionState } from "react";
import { saveTemplate } from "./actions";
import { initialActionState } from "@/lib/action-state";
import { SubmitButton } from "@/components/submit-button";
import { FormStatus } from "@/components/form-status";
import { STANDARD_MERGE_FIELDS } from "@/lib/documents/merge";

type EditableTemplate = {
  id: string;
  name: string;
  category: string | null;
  description: string | null;
  body: string;
};

export function TemplateForm({ template }: { template?: EditableTemplate }) {
  const [state, formAction] = useActionState(saveTemplate, initialActionState);
  return (
    <form className="clay-form" action={formAction}>
      {template && <input type="hidden" name="id" value={template.id} />}
      <div className="form-row">
        <label>
          Document name
          <input name="name" required placeholder="e.g. Letter of Good Standing" defaultValue={template?.name ?? ""} />
        </label>
        <label>
          Category
          <input name="category" placeholder="e.g. Membership, Reference" defaultValue={template?.category ?? ""} />
        </label>
      </div>
      <label>
        Short description
        <input name="description" placeholder="Shown to members when choosing a document type" defaultValue={template?.description ?? ""} />
      </label>
      <label>
        Document body
        <textarea
          name="body"
          required
          style={{ minHeight: 200 }}
          defaultValue={template?.body ?? ""}
          placeholder={"This letter certifies that {{member_name}} is a member in good standing of {{church_name}}, since {{membership_since}}.\n\nThis letter is issued for the purpose of: {{purpose}}."}
        />
      </label>
      <p className="form-note">
        Available merge fields: {STANDARD_MERGE_FIELDS.map((f) => `{{${f.key}}}`).join(", ")}. Separate paragraphs
        with a blank line.
      </p>
      <FormStatus state={state} />
      <SubmitButton pendingLabel="Saving…">{template ? "Save changes" : "Create template"}</SubmitButton>
    </form>
  );
}
