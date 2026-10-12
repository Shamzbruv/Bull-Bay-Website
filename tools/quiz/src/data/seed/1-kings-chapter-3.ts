import type { Quiz } from "../../types/quiz";
import { KINGS_THREE } from "../../lib/feud/questions";
/** The original 12 Family Feud boards, restructured as host-graded short-answer quiz questions. */
export const quiz1Kings3: Quiz = {
  id: "1-kings-chapter-3",
  title: "1 Kings Chapter 3",
  description:
    "Solomon’s request for wisdom and his judgment between two mothers. The original 12 Family Feud questions, now a regular short-answer quiz. Give every fact requested; the Quizmaster judges and reveals the answer.",
  scripture: "1 Kings 3",
  createdAt: "2026-10-12T00:00:00.000Z",
  updatedAt: "2026-10-12T00:00:00.000Z",
  status: "published",
  timesPlayed: 0,
  questions: KINGS_THREE.map((board, index) => ({
    id: `1kings3-q${index + 1}`,
    quizId: "1-kings-chapter-3",
    questionNumber: index + 1,
    round: index < 8 ? "Solomon’s wisdom" : "Solomon’s judgment",
    type: "short_answer",
    question: board.prompt,
    correctAnswer: board.answers.map((a) => a.text).join("; "),
    explanation:
      `Give all ${board.answers.length} requested facts. ` +
      board.answers
        .map(
          (a) =>
            `${a.text} (${a.reference})${a.accept ? ` — also accept: ${a.accept}` : ""}.`,
        )
        .join(" "),
    scriptureReference: [
      ...new Set(board.answers.map((a) => a.reference)),
    ].join("; "),
    difficulty: "medium",
    points: 2,
    timeLimit: 45,
  })),
};
