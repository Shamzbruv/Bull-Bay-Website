"use client";
import { useState } from "react";
export type OfficiantChoice = { id: string; first_name: string | null; last_name: string | null; email: string | null };
export function OfficiantFields({ pastors, enabled, onChange, onNameChange }: { pastors: OfficiantChoice[]; enabled: boolean; onChange: (value: boolean) => void; onNameChange?: (name: string) => void }) {
  const [choice, setChoice] = useState("other");
  return <fieldset><legend>Officiating pastor</legend>
    <label className="check-label"><input type="checkbox" name="request_officiant" checked={enabled} onChange={e => onChange(e.target.checked)} />Request acknowledgement from a different officiating pastor</label>
    {enabled && <><p className="form-note">Choose a pastor or enter a visiting pastor. They receive a private link to review the document, confirm they officiated, and sign using a mouse or finger. The office issues the certificate after they sign.</p>
      <label>Pastor<select name="officiant_profile_id" value={choice} onChange={e => { setChoice(e.target.value); const pastor = pastors.find(p => p.id === e.target.value); onNameChange?.(pastor ? [pastor.first_name, pastor.last_name].filter(Boolean).join(" ") : ""); }}><option value="other">Visiting / other pastor</option>{pastors.map(p => <option key={p.id} value={p.id}>{p.first_name} {p.last_name}{p.email ? ` — ${p.email}` : " (email missing)"}</option>)}</select></label>
      {choice === "other" && <div className="form-row"><label>Pastor&apos;s full name<input name="officiant_name" required maxLength={200} onChange={e => onNameChange?.(e.target.value)} /></label><label>Pastor&apos;s email<input name="officiant_email" type="email" required maxLength={320} /></label></div>}
      <p className="form-note">Sending another request replaces the previous signing link and signature.</p>
    </>}
  </fieldset>;
}
