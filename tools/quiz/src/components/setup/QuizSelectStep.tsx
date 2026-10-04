import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { PlusCircle, Search } from 'lucide-react';
import { useQuizStore } from '../../state/quizStore';
import { QuizCard } from '../quiz/QuizCard';

interface QuizSelectStepProps {
  selectedQuizId: string | null;
  onSelect: (quizId: string) => void;
}

export function QuizSelectStep({ selectedQuizId, onSelect }: QuizSelectStepProps) {
  const { quizzes, load, loading } = useQuizStore();
  const [search, setSearch] = useState('');

  useEffect(() => {
    void load();
  }, [load]);

  const visible = quizzes
    .filter((q) => q.status !== 'archived')
    .filter((q) => q.title.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="space-y-8">
      <div>
        <h2 className="font-display text-3xl font-bold text-center">Choose Tonight's Challenge</h2>
        <p className="text-center text-white/60 mt-2">Pick the quiz your teams will compete on.</p>
      </div>

      <div className="relative max-w-md mx-auto">
        <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search quizzes…"
          className="w-full rounded-full border border-white/15 bg-white/5 py-2.5 pl-11 pr-4 text-sm outline-none focus:border-bb-cyan/50"
        />
      </div>

      {loading && quizzes.length === 0 ? (
        <p className="text-center text-white/50">Loading quizzes…</p>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {visible.map((quiz) => (
            <QuizCard key={quiz.id} quiz={quiz} selected={quiz.id === selectedQuizId} onSelect={() => onSelect(quiz.id)} />
          ))}

          <Link
            to="/admin/quizzes/new"
            className="flex flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-white/20 p-5 text-white/60 hover:border-bb-cyan/50 hover:text-white transition min-h-[220px]"
          >
            <PlusCircle size={28} />
            <span className="font-semibold">Create New Quiz</span>
          </Link>
        </div>
      )}
    </div>
  );
}
