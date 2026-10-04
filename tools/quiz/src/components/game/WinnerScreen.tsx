import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Trophy, RotateCcw, LayoutGrid, ListChecks } from 'lucide-react';
import { useGameStore } from '../../state/gameStore';
import { computeStandings } from '../../lib/game/scoring';
import { ChurchLogo } from '../brand/ChurchLogo';
import { BrandDivider } from '../brand/BrandDivider';
import { Confetti } from './Confetti';
import { AnimatedCounter } from './AnimatedCounter';
import { brand } from '../../config/brand';
import { soundManager } from '../../lib/sound/soundManager';

export function WinnerScreen() {
  const game = useGameStore((s) => s.game);
  const clearGame = useGameStore((s) => s.clearGame);
  const navigate = useNavigate();
  const [revealed, setRevealed] = useState(false);

  useEffect(() => {
    soundManager.play('winner');
    const t = window.setTimeout(() => setRevealed(true), 1600);
    return () => window.clearTimeout(t);
  }, []);

  if (!game) return null;
  const standings = computeStandings(game.teams, game.scores);
  const winner = game.winnerTeamId ? game.teams.find((t) => t.id === game.winnerTeamId) : undefined;
  const coWinners = !winner && game.tiedTeamIds ? game.teams.filter((t) => game.tiedTeamIds?.includes(t.id)) : [];

  function playAgain() {
    clearGame();
    navigate('/play/setup');
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center text-center gap-6 px-6 py-16 relative overflow-hidden">
      {revealed && <Confetti />}
      <ChurchLogo size="lg" glow />

      {!revealed ? (
        <motion.h1 initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="font-display text-4xl sm:text-5xl font-black text-white/80">
          FINAL SCORES…
        </motion.h1>
      ) : (
        <>
          <p className="text-white/50 uppercase tracking-[0.4em] text-sm">Tonight's Winner</p>
          {winner ? (
            <motion.h1
              initial={{ opacity: 0, scale: 0.7 }}
              animate={{ opacity: 1, scale: 1 }}
              className="font-display text-5xl sm:text-7xl font-black bg-gradient-to-b from-bb-gold-light via-bb-gold to-bb-gold-light bg-clip-text text-transparent flex items-center gap-3"
            >
              <Trophy size={48} className="text-bb-gold-light" />
              {winner.name.toUpperCase()}
            </motion.h1>
          ) : (
            <motion.h1 initial={{ opacity: 0, scale: 0.7 }} animate={{ opacity: 1, scale: 1 }} className="font-display text-4xl sm:text-6xl font-black text-bb-gold-light">
              {coWinners.map((t) => t.name).join(' & ').toUpperCase()} — CO-CHAMPIONS
            </motion.h1>
          )}
          <p className="font-display text-2xl sm:text-3xl font-bold text-white/90">
            <AnimatedCounter value={winner ? (game.scores[winner.id] ?? 0) : (game.scores[coWinners[0]?.id] ?? 0)} /> POINTS
          </p>
          <p className="text-white/70 max-w-md">Congratulations!</p>

          <div className="w-full max-w-sm">
            <BrandDivider />
          </div>

          <div className="w-full max-w-md space-y-2">
            {standings.map((s) => (
              <div key={s.team.id} className="flex items-center justify-between rounded-xl border border-white/10 bg-white/5 px-4 py-2.5">
                <span className="flex items-center gap-2 text-left">
                  <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: s.team.color }} />
                  {s.team.name}
                </span>
                <span className="font-display font-bold">{s.score}</span>
              </div>
            ))}
          </div>

          <p className="text-white/50 text-sm mt-2">
            {brand.churchName}
            <br />
            {brand.productName} · {brand.tagline}
          </p>

          <div className="flex flex-wrap items-center justify-center gap-3 mt-4">
            <button
              onClick={playAgain}
              className="flex items-center gap-2 rounded-full bg-gradient-to-r from-bb-blue to-bb-blue-light px-6 py-3 font-bold text-white shadow-glow-blue"
            >
              <RotateCcw size={18} /> PLAY AGAIN
            </button>
            <button
              onClick={() => {
                clearGame();
                navigate('/quizzes');
              }}
              className="flex items-center gap-2 rounded-full border border-white/20 px-6 py-3 font-semibold text-white/90 hover:bg-white/10"
            >
              <LayoutGrid size={18} /> NEW QUIZ
            </button>
            <button
              onClick={() => navigate('/history')}
              className="flex items-center gap-2 rounded-full border border-white/20 px-6 py-3 font-semibold text-white/90 hover:bg-white/10"
            >
              <ListChecks size={18} /> VIEW RESULTS
            </button>
          </div>
        </>
      )}
    </div>
  );
}
