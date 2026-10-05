import { NEXT, SUBMIT, isQuestion, type AnswerValue, type Answers, type Condition, type FormItem, type Question, type SectionItem } from "./schema";
import { choiceIds, gridCells, objectOf, otherText, signatureOf } from "./values";

// How a respondent moves through a form: pages split at sections, items
// shown only when their conditions hold, and branching that sends them to
// a section (or straight to submit) based on a choice or a section's own
// "after this section" setting. The same functions run in the browser, to
// show the right page, and on the server, to decide which questions were
// actually asked before checking that the required ones were answered.

export type Page = { section: SectionItem | null; items: FormItem[] };

export function pagesOf(items: FormItem[]): Page[] {
  const pages: Page[] = [{ section: null, items: [] }];
  for (const item of items) {
    if (item.kind === "section") pages.push({ section: item, items: [] });
    else pages[pages.length - 1]!.items.push(item);
  }
  // A form that starts with a section has an empty first page: drop it.
  if (pages.length > 1 && pages[0]!.items.length === 0) pages.shift();
  return pages;
}

export function isAnswered(value: AnswerValue | undefined | null): boolean {
  if (value === undefined || value === null) return false;
  if (typeof value === "string") return value.trim() !== "";
  if (typeof value === "number") return Number.isFinite(value);
  if (typeof value === "boolean") return value;
  if (Array.isArray(value)) return value.length > 0;
  const object = objectOf(value);
  if (!object) return false;
  if ("ids" in object || "other" in object) return choiceIds(value).length > 0 || Boolean(otherText(value));
  if ("dataUrl" in object) return Boolean(signatureOf(value));
  return Object.values(gridCells(value)).some((cell) => (Array.isArray(cell) ? cell.length > 0 : Boolean(cell)));
}

/** The answer as words, for "contains"/"equals" against free text. */
function answerAsText(question: Question, value: AnswerValue): string {
  if ("options" in question) {
    const label = (id: string) => question.options.find((o) => o.id === id)?.label ?? id;
    const ids = Array.isArray(value) ? value.filter((v): v is string => typeof v === "string") : choiceIds(value);
    return [...ids.map(label), otherText(value) ?? ""].filter(Boolean).join(", ");
  }
  return typeof value === "string" || typeof value === "number" ? String(value) : "";
}

function chosenIds(value: AnswerValue): string[] {
  if (Array.isArray(value)) return value.filter((v): v is string => typeof v === "string");
  return choiceIds(value);
}

export function conditionHolds(condition: Condition, questions: Map<string, Question>, answers: Answers): boolean {
  const question = questions.get(condition.questionId);
  const value = answers[condition.questionId];
  const answered = isAnswered(value);
  if (condition.op === "answered") return answered;
  if (condition.op === "not_answered") return !answered;
  if (!question) return false;
  const expected = (condition.value ?? "").trim();
  if (condition.op === "greater_than" || condition.op === "less_than") {
    const n = typeof value === "number" ? value : Number(value);
    const limit = Number(expected);
    if (!answered || !Number.isFinite(n) || !Number.isFinite(limit)) return false;
    return condition.op === "greater_than" ? n > limit : n < limit;
  }
  if (!answered) return condition.op === "not_equals";
  if ("options" in question) {
    const ids = chosenIds(value!);
    if (condition.op === "equals") return ids.includes(expected);
    if (condition.op === "not_equals") return !ids.includes(expected);
  }
  const text = answerAsText(question, value!).toLowerCase();
  if (condition.op === "equals") return text === expected.toLowerCase();
  if (condition.op === "not_equals") return text !== expected.toLowerCase();
  return text.includes(expected.toLowerCase());
}

export function questionMap(items: FormItem[]): Map<string, Question> {
  return new Map(items.filter(isQuestion).map((q) => [q.id, q]));
}

export function isShown(item: FormItem, questions: Map<string, Question>, answers: Answers): boolean {
  if (!("showIf" in item) || !item.showIf?.length) return true;
  return item.showIf.every((c) => conditionHolds(c, questions, answers));
}

function resolve(pages: Page[], current: number, destination: string | undefined): number | typeof SUBMIT {
  if (!destination || destination === NEXT) return current + 1 < pages.length ? current + 1 : SUBMIT;
  if (destination === SUBMIT) return SUBMIT;
  const index = pages.findIndex((p) => p.section?.id === destination);
  return index === -1 ? (current + 1 < pages.length ? current + 1 : SUBMIT) : index;
}

/** Where to go after a page: a branching choice answered on it wins (the
 *  last one, as in Google Forms), else the section's own setting. */
export function nextPage(pages: Page[], current: number, answers: Answers, items: FormItem[], startNext?: string): number | typeof SUBMIT {
  const page = pages[current];
  if (!page) return SUBMIT;
  const questions = questionMap(items);
  let destination: string | undefined = current === 0 && !page.section ? startNext : page.section?.next;
  for (const item of page.items) {
    if (!isQuestion(item) || !isShown(item, questions, answers)) continue;
    if ((item.type === "multiple_choice" || item.type === "dropdown") && item.branching) {
      const value = answers[item.id];
      if (typeof value === "string") {
        const option = item.options.find((o) => o.id === value);
        if (option?.goTo) destination = option.goTo;
      }
    }
  }
  return resolve(pages, current, destination);
}

/** The pages a respondent with these answers passes through, in order. A
 *  branch back to an earlier section ends the walk instead of looping. */
export function pathThrough(items: FormItem[], answers: Answers, startNext?: string): number[] {
  const pages = pagesOf(items);
  const path: number[] = [];
  let at: number | typeof SUBMIT = 0;
  while (at !== SUBMIT && !path.includes(at) && path.length <= pages.length) {
    path.push(at);
    at = nextPage(pages, at, answers, items, startNext);
  }
  return path;
}

/** The questions this respondent was actually asked. */
export function askedQuestions(items: FormItem[], answers: Answers, startNext?: string): Question[] {
  const pages = pagesOf(items);
  const questions = questionMap(items);
  return pathThrough(items, answers, startNext).flatMap((index) =>
    pages[index]!.items.filter((item): item is Question => isQuestion(item) && isShown(item, questions, answers)),
  );
}

/** A small seeded shuffle, so a respondent sees the same order on every
 *  page and after a reload (mulberry32). */
export function seededShuffle<T>(values: readonly T[], seed: string): T[] {
  let h = 1779033703 ^ seed.length;
  for (let i = 0; i < seed.length; i++) {
    h = Math.imul(h ^ seed.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  let state = h >>> 0;
  const random = () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const out = [...values];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [out[i], out[j]] = [out[j]!, out[i]!];
  }
  return out;
}

/** Whether the form takes responses right now, and if not, why. */
export type Availability = { open: true } | { open: false; reason: "closed" | "not_yet_open" | "ended" | "full"; message: string; opensAt?: string };

export function availability(
  settings: { accepting: boolean; closedMessage: string; opensAt: string | null; closesAt: string | null; responseLimit: number | null },
  responseCount: number,
  now = new Date(),
): Availability {
  const closed = settings.closedMessage || "This form is no longer accepting responses.";
  if (!settings.accepting) return { open: false, reason: "closed", message: closed };
  if (settings.opensAt && new Date(settings.opensAt) > now) {
    return { open: false, reason: "not_yet_open", message: "This form isn't open yet.", opensAt: settings.opensAt };
  }
  if (settings.closesAt && new Date(settings.closesAt) <= now) return { open: false, reason: "ended", message: closed };
  if (settings.responseLimit && responseCount >= settings.responseLimit) return { open: false, reason: "full", message: closed };
  return { open: true };
}
