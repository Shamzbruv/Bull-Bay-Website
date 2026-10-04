import type { Quiz } from '../../types/quiz';
import type { GameHistoryEntry } from '../../types/game';

export interface QuizRepository {
  listQuizzes(): Promise<Quiz[]>;
  getQuiz(id: string): Promise<Quiz | null>;
  saveQuiz(quiz: Quiz): Promise<Quiz>;
  deleteQuiz(id: string): Promise<void>;
  incrementTimesPlayed(id: string): Promise<void>;
}

export interface GameHistoryRepository {
  listHistory(): Promise<GameHistoryEntry[]>;
  saveHistoryEntry(entry: GameHistoryEntry): Promise<GameHistoryEntry>;
}

export interface DataAdapter extends QuizRepository, GameHistoryRepository {
  readonly kind: 'local' | 'supabase';
}
