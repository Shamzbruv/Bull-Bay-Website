import { motion } from 'framer-motion';
import { useGameStore } from '../../state/gameStore';
import { ChurchLogo } from '../brand/ChurchLogo';
import { BrandDivider } from '../brand/BrandDivider';
import { GAME_MODE_LABEL } from '../../lib/game/gameModeLabels';

export function PreGameScreen() {
  const game = useGameStore((s) => s.game);
  if (!game) return null;
  const teams = [...game.teams].sort((a, b) => a.order - b.order);

  return (
    <div className="game-safe-area tv-safe-area min-h-screen flex flex-col items-center justify-center text-center gap-8 pb-28">
      <ChurchLogo size="lg" glow />
      <div>
        <p className="text-sm uppercase tracking-[0.35em] text-white/60">Tonight's Quiz</p>
        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="font-display text-5xl sm:text-6xl font-black text-bb-gold-light mt-2"
        >
          {game.quiz.title.toUpperCase()}
        </motion.h1>
        {game.quiz.scripture && <p className="text-white/60 mt-2">{game.quiz.scripture}</p>}
      </div>

      <div className="w-full max-w-md">
        <BrandDivider />
      </div>

      <div className="flex flex-wrap items-center justify-center gap-4 sm:gap-8">
        {teams.map((team, i) => (
          <div key={team.id} className="flex items-center gap-4 sm:gap-8">
            <div className="text-center">
              <div
                className="h-16 w-16 sm:h-20 sm:w-20 rounded-full mx-auto flex items-center justify-center font-display text-2xl font-black text-white shadow-xl"
                style={{ backgroundColor: team.color }}
              >
                {team.name.slice(0, 2).toUpperCase()}
              </div>
              <div className="font-display text-lg sm:text-xl font-bold mt-2">{team.name}</div>
            </div>
            {i < teams.length - 1 && <span className="font-display text-xl text-white/40">VS</span>}
          </div>
        ))}
      </div>

      <p className="text-white/50 text-sm max-w-md">
        {game.questionOrder.length} questions · {GAME_MODE_LABEL[game.settings.gameMode]} mode
      </p>
    </div>
  );
}
