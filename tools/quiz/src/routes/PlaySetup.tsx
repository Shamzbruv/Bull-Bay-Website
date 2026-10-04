import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import { AppShell } from '../components/layout/AppShell';
import { TeamSetupStep } from '../components/setup/TeamSetupStep';
import { QuizSelectStep } from '../components/setup/QuizSelectStep';
import { SettingsStep } from '../components/setup/SettingsStep';
import { useQuizStore } from '../state/quizStore';
import { useGameStore } from '../state/gameStore';
import { DEFAULT_GAME_SETTINGS } from '../types/game';
import type { GameSettings, Team } from '../types/game';
import { brand } from '../config/brand';

const STEPS = ['Teams', 'Quiz', 'Settings'];

function initialTeams(): Team[] {
  return [
    { id: `team-0-${Math.random().toString(36).slice(2, 8)}`, name: 'Team 1', color: brand.teamColorPalette[0].value, order: 0 },
    { id: `team-1-${Math.random().toString(36).slice(2, 8)}`, name: 'Team 2', color: brand.teamColorPalette[1].value, order: 1 },
  ];
}

export function PlaySetup() {
  const navigate = useNavigate();
  const location = useLocation();
  const startNewGame = useGameStore((s) => s.startNewGame);
  const getQuiz = useQuizStore((s) => s.getQuiz);
  const preselectedQuizId = (location.state as { quizId?: string } | null)?.quizId ?? null;

  const [step, setStep] = useState(0);
  const [teams, setTeams] = useState<Team[]>(initialTeams());
  const [quizId, setQuizId] = useState<string | null>(preselectedQuizId);
  const [settings, setSettings] = useState<GameSettings>(DEFAULT_GAME_SETTINGS);

  const canAdvance = step === 0 ? teams.every((t) => t.name.trim().length > 0) : step === 1 ? Boolean(quizId) : true;

  function next() {
    if (step < STEPS.length - 1) {
      setStep(step + 1);
      return;
    }
    const quiz = quizId ? getQuiz(quizId) : undefined;
    if (!quiz) return;
    startNewGame(quiz, teams, settings);
    const game = useGameStore.getState().game;
    if (game) navigate(`/game/${game.id}`);
  }

  function back() {
    if (step === 0) {
      navigate('/');
      return;
    }
    setStep(step - 1);
  }

  return (
    <AppShell>
      <div className="game-safe-area tv-safe-area max-w-4xl mx-auto pb-24">
        <div className="flex items-center justify-center gap-3 mb-10">
          {STEPS.map((label, i) => (
            <div key={label} className="flex items-center gap-3">
              <div
                className={`h-9 w-9 rounded-full flex items-center justify-center text-sm font-bold border ${
                  i === step
                    ? 'border-bb-gold bg-bb-gold text-bb-deep'
                    : i < step
                      ? 'border-bb-green bg-bb-green/20 text-bb-green'
                      : 'border-white/20 text-white/50'
                }`}
              >
                {i + 1}
              </div>
              <span className={`text-sm hidden sm:inline ${i === step ? 'text-white font-semibold' : 'text-white/50'}`}>{label}</span>
              {i < STEPS.length - 1 && <div className="w-8 sm:w-16 h-px bg-white/15" />}
            </div>
          ))}
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, x: 24 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -24 }}
            transition={{ duration: 0.25 }}
          >
            {step === 0 && <TeamSetupStep teams={teams} onChange={setTeams} />}
            {step === 1 && <QuizSelectStep selectedQuizId={quizId} onSelect={setQuizId} />}
            {step === 2 && <SettingsStep settings={settings} onChange={setSettings} />}
          </motion.div>
        </AnimatePresence>

        <div className="flex items-center justify-between mt-12">
          <button onClick={back} className="flex items-center gap-2 text-white/70 hover:text-white transition px-4 py-2">
            <ArrowLeft size={18} /> Back
          </button>
          <motion.button
            whileHover={canAdvance ? { scale: 1.03 } : undefined}
            whileTap={canAdvance ? { scale: 0.97 } : undefined}
            disabled={!canAdvance}
            onClick={next}
            className="flex items-center gap-2 rounded-full bg-gradient-to-r from-bb-blue to-bb-blue-light px-8 py-3 font-bold text-white shadow-glow-blue disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {step === STEPS.length - 1 ? 'Review & Begin' : 'Next'} <ArrowRight size={18} />
          </motion.button>
        </div>
      </div>
    </AppShell>
  );
}
