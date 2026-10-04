import { useEffect } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Play } from 'lucide-react';
import { AppShell } from '../components/layout/AppShell';
import { DifficultyBadge } from '../components/game/DifficultyBadge';
import { useQuizStore } from '../state/quizStore';
import { summarizeDifficulty } from '../types/quiz';

export function QuizDetail() {
  const { quizId } = useParams();
  const navigate = useNavigate();
  const { load, getQuiz, loaded } = useQuizStore();

  useEffect(() => {
    void load();
  }, [load]);

  const quiz = quizId ? getQuiz(quizId) : undefined;

  if (!loaded) {
    return (
      <AppShell>
        <div className="game-safe-area tv-safe-area">Loading…</div>
      </AppShell>
    );
  }

  if (!quiz) {
    return (
      <AppShell>
        <div className="game-safe-area tv-safe-area text-center py-20">
          <p className="text-white/60">Quiz not found.</p>
          <Link to="/quizzes" className="text-bb-cyan underline mt-2 inline-block">
            Back to Quiz Library
          </Link>
        </div>
      </AppShell>
    );
  }

  const breakdown = summarizeDifficulty(quiz.questions);

  return (
    <AppShell>
      <div className="game-safe-area tv-safe-area pb-24 max-w-3xl mx-auto">
        <Link to="/quizzes" className="inline-flex items-center gap-2 text-white/60 hover:text-white mb-6">
          <ArrowLeft size={16} /> Quiz Library
        </Link>

        <h1 className="font-display text-4xl font-black">{quiz.title}</h1>
        {quiz.scripture && <p className="text-bb-cyan mt-1">{quiz.scripture}</p>}
        {quiz.description && <p className="text-white/70 mt-4 leading-relaxed">{quiz.description}</p>}

        <div className="flex flex-wrap gap-3 mt-6">
          <Stat label="Questions" value={quiz.questions.length} />
          <Stat label="Easy" value={breakdown.easy} />
          <Stat label="Medium" value={breakdown.medium} />
          <Stat label="Hard" value={breakdown.hard} />
          <Stat label="Expert" value={breakdown.expert} />
          <Stat label="Tie-Breakers" value={breakdown.tieBreakers} />
          <Stat label="Times Played" value={quiz.timesPlayed} />
        </div>

        <button
          onClick={() => navigate('/play/setup', { state: { quizId: quiz.id } })}
          className="mt-8 flex items-center gap-2 rounded-full bg-gradient-to-r from-bb-blue to-bb-blue-light px-8 py-3 font-bold text-white shadow-glow-blue"
        >
          <Play size={18} className="fill-white" /> PLAY THIS QUIZ
        </button>

        <div className="mt-10 space-y-3">
          <h2 className="font-display text-xl font-bold">Questions</h2>
          {quiz.questions.map((q) => (
            <div key={q.id} className="rounded-xl border border-white/10 bg-white/5 p-4">
              <div className="flex items-center justify-between gap-3 mb-1">
                <span className="text-xs uppercase tracking-widest text-white/40">{q.round}</span>
                <DifficultyBadge difficulty={q.difficulty} points={q.points} />
              </div>
              <p className="font-medium">{q.question}</p>
            </div>
          ))}
        </div>
      </div>
    </AppShell>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-center">
      <div className="font-display text-xl font-black">{value}</div>
      <div className="text-[11px] uppercase tracking-widest text-white/50">{label}</div>
    </div>
  );
}
