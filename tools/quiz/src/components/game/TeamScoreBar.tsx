import { motion, AnimatePresence } from 'framer-motion';
import clsx from 'clsx';
import type { Team } from '../../types/game';

interface TeamScoreBarProps {
  teams: Team[];
  scores: Record<string, number>;
  highlightTeamId?: string;
  lastAwarded?: { teamId: string; points: number; correct: boolean };
}

export function TeamScoreBar({ teams, scores, highlightTeamId, lastAwarded }: TeamScoreBarProps) {
  const sorted = [...teams].sort((a, b) => a.order - b.order);

  return (
    <div className="grid gap-3" style={{ gridTemplateColumns: `repeat(${Math.min(sorted.length, 6)}, minmax(0, 1fr))` }}>
      {sorted.map((team) => {
        const active = team.id === highlightTeamId;
        const award = lastAwarded?.teamId === team.id ? lastAwarded : undefined;
        return (
          <motion.div
            key={team.id}
            animate={active ? { scale: [1, 1.04, 1] } : { scale: 1 }}
            transition={{ duration: 0.5 }}
            className={clsx(
              'relative rounded-2xl border px-3 py-2.5 sm:px-4 sm:py-3 text-center transition',
              active ? 'border-bb-gold shadow-glow-gold bg-white/10' : 'border-white/10 bg-white/5',
            )}
            style={active ? { boxShadow: `0 0 0 1px ${team.color}66, 0 0 30px ${team.color}33` } : undefined}
          >
            <div className="flex items-center justify-center gap-1.5 mb-0.5">
              <span className="h-2 w-2 rounded-full" style={{ backgroundColor: team.color }} />
              <div className="text-[11px] sm:text-xs font-semibold uppercase tracking-wide truncate text-white/80">{team.name}</div>
            </div>
            <div className="font-display text-2xl sm:text-3xl font-black text-white">{scores[team.id] ?? 0}</div>
            <div className="text-[10px] uppercase tracking-widest text-white/40">pts</div>

            <AnimatePresence>
              {award && (
                <motion.div
                  initial={{ opacity: 0, y: 0, scale: 0.8 }}
                  animate={{ opacity: 1, y: -18, scale: 1.1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.6 }}
                  className={clsx(
                    'absolute -top-3 right-2 font-display font-bold text-sm',
                    award.correct ? 'text-bb-green' : 'text-bb-red',
                  )}
                >
                  {award.correct ? '+' : award.points > 0 ? '-' : ''}
                  {award.points}
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        );
      })}
    </div>
  );
}
