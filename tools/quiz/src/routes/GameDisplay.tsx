import { useEffect, useState } from 'react';
import { usePresenterState } from '../hooks/usePresenterState';
import { useSettingsStore } from '../state/settingsStore';
import { quizChannel } from '../lib/broadcast/quizChannel';
import { BackgroundScene } from '../components/brand/BackgroundScene';
import { ChurchLogo } from '../components/brand/ChurchLogo';
import { BrandDivider } from '../components/brand/BrandDivider';
import { BrandRings } from '../components/brand/BrandRing';
import { GameHeader } from '../components/game/GameHeader';
import { TeamScoreBar } from '../components/game/TeamScoreBar';
import { QuestionTimer } from '../components/game/QuestionTimer';
import { Choice } from '../components/game/Choice';
import { DifficultyBadge } from '../components/game/DifficultyBadge';
import { BuzzerIndicator } from '../components/game/BuzzerIndicator';
import { ExplanationCard } from '../components/game/ExplanationCard';
import { Confetti } from '../components/game/Confetti';
import { AnimatedCounter } from '../components/game/AnimatedCounter';
import { computeStandings } from '../lib/game/scoring';
import { getEffectiveGameMode } from '../lib/game/selectors';
import { GAME_MODE_LABEL } from '../lib/game/gameModeLabels';
import { brand } from '../config/brand';

/**
 * The audience-facing screen — what gets projected on the church TV. Opened
 * in a separate tab/window from the Host console (see GameHost's "Open
 * Audience Display" button); this page is purely a read-only mirror driven
 * over BroadcastChannel, with no controls of its own.
 */
export function GameDisplay() {
  const { state, buzz } = usePresenterState();
  const buzzerKeys = useSettingsStore((s) => s.buzzerKeys);

  // Root font-size scaling: Tailwind's rem-based sizing means changing the
  // <html> font-size proportionally scales every text/spacing utility at
  // once, so the host can make the whole display bigger without us having
  // to hand-scale every element individually.
  const [scalePct, setScalePct] = useState(100);
  useEffect(() => {
    document.documentElement.style.fontSize = `${scalePct}%`;
    return () => {
      document.documentElement.style.fontSize = '';
    };
  }, [scalePct]);

  useEffect(() => {
    return quizChannel.subscribe((message) => {
      if (message.type === 'DISPLAY_SCALE') setScalePct(message.payload.scale);
    });
  }, []);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (!state || state.phase !== 'answering') return;
      const key = e.key.toLowerCase();
      const slot = Object.entries(buzzerKeys).find(([, k]) => k === key)?.[0];
      if (slot === undefined) return;
      const team = [...state.teams].sort((a, b) => a.order - b.order)[Number(slot)];
      if (team) buzz(team.id);
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [state, buzzerKeys, buzz]);

  if (!state) {
    return (
      <BackgroundScene variant="dark">
        <div className="min-h-screen flex flex-col items-center justify-center gap-6 text-center">
          <ChurchLogo size="xl" glow />
          <h1 className="font-display text-3xl font-bold">{brand.fullTitle}</h1>
          <p className="text-bb-gold-light tracking-widest uppercase text-sm">{brand.tagline}</p>
          <p className="text-white/50 animate-pulse mt-4">Waiting for the Quizmaster…</p>
        </div>
      </BackgroundScene>
    );
  }

  const buzzedTeam = state.buzzedTeamId ? state.teams.find((t) => t.id === state.buzzedTeamId) : undefined;
  const q = state.currentQuestion;
  const segmentMode = state.settings.gameMode === 'mixed' ? getEffectiveGameMode(state) : undefined;
  const totalTime = q?.timeLimit ?? state.settings.questionTimeSeconds;
  const timerTotal =
    state.timerKind === 'question'
      ? totalTime
      : state.timerKind === 'steal'
        ? state.settings.stealTimeSeconds
        : typeof state.settings.answerTimeSeconds === 'number'
          ? state.settings.answerTimeSeconds
          : totalTime;

  return (
    <BackgroundScene variant="dark">
      {state.phase === 'intro' && (
        <div className="game-safe-area tv-safe-area min-h-screen flex flex-col items-center justify-center text-center gap-8">
          <ChurchLogo size="xl" glow />
          <p className="text-sm uppercase tracking-[0.35em] text-white/60">Tonight's Quiz</p>
          <h1 className="font-display text-6xl font-black text-bb-gold-light">{state.quiz.title.toUpperCase()}</h1>
          <div className="flex flex-wrap justify-center gap-8">
            {[...state.teams].sort((a, b) => a.order - b.order).map((team, i, arr) => (
              <div key={team.id} className="flex items-center gap-8">
                <div className="text-center">
                  <div className="h-20 w-20 rounded-full mx-auto flex items-center justify-center font-display text-2xl font-black text-white shadow-xl" style={{ backgroundColor: team.color }}>
                    {team.name.slice(0, 2).toUpperCase()}
                  </div>
                  <div className="font-display text-xl font-bold mt-2">{team.name}</div>
                </div>
                {i < arr.length - 1 && <span className="font-display text-xl text-white/40">VS</span>}
              </div>
            ))}
          </div>
        </div>
      )}

      {(state.phase === 'round_intro' || state.phase === 'sudden_death') && (
        <div className="relative min-h-screen flex flex-col items-center justify-center text-center gap-3 overflow-hidden">
          <BrandRings size={420} />
          {state.phase === 'round_intro' && segmentMode && (
            <span className="relative z-10 rounded-full border border-bb-gold/50 bg-bb-gold/10 px-4 py-1.5 text-bb-gold-light font-display font-bold uppercase tracking-widest text-sm">
              Now Entering: {GAME_MODE_LABEL[segmentMode]} Mode
            </span>
          )}
          <h1 className="relative z-10 font-display text-3xl font-bold text-bb-cyan uppercase tracking-widest">
            {state.phase === 'sudden_death' ? 'SUDDEN DEATH' : (state.round ?? 'Next Round')}
          </h1>
        </div>
      )}

      {(state.phase === 'question' || state.phase === 'answering' || state.phase === 'locked') && q && (
        <div className="game-safe-area tv-safe-area flex flex-col gap-6 min-h-screen py-6">
          <GameHeader round={state.round} questionNumber={q.questionNumber} totalQuestions={q.totalQuestions} segmentMode={segmentMode} />
          <TeamScoreBar teams={state.teams} scores={state.scores} highlightTeamId={state.buzzedTeamId ?? state.activeTeamId} />
          <div className="flex-1 flex items-center justify-center">
            <div className="w-full max-w-4xl rounded-[2rem] border border-white/10 bg-bb-navy/80 backdrop-blur-xl shadow-2xl p-6 sm:p-10 space-y-6">
              <div className="flex items-center justify-between flex-wrap gap-3">
                <DifficultyBadge difficulty={q.difficulty} points={q.points} />
                {state.timerKind === 'answer' && state.settings.answerTimeSeconds === 'unlimited' ? (
                  <span className="text-sm text-white/50 uppercase tracking-widest">Unlimited</span>
                ) : (
                  <QuestionTimer remaining={state.timerRemaining} total={timerTotal} running={state.timerRunning} />
                )}
              </div>

              {state.phase === 'question' ? (
                <p className="font-display text-2xl sm:text-4xl font-bold leading-snug text-center">{q.question}</p>
              ) : (
                <h2 className="font-display text-3xl sm:text-5xl font-black text-center bg-gradient-to-b from-bb-gold-light to-bb-gold bg-clip-text text-transparent">
                  WHAT'S YOUR ANSWER?
                </h2>
              )}

              {q.type === 'multiple_choice' && q.options && (
                <div className="grid sm:grid-cols-2 gap-4">
                  {q.options.map((opt) => (
                    <Choice
                      key={opt.id}
                      label={opt.id}
                      text={opt.text}
                      disabled
                      selected={state.phase === 'locked' && state.lockedAnswer === opt.id}
                    />
                  ))}
                </div>
              )}

              {buzzedTeam && <BuzzerIndicator team={buzzedTeam} />}
            </div>
          </div>
        </div>
      )}

      {state.phase === 'reveal' && q && (
        <div className="game-safe-area tv-safe-area flex flex-col gap-6 min-h-screen py-6">
          <GameHeader round={state.round} questionNumber={q.questionNumber} totalQuestions={q.totalQuestions} segmentMode={segmentMode} />
          <TeamScoreBar teams={state.teams} scores={state.scores} lastAwarded={state.lastAwardedPoints} />
          <div className="flex-1 flex items-center justify-center">
            <div className="w-full max-w-3xl rounded-[2rem] border border-white/10 bg-bb-navy/85 backdrop-blur-xl shadow-2xl p-6 sm:p-10 space-y-6 text-center">
              <h2 className="font-display text-4xl font-black text-bb-gold-light">
                {q.correctAnswer ? (q.options ? q.options.find((o) => o.id === q.correctAnswer)?.text : q.correctAnswer) : ''}
              </h2>
              {q.explanation && (
                <ExplanationCard
                  question={{
                    id: q.id,
                    quizId: state.quiz.id,
                    questionNumber: q.questionNumber,
                    type: q.type,
                    question: q.question,
                    correctAnswer: q.correctAnswer ?? '',
                    explanation: q.explanation,
                    scriptureReference: q.scriptureReference,
                    difficulty: q.difficulty,
                    points: q.points,
                  }}
                />
              )}
            </div>
          </div>
        </div>
      )}

      {state.phase === 'leaderboard' && (
        <div className="min-h-screen flex flex-col items-center justify-center text-center gap-8">
          <h1 className="font-display text-5xl font-black text-bb-gold-light">SCOREBOARD</h1>
          <div className="w-full max-w-lg space-y-3">
            {computeStandings(state.teams, state.scores).map((s) => (
              <div key={s.team.id} className={`flex items-center gap-4 rounded-2xl border px-5 py-4 ${s.rank === 1 ? 'border-bb-gold bg-bb-gold/10' : 'border-white/10 bg-white/5'}`}>
                <span className="font-display text-2xl font-black w-8 text-white/60">{s.rank}</span>
                <span className="flex-1 text-left font-display text-lg font-bold">{s.team.name}</span>
                <span className="font-display text-2xl font-black">{s.score}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {state.phase === 'tie_breaker' && (
        <div className="min-h-screen flex flex-col items-center justify-center text-center gap-6">
          <h1 className="font-display text-5xl font-black text-bb-gold-light">WE HAVE A TIE!</h1>
          <p className="text-white/60">Sudden death is coming up…</p>
        </div>
      )}

      {state.phase === 'finished' && (
        <div className="min-h-screen flex flex-col items-center justify-center text-center gap-6 relative">
          <Confetti />
          <ChurchLogo size="lg" glow />
          <p className="text-white/50 uppercase tracking-[0.4em] text-sm">Tonight's Winner</p>
          <h1 className="font-display text-6xl font-black text-bb-gold-light">
            {state.teams.find((t) => t.id === state.winnerTeamId)?.name.toUpperCase() ?? 'CO-CHAMPIONS'}
          </h1>
          <p className="font-display text-2xl font-bold">
            <AnimatedCounter value={state.winnerTeamId ? state.scores[state.winnerTeamId] ?? 0 : 0} /> POINTS
          </p>
          <BrandDivider />
        </div>
      )}
    </BackgroundScene>
  );
}
