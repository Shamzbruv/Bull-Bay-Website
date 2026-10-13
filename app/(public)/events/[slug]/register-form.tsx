"use client";
import Link from "next/link";
import { useActionState, useState } from "react";
import { registerForEvent } from "@/app/(public)/actions";
import { initialActionState } from "@/lib/action-state";
import { SubmitButton } from "@/components/submit-button";
import { FormStatus } from "@/components/form-status";

export function RegisterForm({ eventId, slug, profile, memberRequested = false, closed = false }: {
  eventId: string; slug: string; profile: { name: string; email: string; phone: string } | null; memberRequested?: boolean; closed?: boolean;
}) {
  const [state, formAction] = useActionState(registerForEvent.bind(null, eventId), initialActionState);
  const [isMember, setMember] = useState(profile || memberRequested ? "yes" : "");
  const [quantity, setQuantity] = useState(1);
  const signIn = `/login?next=${encodeURIComponent(`/events/${slug}?member=yes`)}`;
  if (closed) return <div className="clay-form"><h3>Event registration</h3><p>Registration is closed or has not opened yet. Please contact the church office for details.</p></div>;
  if (state.status === 'success') return <div className="clay-form"><h3>Event registration</h3><FormStatus state={state} /></div>;
  return <form className="clay-form" action={formAction}>
    <h3>Register for this event</h3>
    <label>Are you a member of Bull Bay church?<select name="isMember" required value={isMember} onChange={e => setMember(e.target.value)}><option value="">Please choose</option><option value="yes">Yes, I am a church member</option><option value="no">No, I am visiting</option></select></label>
    {isMember === 'yes' && !profile ? <div><p>Sign in with your church account to finish registration. You will return to this event.</p><Link className="primary-button" href={signIn}>Sign in to register</Link><p className="form-note">Need an account or help signing in? Contact the church office for an invitation.</p></div> : isMember && <>
      {isMember === 'yes' && <p className="form-note">Your registration will be linked to your member record. Confirm your contact details below.</p>}
      <label>Full name<input name="guestName" required defaultValue={profile?.name ?? ''} maxLength={200} autoComplete="name" /></label>
      <label>Email address<input name="guestEmail" type="email" required defaultValue={profile?.email ?? ''} maxLength={254} autoComplete="email" /></label>
      <label>Contact phone number<input name="guestPhone" type="tel" required defaultValue={profile?.phone ?? ''} minLength={7} maxLength={50} autoComplete="tel" /></label>
      <label>Number attending, including you<input name="quantity" type="number" min={1} max={50} step={1} required value={quantity} onChange={e => setQuantity(Number(e.target.value))} /></label>
      <label>Names of additional attendees (one per line)<textarea name="attendees" rows={3} required={quantity > 1} maxLength={5000} placeholder={quantity > 1 ? `Enter ${quantity - 1} additional name${quantity === 2 ? '' : 's'}` : 'Leave blank if attending alone'} /></label>
      <label>Accessibility, dietary or other requirements (optional)<textarea name="requirements" rows={3} maxLength={2000} /></label>
      <label>Additional information for the church office (optional)<textarea name="notes" rows={3} maxLength={5000} /></label>
      <label className="checkbox-label"><input name="consent" type="checkbox" value="yes" required />I agree to share these registration details with authorized church staff for this event.</label>
      <FormStatus state={state} />
      <SubmitButton pendingLabel="Registering…">Complete registration →</SubmitButton>
    </>}
  </form>;
}
