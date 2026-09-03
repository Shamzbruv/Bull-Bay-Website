"use client";

import { useActionState, useState } from "react";
import { sendComposedEmail } from "./actions";
import { initialActionState } from "@/app/(public)/actions";
import { SubmitButton } from "@/components/submit-button";
import { FormStatus } from "@/components/form-status";

export function ComposeForm({ emailReady }: { emailReady: boolean }) {
  const [state, formAction] = useActionState(sendComposedEmail, initialActionState);
  const [audience, setAudience] = useState("single");

  return (
    <form className="clay-form" action={formAction}>
      {!emailReady && (
        <p className="form-note" style={{ color: "#a8341f" }}>
          Email sending isn&apos;t connected yet. Everything here is ready to go — compose and save your message, and
          it will send as soon as the Resend API key is added.
        </p>
      )}
      <label>
        Send to
        <select name="audience" value={audience} onChange={(e) => setAudience(e.target.value)}>
          <option value="single">One person</option>
          <option value="all">Every member with an email on file</option>
        </select>
      </label>
      {audience === "single" && (
        <label>
          Recipient email
          <input type="email" name="single_email" placeholder="member@email.com" />
        </label>
      )}
      <label>
        Subject / heading
        <input name="heading" required placeholder="An update from the church office" />
      </label>
      <label>
        Message
        <textarea name="body" required style={{ minHeight: 160 }} placeholder="Write your message — paragraphs (blank line between) become the email's paragraphs." />
      </label>
      <label>
        Reply-to email
        <input type="email" name="reply_to" required placeholder="office@bullbaychurch.org" />
        <span className="form-note">Required — this platform sends as a no-reply address, so replies go here instead.</span>
      </label>
      <FormStatus state={state} />
      <SubmitButton pendingLabel="Sending…">Send</SubmitButton>
    </form>
  );
}
