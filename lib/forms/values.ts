import type { AnswerValue, FileAnswer } from "./schema";

// Reading the shapes an answer can take, without trusting them: answers
// come back from the database and the browser as plain JSON.

export function objectOf(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : null;
}

/** The option ids a single- or multi-choice answer picked. */
export function choiceIds(value: AnswerValue | undefined | null): string[] {
  if (typeof value === "string") return [value];
  const ids = objectOf(value)?.ids;
  return Array.isArray(ids) ? ids.filter((id): id is string => typeof id === "string") : [];
}

/** The "Other" text of a choice answer, if any. */
export function otherText(value: AnswerValue | undefined | null): string | undefined {
  const other = objectOf(value)?.other;
  return typeof other === "string" && other.trim() ? other : undefined;
}

export function filesOf(value: AnswerValue | undefined | null): FileAnswer[] {
  if (!Array.isArray(value)) return [];
  return value.filter((f): f is FileAnswer => Boolean(objectOf(f)) && typeof (f as FileAnswer).path === "string");
}

/** Grid answers: row id → column id (or ids). */
export function gridCells(value: AnswerValue | undefined | null): Record<string, string | string[]> {
  const object = objectOf(value);
  if (!object) return {};
  const out: Record<string, string | string[]> = {};
  for (const [row, cell] of Object.entries(object)) {
    if (typeof cell === "string") out[row] = cell;
    else if (Array.isArray(cell)) out[row] = cell.filter((c): c is string => typeof c === "string");
  }
  return out;
}

export function signatureOf(value: AnswerValue | undefined | null): string | undefined {
  const dataUrl = objectOf(value)?.dataUrl;
  return typeof dataUrl === "string" ? dataUrl : undefined;
}
