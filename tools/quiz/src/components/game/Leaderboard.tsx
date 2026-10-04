import { motion } from 'framer-motion';
import { Trophy } from 'lucide-react';
import { useGameStore } from '../../state/gameStore';
import { computeStandings } from '../../lib/game/scoring';
import { BrandDivider } from '../brand/BrandDivider';

export function Leaderboard() {
  const game = useGameStore((s) => s.game);
  if (!game) return null;
  const standings = computeStandings(game.teams, game.scores);

  return (
    <div className="game-safe-area tv-safe-area min-h-screen flex flex-col items-center justify-center text-center gap-8 pb-28">
      <p className="text-white/50 uppercase tracking-[0.35em] text-sm">Standings</p>
      <h1 className="font-display text-4xl sm:text-5xl font-black text-bb-gold-light">SCOREBOARD</h1>
      <div className="w-full max-w-sm">
        <BrandDivider />
      </div>

      <div className="w-full max-w-lg space-y-3">
        {standings.map((s, i) => (
          <motion.div
            key={s.team.id}
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.12 }}
            className={`flex items-center gap-4 rounded-2xl border px-5 py-4 ${
              s.rank === 1 ? 'border-bb-gold bg-bb-gold/10 shadow-glow-gold' : 'border-white/10 bg-white/5'
            }`}
          >
            <span className="font-display text-2xl font-black w-8 text-white/60">{s.rank}</span>
            {s.rank === 1 && <Trophy size={20} className="text-bb-gold-light -ml-2" />}
            <span className="h-3 w-3 rounded-full" style={{ backgroundColor: s.team.color }} />
            <span className="flex-1 text-left font-display text-lg font-bold">{s.team.name}</span>
            <span className="font-display text-2xl font-black">{s.score}</span>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
