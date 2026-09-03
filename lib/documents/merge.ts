/** Replaces {{field_name}} placeholders in a template body with values from
 * a flat string map. Unknown placeholders are left as-is (visibly, so a
 * secretary preparing the document notices a field wasn't filled rather
 * than silently getting a blank). Paragraphs are split on blank lines so
 * the PDF renderer can lay them out with proper spacing. */
export function mergeTemplate(body: string, fields: Record<string, string>): string[] {
  const merged = body.replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (match, key: string) => {
    return Object.prototype.hasOwnProperty.call(fields, key) ? (fields[key] ?? match) : match;
  });
  return merged
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean);
}

export const STANDARD_MERGE_FIELDS = [
  { key: "member_name", label: "Member's full name" },
  { key: "date_today", label: "Today's date" },
  { key: "purpose", label: "Purpose of the letter" },
  { key: "membership_since", label: "Member since (date)" },
  { key: "church_name", label: "Church name" },
] as const;
