import type { ConcreteGameMode } from '../../types/game';

/** The order Championship mode moves through its four quarters — calm start, dramatic finish. */
export const CHAMPIONSHIP_ORDER: ConcreteGameMode[] = ['classic', 'buzzer', 'rapid_fire', 'elimination'];

/**
 * Splits the scored question count into four contiguous, as-equal-as-possible
 * blocks (any remainder goes to the earliest blocks) and returns one mode
 * label per question index — e.g. for 10 questions: 3 classic, 3 buzzer,
 * 2 rapid_fire, 2 elimination.
 */
export function buildMixedModeAssignment(questionCount: number): ConcreteGameMode[] {
  const modes = CHAMPIONSHIP_ORDER;
  const base = Math.floor(questionCount / modes.length);
  const remainder = questionCount % modes.length;

  const assignment: ConcreteGameMode[] = [];
  modes.forEach((mode, i) => {
    const blockSize = base + (i < remainder ? 1 : 0);
    for (let n = 0; n < blockSize; n++) assignment.push(mode);
  });
  return assignment;
}

/** The contiguous [start, end) range of indices sharing assignment[index]'s mode. */
export function getSegmentBounds(assignment: ConcreteGameMode[], index: number): { start: number; end: number } {
  const mode = assignment[index];
  let start = index;
  while (start > 0 && assignment[start - 1] === mode) start--;
  let end = index + 1;
  while (end < assignment.length && assignment[end] === mode) end++;
  return { start, end };
}
