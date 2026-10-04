import { Diamond, Star } from 'lucide-react';
import type { Difficulty } from '../../types/quiz';
import { DIFFICULTY_LABEL } from '../../types/quiz';

const DOTS: Record<Difficulty, number> = { easy: 1, medium: 2, hard: 3, expert: 0 };
const COLOR: Record<Difficulty, string> = { easy: '#00BF3E', medium: '#00B5E2', hard: '#D4AF37', expert: '#E62323' };

export function DifficultyBadge({ difficulty, points }: { difficulty: Difficulty; points: number }) {
  const color = COLOR[difficulty];
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-wide" style={{ borderColor: `${color}55`, color }}>
      {difficulty === 'expert' ? (
        <Star size={12} fill={color} />
      ) : (
        Array.from({ length: DOTS[difficulty] }).map((_, i) => <Diamond key={i} size={10} fill={color} />)
      )}
      {DIFFICULTY_LABEL[difficulty]} · {points} pt{points === 1 ? '' : 's'}
    </span>
  );
}
