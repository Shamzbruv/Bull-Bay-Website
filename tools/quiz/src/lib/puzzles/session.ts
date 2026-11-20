import { biblePictures } from '../../data/bible-puzzles/pictures';
import { bibleWords } from '../../data/bible-puzzles/words';
import type { PictureTile, PuzzleDisplayState, PuzzleMode } from '../../types/biblePuzzles';

type Puzzle = {
  answer: string;
  hint: string;
  pictures?: readonly PictureTile[];
  reference?: string;
};

type Round = { answer: string; letters: string };

export type PuzzleSession = {
  id: string;
  deck: Round[];
  position: number;
  hint: boolean;
  revealed: boolean;
};

const banks: Record<PuzzleMode, readonly Puzzle[]> = {
  unscramble: bibleWords.map(([answer, hint]) => ({ answer, hint })),
  pictures: biblePictures,
};

export function puzzleCount(mode: PuzzleMode) {
  return banks[mode].length;
}

function shuffled<T>(values: readonly T[]): T[] {
  const result = [...values];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

function scramble(answer: string) {
  const original = answer.toUpperCase();
  const candidate = shuffled([...original]).join('');
  if (candidate !== original) return candidate;
  const swap = candidate.split('').findIndex((letter) => letter !== candidate[0]);
  if (swap < 0) return candidate;
  const letters = [...candidate];
  [letters[0], letters[swap]] = [letters[swap], letters[0]];
  return letters.join('');
}

export function createSession(mode: PuzzleMode, count: number, id: string): PuzzleSession {
  return {
    id,
    deck: shuffled(banks[mode]).slice(0, count).map(({ answer }) => ({
      answer,
      letters: mode === 'unscramble' ? scramble(answer) : '',
    })),
    position: 0,
    hint: false,
    revealed: false,
  };
}

function storageKey(mode: PuzzleMode) {
  return `bbntcog-puzzles-v1-${mode}`;
}

export function readSession(mode: PuzzleMode): PuzzleSession | null {
  try {
    const saved = JSON.parse(localStorage.getItem(storageKey(mode)) ?? 'null') as PuzzleSession | null;
    if (!saved || typeof saved.id !== 'string' || !Array.isArray(saved.deck) || !saved.deck.length
      || !Number.isInteger(saved.position) || saved.position < 0 || saved.position > saved.deck.length
      || typeof saved.hint !== 'boolean' || typeof saved.revealed !== 'boolean'
      || !saved.deck.every((round) => round && typeof round.letters === 'string'
        && banks[mode].some(({ answer }) => answer === round.answer))) return null;
    return saved;
  } catch {
    return null;
  }
}

export function saveSession(mode: PuzzleMode, session: PuzzleSession) {
  try {
    localStorage.setItem(storageKey(mode), JSON.stringify(session));
    return true;
  } catch {
    return false;
  }
}

export function currentPuzzle(mode: PuzzleMode, session: PuzzleSession): Puzzle | undefined {
  return banks[mode].find(({ answer }) => answer === session.deck[session.position]?.answer);
}

export function projectPuzzle(mode: PuzzleMode, session: PuzzleSession): PuzzleDisplayState {
  const puzzle = currentPuzzle(mode, session);
  const clue = puzzle
    ? puzzle.pictures ? { pictures: puzzle.pictures } : { letters: session.deck[session.position].letters }
    : null;

  return {
    mode,
    round: Math.min(session.position + 1, session.deck.length),
    total: session.deck.length,
    clue,
    hint: session.hint ? puzzle?.hint : undefined,
    solution: session.revealed && puzzle ? { answer: puzzle.answer, reference: puzzle.reference } : undefined,
  };
}
