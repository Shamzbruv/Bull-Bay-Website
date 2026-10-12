import type { FeudQuestion } from "./questions";
export interface Family {
  id: string;
  name: string;
  members: string;
  score: number;
}
export type FeudPhase = "faceoff" | "play" | "steal" | "settled" | "finished";
export interface FeudState {
  id: string;
  families: Family[];
  questions: FeudQuestion[];
  round: number;
  opponents: string[];
  control?: string;
  stealing?: string;
  phase: FeudPhase;
  revealed: number[];
  strikes: number;
  multiplier: number;
  bank: number;
  winner?: string;
  deadline?: number;
  notice: string;
}
export type FeudAction =
  | { type: "opponent"; slot: number; id: string }
  | { type: "control"; id: string }
  | { type: "reveal"; index: number }
  | { type: "strike" }
  | { type: "stealer"; id: string }
  | { type: "award"; id: string }
  | { type: "stealFailed" }
  | { type: "showAll" }
  | { type: "next" }
  | { type: "multiplier"; value: number }
  | { type: "timer"; deadline?: number }
  | { type: "adjust"; id: string; points: number }
  | { type: "finish" };
export function newFeud(
  names: { name: string; members: string }[],
  questions: FeudQuestion[],
  id: string,
): FeudState {
  if (names.length < 2 || names.length > 12 || !questions.length)
    throw new Error("Add 2–12 families and at least one board.");
  if (
    names.some((n) => !n.name.trim()) ||
    new Set(names.map((n) => n.name.trim().toLowerCase())).size !== names.length
  )
    throw new Error("Give each family a unique name.");
  const families = names.map((n, i) => ({
    id: `family-${i}`,
    name: n.name.trim(),
    members: n.members.trim(),
    score: 0,
  }));
  return {
    id,
    families,
    questions,
    round: 0,
    opponents: families.slice(0, 2).map((f) => f.id),
    phase: "faceoff",
    revealed: [],
    strikes: 0,
    multiplier: 1,
    bank: 0,
    notice: "Face-off! The host chooses which family plays or passes.",
  };
}
function award(s: FeudState, id: string): FeudState {
  if (!s.families.some((f) => f.id === id)) return s;
  return {
    ...s,
    families: s.families.map((f) =>
      f.id === id ? { ...f, score: f.score + s.bank } : f,
    ),
    phase: "settled",
    winner: id,
    deadline: undefined,
    notice: `${s.families.find((f) => f.id === id)!.name} wins ${s.bank} points!`,
  };
}
export function feudReducer(s: FeudState, action: FeudAction): FeudState {
  const q = s.questions[s.round];
  switch (action.type) {
    case "opponent": {
      if (
        s.phase !== "faceoff" ||
        s.revealed.length ||
        ![0, 1].includes(action.slot) ||
        !s.families.some((f) => f.id === action.id) ||
        s.opponents[1 - action.slot] === action.id
      )
        return s;
      const opponents = [...s.opponents];
      opponents[action.slot] = action.id;
      return { ...s, opponents };
    }
    case "control":
      if (s.phase !== "faceoff" || !s.opponents.includes(action.id)) return s;
      return {
        ...s,
        phase: "play",
        control: action.id,
        notice: `${s.families.find((f) => f.id === action.id)!.name} has control.`,
        deadline: undefined,
      };
    case "reveal": {
      if (
        !["faceoff", "play", "steal"].includes(s.phase) ||
        !q.answers[action.index] ||
        s.revealed.includes(action.index)
      )
        return s;
      const next = {
        ...s,
        revealed: [...s.revealed, action.index],
        bank: s.bank + q.answers[action.index].points * s.multiplier,
        deadline: undefined,
        notice: "Correct answer!",
      };
      return s.phase === "steal" && s.stealing ? award(next, s.stealing) : next;
    }
    case "strike": {
      if (
        s.phase !== "play" ||
        s.strikes >= 3 ||
        s.revealed.length === q.answers.length
      )
        return s;
      const strikes = s.strikes + 1;
      return {
        ...s,
        strikes,
        phase: strikes === 3 ? "steal" : "play",
        stealing:
          strikes === 3
            ? s.opponents.find((id) => id !== s.control)
            : undefined,
        deadline: undefined,
        notice:
          strikes === 3
            ? "Three strikes! One answer to steal the bank."
            : "Incorrect answer — strike!",
      };
    }
    case "stealer":
      return s.phase === "steal" &&
        action.id !== s.control &&
        s.families.some((f) => f.id === action.id)
        ? { ...s, stealing: action.id }
        : s;
    case "stealFailed":
      return s.phase === "steal" && s.control ? award(s, s.control) : s;
    case "award":
      return s.phase === "play" && action.id === s.control
        ? award(s, action.id)
        : s;
    case "showAll":
      return s.phase === "settled"
        ? { ...s, revealed: q.answers.map((_, i) => i) }
        : s;
    case "multiplier":
      return s.phase === "faceoff" &&
        !s.revealed.length &&
        [1, 2, 3].includes(action.value)
        ? { ...s, multiplier: action.value }
        : s;
    case "timer":
      return ["faceoff", "play", "steal"].includes(s.phase)
        ? { ...s, deadline: action.deadline }
        : s;
    case "adjust":
      return Number.isFinite(action.points) && Number.isInteger(action.points)
        ? {
            ...s,
            families: s.families.map((f) =>
              f.id === action.id
                ? { ...f, score: Math.max(0, f.score + action.points) }
                : f,
            ),
          }
        : s;
    case "finish":
      return {
        ...s,
        phase: "finished",
        deadline: undefined,
        notice: "Final standings",
      };
    case "next": {
      if (s.phase !== "settled") return s;
      if (s.round + 1 === s.questions.length)
        return { ...s, phase: "finished", notice: "Final standings" };
      const round = s.round + 1;
      return {
        ...s,
        round,
        opponents: [
          s.families[round % s.families.length].id,
          s.families[(round + 1) % s.families.length].id,
        ],
        control: undefined,
        stealing: undefined,
        winner: undefined,
        phase: "faceoff",
        revealed: [],
        strikes: 0,
        bank: 0,
        multiplier: round >= 8 ? 3 : round >= 4 ? 2 : 1,
        deadline: undefined,
        notice: "Face-off! The host chooses which family plays or passes.",
      };
    }
  }
}
/** Send only the current prompt and answers explicitly revealed by the host. */
export function feudPresenter(s: FeudState) {
  const q = s.questions[s.round];
  return {
    id: s.id,
    families: s.families,
    round: s.round,
    total: s.questions.length,
    phase: s.phase,
    opponents: s.opponents,
    control: s.control,
    stealing: s.stealing,
    strikes: s.strikes,
    multiplier: s.multiplier,
    bank: s.bank,
    deadline: s.deadline,
    notice: s.notice,
    prompt: q.prompt,
    answers: q.answers.map((a, i) =>
      s.revealed.includes(i)
        ? { text: a.text, points: a.points, reference: a.reference }
        : null,
    ),
  };
}
export type FeudPresenter = ReturnType<typeof feudPresenter>;
