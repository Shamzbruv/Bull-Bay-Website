import type { Quiz } from '../../types/quiz';
import type { GameHistoryEntry } from '../../types/game';
import type { DataAdapter } from './repository';
import { quiz1Kings1 } from '../../data/seed/1-kings-chapter-1';
import { quiz1Kings2 } from '../../data/seed/1-kings-chapter-2';

const BUILT_IN_QUIZZES = [quiz1Kings1, quiz1Kings2];

const QUIZZES_KEY = 'bbntcog-quizzes';
const HISTORY_KEY = 'bbntcog-game-history';

function readJson<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function writeJson<T>(key: string, value: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Storage full or unavailable (e.g. private browsing) — fail silently,
    // the in-memory state still works for the current session.
  }
}

function ensureSeeded(): Quiz[] {
  const existing = readJson<Quiz[] | null>(QUIZZES_KEY, null);
  if (!existing || existing.length === 0) {
    writeJson(QUIZZES_KEY, BUILT_IN_QUIZZES);
    return BUILT_IN_QUIZZES;
  }
  // A previously-seeded browser won't have newer built-ins yet (e.g. a quiz
  // added after they first opened the app) — top those up without touching
  // anything the host has already edited or played.
  const missing = BUILT_IN_QUIZZES.filter((q) => !existing.some((e) => e.id === q.id));
  if (missing.length > 0) {
    const merged = [...existing, ...missing];
    writeJson(QUIZZES_KEY, merged);
    return merged;
  }
  return existing;
}

export class LocalStorageAdapter implements DataAdapter {
  readonly kind = 'local' as const;

  async listQuizzes(): Promise<Quiz[]> {
    return ensureSeeded();
  }

  async getQuiz(id: string): Promise<Quiz | null> {
    const quizzes = ensureSeeded();
    return quizzes.find((q) => q.id === id) ?? null;
  }

  async saveQuiz(quiz: Quiz): Promise<Quiz> {
    const quizzes = ensureSeeded();
    const idx = quizzes.findIndex((q) => q.id === quiz.id);
    const updated = { ...quiz, updatedAt: new Date().toISOString() };
    if (idx >= 0) {
      quizzes[idx] = updated;
    } else {
      quizzes.push(updated);
    }
    writeJson(QUIZZES_KEY, quizzes);
    return updated;
  }

  async deleteQuiz(id: string): Promise<void> {
    const quizzes = ensureSeeded().filter((q) => q.id !== id);
    writeJson(QUIZZES_KEY, quizzes);
  }

  async incrementTimesPlayed(id: string): Promise<void> {
    const quizzes = ensureSeeded();
    const quiz = quizzes.find((q) => q.id === id);
    if (quiz) {
      quiz.timesPlayed += 1;
      writeJson(QUIZZES_KEY, quizzes);
    }
  }

  async listHistory(): Promise<GameHistoryEntry[]> {
    return readJson<GameHistoryEntry[]>(HISTORY_KEY, []);
  }

  async saveHistoryEntry(entry: GameHistoryEntry): Promise<GameHistoryEntry> {
    const history = readJson<GameHistoryEntry[]>(HISTORY_KEY, []);
    history.unshift(entry);
    writeJson(HISTORY_KEY, history);
    return entry;
  }
}
