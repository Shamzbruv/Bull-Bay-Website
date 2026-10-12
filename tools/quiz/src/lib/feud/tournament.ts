import type { FeudQuestion } from "./questions";
import type { FeudState } from "./engine";
export interface KnockoutMatch {
  id: string;
  stage: number;
  slot: number;
  families: [string | null, string | null];
  sources?: [string, string];
  status: "waiting" | "ready" | "complete" | "bye";
  scores: Record<string, number>;
  winnerId?: string;
}
export interface FeudTournament {
  rounds: number;
  questionsPerRound: number;
  matches: KnockoutMatch[];
  activeMatchId: string;
  questionInMatch: number;
  championId?: string;
}
export function requiredKnockoutRounds(families: number): number {
  return Math.ceil(Math.log2(families));
}
export function uniqueBoards(questions: FeudQuestion[]): FeudQuestion[] {
  const ids = new Set<string>(),
    prompts = new Set<string>();
  return questions.filter((q) => {
    const prompt = q.prompt
      .normalize("NFKC")
      .toLowerCase()
      .replace(/[^\p{L}\p{N}]+/gu, " ")
      .trim();
    if (ids.has(q.id) || prompts.has(prompt)) return false;
    ids.add(q.id);
    prompts.add(prompt);
    return true;
  });
}
export function tournamentQuestionDemand(
  families: number,
  perRound: number,
): number {
  return (families - 1) * perRound;
}
export function buildKnockout(
  ids: string[],
  rounds: number,
  questionsPerRound: number,
): FeudTournament {
  if (
    !Number.isInteger(rounds) ||
    rounds < requiredKnockoutRounds(ids.length) ||
    rounds > 4
  )
    throw new Error(
      "Choose enough knockout rounds for the families: 1–4 rounds.",
    );
  if (!Number.isInteger(questionsPerRound) || questionsPerRound < 1)
    throw new Error("Choose at least one question per round.");
  const matches: KnockoutMatch[] = [];
  for (let stage = 1; stage <= rounds; stage++)
    for (let slot = 0; slot < 2 ** (rounds - stage); slot++) {
      matches.push({
        id: `r${stage}-m${slot + 1}`,
        stage,
        slot,
        families:
          stage === 1
            ? [ids[slot * 2] ?? null, ids[slot * 2 + 1] ?? null]
            : [null, null],
        sources:
          stage === 1
            ? undefined
            : [
                `r${stage - 1}-m${slot * 2 + 1}`,
                `r${stage - 1}-m${slot * 2 + 2}`,
              ],
        status: stage === 1 ? "ready" : "waiting",
        scores: {},
      });
    }
  const t = resolveByes({
    rounds,
    questionsPerRound,
    matches,
    activeMatchId: "",
    questionInMatch: 0,
  });
  const match = t.matches.find((m) => m.status === "ready");
  if (!match) throw new Error("Add at least two families for a tournament.");
  return { ...t, activeMatchId: match.id };
}
export function resolveByes(t: FeudTournament): FeudTournament {
  const matches = t.matches.map((m) => ({
    ...m,
    families: [...m.families] as KnockoutMatch["families"],
    scores: { ...m.scores },
  }));
  for (const m of matches) {
    if (m.status === "complete" || m.status === "bye") continue;
    if (m.sources) {
      const parents = m.sources.map((id) => matches.find((x) => x.id === id)!);
      if (parents.some((p) => !["complete", "bye"].includes(p.status)))
        continue;
      m.families = [parents[0].winnerId ?? null, parents[1].winnerId ?? null];
      m.status = "ready";
    }
    const contestants = m.families.filter(Boolean);
    if (contestants.length < 2) {
      m.status = "bye";
      m.winnerId = contestants[0] ?? undefined;
    }
  }
  return { ...t, matches };
}
export function activeMatch(s: FeudState): KnockoutMatch | undefined {
  return s.tournament?.matches.find(
    (m) => m.id === s.tournament?.activeMatchId,
  );
}
export function startTournamentState(
  s: FeudState,
  rounds: number,
  perRound: number,
): FeudState {
  const questions = uniqueBoards(s.questions),
    required = tournamentQuestionDemand(s.families.length, perRound);
  if (questions.length < required)
    throw new Error(
      `This tournament needs ${required} unique questions, but this selection has ${questions.length}. Reduce questions per round, remove families, or choose a larger pack.`,
    );
  const tournament = buildKnockout(
    s.families.map((f) => f.id),
    rounds,
    perRound,
  );
  const match = tournament.matches.find(
    (m) => m.id === tournament.activeMatchId,
  )!;
  return {
    ...s,
    questions: questions.slice(0, required),
    tournament,
    opponents: match.families.filter((id): id is string => Boolean(id)),
  };
}
export function completeMatch(s: FeudState, winnerId: string): FeudState {
  const match = activeMatch(s);
  if (!s.tournament || !match || !match.families.includes(winnerId)) return s;
  const tournament = resolveByes({
    ...s.tournament,
    matches: s.tournament.matches.map((m) =>
      m.id === match.id ? { ...m, status: "complete", winnerId } : m,
    ),
  });
  const finalMatch = tournament.matches.find(
    (m) => m.stage === tournament.rounds,
  )!;
  const championId = finalMatch.winnerId;
  if (championId && ["complete", "bye"].includes(finalMatch.status))
    return {
      ...s,
      phase: "finished",
      deadline: undefined,
      tournament: { ...tournament, championId },
      notice: `${s.families.find((f) => f.id === championId)!.name} wins the tournament!`,
    };
  return {
    ...s,
    phase: "match_complete",
    deadline: undefined,
    tournament,
    notice: `${s.families.find((f) => f.id === winnerId)!.name} advances to round ${match.stage + 1}!`,
  };
}
export function prepareNextTournamentBoard(s: FeudState): FeudState {
  if (!s.tournament) return s;
  const tournament = s.tournament;
  if (tournament.questionInMatch + 1 === tournament.questionsPerRound) {
    const match = activeMatch(s)!;
    const [a, b] = match.families as [string, string];
    if ((match.scores[a] ?? 0) === (match.scores[b] ?? 0))
      return {
        ...s,
        phase: "match_tie",
        deadline: undefined,
        notice:
          "Match tied. The host must decide a tie-break winner; no question is repeated.",
      };
    return completeMatch(
      s,
      (match.scores[a] ?? 0) > (match.scores[b] ?? 0) ? a : b,
    );
  }
  return resetBoard(s, {
    ...tournament,
    questionInMatch: tournament.questionInMatch + 1,
  });
}
function resetBoard(s: FeudState, tournament: FeudTournament): FeudState {
  const match = tournament.matches.find(
    (m) => m.id === tournament.activeMatchId,
  )!;
  return {
    ...s,
    tournament,
    round: s.round + 1,
    opponents: match.families.filter((id): id is string => Boolean(id)),
    control: undefined,
    stealing: undefined,
    winner: undefined,
    revealed: [],
    strikes: 0,
    bank: 0,
    phase: "faceoff",
    deadline: undefined,
    multiplier: 1,
    notice: `Round ${match.stage}: face-off!`,
  };
}
export function nextTournamentMatch(s: FeudState): FeudState {
  if (s.phase !== "match_complete" || !s.tournament) return s;
  const match = s.tournament.matches.find((m) => m.status === "ready");
  if (!match) return s;
  return resetBoard(s, {
    ...s.tournament,
    activeMatchId: match.id,
    questionInMatch: 0,
  });
}
export function shuffleTournamentBoards(
  questions: FeudQuestion[],
  shuffle: boolean,
  random: () => number = Math.random,
): FeudQuestion[] {
  const boards = uniqueBoards(questions);
  if (shuffle)
    for (let i = boards.length - 1; i > 0; i--) {
      const j = Math.floor(random() * (i + 1));
      [boards[i], boards[j]] = [boards[j], boards[i]];
    }
  return boards;
}

export function startStandardState(
  s: FeudState,
  rounds: number,
  questionsPerRound: number,
): FeudState {
  if (
    !Number.isInteger(rounds) ||
    rounds < 1 ||
    !Number.isInteger(questionsPerRound) ||
    questionsPerRound < 1
  )
    throw new Error("Choose at least one round and one question per round.");
  const required = rounds * questionsPerRound,
    questions = uniqueBoards(s.questions);
  if (questions.length < required)
    throw new Error(
      `This game needs ${required} unique questions, but this selection has ${questions.length}. Reduce the number of rounds or questions per round.`,
    );
  return {
    ...s,
    tournament: undefined,
    standardRounds: { rounds, questionsPerRound },
    questions: questions.slice(0, required),
  };
}
