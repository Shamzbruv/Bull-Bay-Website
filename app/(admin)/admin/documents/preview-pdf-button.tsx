/**
 * Opens the document, as it will look, in a new tab: whatever the form
 * holds so far is posted to a preview route (lib/documents/preview.ts),
 * nothing is saved or sent, and the form stays as it was. A plain URL
 * `formAction` makes this an ordinary browser submit; React only takes over
 * submits whose action is a function. `formNoValidate`: a half-filled
 * document can still be previewed, with its blanks marked.
 */
export function PreviewPdfButton({ href }: { href: string }) {
  return (
    <button type="submit" className="secondary-button" formAction={href} formMethod="post" formTarget="_blank" formNoValidate>
      Preview PDF
    </button>
  );
}

export function PreviewNote() {
  return (
    <p className="form-note doc-preview-note">
      Preview PDF opens the document in a new tab as it will look, from what&apos;s filled in so far. Nothing is saved
      or sent. The Pastor&apos;s signature, the church stamp and the document number are only added when it&apos;s
      certified.
    </p>
  );
}
