"use client";

import type { FormSettings } from "@/lib/forms/schema";
import { NumberField, SelectField, TextField, Toggle } from "./controls";
import { ImageField } from "./image-field";

// Everything Google Forms keeps under Settings and Microsoft Forms under
// "…", grouped the way a church office thinks about it.

const ACCENTS = ["#173f89", "#0f5c4d", "#8a4f9e", "#b5482a", "#c9922b", "#1d2b45", "#2b8f9e", "#9c2f59"];
const BACKGROUNDS = ["#f4efe6", "#eef1ec", "#e9eff9", "#f6eef3", "#fff8e8", "#f2f2f2"];

/** A Jamaica date-time (datetime-local value) ↔ ISO. Jamaica keeps UTC−5 all year. */
const toLocal = (iso: string | null) => (iso ? new Date(new Date(iso).getTime() - 5 * 3600000).toISOString().slice(0, 16) : "");
const fromLocal = (local: string) => (local ? new Date(`${local}:00-05:00`).toISOString() : null);

export function SettingsEditor({ settings, onChange, staff, formId }: {
  settings: FormSettings;
  onChange: (settings: FormSettings) => void;
  staff: { id: string; name: string; email: string | null }[];
  formId: string;
}) {
  const set = (patch: Partial<FormSettings>) => onChange({ ...settings, ...patch });
  const needsSignIn = settings.requireSignIn || settings.limitOneResponse || settings.collectEmail === "verified";
  return (
    <div className="fb-settings">
      <section className="fb-panel">
        <h2>Responses</h2>
        <Toggle label="Accepting responses" checked={settings.accepting} onChange={(accepting) => set({ accepting })} />
        {!settings.accepting && <TextField label="Message shown while closed" multiline value={settings.closedMessage} maxLength={2000} onChange={(closedMessage) => set({ closedMessage })} />}
        <SelectField
          label="Collect email addresses"
          value={settings.collectEmail}
          options={[
            { value: "none", label: "Don't collect" },
            { value: "verified", label: "Verified: the signed-in member's own address" },
            { value: "input", label: "Ask people to type it" },
          ]}
          onChange={(collectEmail) => set({ collectEmail })}
        />
        <Toggle label="Members only (sign-in required)" hint="Anyone else is asked to sign in first." checked={settings.requireSignIn} onChange={(requireSignIn) => set({ requireSignIn })} />
        <Toggle label="Limit to one response per person" hint="Needs sign-in, so it knows who has answered." checked={settings.limitOneResponse} onChange={(limitOneResponse) => set({ limitOneResponse })} />
        <Toggle label="Let people change their response after sending it" checked={settings.allowEdit} onChange={(allowEdit) => set({ allowEdit })} />
        <SelectField
          label="Email people a copy of their response"
          value={settings.receipts}
          options={[
            { value: "never", label: "Off" },
            { value: "requested", label: "When they ask for one" },
            { value: "always", label: "Always" },
          ]}
          onChange={(receipts) => set({ receipts })}
        />
        {needsSignIn && <p className="fb-hint">With these settings, people sign in with their church account before they can respond.</p>}
      </section>

      <section className="fb-panel">
        <h2>Schedule and limits</h2>
        <div className="fb-two">
          <label className="fb-field">
            <span>Opens (optional)</span>
            <input type="datetime-local" value={toLocal(settings.opensAt)} onChange={(e) => set({ opensAt: fromLocal(e.target.value) })} />
          </label>
          <label className="fb-field">
            <span>Closes (optional)</span>
            <input type="datetime-local" value={toLocal(settings.closesAt)} onChange={(e) => set({ closesAt: fromLocal(e.target.value) })} />
          </label>
        </div>
        <p className="fb-hint">Jamaica time. Before it opens, people see when it will; after it closes, the closed message.</p>
        <NumberField label="Close after this many responses" value={settings.responseLimit} min={1} width={110} placeholder="No limit" onChange={(n) => set({ responseLimit: n ? Math.max(1, Math.round(n)) : null })} />
      </section>

      <section className="fb-panel">
        <h2>Presentation</h2>
        <Toggle label="Show a progress bar" checked={settings.showProgressBar} onChange={(showProgressBar) => set({ showProgressBar })} />
        <Toggle label="Shuffle the order of questions" hint="Within each section." checked={settings.shuffleQuestions} onChange={(shuffleQuestions) => set({ shuffleQuestions })} />
        <TextField label="Message after sending" multiline value={settings.confirmationMessage} maxLength={2000} onChange={(confirmationMessage) => set({ confirmationMessage })} />
        <Toggle label="Offer a link to send another response" checked={settings.showSubmitAnother} onChange={(showSubmitAnother) => set({ showSubmitAnother })} />
        <Toggle label="Show people a summary of everyone's answers" hint="Charts of the choices only: written answers and files stay private." checked={settings.showResultsSummary} onChange={(showResultsSummary) => set({ showResultsSummary })} />
      </section>

      <section className="fb-panel">
        <h2>Quiz</h2>
        <Toggle label="Make this a quiz" hint="Give questions points and an answer key; answers are marked automatically." checked={settings.quiz.enabled} onChange={(enabled) => set({ quiz: { ...settings.quiz, enabled } })} />
        {settings.quiz.enabled && (
          <>
            <SelectField
              label="Release each score"
              value={settings.quiz.release}
              options={[
                { value: "immediately", label: "Straight after they submit" },
                { value: "manual", label: "Later, after I review it" },
              ]}
              onChange={(release) => set({ quiz: { ...settings.quiz, release } })}
            />
            <Toggle label="They see which answers were wrong" checked={settings.quiz.showMissed} onChange={(showMissed) => set({ quiz: { ...settings.quiz, showMissed } })} />
            <Toggle label="They see the correct answers" checked={settings.quiz.showCorrect} onChange={(showCorrect) => set({ quiz: { ...settings.quiz, showCorrect } })} />
            <Toggle label="They see point values" checked={settings.quiz.showPoints} onChange={(showPoints) => set({ quiz: { ...settings.quiz, showPoints } })} />
          </>
        )}
      </section>

      <section className="fb-panel">
        <h2>Notifications</h2>
        <Toggle
          label="Notify the church office (bell) for every response"
          hint="Secretaries, church executives and whoever made the form get a bell and a phone notification. Best for requests that need action, not big sign-ups."
          checked={settings.notify.office}
          onChange={(office) => set({ notify: { ...settings.notify, office } })}
        />
        <p className="fb-sub">Also email every response to:</p>
        <div className="fb-chips">
          {staff.map((person) => (
            <label key={person.id} className="fb-chip">
              <input
                type="checkbox"
                checked={settings.notify.emailProfileIds.includes(person.id)}
                disabled={!person.email}
                onChange={(e) =>
                  set({ notify: { ...settings.notify, emailProfileIds: e.target.checked ? [...settings.notify.emailProfileIds, person.id].slice(0, 20) : settings.notify.emailProfileIds.filter((id) => id !== person.id) } })
                }
              />
              {person.name}
            </label>
          ))}
        </div>
      </section>

      <section className="fb-panel">
        <h2>Theme</h2>
        <p className="fb-sub">Colour</p>
        <div className="fb-swatches">
          {ACCENTS.map((c) => (
            <button key={c} type="button" className={`fb-swatch${settings.theme.accent === c ? " is-on" : ""}`} style={{ background: c }} aria-label={`Colour ${c}`} aria-pressed={settings.theme.accent === c} onClick={() => set({ theme: { ...settings.theme, accent: c } })} />
          ))}
          <input type="color" aria-label="Choose any colour" value={settings.theme.accent} onChange={(e) => set({ theme: { ...settings.theme, accent: e.target.value } })} />
        </div>
        <p className="fb-sub">Background</p>
        <div className="fb-swatches">
          {BACKGROUNDS.map((c) => (
            <button key={c} type="button" className={`fb-swatch is-light${settings.theme.background === c ? " is-on" : ""}`} style={{ background: c }} aria-label={`Background ${c}`} aria-pressed={settings.theme.background === c} onClick={() => set({ theme: { ...settings.theme, background: c } })} />
          ))}
          <input type="color" aria-label="Choose any background colour" value={settings.theme.background} onChange={(e) => set({ theme: { ...settings.theme, background: e.target.value } })} />
        </div>
        <SelectField
          label="Lettering"
          value={settings.theme.font}
          options={[
            { value: "serif", label: "Classic (like the church website)" },
            { value: "sans", label: "Clean" },
            { value: "rounded", label: "Friendly" },
          ]}
          onChange={(font) => set({ theme: { ...settings.theme, font } })}
        />
        <p className="fb-sub">Header picture</p>
        <ImageField formId={formId} value={settings.theme.headerImage ?? ""} onChange={(url) => set({ theme: { ...settings.theme, headerImage: url || null } })} />
      </section>

      <section className="fb-panel">
        <h2>For the church</h2>
        <Toggle label="List this form on members' Forms page" hint="Signed-in members find it under Forms in the member portal." checked={settings.listInMemberPortal} onChange={(listInMemberPortal) => set({ listInMemberPortal })} />
        <Toggle label="Kiosk mode" hint="For a tablet in the foyer: after each response the form starts over by itself, and nothing is kept on the device." checked={settings.kiosk} onChange={(kiosk) => set({ kiosk })} />
        <Toggle label="Keep answers on the person's device until they send" hint="If they close the page, they can pick up where they left off." checked={settings.autosave} onChange={(autosave) => set({ autosave })} />
      </section>
    </div>
  );
}
