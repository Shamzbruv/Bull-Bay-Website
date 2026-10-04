import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { PlusCircle, Search } from 'lucide-react';
import { AppShell } from '../components/layout/AppShell';
import { QuizCard } from '../components/quiz/QuizCard';
import { useQuizStore } from '../state/quizStore';

export function QuizLibrary() {
  const { quizzes, load, loading } = useQuizStore();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'published' | 'draft' | 'archived'>('all');
  const navigate = useNavigate();

  useEffect(() => {
    void load();
  }, [load]);

  const visible = quizzes.filter((q) => {
    if (statusFilter !== 'all' && q.status !== statusFilter) return false;
    return q.title.toLowerCase().includes(search.toLowerCase());
  });

  return (
    <AppShell>
      <div className="game-safe-area tv-safe-area pb-24">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="font-display text-4xl font-black">Quiz Library</h1>
            <p className="text-white/60 mt-1">Every quiz available for tonight's game.</p>
          </div>
          <Link to="/admin/quizzes/new" className="flex items-center gap-2 rounded-full bg-bb-blue px-5 py-2.5 font-semibold text-white shadow-glow-blue">
            <PlusCircle size={18} /> Create New Quiz
          </Link>
        </div>

        <div className="flex flex-wrap items-center gap-3 mb-8">
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search quizzes…"
              className="w-full rounded-full border border-white/15 bg-white/5 py-2.5 pl-11 pr-4 text-sm outline-none focus:border-bb-cyan/50"
            />
          </div>
          <div className="flex gap-2">
            {(['all', 'published', 'draft', 'archived'] as const).map((s) => (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className={`rounded-full px-4 py-2 text-xs font-semibold uppercase tracking-wide border ${
                  statusFilter === s ? 'border-bb-gold bg-bb-gold/15 text-bb-gold-light' : 'border-white/15 text-white/60 hover:border-bb-cyan/40'
                }`}
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        {loading && quizzes.length === 0 ? (
          <p className="text-white/50">Loading quizzes…</p>
        ) : visible.length === 0 ? (
          <p className="text-white/50">No quizzes match.</p>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {visible.map((quiz) => (
              <QuizCard
                key={quiz.id}
                quiz={quiz}
                onSelect={() => navigate(`/quizzes/${quiz.id}`)}
                footer={
                  <div className="flex gap-2 mt-4 pt-3 border-t border-white/10">
                    <span
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate('/play/setup', { state: { quizId: quiz.id } });
                      }}
                      className="flex-1 text-center rounded-full bg-bb-green/20 text-bb-green py-1.5 text-sm font-semibold hover:bg-bb-green/30"
                    >
                      PLAY
                    </span>
                    <span
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/admin/quizzes/${quiz.id}/edit`);
                      }}
                      className="flex-1 text-center rounded-full bg-white/10 py-1.5 text-sm font-semibold hover:bg-white/20"
                    >
                      EDIT
                    </span>
                  </div>
                }
              />
            ))}
          </div>
        )}
      </div>
    </AppShell>
  );
}
