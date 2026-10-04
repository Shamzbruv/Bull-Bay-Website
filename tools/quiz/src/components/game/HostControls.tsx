import { useState, type ReactNode } from 'react';
import { motion } from 'framer-motion';
import { ChevronUp, Pause, Play, RotateCcw, SkipForward, Flag, Settings2, Minus, Plus, ArrowLeft, Eye, Scale } from 'lucide-react';
import { useGameStore } from '../../state/gameStore';
import { getCurrentQuestion, isTurnBasedMode } from '../../lib/game/selectors';

export function HostControls() {
  const game = useGameStore((s) => s.game);
  const [toolsOpen, setToolsOpen] = useState(false);
  const [scoresOpen, setScoresOpen] = useState(false);
  const [balanceOpen, setBalanceOpen] = useState(false);

  const beginRoundIntro = useGameStore((s) => s.beginRoundIntro);
  const continueFromRoundIntro = useGameStore((s) => s.continueFromRoundIntro);
  const pauseTimer = useGameStore((s) => s.pauseTimer);
  const resumeTimer = useGameStore((s) => s.resumeTimer);
  const revealAnswer = useGameStore((s) => s.revealAnswer);
  const markCorrect = useGameStore((s) => s.markCorrect);
  const markIncorrect = useGameStore((s) => s.markIncorrect);
  const continueAfterReveal = useGameStore((s) => s.continueAfterReveal);
  const continueFromLeaderboard = useGameStore((s) => s.continueFromLeaderboard);
  const continueFromTieAnnouncement = useGameStore((s) => s.continueFromTieAnnouncement);
  const continueFromSuddenDeathIntro = useGameStore((s) => s.continueFromSuddenDeathIntro);
  const resetBuzzers = useGameStore((s) => s.resetBuzzers);
  const skipQuestion = useGameStore((s) => s.skipQuestion);
  const previousQuestion = useGameStore((s) => s.previousQuestion);
  const endGameNow = useGameStore((s) => s.endGameNow);
  const startBalancingEnd = useGameStore((s) => s.startBalancingEnd);
  const awardBonus = useGameStore((s) => s.awardBonus);
  const deductPoints = useGameStore((s) => s.deductPoints);

  if (!game || game.phase === 'finished') return null;

  const question = getCurrentQuestion(game);
  const isMultipleChoice = question?.type === 'multiple_choice';
  const pendingGrade = game.phase === 'reveal' && !game.lastAwardedPoints && Boolean(game.buzzedTeamId ?? game.activeTeamId);

  function primaryAction() {
    switch (game!.phase) {
      case 'intro':
        return { label: 'BEGIN QUIZ', onClick: () => beginRoundIntro() };
      case 'round_intro':
        return { label: 'START QUESTION', onClick: () => continueFromRoundIntro() };
      case 'question':
        return {
          label: game!.timerRunning ? 'PAUSE TIMER' : 'RESUME TIMER',
          onClick: () => (game!.timerRunning ? pauseTimer() : resumeTimer()),
          icon: game!.timerRunning ? <Pause size={18} /> : <Play size={18} />,
        };
      case 'answering':
        return { label: 'WAITING FOR BUZZER…', onClick: undefined };
      case 'locked':
        return {
          label: 'REVEAL ANSWER',
          icon: <Eye size={18} />,
          onClick: isMultipleChoice && !game!.lockedAnswer ? undefined : () => revealAnswer(),
        };
      case 'reveal':
        return pendingGrade ? null : { label: 'NEXT QUESTION', onClick: () => continueAfterReveal() };
      case 'leaderboard':
        return { label: 'CONTINUE', onClick: () => continueFromLeaderboard() };
      case 'tie_breaker':
        return { label: 'START SUDDEN DEATH', onClick: () => continueFromTieAnnouncement() };
      case 'sudden_death':
        return { label: 'START QUESTION', onClick: () => continueFromSuddenDeathIntro() };
      default:
        return null;
    }
  }

  const action = primaryAction();
  const showEarlyReveal = game.phase === 'question' || game.phase === 'answering';
  const teamsBehind = game.teams
    .map((t) => ({ team: t, count: game.questionsAnsweredByTeam[t.id] ?? 0 }))
    .sort((a, b) => b.count - a.count);
  const maxCount = teamsBehind[0]?.count ?? 0;

  return (
    <div className="fixed bottom-0 inset-x-0 z-50">
      {toolsOpen && (
        <div className="game-safe-area pb-3">
          <div className="rounded-2xl border border-white/10 bg-bb-deep/95 backdrop-blur-xl p-4 grid sm:grid-cols-2 gap-2 text-sm">
            <ToolButton icon={<RotateCcw size={16} />} label="Reset Buzzers" onClick={resetBuzzers} disabled={game.phase !== 'answering'} />
            <ToolButton icon={<SkipForward size={16} />} label="Skip Question" onClick={skipQuestion} />
            <ToolButton icon={<ArrowLeft size={16} />} label="Previous Question" onClick={previousQuestion} disabled={game.questionIndex === 0 || game.tieBreakerActive} />
            <ToolButton icon={<Flag size={16} />} label="End Game Now" onClick={() => confirm('End the game now and crown a winner by current score?') && endGameNow()} />
          </div>

          <div className="mt-2 rounded-2xl border border-white/10 bg-bb-deep/95 backdrop-blur-xl p-4">
            <button onClick={() => setScoresOpen((v) => !v)} className="text-xs uppercase tracking-widest text-white/50 mb-2">
              Adjust Scores {scoresOpen ? '▲' : '▼'}
            </button>
            {scoresOpen && (
              <div className="grid sm:grid-cols-2 gap-2">
                {game.teams.map((team) => (
                  <div key={team.id} className="flex items-center justify-between rounded-xl border border-white/10 px-3 py-2">
                    <span className="text-sm font-medium truncate">{team.name}</span>
                    <div className="flex items-center gap-1">
                      <button onClick={() => deductPoints(team.id, 1)} className="h-7 w-7 rounded-full bg-white/10 flex items-center justify-center hover:bg-bb-red/30">
                        <Minus size={14} />
                      </button>
                      <span className="w-8 text-center font-display font-bold">{game.scores[team.id] ?? 0}</span>
                      <button onClick={() => awardBonus(team.id, 1)} className="h-7 w-7 rounded-full bg-white/10 flex items-center justify-center hover:bg-bb-green/30">
                        <Plus size={14} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="mt-2 rounded-2xl border border-white/10 bg-bb-deep/95 backdrop-blur-xl p-4">
            <button onClick={() => setBalanceOpen((v) => !v)} className="flex items-center gap-1.5 text-xs uppercase tracking-widest text-white/50 mb-2">
              <Scale size={13} /> Running Late? End Early {balanceOpen ? '▲' : '▼'}
            </button>
            {balanceOpen && (
              <div className="space-y-2">
                <div className="grid sm:grid-cols-2 gap-2">
                  {teamsBehind.map(({ team, count }) => (
                    <div key={team.id} className="flex items-center justify-between rounded-xl border border-white/10 px-3 py-2 text-sm">
                      <span className="truncate">{team.name}</span>
                      <span className="text-white/60">
                        {count} question{count === 1 ? '' : 's'}
                        {count < maxCount && <span className="text-bb-gold-light"> · needs {maxCount - count} more to even up</span>}
                      </span>
                    </div>
                  ))}
                </div>
                {isTurnBasedMode(game.settings.gameMode) ? (
                  game.balancingToEnd ? (
                    <p className="text-xs text-bb-gold-light">
                      Wrapping up — the game will end automatically once every team reaches {game.balanceTargetCount} question{game.balanceTargetCount === 1 ? '' : 's'}.
                    </p>
                  ) : (
                    <button
                      onClick={() => startBalancingEnd()}
                      className="w-full rounded-xl bg-bb-gold/15 text-bb-gold-light py-2 text-sm font-semibold hover:bg-bb-gold/25"
                    >
                      Play just enough to even things out, then end
                    </button>
                  )
                ) : (
                  <p className="text-xs text-white/40">
                    Buzzer/Elimination modes don't assign fixed turns, so exact balancing isn't guaranteed — use End Game Now above when you're ready to stop.
                  </p>
                )}
              </div>
            )}
          </div>

          <p className="text-center text-[11px] text-white/30 mt-2">
            SPACE pause/resume · R reveal answer (works any time before it's shown) · C correct · X incorrect · N next · team buzzer keys in Settings
          </p>
        </div>
      )}

      <div className="game-safe-area pb-4">
        <div className="rounded-2xl border border-white/10 bg-bb-deep/95 backdrop-blur-xl px-4 py-3 flex items-center gap-3">
          <button
            onClick={() => setToolsOpen((v) => !v)}
            className="h-10 w-10 rounded-xl bg-white/10 flex items-center justify-center hover:bg-white/20 shrink-0"
            aria-label="Host tools"
          >
            {toolsOpen ? <ChevronUp size={18} /> : <Settings2 size={18} />}
          </button>

          {pendingGrade ? (
            <div className="flex-1 flex flex-col gap-1.5">
              <p className="text-center text-[11px] text-white/40 uppercase tracking-widest">Did they get it right?</p>
              <div className="flex gap-3">
                <motion.button
                  whileTap={{ scale: 0.96 }}
                  onClick={() => markCorrect()}
                  className="flex-1 rounded-xl bg-bb-green/90 hover:bg-bb-green py-3 font-display font-bold text-white shadow-glow-green"
                >
                  ✓ CORRECT
                </motion.button>
                <motion.button
                  whileTap={{ scale: 0.96 }}
                  onClick={() => markIncorrect()}
                  className="flex-1 rounded-xl bg-bb-red/90 hover:bg-bb-red py-3 font-display font-bold text-white shadow-glow-red"
                >
                  ✕ INCORRECT
                </motion.button>
              </div>
            </div>
          ) : showEarlyReveal && action ? (
            <div className="flex-1 flex gap-3">
              <motion.button
                whileTap={action.onClick ? { scale: 0.97 } : undefined}
                onClick={action.onClick}
                disabled={!action.onClick}
                className="flex-[2] rounded-xl bg-gradient-to-r from-bb-blue to-bb-blue-light py-3 font-display font-bold text-white shadow-glow-blue disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {action.icon}
                {action.label}
              </motion.button>
              <motion.button
                whileTap={{ scale: 0.97 }}
                onClick={() => revealAnswer()}
                title="Skip ahead and show the answer now — nobody scores on an early reveal"
                className="flex-1 rounded-xl bg-bb-gold/90 hover:bg-bb-gold text-bb-deep py-3 font-display font-bold flex items-center justify-center gap-2"
              >
                <Eye size={18} />
                REVEAL
              </motion.button>
            </div>
          ) : action ? (
            <motion.button
              whileTap={action.onClick ? { scale: 0.97 } : undefined}
              onClick={action.onClick}
              disabled={!action.onClick}
              className="flex-1 rounded-xl bg-gradient-to-r from-bb-blue to-bb-blue-light py-3 font-display font-bold text-white shadow-glow-blue disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {action.icon}
              {action.label}
            </motion.button>
          ) : (
            <div className="flex-1 text-center text-white/40 text-sm uppercase tracking-widest">Waiting…</div>
          )}
        </div>
        {game.phase === 'locked' && isMultipleChoice && !game.lockedAnswer && (
          <p className="text-center text-[11px] text-white/40 mt-2">Tap the answer they gave above, then reveal it.</p>
        )}
      </div>
    </div>
  );
}

function ToolButton({ icon, label, onClick, disabled }: { icon: ReactNode; label: string; onClick: () => void; disabled?: boolean }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="flex items-center gap-2 rounded-xl border border-white/10 px-3 py-2 text-white/80 hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed"
    >
      {icon}
      {label}
    </button>
  );
}
