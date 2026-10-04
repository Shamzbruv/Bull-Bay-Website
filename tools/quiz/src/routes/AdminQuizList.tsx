import { useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Copy, PlusCircle, Trash2 } from 'lucide-react';
import { AppShell } from '../components/layout/AppShell';
import { RequireHostAuth } from '../components/admin/RequireHostAuth';
import { useQuizStore } from '../state/quizStore';
import type { Quiz, QuizStatus } from '../types/quiz';

function AdminQuizListInner() {
  const { quizzes, load, saveQuiz, deleteQuiz } = useQuizStore();
  const navigate = useNavigate();

  useEffect(() => {
    void load();
  }, [load]);

  async function duplicate(quiz: Quiz) {
    const now = new Date().toISOString();
    const copy: Quiz = {
      ...quiz,
      id: `${quiz.id}-copy-${Date.now().toString(36)}`,
      title: `${quiz.title} (Copy)`,
      status: 'draft',
      timesPlayed: 0,
      createdAt: now,
      updatedAt: now,
      questions: quiz.questions.map((q) => ({ ...q, id: `${q.id}-${Date.now().toString(36)}` })),
    };
    await saveQuiz(copy);
  }

  async function setStatus(quiz: Quiz, status: QuizStatus) {
    await saveQuiz({ ...quiz, status });
  }

  async function remove(quiz: Quiz) {
    if (confirm(`Delete "${quiz.title}"? This can't be undone.`)) {
      await deleteQuiz(quiz.id);
    }
  }

  return (
    <AppShell theme="light">
      <div className="game-safe-area tv-safe-area max-w-4xl mx-auto text-bb-navy pb-24">
        <Link to="/admin" className="inline-flex items-center gap-2 text-bb-navy/60 hover:text-bb-navy mb-4">
          <ArrowLeft size={16} /> Admin
        </Link>
        <div className="flex items-center justify-between flex-wrap gap-3">
          <h1 className="font-display text-3xl font-black">Manage Quizzes</h1>
          <Link to="/admin/quizzes/new" className="flex items-center gap-2 rounded-full bg-bb-blue px-5 py-2.5 font-semibold text-white">
            <PlusCircle size={18} /> New Quiz
          </Link>
        </div>

        <div className="mt-6 space-y-3">
          {quizzes.map((quiz) => (
            <div key={quiz.id} className="rounded-2xl border border-bb-navy/10 bg-white/80 p-4 flex flex-wrap items-center gap-4">
              <div className="flex-1 min-w-[200px]">
                <div className="flex items-center gap-2">
                  <span className="font-display font-bold text-lg">{quiz.title}</span>
                  <StatusPill status={quiz.status} />
                </div>
                <p className="text-sm text-bb-navy/50">{quiz.questions.length} questions · played {quiz.timesPlayed}×</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <button onClick={() => navigate(`/admin/quizzes/${quiz.id}/edit`)} className="rounded-full bg-bb-blue/10 text-bb-blue px-4 py-1.5 text-sm font-semibold hover:bg-bb-blue/20">
                  Edit
                </button>
                <button onClick={() => duplicate(quiz)} className="rounded-full bg-bb-navy/5 px-3 py-1.5 text-sm font-semibold hover:bg-bb-navy/10 flex items-center gap-1.5">
                  <Copy size={14} /> Duplicate
                </button>
                {quiz.status !== 'archived' ? (
                  <button onClick={() => setStatus(quiz, 'archived')} className="rounded-full bg-bb-navy/5 px-3 py-1.5 text-sm font-semibold hover:bg-bb-navy/10">
                    Archive
                  </button>
                ) : (
                  <button onClick={() => setStatus(quiz, 'draft')} className="rounded-full bg-bb-navy/5 px-3 py-1.5 text-sm font-semibold hover:bg-bb-navy/10">
                    Restore
                  </button>
                )}
                <button onClick={() => remove(quiz)} className="rounded-full bg-bb-red/10 text-bb-red px-3 py-1.5 text-sm font-semibold hover:bg-bb-red/20 flex items-center gap-1.5">
                  <Trash2 size={14} /> Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </AppShell>
  );
}

function StatusPill({ status }: { status: QuizStatus }) {
  const color = status === 'published' ? 'text-bb-green bg-bb-green/10' : status === 'draft' ? 'text-bb-gold bg-bb-gold/10' : 'text-bb-navy/50 bg-bb-navy/5';
  return <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide ${color}`}>{status}</span>;
}

export function AdminQuizList() {
  return (
    <RequireHostAuth>
      <AdminQuizListInner />
    </RequireHostAuth>
  );
}
