import { useEffect } from 'react';
import { motion } from 'framer-motion';
import { useGameStore } from '../../state/gameStore';
import { soundManager } from '../../lib/sound/soundManager';

export function TieAnnouncement() {
  const game = useGameStore((s) => s.game);

  useEffect(() => {
    soundManager.play('tie');
  }, []);

  if (!game) return null;
  const tiedTeams = game.teams.filter((t) => game.tiedTeamIds?.includes(t.id));

  return (
    <div className="min-h-screen flex flex-col items-center justify-center text-center gap-6 px-6">
      <motion.h1
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        className="font-display text-5xl sm:text-6xl font-black text-bb-gold-light"
      >
        WE HAVE A TIE!
      </motion.h1>
      <div className="flex flex-wrap items-center justify-center gap-4">
        {tiedTeams.map((t) => (
          <span key={t.id} className="rounded-full border px-5 py-2 font-display font-bold text-lg" style={{ borderColor: t.color, color: t.color }}>
            {t.name} — {game.scores[t.id] ?? 0}
          </span>
        ))}
      </div>
      {game.tieBreakerQueue.length > 0 ? (
        <p className="text-white/60 max-w-md">The tied teams will face off in sudden death — first correct answer wins the night.</p>
      ) : (
        <p className="text-white/60 max-w-md">There are no tie-breaker questions in this quiz — the game will end in a shared victory.</p>
      )}
    </div>
  );
}
