import { useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { Check, X } from 'lucide-react';
import { useGameStore } from '../../state/gameStore';
import { getCurrentQuestion, getEffectiveGameMode } from '../../lib/game/selectors';
import { GameHeader } from './GameHeader';
import { TeamScoreBar } from './TeamScoreBar';
import { ExplanationCard } from './ExplanationCard';
import { soundManager } from '../../lib/sound/soundManager';

export function AnswerReveal() {
  const game = useGameStore((s) => s.game);
  const gradedSoundPlayed = useRef(false);

  // Reset once per question (not per render) so re-grading a fresh question plays its own sound.
  useEffect(() => {
    gradedSoundPlayed.current = false;
  }, [game?.questionIndex, game?.currentTieBreakerId]);

  useEffect(() => {
    if (!game?.lastAwardedPoints || gradedSoundPlayed.current) return;
    gradedSoundPlayed.current = true;
    soundManager.play(game.lastAwardedPoints.correct ? 'correct' : 'incorrect');
  }, [game?.lastAwardedPoints, game]);

  if (!game) return null;
  const question = getCurrentQuestion(game);
  if (!question) return null;

  const award = game.lastAwardedPoints;
  const awardedTeam = award ? game.teams.find((t) => t.id === award.teamId) : undefined;
  const answeringTeam = game.teams.find((t) => t.id === (game.buzzedTeamId ?? game.activeTeamId));
  const pendingGrade = !award && Boolean(answeringTeam);

  return (
    <div className="game-safe-area tv-safe-area flex flex-col gap-6 min-h-screen py-6">
      <GameHeader
        round={game.round}
        questionNumber={game.questionIndex + 1}
        totalQuestions={game.questionOrder.length}
        segmentMode={game.settings.gameMode === 'mixed' ? getEffectiveGameMode(game) : undefined}
      />
      <TeamScoreBar teams={game.teams} scores={game.scores} highlightTeamId={award?.teamId ?? answeringTeam?.id} lastAwarded={award} />

      <div className="flex-1 flex items-center justify-center">
        <div className="w-full max-w-3xl rounded-[2rem] border border-white/10 bg-bb-navy/85 backdrop-blur-xl shadow-2xl p-6 sm:p-10 space-y-6 text-center">
          {award ? (
            <motion.div initial={{ opacity: 0, scale: 0.7 }} animate={{ opacity: 1, scale: 1 }} className="space-y-1">
              <div
                className={`mx-auto flex h-14 w-14 items-center justify-center rounded-full ${award.correct ? 'bg-bb-green' : 'bg-bb-red'}`}
              >
                {award.correct ? <Check className="text-white" size={28} /> : <X className="text-white" size={28} />}
              </div>
              <h2 className={`font-display text-4xl sm:text-5xl font-black ${award.correct ? 'text-bb-green' : 'text-bb-red'}`}>
                {award.correct ? 'CORRECT!' : 'NOT QUITE!'}
              </h2>
              {awardedTeam && (
                <p className="text-white/70">
                  {awardedTeam.name} {award.correct ? `+${award.points} points` : award.points > 0 ? `-${award.points} points` : ''}
                </p>
              )}
            </motion.div>
          ) : pendingGrade ? (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-1">
              <h2 className="font-display text-3xl sm:text-4xl font-black text-bb-gold-light">DID THEY GET IT?</h2>
              {answeringTeam && <p className="text-white/70">Compare what {answeringTeam.name} said to the answer below.</p>}
            </motion.div>
          ) : (
            <h2 className="font-display text-3xl sm:text-4xl font-black text-white/70">TIME'S UP</h2>
          )}

          <div>
            <p className="text-white/50 text-sm uppercase tracking-widest mb-1">Correct Answer</p>
            <p className="font-display text-2xl sm:text-3xl font-bold text-bb-gold-light">
              {question.options ? question.options.find((o) => o.id === question.correctAnswer)?.text ?? question.correctAnswer : question.correctAnswer}
            </p>
          </div>

          <ExplanationCard question={question} />
        </div>
      </div>
    </div>
  );
}
