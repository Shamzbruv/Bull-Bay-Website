import { isQuestion, type AnswerValue, type Answers, type FormItem, type Question } from "./schema";
import { choiceIds, gridCells, otherText } from "./values";

// Quiz grading. Choice questions, short answers, numbers, grids and
// rankings with an answer key are marked automatically; anything else
// worth points (a paragraph, an upload) waits for the office to mark it,
// and a mark given by hand always wins over the automatic one.

export type QuestionGrade = {
  points: number;
  max: number;
  /** null: needs marking by hand. */
  correct: boolean | null;
};

export type ManualGrades = Record<string, { points?: number; feedback?: string }>;

export type Grade = { score: number; maxScore: number; questions: Record<string, QuestionGrade>; needsMarking: boolean };

const norm = (s: string) => s.trim().replace(/\s+/g, " ").toLowerCase();

function autoCorrect(question: Question, value: AnswerValue | undefined): boolean | null {
  const key = question.quiz;
  if (!key || !key.correct.length) return null;
  if (value === undefined) return false;
  switch (question.type) {
    case "multiple_choice":
    case "dropdown":
      return typeof value === "string" && key.correct.includes(value);
    case "checkboxes": {
      if (otherText(value)) return false;
      const chosen = new Set(choiceIds(value));
      return chosen.size === key.correct.length && key.correct.every((id) => chosen.has(id));
    }
    case "short_text":
      return typeof value === "string" && key.correct.some((accepted) => norm(accepted) === norm(value));
    case "number":
      return typeof value === "number" && key.correct.some((accepted) => Number(accepted) === value);
    case "linear_scale":
    case "rating":
    case "nps":
      return typeof value === "number" && key.correct.some((accepted) => Number(accepted) === value);
    case "grid_choice": {
      const cells = gridCells(value);
      return key.correct.every((pair) => {
        const [row, column] = pair.split(":");
        return row !== undefined && cells[row] === column;
      });
    }
    case "ranking":
      return Array.isArray(value) && value.length === key.correct.length && value.every((id, i) => id === key.correct[i]);
    default:
      return null;
  }
}

export function gradeResponse(items: FormItem[], answers: Answers, manual: ManualGrades = {}): Grade {
  const questions: Record<string, QuestionGrade> = {};
  let score = 0;
  let maxScore = 0;
  let needsMarking = false;
  for (const item of items) {
    if (!isQuestion(item) || !item.quiz || item.quiz.points <= 0) continue;
    const max = item.quiz.points;
    const given = manual[item.id]?.points;
    const auto = autoCorrect(item, answers[item.id]);
    let points: number;
    let correct: boolean | null;
    if (typeof given === "number" && Number.isFinite(given)) {
      points = Math.max(0, Math.min(max, given));
      correct = points >= max;
    } else if (auto === null) {
      // Unanswered needs no marking: it scores nothing.
      points = 0;
      correct = answers[item.id] === undefined ? false : null;
      if (correct === null) needsMarking = true;
    } else {
      points = auto ? max : 0;
      correct = auto;
    }
    questions[item.id] = { points, max, correct };
    score += points;
    maxScore += max;
  }
  return { score, maxScore, questions, needsMarking };
}
