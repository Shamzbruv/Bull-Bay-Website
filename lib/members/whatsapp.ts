/**
 * Builds a WhatsApp "click to chat" link (wa.me/<digits>) from whatever a
 * member typed into the phone field — and the phone field has genuinely
 * been typed every which way: "+1 (876) 567-8471", "876 442 9427",
 * "8763817085", "+18765286029". wa.me needs the country code and the
 * number as plain digits, nothing else.
 *
 * Every church member here is Jamaican, so a bare 7-digit number (missing
 * even the area code) is completed with Jamaica's own area code, and a
 * bare 10-digit number is completed with the NAPN country code "1" — both
 * safe assumptions for this specific membership, not a general-purpose
 * phone parser.
 *
 * Numbers that don't confidently fit one of those shapes return null
 * rather than a best guess. A wrong guess here doesn't fail loudly the way
 * a bad email does — it opens a real WhatsApp chat with a stranger's
 * number, so silence is the only safe fallback for anything ambiguous.
 */
export function whatsAppLink(rawPhone: string | null | undefined): string | null {
  if (!rawPhone) return null;
  const digits = rawPhone.replace(/\D/g, "");

  let e164Digits: string | null = null;
  if (digits.length === 7) {
    e164Digits = `1876${digits}`;
  } else if (digits.length === 10) {
    e164Digits = `1${digits}`;
  } else if (digits.length === 11 && digits.startsWith("1")) {
    e164Digits = digits;
  }

  if (!e164Digits) return null;
  return `https://wa.me/${e164Digits}`;
}
