import { definitionSchema, checkDefinition, isQuestion, type ChoiceOption, type FormDefinition, type FormItem, type Question, type QuestionType } from "./schema";

// What the form builder does to a form: new items, changing a question's
// type without losing its choices, unique ids, moving things around, and
// the plain-words list of problems that stops a broken form being saved.

export const TYPE_LABELS: Record<QuestionType, string> = {
  short_text: "Short answer",
  long_text: "Paragraph",
  email: "Email address",
  phone: "Phone number",
  number: "Number",
  multiple_choice: "Multiple choice",
  checkboxes: "Checkboxes",
  dropdown: "Dropdown",
  linear_scale: "Linear scale",
  rating: "Rating",
  nps: "Net Promoter Score",
  grid_choice: "Multiple-choice grid",
  grid_checkbox: "Tick-box grid",
  ranking: "Ranking",
  date: "Date",
  time: "Time",
  file_upload: "File upload",
  signature: "Signature",
  consent: "Agreement (tick to agree)",
};

export const TYPE_GROUPS: { label: string; types: QuestionType[] }[] = [
  { label: "Text", types: ["short_text", "long_text", "email", "phone", "number"] },
  { label: "Choices", types: ["multiple_choice", "checkboxes", "dropdown", "ranking"] },
  { label: "Scales", types: ["linear_scale", "rating", "nps", "grid_choice", "grid_checkbox"] },
  { label: "Other", types: ["date", "time", "file_upload", "signature", "consent"] },
];

function randomPart(): string {
  const bytes = new Uint8Array(4);
  globalThis.crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => (b % 36).toString(36)).join("") + Array.from(bytes, (b) => ((b >> 3) % 36).toString(36)).join("").slice(0, 2);
}

/** Every id used anywhere in the form: items, choices, rows, columns. */
export function idsIn(items: FormItem[]): Set<string> {
  const ids = new Set<string>();
  for (const item of items) {
    ids.add(item.id);
    if (isQuestion(item)) {
      if ("options" in item) item.options.forEach((o) => ids.add(o.id));
      if ("rows" in item) {
        item.rows.forEach((r) => ids.add(r.id));
        item.columns.forEach((c) => ids.add(c.id));
      }
    }
  }
  return ids;
}

export function newId(prefix: string, taken: Set<string>): string {
  for (;;) {
    const id = `${prefix}_${randomPart()}`;
    if (!taken.has(id)) {
      taken.add(id);
      return id;
    }
  }
}

const options = (taken: Set<string>, labels: string[]): ChoiceOption[] => labels.map((label) => ({ id: newId("o", taken), label }));
const lines = (prefix: string, taken: Set<string>, labels: string[]) => labels.map((label) => ({ id: newId(prefix, taken), label }));

export function newQuestion(type: QuestionType, taken: Set<string>, title = ""): Question {
  const base = { kind: "question" as const, id: newId("q", taken), title, required: false };
  switch (type) {
    case "short_text":
    case "long_text":
    case "signature":
      return { ...base, type };
    case "email":
    case "phone":
      return { ...base, type, prefill: true };
    case "number":
      return { ...base, type };
    case "multiple_choice":
    case "checkboxes":
    case "dropdown":
      return { ...base, type, options: options(taken, ["Option 1"]) };
    case "ranking":
      return { ...base, type, options: options(taken, ["Option 1", "Option 2", "Option 3"]) };
    case "linear_scale":
      return { ...base, type, min: 1, max: 5 };
    case "rating":
      return { ...base, type, levels: 5, icon: "star" };
    case "nps":
      return { ...base, type, minLabel: "Not at all likely", maxLabel: "Extremely likely" };
    case "grid_choice":
    case "grid_checkbox":
      return { ...base, type, rows: lines("r", taken, ["Row 1", "Row 2"]), columns: lines("c", taken, ["Column 1", "Column 2"]) };
    case "date":
      return { ...base, type, includeYear: true, includeTime: false };
    case "time":
      return { ...base, type, duration: false };
    case "file_upload":
      return { ...base, type, maxFiles: 1, maxSizeMb: 10, accept: [] };
    case "consent":
      return { ...base, type, statement: "I agree." };
  }
}

const BRANCHING_TYPES: QuestionType[] = ["multiple_choice", "dropdown"];
const LONG_TEXT_RULES = ["min_length", "max_length", "contains", "not_contains", "pattern"];

/** Change a question's type, keeping what carries over: title,
 *  description, required, conditions, its choices (or grid rows and
 *  columns) where both types have them, and settings both types share, such
 *  as "Other" and shuffling. A quiz answer key only survives between choice
 *  types. */
export function convertQuestion(question: Question, type: QuestionType, taken: Set<string>): Question {
  if (question.type === type) return question;
  const fresh = newQuestion(type, taken, question.title);
  const keep = { id: question.id, title: question.title, description: question.description, required: question.required, showIf: question.showIf };
  const out = { ...fresh, ...keep } as Question;
  const choiceTypes: QuestionType[] = ["multiple_choice", "checkboxes", "dropdown", "ranking"];
  if ("options" in question && "options" in out) {
    // A ranking has no spot limits or branches; only two types can branch.
    const carried =
      type === "ranking"
        ? question.options.map(({ id, label }) => ({ id, label }))
        : BRANCHING_TYPES.includes(type)
          ? question.options
          : question.options.map((option) => {
              const copy = { ...option };
              delete copy.goTo;
              return copy;
            });
    (out as { options: ChoiceOption[] }).options = carried.length >= (type === "ranking" ? 2 : 1) ? carried : (out as { options: ChoiceOption[] }).options;
    if (question.quiz && choiceTypes.includes(type) && type !== "ranking" && question.type !== "ranking") {
      const ids = new Set(carried.map((o) => o.id));
      const correct = question.quiz.correct.filter((id) => ids.has(id));
      out.quiz = { ...question.quiz, correct: type === "checkboxes" ? correct : correct.slice(0, 1) };
    }
  }
  if ("rows" in question && "rows" in out) {
    (out as { rows: typeof question.rows }).rows = question.rows;
    (out as { columns: typeof question.columns }).columns = question.columns;
  }
  const from = question as Record<string, unknown>;
  const to = out as Record<string, unknown>;
  const carry = (key: string, types: QuestionType[]) => {
    if (types.includes(type) && from[key] !== undefined) to[key] = from[key];
  };
  carry("other", ["multiple_choice", "checkboxes"]);
  carry("shuffle", ["multiple_choice", "checkboxes", "dropdown"]);
  carry("branching", BRANCHING_TYPES);
  carry("requireEachRow", ["grid_choice", "grid_checkbox"]);
  carry("oneColumnEach", ["grid_choice", "grid_checkbox"]);
  carry("shuffleRows", ["grid_choice", "grid_checkbox"]);
  if ("validation" in question && question.validation && (type === "short_text" || (type === "long_text" && LONG_TEXT_RULES.includes(question.validation.rule)))) {
    to.validation = question.validation;
  }
  if (question.quiz && !out.quiz) out.quiz = { points: question.quiz.points, correct: [] };
  return out;
}

/** A copy with fresh ids, placed after the original. */
export function duplicateItem(items: FormItem[], id: string): FormItem[] {
  const index = items.findIndex((i) => i.id === id);
  if (index === -1) return items;
  const taken = idsIn(items);
  const source = structuredClone(items[index]!);
  const copy = { ...source, id: newId(source.kind === "question" ? "q" : source.kind === "section" ? "s" : "b", taken) } as FormItem;
  if (isQuestion(copy)) {
    const remap = new Map<string, string>();
    if ("options" in copy) copy.options = copy.options.map((o) => { const next = newId("o", taken); remap.set(o.id, next); return { ...o, id: next }; });
    if ("rows" in copy) {
      copy.rows = copy.rows.map((r) => { const next = newId("r", taken); remap.set(r.id, next); return { ...r, id: next }; });
      copy.columns = copy.columns.map((c) => { const next = newId("c", taken); remap.set(c.id, next); return { ...c, id: next }; });
    }
    if (copy.quiz) copy.quiz = { ...copy.quiz, correct: copy.quiz.correct.map((key) => key.split(":").map((part) => remap.get(part) ?? part).join(":")) };
    if (copy.title) copy.title = `${copy.title} (copy)`;
  }
  return [...items.slice(0, index + 1), copy, ...items.slice(index + 1)];
}

export function moveItem(items: FormItem[], from: number, to: number): FormItem[] {
  if (from === to || from < 0 || to < 0 || from >= items.length || to >= items.length) return items;
  const next = [...items];
  const [moved] = next.splice(from, 1);
  next.splice(to, 0, moved!);
  return next;
}

/** Remove an item and anything that pointed at it: conditions on a
 *  deleted question, branches to a deleted section. */
export function removeItem(items: FormItem[], id: string): FormItem[] {
  return items
    .filter((i) => i.id !== id)
    .map((item) => {
      let out = item;
      if ("showIf" in out && out.showIf?.some((c) => c.questionId === id)) out = { ...out, showIf: out.showIf.filter((c) => c.questionId !== id) };
      if (out.kind === "section" && out.next === id) out = { ...out, next: undefined };
      if (isQuestion(out) && "options" in out && out.options.some((o) => o.goTo === id)) {
        out = { ...out, options: out.options.map((o) => (o.goTo === id ? { ...o, goTo: undefined } : o)) } as FormItem;
      }
      return out;
    });
}

/** Problems in plain words, or [] when the form can be saved. */
export function definitionProblems(definition: FormDefinition): string[] {
  const problems: string[] = [];
  if (!definition.title.trim()) problems.push("Give the form a title.");
  definition.items.forEach((item, i) => {
    const where = `Item ${i + 1}`;
    if (isQuestion(item)) {
      if (!item.title.trim()) problems.push(`${where}: add the question.`);
      if ("options" in item && item.options.some((o) => !o.label.trim())) problems.push(`${where} ("${item.title || "untitled"}"): a choice is empty.`);
      if ("rows" in item && [...item.rows, ...item.columns].some((r) => !r.label.trim())) problems.push(`${where} ("${item.title || "untitled"}"): a row or column is empty.`);
      if (item.type === "consent" && !item.statement.trim()) problems.push(`${where}: write what people are agreeing to.`);
    }
    if (item.kind === "image" && !/^https:\/\//.test(item.url)) problems.push(`${where}: choose an image.`);
    if (item.kind === "video" && !/^https:\/\//.test(item.url)) problems.push(`${where}: paste the video's YouTube link.`);
  });
  if (problems.length) return problems;
  const parsed = definitionSchema.safeParse(definition);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    const at = typeof issue?.path[1] === "number" ? `Item ${issue.path[1] + 1}: ` : "";
    return [`${at}${issue?.message ?? "Something in the form isn't valid."}`];
  }
  return checkDefinition(parsed.data);
}
