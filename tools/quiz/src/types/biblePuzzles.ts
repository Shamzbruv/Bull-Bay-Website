export type PuzzleMode = 'unscramble' | 'pictures';
export type PictureTile = readonly [symbol: string, description: string];

export type PuzzleClue =
  | { letters: string; pictures?: never }
  | { pictures: readonly PictureTile[]; letters?: never };

export type PuzzleDisplayState = {
  mode: PuzzleMode;
  round: number;
  total: number;
  clue: PuzzleClue | null;
  hint?: string;
  solution?: { answer: string; reference?: string };
};

export const puzzleModes = {
  unscramble: {
    title: 'Bible Unscramble',
    instruction: 'Put the letters in the right order to find the Bible word.',
  },
  pictures: {
    title: 'Bible Picture Puzzles',
    instruction: 'Put the pictures together to name the Bible story or phrase.',
  },
} satisfies Record<PuzzleMode, { title: string; instruction: string }>;

export function puzzleChannel(id: string) {
  return `bbntcog-puzzles-${id}`;
}
