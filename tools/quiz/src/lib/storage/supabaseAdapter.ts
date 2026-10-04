import type { Quiz, QuizQuestion } from '../../types/quiz';
import type { GameHistoryEntry } from '../../types/game';
import type { DataAdapter } from './repository';
import { supabase } from './supabaseClient';

/**
 * Typed CRUD against the schema in supabase/migrations. Selected automatically
 * by getDataAdapter() when VITE_SUPABASE_URL/VITE_SUPABASE_ANON_KEY are set —
 * see src/lib/storage/index.ts. Written against the schema but not yet
 * exercised against a live project; the localStorage adapter is the default.
 */
export class SupabaseAdapter implements DataAdapter {
  readonly kind = 'supabase' as const;

  private client() {
    if (!supabase) throw new Error('Supabase is not configured.');
    return supabase;
  }

  async listQuizzes(): Promise<Quiz[]> {
    const db = this.client();
    const { data: quizRows, error: quizError } = await db.from('quizzes').select('*').order('created_at', { ascending: true });
    if (quizError) throw quizError;
    const { data: questionRows, error: questionError } = await db.from('questions').select('*');
    if (questionError) throw questionError;

    return (quizRows ?? []).map((row) => rowToQuiz(row, (questionRows ?? []).filter((q) => q.quiz_id === row.id)));
  }

  async getQuiz(id: string): Promise<Quiz | null> {
    const db = this.client();
    const { data: quizRow, error: quizError } = await db.from('quizzes').select('*').eq('id', id).maybeSingle();
    if (quizError) throw quizError;
    if (!quizRow) return null;
    const { data: questionRows, error: questionError } = await db
      .from('questions')
      .select('*')
      .eq('quiz_id', id)
      .order('question_number', { ascending: true });
    if (questionError) throw questionError;
    return rowToQuiz(quizRow, questionRows ?? []);
  }

  async saveQuiz(quiz: Quiz): Promise<Quiz> {
    const db = this.client();
    const now = new Date().toISOString();
    const { error: upsertQuizError } = await db.from('quizzes').upsert({
      id: quiz.id,
      title: quiz.title,
      description: quiz.description ?? null,
      scripture: quiz.scripture ?? null,
      status: quiz.status,
      updated_at: now,
    });
    if (upsertQuizError) throw upsertQuizError;

    await db.from('questions').delete().eq('quiz_id', quiz.id);
    if (quiz.questions.length > 0) {
      const { error: insertError } = await db.from('questions').insert(quiz.questions.map((q) => questionToRow(q)));
      if (insertError) throw insertError;
    }

    return { ...quiz, updatedAt: now };
  }

  async deleteQuiz(id: string): Promise<void> {
    const db = this.client();
    const { error } = await db.from('quizzes').delete().eq('id', id);
    if (error) throw error;
  }

  async incrementTimesPlayed(id: string): Promise<void> {
    const db = this.client();
    const { error } = await db.rpc('increment_quiz_times_played', { quiz_id: id });
    if (error) {
      // Fallback if the RPC helper hasn't been created in this project yet.
      const quiz = await this.getQuiz(id);
      if (!quiz) return;
      await db.from('quizzes').update({ times_played: quiz.timesPlayed + 1 }).eq('id', id);
    }
  }

  async listHistory(): Promise<GameHistoryEntry[]> {
    const db = this.client();
    const { data, error } = await db.from('game_sessions').select('*').order('completed_at', { ascending: false });
    if (error) throw error;
    return (data ?? []).map(rowToHistoryEntry);
  }

  async saveHistoryEntry(entry: GameHistoryEntry): Promise<GameHistoryEntry> {
    const db = this.client();
    const { error } = await db.from('game_sessions').insert({
      id: entry.id,
      quiz_id: entry.quizId,
      started_at: entry.startedAt,
      completed_at: entry.completedAt,
      game_mode: entry.gameMode,
      winner_name: entry.winnerName ?? null,
      final_scores: entry.teams,
      question_count: entry.questionCount,
    });
    if (error) throw error;
    return entry;
  }
}

function rowToQuiz(row: Record<string, unknown>, questionRows: Record<string, unknown>[]): Quiz {
  return {
    id: row.id as string,
    title: row.title as string,
    description: (row.description as string | null) ?? undefined,
    scripture: (row.scripture as string | null) ?? undefined,
    status: row.status as Quiz['status'],
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
    timesPlayed: (row.times_played as number | null) ?? 0,
    questions: questionRows.map(rowToQuestion),
  };
}

function rowToQuestion(row: Record<string, unknown>): QuizQuestion {
  return {
    id: row.id as string,
    quizId: row.quiz_id as string,
    round: (row.round_name as string | null) ?? undefined,
    questionNumber: row.question_number as number,
    type: row.question_type as QuizQuestion['type'],
    question: row.question as string,
    options: (row.options as QuizQuestion['options']) ?? undefined,
    correctAnswer: row.correct_answer as string,
    explanation: row.explanation as string,
    scriptureReference: (row.scripture_reference as string | null) ?? undefined,
    difficulty: row.difficulty as QuizQuestion['difficulty'],
    points: row.points as number,
    timeLimit: (row.time_limit as number | null) ?? undefined,
  };
}

function questionToRow(q: QuizQuestion) {
  return {
    id: q.id,
    quiz_id: q.quizId,
    round_name: q.round ?? null,
    question_number: q.questionNumber,
    question_type: q.type,
    question: q.question,
    options: q.options ?? null,
    correct_answer: q.correctAnswer,
    explanation: q.explanation,
    scripture_reference: q.scriptureReference ?? null,
    difficulty: q.difficulty,
    points: q.points,
    time_limit: q.timeLimit ?? null,
  };
}

function rowToHistoryEntry(row: Record<string, unknown>): GameHistoryEntry {
  const teams = (row.final_scores as GameHistoryEntry['teams']) ?? [];
  return {
    id: row.id as string,
    quizId: row.quiz_id as string,
    quizTitle: (row.quiz_title as string | undefined) ?? '',
    teams,
    winnerName: (row.winner_name as string | null) ?? undefined,
    startedAt: row.started_at as string,
    completedAt: row.completed_at as string,
    questionCount: (row.question_count as number | null) ?? 0,
    gameMode: row.game_mode as GameHistoryEntry['gameMode'],
  };
}
