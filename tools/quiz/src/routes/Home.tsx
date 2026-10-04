import type { ReactNode } from 'react';
import { motion } from 'framer-motion';
import { Link, useNavigate } from 'react-router-dom';
import { Play, Library, PlusCircle, History as HistoryIcon, Settings as SettingsIcon } from 'lucide-react';
import { AppShell } from '../components/layout/AppShell';
import { ChurchLogo } from '../components/brand/ChurchLogo';
import { BrandDivider } from '../components/brand/BrandDivider';
import { brand } from '../config/brand';
import { useGameStore } from '../state/gameStore';

const PARTICLES = Array.from({ length: 24 }, (_, i) => i);

function ParticleField() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
      {PARTICLES.map((i) => {
        const left = (i * 37) % 100;
        const delay = (i % 8) * 0.6;
        const duration = 10 + (i % 5) * 3;
        const size = 2 + (i % 3);
        return (
          <motion.span
            key={i}
            className="absolute rounded-full bg-bb-gold/50"
            style={{ left: `${left}%`, width: size, height: size, bottom: -20 }}
            animate={{ y: ['0%', '-120vh'], opacity: [0, 0.8, 0] }}
            transition={{ duration, delay, repeat: Infinity, ease: 'linear' }}
          />
        );
      })}
    </div>
  );
}

export function Home() {
  const navigate = useNavigate();
  const activeGame = useGameStore((s) => s.game);
  const hasUnfinishedGame = activeGame && activeGame.phase !== 'finished';

  return (
    <AppShell>
      <div className="relative">
        <ParticleField />
        <div className="game-safe-area tv-safe-area flex flex-col items-center text-center gap-8 pt-10 pb-24">
          <p className="text-sm uppercase tracking-[0.35em] text-white/60">{brand.churchName}</p>

          <ChurchLogo size="xl" glow />

          <div>
            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="font-display text-6xl sm:text-7xl lg:text-8xl font-black tracking-tight bg-gradient-to-b from-bb-gold-light via-bb-gold to-bb-gold-light bg-clip-text text-transparent drop-shadow-[0_4px_30px_rgba(212,175,55,0.35)]"
            >
              QUIZ NIGHT
            </motion.h1>
            <p className="mt-3 text-lg sm:text-xl text-white/80 tracking-wide">{brand.tagline}</p>
          </div>

          <div className="w-full max-w-md">
            <BrandDivider />
          </div>

          {hasUnfinishedGame && (
            <button
              onClick={() => navigate(`/game/${activeGame.id}`)}
              className="rounded-2xl border border-bb-gold/50 bg-bb-gold/10 px-6 py-3 text-sm font-semibold text-bb-gold-light hover:bg-bb-gold/20 transition"
            >
              Resume tonight's game — {activeGame.quiz.title}
            </button>
          )}

          <motion.button
            whileHover={{ scale: 1.04 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => navigate('/play/setup')}
            className="group relative flex items-center gap-3 rounded-full bg-gradient-to-r from-bb-blue via-bb-blue-light to-bb-blue px-12 py-5 text-xl font-bold text-white shadow-glow-blue ring-2 ring-bb-gold/60"
          >
            <Play className="fill-white" />
            START GAME
          </motion.button>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 w-full max-w-2xl mt-4">
            <SecondaryAction to="/quizzes" icon={<Library size={20} />} label="Quiz Library" />
            <SecondaryAction to="/admin/quizzes/new" icon={<PlusCircle size={20} />} label="Create Quiz" />
            <SecondaryAction to="/history" icon={<HistoryIcon size={20} />} label="Game History" />
          </div>
          <SecondaryAction to="/settings" icon={<SettingsIcon size={18} />} label="Settings" subtle />
        </div>
      </div>
    </AppShell>
  );
}

function SecondaryAction({ to, icon, label, subtle }: { to: string; icon: ReactNode; label: string; subtle?: boolean }) {
  return (
    <Link
      to={to}
      className={
        subtle
          ? 'inline-flex items-center gap-2 text-sm text-white/60 hover:text-white transition'
          : 'flex items-center justify-center gap-2 rounded-2xl border border-white/15 bg-white/5 px-5 py-4 font-semibold text-white/90 hover:bg-white/10 hover:border-bb-cyan/40 transition backdrop-blur'
      }
    >
      {icon}
      {label}
    </Link>
  );
}
