import { motion } from 'framer-motion';
import type { Team } from '../../types/game';

export function BuzzerIndicator({ team }: { team: Team }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.85 }}
      animate={{ opacity: 1, scale: 1 }}
      className="relative flex flex-col items-center gap-2 py-4"
    >
      <motion.div
        className="absolute h-28 w-28 rounded-full"
        style={{ backgroundColor: team.color, opacity: 0.25 }}
        animate={{ scale: [1, 1.6], opacity: [0.35, 0] }}
        transition={{ duration: 1.2, repeat: Infinity }}
      />
      <div
        className="relative h-20 w-20 rounded-full flex items-center justify-center font-display text-2xl font-black text-white shadow-2xl"
        style={{ backgroundColor: team.color }}
      >
        {team.name.slice(0, 2).toUpperCase()}
      </div>
      <div className="text-center">
        <div className="font-display text-xl sm:text-2xl font-bold uppercase tracking-wide">{team.name}</div>
        <div className="text-bb-gold-light font-semibold tracking-widest text-sm">BUZZED IN!</div>
      </div>
    </motion.div>
  );
}
