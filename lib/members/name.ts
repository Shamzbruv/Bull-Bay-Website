/**
 * A person's display name, computed the same way everywhere it feeds an
 * email greeting or a printed document.
 *
 * `[first_name, last_name].filter(Boolean).join(" ")`, written out bare at
 * every call site, was the actual bug behind emails going out reading
 * "Dear ," or "Dear there,". A brand-new invitee has no profile yet, so
 * `existingProfile?.first_name ?? "there"` always produced the literal word
 * "there" — which reads as a placeholder once stitched into a formal
 * "Dear {{recipient_name}}," template, because it is one. And a profile
 * with a name genuinely missing produces an *empty string*, not undefined,
 * so `fields[key] ?? fallback` in the merge-field filler never caught it —
 * an empty string is a present value, not a missing one.
 *
 * Two functions, not one, because a blank name calls for a different fix
 * depending on how visible the mistake would be:
 *   - `greetingName` is for a line inside an email nobody will scrutinise
 *     character by character. Falling back to something plausible is the
 *     right amount of effort.
 *   - `fullName` has no built-in fallback, on purpose. It backs the big
 *     name on a certificate ("This certificate is presented to ___") and
 *     the header of an official document with the church's stamp and the
 *     pastor's signature — a document that goes out with a soft, generic
 *     fallback instead of a real name is not a smaller version of the
 *     problem, it is a different and worse one. Callers that print an
 *     official document must check the result and refuse to proceed
 *     rather than silently print a placeholder.
 */
export function fullName(
  person: { first_name?: string | null; last_name?: string | null } | null | undefined,
): string {
  return [person?.first_name, person?.last_name].filter(Boolean).join(" ").trim();
}

/** The phrase already used for a missing name elsewhere in this codebase
 *  (the prayer-completed email) — kept as one constant so every greeting
 *  degrades to the same wording rather than each call site inventing its
 *  own. */
export const UNKNOWN_NAME_GREETING = "Church family";

export function greetingName(
  person: { first_name?: string | null; last_name?: string | null } | null | undefined,
  fallback: string = UNKNOWN_NAME_GREETING,
): string {
  // First name alone for a personal, informal greeting ("Hi Sarah,"); the
  // rest of fullName() only comes into play for the unusual case of a
  // last name on file with no first name.
  return person?.first_name?.trim() || fullName(person) || fallback;
}
