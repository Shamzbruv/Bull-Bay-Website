import { useEffect, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { AppShell } from "../components/layout/AppShell";
import { ChurchLogo } from "../components/brand/ChurchLogo";
import { useSettingsStore } from "../state/settingsStore";
import { soundManager } from "../lib/sound/soundManager";
import { GENERAL_BIBLE, FEUD_CATEGORIES } from "../lib/feud/general-bible";
import { FAMILY_FUSION } from "../lib/feud/family-fusion";
import {
  startTournamentState,
  startStandardState,
  requiredKnockoutRounds,
  tournamentQuestionDemand,
  shuffleTournamentBoards,
  uniqueBoards,
} from "../lib/feud/tournament";
import { feudPresenter, feudReducer, newFeud } from "../lib/feud/engine";
import type { FeudAction, FeudPresenter, FeudState } from "../lib/feud/engine";
import "./family-feud.css";

const SAVE_KEY = "bbntcog-family-feud-v1";
const channelName = (id: string) => `bbntcog-family-feud-${id}`;
function loadGame(): FeudState | null {
  try {
    const saved = JSON.parse(
      localStorage.getItem(SAVE_KEY) ?? "null",
    ) as FeudState | null;
    if (
      saved?.id &&
      saved.families.length >= 2 &&
      saved.questions[saved.round]?.answers.length
    )
      return saved;
  } catch {
    /* A fresh game is available if the browser's save is damaged. */
  }
  return null;
}
function useClock() {
  const [now, setNow] = useState(Date.now);
  useEffect(() => {
    const tick = window.setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(tick);
  }, []);
  return now;
}
function Board({ state }: { state: FeudPresenter }) {
  const now = useClock();
  const highlightedFamily =
    state.phase === "finished"
      ? (state.tournament?.championId ?? state.control)
      : state.phase === "match_complete"
        ? state.currentMatch?.winnerId
        : state.control;
  const seconds = state.deadline
    ? Math.max(0, Math.ceil((state.deadline - now) / 1000))
    : null;
  const standings = [...state.families].sort((a, b) => b.score - a.score);
  const leaders = state.tournament?.championId
    ? state.families.filter((f) => f.id === state.tournament!.championId)
    : standings.filter((f) => f.score === standings[0].score);
  return (
    <section className="ff-stage" aria-label="Family Feud audience board">
      <header className="ff-title">
        <ChurchLogo size="sm" />
        <div>
          <small>
            {state.packId === "family-fusion"
              ? "FAMILY FUSION NIGHT · BBNTCOG"
              : "BULL BAY NTCOG · BIBLE GAME NIGHT"}
          </small>
          <h1>
            FAMILY <span>FEUD</span>
          </h1>
        </div>
        <div className="ff-round">
          {state.packTitle}
          <small>
            Board {state.round + 1} / {state.total}
          </small>
        </div>
      </header>
      <div className="ff-scoreboard">
        {state.families.map((f) => (
          <div
            key={f.id}
            className={`ff-score ${highlightedFamily === f.id ? "ff-active" : ""} ${state.stealing === f.id && state.phase === "steal" ? "ff-stealing" : ""}`}
          >
            <span>{f.name}</span>
            <strong>{f.score}</strong>
            {highlightedFamily === f.id && (
              <small>
                {state.phase === "finished" && state.tournament?.championId
                  ? "CHAMPION"
                  : state.phase === "match_complete"
                    ? "MATCH WINNER"
                    : state.phase === "settled"
                      ? "BOARD WINNER"
                      : "IN CONTROL"}
              </small>
            )}
            {state.stealing === f.id && state.phase === "steal" && (
              <small>STEAL ATTEMPT</small>
            )}
          </div>
        ))}
      </div>
      {state.standardRounds && (
        <p className="ff-tournament-banner">
          Standard game · Round{" "}
          {Math.floor(state.round / state.standardRounds.questionsPerRound) + 1}{" "}
          / {state.standardRounds.rounds} · Question{" "}
          {(state.round % state.standardRounds.questionsPerRound) + 1} /{" "}
          {state.standardRounds.questionsPerRound}
        </p>
      )}
      {state.tournament && (
        <div className="ff-tournament-banner">
          <strong>
            Knockout round {state.currentMatch?.stage} /{" "}
            {state.tournament.rounds} · Question{" "}
            {state.tournament.questionInMatch + 1} /{" "}
            {state.tournament.questionsPerRound}
          </strong>
          <p>
            {state.currentMatch?.families
              .filter(Boolean)
              .map(
                (id) =>
                  `${state.families.find((f) => f.id === id)?.name}: ${state.currentMatch?.scores[id!] ?? 0}`,
              )
              .join(" vs ")}{" "}
            · MATCH SCORES
          </p>
        </div>
      )}
      {state.phase === "finished" ? (
        <div className="ff-final">
          <span>🏆</span>
          <h2>
            {leaders.length > 1 ? "Tied champions" : "Tonight’s champions"}
          </h2>
          <h3>{leaders.map((f) => f.name).join(" & ")}</h3>
          <p>
            {state.tournament?.championId
              ? "Knockout tournament winner"
              : `${standings[0].score} points`}
          </p>
          <ol>
            {standings.map((f) => (
              <li key={f.id}>
                <span>{f.name}</span>
                <strong>{f.score}</strong>
              </li>
            ))}
          </ol>
        </div>
      ) : (
        <>
          <div className="ff-status">
            <span>
              {state.phase === "faceoff"
                ? "FACE-OFF"
                : state.phase === "steal"
                  ? "STEAL THE BOARD"
                  : state.phase === "settled"
                    ? "BOARD COMPLETE"
                    : state.phase === "match_complete"
                      ? "MATCH COMPLETE"
                      : state.phase === "match_tie"
                        ? "TIE BREAK"
                        : "LET’S PLAY"}
            </span>
            <span>
              ROUND BANK <b>{state.bank}</b> · {state.multiplier}× POINTS
            </span>
            {seconds !== null && (
              <span role="timer" className={seconds === 0 ? "ff-time-up" : ""}>
                {seconds === 0 ? "TIME’S UP" : `${seconds}s`}
              </span>
            )}
          </div>
          <h2 className="ff-question">{state.prompt}</h2>
          <div className="ff-answers">
            {state.answers.map((answer, i) => (
              <div
                key={`${state.round}-${i}`}
                className={`ff-answer ${answer ? "ff-revealed" : ""}`}
              >
                <b className="ff-number">{i + 1}</b>
                {answer ? (
                  <>
                    <span>
                      {answer.text}
                      {state.packId !== "family-fusion" && (
                        <small>{answer.reference}</small>
                      )}
                    </span>
                    <strong>{answer.points * state.multiplier}</strong>
                  </>
                ) : (
                  <span
                    className="ff-hidden"
                    aria-label={`Answer ${i + 1} hidden`}
                  >
                    ••••••••
                  </span>
                )}
              </div>
            ))}
          </div>
          <div className="ff-strikes" aria-label={`${state.strikes} strikes`}>
            {[1, 2, 3].map((n) => (
              <span key={n} className={state.strikes >= n ? "ff-struck" : ""}>
                ✕
              </span>
            ))}
          </div>
          <p className="ff-notice" aria-live="polite">
            {state.notice}
          </p>
        </>
      )}
      <footer className="ff-footnote">
        {state.packId === "family-fusion"
          ? "Family Fusion · Illustrative scores, not actual survey results"
          : "Direct Bible answers · Host reveals the board · Game points, not survey results"}
      </footer>
    </section>
  );
}

export function FamilyFeud() {
  const [game, setGame] = useState<FeudState | null>(loadGame);
  const [families, setFamilies] = useState([
    { name: "", members: "" },
    { name: "", members: "" },
  ]);
  const [error, setError] = useState("");
  const [timerSeconds, setTimerSeconds] = useState(60);
  const [packId, setPackId] = useState("family-fusion");
  const [category, setCategory] = useState("all");
  const [questionsPerRound, setQuestionsPerRound] = useState(2);
  const [gameFormat, setGameFormat] = useState("standard");
  const [totalRounds, setTotalRounds] = useState(3);
  const minimumRounds = requiredKnockoutRounds(families.length);
  const effectiveRounds =
    gameFormat === "tournament"
      ? Math.max(totalRounds, minimumRounds)
      : totalRounds;
  const pack = packId === "family-fusion" ? FAMILY_FUSION : GENERAL_BIBLE;
  const categories =
    packId === "family-fusion"
      ? Object.fromEntries(
          [...new Set(pack.map((q) => q.category!))].map((c) => [
            c,
            c.replaceAll("-", " "),
          ]),
        )
      : FEUD_CATEGORIES;
  const pool = uniqueBoards(
    pack.filter((q) => category === "all" || q.category === category),
  );
  const available = pool.length;
  const selectedCount =
    gameFormat === "tournament"
      ? tournamentQuestionDemand(families.length, questionsPerRound)
      : effectiveRounds * questionsPerRound;
  const [shuffle, setShuffle] = useState(true);
  const [adjustFamily, setAdjustFamily] = useState("");
  const [adjustPoints, setAdjustPoints] = useState(10);
  const sound = useSettingsStore((s) => s.soundEnabled);
  const setSound = useSettingsStore((s) => s.setSoundEnabled);
  const [history, setHistory] = useState<FeudState[]>([]);
  const channel = useRef<BroadcastChannel | null>(null);
  const current = useRef(game);
  const now = useClock();
  useEffect(() => {
    current.current = game;
  }, [game]);
  const gameId = game?.id;
  useEffect(() => {
    if (!gameId) return;
    const bus = new BroadcastChannel(channelName(gameId));
    channel.current = bus;
    const send = () => {
      if (current.current)
        bus.postMessage({
          type: "state",
          state: feudPresenter(current.current),
        });
    };
    bus.onmessage = (e) => {
      if (e.data?.type === "ready") send();
    };
    send();
    const heartbeat = setInterval(send, 2000);
    return () => {
      clearInterval(heartbeat);
      bus.close();
      channel.current = null;
    };
  }, [gameId]);
  useEffect(() => {
    try {
      if (game) localStorage.setItem(SAVE_KEY, JSON.stringify(game));
      else localStorage.removeItem(SAVE_KEY);
    } catch {
      queueMicrotask(() =>
        setError(
          "Browser storage is unavailable. Keep this host tab open to retain your game.",
        ),
      );
    }
    if (game)
      channel.current?.postMessage({
        type: "state",
        state: feudPresenter(game),
      });
  }, [game]);
  const expired = useRef<number | undefined>(undefined);
  useEffect(() => {
    if (
      game?.deadline &&
      now >= game.deadline &&
      expired.current !== game.deadline
    ) {
      expired.current = game.deadline;
      if (sound) soundManager.play("time-up");
    }
  }, [now, game?.deadline, sound]);
  function dispatch(action: FeudAction) {
    if (!game) return;
    const next = feudReducer(game, action);
    if (next === game) return;
    setHistory([...history.slice(-49), game]);
    setGame(next);
    if (sound)
      soundManager.play(
        action.type === "reveal"
          ? "correct"
          : action.type === "strike" || action.type === "stealFailed"
            ? "feud-strike"
            : next.phase === "finished"
              ? "winner"
              : action.type === "award"
                ? "score-up"
                : "click",
      );
  }
  function testStrikeSound() {
    setSound(true);
    soundManager.setEnabled(true);
    const volume = useSettingsStore.getState().volume;
    if (volume === 0) useSettingsStore.getState().setVolume(0.6);
    soundManager.setVolume(volume || 0.6);
    soundManager.play("feud-strike");
  }
  function start() {
    try {
      setGame(
        (gameFormat === "tournament"
          ? startTournamentState
          : startStandardState)(
          {
            ...newFeud(
              families,
              shuffleTournamentBoards(pool, shuffle),
              crypto.randomUUID(),
            ),
            packId,
            packTitle:
              packId === "family-fusion"
                ? "Family Fusion · Church Edition"
                : "General Bible · Open Bible",
          },
          effectiveRounds,
          questionsPerRound,
        ),
      );
      setHistory([]);
      setError("");
      if (sound) soundManager.play("intro");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not start the game.");
    }
  }
  function openDisplay() {
    if (!game) return;
    const url = `${import.meta.env.BASE_URL}feud/${game.id}/display`;
    if (!window.open(url, "bbntcog-feud-display"))
      setError("Allow pop-ups or use the audience display link below.");
  }
  if (!game)
    return (
      <AppShell>
        <div className="ff-setup">
          <Link to="/">← Quiz Night</Link>
          <p className="ff-eyebrow">A NEW WAY TO PLAY</p>
          <h1>Family Feud</h1>
          <p className="ff-lead">
            Choose a game format, a question pack, and your families.
          </p>
          <div className="ff-pack">
            <strong>
              {gameFormat === "tournament"
                ? "KNOCKOUT TOURNAMENT"
                : "STANDARD FAMILY FEUD"}
            </strong>
            <p className="text-3xl font-black text-white" role="status">
              {effectiveRounds} {effectiveRounds === 1 ? "round" : "rounds"} ·{" "}
              {questionsPerRound}{" "}
              {gameFormat === "tournament"
                ? "questions per match"
                : "questions per round"}{" "}
              · {selectedCount} unique questions
            </p>
            <p>
              {gameFormat === "tournament"
                ? "Families play in the order entered: first two, then the next two. Match winners advance to play each other. Match scores reset; total points remain visible."
                : "Everyone stays in the game. Scores carry across rounds, and the family with the highest total wins."}
            </p>
          </div>
          <div className="ff-game-options">
            <label>
              Game format
              <select
                value={gameFormat}
                onChange={(e) => {
                  setGameFormat(e.target.value);
                  setTotalRounds(
                    e.target.value === "tournament" ? minimumRounds : 3,
                  );
                }}
              >
                <option value="standard">
                  Standard game · highest total score wins
                </option>
                <option value="tournament">
                  Tournament · winners advance to the final
                </option>
              </select>
            </label>
            <label>
              Question pack
              <select
                value={packId}
                onChange={(e) => {
                  setPackId(e.target.value);
                  setCategory("all");
                }}
              >
                <option value="family-fusion">
                  Family Fusion PowerPoint · 26 unique questions
                </option>
                <option value="general-bible">
                  Saved general Bible bank · 60 questions
                </option>
              </select>
            </label>
            <label>
              Tonight’s category
              <select
                value={category}
                onChange={(event) => setCategory(event.target.value)}
              >
                <option value="all">All categories</option>
                {Object.entries(categories).map(([id, title]) => (
                  <option key={id} value={id}>
                    {title} · {pack.filter((q) => q.category === id).length}{" "}
                    questions
                  </option>
                ))}
              </select>
            </label>
            <label>
              {gameFormat === "tournament"
                ? "Questions per match"
                : "Questions per round"}
              <input
                type="number"
                min={1}
                max={available}
                value={questionsPerRound}
                onChange={(e) =>
                  setQuestionsPerRound(Math.max(1, Number(e.target.value) || 1))
                }
              />
            </label>
            <label>
              {gameFormat === "tournament"
                ? "Rounds until the tournament ends"
                : "Rounds until the game ends"}
              <select
                value={effectiveRounds}
                onChange={(e) => setTotalRounds(Number(e.target.value))}
              >
                {(gameFormat === "tournament"
                  ? [1, 2, 3, 4]
                  : [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]
                ).map((n) => (
                  <option
                    key={n}
                    value={n}
                    disabled={gameFormat === "tournament" && n < minimumRounds}
                  >
                    {n} {gameFormat === "tournament" ? "knockout " : ""}
                    {n === 1 ? "round" : "rounds"}
                    {gameFormat === "tournament"
                      ? ` · up to ${2 ** n} families`
                      : ""}
                  </option>
                ))}
              </select>
            </label>
            {gameFormat === "tournament" && (
              <div className="ff-tournament-preview">
                <p>
                  {families.length} families need at least {minimumRounds}{" "}
                  knockout {minimumRounds === 1 ? "round" : "rounds"}. Empty
                  slots receive byes.
                </p>
                <ol>
                  {Array.from(
                    { length: Math.ceil(families.length / 2) },
                    (_, i) => (
                      <li key={i}>
                        First round, match {i + 1}:{" "}
                        {families[i * 2]?.name || `Family ${i * 2 + 1}`} vs{" "}
                        {families[i * 2 + 1]?.name || "Bye"}
                      </li>
                    ),
                  )}
                </ol>
                <p>
                  {families.length === 4
                    ? "Final: winner of match 1 vs winner of match 2."
                    : "The winners advance until the final two families meet."}
                </p>
              </div>
            )}
            <label className="ff-shuffle">
              <input
                type="checkbox"
                checked={shuffle}
                onChange={(event) => setShuffle(event.target.checked)}
              />{" "}
              Shuffle questions for a fresh game
            </label>
            <p>
              {available} questions available; {selectedCount} needed
              {gameFormat === "tournament"
                ? ` across ${families.length - 1} matches`
                : ` across ${effectiveRounds} rounds`}
              . No repeated questions.
            </p>
            {selectedCount > available && (
              <p role="alert">
                Not enough questions. Reduce questions per round, remove
                families, or choose another category or pack.
              </p>
            )}
            <Link to="/quizzes/1-kings-chapter-3">
              Looking for 1 Kings 3? It is now a regular quiz →
            </Link>
          </div>
          <div className="ff-actions">
            <button onClick={testStrikeSound}>Test X sound ✕</button>
            <button onClick={() => setSound(!sound)}>
              Sound {sound ? "on" : "off"}
            </button>
          </div>
          <p>
            Wrong answers and failed steals play the X buzzer when sound is on.
          </p>
          <h2>Who’s playing?</h2>
          <p>
            Add 2–12 families. Each match has two families. Winners advance
            through the bracket.
          </p>
          <div className="ff-family-inputs">
            {families.map((f, i) => (
              <div key={i}>
                <label>
                  Family name
                  <input
                    aria-label={`Family name ${i + 1}`}
                    placeholder="e.g. Baker family"
                    required
                    maxLength={40}
                    value={f.name}
                    onChange={(e) =>
                      setFamilies(
                        families.map((v, n) =>
                          n === i ? { ...v, name: e.target.value } : v,
                        ),
                      )
                    }
                  />
                </label>
                <label>
                  Members <small>(optional)</small>
                  <input
                    maxLength={160}
                    placeholder="Names, separated by commas"
                    value={f.members}
                    onChange={(e) =>
                      setFamilies(
                        families.map((v, n) =>
                          n === i ? { ...v, members: e.target.value } : v,
                        ),
                      )
                    }
                  />
                </label>
                <button
                  disabled={families.length <= 2}
                  onClick={() =>
                    setFamilies(families.filter((_, n) => n !== i))
                  }
                >
                  Remove
                </button>
              </div>
            ))}
          </div>
          <div className="ff-actions">
            <button
              disabled={families.length >= 12}
              onClick={() =>
                setFamilies([...families, { name: "", members: "" }])
              }
            >
              + Add family
            </button>
            <button
              className="ff-primary"
              disabled={selectedCount > available}
              onClick={start}
            >
              Take the stage →
            </button>
          </div>
          {error && <p role="alert">{error}</p>}
          <div className="ff-rules">
            <h2>You are the Quizmaster</h2>
            <ol>
              <li>
                Read the prompt to the families in the current match. Judge
                their answers and reveal matching tiles.
              </li>
              <li>
                Give board control to the winning family, or the other family if
                they pass.
              </li>
              <li>
                Three wrong answers open a steal. A correct steal wins the bank;
                a failed steal gives it to the controlling family.
              </li>
              <li>
                Use 1×, 2× or 3× points. Reveal remaining answers after awarding
                the round. Undo any mistaken host action.
              </li>
            </ol>
            <p>
              Open the audience screen on a second monitor from this same
              browser and computer. Keep the host console on your own screen.
            </p>
          </div>
        </div>
      </AppShell>
    );
  const q = game.questions[game.round];
  const canPlay = ["faceoff", "play", "steal"].includes(game.phase);
  return (
    <AppShell>
      <div className="ff-host">
        {!game.packTitle && (
          <div className="ff-pack">
            <strong>This saved game uses the previous 1 Kings 3 pack.</strong>
            <p>
              That pack is now a regular quiz in the Quiz Library. Start a new
              game to play general Bible Family Feud.
            </p>
            <div className="ff-actions">
              <Link to="/quizzes/1-kings-chapter-3">
                Open the 1 Kings 3 quiz
              </Link>
              <button
                onClick={() => {
                  if (
                    confirm(
                      "Start a general Bible game? This resets the saved round and scores but keeps the family names.",
                    )
                  ) {
                    setFamilies(
                      game.families.map((f) => ({
                        name: f.name,
                        members: f.members,
                      })),
                    );
                    setGame(null);
                    setHistory([]);
                  }
                }}
              >
                Set up general Bible Family Feud
              </button>
            </div>
          </div>
        )}
        {!game.tournament && !game.standardRounds && (
          <div className="ff-pack">
            <strong>This is a saved standard game.</strong>
            <p>
              Your existing scores are preserved. Start a new knockout
              tournament to use rounds and elimination.
            </p>
            <button
              onClick={() => {
                if (
                  confirm(
                    "Set up a new tournament? This replaces the saved game but keeps family names.",
                  )
                ) {
                  setFamilies(
                    game.families.map((f) => ({
                      name: f.name,
                      members: f.members,
                    })),
                  );
                  setGame(null);
                  setHistory([]);
                }
              }}
            >
              Set up knockout tournament
            </button>
          </div>
        )}
        <header className="ff-host-title">
          <div>
            <Link to="/">← Quiz Night</Link>
            <h1>Quizmaster console</h1>
            <p>Format: {game.tournament ? "Tournament" : "Standard game"}</p>
            <p>
              Only you reveal answers. Show the audience window on the
              projector.
            </p>
          </div>
          <div className="ff-actions">
            <button
              onClick={() =>
                document
                  .getElementById("ff-edit-names")
                  ?.setAttribute("open", "")
              }
            >
              Edit family names
            </button>
            <button
              onClick={() => {
                if (
                  confirm(
                    "Set up a new game and choose a format? This resets scores but keeps family names.",
                  )
                ) {
                  setFamilies(
                    game.families.map((f) => ({
                      name: f.name,
                      members: f.members,
                    })),
                  );
                  setGame(null);
                  setHistory([]);
                }
              }}
            >
              New game / choose format
            </button>
            <button onClick={openDisplay}>Open audience screen ↗</button>
            <button
              onClick={() => {
                setSound(!sound);
              }}
            >
              Sound {sound ? "on" : "off"}
            </button>
            <button onClick={testStrikeSound}>Test X sound ✕</button>
            <button
              disabled={!history.length}
              onClick={() => {
                const prev = history.at(-1);
                if (prev) {
                  setHistory(history.slice(0, -1));
                  setGame({ ...prev, deadline: undefined });
                }
              }}
            >
              Undo
            </button>
          </div>
        </header>
        {error && <p role="alert">{error}</p>}
        <a
          target="bbntcog-feud-display"
          href={`${import.meta.env.BASE_URL}feud/${game.id}/display`}
        >
          Audience display link
        </a>
        <div className="ff-host-layout">
          <Board state={feudPresenter(game)} />
          <aside className="ff-controls">
            <h2>Host controls</h2>
            <p>
              {game.packId === "family-fusion"
                ? "Use the answer list from the PowerPoint. You decide equivalent wording."
                : "Open Bible game · Families may look up their answers. You control the pace."}
            </p>
            {game.phase === "faceoff" && (
              <>
                <details className="ff-faceoff-settings">
                  <summary>Face-off families & points</summary>
                  {game.opponents.map((id, slot) => (
                    <label key={slot}>
                      {game.families.find((family) => family.id === id)?.name}
                      <select
                        value={id}
                        disabled={
                          Boolean(game.tournament) || game.revealed.length > 0
                        }
                        onChange={(e) =>
                          dispatch({
                            type: "opponent",
                            slot,
                            id: e.target.value,
                          })
                        }
                      >
                        {game.families.map((f) => (
                          <option
                            key={f.id}
                            value={f.id}
                            disabled={game.opponents[1 - slot] === f.id}
                          >
                            {f.name}
                          </option>
                        ))}
                      </select>
                    </label>
                  ))}
                  <label>
                    Round multiplier
                    <select
                      value={game.multiplier}
                      disabled={game.revealed.length > 0}
                      onChange={(e) =>
                        dispatch({
                          type: "multiplier",
                          value: Number(e.target.value),
                        })
                      }
                    >
                      {[1, 2, 3].map((n) => (
                        <option key={n} value={n}>
                          {n}× points
                        </option>
                      ))}
                    </select>
                  </label>
                </details>
                <p>
                  Reveal face-off answers below, then choose who plays. If the
                  winner passes, give control to the opponent.
                </p>
                {game.opponents.map((id) => (
                  <button
                    key={id}
                    onClick={() => dispatch({ type: "control", id })}
                  >
                    Let {game.families.find((f) => f.id === id)?.name} play
                  </button>
                ))}
              </>
            )}
            {game.phase === "play" && (
              <>
                <button
                  className="ff-danger"
                  disabled={game.revealed.length === q.answers.length}
                  onClick={() => dispatch({ type: "strike" })}
                >
                  ✕ Wrong answer / strike
                </button>
                <button
                  className="ff-primary"
                  onClick={() => dispatch({ type: "award", id: game.control! })}
                >
                  Award bank to controlling family
                </button>
                <p>
                  {game.revealed.length === q.answers.length
                    ? "Board cleared! Award the bank to finish the round."
                    : "Reveal a matching answer below or record a strike. Award early only when you choose to close the round."}
                </p>
              </>
            )}
            {game.phase === "steal" && (
              <>
                <label>
                  Family attempting the steal
                  <select
                    value={game.stealing}
                    onChange={(e) =>
                      dispatch({ type: "stealer", id: e.target.value })
                    }
                  >
                    {game.families
                      .filter(
                        (f) =>
                          f.id !== game.control &&
                          (!game.tournament || game.opponents.includes(f.id)),
                      )
                      .map((f) => (
                        <option key={f.id} value={f.id}>
                          {f.name}
                        </option>
                      ))}
                  </select>
                </label>
                <p>
                  One guess. Reveal a remaining answer for a successful steal;
                  it awards the bank automatically.
                </p>
                <button
                  className="ff-danger"
                  onClick={() => dispatch({ type: "stealFailed" })}
                >
                  Steal failed — award original family
                </button>
              </>
            )}
            {game.phase === "settled" && (
              <>
                <button onClick={() => dispatch({ type: "showAll" })}>
                  Reveal remaining answers (no extra points)
                </button>
                <button
                  className="ff-primary"
                  onClick={() => dispatch({ type: "next" })}
                >
                  {game.tournament
                    ? game.tournament.questionInMatch + 1 ===
                      game.tournament.questionsPerRound
                      ? "Finish match & advance winner"
                      : "Next question in this match →"
                    : game.round + 1 === game.questions.length
                      ? "Show final standings"
                      : "Next board →"}
                </button>
              </>
            )}
            {game.phase === "match_complete" && (
              <button
                className="ff-primary"
                onClick={() => dispatch({ type: "next_match" })}
              >
                Start next tournament match →
              </button>
            )}
            {game.phase === "match_tie" && (
              <div>
                <h3>Tie-break decision</h3>
                <p>
                  Match points are equal. Use a toss or another host decision;
                  no question is reused.
                </p>
                {game.opponents.map((id) => (
                  <button
                    key={id}
                    onClick={() => dispatch({ type: "tie_winner", id })}
                  >
                    Advance {game.families.find((f) => f.id === id)?.name}
                  </button>
                ))}
              </div>
            )}
            {game.tournament && (
              <details>
                <summary>Tournament bracket</summary>
                {game.tournament.matches.map((m) => (
                  <p key={m.id}>
                    Round {m.stage} / Match {m.slot + 1}:{" "}
                    {m.families
                      .map((id) =>
                        id
                          ? game.families.find((f) => f.id === id)?.name
                          : "Bye / awaiting winner",
                      )
                      .join(" vs ")}{" "}
                    · {m.status}
                    {m.winnerId &&
                      ` · Winner: ${game.families.find((f) => f.id === m.winnerId)?.name}`}
                  </p>
                ))}
              </details>
            )}
            {q.hostNote && (
              <p role="note" className="ff-source-note">
                Source deck note: {q.hostNote}
              </p>
            )}
            {canPlay && (
              <details className="ff-timer-controls">
                <summary>Answer timer</summary>
                <label>
                  Answer timer (seconds)
                  <input
                    type="number"
                    min={5}
                    max={120}
                    value={timerSeconds}
                    onChange={(e) =>
                      setTimerSeconds(
                        Math.max(
                          5,
                          Math.min(120, Number(e.target.value) || 20),
                        ),
                      )
                    }
                  />
                </label>
                <button
                  onClick={() =>
                    dispatch({
                      type: "timer",
                      deadline: Date.now() + timerSeconds * 1000,
                    })
                  }
                >
                  Start / restart timer
                </button>
                <button
                  disabled={!game.deadline}
                  onClick={() => dispatch({ type: "timer" })}
                >
                  Clear timer
                </button>
                <small>
                  The timer signals time up. You decide the strike or reveal.
                </small>
              </details>
            )}
            {game.phase !== "finished" && (
              <div className="ff-secret">
                <h3>Private answer key</h3>
                <p>Accept equivalent wording. Numbers are game points.</p>
                {q.answers.map((a, index) => (
                  <button
                    key={index}
                    disabled={!canPlay || game.revealed.includes(index)}
                    onClick={() => dispatch({ type: "reveal", index })}
                  >
                    <strong>
                      {index + 1}. {a.text}{" "}
                      <span>· {a.points * game.multiplier}</span>
                    </strong>
                    <small>
                      {a.reference}
                      {a.accept && ` · Accept: ${a.accept}`}
                    </small>
                    <span>
                      {game.revealed.includes(index)
                        ? "Revealed ✓"
                        : "Reveal answer"}
                    </span>
                  </button>
                ))}
              </div>
            )}
            <details id="ff-edit-names">
              <summary>Edit family names</summary>
              <form
                onSubmit={(event) => {
                  event.preventDefault();
                  const data = new FormData(event.currentTarget);
                  const names = Object.fromEntries(
                    game.families.map((family) => [
                      family.id,
                      String(data.get(family.id) ?? "").trim(),
                    ]),
                  );
                  if (
                    Object.values(names).some((name) => !name) ||
                    new Set(
                      Object.values(names).map((name) => name.toLowerCase()),
                    ).size !== game.families.length
                  ) {
                    setError("Enter a different family name for every family.");
                    return;
                  }
                  setError("");
                  dispatch({ type: "rename", names });
                }}
              >
                {game.families.map((family) => (
                  <label key={`${family.id}-${family.name}`}>
                    {family.name}
                    <input
                      name={family.id}
                      defaultValue={family.name}
                      maxLength={40}
                      required
                      aria-label={`Rename ${family.name}`}
                    />
                  </label>
                ))}
                <button type="submit">Save family names</button>
                <p>
                  Updates the scoreboard, face-off controls and audience screen
                  without resetting scores.
                </p>
              </form>
            </details>
            <details>
              <summary>Score correction & session</summary>
              <label>
                Family
                <select
                  value={adjustFamily || game.families[0].id}
                  onChange={(e) => setAdjustFamily(e.target.value)}
                >
                  {game.families.map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.name}
                      {f.members ? ` (${f.members})` : ""}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Points to add or subtract
                <input
                  type="number"
                  step={1}
                  value={adjustPoints}
                  onChange={(e) => setAdjustPoints(Number(e.target.value))}
                />
              </label>
              <button
                onClick={() =>
                  dispatch({
                    type: "adjust",
                    id: adjustFamily || game.families[0].id,
                    points: adjustPoints,
                  })
                }
              >
                Apply score correction
              </button>
              <button
                disabled={game.phase === "finished"}
                onClick={() => {
                  if (confirm("End the game now and show final standings?"))
                    dispatch({ type: "finish" });
                }}
              >
                End game early
              </button>
              <button
                onClick={() => {
                  if (
                    confirm(
                      "Replace this saved game and reset all family scores?",
                    )
                  ) {
                    setFamilies(
                      game.families.map((f) => ({
                        name: f.name,
                        members: f.members,
                      })),
                    );
                    setGame(null);
                    setHistory([]);
                  }
                }}
              >
                Set up a new game
              </button>
              <p>
                This game saves in this browser. Return to Family Feud to resume
                it.
              </p>
            </details>
          </aside>
        </div>
      </div>
    </AppShell>
  );
}

export function FamilyFeudDisplay() {
  const { gameId } = useParams();
  const [state, setState] = useState<FeudPresenter | null>(null);
  const [lastSync, setLastSync] = useState(0);
  const now = useClock();
  useEffect(() => {
    const bus = new BroadcastChannel(channelName(gameId ?? ""));
    bus.onmessage = (e) => {
      if (e.data?.type === "state" && e.data.state.id === gameId) {
        setState(e.data.state);
        setLastSync(Date.now());
      }
    };
    bus.postMessage({ type: "ready" });
    const retry = setInterval(() => bus.postMessage({ type: "ready" }), 2000);
    return () => {
      clearInterval(retry);
      bus.close();
    };
  }, [gameId]);
  return (
    <main className="ff-display">
      {state ? (
        <Board state={state} />
      ) : (
        <div className="ff-waiting">
          <ChurchLogo size="xl" />
          <h1>Family Feud</h1>
          <p>Waiting for the Quizmaster…</p>
          <p>Open the host console in this same browser on this computer.</p>
        </div>
      )}
      {state && now - lastSync > 6000 && (
        <p role="status" className="ff-connection">
          Host disconnected. Showing the last board — reopen the host console to
          continue.
        </p>
      )}
      <button
        className="ff-fullscreen"
        onClick={() => {
          if (document.fullscreenElement)
            void document.exitFullscreen().catch(() => {});
          else
            void document.documentElement.requestFullscreen().catch(() => {});
        }}
      >
        Fullscreen ⛶
      </button>
    </main>
  );
}
