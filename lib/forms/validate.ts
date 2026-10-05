import { askedQuestions, isAnswered } from "./logic";
import type { AnswerValue, Answers, FileAnswer, FileKind, FormItem, Question, TextValidation } from "./schema";

// Checks one respondent's answers against the questions they were actually
// asked. Answers to questions they never saw (a skipped section, a hidden
// follow-up) are dropped rather than stored. The browser runs this for
// instant feedback; the server runs it again and is the one that counts.

export const MAX_TEXT = 10000;
const MAX_SIGNATURE = 400_000;
const EMAIL = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
const PHONE = /^\+?[0-9 ()\-.]{7,20}$/;
const URL_LIKE = /^(https?:\/\/)?[a-z0-9-]+(\.[a-z0-9-]+)+(\/\S*)?$/i;

/** What the browser's file picker accepts, and what's checked on upload. */
export const FILE_TYPES: Record<FileKind, { label: string; extensions: string[]; mime: RegExp }> = {
  document: { label: "Document", extensions: [".doc", ".docx", ".odt", ".rtf", ".txt"], mime: /^(application\/(msword|vnd\.openxmlformats-officedocument\.wordprocessingml\.document|vnd\.oasis\.opendocument\.text|rtf)|text\/plain)$/ },
  pdf: { label: "PDF", extensions: [".pdf"], mime: /^application\/pdf$/ },
  spreadsheet: { label: "Spreadsheet", extensions: [".xls", ".xlsx", ".ods", ".csv"], mime: /^(application\/(vnd\.ms-excel|vnd\.openxmlformats-officedocument\.spreadsheetml\.sheet|vnd\.oasis\.opendocument\.spreadsheet)|text\/csv)$/ },
  presentation: { label: "Presentation", extensions: [".ppt", ".pptx", ".odp"], mime: /^application\/(vnd\.ms-powerpoint|vnd\.openxmlformats-officedocument\.presentationml\.presentation|vnd\.oasis\.opendocument\.presentation)$/ },
  image: { label: "Image", extensions: [".jpg", ".jpeg", ".png", ".gif", ".webp", ".heic"], mime: /^image\/(jpeg|png|gif|webp|heic|heif)$/ },
  audio: { label: "Audio", extensions: [".mp3", ".m4a", ".wav", ".ogg"], mime: /^audio\// },
  video: { label: "Video", extensions: [".mp4", ".mov", ".webm"], mime: /^video\// },
};

export function fileAllowed(accept: FileKind[], name: string, type: string): boolean {
  if (!accept.length) return true;
  const lower = name.toLowerCase();
  return accept.some((kind) => FILE_TYPES[kind].mime.test(type) || FILE_TYPES[kind].extensions.some((ext) => lower.endsWith(ext)));
}

type Result = { ok: true; value: AnswerValue | undefined } | { ok: false; error: string };
const fail = (error: string): Result => ({ ok: false, error });
const pass = (value: AnswerValue | undefined): Result => ({ ok: true, value });

function checkText(rule: TextValidation | undefined, text: string): string | null {
  if (!rule) return null;
  const say = (fallback: string) => rule.message?.trim() || fallback;
  const n = Number(text);
  const a = Number(rule.value);
  const b = Number(rule.value2);
  switch (rule.rule) {
    case "email": return EMAIL.test(text) ? null : say("Enter a valid email address.");
    case "url": return URL_LIKE.test(text) ? null : say("Enter a valid web address.");
    case "number": return text !== "" && Number.isFinite(n) ? null : say("Enter a number.");
    case "integer": return /^-?\d+$/.test(text) ? null : say("Enter a whole number.");
    case "between": return Number.isFinite(n) && n >= a && n <= b ? null : say(`Enter a number between ${rule.value} and ${rule.value2}.`);
    case "greater_than": return Number.isFinite(n) && n > a ? null : say(`Enter a number greater than ${rule.value}.`);
    case "less_than": return Number.isFinite(n) && n < a ? null : say(`Enter a number less than ${rule.value}.`);
    case "min_length": return text.length >= a ? null : say(`Use at least ${rule.value} characters.`);
    case "max_length": return text.length <= a ? null : say(`Use at most ${rule.value} characters.`);
    case "contains": return text.toLowerCase().includes((rule.value ?? "").toLowerCase()) ? null : say(`Your answer must include "${rule.value}".`);
    case "not_contains": return !text.toLowerCase().includes((rule.value ?? "").toLowerCase()) ? null : say(`Your answer can't include "${rule.value}".`);
    case "pattern": {
      try {
        return new RegExp(`^(?:${rule.value ?? ""})$`).test(text) ? null : say("That answer isn't in the expected format.");
      } catch {
        return null;
      }
    }
  }
}

function asText(value: unknown): string | null {
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  return typeof value === "string" ? value.trim() : null;
}

/** One answer: its cleaned value, or what's wrong with it. Required-ness
 *  is checked by the caller. */
export function checkAnswer(question: Question, raw: unknown): Result {
  if (raw === undefined || raw === null || raw === "") return pass(undefined);
  switch (question.type) {
    case "short_text":
    case "long_text": {
      const text = asText(raw);
      if (text === null) return fail("Enter text.");
      if (!text) return pass(undefined);
      if (text.length > MAX_TEXT) return fail("That answer is too long.");
      const problem = checkText(question.validation, text);
      return problem ? fail(problem) : pass(text);
    }
    case "email": {
      const text = asText(raw);
      if (!text) return pass(undefined);
      return EMAIL.test(text) && text.length <= 320 ? pass(text) : fail("Enter a valid email address.");
    }
    case "phone": {
      const text = asText(raw);
      if (!text) return pass(undefined);
      return PHONE.test(text) ? pass(text) : fail("Enter a valid phone number.");
    }
    case "number": {
      const text = asText(raw);
      if (!text) return pass(undefined);
      const n = Number(text);
      if (!Number.isFinite(n)) return fail("Enter a number.");
      if (question.integer && !Number.isInteger(n)) return fail("Enter a whole number.");
      if (question.min !== undefined && n < question.min) return fail(`Enter ${question.min} or more.`);
      if (question.max !== undefined && n > question.max) return fail(`Enter ${question.max} or less.`);
      return pass(n);
    }
    case "multiple_choice":
    case "dropdown": {
      if (typeof raw === "string") return question.options.some((o) => o.id === raw) ? pass(raw) : fail("Choose one of the options.");
      if (question.type === "multiple_choice" && question.other && typeof raw === "object" && raw && "other" in raw) {
        const other = asText((raw as { other: unknown }).other);
        if (!other) return pass(undefined);
        return other.length > 1000 ? fail("That answer is too long.") : pass({ other });
      }
      return fail("Choose one of the options.");
    }
    case "checkboxes": {
      if (typeof raw !== "object" || !raw || !("ids" in raw) || !Array.isArray((raw as { ids: unknown }).ids)) return fail("Choose from the options.");
      const given = raw as { ids: unknown[]; other?: unknown };
      const ids = [...new Set(given.ids.filter((id): id is string => typeof id === "string"))];
      if (ids.some((id) => !question.options.some((o) => o.id === id))) return fail("Choose from the options.");
      const other = question.other ? asText(given.other) || undefined : undefined;
      if (other && other.length > 1000) return fail("That answer is too long.");
      const count = ids.length + (other ? 1 : 0);
      if (count === 0) return pass(undefined);
      const s = question.selection;
      if (s?.rule === "at_least" && count < s.count) return fail(`Select at least ${s.count}.`);
      if (s?.rule === "at_most" && count > s.count) return fail(`Select at most ${s.count}.`);
      if (s?.rule === "exactly" && count !== s.count) return fail(`Select exactly ${s.count}.`);
      return pass(other ? { ids, other } : { ids });
    }
    case "linear_scale":
    case "rating":
    case "nps": {
      const n = typeof raw === "number" ? raw : Number(raw);
      const [low, high] = question.type === "linear_scale" ? [question.min, question.max] : question.type === "rating" ? [1, question.levels] : [0, 10];
      return Number.isInteger(n) && n >= low && n <= high ? pass(n) : fail("Choose a value on the scale.");
    }
    case "grid_choice":
    case "grid_checkbox": {
      if (typeof raw !== "object" || !raw || Array.isArray(raw)) return fail("Answer the grid.");
      const columns = new Set(question.columns.map((c) => c.id));
      const out: Record<string, string | string[]> = {};
      for (const row of question.rows) {
        const cell = (raw as Record<string, unknown>)[row.id];
        if (cell === undefined || cell === null || cell === "" || (Array.isArray(cell) && !cell.length)) continue;
        if (question.type === "grid_choice") {
          if (typeof cell !== "string" || !columns.has(cell)) return fail("Answer the grid.");
          out[row.id] = cell;
        } else {
          if (!Array.isArray(cell) || cell.some((c) => typeof c !== "string" || !columns.has(c))) return fail("Answer the grid.");
          out[row.id] = [...new Set(cell as string[])];
        }
      }
      if (!Object.keys(out).length) return pass(undefined);
      if (question.requireEachRow && Object.keys(out).length < question.rows.length) return fail("Answer every row.");
      if (question.oneColumnEach) {
        const used = Object.values(out).flat();
        if (new Set(used).size !== used.length) return fail("Choose each column only once.");
      }
      return pass(out as Record<string, string> | Record<string, string[]>);
    }
    case "ranking": {
      if (!Array.isArray(raw)) return fail("Put the options in order.");
      const ids = raw.filter((id): id is string => typeof id === "string");
      const valid = new Set(question.options.map((o) => o.id));
      if (ids.length !== question.options.length || new Set(ids).size !== ids.length || ids.some((id) => !valid.has(id))) return fail("Put every option in order.");
      return pass(ids);
    }
    case "date": {
      const text = asText(raw);
      if (!text) return pass(undefined);
      const pattern = question.includeYear
        ? question.includeTime ? /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/ : /^\d{4}-\d{2}-\d{2}$/
        : question.includeTime ? /^\d{2}-\d{2}T\d{2}:\d{2}$/ : /^\d{2}-\d{2}$/;
      if (!pattern.test(text)) return fail("Enter a date.");
      const [month, day] = (question.includeYear ? text.slice(5, 10) : text.slice(0, 5)).split("-").map(Number);
      if (!month || month > 12 || !day || day > 31) return fail("Enter a real date.");
      return pass(text);
    }
    case "time": {
      const text = asText(raw);
      if (!text) return pass(undefined);
      const ok = question.duration ? /^\d{1,3}:[0-5]\d:[0-5]\d$/.test(text) : /^([01]\d|2[0-3]):[0-5]\d$/.test(text);
      return ok ? pass(text) : fail(question.duration ? "Enter hours, minutes and seconds." : "Enter a time.");
    }
    case "file_upload": {
      if (!Array.isArray(raw)) return fail("Upload a file.");
      if (!raw.length) return pass(undefined);
      if (raw.length > question.maxFiles) return fail(`Upload at most ${question.maxFiles} file${question.maxFiles === 1 ? "" : "s"}.`);
      const files: FileAnswer[] = [];
      for (const f of raw) {
        if (!f || typeof f !== "object") return fail("Upload the file again.");
        const { path, name, size, type } = f as Record<string, unknown>;
        if (typeof path !== "string" || typeof name !== "string" || typeof size !== "number" || typeof type !== "string") return fail("Upload the file again.");
        if (size > question.maxSizeMb * 1024 * 1024) return fail(`Each file must be under ${question.maxSizeMb} MB.`);
        if (!fileAllowed(question.accept, name, type)) return fail("That kind of file isn't accepted here.");
        files.push({ path, name: name.slice(0, 200), size, type: type.slice(0, 120) });
      }
      return pass(files);
    }
    case "signature": {
      const dataUrl = typeof raw === "object" && raw && "dataUrl" in raw ? (raw as { dataUrl: unknown }).dataUrl : null;
      if (typeof dataUrl !== "string" || !dataUrl) return pass(undefined);
      if (!/^data:image\/png;base64,[A-Za-z0-9+/=]+$/.test(dataUrl) || dataUrl.length > MAX_SIGNATURE) return fail("Sign again.");
      return pass({ dataUrl });
    }
    case "consent":
      return raw === true || raw === "yes" ? pass(true) : pass(undefined);
  }
}

export type CheckedResponse = { answers: Answers; errors: Record<string, string>; asked: Question[] };

/** Every answer for one response. `errors` is keyed by question id. */
export function checkResponse(items: FormItem[], raw: Record<string, unknown>, startNext?: string): CheckedResponse {
  // Visibility depends on answers, so decide what was asked from what was
  // sent, then keep only the answers to those questions.
  const draft: Answers = {};
  for (const [key, value] of Object.entries(raw)) draft[key] = value as AnswerValue;
  const asked = askedQuestions(items, draft, startNext);
  const answers: Answers = {};
  const errors: Record<string, string> = {};
  for (const question of asked) {
    const result = checkAnswer(question, raw[question.id]);
    if (!result.ok) {
      errors[question.id] = result.error;
      continue;
    }
    if (result.value === undefined || !isAnswered(result.value)) {
      if (question.required) errors[question.id] = question.type === "consent" ? "Please agree to continue." : "This question is required.";
      continue;
    }
    answers[question.id] = result.value;
  }
  return { answers, errors, asked };
}
