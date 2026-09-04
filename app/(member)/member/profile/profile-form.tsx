"use client";

import { useActionState, useState, type FormEvent } from "react";
import { updateProfile } from "@/app/(member)/member/actions";
import { initialActionState } from "@/lib/action-state";
import { SubmitButton } from "@/components/submit-button";
import { FormStatus } from "@/components/form-status";
import type { Database } from "@/lib/supabase/types";

type Profile = Database["public"]["Tables"]["profiles"]["Row"];

const COMPLETION_FIELDS = [
  "first_name",
  "last_name",
  "phone",
  "date_of_birth",
  "gender",
  "marital_status",
  "preferred_contact_method",
  "address_line1",
  "city",
  "parish",
  "emergency_contact_name",
  "emergency_contact_phone",
  "job_title",
  "employer",
  "occupation",
  "professional_bio",
] as const satisfies readonly (keyof Profile)[];

function hasValue(value: FormDataEntryValue | Profile[(typeof COMPLETION_FIELDS)[number]]) {
  return typeof value === "string" && value.trim().length > 0;
}

function initialCompletedFields(profile: Profile) {
  return COMPLETION_FIELDS.filter((field) => hasValue(profile[field])).length;
}

export function ProfileForm({ profile, onboarding = false }: { profile: Profile; onboarding?: boolean }) {
  const [state, formAction] = useActionState(updateProfile, initialActionState);
  const [completedFields, setCompletedFields] = useState(() => initialCompletedFields(profile));
  const completionPercentage = Math.round((completedFields / COMPLETION_FIELDS.length) * 100);

  function updateCompleteness(event: FormEvent<HTMLFormElement>) {
    const formData = new FormData(event.currentTarget);
    setCompletedFields(COMPLETION_FIELDS.filter((field) => hasValue(formData.get(field))).length);
  }

  return (
    <form className="clay-form" action={formAction} onChange={updateCompleteness}>
      {onboarding && <input type="hidden" name="onboarding" value="1" />}

      <div
        className="alert info"
        style={{ marginBottom: 26, padding: 20 }}
        aria-label={`Profile setup is ${completionPercentage}% complete`}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 16 }}>
          <div>
            <strong>{onboarding ? "Your profile setup" : "Profile completeness"}</strong>
            <div className="form-note" style={{ marginTop: 3 }}>
              {completedFields} of {COMPLETION_FIELDS.length} recommended details filled in
            </div>
          </div>
          <strong style={{ color: "var(--color-olive-700)", fontSize: "1.15rem" }}>{completionPercentage}%</strong>
        </div>
        <div
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={completionPercentage}
          aria-valuetext={`${completedFields} of ${COMPLETION_FIELDS.length} recommended details filled in`}
          style={{ height: 9, marginTop: 12, overflow: "hidden", borderRadius: 999, background: "var(--color-border)" }}
        >
          <span
            style={{
              display: "block",
              width: `${completionPercentage}%`,
              height: "100%",
              borderRadius: 999,
              background: "var(--color-olive-600)",
              transition: "width 160ms ease",
            }}
          />
        </div>
        <p className="form-note" style={{ marginBottom: 0 }}>
          {completionPercentage === 100
            ? "Everything is filled in. You can still change any detail below."
            : "Only your name is required. Add what you can now, and come back whenever you need to update it."}
        </p>
      </div>

      <section aria-labelledby="profile-about-heading">
        <div>
          <div className="form-note" style={{ margin: 0, fontWeight: 700, color: "var(--color-olive-700)" }}>
            {onboarding ? "STEP 1 OF 3" : "ABOUT YOU"}
          </div>
          <h2 id="profile-about-heading" style={{ margin: "3px 0 4px" }}>Personal information</h2>
          <p className="form-note" style={{ marginTop: 0 }}>
            The church office uses these details for membership care and administration.
          </p>
        </div>

        <div className="form-row">
          <label>
            First name
            <input
              name="first_name"
              defaultValue={profile.first_name ?? ""}
              required
              maxLength={80}
              autoComplete="given-name"
            />
          </label>
          <label>
            Last name
            <input
              name="last_name"
              defaultValue={profile.last_name ?? ""}
              required
              maxLength={80}
              autoComplete="family-name"
            />
          </label>
        </div>

        <div className="form-row">
          <label>
            Email
            <input value={profile.email ?? ""} disabled autoComplete="email" />
            <span className="form-note">Contact the church office if this needs changing.</span>
          </label>
          <label>
            Phone
            <input name="phone" type="tel" defaultValue={profile.phone ?? ""} maxLength={32} autoComplete="tel" />
          </label>
        </div>

        <div className="form-row">
          <label>
            Date of birth
            <input
              name="date_of_birth"
              type="date"
              min="1900-01-01"
              defaultValue={profile.date_of_birth ?? ""}
              autoComplete="bday"
            />
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
      </section>

      <hr style={{ border: "none", borderTop: "1px solid var(--color-border)", margin: "22px 0" }} />

      <section aria-labelledby="profile-care-heading">
        <div>
          <div className="form-note" style={{ margin: 0, fontWeight: 700, color: "var(--color-olive-700)" }}>
            {onboarding ? "STEP 2 OF 3" : "CONTACT & CARE"}
          </div>
          <h2 id="profile-care-heading" style={{ margin: "3px 0 4px" }}>Address and care details</h2>
          <p className="form-note" style={{ marginTop: 0 }}>
            These details help us reach you and the right person in an emergency.
          </p>
        </div>

        <label>
          Street address / community
          <input
            name="address_line1"
            defaultValue={profile.address_line1 ?? ""}
            maxLength={180}
            autoComplete="street-address"
          />
        </label>
        <div className="form-row">
          <label>
            City / district
            <input name="city" defaultValue={profile.city ?? ""} maxLength={100} autoComplete="address-level2" />
          </label>
          <label>
            Parish
            <input
              name="parish"
              defaultValue={profile.parish ?? ""}
              maxLength={80}
              list="jamaica-parishes"
              autoComplete="address-level1"
            />
            <datalist id="jamaica-parishes">
              {[
                "Clarendon",
                "Hanover",
                "Kingston",
                "Manchester",
                "Portland",
                "St. Andrew",
                "St. Ann",
                "St. Catherine",
                "St. Elizabeth",
                "St. James",
                "St. Mary",
                "St. Thomas",
                "Trelawny",
                "Westmoreland",
              ].map((parish) => (
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
            <input
              name="emergency_contact_phone"
              type="tel"
              defaultValue={profile.emergency_contact_phone ?? ""}
              maxLength={32}
              inputMode="tel"
            />
          </label>
        </div>

        <div>
          <strong style={{ display: "block", marginBottom: 10, color: "var(--color-blue-700)", fontSize: ".82rem" }}>
            Communication choices
          </strong>
          <label className="check-label">
            <input type="checkbox" name="communication_email_opt_in" defaultChecked={profile.communication_email_opt_in} />
            Send me church news and important updates by email
          </label>
          <label className="check-label">
            <input type="checkbox" name="communication_sms_opt_in" defaultChecked={profile.communication_sms_opt_in} />
            Send me important church updates by text message
          </label>
        </div>
      </section>

      <hr style={{ border: "none", borderTop: "1px solid var(--color-border)", margin: "22px 0" }} />

      <section aria-labelledby="profile-community-heading">
        <div>
          <div className="form-note" style={{ margin: 0, fontWeight: 700, color: "var(--color-olive-700)" }}>
            {onboarding ? "STEP 3 OF 3" : "CHURCH & COMMUNITY"}
          </div>
          <h2 id="profile-community-heading" style={{ margin: "3px 0 4px" }}>Membership and professional community</h2>
          <p className="form-note" style={{ marginTop: 0 }}>
            Membership details are maintained by the office. Work and directory details are entirely optional.
          </p>
        </div>

        <div className="form-row">
          <label>
            Membership status
            <input value={profile.membership_status.replaceAll("_", " ")} disabled />
          </label>
          <label>
            Attending / member since
            <input type="date" value={profile.joined_at ?? ""} disabled />
          </label>
        </div>

        <p className="form-note" style={{ marginTop: 0 }}>
          <strong>Professional directory.</strong> If you opt in, other members can request your help without seeing
          your email or phone. You decide what to share after someone reaches out.
        </p>
        <div className="form-row">
          <label>
            Job title
            <input
              name="job_title"
              defaultValue={profile.job_title ?? ""}
              maxLength={120}
              placeholder="e.g. Operations Manager"
              autoComplete="organization-title"
            />
          </label>
          <label>
            Employer / business
            <input
              name="employer"
              defaultValue={profile.employer ?? ""}
              maxLength={140}
              autoComplete="organization"
            />
          </label>
        </div>
        <label>
          Occupation / profession
          <input
            name="occupation"
            defaultValue={profile.occupation ?? ""}
            maxLength={140}
            placeholder="e.g. Attorney-at-law, electrician, graphic designer"
          />
        </label>
        <label>
          About your work (optional)
          <textarea
            name="professional_bio"
            defaultValue={profile.professional_bio ?? ""}
            maxLength={1200}
            placeholder="What you do and how you can help other members."
          />
        </label>
        <label className="check-label">
          <input
            type="checkbox"
            name="open_to_professional_requests"
            defaultChecked={profile.open_to_professional_requests ?? false}
          />
          List me in the member directory so others can request my help
        </label>
      </section>

      <FormStatus state={state} />
      <SubmitButton pendingLabel="Saving…">
        {onboarding ? "Finish setup and go to my dashboard" : "Save profile changes"}
      </SubmitButton>
    </form>
  );
}
