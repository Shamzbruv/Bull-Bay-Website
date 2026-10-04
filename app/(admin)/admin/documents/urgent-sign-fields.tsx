"use client";

/**
 * "Urgent: can't wait for the Pastor". Ticked, the form applies his
 * signature and the church stamp as soon as it's submitted, and he is told
 * at once, by notification and email, who did it, on what and why.
 */
export function UrgentSignFields({ urgent, onChange, signingReady }: { urgent: boolean; onChange: (urgent: boolean) => void; signingReady: boolean }) {
  return (
    <div className="urgent-sign">
      <label className="check-label">
        <input type="checkbox" name="urgent" checked={urgent} disabled={!signingReady} onChange={(e) => onChange(e.target.checked)} />
        Urgent: can&apos;t wait for the Pastor. Apply his signature and the church stamp now.
      </label>
      {!signingReady && (
        <p className="form-note">
          Not available yet: the Pastor hasn&apos;t uploaded his signature and the church stamp. He adds them on his
          Documents page (Your signature &amp; stamp).
        </p>
      )}
      {urgent && (
        <>
          <label>
            Why can&apos;t it wait?
            <textarea name="urgent_reason" required maxLength={1000} placeholder="e.g. The embassy needs it by 3 pm today and the Pastor is travelling." />
          </label>
          <p className="form-note">
            The Pastor is told straight away, by notification and email: that you used his signature and stamp, on
            which document, who it went to, and your reason.
          </p>
        </>
      )}
    </div>
  );
}
