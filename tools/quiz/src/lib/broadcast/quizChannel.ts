import type { GameState } from '../../types/game';

const CHANNEL_NAME = 'bbntcog-quiz';

export type QuizChannelMessage =
  | { type: 'STATE_SYNC'; payload: PresenterGameState }
  | { type: 'BUZZ_ATTEMPT'; payload: { teamId: string; timestamp: number } }
  | { type: 'PRESENTER_READY' }
  | { type: 'DISPLAY_SCALE'; payload: { scale: number } }
  | { type: 'HOST_PING' };

/**
 * What the presenter window is allowed to see. Deliberately omits
 * `correctAnswer`/`explanation` for the current question until the host's
 * reveal action fires (spec §17) — the audience must never get the answer
 * early just because the host's tab knows it.
 */
export interface PresenterGameState extends Omit<GameState, 'quiz'> {
  quiz: {
    id: string;
    title: string;
  };
  currentQuestion: PresenterQuestionView | null;
}

export interface PresenterQuestionView {
  id: string;
  round?: string;
  questionNumber: number;
  totalQuestions: number;
  type: GameState['quiz']['questions'][number]['type'];
  question: string;
  options?: GameState['quiz']['questions'][number]['options'];
  difficulty: GameState['quiz']['questions'][number]['difficulty'];
  points: number;
  timeLimit?: number;
  // Only populated once phase === 'reveal' or later.
  correctAnswer?: string;
  explanation?: string;
  scriptureReference?: string;
}

type Listener = (message: QuizChannelMessage) => void;

class QuizChannel {
  private channel: BroadcastChannel | null = null;
  private listeners = new Set<Listener>();

  private ensure(): BroadcastChannel | null {
    if (typeof window === 'undefined' || typeof BroadcastChannel === 'undefined') return null;
    if (!this.channel) {
      this.channel = new BroadcastChannel(CHANNEL_NAME);
      this.channel.onmessage = (event: MessageEvent<QuizChannelMessage>) => {
        for (const listener of this.listeners) listener(event.data);
      };
    }
    return this.channel;
  }

  send(message: QuizChannelMessage) {
    this.ensure()?.postMessage(message);
  }

  subscribe(listener: Listener): () => void {
    this.ensure();
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  close() {
    this.channel?.close();
    this.channel = null;
    this.listeners.clear();
  }
}

export const quizChannel = new QuizChannel();

export function toPresenterState(state: GameState): PresenterGameState {
  const currentQuestionData = state.questionOrder[state.questionIndex]
    ? state.quiz.questions.find((q) => q.id === state.questionOrder[state.questionIndex])
    : undefined;

  const revealed = state.phase === 'reveal' || state.phase === 'scoring' || state.phase === 'leaderboard';

  const currentQuestion: PresenterQuestionView | null = currentQuestionData
    ? {
        id: currentQuestionData.id,
        round: currentQuestionData.round,
        questionNumber: state.questionIndex + 1,
        totalQuestions: state.questionOrder.length,
        type: currentQuestionData.type,
        question: currentQuestionData.question,
        options: currentQuestionData.options,
        difficulty: currentQuestionData.difficulty,
        points: currentQuestionData.points,
        timeLimit: currentQuestionData.timeLimit,
        correctAnswer: revealed ? currentQuestionData.correctAnswer : undefined,
        explanation: revealed ? currentQuestionData.explanation : undefined,
        scriptureReference: revealed ? currentQuestionData.scriptureReference : undefined,
      }
    : null;

  return {
    ...state,
    quiz: { id: state.quiz.id, title: state.quiz.title },
    currentQuestion,
  };
}
