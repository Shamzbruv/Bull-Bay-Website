import { useEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, ArrowRight, ExternalLink, Eye, EyeOff, Lightbulb } from 'lucide-react';
import { AppShell } from '../components/layout/AppShell';
import { createSession, currentPuzzle, projectPuzzle, puzzleCount, readSession, saveSession } from '../lib/puzzles/session';
import { puzzleChannel, puzzleModes, type PuzzleDisplayState, type PuzzleMode } from '../types/biblePuzzles';
import { PuzzleBoard } from './PuzzleDisplay';

export default function PuzzleHost() {
  const { mode } = useParams();
  if (mode !== 'unscramble' && mode !== 'pictures') {
    return <AppShell><div className="bp-host"><Link to="/">Back to Quiz Night</Link></div></AppShell>;
  }
  return <HostGame key={mode} mode={mode} />;
}

function HostGame({ mode }: { mode: PuzzleMode }) {
  const available = puzzleCount(mode);
  const [count, setCount] = useState(10);
  const [session, setSession] = useState(() => readSession(mode));
  const [storageAvailable, setStorageAvailable] = useState(true);
  const [peek, setPeek] = useState(false);
  const id = session?.id;
  const board = session ? projectPuzzle(mode, session) : null;
  const activePuzzle = session ? currentPuzzle(mode, session) : undefined;
  const audienceUrl = id ? `${import.meta.env.BASE_URL}puzzles/display/${id}` : undefined;
  const bus = useRef<BroadcastChannel | null>(null);
  const currentBoard = useRef<PuzzleDisplayState | null>(null);

  useEffect(() => {
    if (!id || typeof BroadcastChannel === 'undefined') return;
    const channel = new BroadcastChannel(puzzleChannel(id));
    bus.current = channel;
    channel.onmessage = ({ data }) => {
      if (data?.type === 'ready' && currentBoard.current) {
        channel.postMessage({ type: 'board', state: currentBoard.current });
      }
    };
    return () => {
      bus.current = null;
      channel.close();
    };
  }, [id]);

  useEffect(() => {
    if (!session) return;
    setStorageAvailable(saveSession(mode, session));
    currentBoard.current = projectPuzzle(mode, session);
    bus.current?.postMessage({ type: 'board', state: currentBoard.current });
  }, [mode, session]);

  function start() {
    setPeek(false);
    // A fresh deck stays connected to the projector already open for this game.
    setSession(createSession(mode, count, id ?? crypto.randomUUID()));
  }

  function move(amount: number) {
    setPeek(false);
    setSession((current) => current && {
      ...current,
      position: Math.max(0, Math.min(current.deck.length, current.position + amount)),
      hint: false,
      revealed: false,
    });
  }

  function toggleHint() {
    setSession((current) => current && { ...current, hint: !current.hint });
  }

  function toggleReveal() {
    setSession((current) => current && { ...current, revealed: !current.revealed });
  }

  return (
    <AppShell>
      <div className="bp-host">
        <Link className="bp-back" to="/"><ArrowLeft size={16} /> Quiz Night</Link>
        <h1>{puzzleModes[mode].title}</h1>
        <p>{puzzleModes[mode].instruction} The Quizmaster decides when the audience sees the answer.</p>
        {session && board ? (
          <>
            <div className="bp-host-grid">
              <PuzzleBoard state={board} />
              <aside className="bp-controls" aria-label="Quizmaster controls">
                <h2>Quizmaster controls</h2>
                {audienceUrl && (
                  <a className="bp-button" href={audienceUrl} target={`bbntcog-puzzles-${id}`}>
                    <ExternalLink size={17} /> Open audience display
                  </a>
                )}
                <p className="bp-note">Open the display in this browser, then move it to the projector and select Fullscreen.</p>
                {activePuzzle && (
                  <>
                    <button className="bp-button bp-reveal" onClick={toggleReveal}>
                      {session.revealed ? <EyeOff size={17} /> : <Eye size={17} />}
                      {session.revealed ? 'Hide answer' : 'Reveal answer'}
                    </button>
                    <button className="bp-button" onClick={toggleHint} aria-pressed={session.hint}>
                      <Lightbulb size={17} /> {session.hint ? 'Hide hint' : 'Show hint'}
                    </button>
                    <button className="bp-button" onClick={() => setPeek(!peek)} aria-expanded={peek} aria-controls="bp-private-answer">
                      {peek ? 'Close private answer' : 'Peek at answer privately'}
                    </button>
                    <div className="bp-private" id="bp-private-answer" hidden={!peek}>
                      <strong>{activePuzzle.answer}</strong>
                      {activePuzzle.reference && <span>{activePuzzle.reference}</span>}
                    </div>
                  </>
                )}
                <div className="bp-navigation">
                  <button className="bp-button" disabled={session.position === 0} onClick={() => move(-1)}>
                    <ArrowLeft size={17} /> Previous
                  </button>
                  <button className="bp-button" disabled={!activePuzzle} onClick={() => move(1)}>
                    {session.position === session.deck.length - 1 ? 'Finish' : 'Next'} <ArrowRight size={17} />
                  </button>
                </div>
                {!storageAvailable && <p role="status" className="bp-note">Keep this tab open to retain your game. Browser storage is unavailable.</p>}
                {typeof BroadcastChannel === 'undefined' && <p role="status" className="bp-note">This browser does not support the separate audience display.</p>}
              </aside>
            </div>
            <details className="bp-new-game" open={!activePuzzle || undefined}>
              <summary>New game</summary>
              <GameSetup available={available} count={count} setCount={setCount} start={start} />
            </details>
          </>
        ) : (
          <div className="bp-controls bp-setup">
            <h2>Set up a game</h2>
            <GameSetup available={available} count={count} setCount={setCount} start={start} />
          </div>
        )}
      </div>
    </AppShell>
  );
}

function GameSetup({ available, count, setCount, start }: {
  available: number;
  count: number;
  setCount: (count: number) => void;
  start: () => void;
}) {
  return (
    <div className="bp-game-setup">
      <label>
        Rounds
        <select value={count} onChange={(event) => setCount(Number(event.target.value))}>
          <option value={10}>10 rounds</option>
          <option value={20}>20 rounds</option>
          <option value={available}>All {available} rounds</option>
        </select>
      </label>
      <button className="bp-button bp-reveal" onClick={start}>Start shuffled game</button>
    </div>
  );
}
