import type { ConcreteGameMode, GameMode, GameSettings, GameState, Team } from '../../types/game';
import type { QuizQuestion } from '../../types/quiz';
import { getSegmentBounds } from './mixedMode';

/** The subset of GameState the mode resolvers need — also satisfied by the Display's synced (quiz-less) state. */
interface ModeContext {
  settings: GameSettings;
  tieBreakerActive: boolean;
  questionIndex: number;
  mixedModeAssignment?: ConcreteGameMode[];
}

export function getCurrentQuestion(game: GameState): QuizQuestion | undefined {
  const id = game.tieBreakerActive ? game.currentTieBreakerId : game.questionOrder[game.questionIndex];
  if (!id) return undefined;
  return game.quiz.questions.find((q) => q.id === id);
}

/** Safe for any GameMode, including 'mixed' (always false there — check getEffectiveGameMode instead). */
export function isTurnBasedMode(gameMode: GameMode): boolean {
  return gameMode === 'classic' || gameMode === 'rapid_fire';
}

/** The mode Championship assigns to a given question index (undefined outside mixed mode). */
export function mixedSegmentModeAt(game: ModeContext, index: number): ConcreteGameMode | undefined {
  return game.settings.gameMode === 'mixed' ? game.mixedModeAssignment?.[index] : undefined;
}

/**
 * The mode actually governing the CURRENT question's mechanics — for every
 * setting except Championship this is just settings.gameMode; for
 * Championship it's whichever of the four real modes owns this question
 * (sudden death always plays as Buzzer, since a tie-break is inherently a race).
 */
export function getEffectiveGameMode(game: ModeContext): ConcreteGameMode {
  if (game.settings.gameMode !== 'mixed') return game.settings.gameMode;
  if (game.tieBreakerActive) return 'buzzer';
  return mixedSegmentModeAt(game, game.questionIndex) ?? 'buzzer';
}

/** Whether incorrect answers should deduct points right now (Elimination, or Championship's elimination quarter). */
export function getEffectivePenalties(game: ModeContext): boolean {
  if (game.settings.gameMode === 'mixed') return getEffectiveGameMode(game) === 'elimination';
  return game.settings.penaltiesEnabled;
}

/** Whose turn it is for the current question, in Classic/Rapid Fire (including Championship's quarters of those). */
export function getActiveTeamId(game: GameState): string | undefined {
  const teams = game.teams;
  if (teams.length === 0) return undefined;
  const mode = getEffectiveGameMode(game);

  if (mode === 'classic') {
    const order = game.questionIndex % teams.length;
    return teamAtOrder(teams, order)?.id;
  }

  if (mode === 'rapid_fire') {
    let segmentStart = 0;
    let segmentLength = Math.max(game.questionOrder.length, 1);
    if (game.settings.gameMode === 'mixed' && game.mixedModeAssignment) {
      const bounds = getSegmentBounds(game.mixedModeAssignment, game.questionIndex);
      segmentStart = bounds.start;
      segmentLength = Math.max(bounds.end - bounds.start, 1);
    }
    const perTeam = Math.max(game.settings.questionsPerTeam || Math.ceil(segmentLength / teams.length), 1);
    const posInSegment = game.questionIndex - segmentStart;
    const teamPos = Math.min(Math.floor(posInSegment / perTeam), teams.length - 1);
    return teamAtOrder(teams, teamPos)?.id;
  }

  return undefined;
}

function teamAtOrder(teams: Team[], order: number): Team | undefined {
  const sorted = [...teams].sort((a, b) => a.order - b.order);
  return sorted[order];
}

export function pointsForQuestion(question: QuizQuestion, settings: GameState['settings']): number {
  if (settings.pointsMode === 'standard' && question.type !== 'tie_breaker') {
    return settings.difficultyPoints[question.difficulty];
  }
  return question.points;
}
