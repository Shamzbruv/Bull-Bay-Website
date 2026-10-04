import type { Difficulty, QuizQuestion } from '../../types/quiz';

/**
 * Shared question builders for seed quiz files — one factory per quiz so
 * each file gets its own id prefix without repeating the same boilerplate.
 * See 1-kings-chapter-1.ts / 1-kings-chapter-2.ts for usage.
 */
export function makeQuestionHelpers(quizId: string, idPrefix: string) {
  function mc(
    n: number,
    question: string,
    options: [string, string, string, string],
    correct: 'A' | 'B' | 'C' | 'D',
    explanation: string,
    scriptureReference: string,
    round = 'Round 1 — Multiple Choice',
  ): QuizQuestion {
    return {
      id: `${idPrefix}-q${n}`,
      quizId,
      round,
      questionNumber: n,
      type: 'multiple_choice',
      question,
      options: [
        { id: 'A', text: options[0] },
        { id: 'B', text: options[1] },
        { id: 'C', text: options[2] },
        { id: 'D', text: options[3] },
      ],
      correctAnswer: correct,
      explanation,
      scriptureReference,
      difficulty: 'easy',
      points: 1,
      timeLimit: 15,
    };
  }

  function sa(
    n: number,
    round: string,
    difficulty: Difficulty,
    points: number,
    question: string,
    correctAnswer: string,
    explanation: string,
    scriptureReference: string,
    timeLimit = 20,
  ): QuizQuestion {
    return {
      id: `${idPrefix}-q${n}`,
      quizId,
      round,
      questionNumber: n,
      type: 'short_answer',
      question,
      correctAnswer,
      explanation,
      scriptureReference,
      difficulty,
      points,
      timeLimit,
    };
  }

  function whoAmI(
    n: number,
    question: string,
    correctAnswer: string,
    explanation: string,
    scriptureReference: string,
    round = 'Round 7 — Who Am I?',
    difficulty: Difficulty = 'hard',
    points = 3,
  ): QuizQuestion {
    return {
      id: `${idPrefix}-q${n}`,
      quizId,
      round,
      questionNumber: n,
      type: 'who_am_i',
      question,
      correctAnswer,
      explanation,
      scriptureReference,
      difficulty,
      points,
      timeLimit: 20,
    };
  }

  function tieBreaker(
    n: number,
    scoredQuestionCount: number,
    question: string,
    correctAnswer: string,
    explanation: string,
    scriptureReference: string,
  ): QuizQuestion {
    return {
      id: `${idPrefix}-tb${n}`,
      quizId,
      round: 'Tie-Breakers',
      questionNumber: scoredQuestionCount + n,
      type: 'tie_breaker',
      question,
      correctAnswer,
      explanation,
      scriptureReference,
      difficulty: 'expert',
      points: 0,
      timeLimit: 20,
    };
  }

  return { mc, sa, whoAmI, tieBreaker };
}
