import { create } from 'zustand';
import type { Quiz } from '../types/quiz';
import { getDataAdapter } from '../lib/storage';

interface QuizStore {
  quizzes: Quiz[];
  loading: boolean;
  loaded: boolean;

  load: (force?: boolean) => Promise<void>;
  saveQuiz: (quiz: Quiz) => Promise<Quiz>;
  deleteQuiz: (id: string) => Promise<void>;
  getQuiz: (id: string) => Quiz | undefined;
}

export const useQuizStore = create<QuizStore>((set, get) => ({
  quizzes: [],
  loading: false,
  loaded: false,

  load: async (force = false) => {
    if (get().loaded && !force) return;
    set({ loading: true });
    const quizzes = await getDataAdapter().listQuizzes();
    set({ quizzes, loading: false, loaded: true });
  },

  saveQuiz: async (quiz) => {
    const saved = await getDataAdapter().saveQuiz(quiz);
    set((s) => {
      const exists = s.quizzes.some((q) => q.id === saved.id);
      return { quizzes: exists ? s.quizzes.map((q) => (q.id === saved.id ? saved : q)) : [...s.quizzes, saved] };
    });
    return saved;
  },

  deleteQuiz: async (id) => {
    await getDataAdapter().deleteQuiz(id);
    set((s) => ({ quizzes: s.quizzes.filter((q) => q.id !== id) }));
  },

  getQuiz: (id) => get().quizzes.find((q) => q.id === id),
}));
