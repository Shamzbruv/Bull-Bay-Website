"use client";

import { useActionState } from "react";
import { submitConnectionCard, initialActionState } from "@/app/(public)/actions";
import { SubmitButton } from "@/components/submit-button";
import { FormStatus } from "@/components/form-status";

const INTERESTS = [
  "Planning a first visit",
  "Becoming a member",
  "Joining a ministry",
  "Getting baptized",
  "Pastoral counselling",
  "Serving our community",
];

export function ContactForm() {
  const [state, formAction] = useActionState(submitConnectionCard, initialActionState);

  return (
    <form className="clay-form" action={formAction}>
      <div className="form-row">
        <label>
          First name
          <input name="firstName" required autoComplete="given-name" />
        </label>
        <label>
          Last name
          <input name="lastName" required autoComplete="family-name" />
        </label>
      </div>
      <label>
        Email address
        <input name="email" type="email" required autoComplete="email" />
      </label>
      <label>
        Phone (optional)
        <input name="phone" autoComplete="tel" />
      </label>
      <label>
        I&apos;m interested in
        <select name="interest" defaultValue={INTERESTS[0]}>
          {INTERESTS.map((interest) => (
            <option key={interest}>{interest}</option>
          ))}
        </select>
      </label>
      <label>
        Anything else you&apos;d like us to know?
        <textarea name="message" placeholder="Optional message" />
      </label>
      <FormStatus state={state} />
      <SubmitButton>
        Send Message <span>→</span>
      </SubmitButton>
    </form>
  );
}
