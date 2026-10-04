import { useEffect } from 'react';
import { useGameStore } from '../state/gameStore';
import { quizChannel, toPresenterState } from '../lib/broadcast/quizChannel';

/**
 * Mounted once in the Host route. Broadcasts the host's game state to any
 * open Presenter window (spec §17) and accepts buzz attempts relayed from
 * that window so buzzing works whether the audience is looking at the host
 * machine or a second screen.
 */
export function useHostBroadcast() {
  const game = useGameStore((s) => s.game);
  const buzzIn = useGameStore((s) => s.buzzIn);

  useEffect(() => {
    if (!game) return;
    quizChannel.send({ type: 'STATE_SYNC', payload: toPresenterState(game) });
  }, [game]);

  useEffect(() => {
    return quizChannel.subscribe((message) => {
      if (message.type === 'BUZZ_ATTEMPT') {
        buzzIn(message.payload.teamId);
      }
      if (message.type === 'PRESENTER_READY') {
        const current = useGameStore.getState().game;
        if (current) quizChannel.send({ type: 'STATE_SYNC', payload: toPresenterState(current) });
      }
    });
  }, [buzzIn]);
}
