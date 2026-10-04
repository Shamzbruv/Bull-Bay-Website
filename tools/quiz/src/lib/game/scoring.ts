import type { Team } from '../../types/game';

export interface Standing {
  team: Team;
  score: number;
  rank: number;
}

export function computeStandings(teams: Team[], scores: Record<string, number>): Standing[] {
  const sorted = [...teams].sort((a, b) => (scores[b.id] ?? 0) - (scores[a.id] ?? 0));
  let rank = 0;
  let lastScore: number | null = null;
  return sorted.map((team, i) => {
    const score = scores[team.id] ?? 0;
    if (score !== lastScore) {
      rank = i + 1;
      lastScore = score;
    }
    return { team, score, rank };
  });
}

export interface WinnerResult {
  winnerTeamId?: string;
  tied: boolean;
  tiedTeamIds: string[];
}

export function determineWinner(teams: Team[], scores: Record<string, number>): WinnerResult {
  if (teams.length === 0) return { tied: false, tiedTeamIds: [] };
  const topScore = Math.max(...teams.map((t) => scores[t.id] ?? 0));
  const leaders = teams.filter((t) => (scores[t.id] ?? 0) === topScore);
  if (leaders.length === 1) {
    return { winnerTeamId: leaders[0].id, tied: false, tiedTeamIds: [] };
  }
  return { tied: true, tiedTeamIds: leaders.map((t) => t.id) };
}
