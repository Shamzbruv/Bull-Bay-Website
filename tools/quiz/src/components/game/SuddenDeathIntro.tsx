import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useGameStore } from '../../state/gameStore';
import { BrandRings } from '../brand/BrandRing';
import { soundManager } from '../../lib/sound/soundManager';

const SEQUENCE = ['SUDDEN DEATH', '3', '2', '1', 'GO!'] as const;

export function SuddenDeathIntro() {
  const game = useGameStore((s) => s.game);
  const continueFromSuddenDeathIntro = useGameStore((s) => s.continueFromSuddenDeathIntro);
  const [step, setStep] = useState(0);

  useEffect(() => {
    soundManager.play('round-transition');
  }, []);

  useEffect(() => {
    if (step >= SEQUENCE.length) {
      continueFromSuddenDeathIntro();
      return;
    }
    soundManager.play(step === SEQUENCE.length - 1 ? 'countdown-go' : 'countdown-tick');
    const t = window.setTimeout(() => setStep((s) => s + 1), step === 0 ? 1500 : 650);
    return () => window.clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  if (!game) return null;

  return (
    <div className="relative min-h-screen flex flex-col items-center justify-center text-center overflow-hidden">
      <BrandRings size={420} />
      <p className="relative z-10 text-white/50 uppercase tracking-[0.4em] text-sm mb-4">First correct answer wins the night</p>
      <AnimatePresence mode="wait">
        <motion.div
          key={step}
          initial={{ opacity: 0, scale: 1.5 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.6 }}
          transition={{ duration: 0.35 }}
          className="relative z-10 font-display text-5xl sm:text-7xl font-black text-bb-red"
        >
          {SEQUENCE[Math.min(step, SEQUENCE.length - 1)]}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
