import { z } from "zod";

// The church's form builder: everything Google Forms and Microsoft Forms
// can ask, plus a few things a church needs (signatures, consent, spot
// limits on sign-up choices, member auto-fill). One definition shared by
// the builder, the respondent's page and the server, so a form can't be
// built that the server would refuse to accept answers for.

export const QUESTION_TYPES = [
  "short_text",
  "long_text",
  "email",
  "phone",
  "number",
  "multiple_choice",
  "checkboxes",
  "dropdown",
  "linear_scale",
  "rating",
  "nps",
  "grid_choice",
  "grid_checkbox",
  "ranking",
  "date",
  "time",
  "file_upload",
  "signature",
  "consent",
] as const;
export type QuestionType = (typeof QUESTION_TYPES)[number];

export const FILE_KINDS = ["document", "pdf", "spreadsheet", "presentation", "image", "audio", "video"] as const;
export type FileKind = (typeof FILE_KINDS)[number];

/** Where a choice or section can send the respondent next. */
export const SUBMIT = "submit";
export const NEXT = "next";

const itemId = z.string().regex(/^[a-z][a-z0-9_]{0,39}$/, "Item ids are lower-case letters, digits and underscores.");
const shortLabel = z.string().trim().min(1).max(300);
const hexColor = z.string().regex(/^#[0-9a-fA-F]{6}$/);

export const optionSchema = z.object({
  id: itemId,
  label: shortLabel,
  /** Branching: a section id, "submit" or "next". */
  goTo: z.string().max(40).optional(),
  /** Spot limit: once this many people have picked it, it can't be picked. */
  limit: z.number().int().min(1).max(100000).optional(),
});
export type ChoiceOption = z.infer<typeof optionSchema>;

export const CONDITION_OPS = ["equals", "not_equals", "contains", "answered", "not_answered", "greater_than", "less_than"] as const;
export const conditionSchema = z.object({
  questionId: itemId,
  op: z.enum(CONDITION_OPS),
  value: z.string().max(300).optional(),
});
export type Condition = z.infer<typeof conditionSchema>;

export const quizKeySchema = z.object({
  points: z.number().min(0).max(1000),
  /** Option ids; accepted text answers; or "rowId:columnId" for grids. */
  correct: z.array(z.string().max(500)).max(200),
  feedbackCorrect: z.string().max(1000).optional(),
  feedbackIncorrect: z.string().max(1000).optional(),
});
export type QuizKey = z.infer<typeof quizKeySchema>;

export const TEXT_RULES = ["email", "url", "number", "integer", "between", "greater_than", "less_than", "min_length", "max_length", "contains", "not_contains", "pattern"] as const;
export const textValidationSchema = z.object({
  rule: z.enum(TEXT_RULES),
  value: z.string().max(300).optional(),
  value2: z.string().max(300).optional(),
  message: z.string().max(300).optional(),
});
export type TextValidation = z.infer<typeof textValidationSchema>;

export const PREFILL_FIELDS = ["full_name", "first_name", "last_name", "email", "phone"] as const;
export type PrefillField = (typeof PREFILL_FIELDS)[number];

const base = {
  kind: z.literal("question"),
  id: itemId,
  title: z.string().trim().min(1).max(1000),
  description: z.string().max(5000).optional(),
  required: z.boolean(),
  /** Shown only when every condition holds. */
  showIf: z.array(conditionSchema).max(10).optional(),
  quiz: quizKeySchema.optional(),
};
const choices = z.array(optionSchema).min(1).max(200);
const gridLine = z.object({ id: itemId, label: shortLabel });

export const questionSchema = z.discriminatedUnion("type", [
  z.object({ ...base, type: z.literal("short_text"), validation: textValidationSchema.optional(), prefill: z.enum(PREFILL_FIELDS).optional() }),
  z.object({ ...base, type: z.literal("long_text"), validation: textValidationSchema.optional() }),
  z.object({ ...base, type: z.literal("email"), prefill: z.boolean().optional() }),
  z.object({ ...base, type: z.literal("phone"), prefill: z.boolean().optional() }),
  z.object({ ...base, type: z.literal("number"), min: z.number().optional(), max: z.number().optional(), integer: z.boolean().optional() }),
  z.object({ ...base, type: z.literal("multiple_choice"), options: choices, other: z.boolean().optional(), shuffle: z.boolean().optional(), branching: z.boolean().optional() }),
  z.object({
    ...base,
    type: z.literal("checkboxes"),
    options: choices,
    other: z.boolean().optional(),
    shuffle: z.boolean().optional(),
    selection: z.object({ rule: z.enum(["at_least", "at_most", "exactly"]), count: z.number().int().min(1).max(200) }).optional(),
  }),
  z.object({ ...base, type: z.literal("dropdown"), options: choices, shuffle: z.boolean().optional(), branching: z.boolean().optional() }),
  z.object({
    ...base,
    type: z.literal("linear_scale"),
    min: z.union([z.literal(0), z.literal(1)]),
    max: z.number().int().min(2).max(10),
    minLabel: z.string().max(100).optional(),
    maxLabel: z.string().max(100).optional(),
  }),
  z.object({ ...base, type: z.literal("rating"), levels: z.number().int().min(3).max(10), icon: z.enum(["star", "heart", "thumb", "number"]) }),
  z.object({ ...base, type: z.literal("nps"), minLabel: z.string().max(100).optional(), maxLabel: z.string().max(100).optional() }),
  z.object({
    ...base,
    type: z.literal("grid_choice"),
    rows: z.array(gridLine).min(1).max(50),
    columns: z.array(gridLine).min(1).max(20),
    requireEachRow: z.boolean().optional(),
    oneColumnEach: z.boolean().optional(),
    shuffleRows: z.boolean().optional(),
    style: z.enum(["grid", "likert"]).optional(),
  }),
  z.object({
    ...base,
    type: z.literal("grid_checkbox"),
    rows: z.array(gridLine).min(1).max(50),
    columns: z.array(gridLine).min(1).max(20),
    requireEachRow: z.boolean().optional(),
    oneColumnEach: z.boolean().optional(),
    shuffleRows: z.boolean().optional(),
  }),
  z.object({ ...base, type: z.literal("ranking"), options: z.array(optionSchema).min(2).max(30) }),
  z.object({ ...base, type: z.literal("date"), includeYear: z.boolean(), includeTime: z.boolean() }),
  z.object({ ...base, type: z.literal("time"), duration: z.boolean().optional() }),
  z.object({
    ...base,
    type: z.literal("file_upload"),
    maxFiles: z.number().int().min(1).max(10),
    maxSizeMb: z.number().int().min(1).max(25),
    accept: z.array(z.enum(FILE_KINDS)).max(FILE_KINDS.length),
  }),
  z.object({ ...base, type: z.literal("signature") }),
  z.object({ ...base, type: z.literal("consent"), statement: z.string().trim().min(1).max(2000) }),
]);
export type Question = z.infer<typeof questionSchema>;
export type QuestionOf<T extends QuestionType> = Extract<Question, { type: T }>;

export const sectionSchema = z.object({
  kind: z.literal("section"),
  id: itemId,
  title: z.string().max(1000),
  description: z.string().max(5000).optional(),
  /** After this section: "next", "submit" or a section id. */
  next: z.string().max(40).optional(),
});
export const textBlockSchema = z.object({
  kind: z.literal("text"),
  id: itemId,
  title: z.string().max(1000),
  description: z.string().max(5000).optional(),
  showIf: z.array(conditionSchema).max(10).optional(),
});
export const imageBlockSchema = z.object({
  kind: z.literal("image"),
  id: itemId,
  title: z.string().max(1000).optional(),
  url: z.string().url().max(2000),
  alt: z.string().max(300).optional(),
  showIf: z.array(conditionSchema).max(10).optional(),
});
export const videoBlockSchema = z.object({
  kind: z.literal("video"),
  id: itemId,
  title: z.string().max(1000).optional(),
  url: z.string().url().max(2000),
  showIf: z.array(conditionSchema).max(10).optional(),
});

export const itemSchema = z.union([questionSchema, sectionSchema, textBlockSchema, imageBlockSchema, videoBlockSchema]);
export type SectionItem = z.infer<typeof sectionSchema>;
export type TextBlock = z.infer<typeof textBlockSchema>;
export type ImageBlock = z.infer<typeof imageBlockSchema>;
export type VideoBlock = z.infer<typeof videoBlockSchema>;
export type FormItem = z.infer<typeof itemSchema>;

export const settingsSchema = z.object({
  /** "verified": the signed-in member's own address. "input": asked for. */
  collectEmail: z.enum(["none", "verified", "input"]),
  requireSignIn: z.boolean(),
  limitOneResponse: z.boolean(),
  allowEdit: z.boolean(),
  receipts: z.enum(["never", "always", "requested"]),
  showProgressBar: z.boolean(),
  shuffleQuestions: z.boolean(),
  confirmationMessage: z.string().max(2000),
  showSubmitAnother: z.boolean(),
  showResultsSummary: z.boolean(),
  accepting: z.boolean(),
  closedMessage: z.string().max(2000),
  opensAt: z.string().max(40).nullable(),
  closesAt: z.string().max(40).nullable(),
  responseLimit: z.number().int().min(1).max(1000000).nullable(),
  quiz: z.object({
    enabled: z.boolean(),
    release: z.enum(["immediately", "manual"]),
    showMissed: z.boolean(),
    showCorrect: z.boolean(),
    showPoints: z.boolean(),
  }),
  notify: z.object({
    /** A bell notification to the church office (Admin and Executive Assistants). */
    office: z.boolean(),
    /** Staff who also get an email for every response. */
    emailProfileIds: z.array(z.string().uuid()).max(20),
  }),
  theme: z.object({
    accent: hexColor,
    background: hexColor,
    headerImage: z.string().url().max(2000).nullable(),
    font: z.enum(["serif", "sans", "rounded"]),
  }),
  /** Listed on members' Forms page in the member portal. */
  listInMemberPortal: z.boolean(),
  /** For a tablet in the foyer: starts over by itself after each response. */
  kiosk: z.boolean(),
  /** Answers are kept on the respondent's device until they submit. */
  autosave: z.boolean(),
  /** Where the first page leads ("next", "submit" or a section id). */
  startNext: z.string().max(40).optional(),
});
export type FormSettings = z.infer<typeof settingsSchema>;

export const DEFAULT_SETTINGS: FormSettings = {
  collectEmail: "none",
  requireSignIn: false,
  limitOneResponse: false,
  allowEdit: false,
  receipts: "never",
  showProgressBar: true,
  shuffleQuestions: false,
  confirmationMessage: "Thank you. Your response has been recorded.",
  showSubmitAnother: true,
  showResultsSummary: false,
  accepting: true,
  closedMessage: "This form is no longer accepting responses.",
  opensAt: null,
  closesAt: null,
  responseLimit: null,
  quiz: { enabled: false, release: "immediately", showMissed: true, showCorrect: true, showPoints: true },
  // Off unless chosen, as in Google and Microsoft Forms: a bell is also a
  // phone notification, too many for a big sign-up.
  notify: { office: false, emailProfileIds: [] },
  theme: { accent: "#173f89", background: "#f4efe6", headerImage: null, font: "serif" },
  listInMemberPortal: false,
  kiosk: false,
  autosave: true,
};

/** Fills in anything a saved form predates, so older forms keep working
 *  as settings are added. */
export function readSettings(raw: unknown): FormSettings {
  const value = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  const merged = {
    ...DEFAULT_SETTINGS,
    ...value,
    quiz: { ...DEFAULT_SETTINGS.quiz, ...(value.quiz as object | undefined) },
    notify: { ...DEFAULT_SETTINGS.notify, ...(value.notify as object | undefined) },
    theme: { ...DEFAULT_SETTINGS.theme, ...(value.theme as object | undefined) },
  };
  const parsed = settingsSchema.safeParse(merged);
  return parsed.success ? parsed.data : DEFAULT_SETTINGS;
}

export const definitionSchema = z.object({
  title: z.string().trim().min(1).max(300),
  description: z.string().max(10000),
  items: z.array(itemSchema).max(300),
  settings: settingsSchema,
});
export type FormDefinition = z.infer<typeof definitionSchema>;

export function isQuestion(item: FormItem): item is Question {
  return item.kind === "question";
}

/** What a respondent sends for each question type. */
export type FileAnswer = { path: string; name: string; size: number; type: string };
export type AnswerValue =
  | string
  | number
  | boolean
  | string[]
  | { other: string }
  | { ids: string[]; other?: string }
  | Record<string, string>
  | Record<string, string[]>
  | FileAnswer[]
  | { dataUrl: string };
export type Answers = Record<string, AnswerValue>;

/**
 * Checks what zod can't: ids unique across the whole form, branching that
 * points at real sections, conditions that refer to an earlier question,
 * and quiz answer keys that name real choices. Returns the problems in
 * plain words (empty when the form is sound).
 */
export function checkDefinition(definition: FormDefinition): string[] {
  const problems: string[] = [];
  const seen = new Set<string>();
  const sections = new Set(definition.items.filter((i) => i.kind === "section").map((i) => i.id));
  const earlierQuestions = new Map<string, Question>();
  const target = (where: string, goTo: string | undefined) => {
    if (goTo && goTo !== SUBMIT && goTo !== NEXT && !sections.has(goTo)) problems.push(`${where} goes to a section that no longer exists.`);
  };
  if (!definition.items.some(isQuestion)) problems.push("Add at least one question.");
  target("The first page", definition.settings.startNext);
  for (const item of definition.items) {
    if (seen.has(item.id)) problems.push(`Two items share the id "${item.id}".`);
    seen.add(item.id);
    const name = "title" in item && item.title ? `"${item.title.slice(0, 60)}"` : "An item";
    if (item.kind === "section") target(`Section ${name}`, item.next);
    if ("showIf" in item && item.showIf) {
      for (const condition of item.showIf) {
        const source = earlierQuestions.get(condition.questionId);
        if (!source) problems.push(`${name} depends on a question that isn't before it.`);
        else if (!["answered", "not_answered"].includes(condition.op) && !condition.value) problems.push(`${name} has a condition with no value.`);
      }
    }
    if (isQuestion(item)) {
      if ("options" in item) {
        const ids = new Set<string>();
        for (const option of item.options) {
          if (ids.has(option.id)) problems.push(`${name} has two choices with the same id.`);
          ids.add(option.id);
          if ("branching" in item && item.branching) target(`A choice in ${name}`, option.goTo);
        }
        if (item.quiz) {
          for (const key of item.quiz.correct) if (!ids.has(key)) problems.push(`${name}'s answer key names a choice that no longer exists.`);
          if (item.type === "ranking" && item.quiz.correct.length && item.quiz.correct.length !== item.options.length) problems.push(`${name}'s answer key must put every option in order.`);
        }
      }
      if ("rows" in item) {
        const rows = new Set(item.rows.map((r) => r.id));
        const columns = new Set(item.columns.map((c) => c.id));
        if (rows.size !== item.rows.length || columns.size !== item.columns.length) problems.push(`${name} has two rows or columns with the same id.`);
        if (item.quiz) {
          for (const key of item.quiz.correct) {
            const [row, column] = key.split(":");
            if (!row || !column || !rows.has(row) || !columns.has(column)) problems.push(`${name}'s answer key names a row or column that no longer exists.`);
          }
        }
      }
      if (item.type === "number" && item.min !== undefined && item.max !== undefined && item.min > item.max) problems.push(`${name}: the lowest number is above the highest.`);
      earlierQuestions.set(item.id, item);
    }
  }
  return problems;
}
