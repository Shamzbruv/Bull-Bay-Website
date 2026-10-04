import type { ReactNode } from 'react';
import clsx from 'clsx';
import { BookOpen, Check, Layers } from 'lucide-react';
import type { Quiz } from '../../types/quiz';
import { summarizeDifficulty } from '../../types/quiz';
import { DiamondIcon } from '../brand/DiamondIcon';

interface QuizCardProps {
  quiz: Quiz;
  selected?: boolean;
  onSelect?: () => void;
  footer?: ReactNode;
}

export function QuizCard({ quiz, selected, onSelect, footer }: QuizCardProps) {
  const breakdown = summarizeDifficulty(quiz.questions);
  const types = new Set(quiz.questions.map((q) => q.type));

  return (
    <button
      type="button"
      onClick={onSelect}
      className={clsx(
        'text-left w-full rounded-2xl border p-5 transition backdrop-blur-xl relative overflow-hidden',
        selected ? 'border-bb-gold bg-bb-gold/10 shadow-glow-gold' : 'border-white/15 bg-white/5 hover:border-bb-cyan/40',
      )}
    >
      {selected && (
        <span className="absolute top-3 right-3 h-6 w-6 rounded-full bg-bb-gold flex items-center justify-center">
          <Check size={14} className="text-bb-deep" />
        </span>
      )}
      <div className="flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-bb-cyan mb-2">
        <DiamondIcon size={12} /> Bible Quiz
        {quiz.status !== 'published' && (
          <span className="ml-auto rounded-full bg-white/10 px-2 py-0.5 text-[10px] text-white/70 normal-case tracking-normal">{quiz.status}</span>
        )}
      </div>
      <h3 className="font-display text-2xl font-bold">{quiz.title}</h3>
      {quiz.scripture && <p className="text-sm text-white/60 mt-1">{quiz.scripture}</p>}
      {quiz.description && <p className="text-sm text-white/70 mt-2 line-clamp-2">{quiz.description}</p>}

      <div className="flex items-center gap-4 mt-4 text-sm text-white/70">
        <span className="flex items-center gap-1.5">
          <Layers size={14} /> {quiz.questions.length} Questions
        </span>
        <span className="flex items-center gap-1.5">
          <BookOpen size={14} /> {types.size} Type{types.size === 1 ? '' : 's'}
        </span>
      </div>

      <div className="flex flex-wrap gap-1.5 mt-3">
        {breakdown.easy > 0 && <Badge label={`${breakdown.easy} Easy`} color="#00BF3E" />}
        {breakdown.medium > 0 && <Badge label={`${breakdown.medium} Medium`} color="#00B5E2" />}
        {breakdown.hard > 0 && <Badge label={`${breakdown.hard} Hard`} color="#D4AF37" />}
        {breakdown.expert > 0 && <Badge label={`${breakdown.expert} Expert`} color="#E62323" />}
        {breakdown.tieBreakers > 0 && <Badge label={`${breakdown.tieBreakers} Tie-Breakers`} color="#FFFFFF" />}
      </div>

      <div className="flex items-center justify-between mt-4 text-xs text-white/50">
        <span>Played {quiz.timesPlayed}×</span>
        <span>{new Date(quiz.createdAt).toLocaleDateString()}</span>
      </div>

      {footer}
    </button>
  );
}

function Badge({ label, color }: { label: string; color: string }) {
  return (
    <span className="rounded-full px-2.5 py-0.5 text-[11px] font-medium" style={{ backgroundColor: `${color}22`, color }}>
      {label}
    </span>
  );
}
