export type QuestionType =
  | 'multiple_choice'
  | 'short_answer'
  | 'true_false'
  | 'who_am_i'
  | 'scripture_reference'
  | 'fill_blank'
  | 'tie_breaker';

export type Difficulty = 'easy' | 'medium' | 'hard' | 'expert';

export const DIFFICULTY_POINTS: Record<Difficulty, number> = {
  easy: 1,
  medium: 2,
  hard: 3,
  expert: 5,
};

export const DIFFICULTY_LABEL: Record<Difficulty, string> = {
  easy: 'Easy',
  medium: 'Medium',
  hard: 'Hard',
  expert: 'Expert',
};

export interface QuizOption {
  id: 'A' | 'B' | 'C' | 'D';
  text: string;
}

export interface QuizQuestion {
  id: string;
  quizId: string;
  round?: string;
  questionNumber: number;
  type: QuestionType;
  question: string;
  options?: QuizOption[];
  correctAnswer: string;
  explanation: string;
  scriptureReference?: string;
  difficulty: Difficulty;
  points: number;
  timeLimit?: number;
}

export type QuizStatus = 'draft' | 'published' | 'archived';

export interface Quiz {
  id: string;
  title: string;
  description?: string;
  scripture?: string;
  createdAt: string;
  updatedAt: string;
  status: QuizStatus;
  timesPlayed: number;
  questions: QuizQuestion[];
}

export interface QuizDifficultyBreakdown {
  easy: number;
  medium: number;
  hard: number;
  expert: number;
  tieBreakers: number;
}

export function summarizeDifficulty(questions: QuizQuestion[]): QuizDifficultyBreakdown {
  const summary: QuizDifficultyBreakdown = { easy: 0, medium: 0, hard: 0, expert: 0, tieBreakers: 0 };
  for (const q of questions) {
    if (q.type === 'tie_breaker') {
      summary.tieBreakers += 1;
      continue;
    }
    summary[q.difficulty] += 1;
  }
  return summary;
}

export interface QuizValidationIssue {
  questionNumber: number;
  message: string;
}

export function validateQuiz(quiz: Pick<Quiz, 'title' | 'questions'>): QuizValidationIssue[] {
  const issues: QuizValidationIssue[] = [];
  const seenQuestionText = new Set<string>();

  if (!quiz.title?.trim()) {
    issues.push({ questionNumber: 0, message: 'Quiz is missing a title.' });
  }

  quiz.questions.forEach((q) => {
    const n = q.questionNumber;
    if (!q.question?.trim()) {
      issues.push({ questionNumber: n, message: `Question ${n} is missing its question text.` });
    }
    if (!q.correctAnswer?.trim()) {
      issues.push({ questionNumber: n, message: `Question ${n} is missing an answer.` });
    }
    if (!q.explanation?.trim()) {
      issues.push({ questionNumber: n, message: `Question ${n} has no explanation.` });
    }
    if (q.type === 'multiple_choice') {
      const optionCount = q.options?.length ?? 0;
      if (optionCount < 4) {
        issues.push({
          questionNumber: n,
          message: `Question ${n} has multiple-choice selected but only ${optionCount} option${optionCount === 1 ? '' : 's'}.`,
        });
      }
      if (q.options && !q.options.some((o) => o.id === q.correctAnswer)) {
        issues.push({ questionNumber: n, message: `Question ${n}'s correct answer doesn't match any of its options.` });
      }
    }
    const key = q.question?.trim().toLowerCase();
    if (key) {
      if (seenQuestionText.has(key)) {
        issues.push({ questionNumber: n, message: `Question ${n} appears to duplicate an earlier question.` });
      }
      seenQuestionText.add(key);
    }
  });

  return issues;
}
