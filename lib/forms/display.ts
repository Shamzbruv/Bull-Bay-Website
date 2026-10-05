import { isQuestion, type AnswerValue, type FormItem, type Question } from "./schema";
import { choiceIds, filesOf, gridCells, otherText, signatureOf } from "./values";

// An answer as the words a person would write: option labels rather than
// ids, "Row: column" for grids, file names for uploads. Used for the
// spreadsheet export, emailed receipts and anywhere a response is read.

const optionLabel = (question: Question, id: string) => ("options" in question ? question.options.find((o) => o.id === id)?.label : undefined) ?? id;

export function formatDate(value: string, includeYear = true): string {
  const [datePart, timePart] = value.split("T");
  const bits = (datePart ?? "").split("-");
  const [y, m, d] = includeYear ? bits.map(Number) : [2000, ...bits.map(Number)];
  if (!y || !m || !d) return value;
  const date = new Date(Date.UTC(y, m - 1, d));
  const text = date.toLocaleDateString("en-JM", { timeZone: "UTC", day: "numeric", month: "long", ...(includeYear ? { year: "numeric" } : {}) });
  return timePart ? `${text}, ${formatTime(timePart)}` : text;
}

export function formatTime(value: string): string {
  const [h, m] = value.split(":").map(Number);
  if (h === undefined || m === undefined || Number.isNaN(h) || Number.isNaN(m)) return value;
  const hour = h % 12 === 0 ? 12 : h % 12;
  return `${hour}:${String(m).padStart(2, "0")} ${h < 12 ? "AM" : "PM"}`;
}

export function answerToText(question: Question, value: AnswerValue | undefined): string {
  if (value === undefined || value === null) return "";
  switch (question.type) {
    case "multiple_choice":
    case "dropdown":
    case "checkboxes": {
      const other = otherText(value);
      return [...choiceIds(value).map((id) => optionLabel(question, id)), ...(other ? [`Other: ${other}`] : [])].join(", ");
    }
    case "grid_choice":
    case "grid_checkbox": {
      const cells = gridCells(value);
      const column = (id: string) => question.columns.find((c) => c.id === id)?.label ?? id;
      return question.rows
        .filter((row) => cells[row.id] !== undefined)
        .map((row) => {
          const cell = cells[row.id]!;
          return `${row.label}: ${Array.isArray(cell) ? cell.map(column).join(", ") : column(cell)}`;
        })
        .join("; ");
    }
    case "ranking":
      return Array.isArray(value) ? value.map((id, i) => `${i + 1}. ${optionLabel(question, String(id))}`).join(", ") : "";
    case "file_upload":
      return filesOf(value).map((f) => f.name).join(", ");
    case "signature":
      return signatureOf(value) ? "Signed" : "";
    case "consent":
      return value === true ? `Agreed: ${question.statement}` : "";
    case "date":
      return typeof value === "string" ? formatDate(value, question.includeYear) : "";
    case "time":
      return typeof value === "string" ? (question.duration ? value : formatTime(value)) : "";
    case "rating":
      return typeof value === "number" ? `${value} of ${question.levels}` : "";
    case "linear_scale":
      return typeof value === "number" ? `${value} (${question.min}–${question.max})` : "";
    case "nps":
      return typeof value === "number" ? `${value} of 10` : "";
    default:
      return typeof value === "string" || typeof value === "number" ? String(value) : "";
  }
}

/** "Question: answer" lines for a receipt or a plain-text view. */
export function responseAsLines(items: FormItem[], answers: Record<string, AnswerValue>): string[] {
  return items.filter(isQuestion).flatMap((q) => {
    const text = answerToText(q, answers[q.id]);
    return text ? [`${q.title}: ${text}`] : [];
  });
}
