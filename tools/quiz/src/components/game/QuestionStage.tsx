import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useRef } from 'react';
import { useGameStore } from '../../state/gameStore';
import { getCurrentQuestion, getEffectiveGameMode } from '../../lib/game/selectors';
import { GameHeader } from './GameHeader';
import { TeamScoreBar } from './TeamScoreBar';
import { QuestionTimer } from './QuestionTimer';
import { Choice } from './Choice';
import { DifficultyBadge } from './DifficultyBadge';
import { BuzzerIndicator } from './BuzzerIndicator';
import { soundManager } from '../../lib/sound/soundManager';

export function QuestionStage() {
  const game = useGameStore((s) => s.game);
  const selectAnswer = useGameStore((s) => s.selectAnswer);
  const prevPhase = useRef<string | undefined>(undefined);

  useEffect(() => {
    if (!game) return;
    if (prevPhase.current !== game.phase) {
      if (game.phase === 'answering' && prevPhase.current === 'question') soundManager.play('time-up');
      if (game.phase === 'locked') soundManager.play('buzz');
      prevPhase.current = game.phase;
    }
  }, [game?.phase, game]);

  useEffect(() => {
    if (game && game.timerRunning && game.timerRemaining > 0 && game.timerRemaining <= 3) {
      soundManager.play('timer-warning');
    }
  }, [game?.timerRemaining, game?.timerRunning, game]);

  if (!game) return null;
  const question = getCurrentQuestion(game);
  if (!question) return null;

  const buzzedTeam = game.buzzedTeamId ? game.teams.find((t) => t.id === game.buzzedTeamId) : undefined;
  const isTurn = Boolean(game.activeTeamId) && game.phase !== 'answering';
  const showQuestionText = game.phase === 'question';
  const totalTime = question.timeLimit ?? game.settings.questionTimeSeconds;
  const timerTotal = game.timerKind === 'question' ? totalTime : game.timerKind === 'steal' ? game.settings.stealTimeSeconds : typeof game.settings.answerTimeSeconds === 'number' ? game.settings.answerTimeSeconds : totalTime;

  return (
    <div className="game-safe-area tv-safe-area flex flex-col gap-6 min-h-screen py-6">
      <GameHeader
        round={game.round}
        questionNumber={game.questionIndex + 1}
        totalQuestions={game.questionOrder.length}
        segmentMode={game.settings.gameMode === 'mixed' ? getEffectiveGameMode(game) : undefined}
      />
      <TeamScoreBar teams={game.teams} scores={game.scores} highlightTeamId={game.buzzedTeamId ?? game.activeTeamId} />

      <div className="flex-1 flex items-center justify-center">
        <div className="w-full max-w-4xl rounded-[2rem] border border-white/10 bg-bb-navy/80 backdrop-blur-xl shadow-2xl p-6 sm:p-10 space-y-6">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <DifficultyBadge difficulty={question.difficulty} points={question.points} />
            {game.timerKind === 'answer' && game.settings.answerTimeSeconds === 'unlimited' ? (
              <span className="text-sm text-white/50 uppercase tracking-widest">Unlimited</span>
            ) : (
              <QuestionTimer remaining={game.timerRemaining} total={timerTotal} running={game.timerRunning} />
            )}
          </div>

          <AnimatePresence mode="wait">
            {showQuestionText ? (
              <motion.div
                key="question"
                initial={{ opacity: 0, y: 40, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -40, scale: 0.96 }}
                transition={{ duration: 0.35 }}
                className="text-center"
              >
                {isTurn && (
                  <p className="text-bb-gold-light text-sm font-semibold uppercase tracking-widest mb-3">
                    {game.teams.find((t) => t.id === game.activeTeamId)?.name}'s Turn
                  </p>
                )}
                <p className="font-display text-2xl sm:text-4xl font-bold leading-snug">{question.question}</p>
              </motion.div>
            ) : (
              <motion.div
                key="prompt"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.4 }}
                className="text-center"
              >
                <h2 className="font-display text-3xl sm:text-5xl font-black bg-gradient-to-b from-bb-gold-light to-bb-gold bg-clip-text text-transparent">
                  WHAT'S YOUR ANSWER?
                </h2>
              </motion.div>
            )}
          </AnimatePresence>

          {question.type === 'multiple_choice' && question.options && (
            <div className="grid sm:grid-cols-2 gap-4">
              {question.options.map((opt) => (
                <Choice
                  key={opt.id}
                  label={opt.id}
                  text={opt.text}
                  selected={game.lockedAnswer === opt.id}
                  onClick={() => (game.phase === 'locked' ? selectAnswer(opt.id) : undefined)}
                  disabled={game.phase !== 'locked'}
                />
              ))}
            </div>
          )}

          {(game.phase === 'locked' || (game.phase === 'answering' && buzzedTeam)) && buzzedTeam && <BuzzerIndicator team={buzzedTeam} />}

          {game.phase === 'locked' && game.lockedAnswer && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center">
              <p className="text-white/50 text-sm uppercase tracking-widest">Locked In</p>
              <p className="font-display text-2xl font-bold text-bb-gold-light">
                {question.options?.find((o) => o.id === game.lockedAnswer)?.text ?? game.lockedAnswer}
              </p>
            </motion.div>
          )}

          {game.phase === 'answering' && !buzzedTeam && !isTurn && (
            <p className="text-center text-white/50 text-sm uppercase tracking-widest animate-pulse">Waiting for buzzer…</p>
          )}
        </div>
      </div>
    </div>
  );
}
