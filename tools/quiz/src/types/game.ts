import type { Difficulty, Quiz } from './quiz';

export type GamePhase =
  | 'intro' // pre-game countdown / "tonight's challenge"
  | 'round_intro'
  | 'question' // question + timer visible
  | 'answering' // timer expired, "what's your answer?"
  | 'locked' // a team has buzzed / answer locked in
  | 'reveal' // correct answer + explanation shown
  | 'scoring' // points animating into the scoreboard
  | 'leaderboard' // periodic scoreboard break
  | 'tie_breaker'
  | 'sudden_death'
  | 'finished';

export type GameMode = 'classic' | 'buzzer' | 'rapid_fire' | 'elimination' | 'mixed';

/** The four "real" modes mixed mode cycles through — never a resolved value on its own. */
export type ConcreteGameMode = Exclude<GameMode, 'mixed'>;

export type QuestionSelectionMode = 'all' | 'random_10' | 'random_20' | 'random_30' | 'custom';

export type PointsMode = 'standard' | 'quiz_defined';

export interface GameSettings {
  questionTimeSeconds: number;
  answerTimeSeconds: number | 'unlimited';
  pointsMode: PointsMode;
  difficultyPoints: Record<Difficulty, number>;
  questionSelection: QuestionSelectionMode;
  selectedQuestionIds?: string[];
  gameMode: GameMode;
  penaltiesEnabled: boolean;
  stealEnabled: boolean;
  stealTimeSeconds: number;
  leaderboardEveryQuestions: number;
  /** Classic/Rapid Fire only — overrides the automatic even split when set. */
  questionsPerTeam?: number;
}

export const DEFAULT_GAME_SETTINGS: GameSettings = {
  questionTimeSeconds: 15,
  answerTimeSeconds: 10,
  pointsMode: 'quiz_defined',
  difficultyPoints: { easy: 1, medium: 2, hard: 3, expert: 5 },
  questionSelection: 'all',
  gameMode: 'buzzer',
  penaltiesEnabled: false,
  stealEnabled: true,
  stealTimeSeconds: 5,
  leaderboardEveryQuestions: 5,
};

export interface BuzzerKeyMap {
  [teamSlot: number]: string; // e.g. 0 -> 'Q', 1 -> 'P'
}

export const DEFAULT_BUZZER_KEYS: BuzzerKeyMap = {
  0: 'q',
  1: 'p',
  2: 'z',
  3: 'm',
  4: '1',
  5: '0',
};

export interface Team {
  id: string;
  name: string;
  color: string;
  icon?: string;
  order: number;
}

export interface BuzzAttempt {
  teamId: string;
  timestamp: number;
}

export interface GameState {
  id: string;
  quiz: Quiz;
  teams: Team[];
  settings: GameSettings;
  questionOrder: string[]; // question ids, in play order

  phase: GamePhase;
  questionIndex: number;
  round?: string;

  scores: Record<string, number>;

  timerRemaining: number;
  timerRunning: boolean;
  timerKind: 'question' | 'answer' | 'steal';

  activeTeamId?: string; // whose turn it is in classic/rapid_fire modes
  buzzedTeamId?: string;
  lockedAnswer?: string;
  buzzQueue: BuzzAttempt[]; // teams who buzzed (and were wrong), in order — excluded from steal attempts
  stolenBy?: string;

  lastAwardedPoints?: { teamId: string; points: number; correct: boolean };

  tieBreakerQueue: string[]; // tie_breaker question ids not yet used
  currentTieBreakerId?: string; // the tie-break question currently in play
  tieBreakerActive: boolean; // true once sudden death has started
  tiedTeamIds?: string[];

  startedAt: string;
  completedAt?: string;
  winnerTeamId?: string;

  questionsAnsweredSinceBreak: number;

  /** Championship (mixed) mode only — which of the four real modes each questionOrder index plays under. */
  mixedModeAssignment?: ConcreteGameMode[];

  /** How many questions each team has actually had graded — used for the "End Early" balancer. */
  questionsAnsweredByTeam: Record<string, number>;
  /** Host has asked to wrap up as soon as every team reaches balanceTargetCount. */
  balancingToEnd: boolean;
  balanceTargetCount?: number;
}

export interface GameHistoryEntry {
  id: string;
  quizId: string;
  quizTitle: string;
  teams: { id: string; name: string; score: number }[];
  winnerName?: string;
  startedAt: string;
  completedAt: string;
  questionCount: number;
  gameMode: GameMode;
}
