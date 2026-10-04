import { useEffect, useState } from 'react';
import { quizChannel, type PresenterGameState } from '../lib/broadcast/quizChannel';

/** Mounted in the Presenter route — a pure, read-only subscriber to the host's state. */
export function usePresenterState() {
  const [state, setState] = useState<PresenterGameState | null>(null);

  useEffect(() => {
    const unsubscribe = quizChannel.subscribe((message) => {
      if (message.type === 'STATE_SYNC') setState(message.payload);
    });
    quizChannel.send({ type: 'PRESENTER_READY' });
    return unsubscribe;
  }, []);

  function buzz(teamId: string) {
    quizChannel.send({ type: 'BUZZ_ATTEMPT', payload: { teamId, timestamp: Date.now() } });
  }

  return { state, buzz };
}
