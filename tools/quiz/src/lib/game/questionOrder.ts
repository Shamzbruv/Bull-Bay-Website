import type { Quiz } from '../../types/quiz';
import type { GameSettings } from '../../types/game';

function shuffledIndices(length: number): number[] {
  const idx = Array.from({ length }, (_, i) => i);
  for (let i = idx.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [idx[i], idx[j]] = [idx[j], idx[i]];
  }
  return idx;
}

/**
 * Builds the ordered list of question ids to play this game, excluding
 * tie_breaker questions (those are held back for sudden death — see
 * getTieBreakerQueue). Random modes still preserve each chosen question's
 * original round order so round-intro transitions stay coherent.
 */
export function buildQuestionOrder(quiz: Quiz, settings: GameSettings): string[] {
  const scored = quiz.questions.filter((q) => q.type !== 'tie_breaker');

  if (settings.questionSelection === 'custom' && settings.selectedQuestionIds?.length) {
    const allowed = new Set(settings.selectedQuestionIds);
    return scored.filter((q) => allowed.has(q.id)).map((q) => q.id);
  }

  const sampleSize =
    settings.questionSelection === 'random_10'
      ? 10
      : settings.questionSelection === 'random_20'
        ? 20
        : settings.questionSelection === 'random_30'
          ? 30
          : scored.length;

  if (sampleSize >= scored.length) {
    return scored.map((q) => q.id);
  }

  const chosenIndices = shuffledIndices(scored.length).slice(0, sampleSize).sort((a, b) => a - b);
  return chosenIndices.map((i) => scored[i].id);
}

export function getTieBreakerQueue(quiz: Quiz): string[] {
  return quiz.questions.filter((q) => q.type === 'tie_breaker').map((q) => q.id);
}
