import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { BackgroundScene } from '../components/brand/BackgroundScene';
import { ChurchLogo } from '../components/brand/ChurchLogo';
import { useFullscreen } from '../hooks/useFullscreen';
import { puzzleChannel, puzzleModes, type PuzzleDisplayState } from '../types/biblePuzzles';
import './bible-puzzles.css';

export function PuzzleBoard({ state }: { state: PuzzleDisplayState }) {
  const { clue, hint, solution } = state;
  return (
    <section className="bp-board" aria-label="Audience board">
      <header className="bp-board-heading">
        <span>{puzzleModes[state.mode].title}</span>
        <span>{state.round} / {state.total}</span>
      </header>
      {clue ? (
        <>
          <h2>{puzzleModes[state.mode].instruction}</h2>
          {clue.pictures ? (
            <div className="bp-pictures">
              {clue.pictures.map(([symbol, label], index) => (
                <span key={index} role="img" aria-label={label}>{symbol}</span>
              ))}
            </div>
          ) : (
            <div className="bp-letters" role="img" aria-label={clue.letters.split('').join(' ')}>
              {[...clue.letters].map((letter, index) => <span key={index} aria-hidden="true">{letter}</span>)}
            </div>
          )}
          <div className="bp-result" aria-live="polite">
            {solution ? (
              <>
                <strong>{solution.answer}</strong>
                {solution.reference && <p>{solution.reference}</p>}
              </>
            ) : hint ? <p><b>Hint</b> {hint}</p> : null}
          </div>
        </>
      ) : (
        <div className="bp-end">
          <ChurchLogo size="lg" />
          <h2>Game complete</h2>
          <p>You reached the end of the deck.</p>
        </div>
      )}
    </section>
  );
}

export function PuzzleDisplay() {
  const { id } = useParams();
  const [state, setState] = useState<PuzzleDisplayState | null>(null);
  const [connected, setConnected] = useState(false);
  const { isFullscreen, toggleFullscreen } = useFullscreen();

  useEffect(() => {
    if (!id || typeof BroadcastChannel === 'undefined') return;
    const bus = new BroadcastChannel(puzzleChannel(id));
    let disconnect: ReturnType<typeof setTimeout>;
    bus.onmessage = ({ data }) => {
      if (data?.type !== 'board' || !data.state) return;
      setState(data.state);
      setConnected(true);
      clearTimeout(disconnect);
      disconnect = setTimeout(() => setConnected(false), 6500);
    };
    const requestBoard = () => bus.postMessage({ type: 'ready' });
    requestBoard();
    const retry = setInterval(requestBoard, 2000);
    return () => {
      clearInterval(retry);
      clearTimeout(disconnect);
      bus.close();
    };
  }, [id]);

  return (
    <BackgroundScene variant="dark">
      <main className="bp-display" aria-label="Bible puzzles audience display">
        {state ? <PuzzleBoard state={state} /> : (
          <div className="bp-end">
            <ChurchLogo size="lg" />
            <h1>Waiting for the Quizmaster</h1>
            <p>Open the Quizmaster in the same browser on this computer.</p>
          </div>
        )}
        {state && !connected && <p className="bp-connection" role="status">Quizmaster disconnected. Reopen the host tab to continue.</p>}
        <button className="bp-fullscreen" onClick={toggleFullscreen}>{isFullscreen ? 'Exit fullscreen' : 'Fullscreen'}</button>
      </main>
    </BackgroundScene>
  );
}
