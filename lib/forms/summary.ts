import { answerToText } from "./display";
import { isQuestion, type AnswerValue, type Answers, type FormItem, type Question } from "./schema";
import { choiceIds, filesOf, gridCells, otherText } from "./values";

// What the Responses → Summary charts show for each question, and the
// spreadsheet export. Both take the form as it is now; answers to choices
// that have since been removed are still counted, under their old label.

export type Count = { id: string; label: string; count: number };
export type QuestionSummary =
  | { kind: "choice"; answered: number; counts: Count[]; other: string[]; multi: boolean }
  | { kind: "scale"; answered: number; counts: { value: number; count: number }[]; average: number | null; nps?: { score: number; promoters: number; passives: number; detractors: number } }
  | { kind: "grid"; answered: number; rows: { id: string; label: string; counts: Count[] }[] }
  | { kind: "ranking"; answered: number; averages: { id: string; label: string; average: number }[] }
  | { kind: "number"; answered: number; values: number[]; average: number | null; min: number | null; max: number | null }
  | { kind: "text"; answered: number; values: string[] }
  | { kind: "files"; answered: number; files: number }
  | { kind: "count"; answered: number };

type ResponseLike = { answers: Answers; snapshot?: FormItem[] | null };

function labelFrom(responses: ResponseLike[], questionId: string, optionId: string): string | undefined {
  for (const r of responses) {
    const old = r.snapshot?.find((i) => i.id === questionId);
    if (old && isQuestion(old) && "options" in old) {
      const label = old.options.find((o) => o.id === optionId)?.label;
      if (label) return label;
    }
  }
  return undefined;
}

export function summarize(question: Question, responses: ResponseLike[]): QuestionSummary {
  const values = responses.map((r) => r.answers[question.id]).filter((v): v is AnswerValue => v !== undefined && v !== null);
  const answered = values.length;
  switch (question.type) {
    case "multiple_choice":
    case "dropdown":
    case "checkboxes": {
      const counts = new Map(question.options.map((o) => [o.id, { id: o.id, label: o.label, count: 0 }]));
      const other: string[] = [];
      const bump = (id: string) => {
        if (!counts.has(id)) counts.set(id, { id, label: labelFrom(responses, question.id, id) ?? "(removed choice)", count: 0 });
        counts.get(id)!.count++;
      };
      for (const v of values) {
        choiceIds(v).forEach(bump);
        const text = otherText(v);
        if (text) other.push(text);
      }
      const list = [...counts.values()];
      if (other.length) list.push({ id: "__other", label: "Other", count: other.length });
      return { kind: "choice", answered, counts: list, other, multi: question.type === "checkboxes" };
    }
    case "linear_scale":
    case "rating":
    case "nps": {
      const [low, high] = question.type === "linear_scale" ? [question.min, question.max] : question.type === "rating" ? [1, question.levels] : [0, 10];
      const numbers = values.filter((v): v is number => typeof v === "number");
      const counts = Array.from({ length: high - low + 1 }, (_, i) => ({ value: low + i, count: numbers.filter((n) => n === low + i).length }));
      const average = numbers.length ? numbers.reduce((a, b) => a + b, 0) / numbers.length : null;
      if (question.type !== "nps") return { kind: "scale", answered, counts, average };
      const promoters = numbers.filter((n) => n >= 9).length;
      const detractors = numbers.filter((n) => n <= 6).length;
      const passives = numbers.length - promoters - detractors;
      const score = numbers.length ? Math.round(((promoters - detractors) / numbers.length) * 100) : 0;
      return { kind: "scale", answered, counts, average, nps: { score, promoters, passives, detractors } };
    }
    case "grid_choice":
    case "grid_checkbox": {
      const rows = question.rows.map((row) => ({
        id: row.id,
        label: row.label,
        counts: question.columns.map((column) => ({
          id: column.id,
          label: column.label,
          count: values.filter((v) => {
            const cell = gridCells(v)[row.id];
            return Array.isArray(cell) ? cell.includes(column.id) : cell === column.id;
          }).length,
        })),
      }));
      return { kind: "grid", answered, rows };
    }
    case "ranking": {
      const averages = question.options.map((option) => {
        const positions = values.flatMap((v) => (Array.isArray(v) ? [(v as unknown[]).indexOf(option.id)] : [])).filter((i) => i >= 0);
        return { id: option.id, label: option.label, average: positions.length ? positions.reduce((a, b) => a + b + 1, 0) / positions.length : 0 };
      });
      return { kind: "ranking", answered, averages: averages.sort((a, b) => a.average - b.average) };
    }
    case "number": {
      const numbers = values.filter((v): v is number => typeof v === "number");
      return {
        kind: "number",
        answered,
        values: numbers,
        average: numbers.length ? numbers.reduce((a, b) => a + b, 0) / numbers.length : null,
        min: numbers.length ? Math.min(...numbers) : null,
        max: numbers.length ? Math.max(...numbers) : null,
      };
    }
    case "file_upload":
      return { kind: "files", answered, files: values.reduce<number>((n, v) => n + filesOf(v).length, 0) };
    case "signature":
    case "consent":
      return { kind: "count", answered };
    default:
      return { kind: "text", answered, values: values.map((v) => answerToText(question, v)).filter(Boolean) };
  }
}

// ---------------------------------------------------------------------------
// Spreadsheet export
// ---------------------------------------------------------------------------

export type ExportRow = {
  submittedAt: string;
  name: string | null;
  email: string | null;
  score: number | null;
  maxScore: number | null;
  answers: Answers;
};

/** A cell a spreadsheet can't mistake for a formula. */
function cell(value: string | number | null | undefined): string {
  let text = value === null || value === undefined ? "" : String(value);
  if (/^[=+\-@\t\r]/.test(text)) text = `'${text}`;
  return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

export function responsesCsv(items: FormItem[], rows: ExportRow[], options: { quiz: boolean; timeZone?: string }): string {
  const questions = items.filter(isQuestion);
  const header = ["Submitted", "Name", "Email", ...(options.quiz ? ["Score"] : [])];
  const columns: { title: string; value: (answers: Answers) => string }[] = [];
  for (const q of questions) {
    if (q.type === "grid_choice" || q.type === "grid_checkbox") {
      for (const row of q.rows) {
        columns.push({
          title: `${q.title} [${row.label}]`,
          value: (answers) => {
            const picked = gridCells(answers[q.id])[row.id];
            const label = (id: string) => q.columns.find((c) => c.id === id)?.label ?? id;
            return picked === undefined ? "" : Array.isArray(picked) ? picked.map(label).join(", ") : label(picked);
          },
        });
      }
    } else {
      columns.push({ title: q.title, value: (answers) => answerToText(q, answers[q.id]) });
    }
  }
  const lines = [[...header, ...columns.map((c) => c.title)].map(cell).join(",")];
  for (const row of rows) {
    const when = new Date(row.submittedAt).toLocaleString("en-JM", { timeZone: options.timeZone ?? "America/Jamaica", dateStyle: "medium", timeStyle: "short" });
    lines.push(
      [when, row.name ?? "", row.email ?? "", ...(options.quiz ? [row.score === null ? "" : `${row.score} / ${row.maxScore ?? 0}`] : []), ...columns.map((c) => c.value(row.answers))]
        .map(cell)
        .join(","),
    );
  }
  // The byte-order mark makes Excel read the file as UTF-8.
  return `﻿${lines.join("\r\n")}\r\n`;
}
