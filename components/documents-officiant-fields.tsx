"use client";
import { useState } from "react";
export type OfficiantChoice = { id: string; first_name: string | null; last_name: string | null; email: string | null };
export function OfficiantFields({ pastors, enabled, onChange, onNameChange, savedSignatures = [], onSavedChange, initialSavedId = "" }: { pastors: OfficiantChoice[]; enabled: boolean; onChange: (value: boolean) => void; onNameChange?: (name: string) => void; savedSignatures?: { id: string; name: string | null; email: string }[]; onSavedChange?: (id: string) => void; initialSavedId?: string }) {
  const [choice, setChoice] = useState("other");
  const [saved, setSaved] = useState(initialSavedId);
  return <fieldset><legend>Pastor signature</legend>
    <label>Use an authorized saved signature<select name="saved_pastor_signature_id" value={saved} onChange={e => { setSaved(e.target.value); onSavedChange?.(e.target.value); if (e.target.value) { onChange(false); onNameChange?.(savedSignatures.find(s=>s.id===e.target.value)?.name || ""); } }}><option value="">Keep current / usual church pastor workflow</option>{savedSignatures.map(s=><option key={s.id} value={s.id}>{s.name} — {s.email}</option>)}</select></label>
    <p className="form-note">Saved signatures already have permission for reuse. Add more under Documents → Pastor signatures.</p>
    <label className="check-label"><input type="checkbox" name="request_officiant" checked={enabled} onChange={e => { onChange(e.target.checked); if(e.target.checked) { setSaved(""); onSavedChange?.(""); } }} />Request acknowledgement from a different officiating pastor</label>
    {enabled && <><p className="form-note">Choose a pastor or enter a visiting pastor. They receive a private link to review the document, confirm they officiated, and sign using a mouse or finger. The office issues the certificate after they sign.</p>
      <label>Pastor<select name="officiant_profile_id" value={choice} onChange={e => { setChoice(e.target.value); const pastor = pastors.find(p => p.id === e.target.value); onNameChange?.(pastor ? [pastor.first_name, pastor.last_name].filter(Boolean).join(" ") : ""); }}><option value="other">Visiting / other pastor</option>{pastors.map(p => <option key={p.id} value={p.id}>{p.first_name} {p.last_name}{p.email ? ` — ${p.email}` : " (email missing)"}</option>)}</select></label>
      {choice === "other" && <div className="form-row"><label>Pastor&apos;s full name<input name="officiant_name" required maxLength={200} onChange={e => onNameChange?.(e.target.value)} /></label><label>Pastor&apos;s email<input name="officiant_email" type="email" required maxLength={320} /></label></div>}
      <p className="form-note">Sending another request replaces the previous signing link and signature.</p>
    </>}
  </fieldset>;
}
