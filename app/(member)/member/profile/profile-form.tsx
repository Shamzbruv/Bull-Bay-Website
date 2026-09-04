"use client";

import { useActionState } from "react";
import { updateProfile } from "@/app/(member)/member/actions";
import { initialActionState } from "@/app/(public)/actions";
import { SubmitButton } from "@/components/submit-button";
import { FormStatus } from "@/components/form-status";
import type { Database } from "@/lib/supabase/types";

type Profile = Database["public"]["Tables"]["profiles"]["Row"];

export function ProfileForm({ profile, onboarding = false }: { profile: Profile; onboarding?: boolean }) {
  const [state, formAction] = useActionState(updateProfile, initialActionState);

  return (
    <form className="clay-form" action={formAction}>
      {onboarding && <input type="hidden" name="onboarding" value="1" />}
      <div>
        <h2 style={{ marginBottom: 4 }}>Personal information</h2>
        <p className="form-note" style={{ marginTop: 0 }}>
          The church office uses this information only for membership care and administration.
        </p>
      </div>
      <div className="form-row">
        <label>
          First name
          <input name="first_name" defaultValue={profile.first_name ?? ""} required maxLength={80} autoComplete="given-name" />
        </label>
        <label>
          Last name
          <input name="last_name" defaultValue={profile.last_name ?? ""} required maxLength={80} autoComplete="family-name" />
        </label>
      </div>

      <div className="form-row">
        <label>
          Email
          <input value={profile.email ?? ""} disabled autoComplete="email" />
        </label>
        <label>
          Phone
          <input name="phone" defaultValue={profile.phone ?? ""} maxLength={32} autoComplete="tel" />
        </label>
      </div>

      <div className="form-row">
        <label>
          Date of birth
          <input name="date_of_birth" type="date" defaultValue={profile.date_of_birth ?? ""} autoComplete="bday" />
        </label>
        <label>
          Gender
          <select name="gender" defaultValue={profile.gender ?? ""}>
            <option value="">Prefer not to say</option>
            <option value="female">Female</option>
            <option value="male">Male</option>
            <option value="other">Other</option>
          </select>
        </label>
      </div>

      <div className="form-row">
        <label>
          Marital status
          <select name="marital_status" defaultValue={profile.marital_status ?? ""}>
            <option value="">Prefer not to say</option>
            <option value="single">Single</option>
            <option value="married">Married</option>
            <option value="widowed">Widowed</option>
            <option value="divorced">Divorced</option>
            <option value="separated">Separated</option>
          </select>
        </label>
        <label>
          Preferred contact method
          <select name="preferred_contact_method" defaultValue={profile.preferred_contact_method ?? ""}>
            <option value="">No preference</option>
            <option value="email">Email</option>
            <option value="sms">SMS</option>
            <option value="whatsapp">WhatsApp</option>
            <option value="phone">Phone call</option>
          </select>
        </label>
      </div>

      <label>
        Street address / community
        <input name="address_line1" defaultValue={profile.address_line1 ?? ""} maxLength={180} autoComplete="street-address" />
      </label>
      <div className="form-row">
        <label>
          City / district
          <input name="city" defaultValue={profile.city ?? ""} maxLength={100} autoComplete="address-level2" />
        </label>
        <label>
          Parish
          <input name="parish" defaultValue={profile.parish ?? ""} maxLength={80} list="jamaica-parishes" autoComplete="address-level1" />
          <datalist id="jamaica-parishes">
            {["Clarendon", "Hanover", "Kingston", "Manchester", "Portland", "St. Andrew", "St. Ann", "St. Catherine", "St. Elizabeth", "St. James", "St. Mary", "St. Thomas", "Trelawny", "Westmoreland"].map((parish) => (
              <option key={parish} value={parish} />
            ))}
          </datalist>
        </label>
      </div>

      <div className="form-row">
        <label>
          Emergency contact name
          <input name="emergency_contact_name" defaultValue={profile.emergency_contact_name ?? ""} maxLength={120} />
        </label>
        <label>
          Emergency contact phone
          <input name="emergency_contact_phone" defaultValue={profile.emergency_contact_phone ?? ""} maxLength={32} inputMode="tel" />
        </label>
      </div>

      <hr style={{ border: "none", borderTop: "1px solid var(--color-border)", margin: "18px 0" }} />
      <div>
        <h2 style={{ marginBottom: 4 }}>Church membership</h2>
        <p className="form-note" style={{ marginTop: 0 }}>
          Your membership status is maintained by the church office. You can add when you began attending or joined.
        </p>
      </div>
      <div className="form-row">
        <label>
          Membership status
          <input value={profile.membership_status.replaceAll("_", " ")} disabled />
        </label>
        <label>
          Attending / member since
          <input name="joined_at" type="date" defaultValue={profile.joined_at ?? ""} />
        </label>
      </div>

      <label className="check-label">
        <input type="checkbox" name="communication_email_opt_in" defaultChecked={profile.communication_email_opt_in} />
        Send me church news and important updates by email
      </label>
      <label className="check-label">
        <input type="checkbox" name="communication_sms_opt_in" defaultChecked={profile.communication_sms_opt_in} />
        Send me important church updates by text message
      </label>

      <hr style={{ border: "none", borderTop: "1px solid var(--color-border)", margin: "18px 0" }} />
      <div>
        <h2 style={{ marginBottom: 4 }}>Work &amp; professional community</h2>
      </div>
      <p className="form-note" style={{ marginTop: 0 }}>
        <b>Professional directory (optional).</b> Share your occupation and other members can request your help —
        whether that&apos;s advice, a service, or hiring you. Nobody sees your email or phone through this; you
        choose what to share once someone reaches out.
      </p>
      <div className="form-row">
        <label>
          Job title
          <input name="job_title" defaultValue={profile.job_title ?? ""} maxLength={120} placeholder="e.g. Operations Manager" autoComplete="organization-title" />
        </label>
        <label>
          Employer / business
          <input name="employer" defaultValue={profile.employer ?? ""} maxLength={140} autoComplete="organization" />
        </label>
      </div>
      <label>
        Occupation / profession
        <input name="occupation" defaultValue={profile.occupation ?? ""} maxLength={140} placeholder="e.g. Attorney-at-law, Electrician, Graphic Designer" />
      </label>
      <label>
        About your work (optional)
        <textarea name="professional_bio" defaultValue={profile.professional_bio ?? ""} maxLength={1200} placeholder="What you do and how you can help other members." />
      </label>
      <label className="check-label">
        <input type="checkbox" name="open_to_professional_requests" defaultChecked={profile.open_to_professional_requests ?? false} />
        List me in the member directory so others can request my help
      </label>
      <FormStatus state={state} />
      <SubmitButton pendingLabel="Saving…">{onboarding ? "Complete my profile" : "Save changes"}</SubmitButton>
    </form>
  );
}
